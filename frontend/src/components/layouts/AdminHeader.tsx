'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FiBook, FiUser, FiSun, FiMoon, FiLogOut } from 'react-icons/fi';
import Avatar from '@/components/Avatar';

interface AdminHeaderProps {}

export default function AdminHeader({}: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const { mode, setTheme } = useTheme();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // funcao para obter saudação baseado na hora do dia
  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.name?.split(' ')[0] || 'Usuário';
    
    if (hour >= 6 && hour < 12) {
      return `Bom dia, ${firstName}`;
    } else if (hour >= 12 && hour < 18) {
      return `Boa tarde, ${firstName}`;
    } else {
      return `Boa noite, ${firstName}`;
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
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
    <header className="h-14 flex items-center justify-between px-6 shadow-lg" style={{ backgroundColor: '#001933' }}>
      {/* Saudação no canto esquerdo */}
      <div className="text-white font-semibold text-sm font-segoe">
        {getGreeting()}
      </div>

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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200"
          style={{ color: 'white' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Avatar 
            name={user?.name} 
            avatarUrl={user?.avatar_url}
            size="sm"
          />
          <span className="font-medium hidden sm:inline text-sm">{user?.name}</span>
        </button>

        {userMenuOpen && (
          <>
            <style>{`
              @keyframes dropdown-in {
                0%   { opacity: 0; transform: translateY(-6px) scale(0.97); }
                100% { opacity: 1; transform: translateY(0)     scale(1);    }
              }
              .dropdown-anim {
                animation: dropdown-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
            `}</style>

            <div 
              className="fixed inset-0 z-40"
              onClick={() => setUserMenuOpen(false)}
            />
            
            <div 
              ref={menuRef}
              className="dropdown-anim absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl z-50 overflow-hidden"
              style={{
                backgroundColor: `rgb(var(--bg-elevated))`,
                border: `1px solid rgb(var(--border-secondary))`
              }}
            >
              {/* Cabeçalho compacto */}
              <div 
                className="px-4 py-3 flex items-center gap-3"
                style={{
                  background: `linear-gradient(135deg, rgb(var(--bg-secondary)) 0%, rgb(var(--bg-tertiary)) 100%)`,
                  borderBottom: `1px solid rgb(var(--border-secondary))`
                }}
              >
                <Avatar 
                  name={user?.name} 
                  avatarUrl={user?.avatar_url}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: `rgb(var(--text-primary))` }}>
                    {user?.name}
                  </div>
                  <div className="text-xs truncate opacity-60" style={{ color: `rgb(var(--text-tertiary))` }}>
                    {user?.email}
                  </div>
                </div>
              </div>

              {/* Itens */}
              <div className="py-1 px-1">

                {/* Tema inline — sem submenu */}
                <div className="px-2 py-1.5">
                  <p className="text-[12px] font-semibold tracking-wide opacity-50 mb-1" style={{ color: `rgb(var(--text-tertiary))` }}>
                    Tema
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'light' ? 'bg-blue-500 text-white' : ''}`}
                      style={mode !== 'light' ? { color: `rgb(var(--text-secondary))`, backgroundColor: `rgb(var(--bg-hover))` } : {}}
                    >
                      <FiSun className="w-3.5 h-3.5" /> Claro
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'dark' ? 'bg-blue-600 text-white' : ''}`}
                      style={mode !== 'dark' ? { color: `rgb(var(--text-secondary))`, backgroundColor: `rgb(var(--bg-hover))` } : {}}
                    >
                      <FiMoon className="w-3.5 h-3.5" /> Escuro
                    </button>
                  </div>
                </div>

                <div className="my-1 mx-1" style={{ height: '1px', backgroundColor: `rgb(var(--border-secondary))` }} />

                <button
                  onClick={() => { setUserMenuOpen(false); router.push('/perfil'); }}
                  className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all duration-150 text-sm"
                  style={{ color: `rgb(var(--text-primary))` }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FiUser className="w-4 h-4 opacity-60" />
                  <span>Meu perfil</span>
                </button>

                <div className="my-1 mx-1" style={{ height: '1px', backgroundColor: `rgb(var(--border-secondary))` }} />

                <button
                  onClick={() => { setUserMenuOpen(false); logout(); }}
                  className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all duration-150 text-sm"
                  style={{ color: '#EF4444' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FiLogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>

              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
