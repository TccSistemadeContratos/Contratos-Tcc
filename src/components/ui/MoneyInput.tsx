import React from 'react';

interface Props {
  value: string; // valor numérico em reais como string, ex.: "1234.5"
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

const fmt = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Campo de dinheiro (R$): a pessoa digita e vai formatando "1.234,56".
// Sem setinha, sem 0 fixo — placeholder mostra 0,00.
export const MoneyInput: React.FC<Props> = ({ value, onChange, placeholder = '0,00', disabled, required }) => {
  const display = value !== '' && !isNaN(Number(value)) ? fmt.format(Number(value)) : '';

  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return onChange('');
    onChange(String(Number(digits) / 100));
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
      <input
        type="text"
        inputMode="numeric"
        required={required}
        disabled={disabled}
        value={display}
        placeholder={placeholder}
        onChange={(e) => handle(e.target.value)}
        className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
};
