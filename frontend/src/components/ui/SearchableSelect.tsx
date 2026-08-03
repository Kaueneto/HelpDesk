'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { FiCheck, FiChevronDown, FiLayers, FiSearch } from 'react-icons/fi';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
}

type Props = {
  value: string | number | (string | number)[];
  onChange: (val: string | number | (string | number)[]) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  width?: number | string;
  dropdownWidth?: number | string;
  fullWidth?: boolean;
  className?: string;
  multi?: boolean;
};

function triggerLabel(
  value: string | number | (string | number)[],
  options: SelectOption[],
  placeholder: string,
): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return placeholder;
    if (value.length === 1) return options.find((option) => option.value === value[0])?.label ?? placeholder;
    return `${value.length} selecionados`;
  }

  const found = options.find((option) => option.value === value);
  return found ? found.label : placeholder;
}

export function SearchableSelect(props: Props) {
  const {
    options,
    placeholder = 'Selecione...',
    label,
    width = 180,
    dropdownWidth,
    multi,
    fullWidth,
    className,
  } = props;

  // Auto-detectar se é multi baseado no tipo do value
  const isModeMulti = Array.isArray(props.value);
  const isMultiProp = multi === true || isModeMulti;

  const { mode } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [multiMode, setMultiMode] = useState(false);
  const [localSelectedMulti, setLocalSelectedMulti] = useState<(string | number)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? options.filter((option) => {
        const searchText = search.toLowerCase();
        return (
          option.label.toLowerCase().includes(searchText) ||
          (option.sublabel?.toLowerCase().includes(searchText) ?? false)
        );
      })
    : options;

  const dw = dropdownWidth ?? (fullWidth ? '100%' : typeof width === 'number' ? `${width}px` : width);
  const multiValues: (string | number)[] = isModeMulti 
    ? (props.value as (string | number)[]) 
    : multiMode 
      ? localSelectedMulti 
      : [];

  function isChecked(value: string | number): boolean {
    if (!multiMode && !isMultiProp) return (props.value as string | number) === value;
    return multiValues.includes(value);
  }

  function handleSelect(value: string | number) {
    if (!multiMode && !isMultiProp) {
      (props as any).onChange(value);
      setOpen(false);
      setSearch('');
      return;
    }

    if (isMultiProp) {
      const current = multiValues;
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      (props as any).onChange(next);
    } else if (multiMode) {
      const current = localSelectedMulti;
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      setLocalSelectedMulti(next);
    }
  }

  function handleSelectAll() {
    if (isMultiProp) {
      (props as any).onChange(filtered.map((option) => option.value));
    } else if (multiMode) {
      setLocalSelectedMulti(filtered.map((option) => option.value));
    }
  }

  function handleClear() {
    if (isMultiProp) {
      (props as any).onChange([]);
    } else if (multiMode) {
      setLocalSelectedMulti([]);
    } else {
      (props as any).onChange('');
    }
  }

  const toggleMultiMode = useCallback(() => {
    setMultiMode((prevMultiMode) => {
      if (prevMultiMode) {
        // Sair do modo múltipla: limpar tudo
        setLocalSelectedMulti([]);
        setSearch('');
        return false;
      } else {
        // Entrando no modo múltipla
        setSearch('');
        return true;
      }
    });
  }, []);

  function handleConcluir() {
    if (isMultiProp) {
      // Já aplicado via onChange a cada clique, só fechar
      setOpen(false);
      setSearch('');
    } else if (multiMode) {
      // Aplicar as seleções locais
      (props as any).onChange(localSelectedMulti);
      setOpen(false);
      setSearch('');
      setMultiMode(false);
      setLocalSelectedMulti([]);
    }
  }

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
        setMultiMode(false);
        setLocalSelectedMulti([]);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 40);
    }
  }, [open]);

  const showMultiBar = multiMode || isMultiProp;
  const hasSelection = isMultiProp
    ? multiValues.length > 0
    : (props.value !== '' && props.value !== undefined && props.value !== null && props.value !== 0);

  const tLabel = triggerLabel(isMultiProp ? multiValues : (props.value as string | number), options, placeholder);

  const isDark = mode === 'dark';
  const surface = isDark ? '#1E293B' : '#FFFFFF';
  const surfaceAlt = isDark ? '#0F172A' : '#F8FAFC';
  const border = isDark ? '#334155' : '#E2E8F0';
  const text = isDark ? '#F1F5F9' : '#1E293B';
  const muted = isDark ? '#94A3B8' : '#64748B';
  const selectedBg = isDark ? '#2861507e' : '#b5cff077';
  const selectedText = isDark ? '#ebebeb' : '#002896';
  const confirmText = isDark ? '#034424' : '#2563EB';
  const confirmBg = isDark ? '#85e2b4' : '#DBEAFE';
  const SelectedBg = isDark ? '#2843617e' : '#b5cff077';
  const hoverBg = isDark ? '#334155' : '#F1F5F9';
  const inputBg = isDark ? '#0F172A' : '#FFFFFF';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-1 relative ${className ?? ''}`}
      style={fullWidth ? { width: '100%' } : { width }}
    >
      {label && (
        <label className="text-[11px] font-medium tracking-wide select-none" style={{ color: muted }}>
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-all duration-200 outline-none select-none`}
        style={{
          background: isDark ? '#0F172A' : '#F8FAFC',
          borderColor: open ? (isDark ? '#60A5FA' : '#93C5FD') : border,
          color: hasSelection ? selectedText : text,
          boxShadow: open
            ? `0 0 0 1px ${isDark ? 'rgba(96,165,250,0.12)' : 'rgba(59,130,246,0.08)'}`
            : 'none',
        }}
      >
        <span className="truncate text-xs" style={{ color: hasSelection ? selectedText : muted }}>
          {tLabel}
        </span>
        <FiChevronDown
          size={12}
          style={{
            color: muted,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 180ms ease',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 z-[200] mt-1 overflow-hidden rounded-lg border shadow-md"
          style={{ width: dw, backgroundColor: surface, borderColor: border }}
        >
          <div className="flex items-center gap-2 px-2 pt-1.5 pb-1">
            {!isMultiProp && (
              <button
                type="button"
                onClick={() => toggleMultiMode()}
                className="flex flex-1 items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor: multiMode ? selectedBg : (isDark ? '#334155' : '#F1F5F9'),
                  color: multiMode ? selectedText : muted,
                }}
              >
                <FiLayers size={10} />
                {multiMode ? 'Modo: Múltipla' : 'Múltipla'}
              </button>
            )}

            {isMultiProp && (
              <span
                className="flex flex-1 items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: selectedBg, color: selectedText }}
              >
                <FiLayers size={10} />
                Múltipla
              </span>
            )}
          </div>

          <div className="mx-2 h-px" style={{ backgroundColor: border }} />

          <div className="px-2 py-1.5">
            <div
              className="flex items-center gap-2 rounded px-2 py-1 text-xs"
              style={{ backgroundColor: surfaceAlt, borderColor: border, border: `1px solid ${border}` }}
            >
              <FiSearch size={10} style={{ color: muted }} />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar..."
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: text }}
              />
            </div>
          </div>

          {showMultiBar && (
            <div className="flex items-center justify-between gap-1 px-2 py-1 ">
              <button
                type="button"
                onClick={handleSelectAll}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors"
                style={{ backgroundColor: isDark ? '#1E3A8A20' : '#DBEAFE60', color: selectedText }}
              >
                Todos
              </button>
              {multiValues.length > 1 && (
                <button
                  type="button"
                  onClick={handleConcluir}
                  className="rounded px-2 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap"
                  style={{ backgroundColor: confirmBg, color: confirmText }}
                >
                  ✓ Confirmar ({multiValues.length})
                </button>
              )}
              <button
                type="button"
                onClick={handleClear}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors"
                style={{ backgroundColor: isDark ? '#450A0A30' : '#FEE2E260', color: isDark ? '#fca5a5' : '#dc2626' }}
              >
                Limpar
              </button>
            </div>
          )}

          <div className="h-px" style={{ backgroundColor: border }} />

          <div className="max-h-52 overflow-y-auto overflow-x-hidden py-0.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-center text-xs" style={{ color: muted }}>
                Nenhum resultado
              </div>
            ) : (
              filtered.map((option) => {
                const checked = isChecked(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-all duration-100"
                    style={{
                      backgroundColor: checked ? SelectedBg : 'transparent',
                      color: checked ? selectedText : text,
                    }}
                  >
                    <span
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border"
                      style={{
                        borderColor: checked ? (isDark ? '#60A5FA' : '#3B82F6') : border,
                        backgroundColor: checked ? (isDark ? '#004aeb' : '#2563EB') : 'transparent',
                      }}
                    >
                      {checked && <FiCheck size={8} style={{ color: '#FFFFFF' }} strokeWidth={3} />}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-xs">{option.label}</span>
                      {option.sublabel && (
                        <span className="truncate text-[9px] font-normal" style={{ color: muted }}>
                          {option.sublabel}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
