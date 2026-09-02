'use client';

/**
 * ThemedSelect — Select reutilizável com estética glass,
 * respeitando light/dark mode via ThemeContext.
 *
 * Usa @radix-ui/react-select com position="item-aligned":
 * a lista abre sobreposta ao trigger, crescendo para cima e para baixo
 * a partir do item selecionado — sem deslocar o layout.
 */

import { useId, useState, useRef } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ThemedSelectProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  name?: string;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
}

const EMPTY_VALUE = '__themed_select_empty__';

function toRadixValue(value: string, hasEmptyOption: boolean): string | undefined {
  if (!value && hasEmptyOption) return EMPTY_VALUE;
  return value || undefined;
}

export function ThemedSelect({
  label,
  value,
  defaultValue = '',
  onChange,
  placeholder = 'Selecione',
  options,
  name,
  required = false,
  disabled = false,
  compact = false,
  fullWidth = false,
}: ThemedSelectProps) {
  const { theme, mode } = useTheme();
  const labelId = useId();
  // uid para isolar seletores CSS desta instância (múltiplos selects na mesma página)
  const uid = useId().replace(/:/g, '');
  // ref para medir a largura real do trigger e repassar ao dropdown
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined);

  const isControlled = value !== undefined;
  const hasEmptyOption = options.some((o) => o.value === '');

  const [internalValue, setInternalValue] = useState(
    defaultValue || (!hasEmptyOption ? (options[0]?.value ?? '') : ''),
  );

  const currentValue = isControlled ? value! : internalValue;
  const radixValue   = toRadixValue(currentValue, hasEmptyOption);

  const handleValueChange = (next: string) => {
    const normalized = next === EMPTY_VALUE ? '' : next;
    if (!isControlled) setInternalValue(normalized);
    onChange?.(normalized);
  };

  // ── Tokens de cor ──────────────────────────────────────────────────────

  const isDark = mode === 'dark';

  const triggerBg          = isDark ? 'rgb(30 41 59 / 0.85)'    : 'rgb(255 255 255 / 0.70)';
  const triggerBgHover     = isDark ? 'rgb(51 65 85 / 0.92)'    : 'rgb(255 255 255 / 0.86)';
  const triggerBorder      = isDark ? 'rgb(71 85 105 / 0.80)'   : 'rgb(203 213 225 / 0.78)';
  const triggerBorderHover = isDark ? 'rgb(100 116 139 / 0.90)' : 'rgb(148 163 184 / 0.82)';
  const triggerColor       = isDark ? theme.text.primary        : '#334155';
  const triggerShadow      = isDark
    ? '0 8px 22px rgb(0 0 0 / 0.30), inset 0 1px 0 rgb(255 255 255 / 0.06)'
    : '0 8px 22px rgb(15 23 42 / 0.06), inset 0 1px 0 rgb(255 255 255 / 0.72)';

  const contentBg     = isDark ? theme.background.modal : 'rgb(255 255 255 / 0.97)';
  const contentBorder = isDark ? theme.border.primary   : 'rgb(203 213 225 / 0.70)';
  const contentShadow = isDark
    ? '0 16px 40px rgb(0 0 0 / 0.50), inset 0 1px 0 rgb(255 255 255 / 0.05)'
    : '0 16px 40px rgb(15 23 42 / 0.12), inset 0 1px 0 rgb(255 255 255 / 0.80)';

  const optionColor         = isDark ? theme.text.primary     : '#334155';
  const optionHoverBg       = isDark ? theme.background.hover : '#f1f5f9';
  const optionSelectedBg    = isDark ? '#1e3a5f'              : '#eff6ff';
  const optionSelectedColor = isDark ? '#93c5fd'              : '#1d4ed8';
  const iconColor           = isDark ? '#94a3b8'              : '#64748b';

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      {/*
        CSS com escopo via uid — evita colisão entre instâncias.
        Usa data-state e data-highlighted do Radix para estilizar
        item selecionado e item em foco/hover, sem MutationObserver.
      */}
      <style>{`
        .ts-${uid}[data-state="checked"] {
          background: ${optionSelectedBg} !important;
          color: ${optionSelectedColor} !important;
        }
        .ts-${uid}[data-highlighted] {
          background: ${optionHoverBg} !important;
          outline: none !important;
        }
        .ts-${uid}[data-disabled] {
          opacity: 0.45;
          pointer-events: none;
        }
      `}</style>

      <div className={label || fullWidth ? 'block' : 'inline-block'}>
        {label && (
          <span
            id={labelId}
            className="mb-1.5 block text-sm font-medium"
            style={{ color: theme.text.primary }}
          >
            {label}
          </span>
        )}

        <SelectPrimitive.Root
          value={isControlled ? radixValue : undefined}
          defaultValue={isControlled ? undefined : radixValue}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          {name && <input type="hidden" name={name} value={currentValue} />}

          {/* ── Trigger ─────────────────────────────────────────────────── */}
          <SelectPrimitive.Trigger
            ref={triggerRef}
            aria-labelledby={label ? labelId : undefined}
            aria-label={label ?? placeholder}
            aria-required={required || undefined}
            onPointerDown={() => {
              // Captura a largura no momento em que o usuário abre o select
              if (triggerRef.current) {
                setDropdownWidth(triggerRef.current.getBoundingClientRect().width);
              }
            }}
            style={{
              display: 'inline-flex',
              width: '100%',
              minHeight: compact ? '2.15rem' : '2.5rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              border: `1px solid ${triggerBorder}`,
              borderRadius: '0.75rem',
              background: triggerBg,
              padding: compact ? '0.35rem 0.6rem' : '0.5rem 0.75rem',
              color: triggerColor,
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              fontSize: compact ? '0.8125rem' : '0.875rem',
              outline: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.58 : 1,
              transition:
                'border-color 150ms ease, 150ms ease, background 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (disabled) return;
              const el = e.currentTarget as HTMLElement;
              el.style.background   = triggerBgHover;
              el.style.borderColor  = triggerBorderHover;
            }}
            onMouseLeave={(e) => {
              if (disabled) return;
              const el = e.currentTarget as HTMLElement;
              el.style.background  = triggerBg;
              el.style.borderColor = triggerBorder;
            }}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon
              style={{
                display: 'grid',
                flexShrink: 0,
                placeItems: 'center',
                color: iconColor,
                transition: 'transform 160ms ease',
              }}
            >
              <ChevronDown size={16} strokeWidth={2} />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          {/* ── Dropdown ─────────────────────────────────────────────────── */}
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="item-aligned"
              collisionPadding={12}
              style={{
                zIndex: 9999,
                width: dropdownWidth ? `${dropdownWidth}px` : '10rem',
                minWidth: dropdownWidth ? `${dropdownWidth}px` : '10rem',
                maxHeight: 'min(20rem, var(--radix-select-content-available-height))',
                border: `1px solid ${contentBorder}`,
                borderRadius: '0.75rem',
                background: contentBg,
                boxShadow: contentShadow,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                overflow: 'hidden',
              }}
            >
              {/* Botão de scroll para cima — aparece automaticamente quando necessário */}
              <SelectPrimitive.ScrollUpButton
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '1.5rem',
                  color: iconColor,
                  cursor: 'default',
                  flexShrink: 0,
                }}
              >
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  style={{ transform: 'rotate(180deg)' }}
                />
              </SelectPrimitive.ScrollUpButton>

              <SelectPrimitive.Viewport style={{ padding: '0.25rem' }}>
                {options.map((option) => {
                  const itemVal =
                    toRadixValue(option.value, hasEmptyOption) ?? EMPTY_VALUE;
                  return (
                    <SelectPrimitive.Item
                      key={option.value || EMPTY_VALUE}
                      value={itemVal}
                      disabled={option.disabled}
                      // className com uid para os seletores CSS acima
                      className={`ts-${uid}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        padding: compact ? '0.35rem 0.65rem' : '0.45rem 0.75rem',
                        borderRadius: '0.5rem',
                        fontSize: compact ? '0.8125rem' : '0.875rem',
                        color: optionColor,
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'background 120ms ease',
                        userSelect: 'none',
                      }}
                    >
                      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                      <SelectPrimitive.ItemIndicator
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={15} strokeWidth={2.5} color={optionSelectedColor} />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  );
                })}
              </SelectPrimitive.Viewport>

              {/* Botão de scroll para baixo */}
              <SelectPrimitive.ScrollDownButton
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '1.5rem',
                  color: iconColor,
                  cursor: 'default',
                  flexShrink: 0,
                }}
              >
                <ChevronDown size={14} strokeWidth={2} />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      </div>
    </>
  );
}
