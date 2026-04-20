import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  FileDown, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Users,
  Calendar,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Reports: React.FC = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all necessary data for reports
    const contractsUnsubscribe = onSnapshot(collection(db, 'contracts'), (snapshot) => {
      setContracts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const incidentsUnsubscribe = onSnapshot(collection(db, 'incidents'), (snapshot) => {
      setIncidents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const suppliersUnsubscribe = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);

    return () => {
      contractsUnsubscribe();
      incidentsUnsubscribe();
      suppliersUnsubscribe();
    };
  }, []);

  const generatePDF = (type: 'active' | 'expiring' | 'closed' | 'incidents' | 'suppliers') => {
    setIsGenerating(type);
    
    // Simulate a bit of delay for the "modern" feel
    setTimeout(() => {
      const doc = new jsPDF() as any;
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('FlowSign - Gestão de Contratos', 15, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Relatório Gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, 30);
      doc.text('Plataforma Digital de Monitoramento de TI', pageWidth - 15, 30, { align: 'right' });

      let title = '';
      let tableData: any[][] = [];
      let columns: string[] = [];

      switch (type) {
        case 'active':
          title = 'Relatório de Contratos Ativos';
          const activeContracts = contracts.filter(c => c.status === 'Ativo');
          columns = ['Nº Contrato', 'Nome', 'Fornecedor', 'Vencimento', 'Valor'];
          tableData = activeContracts.map(c => [
            c.contractNumber || '-',
            c.name,
            c.supplierName || suppliers.find(s => s.id === c.supplierId)?.name || '-',
            formatDate(c.endDate),
            formatCurrency(c.value || 0)
          ]);
          break;

        case 'expiring':
          title = 'Contratos Próximos ao Vencimento (30 Dias)';
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          const expiring = contracts.filter(c => {
            const end = new Date(c.endDate);
            return c.status === 'Ativo' && end <= thirtyDaysFromNow;
          });
          columns = ['Nº Contrato', 'Nome', 'Fornecedor', 'Vencimento', 'Status'];
          tableData = expiring.map(c => [
            c.contractNumber || '-',
            c.name,
            c.supplierName || suppliers.find(s => s.id === c.supplierId)?.name || '-',
            formatDate(c.endDate),
            'Urgente'
          ]);
          break;

        case 'closed':
          title = 'Relatório de Contratos Encerrados';
          const closed = contracts.filter(c => c.status === 'Encerrado');
          columns = ['Nº Contrato', 'Nome', 'Fornecedor', 'Início', 'Fim'];
          tableData = closed.map(c => [
            c.contractNumber || '-',
            c.name,
            c.supplierName || suppliers.find(s => s.id === c.supplierId)?.name || '-',
            formatDate(c.startDate),
            formatDate(c.endDate)
          ]);
          break;

        case 'incidents':
          title = 'Relatório Geral de Chamados e Incidentes';
          columns = ['Sistema', 'Prioridade', 'Abertura', 'Status', 'SLA'];
          tableData = incidents.map(i => [
            i.system,
            i.priority,
            formatDate(i.openedAt),
            i.status,
            i.slaResolutionStatus || 'Em análise'
          ]);
          break;

        case 'suppliers':
          title = 'Performance de Fornecedores';
          columns = ['Fornecedor', 'SLA Meta', 'Score Atual', 'Incidentes', 'Violações'];
          tableData = suppliers.map(s => [
            s.name,
            `${s.slaLimit || 2}h`,
            `${s.slaScore || 100}%`,
            s.totalIncidents || 0,
            s.violations || 0
          ]);
          break;
      }

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.text(title, 15, 55);

      autoTable(doc, {
        startY: 65,
        head: [columns],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 65 }
      });

      doc.save(`FlowSign_Relatorio_${type}_${new Date().getTime()}.pdf`);
      setIsGenerating(null);
    }, 1200);
  };

  const ReportCard = ({ title, description, icon: Icon, color, type }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
      <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-5 rounded-full", color)} />
      
      <div className="flex items-start justify-between mb-6">
        <div className={cn("p-4 rounded-2xl text-white shadow-lg", color)}>
          <Icon size={28} />
        </div>
        <button 
          onClick={() => generatePDF(type)}
          disabled={isGenerating !== null}
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
        >
          {isGenerating === type ? <Loader2 size={24} className="animate-spin text-blue-600" /> : <FileDown size={24} />}
        </button>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed mb-6">{description}</p>

      <button 
        onClick={() => generatePDF(type)}
        disabled={isGenerating !== null}
        className="w-full py-3 bg-slate-50 text-slate-700 font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
      >
        {isGenerating === type ? 'Gerando Documento...' : 'Extrair PDF'}
        <ChevronRight size={18} />
      </button>
    </div>
  );

  if (loading) return <div className="p-8 text-center">Iniciando motor de relatórios...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Relatórios Inteligentes</h2>
          <p className="text-slate-500 mt-2 text-lg">Extração de dados consolidados em documentos PDF corporativos.</p>
        </div>
        <div className="px-4 py-2 bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest rounded-full flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Base de Dados Sincronizada
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ReportCard 
          type="active"
          title="Contratos Ativos"
          description="Relação completa de todos os contratos em vigor no momento, incluindo valores e prazos."
          icon={FileText}
          color="bg-blue-600"
        />
        <ReportCard 
          type="expiring"
          title="Próximos ao Fim"
          description="Contratos com vencimento nos próximos 30 dias. Essencial para planejamento de renovações."
          icon={Clock}
          color="bg-orange-500"
        />
        <ReportCard 
          type="closed"
          title="Histórico Encerrado"
          description="Listagem de contratos finalizados, servindo para auditoria e histórico de encerramento."
          icon={CheckCircle2}
          color="bg-slate-700"
        />
        <ReportCard 
          type="incidents"
          title="Casos e Estados"
          description="Relatório detalhado de todos os incidentes abertos, resolvidos e seus respectivos SLAs."
          icon={AlertTriangle}
          color="bg-red-500"
        />
        <ReportCard 
          type="suppliers"
          title="Performance SLA"
          description="Ranking de fornecedores baseado no cumprimento de metas de atendimento e violações."
          icon={Users}
          color="bg-emerald-600"
        />
        
        {/* Futuristic Card Placeholder */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center text-center text-white border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] -mr-32 -mt-32" />
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/10">
            <Calendar size={32} className="text-blue-400" />
          </div>
          <h4 className="text-xl font-bold mb-2">Relatório Customizado</h4>
          <p className="text-slate-400 text-sm mb-6">Em breve: crie filtros personalizados para seus próprios relatórios sob demanda.</p>
          <div className="px-4 py-1.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-tighter rounded-full border border-blue-500/30">
            Feature Preview
          </div>
        </div>
      </div>
    </div>
  );
};
