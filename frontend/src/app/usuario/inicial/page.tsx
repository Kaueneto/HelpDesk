'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

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
          <div className="px-8 py-4">
            <div className="h-12 items-center justify-center rounded-lg bg-gray-200/60 p-1 grid grid-cols-3 gap-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 gap-2 ${
                  activeTab === 'home'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Image src="/icons/iconhome.svg" alt="" width={20} height={20} /> Pagina Inicial
              </button>
              <button
                onClick={() => setActiveTab('novo')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 gap-2 ${
                  activeTab === 'novo'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Image src="/icons/iconabrirnovochamado.svg" alt="" width={20} height={20} /> Abrir novo Chamado
              </button>
              <button
                onClick={() => setActiveTab('acompanhar')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 gap-2 ${
                  activeTab === 'acompanhar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Image src="/icons/iconacompanhar.svg" alt="" width={20} height={20} /> Acompanhar Chamado
              </button>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1 px-8 py-12 flex flex-col">
            {activeTab === 'home' && (
              <div className="flex items-center justify-between h-full gap-16">
                {/* Texto à esquerda */}
                <div className="flex-shrink-0">
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">Bem vindo!</h2>
                  <p className="text-2xl text-gray-900">Escolha uma opção</p>
                </div>

                {/* Botões à direita */}
                <div className="flex flex-col gap-8 max-w-sm w-full">
                  <button
                    onClick={() => setActiveTab('novo')}
                    className="w-full px-8 py-8 bg-cyan-400 hover:bg-cyan-500 text-white text-xl font-semibold rounded-lg shadow-md transition flex items-center justify-center gap-3"
                  >
                    <span className="text-2xl font-bold">+</span>
                    <span>Abrir novo chamado</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('acompanhar')}
                    className="w-full px-8 py-8 bg-green-800 hover:bg-green-900 text-white text-xl font-semibold rounded-lg shadow-md transition leading-tight"
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
      <div className="bg-gray-200 py-4 px-8 flex justify-end">
        <button
          onClick={logout}
          className="text-red-600 hover:text-red-700 font-semibold text-base"
        >
          Sair | Deslogar
        </button>
      </div>
    </div>
  );
}
