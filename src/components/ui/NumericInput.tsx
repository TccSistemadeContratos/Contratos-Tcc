import React from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  decimal?: boolean; // permite vírgula/ponto para valores em R$
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
}

// Campo numérico em <input type="text"> — SEM as setinhas de +/- e SEM o 0 fixo.
// A pessoa apaga tudo e digita o valor que quiser; o 0 fica só no placeholder.
export const NumericInput: React.FC<Props> = ({
  value,
  onChange,
  decimal = false,
  placeholder = '0',
  required,
  disabled,
  className,
  maxLength,
}) => {
  const handle = (raw: string) => {
    let v = raw.replace(decimal ? /[^\d.,]/g : /\D/g, '');
    if (decimal) {
      v = v.replace(/,/g, '.');
      const parts = v.split('.');
      if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    }
    onChange(v);
  };

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={value}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => handle(e.target.value)}
      className={
        className ??
        'w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
      }
    />
  );
};
