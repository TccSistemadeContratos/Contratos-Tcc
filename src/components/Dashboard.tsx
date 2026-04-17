import React, { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Users,
  TrendingUp,
  Clock
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    activeContracts: 0,
    expiringSoon: 0,
    avgSla: 0,
    violationCount: 0
  });
  const [slaBySupplier, setSlaBySupplier] = useState<any[]>([]);
  const [incidentsByPriority, setIncidentsByPriority] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const contractsUnsubscribe = onSnapshot(
      collection(db, 'contracts'),
      (snapshot) => {
        const docs = snapshot.docs.map(d => d.data());
        const active = docs.filter(d => d.status === 'Ativo').length;
        
        // Expiring in 30 days
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const expiring = docs.filter(d => {
          const endDate = new Date(d.endDate);
          return d.status === 'Ativo' && endDate <= thirtyDaysFromNow;
        }).length;

        setStats(prev => ({ ...prev, activeContracts: active, expiringSoon: expiring }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contracts')
    );

    const suppliersUnsubscribe = onSnapshot(
      collection(db, 'suppliers'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({
          name: d.data().name,
          sla: d.data().slaScore || 0
        })).sort((a, b) => b.sla - a.sla).slice(0, 5);
        setSlaBySupplier(data);
        
        const avg = snapshot.docs.reduce((acc, d) => acc + (d.data().slaScore || 0), 0) / (snapshot.docs.length || 1);
        setStats(prev => ({ ...prev, avgSla: Math.round(avg) }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'suppliers')
    );

    const incidentsUnsubscribe = onSnapshot(
      collection(db, 'incidents'),
      (snapshot) => {
        const docs = snapshot.docs.map(d => d.data());
        const violations = docs.filter(d => d.slaResponseStatus === 'Violado' || d.slaResolutionStatus === 'Violado').length;
        setStats(prev => ({ ...prev, violationCount: violations }));

        const priorities = ['Crítico', 'Alto', 'Médio', 'Baixo'];
        const priorityData = priorities.map(p => ({
          name: p,
          value: docs.filter(d => d.priority === p).length
        }));
        setIncidentsByPriority(priorityData);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'incidents')
    );

    return () => {
      contractsUnsubscribe();
      suppliersUnsubscribe();
      incidentsUnsubscribe();
    };
  }, []);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6'];

  const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-xl", color)}>
          <Icon size={24} className="text-white" />
        </div>
        {subValue && <span className="text-xs font-medium text-slate-500">{subValue}</span>}
      </div>
      <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );

  if (loading) return <div className="p-8 text-center">Carregando dashboard...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Executivo</h2>
        <p className="text-slate-500 mt-1">Visão geral da performance de contratos e SLAs.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Contratos Ativos" 
          value={stats.activeContracts} 
          icon={FileText} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Vencendo (30 dias)" 
          value={stats.expiringSoon} 
          icon={Clock} 
          color="bg-orange-500" 
        />
        <StatCard 
          title="SLA Médio Global" 
          value={`${stats.avgSla}%`} 
          icon={TrendingUp} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Violações de SLA" 
          value={stats.violationCount} 
          icon={AlertTriangle} 
          color="bg-red-500" 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SLA by Supplier */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Top 5 Fornecedores (SLA %)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaBySupplier} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="sla" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incidents by Priority */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Incidentes por Prioridade</h3>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incidentsByPriority}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {incidentsByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 ml-4">
              {incidentsByPriority.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-xs text-slate-600">{p.name}: {p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
