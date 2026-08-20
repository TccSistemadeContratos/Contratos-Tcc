import React, { useState } from 'react';
import { motion } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../AuthContext';
import { isProfileComplete } from '../lib/roles';
import { formatCPF, formatPhone } from '../lib/masks';
import { ProfilePhoto } from './ProfilePhoto';
import { Loader2, Check, Camera, Mail, ShieldCheck } from 'lucide-react';

export const MyProfile: React.FC<{ fullscreen?: boolean }> = ({ fullscreen }) => {
  const { profile, refresh } = useAuth();
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    notificationEmail: profile?.notificationEmail || '',
    phone: profile?.phone || '',
    cpf: profile?.cpf || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.notificationEmail.trim());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk(false);
    if (!form.displayName.trim() || !form.phone.trim() || !form.cpf.trim()) {
      return setError('Preencha nome, telefone e CPF.');
    }
    if (!validEmail) {
      return setError('Informe um e-mail de notificações válido.');
    }
    if (!profile) return;
    setSaving(true);
    try {
      const complete = isProfileComplete({ ...profile, ...form });
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: form.displayName.trim(),
        notificationEmail: form.notificationEmail.trim(),
        phone: form.phone.trim(),
        cpf: form.cpf.trim(),
        profileComplete: complete,
      });
      await refresh();
      setOk(true);
    } catch {
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const card = (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      {/* Foto + identidade */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-2xl font-bold text-slate-400">
          {profile?.photoUrl ? (
            <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (profile?.displayName || profile?.email || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900">{form.displayName || 'Seu nome'}</p>
          <button
            type="button"
            onClick={() => setShowPhoto(true)}
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          >
            <Camera size={15} /> Trocar foto
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Nome completo" required value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} />

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">E-mail de acesso (login)</label>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
            <ShieldCheck size={16} className="text-slate-400" />
            <span className="text-sm">{profile?.email}</span>
          </div>
          <p className="text-xs text-slate-400">Usado só para entrar no sistema. Não recebe avisos.</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">E-mail para notificações</label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={form.notificationEmail}
              onChange={(e) => setForm({ ...form, notificationEmail: e.target.value })}
              placeholder="voce@empresa.com.br"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <p className="text-xs text-slate-400">Aqui chegam os retornos (ex.: quando um contrato é assinado).</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Telefone" required value={form.phone} onChange={(v) => setForm({ ...form, phone: formatPhone(v) })} placeholder="(00) 00000-0000" />
          <Field label="CPF" required value={form.cpf} onChange={(v) => setForm({ ...form, cpf: formatCPF(v) })} placeholder="000.000.000-00" />
        </div>

        {error && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
        )}
        {ok && (
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
            Perfil salvo com sucesso.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-70"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {fullscreen ? 'Salvar e continuar' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fs-aurora relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
        <div className="fs-grid pointer-events-none absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md"
        >
          <div className="mb-5 text-center">
            <h1 className="font-display text-2xl font-bold text-white">Complete seu perfil</h1>
            <p className="mt-1 text-sm text-slate-300/80">
              Antes de começar, preencha seus dados de contato.
            </p>
          </div>
          {card}
          <button
            onClick={() => signOut(auth)}
            className="mt-4 w-full text-center text-xs text-slate-400 transition hover:text-slate-200"
          >
            Sair
          </button>
        </motion.div>
        {showPhoto && <ProfilePhoto onClose={() => setShowPhoto(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Meu Perfil</h2>
        <p className="mt-1 text-slate-500">Suas informações pessoais e de contato.</p>
      </div>
      <div className="max-w-xl">{card}</div>
      {showPhoto && <ProfilePhoto onClose={() => setShowPhoto(false)} />}
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}> = ({ label, value, onChange, required, placeholder }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <input
      required={required}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
    />
  </div>
);
