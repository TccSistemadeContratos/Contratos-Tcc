import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { ChangePassword } from './components/ChangePassword';
import { AccessBlocked } from './components/AccessBlocked';
import { Dashboard } from './components/Dashboard';
import { Contracts } from './components/Contracts';
import { Suppliers } from './components/Suppliers';
import { Incidents } from './components/Incidents';
import { Notifications } from './components/Notifications';
import { Reports } from './components/Reports';
import { CompaniesAdmin } from './components/CompaniesAdmin';
import { UsersAdmin } from './components/UsersAdmin';
import { SignContract } from './components/SignContract';
import { SignatureReconciler } from './components/SignatureReconciler';
import { MyProfile } from './components/MyProfile';
import { NotificationBell } from './components/NotificationBell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FileSignature } from 'lucide-react';

export default function App() {
  const { user, loading, access, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Rota pública de assinatura (?assinar=TOKEN) — não exige login.
  const signToken = new URLSearchParams(window.location.search).get('assinar');
  if (signToken) return <SignContract token={signToken} />;

  // Super admin abre direto no console de empresas
  useEffect(() => {
    if (isSuperAdmin) setActiveTab('companies');
    else setActiveTab('dashboard');
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="fs-aurora min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/40">
            <FileSignature size={26} className="text-white" strokeWidth={2.25} />
            <span className="absolute -inset-1.5 rounded-2xl border border-white/20 animate-ping" />
          </div>
          <p className="font-display text-sm font-medium tracking-wide text-slate-300">
            Iniciando FlowSign…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;
  if (access === 'must-change-password') return <ChangePassword />;
  if (access === 'no-account') return <AccessBlocked reason="no-account" />;
  if (access === 'inactive') return <AccessBlocked reason="inactive" />;
  if (access === 'incomplete-profile') return <MyProfile fullscreen />;

  const renderContent = () => {
    if (activeTab === 'profile') return <MyProfile />;
    if (isSuperAdmin) return <CompaniesAdmin />;
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'contracts': return <Contracts />;
      case 'suppliers': return <Suppliers />;
      case 'incidents': return <Incidents />;
      case 'reports': return <Reports />;
      case 'notifications': return <Notifications />;
      case 'users': return <UsersAdmin />;
      case 'profile': return <MyProfile />;
      default: return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen bg-slate-50 flex">
        {/* Textura ambiente sutil — tira o ar de "fundo chapado" */}
        <div
          className="pointer-events-none fixed inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(60% 45% at 100% 0%, rgb(67 83 230 / 0.06), transparent 60%), radial-gradient(50% 40% at 0% 100%, rgb(34 211 238 / 0.05), transparent 55%)',
          }}
        />
        <SignatureReconciler />
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="relative flex-1 lg:ml-64 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {!isSuperAdmin && (
              <div className="mb-4 flex justify-end lg:mb-2">
                <NotificationBell />
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
