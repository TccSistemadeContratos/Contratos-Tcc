import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from './firebase';
import { useAuth } from './AuthContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Contracts } from './components/Contracts';
import { Suppliers } from './components/Suppliers';
import { Incidents } from './components/Incidents';
import { Notifications } from './components/Notifications';
import { Reports } from './components/Reports';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LogIn, ShieldCheck } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthError('A janela de login foi fechada antes da conclusão.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError('Este domínio não está autorizado no Firebase. Adicione o domínio da aplicação na lista de domínios autorizados no Console do Firebase.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore this one as it usually means another popup was opened
      } else {
        setAuthError('Ocorreu um erro ao tentar entrar. Tente novamente.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Iniciando FlowSign...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">FlowSign</h1>
            <p className="text-slate-500 mb-8">Plataforma de Gestão de Contratos de TI e Monitoramento de SLA.</p>
            
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200"
            >
              <LogIn size={20} />
              Entrar com Google
            </button>

            {authError && (
              <p className="mt-4 text-sm text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                {authError}
              </p>
            )}
            
            <p className="mt-8 text-xs text-slate-400">
              Acesso restrito a colaboradores autorizados.
            </p>
          </div>
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-center gap-4">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Sistema Online
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'contracts': return <Contracts />;
      case 'suppliers': return <Suppliers />;
      case 'incidents': return <Incidents />;
      case 'reports': return <Reports />;
      case 'notifications': return <Notifications />;
      case 'admin': return <AdminPanel />;
      default: return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 lg:ml-64 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

const AdminPanel = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">Administração</h2>
      <p className="text-slate-500 mt-1">Configurações globais e gestão de usuários.</p>
    </div>
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
      <ShieldCheck size={48} className="mx-auto text-blue-600 mb-4" />
      <h3 className="text-xl font-bold mb-2">Painel de Controle</h3>
      <p className="text-slate-500 max-w-md mx-auto">
        Esta área permite gerenciar permissões de usuários e configurações críticas do sistema.
      </p>
    </div>
  </div>
);
