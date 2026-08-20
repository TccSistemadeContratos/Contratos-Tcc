import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { isSuperAdminEmail, isProfileComplete, type UserProfile, type Company, type Role } from './lib/roles';

// Estado do portão de acesso ao SaaS
type AccessStatus =
  | 'loading'
  | 'ok'
  | 'no-account'        // autenticou, mas não tem conta no FlowSign
  | 'inactive'          // conta ou empresa desativada (assinatura inativa)
  | 'must-change-password'
  | 'incomplete-profile'; // precisa preencher o perfil no primeiro acesso

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  company: Company | null;
  loading: boolean;
  access: AccessStatus;
  role: Role | null;
  companyId: string | null;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  isManager: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  company: null,
  loading: true,
  access: 'loading',
  role: null,
  companyId: null,
  isSuperAdmin: false,
  isCompanyAdmin: false,
  isManager: false,
  refresh: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [access, setAccess] = useState<AccessStatus>('loading');
  const [loading, setLoading] = useState(true);

  // Carrega perfil + empresa e decide o acesso do usuário atual.
  const loadContext = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setProfile(null);
      setCompany(null);
      setAccess('loading');
      return;
    }

    // Bootstrap do dono do FlowSign (superadmin) — sempre autoritativo,
    // mesmo que exista um perfil antigo dessa conta (ex.: role 'viewer').
    if (isSuperAdminEmail(firebaseUser.email)) {
      const ref = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(ref);
      const existing = snap.exists() ? (snap.data() as Partial<UserProfile>) : null;
      const sa: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || existing?.email || '',
        displayName: existing?.displayName || firebaseUser.displayName || 'Administrador FlowSign',
        companyId: null,
        role: 'superadmin',
        status: 'active',
        mustChangePassword: false,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      if (!existing || existing.role !== 'superadmin' || existing.companyId != null) {
        await setDoc(ref, sa, { merge: true });
      }
      setProfile(sa);
      setCompany(null);
      setAccess('ok');
      return;
    }

    // Usuários comuns: só entram se cadastrados (convite-only)
    let userDoc;
    try {
      userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      setProfile(null);
      setCompany(null);
      setAccess('no-account');
      return;
    }

    if (!userDoc.exists()) {
      setProfile(null);
      setCompany(null);
      setAccess('no-account');
      return;
    }

    const prof = userDoc.data() as UserProfile;
    setProfile(prof);

    if (prof.status !== 'active') {
      setCompany(null);
      setAccess('inactive');
      return;
    }

    // Valida a empresa (assinatura ativa)
    let comp: Company | null = null;
    if (prof.companyId) {
      const compSnap = await getDoc(doc(db, 'companies', prof.companyId));
      if (compSnap.exists()) {
        comp = { id: compSnap.id, ...(compSnap.data() as Omit<Company, 'id'>) };
      }
    }
    setCompany(comp);

    // Bloqueia se a empresa foi suspensa OU se a mensalidade está em aberto.
    const companyActive = !!comp && comp.status === 'active';
    const companyPaid = !!comp && comp.paymentStatus !== 'unpaid';
    if (!companyActive || !companyPaid) {
      setAccess('inactive');
      return;
    }

    if (prof.mustChangePassword) {
      setAccess('must-change-password');
      return;
    }

    if (!isProfileComplete(prof)) {
      setAccess('incomplete-profile');
      return;
    }

    setAccess('ok');
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      try {
        await loadContext(firebaseUser);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [loadContext]);

  const refresh = useCallback(async () => {
    await loadContext(auth.currentUser);
  }, [loadContext]);

  const role = profile?.role ?? null;
  const isSuperAdmin = role === 'superadmin';
  const isCompanyAdmin = role === 'company_admin';
  const isManager = isSuperAdmin || isCompanyAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        company,
        loading,
        access,
        role,
        companyId: profile?.companyId ?? null,
        isSuperAdmin,
        isCompanyAdmin,
        isManager,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
