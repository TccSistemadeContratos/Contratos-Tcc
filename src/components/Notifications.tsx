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
import { Bell, AlertTriangle, Clock, ShieldAlert, Check } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    return () => unsubscribe();
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
      case 'violação': return <AlertTriangle className="text-red-500" size={20} />;
      case 'performance': return <ShieldAlert className="text-blue-500" size={20} />;
      default: return <Bell className="text-slate-500" size={20} />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Alertas e Notificações</h2>
        <p className="text-slate-500 mt-1">Acompanhe vencimentos e violações críticas em tempo real.</p>
      </div>

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
          {notifications.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              Nenhuma notificação no momento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
