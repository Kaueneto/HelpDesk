'use client';

import { useRouter, usePathname } from 'next/navigation';

interface UsuarioSidebarProps {
  collapsed: boolean;
}

export default function UsuarioSidebar({ collapsed }: UsuarioSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <aside
      className={`transition-all duration-300 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{ backgroundColor: '#3F3F3F' }}
    >
      <div className="p-4 border-b border-gray-600">
        <h1 className={`text-white font-bold transition-all ${collapsed ? 'text-xs text-center' : 'text-xl'}`}>
          {collapsed ? 'CC' : 'Central de chamados'}
        </h1>
      </div>

      <nav className="flex-1 py-4">
        <button
          onClick={() => router.push('/inicial')}
          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition ${
            isActive('/inicial') ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          <img src="/icons/iconhome.svg" alt="Inicio" className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Inicio</span>}
        </button>

        <button
          onClick={() => router.push('/inicial')}
          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition text-gray-300 hover:bg-gray-700`}
        >
          <img src="/icons/iconabrirnovochamado.svg" alt="Novo Chamado" className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Novo Chamado</span>}
        </button>

        <button
          onClick={() => router.push('/inicial')}
          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition text-gray-300 hover:bg-gray-700`}
        >
          <img src="/icons/iconacompanhar.svg" alt="Acompanhar" className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Acompanhar</span>}
        </button>
      </nav>
    </aside>
  );
}
