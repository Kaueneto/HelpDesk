'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { HiSun, HiMoon } from 'react-icons/hi';

export default function ThemeSwitcher() {
  const { mode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-all duration-300 hover:bg-bg-hover border border-border-secondary"
      aria-label="Alternar tema"
      title={`Mudar para ${mode === 'light' ? 'escuro' : 'claro'}`}
    >
         {mode === 'light' ? (
              <HiSun className="w-5 h-5 text-amber-500" />
                        ) : (
               <HiMoon className="w-5 h-5 text-blue-300" />
            )}
                
    </button>
  );
}
