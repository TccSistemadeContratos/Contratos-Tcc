// ============================================================================
// Criação de contas sem deslogar o admin (padrão "app secundário")
// ----------------------------------------------------------------------------
// createUserWithEmailAndPassword() loga a sessão como o usuário recém-criado.
// Para o admin criar contas de terceiros sem perder a própria sessão, criamos
// a conta numa instância secundária e efêmera do Firebase e a descartamos.
// O documento em /users é gravado pela sessão PRIMÁRIA (o admin), então as
// regras do Firestore validam a permissão do admin normalmente.
// ============================================================================
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { db } from '../firebase';
import type { Role } from './roles';

interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  companyId: string | null;
  role: Role;
  area?: string;
}

export async function createUserAccount({
  email,
  password,
  displayName,
  companyId,
  role,
  area,
}: CreateUserInput): Promise<string> {
  // Nome único por chamada — evita colisão de apps secundários simultâneos.
  const name = `fs-secondary-${Math.round(performance.now())}-${email}`;
  const secondaryApp = initializeApp(firebaseConfig as any, name);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    const uid = cred.user.uid;

    await setDoc(doc(db, 'users', uid), {
      uid,
      email: email.trim(),
      displayName: displayName.trim(),
      companyId,
      role,
      area: area || '',
      status: 'active',
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    });

    await signOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

export function mapAdminAuthError(code?: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já possui uma conta.';
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/weak-password':
      return 'A senha precisa ter ao menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'Ative o provedor E-mail/senha no Firebase Authentication.';
    default:
      return 'Não foi possível criar a conta. Tente novamente.';
  }
}
