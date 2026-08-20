// ============================================================================
// Papéis e acesso do FlowSign (SaaS multi-empresa)
// ----------------------------------------------------------------------------
//  superadmin    → dono do FlowSign. Cadastra empresas-cliente e cria o admin
//                  inicial de cada uma. Não pertence a nenhuma empresa.
//  company_admin → admin da empresa-cliente. Cadastra os usuários dela e usa o
//                  sistema (contratos, fornecedores, SLA, chamados).
//  user          → usuário comum da empresa. Usa o sistema, vê só os dados dela.
// ============================================================================

export type Role = 'superadmin' | 'company_admin' | 'user';
export type Status = 'active' | 'inactive';

// IMPORTANTE: coloque aqui o(s) e-mail(s) do(s) dono(s) do FlowSign.
// Quem logar com um destes e-mails vira superadmin automaticamente (bootstrap).
// Este mesmo e-mail precisa estar nas regras do Firestore (firestore.rules).
export const SUPER_ADMIN_EMAILS: string[] = [
  'projetocontratosfacul@gmail.com',
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  companyId: string | null;
  role: Role;
  status: Status;
  mustChangePassword: boolean;
  photoUrl?: string;
  createdAt: string;
}

export type PaymentStatus = 'paid' | 'unpaid';

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  ownerCpf?: string;      // CPF do responsável/dono
  ownerPhone?: string;    // telefone do responsável
  logoUrl?: string;       // logo em base64 (data URL) ou URL http(s)
  plan?: string;          // rótulo opcional (sem efeito no acesso)
  monthlyValue?: number;  // valor da mensalidade (BRL)
  dueDay?: number;        // dia de vencimento (1-31)
  paymentStatus?: PaymentStatus; // pago libera o acesso; não pago bloqueia
  status: Status;         // suspensão manual do super admin
  createdAt: string;
  createdBy?: string;
}
