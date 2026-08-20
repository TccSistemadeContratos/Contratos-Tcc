import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

const BR_TZ = 'America/Sao_Paulo';

// Timestamps (ISO com hora) — sempre no horário do Brasil.
export function formatDate(dateString: string) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BR_TZ,
  });
}

// Datas puras (yyyy-mm-dd) — sem hora e sem conversão de fuso
// (evita o "-3h" que jogava a data para o dia anterior).
export function formatDateOnly(dateString: string) {
  if (!dateString) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: BR_TZ,
  });
}

// "agora" no fuso do Brasil, no formato aceito por <input type="datetime-local">.
export function nowBrasilLocalInput() {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: BR_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date());
  return parts.replace(' ', 'T'); // "2026-08-20 14:23" -> "2026-08-20T14:23"
}
