import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { createUserAccount, mapAdminAuthError } from '../lib/adminUsers';
import type { Company } from '../lib/roles';
import { Building2, Plus, X, Loader2, Power, CheckCircle2, ShieldCheck } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

export const CompaniesAdmin: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    cnpj: '',
    plan: 'Padrão',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'companies'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Company, 'id'>) }));
        rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setCompanies(rows);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'companies')
    );
    return () => unsub();
  }, []);

  const resetForm = () =>
    setForm({ name: '', cnpj: '', plan: 'Padrão', adminName: '', adminEmail: '', adminPassword: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const companyRef = await addDoc(collection(db, 'companies'), {
        name: form.name.trim(),
        cnpj: form.cnpj.trim(),
        plan: form.plan,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: profile?.uid || null,
      });

      await createUserAccount({
        email: form.adminEmail,
        password: form.adminPassword,
        displayName: form.adminName,
        companyId: companyRef.id,
        role: 'company_admin',
      });

      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(mapAdminAuthError(err?.code));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (company: Company) => {
    try {
      await updateDoc(doc(db, 'companies', company.id), {
        status: company.status === 'active' ? 'inactive' : 'active',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'companies');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <ShieldCheck size={14} /> Console do Super Admin
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Empresas</h2>
          <p className="text-slate-500 mt-1">Cadastre clientes e controle o acesso à plataforma.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={20} />
          Nova empresa
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => (
          <div
            key={company.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-600">
                <Building2 size={22} />
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                  company.status === 'active'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    company.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                  )}
                />
                {company.status === 'active' ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{company.name}</h3>
            <p className="text-sm text-slate-500">{company.cnpj || 'CNPJ não informado'}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-xs text-slate-400">
                {company.plan && <span className="font-medium text-slate-600">{company.plan}</span>}
                <span className="mx-1.5">·</span>
                {formatDate(company.createdAt)}
              </div>
              <button
                onClick={() => toggleStatus(company)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
                  company.status === 'active'
                    ? 'text-slate-500 hover:bg-slate-100'
                    : 'text-emerald-600 hover:bg-emerald-50'
                )}
              >
                <Power size={14} />
                {company.status === 'active' ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
        {companies.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            Nenhuma empresa cadastrada ainda. Clique em “Nova empresa” para começar.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold">Nova empresa</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-5 p-6">
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados da empresa</p>
                <Field label="Nome da empresa" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="CNPJ" value={form.cnpj} onChange={(v) => setForm({ ...form, cnpj: v })} />
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Plano</label>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      value={form.plan}
                      onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    >
                      <option>Padrão</option>
                      <option>Profissional</option>
                      <option>Enterprise</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Administrador da empresa</p>
                <p className="-mt-2 text-xs text-slate-500">
                  Ele recebe estas credenciais e troca a senha no primeiro acesso.
                </p>
                <Field label="Nome do responsável" required value={form.adminName} onChange={(v) => setForm({ ...form, adminName: v })} />
                <Field label="E-mail de acesso" type="email" required value={form.adminEmail} onChange={(v) => setForm({ ...form, adminEmail: v })} />
                <Field label="Senha provisória" required value={form.adminPassword} onChange={(v) => setForm({ ...form, adminPassword: v })} hint="Mínimo de 6 caracteres." />
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
                  {saving ? 'Criando...' : 'Criar empresa'}
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
