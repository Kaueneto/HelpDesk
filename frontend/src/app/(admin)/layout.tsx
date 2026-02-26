'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminHeader from '@/components/layouts/AdminHeader';
import AdminSidebar from '@/components/layouts/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      <AdminSidebar collapsed={sidebarCollapsed} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
