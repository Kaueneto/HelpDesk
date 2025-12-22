'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Dashboard from '@/components/admin/Dashboard';
import Parametros from '@/components/admin/Parametros';
import GerenciarChamados from '@/components/admin/GerenciarChamados';

export default function PainelAdmin() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('inicio');
  const [gerencialExpanded, setGerencialExpanded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!isLoading && user && user.roleId !== 1) {
      router.push('/usuario/inicial');
    }
  }, [isAuthenticated, isLoading, user, router]);

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

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#EDEDED' }}>
      {/* Sidebar */}
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
            <img src="/icons/iconHomeAdmin.svg" alt="Inicio" className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Inicio</span>}
          </button>

          <button
            onClick={() => setActiveMenu('chamados')}
            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition ${
              activeMenu === 'chamados' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <img src="/icons/iconchamados.svg" alt="Chamados" className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Chamados</span>}
          </button>

          <div>
            <button
              onClick={() => setGerencialExpanded(!gerencialExpanded)}
              className={`w-full px-4 py-3 text-left flex items-center justify-between transition ${
                activeMenu === 'gerencial' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <img src="/icons/iconadministrator.svg" alt="Gerencial" className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>Gerencial</span>}
              </div>
              {!sidebarCollapsed && (
                <img 
                  src="/icons/arrowpointGerencial.svg" 
                  alt="Expandir" 
                  className={`w-4 h-4 transform transition-transform ${gerencialExpanded ? 'rotate-90' : ''}`}
                />
              )}
            </button>

            {/* submenus do gerencial */}
            {gerencialExpanded && !sidebarCollapsed && (
              <div className="bg-gray-800">
                <button
                  onClick={() => setActiveMenu('usuarios')}
                  className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                    activeMenu === 'usuarios' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Usuários
                </button>

                <button
                  onClick={() => setActiveMenu('topicos')}
                  className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                    activeMenu === 'topicos' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Tópicos de Ajuda
                </button>

                <button
                  onClick={() => setActiveMenu('departamentos')}
                  className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                    activeMenu === 'departamentos' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Departamentos
                </button>

                <button
                  onClick={() => setActiveMenu('tiposPrioridade')}
                  className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                    activeMenu === 'tiposPrioridade' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Tipos de Prioridade
                </button>

                <button
                  onClick={() => setActiveMenu('parametros')}
                  className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                    activeMenu === 'parametros' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Parâmetros
                </button>
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4" style={{ backgroundColor: '#001F3F' }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
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
              <span className="font-medium">{user.name}</span>
            </button>

            {/* modal do usuario */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                {/* info do usuario */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="font-semibold text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                </div>

                {/* opcoes do menu */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // add logica de tema aqui
                    }}
                    className="w-full px-4 py-2 text-left flex items-center gap-3 text-gray-700 hover:bg-gray-100 transition"
                  >
                    <img src="/icons/icontheme.svg" alt="Tema" className="w-5 h-5" />
                    <span className="text-lg">Tema</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // add logica de configuracoes aqui
                    }}
                    className="w-full px-4 py-2 text-left flex items-center gap-3 text-gray-700 hover:bg-gray-100 transition"
                  >
                    <img src="/icons/iconconfig.svg" alt="Configurações" className="w-5 h-5" />
                    <span className="text-lg">Configurações</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                      router.push('/auth/login');
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

        {/* Área de Conteúdo */}
        <main className="flex-1 overflow-auto">
          {/* Renderizar componente baseado no menu ativo */}
          {activeMenu === 'inicio' && <Dashboard />}
          {activeMenu === 'chamados' && <GerenciarChamados />}
          {activeMenu === 'parametros' && <Parametros />}
          
          {/* Outros submenus - a implementar */}
          {activeMenu === 'usuarios' && (
            <div className="p-6">
              <div className="bg-white rounded-lg p-8">
                <h3 className="text-lg font-semibold">Gerenciar Usuários</h3>
                <p className="text-gray-900 mt-2">Funcionalidade a ser implementada</p>
              </div>
            </div>
          )}
          {activeMenu === 'topicos' && (
            <div className="p-6">
              <div className="bg-white rounded-lg p-8">
                <h3 className="text-lg font-semibold">Tópicos de Ajuda</h3>
                <p className="text-gray-600 mt-2">Funcionalidade a ser implementada</p>
              </div>
            </div>
          )}
          {activeMenu === 'departamentos' && (
            <div className="p-6">
              <div className="bg-white rounded-lg p-8">
                <h3 className="text-lg font-semibold">Gerenciar Departamentos</h3>
                <p className="text-gray-600 mt-2">Funcionalidade a ser implementada</p>
              </div>
            </div>
          )}
          {activeMenu === 'tiposPrioridade' && (
            <div className="p-6">
              <div className="bg-white rounded-lg p-8">
                <h3 className="text-lg font-semibold">Tipos de Prioridade</h3>
                <p className="text-gray-600 mt-2">Funcionalidade a ser implementada</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
