'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export default function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
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

      <div className="relative flex items-center gap-3">
        <button
          onClick={() => router.push('/bookmarks')}
          className="text-white hover:bg-white/10 p-2 rounded transition"
        >
          <img src="/icons/iconbook.svg" alt="Book" className="w-7 h-7" />
        </button>

        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-3 text-white hover:bg-white/10 px-3 py-2 rounded transition"
        >
          <img src="/icons/iconperfil.svg" alt="Perfil" className="w-7 h-7" />
          <span className="font-medium">{user?.name}</span>
        </button>

        {userMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <div className="font-bold text-gray-900 text-lg">{user?.name}</div>
              <div className="text-sm text-gray-600 mt-1">{user?.email}</div>
              <div className="text-xs text-gray-500 mt-1">ID: {user?.id}</div>
            </div>

            <div className="py-2">
              <button
                onClick={() => setUserMenuOpen(false)}
                className="w-full px-5 py-3 text-left flex items-center gap-4 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150 rounded-lg mx-2"
              >
                <img src="/icons/icontheme.svg" alt="Tema" className="w-5 h-5" />
                <span className="font-medium">Tema</span>
              </button>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push('/perfil');
                }}
                className="w-full px-5 py-3 text-left flex items-center gap-4 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150 rounded-lg mx-2"
              >
                <img src="/icons/iconconfig.svg" alt="Configurações" className="w-5 h-5" />
                <span className="font-medium">Configurações</span>
              </button>

              <div className="border-t border-gray-100 my-2"></div>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full px-5 py-3 text-left flex items-center gap-4 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-150 rounded-lg mx-2"
              >
                <img src="/icons/iconlogout.svg" alt="Sair" className="w-5 h-5" />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
