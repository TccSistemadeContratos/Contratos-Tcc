import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  allowFreeText?: boolean; // permite digitar um valor fora da lista
}

// Select com busca (combobox). Filtra as opções conforme digita e,
// se allowFreeText, aceita um valor que não está na lista.
export const SearchableSelect: React.FC<Props> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled,
  allowFreeText = true,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const pick = (v: string) => {
    onChange(v);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={open ? query : value}
          placeholder={value || placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (allowFreeText) onChange(e.target.value);
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-9 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
        />
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>

      {open && (options.length > 0 || filtered.length > 0) && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {options.length > 6 && (
            <div className="flex items-center gap-2 px-3 pb-1 text-xs text-slate-400">
              <Search size={13} /> Busque ou selecione
            </div>
          )}
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => pick(o)}
              className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-blue-50 ${
                o === value ? 'font-semibold text-blue-700' : 'text-slate-700'
              }`}
            >
              {o}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">
              {allowFreeText ? 'Sem correspondência — use o que você digitou.' : 'Nada encontrado.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
