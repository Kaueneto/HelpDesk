
import { useEffect, useRef, useState } from 'react';

interface SelectOption {
  value: number;
  label: string;
}

interface CustomSelectProps {
  value: number;
  onChange: (value: number) => void;
  options: SelectOption[];
  placeholder?: string;
  textPrim: string;
  inputBg: string;
  borderClr: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  textPrim,
  inputBg,
  borderClr,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find(option => option.value === value);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">

      {/* Campo */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`
          w-full px-3 sm:px-4 py-2 sm:py-3
          rounded-lg border
          flex items-center justify-between
          text-sm sm:text-base
          transition-all duration-200
          focus:outline-none
          ${open ? 'ring-1 ring-blue-500' : ''}
        `}
        style={{
          borderColor: borderClr,
          backgroundColor: inputBg,
          color: selected ? textPrim : `${textPrim}99`,
        }}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>

        <svg
          className={`
            w-4 h-4 ml-2 shrink-0
            transition-transform duration-300
            ${open ? 'rotate-180' : ''}
          `}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Lista */}
      {open && (
        <div
          className="
            absolute z-50 left-0 right-0 mt-2
            rounded-xl border overflow-hidden
            shadow-2xl
            origin-top
            animate-select-open
          "
          style={{
            backgroundColor: inputBg,
            borderColor: borderClr,
            color: textPrim,
          }}
        >
          <div className="max-h-60 overflow-y-auto p-1">
            {options.map(option => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`
                    w-full px-3 py-2.5
                    rounded-lg
                    text-left
                    flex items-center justify-between
                    transition-all duration-150
                    hover:translate-x-1
                  `}
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'transparent',
                    color: textPrim,
                  }}
                >
                  <span>{option.label}</span>

                  {isSelected && (
                    <span className="text-blue-500">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}