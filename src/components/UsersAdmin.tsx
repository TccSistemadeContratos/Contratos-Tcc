import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { createUserAccount, mapAdminAuthError } from '../lib/adminUsers';
import type { UserProfile, Role } from '../lib/roles';
import { CONTRACT_TYPES } from '../lib/contractTypes';
import { Users, Plus, X, Loader2, Power, CheckCircle2, ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

const roleLabel: Record<Role, string> = {
  superadmin: 'Super Admin',
  company_admin: 'Administrador',
  user: 'Usuário',
};

export const UsersAdmin: React.FC = () => {
  const { companyId, company, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' as Role, area: 'T.I.' });

  useEffect(() => {
    if (!companyId) return;
    const q = query(collection(db, 'users'), where('companyId', '==', companyId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => d.data() as UserProfile);
        rows.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        setUsers(rows);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );
    return () => unsub();
  }, [companyId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createUserAccount({
        email: form.email,
        password: form.password,
        displayName: form.name,
        companyId,
        role: form.role,
        area: form.area,
      });
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'user', area: 'T.I.' });
    } catch (err: any) {
      setError(mapAdminAuthError(err?.code));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u: UserProfile) => {
    if (u.uid === profile?.uid) return; // não desativa a si mesmo
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        status: u.status === 'active' ? 'inactive' : 'active',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Usuários</h2>
          <p className="mt-1 text-slate-500">
            Gerencie quem acessa o FlowSign {company?.name ? `na ${company.name}` : 'na sua empresa'}.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={20} />
          Novo usuário
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Usuário</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Papel</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Criado em</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.uid} className="transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                        {u.photoUrl ? (
                          <img src={u.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (u.displayName || u.email || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {u.displayName}
                          {u.uid === profile?.uid && <span className="ml-2 text-xs font-normal text-slate-400">(você)</span>}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        {u.area && <p className="text-xs text-slate-400">Área: {u.area}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                        u.role === 'company_admin'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {u.role === 'company_admin' ? <ShieldCheck size={13} /> : <UserIcon size={13} />}
                      {roleLabel[u.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-semibold',
                        u.status === 'active' ? 'text-emerald-600' : 'text-slate-400'
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400')} />
                      {u.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(u)}
                      disabled={u.uid === profile?.uid}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
                        u.status === 'active' ? 'text-slate-500 hover:bg-slate-100' : 'text-emerald-600 hover:bg-emerald-50'
                      )}
                    >
                      <Power size={14} />
                      {u.status === 'active' ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Nenhum usuário cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h3 className="text-xl font-bold">Novo usuário</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <Field label="Nome" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="E-mail de acesso" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Senha provisória" required value={form.password} onChange={(v) => setForm({ ...form, password: v })} hint="Mínimo de 6 caracteres. O usuário troca no 1º acesso." />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Papel</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  >
                    <option value="user">Usuário</option>
                    <option value="company_admin">Administrador</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Área</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                  >
                    {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {error && (
                <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white shadow-sm transition hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                  {saving ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}> = ({ label, value, onChange, type = 'text', required, hint }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
    />
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);
