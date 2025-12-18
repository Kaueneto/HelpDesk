'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function PainelAdmin() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!isLoading && user && user.roleId !== 1) {
      // Se não for admin, redireciona para painel de usuário
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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
              <p className="text-gray-600 mt-2">Bem-vindo, {user.name}</p>
            </div>
            <button
              onClick={logout}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Sair
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-6 text-center border-2 border-blue-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">0</div>
              <div className="text-sm font-medium text-gray-700">Chamados Abertos</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-6 text-center border-2 border-yellow-200">
              <div className="text-4xl font-bold text-yellow-600 mb-2">0</div>
              <div className="text-sm font-medium text-gray-700">Em Atendimento</div>
            </div>
            <div className="bg-green-50 rounded-lg p-6 text-center border-2 border-green-200">
              <div className="text-4xl font-bold text-green-600 mb-2">0</div>
              <div className="text-sm font-medium text-gray-700">Encerrados</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Gerenciar Usuários</h3>
              <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                Ver Usuários
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Todos os Chamados</h3>
              <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                Ver Chamados
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
