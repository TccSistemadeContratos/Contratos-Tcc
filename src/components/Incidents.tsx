import React, { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query,
  orderBy,
  doc,
  updateDoc,
  getDoc,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Plus, Search, AlertCircle, CheckCircle2, Clock, MoreVertical, Filter } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';

export const Incidents: React.FC = () => {
  const { isManager } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    contractId: '',
    system: '',
    priority: 'Médio',
    openedAt: new Date().toISOString().slice(0, 16),
    status: 'Aberto',
    supplierContact: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'incidents'), orderBy('openedAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setIncidents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'incidents')
    );

    const contractsUnsubscribe = onSnapshot(
      collection(db, 'contracts'),
      (snapshot) => {
        setContracts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubscribe();
      contractsUnsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const contract = contracts.find(c => c.id === formData.contractId);
      
      await addDoc(collection(db, 'incidents'), {
        ...formData,
        openedAt: new Date(formData.openedAt).toISOString(),
        createdAt: new Date().toISOString()
      });

      // Update supplier total incidents count
      if (contract?.supplierId) {
        const supplierRef = doc(db, 'suppliers', contract.supplierId);
        await updateDoc(supplierRef, {
          totalIncidents: increment(1)
        });
      }

      setShowModal(false);
      setFormData({
        contractId: '',
        system: '',
        priority: 'Médio',
        openedAt: new Date().toISOString().slice(0, 16),
        status: 'Aberto',
        supplierContact: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'incidents');
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const resolvedAt = new Date().toISOString();
      const incident = incidents.find(i => i.id === id);
      const openedAt = new Date(incident.openedAt);
      const diffHours = (new Date(resolvedAt).getTime() - openedAt.getTime()) / (1000 * 60 * 60);
      
      // Fetch supplier SLA limit
      let slaLimit = 2; // Default fallback
      const contract = contracts.find(c => c.id === incident.contractId);
      
      if (contract?.supplierId) {
        const supplierDoc = await getDoc(doc(db, 'suppliers', contract.supplierId));
        if (supplierDoc.exists()) {
          slaLimit = supplierDoc.data().slaLimit || 2;
        }
      }

      const isViolation = diffHours > slaLimit;
      
      await updateDoc(doc(db, 'incidents', id), {
        status: 'Resolvido',
        resolvedAt,
        resolutionTime: diffHours,
        slaResolutionStatus: !isViolation ? 'Cumprido' : 'Violado'
      });

      // If violated, update supplier violations count
      if (isViolation && contract?.supplierId) {
        const supplierRef = doc(db, 'suppliers', contract.supplierId);
        const supplierDoc = await getDoc(supplierRef);
        const data = supplierDoc.data();
        const total = (data?.totalIncidents || 1);
        const currentViolations = (data?.violations || 0) + 1;
        
        // Recalculate SLA Score: ((total - violations) / total) * 100
        const newScore = Math.max(0, Math.round(((total - currentViolations) / total) * 100));

        await updateDoc(supplierRef, {
          violations: increment(1),
          slaScore: newScore
        });
      } else if (!isViolation && contract?.supplierId) {
        // Even if complied, update score in case totalIncidents changed
        const supplierRef = doc(db, 'suppliers', contract.supplierId);
        const supplierDoc = await getDoc(supplierRef);
        const data = supplierDoc.data();
        const total = (data?.totalIncidents || 1);
        const currentViolations = (data?.violations || 0);
        const newScore = Math.max(0, Math.round(((total - currentViolations) / total) * 100));
        
        await updateDoc(supplierRef, {
          slaScore: newScore
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'incidents');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Crítico': return 'text-red-600 bg-red-50 border-red-100';
      case 'Alto': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'Médio': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      case 'Baixo': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Chamados e Incidentes</h2>
          <p className="text-slate-500 mt-1">Monitoramento de performance e cumprimento de SLA.</p>
        </div>
        {isManager && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={20} />
            Novo Chamado
          </button>
        )}
      </div>

      {/* Incident Cards */}
      <div className="grid grid-cols-1 gap-4">
        {incidents.map((incident) => (
          <div key={incident.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl border",
                  incident.status === 'Resolvido' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                  {incident.status === 'Resolvido' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border", getPriorityColor(incident.priority))}>
                      {incident.priority}
                    </span>
                    <h3 className="font-bold text-slate-900">{incident.system}</h3>
                  </div>
                  <p className="text-sm text-slate-500">
                    Contrato: <span className="text-slate-700 font-medium">{contracts.find(c => c.id === incident.contractId)?.name || 'N/A'}</span>
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={14} /> Aberto em: {formatDate(incident.openedAt)}</span>
                    {incident.resolvedAt && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={14} /> Resolvido em: {formatDate(incident.resolvedAt)}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {incident.slaResolutionStatus && (
                  <div className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold border",
                    incident.slaResolutionStatus === 'Cumprido' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"
                  )}>
                    SLA: {incident.slaResolutionStatus}
                  </div>
                )}
                {incident.status !== 'Resolvido' && isManager && (
                  <button 
                    onClick={() => handleResolve(incident.id)}
                    className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
                  >
                    Resolver
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {incidents.length === 0 && (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500">
            Nenhum incidente registrado.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold">Novo Chamado</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Contrato Vinculado</label>
                <select 
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  value={formData.contractId}
                  onChange={e => setFormData({...formData, contractId: e.target.value})}
                  disabled={saving}
                >
                  <option value="">Selecione o contrato...</option>
                  {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Sistema / Serviço</label>
                <input 
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  value={formData.system}
                  onChange={e => setFormData({...formData, system: e.target.value})}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Prioridade</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                  disabled={saving}
                >
                  <option value="Crítico">Crítico</option>
                  <option value="Alto">Alto</option>
                  <option value="Médio">Médio</option>
                  <option value="Baixo">Baixo</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Data de Abertura</label>
                <input 
                  type="datetime-local"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  value={formData.openedAt}
                  onChange={e => setFormData({...formData, openedAt: e.target.value})}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Responsável Fornecedor</label>
                <input 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  value={formData.supplierContact}
                  onChange={e => setFormData({...formData, supplierContact: e.target.value})}
                  disabled={saving}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center gap-2 disabled:bg-blue-400"
                  disabled={saving}
                >
                  {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? 'Enviando...' : 'Abrir Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const X = ({ size, className }: any) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
