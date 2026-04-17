import React, { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Plus, Search, Users, Star, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

export const Suppliers: React.FC = () => {
  const { isManager } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    slaScore: 100,
    totalIncidents: 0,
    violations: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSuppliers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'suppliers')
    );

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'suppliers'), {
        ...formData,
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setFormData({ name: '', contactEmail: '', slaScore: 100, totalIncidents: 0, violations: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'suppliers');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Fornecedores</h2>
          <p className="text-slate-500 mt-1">Ranking de performance e conformidade de SLA.</p>
        </div>
        {isManager && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={20} />
            Novo Fornecedor
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Carregando fornecedores...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                  <Users size={24} />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold border",
                  supplier.slaScore >= 95 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                  supplier.slaScore >= 90 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                  "bg-red-100 text-red-700 border-red-200"
                )}>
                  {supplier.slaScore}% SLA
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-1">{supplier.name}</h3>
              <p className="text-sm text-slate-500 mb-6">{supplier.contactEmail}</p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Incidentes</p>
                  <p className="text-lg font-bold text-slate-900">{supplier.totalIncidents || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Violações</p>
                  <p className="text-lg font-bold text-red-600">{supplier.violations || 0}</p>
                </div>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500">
              Nenhum fornecedor cadastrado.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between font-sans">
              <h3 className="text-xl font-bold">Novo Fornecedor</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nome do Fornecedor</label>
                <input 
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email de Contato</label>
                <input 
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  value={formData.contactEmail}
                  onChange={e => setFormData({...formData, contactEmail: e.target.value})}
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
                  {saving ? 'Salvando...' : 'Salvar Fornecedor'}
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
