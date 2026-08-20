import React from 'react';
import { motion } from 'motion/react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

export const AccessBlocked: React.FC<{ reason: 'no-account' | 'inactive' }> = ({ reason }) => {
  const { user } = useAuth();

  const copy =
    reason === 'no-account'
      ? {
          title: 'Acesso restrito',
          body: 'Sua conta ainda não está liberada no FlowSign. O acesso é exclusivo para empresas cadastradas. Fale com o administrador da sua empresa ou com o suporte FlowSign.',
        }
      : {
          title: 'Assinatura inativa',
          body: 'O acesso da sua empresa está suspenso no momento. Regularize a assinatura com o suporte FlowSign para voltar a usar a plataforma.',
        };

  return (
    <div className="fs-aurora relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="fs-grid pointer-events-none absolute inset-0" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-sm"
      >
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-300">
          <ShieldAlert size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold text-white">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-300/80">{copy.body}</p>
        {user?.email && (
          <p className="mt-4 text-xs text-slate-500">Conectado como {user.email}</p>
        )}
        <button
          onClick={() => signOut(auth)}
          className="mx-auto mt-8 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
        >
          <LogOut size={17} />
          Sair
        </button>
      </motion.div>
    </div>
  );
};
