'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AdminSidebarProps {
  collapsed: boolean;
}

export default function AdminSidebar({ collapsed }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [gerencialExpanded, setGerencialExpanded] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <aside
      className={`transition-all duration-300 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{ backgroundColor: '#001933' }}
    >
      <div className="p-4 border-b border-gray-600">
        <h1 className={`text-white font-bold transition-all ${collapsed ? 'text-xs text-center' : 'text-xl'}`}>
          {collapsed ? 'CC' : 'Central de chamados'}
        </h1>
      </div>

      <nav className="flex-1 py-4">
        <button
          onClick={() => router.push('/painel')}
          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition ${
            isActive('/painel') ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          <img src="/icons/iconHomeAdmin.svg" alt="Inicio" className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Inicio</span>}
        </button>

        <button
          onClick={() => router.push('/chamados')}
          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition ${
            isActive('/chamados') || pathname.startsWith('/chamado/') ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          <img src="/icons/iconchamados.svg" alt="Chamados" className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Chamados</span>}
        </button>

        <div>
          <button
            onClick={() => setGerencialExpanded(!gerencialExpanded)}
            className={`w-full px-4 py-3 text-left flex items-center justify-between transition text-gray-300 hover:bg-gray-700`}
          >
            <div className="flex items-center gap-3">
              <img src="/icons/iconadministrator.svg" alt="Gerencial" className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>Gerencial</span>}
            </div>
            {!collapsed && (
              <img 
                src="/icons/arrowpointGerencial.svg" 
                alt="Expandir" 
                className={`w-4 h-4 transform transition-transform ${gerencialExpanded ? 'rotate-90' : ''}`}
              />
            )}
          </button>

          {gerencialExpanded && !collapsed && (
            <div className="bg-gray-800">
              <button
                onClick={() => router.push('/usuarios')}
                className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                  isActive('/usuarios') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Usuários
              </button>

              <button
                onClick={() => router.push('/topicos')}
                className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                  isActive('/topicos') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Tópicos de Ajuda
              </button>

              <button
                onClick={() => router.push('/departamentos')}
                className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                  isActive('/departamentos') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Departamentos
              </button>

              <button
                onClick={() => router.push('/prioridades')}
                className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                  isActive('/prioridades') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Tipos de Prioridade
              </button>

              <button
                onClick={() => router.push('/parametros')}
                className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                  isActive('/parametros') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Parâmetros
              </button>
            </div>
          )}
        </div>
         <button
          onClick={() => router.push('/preferencias')}
          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition ${
            isActive('/preferencias') ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          <img src="/icons/preferences.svg" alt="Preferências" className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Preferências</span>}
        </button>
      </nav>
    </aside>
  );
}
