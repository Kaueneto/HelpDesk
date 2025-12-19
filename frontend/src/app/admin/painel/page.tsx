'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function PainelAdmin() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('inicio');
   

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!isLoading && user && user.roleId !== 1) {
      router.push('/usuario/inicial');
    }
  }, [isAuthenticated, isLoading, user, router]);

  

  // Carregar dados quando as datas estiverem definidas

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.roleId !== 1) {
    return null;
  }

  const cores = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#EDEDED' }}>
      {/* sidebar lateral esq */}
      <aside
        className={`transition-all duration-300 flex flex-col ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
        style={{ backgroundColor: '#3F3F3F' }}
      >
          <div className="p-4 border-b border-gray-600">
            <h1 className={`text-white font-bold transition-all ${sidebarCollapsed ? 'text-xs text-center' : 'text-xl'}`}>
              {sidebarCollapsed ? 'CC' : 'Central de chamados'}
            </h1>
          </div>

          <nav className="flex-1 py-4">
            <button
              onClick={() => setActiveMenu('inicio')}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition ${
                activeMenu === 'inicio' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {!sidebarCollapsed && <span>Inicio</span>}
            </button>

            <button
              onClick={() => setActiveMenu('chamados')}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition ${
                activeMenu === 'chamados' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >

              {!sidebarCollapsed && <span>Chamados</span>}
            </button>

            <button
              onClick={() => setActiveMenu('gerencial')}
              className={`w-full px-4 py-3 text-left flex items-center justify-between transition ${
                activeMenu === 'gerencial' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">

                {!sidebarCollapsed && <span>Gerencial</span>}
              </div>
              {!sidebarCollapsed && <span>&gt;</span>}
            </button>
          </nav>
        </aside>

        {/* area de conteudo principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 flex items-center justify-between px-4" style={{ backgroundColor: '#001F3F' }}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-white hover:bg-white/10 p-2 rounded transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-3 text-white">
             
              <span className="font-medium">{user.name}</span>
            </div>
          </header>

          {/* area de conteudo */}
          <main className="flex-1 overflow-auto">
          {/* faixa do dashboard */}
          <div className="bg-blue-400 px-6 py-4">
            <h2 className="text-white text-2xl font-semibold">Dashboard</h2>
          </div>

          <div className="p-6">
            {/* Filtros de Data */}
           

            {/* cards do chamado */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-green-500 rounded-lg p-8 flex items-center gap-6 text-white">
                
              </div>

              <div className="bg-red-500 rounded-lg p-8 flex items-center gap-6 text-white">
                <div>
         
                </div>
              </div>
            </div>
            {/* quero implementar os graficos aqui */}
          </div>
        </main>
      </div>
    </div>
  );
}
