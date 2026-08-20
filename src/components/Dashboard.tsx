import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  FileText, AlertTriangle, Users, TrendingUp, Clock, ShieldCheck,
  ShieldAlert, PenLine, CalendarClock, X,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateOnly, cn } from '../lib/utils';

export const Dashboard: React.FC = () => {
  const { companyId } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    const u1 = onSnapshot(query(collection(db, 'contracts'), where('companyId', '==', companyId)),
      (s) => { setContracts(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => handleFirestoreError(e, OperationType.LIST, 'contracts'));
    const u2 = onSnapshot(query(collection(db, 'suppliers'), where('companyId', '==', companyId)),
      (s) => setSuppliers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(collection(db, 'incidents'), where('companyId', '==', companyId)),
      (s) => setIncidents(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); };
  }, [companyId]);

  // atualiza os cronômetros/estados de SLA a cada 30s
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  const m = useMemo(() => {
    const now = Date.now();
    const in30 = now + 30 * 24 * 3600 * 1000;
    const supplierById = (id: string) => suppliers.find((s) => s.id === id);

    const active = contracts.filter((c) => c.status === 'Ativo');
    const pendingSig = contracts.filter((c) => c.status === 'Pendente' || c.status === 'Rascunho');
    const expiring = active.filter((c) => c.endDate && new Date(c.endDate).getTime() <= in30);

    const open = incidents.filter((i) => i.status !== 'Resolvido');
    const withDeadline = open.map((i) => {
      const contract = contracts.find((c) => c.id === i.contractId);
      const supplier = supplierById(contract?.supplierId || i.supplierId);
      const slaLimit = supplier?.slaLimit || 2;
      const deadline = new Date(i.openedAt).getTime() + slaLimit * 3600 * 1000;
      return { ...i, deadline, breached: now > deadline, contractName: i.contractName || contract?.name };
    });
    const breached = withDeadline.filter((i) => i.breached);
    const within = withDeadline.filter((i) => !i.breached);

    const resolvedViolations = incidents.filter((i) => i.slaResolutionStatus === 'Violado').length;

    const avgSla = suppliers.length
      ? Math.round(suppliers.reduce((a, s) => a + (s.slaScore || 0), 0) / suppliers.length)
      : 0;

    const topSuppliers = [...suppliers]
      .map((s) => ({ name: s.name, sla: s.slaScore || 0 }))
      .sort((a, b) => b.sla - a.sla)
      .slice(0, 5);

    const priorities = ['Crítico', 'Alto', 'Médio', 'Baixo'];
    const byPriority = priorities.map((p) => ({ name: p, value: incidents.filter((i) => i.priority === p).length }));

    return {
      active: active.length,
      activeList: active,
      pendingSig: pendingSig.length,
      pendingList: pendingSig,
      expiring,
      openCount: open.length,
      within: within.length,
      withinList: within,
      breached,
      resolvedViolations,
      avgSla,
      topSuppliers,
      byPriority,
      totalSuppliers: suppliers.length,
      suppliersList: suppliers,
      withDeadline: withDeadline.sort((a, b) => a.deadline - b.deadline),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, suppliers, incidents, tick]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#4353e6'];

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando dashboard...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Executivo</h2>
        <p className="text-slate-500 mt-1">Visão geral de contratos, chamados e cumprimento de SLA.</p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Stat title="Contratos Ativos" value={m.active} icon={FileText} color="bg-blue-600" onClick={() => setDetailKey('active')} />
        <Stat title="Vencendo (30 dias)" value={m.expiring.length} icon={Clock} color="bg-orange-500" onClick={() => setDetailKey('expiring')} />
        <Stat title="SLA Médio Global" value={`${m.avgSla}%`} icon={TrendingUp} color="bg-emerald-500" onClick={() => setDetailKey('suppliers')} />
        <Stat title="Chamados Abertos" value={m.openCount} icon={AlertTriangle} color="bg-slate-700" onClick={() => setDetailKey('open')} />
      </div>

      {/* Faixa de SLA / assinatura */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Mini title="Dentro do SLA" value={m.within} icon={ShieldCheck} tone="emerald" onClick={() => setDetailKey('within')} />
        <Mini title="SLA Estourado" value={m.breached.length} icon={ShieldAlert} tone="red" pulse={m.breached.length > 0} onClick={() => setDetailKey('breached')} />
        <Mini title="Aguardando assinatura" value={m.pendingSig} icon={PenLine} tone="amber" onClick={() => setDetailKey('pending')} />
        <Mini title="Fornecedores" value={m.totalSuppliers} icon={Users} tone="slate" onClick={() => setDetailKey('suppliers')} />
      </div>

      {/* Chamados estourados (urgente) */}
      {m.breached.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-600">
            <ShieldAlert size={16} /> Atenção imediata — SLA estourado
          </h3>
          <div className="space-y-2">
            {m.breached.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                <div>
                  <p className="font-semibold text-slate-900">{i.system}</p>
                  <p className="text-xs text-slate-500">Contrato: {i.contractName || '—'}</p>
                </div>
                <span className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                  +{Math.floor((Date.now() - i.deadline) / 3600000)}h estouradas
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Top 5 Fornecedores (SLA %)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.topSuppliers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="sla" fill="#4353e6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Incidentes por Prioridade</h3>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={m.byPriority} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {m.byPriority.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 ml-4">
              {m.byPriority.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-xs text-slate-600">{p.name}: {p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chamados em aberto */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Chamados em aberto</h3>
          <div className="space-y-2">
            {m.withDeadline.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhum chamado em aberto. 🎉</p>}
            {m.withDeadline.slice(0, 6).map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{i.system}</p>
                  <p className="truncate text-xs text-slate-400">{i.contractName || '—'}</p>
                </div>
                <span className={cn('shrink-0 rounded-lg px-2 py-1 text-xs font-semibold',
                  i.breached ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>
                  {i.breached ? 'Estourado' : 'No prazo'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Próximos vencimentos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <CalendarClock size={18} className="text-orange-500" /> Contratos vencendo (30 dias)
          </h3>
          <div className="space-y-2">
            {m.expiring.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhum contrato vencendo. 👍</p>}
            {m.expiring.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{c.name}</p>
                  <p className="truncate text-xs text-slate-400">{c.supplierName || '—'} · {formatCurrency(c.value || 0)}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-orange-600">{formatDateOnly(c.endDate)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {detailKey && (
        <DetailModal
          onClose={() => setDetailKey(null)}
          data={{
            active: { title: 'Contratos ativos', kind: 'contracts', items: m.activeList },
            expiring: { title: 'Contratos vencendo (30 dias)', kind: 'contracts', items: m.expiring },
            pending: { title: 'Aguardando assinatura', kind: 'contracts', items: m.pendingList },
            open: { title: 'Chamados em aberto', kind: 'incidents', items: m.withDeadline },
            within: { title: 'Chamados dentro do SLA', kind: 'incidents', items: m.withinList },
            breached: { title: 'Chamados com SLA estourado', kind: 'incidents', items: m.breached },
            suppliers: { title: 'Fornecedores', kind: 'suppliers', items: m.suppliersList },
          }[detailKey]}
        />
      )}
    </div>
  );
};

const DetailModal: React.FC<{ onClose: () => void; data?: { title: string; kind: string; items: any[] } }> = ({ onClose, data }) => {
  if (!data) return null;
  const { title, kind, items } = data;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-400">{items.length} {items.length === 1 ? 'item' : 'itens'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {items.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Nada por aqui.</p>}
          <div className="space-y-2">
            {kind === 'contracts' && items.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{c.name} <span className="text-xs font-normal text-slate-400">#{c.contractNumber}</span></p>
                  <p className="truncate text-xs text-slate-500">{c.supplierName || '—'} · {c.internalOwner ? `Resp.: ${c.internalOwner} · ` : ''}{formatCurrency(c.value || 0)}</p>
                  <p className="text-xs text-slate-400">Vigência: {formatDateOnly(c.startDate)} – {formatDateOnly(c.endDate)}</p>
                </div>
                <span className={cn('shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold',
                  c.status === 'Ativo' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : c.status === 'Pendente' ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600')}>{c.status}</span>
              </div>
            ))}

            {kind === 'incidents' && items.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{i.system}</p>
                  <p className="truncate text-xs text-slate-500">Contrato: {i.contractName || '—'} · Prioridade: {i.priority}</p>
                  <p className="text-xs text-slate-400">Aberto em: {formatDate(i.openedAt)}</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                  i.breached ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>
                  {i.breached ? 'Estourado' : 'No prazo'}
                </span>
              </div>
            ))}

            {kind === 'suppliers' && items.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{s.name}</p>
                  <p className="truncate text-xs text-slate-500">{s.contactEmail || '—'} · Meta {s.slaLimit || 2}h</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
                  (s.slaScore || 0) >= 95 ? 'bg-emerald-100 text-emerald-700'
                  : (s.slaScore || 0) >= 90 ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700')}>{s.slaScore ?? 100}% SLA</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ title, value, icon: Icon, color, onClick }: any) => (
  <button
    onClick={onClick}
    className="group w-full text-left bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={cn('p-3 rounded-xl transition-transform duration-200 group-hover:scale-105', color)}>
        <Icon size={24} className="text-white" />
      </div>
      <span className="text-xs font-medium text-slate-300 opacity-0 transition group-hover:opacity-100">ver detalhes →</span>
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="font-display text-3xl font-bold text-slate-900 mt-1">{value}</p>
  </button>
);

const toneMap: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  slate: 'bg-slate-100 text-slate-600',
};

const Mini = ({ title, value, icon: Icon, tone, pulse, onClick }: any) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
  >
    <div className={cn('grid h-11 w-11 place-items-center rounded-xl', toneMap[tone], pulse && 'animate-pulse')}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{title}</p>
    </div>
  </button>
);
