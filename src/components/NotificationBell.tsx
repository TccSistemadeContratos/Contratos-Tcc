import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Bell, Check, CheckCheck, FileSignature, AlertTriangle } from 'lucide-react';
import { formatDate } from '../lib/utils';

export const NotificationBell: React.FC = () => {
  const { companyId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyId) return;
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), where('companyId', '==', companyId)),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setItems(rows);
      }
    );
    return () => unsub();
  }, [companyId]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = items.filter((i) => !i.read);

  const markRead = (id: string) => updateDoc(doc(db, 'notifications', id), { read: true }).catch(() => {});
  const markAll = () => unread.forEach((i) => markRead(i.id));

  const icon = (type: string) =>
    type === 'assinatura' ? (
      <FileSignature size={16} className="text-blue-600" />
    ) : type?.includes('violaç') ? (
      <AlertTriangle size={16} className="text-red-500" />
    ) : (
      <Bell size={16} className="text-slate-500" />
    );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
        title="Notificações"
      >
        <Bell size={19} />
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-900">Notificações</p>
              {unread.length > 0 && (
                <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
                  <CheckCheck size={13} /> Marcar todas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <Bell size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-400">Tudo em dia!</p>
                </div>
              )}
              {items.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b border-slate-50 px-4 py-3 ${n.read ? '' : 'bg-blue-50/40'}`}
                >
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50">
                    {icon(n.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.read ? 'text-slate-600' : 'font-medium text-slate-900'}`}>{n.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      title="Marcar como lida"
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                    >
                      <Check size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
