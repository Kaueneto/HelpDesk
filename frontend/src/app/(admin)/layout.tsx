'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AdminHeader from '@/components/layouts/AdminHeader';
import AdminSidebar from '@/components/layouts/AdminSidebar';

const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { mode } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`${baseUrl}/auth/login`);
    } else if (!isLoading && user && (user.roleId !== 1 && user.roleId !== 3)) {
      router.push(`${baseUrl}/usuario/inicial`);
    } else if (!isLoading && user && user.roleId === 3) {
      const allowedAdminPaths = ['/painel', '/chamados', '/preferencias', '/sugestoes', '/perfil'];
      const isAllowedAdminPath = allowedAdminPaths.some(p => pathname.startsWith(p)) || pathname.startsWith('/chamado/');
      
      if (!isAllowedAdminPath && pathname !== '/') {
        router.push(`${baseUrl}/painel`);
      }
    }
  }, [isAuthenticated, isLoading, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user || (user.roleId !== 1 && user.roleId !== 3)) {
    return null;
  }

  const bgColor = mode === 'dark' ? '#0F172A' : '#EDEDED';

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: bgColor }}>
      <AdminSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
