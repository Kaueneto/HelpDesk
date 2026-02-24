'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface UsuarioHeaderProps {
  onToggleSidebar: () => void;
}

export default function UsuarioHeader({ onToggleSidebar }: UsuarioHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="h-14 flex items-center justify-between px-4" style={{ backgroundColor: '#001F3F' }}>
      <button
        onClick={onToggleSidebar}
        className="text-white hover:bg-white/10 p-2 rounded transition"
      >
        <img src="/icons/menu.svg" alt="Menu" className="w-6 h-6" />
      </button>

      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-3 text-white hover:bg-white/10 px-3 py-2 rounded transition"
        >
          <img src="/icons/iconbook.svg" alt="Book" className="w-7 h-7" />
          <img src="/icons/iconperfil.svg" alt="Perfil" className="w-7 h-7" />
          <span className="font-medium">{user?.name}</span>
        </button>

        {userMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="font-semibold text-gray-900">{user?.name}</div>
              <div className="text-sm text-gray-600">{user?.email}</div>
            </div>

            <div className="py-1">
              <button
                onClick={() => setUserMenuOpen(false)}
                className="w-full px-4 py-2 text-left flex items-center gap-3 text-gray-700 hover:bg-gray-100 transition"
              >
                <img src="/icons/icontheme.svg" alt="Tema" className="w-5 h-5" />
                <span className="text-lg">Tema</span>
              </button>

              <button
                onClick={() => setUserMenuOpen(false)}
                className="w-full px-4 py-2 text-left flex items-center gap-3 text-gray-700 hover:bg-gray-100 transition"
              >
                <img src="/icons/iconconfig.svg" alt="Configurações" className="w-5 h-5" />
                <span className="text-lg">Configurações</span>
              </button>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-3 text-red-600 hover:bg-red-50 transition"
              >
                <img src="/icons/iconlogout.svg" alt="Sair" className="w-5 h-5" />
                <span className="text-lg">Sair</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
