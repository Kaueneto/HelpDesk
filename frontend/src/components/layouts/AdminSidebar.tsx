'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FiEdit3, FiChevronRight, FiShield   } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [gerencialExpanded, setGerencialExpanded] = useState(false);
  const [gerencialPopupOpen, setGerencialPopupOpen] = useState(false);
  const [comprasExpanded, setComprasExpanded] = useState(false);
  const [comprasPopupOpen, setComprasPopupOpen] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const gerencialButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const comprasButtonRef = useRef<HTMLButtonElement>(null);
  const comprasPopupRef = useRef<HTMLDivElement>(null);

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

  const comprasItems = [
    { label: 'Solicitações', path: '/compras/solicitacoes' },
    { label: 'Cotações', path: '/compras/cotacoes' },
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

  const handleComprasClick = () => {
    if (collapsed) {
      setComprasPopupOpen((prev) => !prev);
    } else {
      setComprasExpanded((prev) => !prev);
    }
  };

  const handleComprasNavigate = (path: string) => {
    router.push(path);
    setComprasPopupOpen(false);
  };

  // Fecha o popup de compras ao clicar fora
  useEffect(() => {
    if (!comprasPopupOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        comprasPopupRef.current &&
        !comprasPopupRef.current.contains(e.target as Node) &&
        comprasButtonRef.current &&
        !comprasButtonRef.current.contains(e.target as Node)
      ) {
        setComprasPopupOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [comprasPopupOpen]);

  return (
    <aside
      className={`transition-all duration-100 ease-out flex flex-col relative group ${
        collapsed ? 'w-16' : 'w-57'
      } shadow-2xl border-r border-gray-800/50`}
      style={{
        backgroundColor: '#001933',
        background: '#001933',
      }}
    >
      {/* header com logo e botao de toggle ajustado*/}
      <div className="p-4">
        <div className={`flex items-center ${collapsed ? 'flex-col gap-3' : 'justify-between'}`}>
          {/* Logo */}
          <button
            onClick={() => router.push('/painel')}
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
            className="shrink-0 transition-transform duration-200 "
            title="Ir para o painel"
          >
            <img
              src={logoHovered ? '/logo2.png' : '/logo1.png'}
              className={`${!collapsed ? 'ml-2' : ''} transition-all duration-200 ${collapsed ? 'w-6 h-6' : 'w-10 h-10'}`}
            />
          </button>

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
        {/* Inicio — oculto para perfil Compras */}
        {user?.roleId !== 4 && (
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
        )}

        {/* Chamados — oculto para perfil Compras */}
        {user?.roleId !== 4 && (
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
        )}

        {/* Gerencial — só admin (roleId=1) */}
        {user?.roleId === 1 && (
        <div className="relative">
          <button
            ref={gerencialButtonRef}
            onClick={handleGerencialClick}
            className={`w-full px-4 py-3 text-left flex items-center justify-between transition-all duration-150 group/item relative text-gray-300 hover:bg-white/5 hover:text-white ${
              collapsed ? 'justify-center' : ''
            } ${gerencialPopupOpen && collapsed ? 'bg-white/10 text-white' : ''}`}
          >
            <div className="flex items-center gap-3">
            <FiShield 
                className="w-5 h-5 shrink-0 group-hover/item:scale-110 transition-transform duration-150"
              />
              {!collapsed && (
                <span className=" transition-all duration-200">Gerencial</span>
              )}
            </div>
            {!collapsed && (
              <FiChevronRight
                className={`w-5 h-5 transition-transform duration-100 ${
                  gerencialExpanded ? "rotate-90" : ""
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
        )}

        {/* Preferências — oculto para perfil Compras */}
        {user?.roleId !== 4 && (
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
        )}

        {/* Sugestões — oculto para perfil Compras */}
        {user?.roleId !== 4 && (
        <button
          onClick={() => router.push('/sugestoes')}
          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-150 group/item relative ${
            isActive('/sugestoes')
              ? 'bg-linear-to-r from-blue-600/30 to-blue-700/20 text-white border-r-2 border-blue-400'
              : 'text-gray-300 hover:bg-white/5 hover:text-white'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <FiEdit3
            className="w-5 h-5 shrink-0 group-hover/item:scale-110 transition-transform duration-150"
          />
          {!collapsed && (
            <span className="font-medium transition-all duration-200">Sugestões</span>
          )}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
              Sugestões
            </div>
          )}
        </button>
        )}


        
        {/* comprasS */}
        <div className="relative">
          <button
            ref={comprasButtonRef}
            onClick={handleComprasClick}
            className={`w-full px-4 py-3 text-left flex items-center justify-between transition-all duration-150 group/item relative ${
              pathname.startsWith('/compras')
                ? 'bg-linear-to-r from-blue-600/30 to-blue-700/10 text-white border-r-2 border-blue-400'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            } ${collapsed ? 'justify-center' : ''} ${comprasPopupOpen && collapsed ? 'bg-white/10 text-white' : ''}`}
          >
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 shrink-0 group-hover/item:scale-110 transition-transform duration-150"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {!collapsed && (
                <span className="font-medium transition-all duration-200">Compras</span>
              )}
            </div>
          {!collapsed && (
              <FiChevronRight
                className={`w-4 h-4 transition-transform duration-200 ${
                  comprasExpanded ? "rotate-90" : ""
                }`}
              />
            )}

            {collapsed && !comprasPopupOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
                Compras
              </div>
            )}
          </button>
          {collapsed && comprasPopupOpen && (
            <div
              ref={comprasPopupRef}
              className="absolute left-full top-0 ml-2 z-50 min-w-48 rounded-lg overflow-hidden shadow-2xl border border-gray-700/60"
              style={{ backgroundColor: '#002244' }}
            >
              <div className="py-1">
                {comprasItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleComprasNavigate(item.path)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-all duration-150 flex items-center gap-2 ${
                      isActive(item.path)
                        ? 'bg-blue-600/30 text-white border-r-2 border-blue-400'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isActive(item.path) && (
                      <span className="rounded-full bg-blue-400 shrink-0" />
                    )}
                    {!isActive(item.path) && (
                      <span className="rounded-full bg-gray-600 shrink-0" />
                    )}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}


          {!collapsed && (
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                comprasExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="bg-linear-to-r from-gray-800/50 to-transparent border-l-2 border-blue-400/30 ml-6 mt-1">
                {comprasItems.map((item) => (
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
      </nav>
    </aside>
  );
}