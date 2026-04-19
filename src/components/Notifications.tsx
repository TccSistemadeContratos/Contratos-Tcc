import React, { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Bell, AlertTriangle, Clock, ShieldAlert, Check, AlertCircle } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeViolations, setActiveViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch persistent notifications
    const notifQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribeNotifs = onSnapshot(notifQuery, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Fetch live data for real-time SLA checking
    const incidentsQuery = query(collection(db, 'incidents'), where('status', '==', 'Pendente'));
    const contractsQuery = query(collection(db, 'contracts'));
    const suppliersQuery = query(collection(db, 'suppliers'));

    let currentIncidents: any[] = [];
    let currentContracts: any[] = [];
    let currentSuppliers: any[] = [];

    const updateLiveViolations = () => {
      const violations: any[] = [];
      const now = new Date().getTime();

      currentIncidents.forEach(incident => {
        const contract = currentContracts.find(c => c.id === incident.contractId);
        if (!contract) return;

        const supplier = currentSuppliers.find(s => s.id === contract.supplierId);
        if (!supplier) return;

        const slaLimitHours = supplier.slaLimit || 2;
        const openedAt = new Date(incident.openedAt).getTime();
        const diffHours = (now - openedAt) / (1000 * 60 * 60);

        if (diffHours > slaLimitHours) {
          violations.push({
            id: `active-violation-${incident.id}`,
            incidentId: incident.id,
            type: 'violação_aguda',
            message: `CRÍTICO: Chamado "${incident.system}" está com o SLA estourado! O fornecedor ${supplier.name} tem meta de ${slaLimitHours}h e já se passaram ${Math.floor(diffHours)}h.`,
            createdAt: incident.openedAt,
            supplierName: supplier.name,
            diffHours,
            slaLimit: slaLimitHours
          });
        }
      });

      setActiveViolations(violations);
      setLoading(false);
    };

    const unsubscribeIncidents = onSnapshot(incidentsQuery, (snap) => {
      currentIncidents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateLiveViolations();
    });

    const unsubscribeContracts = onSnapshot(contractsQuery, (snap) => {
      currentContracts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateLiveViolations();
    });

    const unsubscribeSuppliers = onSnapshot(suppliersQuery, (snap) => {
      currentSuppliers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateLiveViolations();
    });

    return () => {
      unsubscribeNotifs();
      unsubscribeIncidents();
      unsubscribeContracts();
      unsubscribeSuppliers();
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'vencimento': return <Clock className="text-orange-500" size={20} />;
      case 'violação_aguda': return <ShieldAlert className="text-white" size={20} />;
      case 'violação': return <AlertTriangle className="text-red-500" size={20} />;
      case 'performance': return <ShieldAlert className="text-blue-500" size={20} />;
      default: return <Bell className="text-slate-500" size={20} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Alertas e Notificações</h2>
          <p className="text-slate-500 mt-1">Acompanhe vencimentos e violações críticas em tempo real.</p>
        </div>
        {activeViolations.length > 0 && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold animate-pulse flex items-center gap-2">
            <AlertCircle size={18} />
            {activeViolations.length} {activeViolations.length === 1 ? 'VIOLAÇÃO ATIVA' : 'VIOLAÇÕES ATIVAS'}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Active Overdue Alerts (Live Scanning) */}
        {activeViolations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={16} /> Casos Críticos (Atenção Imediata)
            </h3>
            {activeViolations.map((violation) => (
              <div 
                key={violation.id} 
                className="bg-red-600 text-white p-6 rounded-2xl shadow-lg shadow-red-200 border border-red-700 flex items-start gap-4 animate-in slide-in-from-top-2 duration-300"
              >
                <div className="p-3 bg-red-700 rounded-xl">
                  {getIcon(violation.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-200">Violação de SLA em Tempo Real</span>
                    <span className="text-xs font-bold text-red-100">{formatDate(violation.createdAt)}</span>
                  </div>
                  <p className="font-bold text-lg leading-tight mb-2">
                    {violation.message}
                  </p>
                  <div className="flex gap-4 items-center">
                    <div className="text-xs bg-red-800 px-2 py-1 rounded">
                      Meta: {violation.slaLimit}h
                    </div>
                    <div className="text-xs bg-red-800 px-2 py-1 rounded font-bold">
                      Atraso: +{Math.floor(violation.diffHours - violation.slaLimit)}h estouradas
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Historical Notifications */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={cn(
                  "p-6 flex items-start gap-4 transition-colors",
                  notif.read ? "bg-white" : "bg-blue-50/30"
                )}
              >
                <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{notif.type}</span>
                    <span className="text-xs text-slate-400">{formatDate(notif.createdAt)}</span>
                  </div>
                  <p className={cn(
                    "text-slate-700",
                    !notif.read && "font-semibold"
                  )}>
                    {notif.message}
                  </p>
                </div>
                {!notif.read && (
                  <button 
                    onClick={() => markAsRead(notif.id)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    title="Marcar como lido"
                  >
                    <Check size={20} />
                  </button>
                )}
              </div>
            ))}
            {notifications.length === 0 && activeViolations.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                Nenhuma notificação no momento.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
