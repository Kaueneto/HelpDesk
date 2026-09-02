'use client';

import { useTheme } from '@/contexts/ThemeContext';

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  indeterminate?: boolean;
  disabled?: boolean;
  size?: number;
}

export default function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  size = 18,
}: CheckboxProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const isActive = checked || indeterminate;

  // Cores vibrantes por estado
  const bg     = isActive  ? '#3B82F6'                            : (isDark ? '#1e293b' : '#ffffff');
  const border  = isActive  ? '#3B82F6'                            : (isDark ? '#475569' : '#cbd5e1');
  const shadow  = isActive  ? '0 0 0 3px rgb(59 130 246 / 0.20)' : 'none';

  return (
    <div
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onChange}
      onKeyDown={(e) => {
        if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          onChange();
        }
      }}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 5,
        border: `1.75px solid ${border}`,
        backgroundColor: bg,
        boxShadow: shadow,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      {/* Checkmark */}
      {checked && !indeterminate && (
        <svg
          width={size * 0.62}
          height={size * 0.62}
          viewBox="0 0 12 10"
          fill="none"
          style={{ display: 'block', flexShrink: 0 }}
        >
          <polyline
            points="1.5,5 4.5,8.5 10.5,1.5"
            stroke="#ffffff"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Indeterminate (traço) */}
      {indeterminate && (
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 10 10"
          fill="none"
          style={{ display: 'block', flexShrink: 0 }}
        >
          <line
            x1="2"
            y1="5"
            x2="8"
            y2="5"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}
