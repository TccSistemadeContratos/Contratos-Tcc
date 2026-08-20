import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Activity,
  FileSignature,
} from 'lucide-react';

/* Logotipo FlowSign — monograma em traço + wordmark */
const Wordmark: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div className="flex items-center gap-2.5">
    <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
      <FileSignature size={18} className="text-white" strokeWidth={2.25} />
    </div>
    <span
      className={`font-display text-lg font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}
    >
      Flow<span className="text-blue-500">Sign</span>
    </span>
  </div>
);

/* Grafismo da marca: assinatura que se desenha + pulso de SLA ao vivo */
const SignatureFlow: React.FC = () => (
  <svg viewBox="0 0 420 300" className="h-full w-full" fill="none" aria-hidden="true">
    {/* linha de base do "documento" */}
    <line x1="40" y1="250" x2="380" y2="250" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
    <line x1="40" y1="272" x2="300" y2="272" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />

    {/* pulso de SLA (monitoramento em tempo real) */}
    <path
      d="M40 150 H150 l14 -34 l18 66 l14 -32 H380"
      stroke="rgba(255,255,255,0.14)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M40 150 H150 l14 -34 l18 66 l14 -32 H380"
      stroke="var(--color-flow)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="fs-pulse-dash"
    />

    {/* traço de assinatura que se desenha */}
    <path
      className="fs-sign-path"
      d="M70 230 C 90 150, 120 120, 140 150 C 160 180, 130 210, 155 215 C 190 222, 210 150, 250 170 C 285 188, 250 235, 285 232 C 320 229, 330 200, 360 205"
      stroke="url(#fs-ink)"
      strokeWidth="3.5"
      strokeLinecap="round"
    />

    {/* nós de SLA */}
    <circle cx="196" cy="132" r="5" fill="var(--color-flow)" className="fs-blink" />
    <circle cx="196" cy="132" r="11" fill="none" stroke="var(--color-flow)" strokeOpacity="0.35" strokeWidth="1.5" />

    <defs>
      <linearGradient id="fs-ink" x1="70" y1="120" x2="360" y2="230" gradientUnits="userSpaceOnUse">
        <stop stopColor="#9fabff" />
        <stop offset="1" stopColor="#22d3ee" />
      </linearGradient>
    </defs>
  </svg>
);

const highlights = [
  { icon: Activity, label: 'SLA em tempo real' },
  { icon: FileSignature, label: 'Contratos & fornecedores' },
  { icon: ShieldCheck, label: 'Auditoria completa' },
];

function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido. Verifique e tente novamente.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Fale com o administrador.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um momento e tente de novo.';
    case 'auth/popup-closed-by-user':
      return 'A janela de login foi fechada antes de concluir.';
    case 'auth/unauthorized-domain':
      return 'Domínio não autorizado no Firebase. Libere-o no console.';
    case 'auth/cancelled-popup-request':
      return '';
    default:
      return 'Não foi possível entrar. Tente novamente.';
  }
}

export const Login: React.FC = () => {
  const reduce = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      setError(mapAuthError(err?.code) || 'Não foi possível entrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Informe seu e-mail acima para receber o link de redefinição.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice('Enviamos um link de redefinição para o seu e-mail.');
    } catch (err: any) {
      setError(mapAuthError(err?.code));
    }
  };

  const stagger = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: reduce ? 0 : 0.1 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Painel de marca ---------- */}
      <aside className="fs-aurora relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="fs-grid pointer-events-none absolute inset-0" />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <Wordmark dark />
        </motion.div>

        {/* Grafismo central */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto flex w-full max-w-md flex-1 items-center py-10"
        >
          <SignatureFlow />
        </motion.div>

        {/* Chamada */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative">
          <motion.p
            variants={item}
            className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-blue-300/80"
          >
            Plataforma de gestão de contratos
          </motion.p>
          <motion.h1
            variants={item}
            className="font-display text-4xl font-bold leading-[1.05] text-white xl:text-5xl"
          >
            Contratos assinados,
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-flow bg-clip-text text-transparent">
              SLAs sob controle.
            </span>
          </motion.h1>
          <motion.p variants={item} className="mt-4 max-w-md text-sm leading-relaxed text-slate-300/80">
            Centralize contratos de TI, fornecedores e chamados — com monitoramento
            de SLA em tempo real e alertas antes de qualquer violação.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-2.5">
            {highlights.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 backdrop-blur-sm"
              >
                <Icon size={14} className="text-flow" />
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </aside>

      {/* ---------- Painel do formulário ---------- */}
      <main className="flex min-h-screen items-center justify-center px-6 py-8 sm:px-10">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="w-full max-w-sm"
        >
          {/* Logo (aparece no mobile e reforça a marca no desktop) */}
          <motion.div variants={item} className="mb-6 lg:mb-8">
            <Wordmark />
          </motion.div>

          <motion.h2 variants={item} className="font-display text-3xl font-bold text-slate-900">
            Boas-vindas de volta
          </motion.h2>
          <motion.p variants={item} className="mt-2 text-sm text-slate-500">
            Entre para gerenciar seus contratos e SLAs.
          </motion.p>

          <motion.form variants={item} onSubmit={handleEmailLogin} className="mt-8 space-y-4">
            {/* E-mail */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                E-mail
              </label>
              <div className="group relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com.br"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/12"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="group relative">
                <Lock
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Mensagens */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600"
              >
                {error}
              </motion.p>
            )}
            {notice && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700"
              >
                {notice}
              </motion.p>
            )}

            {/* Entrar */}
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={reduce ? undefined : { y: -1 }}
              whileTap={reduce ? undefined : { scale: 0.99 }}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Rodapé */}
          <motion.div variants={item} className="mt-8 text-center">
            <p className="text-xs text-slate-400">Acesso restrito a empresas cadastradas.</p>
            <div className="mt-2 flex items-center justify-center gap-3 text-xs text-slate-400">
              <a href="#" className="transition hover:text-slate-600">Privacidade</a>
              <span className="text-slate-300">·</span>
              <a href="#" className="transition hover:text-slate-600">Termos de uso</a>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};
