'use client';

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
  const isActive = checked || indeterminate;

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
        minWidth: size,
        minHeight: size,
        borderRadius: 4,
        border: `1px solid ${isActive ? '#3f6ce7' : '#94a3b8'}`,
        backgroundColor: isActive ? '#1d51e0' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background-color 120ms ease, border-color 120ms ease',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {checked && !indeterminate && (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 12 10" fill="none">
          <polyline
            points="1.5,5 4.5,8.5 10.5,1.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {indeterminate && (
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 10 4" fill="none">
          <line x1="1" y1="2" x2="9" y2="2" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}
