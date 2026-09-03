'use client';

/**
 * ThemedSelectMulti — Select de múltipla seleção com estética glass,
 * visual idêntico ao ThemedSelect, respeitando light/dark via ThemeContext.
 *
 * Não usa Radix (que não suporta multi) — implementa dropdown próprio
 * com portal no body para não sofrer clipping de overflow.
 */

import { useId, useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ThemedSelectMultiProps {
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
}

export function ThemedSelectMulti({
  label,
  values,
  onChange,
  placeholder = 'Todos',
  options,
  disabled = false,
  compact = false,
  fullWidth = false,
}: ThemedSelectMultiProps) {
  const { theme, mode } = useTheme();
  const labelId = useId();
  const uid = useId().replace(/:/g, '');

  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDark = mode === 'dark';

  // ── Tokens de cor ──────────────────────────────────────────────────────
  const triggerBg          = isDark ? 'linear-gradient(135deg, rgb(0 34 68 / 0.50), rgb(15 23 42 / 0.42))' : 'linear-gradient(135deg, rgb(255 255 255 / 0.58), rgb(226 232 240 / 0.34))';
  const triggerBgHover     = isDark ? 'linear-gradient(135deg, rgb(0 50 94 / 0.62), rgb(30 41 59 / 0.52))' : 'linear-gradient(135deg, rgb(255 255 255 / 0.72), rgb(219 234 254 / 0.44))';
  const triggerBorder      = isDark ? 'rgb(255 255 255 / 0.15)' : 'rgb(255 255 255 / 0.65)';
  const triggerBorderHover = isDark ? 'rgb(147 197 253 / 0.42)' : 'rgb(147 197 253 / 0.58)';
  const triggerColor       = isDark ? theme.text.primary        : '#334155';
  const triggerShadow      = isDark
    ? '0 8px 32px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.15)'
    : '0 8px 28px rgb(15 23 42 / 0.10), inset 0 1px 0 rgb(255 255 255 / 0.82)';

  const contentBg     = isDark ? 'linear-gradient(135deg, rgb(0 34 68 / 0.58), rgb(15 23 42 / 0.48))' : 'linear-gradient(135deg, rgb(255 255 255 / 0.72), rgb(226 232 240 / 0.48))';
  const contentBorder = isDark ? 'rgb(255 255 255 / 0.15)' : 'rgb(255 255 255 / 0.72)';
  const contentShadow = isDark
    ? '0 8px 32px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.15)'
    : '0 12px 32px rgb(15 23 42 / 0.14), inset 0 1px 0 rgb(255 255 255 / 0.86)';

  const optionColor      = isDark ? theme.text.primary     : '#334155';
  const optionHoverBg    = isDark ? theme.background.hover : '#f1f5f9';
  const optionSelectedBg = isDark ? '#1e3a5f'              : '#eff6ff';
  const iconColor        = isDark ? '#94a3b8'              : '#64748b';
  const checkColor       = isDark ? '#93c5fd'              : '#1d4ed8';

  // ── Posição do dropdown via portal ─────────────────────────────────────
  const calcDropdownStyle = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownMaxH = 220; // 18rem

    // Altura estimada do dropdown (usa o máximo ou o espaço disponível)
    const availableAbove = rect.top;
    const availableBelow = window.innerHeight - rect.bottom;
    const effectiveH = Math.min(dropdownMaxH, Math.max(availableAbove, availableBelow));

    // aqui onde alinhamos dropdown com o centro do trigger (item-aligned)
    // Se não couber, empurra para dentro da viewport
    let top = rect.top + rect.height / 2 - effectiveH / 5;
    top = Math.max(8, Math.min(top, window.innerHeight - effectiveH - 8));

    setDropdownStyle({
      position: 'fixed',
      zIndex: 9999,
      width: `${rect.width}px`,
      minWidth: `${rect.width}px`,
      left: `${rect.left}px`,
      top: `${top}px`,
      maxHeight: `${effectiveH}px`,
      overflowY: 'auto',
      border: `1px solid ${contentBorder}`,
      borderRadius: '0.75rem',
      background: contentBg,
      boxShadow: contentShadow,
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      padding: '0.25rem',
    });
  }, [contentBorder, contentBg, contentShadow]);

  const handleOpen = () => {
    if (disabled) return;
    calcDropdownStyle();
    setOpen(true);
  };

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Recalcular posição ao rolar/redimensionar
  useEffect(() => {
    if (!open) return;
    const handler = () => calcDropdownStyle();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, calcDropdownStyle]);

  const toggle = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter(v => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const triggerLabel = values.length === 0
    ? placeholder
    : values.length === 1
      ? (options.find(o => o.value === values[0])?.label ?? placeholder)
      : `${values.length} selecionados`;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .tsm-item-${uid}:hover {
          background: ${optionHoverBg} !important;
        }
        .tsm-item-${uid}.selected {
          background: ${optionSelectedBg} !important;
        }
        .tsm-dropdown-${uid} {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .tsm-dropdown-${uid}::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className={fullWidth ? 'block w-full' : 'inline-block'}>
        {label && (
          <span
            id={labelId}
            className="mb-1.5 block text-sm font-medium"
            style={{ color: theme.text.primary }}
          >
            {label}
          </span>
        )}

        {/* ── Trigger ── */}
        <button
          ref={triggerRef}
          type="button"
          aria-labelledby={label ? labelId : undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={handleOpen}
          style={{
            display: 'inline-flex',
            width: '100%',
            minHeight: compact ? '2.15rem' : '2.5rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            border: `1px solid ${triggerBorder}`,
            borderRadius: '0.75rem',
            background: triggerBg,
            padding: compact ? '0.35rem 0.6rem' : '0.5rem 0.75rem',
            color: values.length > 0 ? triggerColor : (isDark ? '#64748b' : '#94a3b8'),
            boxShadow: triggerShadow,
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            fontSize: compact ? '0.8125rem' : '0.875rem',
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.58 : 1,
            transition: 'border-color 150ms ease, background 150ms ease',
            textAlign: 'left',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            if (disabled) return;
            (e.currentTarget as HTMLElement).style.background = triggerBgHover;
            (e.currentTarget as HTMLElement).style.borderColor = triggerBorderHover;
          }}
          onMouseLeave={(e) => {
            if (disabled) return;
            (e.currentTarget as HTMLElement).style.background = triggerBg;
            (e.currentTarget as HTMLElement).style.borderColor = triggerBorder;
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
            {triggerLabel}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {values.length > 0 && (
              <span
                onClick={(e) => { e.stopPropagation(); onChange([]); }}
                title="Limpar seleção"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  fontSize: '12px',
                  lineHeight: 1,
                  color: iconColor,
                  cursor: 'pointer',
                }}
              >
                ×
              </span>
            )}
            <ChevronDown
              size={16}
              strokeWidth={2}
              style={{
                color: iconColor,
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 160ms ease',
              }}
            />
          </span>
        </button>

        {/* ── Dropdown via portal ── */}
        {open && typeof document !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            className={`tsm-dropdown-${uid}`}
            style={dropdownStyle}
          >
            {options.map((option) => {
              const isSelected = values.includes(option.value);
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => !option.disabled && toggle(option.value)}
                  className={`tsm-item-${uid}${isSelected ? ' selected' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: compact ? '0.35rem 0.65rem' : '0.45rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: compact ? '0.8125rem' : '0.875rem',
                    color: optionColor,
                    cursor: option.disabled ? 'not-allowed' : 'pointer',
                    opacity: option.disabled ? 0.45 : 1,
                    userSelect: 'none',
                    transition: 'background 120ms ease',
                  }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <Check size={14} strokeWidth={2.5} color={checkColor} style={{ flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
      </div>
    </>
  );
}
