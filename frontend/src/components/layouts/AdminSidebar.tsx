'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [gerencialExpanded, setGerencialExpanded] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <aside
      className={`transition-all duration-100 ease-out flex flex-col relative group ${
        collapsed ? 'w-16' : 'w-64'
      } shadow-2xl border-r border-gray-800/50`}
      style={{ 
        backgroundColor: '#001933',
        background: '#001933',
      }}
    >
      {/* header com botao de toggle */}
      <div className="p-4">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <h1 className="text-white font-bold text-xl transition-all duration-100 ease-out ">
              Central de Chamados
            </h1>

          )}
  
              {/* botao de toggle */}
          <button
            onClick={onToggle}
            className="text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-150 hover:scale-115"
            title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          >
            <img 
              src="/icons/menu.svg" 
              alt="Menu" 
              className="w-6 h-6 transition-transform duration-150" 
            />
          </button>
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        <button
          onClick={() => router.push('/painel')}
          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-150 group/item relative ${
            isActive('/painel') 
              ? 'bg-linear-to-r from-blue-600/30 to-blue-700/10 text-white border-r-2 border-blue-400 ' 
              : 'text-gray-300 hover:bg-white/5 hover:text-white'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <img 
            src="/icons/iconHomeAdmin.svg" 
            alt="Inicio" 
            className="w-5 h-5 shrink-0 group-hover/item:scale-110 transition-transform duration-150" 
          />
          {!collapsed && (
            <span className="font-medium transition-all duration-200">
              Inicio
            </span>
          )}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
              Inicio
            </div>
          )}
        </button>

        <button
          onClick={() => router.push('/chamados')}
          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-150 group/item relative ${
            isActive('/chamados') || pathname.startsWith('/chamado/') 
              ? 'bg-linear-to-r from-blue-600/30 to-blue-700/20 text-white border-r-2 border-blue-400' 
              : 'text-gray-300 hover:bg-white/5 hover:text-white'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <img 
            src="/icons/iconchamados.svg" 
            alt="Chamados" 
            className="w-5 h-5 shrink-0 group-hover/item:scale-110 transition-transform duration-150" 
          />
          {!collapsed && (
            <span className="font-medium transition-all duration-200">
              Chamados
            </span>
          )}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
              Chamados
            </div>
          )}
        </button>

        <div>
          <button
            onClick={() => !collapsed && setGerencialExpanded(!gerencialExpanded)}
            className={`w-full px-4 py-3 text-left flex items-center justify-between transition-all duration-150 group/item relative text-gray-300 hover:bg-white/5 hover:text-white ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <img 
                src="/icons/iconadministrator.svg" 
                alt="Gerencial" 
                className="w-5 h-5 shrink-0 group-hover/item:scale-110 transition-transform duration-150" 
              />
              {!collapsed && (
                <span className="font-medium transition-all duration-200">
                  Gerencial
                </span>
              )}
            </div>
            {!collapsed && (
              <img 
                src="/icons/arrowpointGerencial.svg" 
                alt="Expandir" 
                className={`w-4 h-4 transform transition-all duration-200 ${
                  gerencialExpanded ? 'rotate-90' : ''
                }`}
              />
            )}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
                Gerencial
              </div>
            )}
          </button>

          <div 
            className={`overflow-hidden transition-all duration-300 ease-out ${
              gerencialExpanded && !collapsed ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="bg-linear-to-r from-gray-800/50 to-transparent border-l-2 border-blue-400/30 ml-6 mt-1">
              <button
                onClick={() => router.push('/usuarios')}
                className={`w-full px-4 py-2 pl-6 text-left text-sm transition-all duration-150 hover:pl-8 ${
                  isActive('/usuarios') 
                    ? 'bg-blue-600/20 text-white border-r-2 border-blue-400' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                Usuários
              </button>

              <button
                onClick={() => router.push('/topicos')}
                className={`w-full px-4 py-2 pl-6 text-left text-sm transition-all duration-150 hover:pl-8 ${
                  isActive('/topicos') 
                    ? 'bg-blue-600/20 text-white border-r-2 border-blue-400' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                Tópicos de Ajuda
              </button>

              <button
                onClick={() => router.push('/departamentos')}
                className={`w-full px-4 py-2 pl-6 text-left text-sm transition-all duration-150 hover:pl-8 ${
                  isActive('/departamentos') 
                    ? 'bg-blue-600/20 text-white border-r-2 border-blue-400' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                Departamentos
              </button>

              <button
                onClick={() => router.push('/prioridades')}
                className={`w-full px-4 py-2 pl-6 text-left text-sm transition-all duration-150 hover:pl-8 ${
                  isActive('/prioridades') 
                    ? 'bg-blue-600/20 text-white border-r-2 border-blue-400' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                Tipos de Prioridade
              </button>

              <button
                onClick={() => router.push('/parametros')}
                className={`w-full px-4 py-2 pl-6 text-left text-sm transition-all duration-150 hover:pl-8 ${
                  isActive('/parametros') 
                    ? 'bg-blue-600/20 text-white border-r-2 border-blue-400' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                Parâmetros
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push('/preferencias')}
          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-150 group/item relative ${
            isActive('/preferencias') 
              ? 'bg-linear-to-r from-blue-600/30 to-blue-700/20 text-white border-r-2 border-blue-400' 
              : 'text-gray-300 hover:bg-white/5 hover:text-white'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <img 
            src="/icons/preferences.svg" 
            alt="Preferências" 
            className="w-5 h-5 shrink-0 group-hover/item:scale-110 transition-transform duration-150" 
          />
          {!collapsed && (
            <span className="font-medium transition-all duration-200">
              Preferências
            </span>
          )}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
              Preferências
            </div>
          )}
        </button>
      </nav>
    </aside>
  );
}
