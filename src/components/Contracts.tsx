import React, { useEffect, useState, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Plus, Search, Filter, FileText, ExternalLink, Trash2, Edit, Upload, X, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';

export const Contracts: React.FC = () => {
  const { isManager } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    contractNumber: '',
    name: '',
    supplierId: '',
    area: '',
    type: 'Software',
    startDate: '',
    endDate: '',
    value: 0,
    internalOwner: '',
    description: '',
    status: 'Ativo'
  });

  useEffect(() => {
    const q = query(collection(db, 'contracts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setContracts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contracts')
    );

    const suppliersUnsubscribe = onSnapshot(
      collection(db, 'suppliers'),
      (snapshot) => {
        setSuppliers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubscribe();
      suppliersUnsubscribe();
    };
  }, []);

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
    setUploading(true);
    try {
      let pdfUrl = '';
      
      if (selectedFile) {
        const storageRef = ref(storage, `contracts/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(storageRef, selectedFile);
        pdfUrl = await getDownloadURL(uploadResult.ref);
      }

      const supplier = suppliers.find(s => s.id === formData.supplierId);
      await addDoc(collection(db, 'contracts'), {
        ...formData,
        supplierName: supplier?.name || '',
        createdAt: new Date().toISOString(),
        value: Number(formData.value),
        pdfUrl
      });

      setShowModal(false);
      setSelectedFile(null);
      setFormData({
        contractNumber: '',
        name: '',
        supplierId: '',
        area: '',
        type: 'Software',
        startDate: '',
        endDate: '',
        value: 0,
        internalOwner: '',
        description: '',
        status: 'Ativo'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'contracts');
    } finally {
      setUploading(false);
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
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {contract.pdfUrl && (
                        <a 
                          href={contract.pdfUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Ver PDF"
                        >
                          <ExternalLink size={18} />
                        </a>
                      )}
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(contract.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
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
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={formData.contractNumber}
                    onChange={e => setFormData({...formData, contractNumber: e.target.value})}
                  />
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
                  <label className="text-sm font-medium text-slate-700">Área de TI</label>
                  <input 
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={formData.area}
                    onChange={e => setFormData({...formData, area: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tipo</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="Suporte">Suporte</option>
                    <option value="Software">Software</option>
                    <option value="Infraestrutura">Infraestrutura</option>
                    <option value="Cloud">Cloud</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Valor</label>
                  <input 
                    type="number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={formData.value}
                    onChange={e => setFormData({...formData, value: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Data Início</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Data Fim</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
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
    </div>
  );
};
