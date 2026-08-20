import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  AlertCircle,
  LogOut,
  Menu,
  X,
  Bell,
  FileSignature,
  Building2,
  UserCog,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { isSuperAdmin, isCompanyAdmin, profile, company } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const navItems = isSuperAdmin
    ? [{ id: 'companies', label: 'Empresas', icon: Building2 }]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'contracts', label: 'Contratos', icon: FileText },
        { id: 'suppliers', label: 'Fornecedores', icon: Users },
        { id: 'incidents', label: 'Chamados', icon: AlertCircle },
        { id: 'reports', label: 'Relatórios', icon: BarChart3 },
        { id: 'notifications', label: 'Alertas', icon: Bell },
        ...(isCompanyAdmin ? [{ id: 'users', label: 'Usuários', icon: UserCog }] : []),
      ];

  const contextLabel = isSuperAdmin ? 'Console do administrador' : company?.name || 'Minha empresa';

  const roleName = (role?: string | null) =>
    role === 'superadmin' ? 'Super Admin' : role === 'company_admin' ? 'Administrador' : 'Usuário';

  const handleSignOut = () => signOut(auth);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fs-aurora fixed inset-y-0 left-0 z-40 w-64 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-white/5",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 pt-7 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
                <FileSignature size={18} className="text-white" strokeWidth={2.25} />
              </div>
              <h1 className="font-display text-xl font-bold tracking-tight">
                Flow<span className="text-blue-400">Sign</span>
              </h1>
            </div>

            {!isSuperAdmin && company?.logoUrl ? (
              <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.04] p-3">
                <div className="grid h-16 w-full place-items-center overflow-hidden rounded-lg bg-white p-2">
                  <img src={company.logoUrl} alt={company.name} className="max-h-full max-w-full object-contain" />
                </div>
                <p className="mt-2 truncate text-center text-sm font-semibold text-white">{company.name}</p>
              </div>
            ) : (
              <p className="mt-3 truncate text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {contextLabel}
              </p>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "group relative w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-blue-400 to-flow" />
                  )}
                  <item.icon size={19} className={cn(active ? "text-blue-300" : "text-slate-400 group-hover:text-white")} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Rodapé: perfil do usuário + sair */}
          <div className="border-t border-white/5 p-3">
            <button
              onClick={() => {
                setActiveTab('profile');
                setIsOpen(false);
              }}
              className="group mb-1 flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-white/[0.06]"
              title="Meu perfil"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-600/25 text-sm font-semibold text-blue-200">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (profile?.displayName || profile?.email || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{profile?.displayName || profile?.email}</p>
                <p className="text-xs text-slate-400">{roleName(profile?.role)}</p>
              </div>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={19} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

    </>
  );
};
