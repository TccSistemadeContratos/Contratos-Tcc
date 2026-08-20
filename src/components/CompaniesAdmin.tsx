import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { createUserAccount, mapAdminAuthError } from '../lib/adminUsers';
import type { Company } from '../lib/roles';
import { resizeImageToDataUrl } from '../lib/image';
import { formatCNPJ, formatCPF, formatPhone } from '../lib/masks';
import { NumericInput } from './ui/NumericInput';
import {
  Building2,
  Plus,
  X,
  Loader2,
  Power,
  CheckCircle2,
  ShieldCheck,
  Upload,
  ImageIcon,
  BadgeCheck,
  CircleAlert,
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '../lib/utils';

const emptyForm = {
  name: '',
  cnpj: '',
  ownerCpf: '',
  ownerPhone: '',
  plan: 'Padrão',
  monthlyValue: '',
  dueDay: '',
  paymentStatus: 'paid' as 'paid' | 'unpaid',
  logoUrl: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

export const CompaniesAdmin: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('A logo precisa ser uma imagem.');
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, 512);
      setForm((f) => ({ ...f, logoUrl: dataUrl }));
    } catch {
      setError('Não foi possível processar a imagem.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const companyRef = await addDoc(collection(db, 'companies'), {
        name: form.name.trim(),
        cnpj: form.cnpj.trim(),
        ownerCpf: form.ownerCpf.trim(),
        ownerPhone: form.ownerPhone.trim(),
        plan: form.plan,
        monthlyValue: Number(form.monthlyValue) || 0,
        dueDay: Number(form.dueDay) || 1,
        paymentStatus: form.paymentStatus,
        logoUrl: form.logoUrl || '',
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
      setForm({ ...emptyForm });
    } catch (err: any) {
      setError(mapAdminAuthError(err?.code));
    } finally {
      setSaving(false);
    }
  };

  const togglePayment = async (c: Company) => {
    try {
      await updateDoc(doc(db, 'companies', c.id), {
        paymentStatus: c.paymentStatus === 'unpaid' ? 'paid' : 'unpaid',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'companies');
    }
  };

  const toggleStatus = async (c: Company) => {
    try {
      await updateDoc(doc(db, 'companies', c.id), {
        status: c.status === 'active' ? 'inactive' : 'active',
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
          <p className="mt-1 text-slate-500">Cadastre clientes, defina a mensalidade e controle o acesso.</p>
        </div>
        <button
          onClick={() => {
            setForm({ ...emptyForm });
            setError('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={20} />
          Nova empresa
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((c) => {
          const unpaid = c.paymentStatus === 'unpaid';
          const suspended = c.status !== 'active';
          const blocked = unpaid || suspended;
          return (
            <div
              key={c.id}
              className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <CompanyLogo company={c} />
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                    blocked
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', blocked ? 'bg-red-500' : 'bg-emerald-500')} />
                  {blocked ? 'Sem acesso' : 'Liberada'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{c.name}</h3>
              <p className="text-sm text-slate-500">{c.cnpj || 'CNPJ não informado'}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mensalidade</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(c.monthlyValue || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vencimento</p>
                  <p className="font-semibold text-slate-900">Todo dia {c.dueDay || '—'}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                <button
                  onClick={() => togglePayment(c)}
                  className={cn(
                    'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition',
                    unpaid
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  )}
                >
                  {unpaid ? <BadgeCheck size={15} /> : <CircleAlert size={15} />}
                  {unpaid ? 'Marcar como pago' : 'Marcar não pago'}
                </button>
                <button
                  onClick={() => toggleStatus(c)}
                  title={c.status === 'active' ? 'Suspender empresa' : 'Reativar empresa'}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition',
                    c.status === 'active' ? 'text-slate-500 hover:bg-slate-100' : 'text-emerald-600 hover:bg-emerald-50'
                  )}
                >
                  <Power size={15} />
                  {c.status === 'active' ? 'Suspender' : 'Reativar'}
                </button>
              </div>

              <p className="mt-3 text-[11px] text-slate-400">
                {c.plan && <span className="font-medium text-slate-500">{c.plan}</span>}
                {c.plan && ' · '}
                criada em {formatDate(c.createdAt)}
              </p>
            </div>
          );
        })}
        {companies.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            Nenhuma empresa cadastrada ainda. Clique em “Nova empresa” para começar.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold">Nova empresa</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-5 p-6">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon size={24} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Upload size={16} />
                    {form.logoUrl ? 'Trocar logo' : 'Enviar logo'}
                  </button>
                  <p className="mt-1 text-xs text-slate-400">PNG ou JPG. Redimensionada automaticamente.</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados da empresa</p>
                <Field label="Nome da empresa" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="CNPJ" value={form.cnpj} onChange={(v) => setForm({ ...form, cnpj: formatCNPJ(v) })} placeholder="00.000.000/0000-00" />
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
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Responsável (dono)</p>
                <Field label="CPF do dono" value={form.ownerCpf} onChange={(v) => setForm({ ...form, ownerCpf: formatCPF(v) })} placeholder="000.000.000-00" />
                <Field label="Telefone" value={form.ownerPhone} onChange={(v) => setForm({ ...form, ownerPhone: formatPhone(v) })} placeholder="(00) 00000-0000" />
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cobrança</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Mensalidade (R$)</label>
                    <NumericInput
                      decimal
                      placeholder="0,00"
                      value={form.monthlyValue}
                      onChange={(v) => setForm({ ...form, monthlyValue: v })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Vence todo dia</label>
                    <NumericInput
                      placeholder="10"
                      maxLength={2}
                      value={form.dueDay}
                      onChange={(v) => setForm({ ...form, dueDay: v })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Situação de pagamento</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.paymentStatus}
                    onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as 'paid' | 'unpaid' })}
                  >
                    <option value="paid">Pago — libera o acesso</option>
                    <option value="unpaid">Não pago — bloqueia o acesso</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Administrador da empresa</p>
                <p className="-mt-2 text-xs text-slate-500">Ele recebe estas credenciais e troca a senha no primeiro acesso.</p>
                <Field label="Nome do responsável" required value={form.adminName} onChange={(v) => setForm({ ...form, adminName: v })} />
                <Field label="E-mail de acesso" type="email" required value={form.adminEmail} onChange={(v) => setForm({ ...form, adminEmail: v })} />
                <Field label="Senha provisória" required value={form.adminPassword} onChange={(v) => setForm({ ...form, adminPassword: v })} hint="Mínimo de 6 caracteres." />
              </div>

              {error && (
                <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving} className="rounded-lg px-4 py-2 text-slate-600 transition hover:bg-slate-50">
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

const CompanyLogo: React.FC<{ company: Company }> = ({ company }) =>
  company.logoUrl ? (
    <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
      <img src={company.logoUrl} alt={company.name} className="h-full w-full object-contain" />
    </div>
  ) : (
    <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-600">
      <Building2 size={22} />
    </div>
  );

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}> = ({ label, value, onChange, type = 'text', required, hint, placeholder }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <input
      type={type}
      required={required}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
    />
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);
