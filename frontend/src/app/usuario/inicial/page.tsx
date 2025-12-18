'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function PainelInicialUsuario() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'novo' | 'acompanhar'>('home');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!isLoading && user && user.roleId === 1) {
      // Se for admin, redireciona para painel admin
      router.push('/admin/painel');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.roleId !== 2) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Container principal */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Central de chamados</h1>
            <div className="text-gray-700">
              Usuário: <span className="font-medium">{user.name}</span>
            </div>
          </div>

          {/* Tabs de Navegação */}
          <div className="bg-gray-300 px-8">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-6 py-3 text-sm font-medium transition rounded-t-lg flex items-center gap-2 ${
                  activeTab === 'home'
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-400 text-gray-700 hover:bg-gray-350'
                }`}
              >
                <span>🏠</span> Pagina Inicial
              </button>
              <button
                onClick={() => setActiveTab('novo')}
                className={`px-6 py-3 text-sm font-medium transition rounded-t-lg flex items-center gap-2 ${
                  activeTab === 'novo'
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-400 text-gray-700 hover:bg-gray-350'
                }`}
              >
                <span>🆕</span> Abrir novo Chamado
              </button>
              <button
                onClick={() => setActiveTab('acompanhar')}
                className={`px-6 py-3 text-sm font-medium transition rounded-t-lg flex items-center gap-2 ${
                  activeTab === 'acompanhar'
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-400 text-gray-700 hover:bg-gray-350'
                }`}
              >
                <span>📋</span> Acompanhar Chamado
              </button>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1 px-8 py-12 flex flex-col">
            {activeTab === 'home' && (
              <div className="flex flex-col h-full">
                <div className="mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Bem vindo!</h2>
                  <p className="text-xl text-gray-700">Escolha uma opção</p>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center gap-6 max-w-md mx-auto w-full">
                  <button
                    onClick={() => setActiveTab('novo')}
                    className="w-full px-8 py-6 bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-md transition flex items-center justify-center gap-3"
                  >
                    <span className="text-2xl">+</span>
                    <span>Abrir novo chamado</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('acompanhar')}
                    className="w-full px-8 py-6 bg-green-800 hover:bg-green-900 text-white text-lg font-semibold rounded-lg shadow-md transition"
                  >
                    <div>Verificar andamento</div>
                    <div>do chamado</div>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'novo' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Abrir Novo Chamado</h2>
                <p className="text-gray-600">Formulário para abrir novo chamado será implementado aqui.</p>
              </div>
            )}

            {activeTab === 'acompanhar' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Acompanhar Chamados</h2>
                <p className="text-gray-600">Lista de chamados será implementada aqui.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé fixo */}
      <div className="bg-gray-100 py-4 text-center">
        <button
          onClick={logout}
          className="text-red-600 hover:text-red-700 font-medium text-sm"
        >
          Sair | Deslogar
        </button>
      </div>
    </div>
  );
}
