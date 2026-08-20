import React, { useEffect, useState, useRef } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Plus, Search, Filter, FileText, ExternalLink, Trash2, Upload, X, Loader2, PenLine, Copy, CheckCheck } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { SearchableSelect } from './ui/SearchableSelect';
import { NumericInput } from './ui/NumericInput';
import { CONTRACT_TYPES, AREAS_BY_TYPE } from '../lib/contractTypes';
import { generateToken, buildSignUrl, sendEmail, supplierInviteEmail } from '../lib/signatures';

const today = () => new Date().toISOString().slice(0, 10);

// Soma meses a uma data (yyyy-mm-dd) e devolve no mesmo formato.
function addMonths(dateStr: string, months: number): string {
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

// Abre um PDF em base64 (data URL) numa nova aba, via Blob (evita bloqueio de data: URL).
function openBase64Pdf(dataUrl: string) {
  try {
    const b64 = dataUrl.split(',')[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    window.open(dataUrl, '_blank');
  }
}

const DATE_PRESETS = [
  { label: '6 meses', months: 6 },
  { label: '1 ano', months: 12 },
  { label: '2 anos', months: 24 },
  { label: '5 anos', months: 60 },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o PDF.'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export const Contracts: React.FC = () => {
  const { isManager, companyId, company, profile } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signResult, setSignResult] = useState<{ link: string; emailed: boolean; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    contractNumber: '',
    name: '',
    supplierId: '',
    area: '',
    type: 'T.I.',
    startDate: today(),
    endDate: '',
    value: '',
    internalOwner: '',
    description: '',
    status: 'Rascunho'
  });

  useEffect(() => {
    if (!companyId) return;
    const q = query(collection(db, 'contracts'), where('companyId', '==', companyId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setContracts(rows);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contracts')
    );

    const suppliersUnsubscribe = onSnapshot(
      query(collection(db, 'suppliers'), where('companyId', '==', companyId)),
      (snapshot) => {
        setSuppliers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubscribe();
      suppliersUnsubscribe();
    };
  }, [companyId]);

  useEffect(() => {
    if (showModal && contracts.length >= 0) {
      // Encontrar o maior número atual ou começar em 1
      const numbers = contracts.map(c => {
        const n = parseInt(c.contractNumber);
        return isNaN(n) ? 0 : n;
      });
      const nextNumber = Math.max(0, ...numbers) + 1;
      setFormData(prev => ({ ...prev, contractNumber: nextNumber.toString() }));
    }
  }, [showModal, contracts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert('Por favor, selecione apenas arquivos PDF.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setUploading(true);
    try {
      // PDF em base64 (sem Firebase Storage). Guardado num doc separado
      // (contractFiles) para não pesar a listagem de contratos.
      let pdfBase64 = '';
      if (selectedFile) {
        pdfBase64 = await fileToBase64(selectedFile);
        if (pdfBase64.length > 900_000) {
          setFormError('PDF muito grande (máx. ~650 KB). Comprima o arquivo e tente de novo.');
          setUploading(false);
          return;
        }
      }

      const supplier = suppliers.find(s => s.id === formData.supplierId);
      const docRef = await addDoc(collection(db, 'contracts'), {
        ...formData,
        companyId,
        supplierName: supplier?.name || '',
        createdAt: new Date().toISOString(),
        value: Number(formData.value) || 0,
        hasPdf: !!selectedFile,
        pdfName: selectedFile?.name || '',
      });

      if (selectedFile) {
        await setDoc(doc(db, 'contractFiles', docRef.id), {
          companyId,
          name: selectedFile.name,
          data: pdfBase64,
          createdAt: new Date().toISOString(),
        });
      }

      setShowModal(false);
      setSelectedFile(null);
      setFormData({
        contractNumber: '',
        name: '',
        supplierId: '',
        area: '',
        type: 'T.I.',
        startDate: today(),
        endDate: '',
        value: '',
        internalOwner: '',
        description: '',
        status: 'Rascunho'
      });
    } catch (err) {
      setFormError('Não foi possível salvar o contrato. Tente novamente.');
      handleFirestoreError(err, OperationType.CREATE, 'contracts');
    } finally {
      setUploading(false);
    }
  };

  const viewPdf = async (contract: any) => {
    if (!contract.hasPdf) return;
    try {
      const snap = await getDoc(doc(db, 'contractFiles', contract.id));
      if (snap.exists()) openBase64Pdf(snap.data().data as string);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'contractFiles');
    }
  };

  const handleSendSignature = async (contract: any) => {
    const supplier = suppliers.find((s) => s.id === contract.supplierId);
    const supplierEmail = supplier?.contactEmail || '';
    if (!supplierEmail) {
      alert('Este fornecedor não tem e-mail cadastrado. Cadastre o e-mail em Fornecedores.');
      return;
    }
    setSigningId(contract.id);
    try {
      const token = generateToken();

      // Anexa o PDF (se houver) ao pedido, para o fornecedor visualizar.
      let pdfData = '';
      if (contract.hasPdf) {
        const fileSnap = await getDoc(doc(db, 'contractFiles', contract.id));
        if (fileSnap.exists()) pdfData = fileSnap.data().data || '';
      }

      await setDoc(doc(db, 'signatureRequests', token), {
        companyId,
        companyName: company?.name || 'Empresa',
        contractId: contract.id,
        contractName: contract.name,
        contractNumber: contract.contractNumber || '',
        supplierName: supplier?.name || '',
        supplierEmail,
        requesterEmail: profile?.email || '',
        value: Number(contract.value) || 0,
        startDate: contract.startDate || '',
        endDate: contract.endDate || '',
        pdfData,
        signed: false,
        reconciled: false,
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, 'contracts', contract.id), {
        status: 'Pendente',
        signatureToken: token,
      });

      const link = buildSignUrl(token);
      const mail = supplierInviteEmail({
        supplierName: supplier?.name || '',
        companyName: company?.name || 'Empresa',
        contractName: contract.name,
        link,
      });
      const emailed = await sendEmail({ to: supplierEmail, ...mail });

      setSignResult({ link, emailed, email: supplierEmail });
      setCopied(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'signatureRequests');
    } finally {
      setSigningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este contrato?')) {
      try {
        await deleteDoc(doc(db, 'contracts', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'contracts');
      }
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pendente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Rascunho': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Vencido': return 'bg-red-100 text-red-700 border-red-200';
      case 'Em renovação': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Contratos</h2>
          <p className="text-slate-500 mt-1">Gerenciamento de contratos de TI e vigência.</p>
        </div>
        {isManager && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={20} />
            Novo Contrato
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, número ou fornecedor..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition">
          <Filter size={18} />
          Filtros
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrato</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fornecedor</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vigência</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{contract.name}</p>
                        <p className="text-xs text-slate-500">#{contract.contractNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{contract.supplierName}</p>
                    <p className="text-xs text-slate-500">{contract.area}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{formatDate(contract.startDate)} - {formatDate(contract.endDate)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">{formatCurrency(contract.value)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border",
                      getStatusColor(contract.status)
                    )}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {contract.hasPdf && (
                        <button
                          type="button"
                          onClick={() => viewPdf(contract)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Ver PDF"
                        >
                          <ExternalLink size={18} />
                        </button>
                      )}
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => handleSendSignature(contract)}
                          disabled={signingId === contract.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                          title="Enviar para assinatura"
                        >
                          {signingId === contract.id ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
                          Assinatura
                        </button>
                      )}
                      {isManager && (
                        <button
                          onClick={() => handleDelete(contract.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">Novo Contrato</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Número do Contrato</label>
                  <input 
                    readOnly
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed outline-none"
                    value={formData.contractNumber}
                  />
                  <p className="text-[10px] text-slate-400">Gerado automaticamente pelo sistema.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Nome do Contrato</label>
                  <input 
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Fornecedor</label>
                  <select 
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={formData.supplierId}
                    onChange={e => setFormData({...formData, supplierId: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tipo (departamento)</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value, area: '' })}
                  >
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Área</label>
                  <SearchableSelect
                    value={formData.area}
                    onChange={(v) => setFormData({ ...formData, area: v })}
                    options={AREAS_BY_TYPE[formData.type] || []}
                    placeholder={formData.type === 'Outros' ? 'Digite a área' : 'Busque ou selecione a área'}
                    allowFreeText
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Valor (R$)</label>
                  <NumericInput
                    decimal
                    placeholder="0,00"
                    value={formData.value}
                    onChange={(v) => setFormData({ ...formData, value: v })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Data Início</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Data Fim</label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {DATE_PRESETS.map((p) => {
                      const target = addMonths(formData.startDate || today(), p.months);
                      const active = formData.endDate === target;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, endDate: target })}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-semibold transition',
                            active
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="date"
                    required
                    min={formData.startDate}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Responsável Interno</label>
                <input 
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  value={formData.internalOwner}
                  onChange={e => setFormData({...formData, internalOwner: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Descrição</label>
                <textarea 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none h-24"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              {/* PDF Upload Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Documento do Contrato (PDF)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                    selectedFile ? "border-emerald-200 bg-emerald-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  )}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                  {selectedFile ? (
                    <>
                      <FileText className="text-emerald-500" size={32} />
                      <p className="text-sm font-medium text-emerald-700">{selectedFile.name}</p>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remover
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="text-slate-400" size={32} />
                      <p className="text-sm text-slate-500 font-medium">Clique para selecionar o PDF</p>
                      <p className="text-xs text-slate-400">Apenas arquivos .pdf</p>
                    </>
                  )}
                </div>
              </div>

              {formError && (
                <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition"
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center gap-2 disabled:bg-blue-400"
                >
                  {uploading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Plus size={20} />
                  )}
                  {uploading ? 'Enviando...' : 'Salvar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resultado do envio de assinatura */}
      {signResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <PenLine size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Contrato enviado para assinatura</h3>
                <p className="text-sm text-slate-500">
                  {signResult.emailed
                    ? `E-mail enviado para ${signResult.email}.`
                    : `Não foi possível enviar o e-mail automático (disponível em produção). Copie o link e envie ao fornecedor:`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              <input
                readOnly
                value={signResult.link}
                className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-600 outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(signResult.link);
                  setCopied(true);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSignResult(null)}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
