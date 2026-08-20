import React, { useState } from 'react';
import { motion } from 'motion/react';
import { updatePassword, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';

export const ChangePassword: React.FC = () => {
  const { user, refresh } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha precisa ter ao menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!auth.currentUser) {
      setError('Sessão expirada. Entre novamente.');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(auth.currentUser, password);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { mustChangePassword: false });
      await refresh();
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        setError('Por segurança, entre novamente para definir a nova senha.');
      } else {
        setError('Não foi possível salvar a nova senha. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fs-aurora relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="fs-grid pointer-events-none absolute inset-0" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">Defina sua senha</h1>
            <p className="text-xs text-slate-400">Primeiro acesso de {user?.email}</p>
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-slate-300/80">
          Para sua segurança, crie uma nova senha pessoal antes de continuar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            id="new-password"
            label="Nova senha"
            value={password}
            onChange={setPassword}
            show={show}
            onToggle={() => setShow((v) => !v)}
          />
          <PasswordField
            id="confirm-password"
            label="Confirmar senha"
            value={confirm}
            onChange={setConfirm}
            show={show}
            onToggle={() => setShow((v) => !v)}
          />

          {error && (
            <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-sm font-medium text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-70"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Salvar e continuar
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <button
          onClick={() => signOut(auth)}
          className="mt-5 w-full text-center text-xs text-slate-400 transition hover:text-slate-200"
        >
          Sair
        </button>
      </motion.div>
    </div>
  );
};

const PasswordField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}> = ({ id, label, value, onChange, show, onToggle }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-200">
      {label}
    </label>
    <div className="group relative">
      <Lock
        size={18}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-400"
      />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:text-slate-300"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);
