'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FiBook, FiUser, FiSun, FiMoon, FiSettings, FiLogOut, FiChevronDown } from 'react-icons/fi';

interface AdminHeaderProps {}

export default function AdminHeader({}: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const { mode, setTheme } = useTheme();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeSubmenuOpen, setThemeSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
        setThemeSubmenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <header className="h-14 flex items-center justify-end px-6 shadow-lg" style={{ backgroundColor: '#001933' }}>
      <div className="relative flex items-center gap-4">
        {/* Bookmarks Button */}
        <button
          onClick={() => router.push('/bookmarks')}
          className="p-2 rounded-lg transition-all duration-200"
          style={{
            color: 'white',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <FiBook className="w-5 h-5" />
        </button>

        {/* Profile Button */}
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
          style={{
            color: 'white',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <FiUser className="w-5 h-5" />
          <span className="font-medium hidden sm:inline text-sm">{user?.name}</span>
          <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {userMenuOpen && (
          <>
       
            <div 
              className="fixed inset-0 z-40 md:hidden"
              onClick={() => setUserMenuOpen(false)}
            />
            
            <div 
              ref={menuRef}
              className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-dropdown-open"
              style={{
                backgroundColor: `rgb(var(--bg-elevated))`,
                border: `1px solid rgb(var(--border-secondary))`
              }}
            >

              <div 
                className="px-6 py-5"
                style={{
                  background: `linear-gradient(135deg, rgb(var(--bg-secondary)) 0%, rgb(var(--bg-tertiary)) 100%)`,
                  borderBottom: `1px solid rgb(var(--border-secondary))`
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `rgb(var(--brand-primary))`,
                      color: 'white'
                    }}
                  >
                    <FiUser className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base truncate" style={{ color: `rgb(var(--text-primary))` }}>
                      {user?.name}
                    </div>
                    <div className="text-xs truncate" style={{ color: `rgb(var(--text-tertiary))` }}>
                      {user?.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* menu items */}
              <div className="py-2">
                {/* tema */}
                <div className="px-2">
                  <div className="px-3 py-2 mb-1">
                    <p className="text-xs font-semibold uppercase" style={{ color: `rgb(var(--text-tertiary))` }}>
                      Aparência
                    </p>
                  </div>
                  <button
                    onClick={() => setThemeSubmenuOpen(!themeSubmenuOpen)}
                    className="w-full px-3 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 relative"
                    style={{ 
                      color: `rgb(var(--text-primary))`,
                      backgroundColor: themeSubmenuOpen ? `rgb(var(--bg-hover))` : 'transparent'
                    }}
                    onMouseEnter={(e) => !themeSubmenuOpen && (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)}
                    onMouseLeave={(e) => !themeSubmenuOpen && (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      {mode === 'dark' ? <FiMoon className="w-5 h-5" /> : <FiSun className="w-5 h-5" />}
                    </div>
                    <span className="flex-1 text-left font-medium text-sm">Tema</span>
                    <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${themeSubmenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {themeSubmenuOpen && (
                    <div className="mt-2 ml-2 pl-3 border-l-2" style={{ borderColor: `rgb(var(--border-secondary))` }}>
                      <button
                        onClick={() => {
                          setTheme('light');
                          setThemeSubmenuOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-all duration-200 text-sm"
                        style={{
                          color: mode === 'light' ? `rgb(var(--brand-primary))` : `rgb(var(--text-secondary))`,
                          backgroundColor: mode === 'light' ? `rgba(var(--brand-primary), 0.1)` : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (mode !== 'light') e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`;
                        }}
                        onMouseLeave={(e) => {
                          if (mode !== 'light') e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <FiSun className="w-4 h-4" />
                        <span>Claro</span>
                        {mode === 'light' && <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: `rgb(var(--brand-primary))` }}></div>}
                      </button>

                      <button
                        onClick={() => {
                          setTheme('dark');
                          setThemeSubmenuOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-all duration-200 text-sm mt-1"
                        style={{
                          color: mode === 'dark' ? `rgb(var(--brand-primary))` : `rgb(var(--text-secondary))`,
                          backgroundColor: mode === 'dark' ? `rgba(var(--brand-primary), 0.1)` : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (mode !== 'dark') e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`;
                        }}
                        onMouseLeave={(e) => {
                          if (mode !== 'dark') e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <FiMoon className="w-4 h-4" />
                        <span>Escuro</span>
                        {mode === 'dark' && <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: `rgb(var(--brand-primary))` }}></div>}
                      </button>
                    </div>
                  )}
                </div>

                <div style={{
                  height: '1px',
                  backgroundColor: `rgb(var(--border-secondary))`,
                  margin: '8px 0'
                }}></div>

                <div className="px-2">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setThemeSubmenuOpen(false);
                      router.push('/perfil');
                    }}
                    className="w-full px-3 py-3 rounded-lg flex items-center gap-3 transition-all duration-200"
                    style={{ color: `rgb(var(--text-primary))` }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FiSettings className="w-5 h-5" />
                    <span className="flex-1 text-left font-medium text-sm">Configurações</span>
                  </button>
                </div>

                <div style={{
                  height: '1px',
                  backgroundColor: `rgb(var(--border-secondary))`,
                  margin: '8px 0'
                }}></div>

                {/* bt logout */}
                <div className="px-2">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setThemeSubmenuOpen(false);
                      logout();
                    }}
                    className="w-full px-3 py-3 rounded-lg flex items-center gap-3 transition-all duration-200"
                    style={{ color: '#EF4444' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FiLogOut className="w-5 h-5" />
                    <span className="flex-1 text-left font-medium text-sm">Sair</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
