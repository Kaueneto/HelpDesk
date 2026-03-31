'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [gerencialExpanded, setGerencialExpanded] = useState(false);
  const [gerencialPopupOpen, setGerencialPopupOpen] = useState(false);
  const gerencialButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;

  // Fecha o popup ao clicar fora
  useEffect(() => {
    if (!gerencialPopupOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        gerencialButtonRef.current &&
        !gerencialButtonRef.current.contains(e.target as Node)
      ) {
        setGerencialPopupOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [gerencialPopupOpen]);

  const gerencialItems = [
    { label: 'Usuários', path: '/usuarios' },
    { label: 'Tópicos de Ajuda', path: '/topicos' },
    { label: 'Departamentos', path: '/departamentos' },
    { label: 'Tipos de Prioridade', path: '/prioridades' },
    { label: 'Parâmetros', path: '/parametros' },
  ];

  const handleGerencialClick = () => {
    if (collapsed) {
      setGerencialPopupOpen((prev) => !prev);
    } else {
      setGerencialExpanded((prev) => !prev);
    }
  };

  const handleGerencialNavigate = (path: string) => {
    router.push(path);
    setGerencialPopupOpen(false);
  };

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
            <h1 className="text-white font-bold text-xl transition-all duration-100 ease-out">
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
              ? 'bg-linear-to-r from-blue-600/30 to-blue-700/10 text-white border-r-2 border-blue-400'
              : 'text-gray-300 hover:bg-white/5 hover:text-white'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <img
            src="/icons/iconHomeAdmin.svg"
            alt="Inicio"
            className="w-5 h-5 shrink-0 group-hover/item:scale-110 transition-transform duration-150"
          />
          {!collapsed && (
            <span className="font-medium transition-all duration-200">Inicio</span>
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
            <span className="font-medium transition-all duration-200">Chamados</span>
          )}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
              Chamados
            </div>
          )}
        </button>

        {/* Gerencial */}
        <div className="relative">
          <button
            ref={gerencialButtonRef}
            onClick={handleGerencialClick}
            className={`w-full px-4 py-3 text-left flex items-center justify-between transition-all duration-150 group/item relative text-gray-300 hover:bg-white/5 hover:text-white ${
              collapsed ? 'justify-center' : ''
            } ${gerencialPopupOpen && collapsed ? 'bg-white/10 text-white' : ''}`}
          >
            <div className="flex items-center gap-3">
              <img
                src="/icons/iconadministrator.svg"
                alt="Gerencial"
                className="w-5 h-5 shrink-0 group-hover/item:scale-110 transition-transform duration-150"
              />
              {!collapsed && (
                <span className=" transition-all duration-200">Gerencial</span>
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
            {/* Tooltip padrão quando colapsado e popup fechado */}
            {collapsed && !gerencialPopupOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
                Gerencial
              </div>
            )}
          </button>

          {/* Popup flutuante — só aparece quando colapsado */}
          {collapsed && gerencialPopupOpen && (
            <div
              ref={popupRef}
              className="absolute left-full top-0 ml-2 z-50 min-w-48 rounded-lg overflow-hidden shadow-2xl border border-gray-700/60"
              style={{ backgroundColor: '#002244' }}
            >
                 {/* Itens do menu */}
              <div className="py-1">
                {gerencialItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleGerencialNavigate(item.path)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-all duration-150 flex items-center gap-2 ${
                      isActive(item.path)
                        ? 'bg-blue-600/30 text-white border-r-2 border-blue-400'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isActive(item.path) && (
                      <span className=" rounded-full bg-blue-400 shrink-0" />
                    )}
                    {!isActive(item.path) && (
                      <span className=" rounded-full bg-gray-600 shrink-0" />
                    )}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submenu expandível — só aparece quando NÃO colapsado */}
          {!collapsed && (
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                gerencialExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="bg-linear-to-r from-gray-800/50 to-transparent border-l-2 border-blue-400/30 ml-6 mt-1">
                {gerencialItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`w-full px-4 py-2 pl-6 text-left text-sm transition-all duration-150 hover:pl-8 ${
                      isActive(item.path)
                        ? 'bg-blue-600/20 text-white border-r-2 border-blue-400'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            <span className="font-medium transition-all duration-200">Preferências</span>
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