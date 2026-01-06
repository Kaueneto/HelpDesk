'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AbrirChamado from './AbrirChamado';
import AcompanharChamado from './AcompanharChamado';
import DetalhesChamados from './DetalhesChamados';
import Configuracoes from './Configuracoes';

export default function PainelUsuario() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'novo' | 'acompanhar'>('home');
  const [chamadoSelecionado, setChamadoSelecionado] = useState<any>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showConfiguracoes, setShowConfiguracoes] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleChamadoClick = async (chamado: any) => {
    setChamadoSelecionado(chamado);
  };

  const handleVoltarLista = () => {
    setChamadoSelecionado(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Se está mostrando configurações
  if (showConfiguracoes) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="h-screen flex flex-col">
          <Configuracoes 
            user={user} 
            onClose={() => setShowConfiguracoes(false)} 
          />
        </div>
      </div>
    );
  }

  // Tela de usuário comum
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Container principal */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Central de chamados</h1>
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-700 font-medium">{user.name}</span>
                <svg 
                  className={`w-4 h-4 text-gray-500 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      setShowConfiguracoes(true);
                      setUserDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configurações
                  </button>
                  <hr className="my-2 border-gray-200" />
                  <button
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs de Navegação */}
          <div className="px-8 py-4">
            <div className="h-10 items-center justify-center rounded-md bg-gray-200/70 p-1 text-gray-500 grid w-full grid-cols-3" role="tablist">
              <button
                type="button"
                role="tab"
                onClick={() => setActiveTab('home')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-base font-medium transition-all duration-200 ${
                  activeTab === 'home'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <img src="/icons/iconhome.svg" alt="Home" className="w-4 h-4 mr-2" />
                Pagina Inicial
              </button>
              <button
                type="button"
                role="tab"
                onClick={() => setActiveTab('novo')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-base font-medium transition-all duration-200 ${
                  activeTab === 'novo'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <img src="/icons/iconabrirnovochamado.svg" alt="Abrir Chamado" className="w-4 h-4 mr-2" />
                Abrir novo Chamado
              </button>
              <button
                type="button"
                role="tab"
                onClick={() => setActiveTab('acompanhar')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-base font-medium transition-all duration-200 ${
                  activeTab === 'acompanhar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <img src="/icons/iconacompanhar.svg" alt="Acompanhar" className="w-4 h-4 mr-2" />
                Acompanhar Chamado
              </button>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1 px-8 py-6 flex-col overflow-y-auto">
            {activeTab === 'home' && (
              <div className="flex flex-col h-full">
                <div className="mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Bem vindo!</h2>
                  <p className="text-xl text-gray-700">Escolha uma opção</p>
                </div>

                <div className="flex-1 flex flex-col items-end gap-7 max-w-md ml-auto w-full pr-12">
                  <button
                    onClick={() => setActiveTab('novo')}
                    className="w-full px-12 py-7 bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-md transition flex items-center justify-center gap-3"
                  >
                    <span className="text-2xl">+</span>
                    <span>Abrir novo chamado</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('acompanhar')}
                    className="w-full px-12 py-7 bg-green-800 hover:bg-green-900 text-white text-lg font-semibold rounded-lg shadow-md transition"
                  >
                    <div>Verificar andamento</div>
                    <div>do chamado</div>
                  </button>
                </div>
              </div>
            )}

            
            {activeTab === 'novo' && (
              <AbrirChamado
                userEmail={user.email}
                onSuccess={() => setActiveTab('home')}
                onCancel={() => setActiveTab('home')}
              />
            )}

            {activeTab === 'acompanhar' && (
              <div>
                {!chamadoSelecionado ? (
                  <AcompanharChamado onChamadoClick={handleChamadoClick} />
                ) : (
                  <DetalhesChamados
                    chamado={chamadoSelecionado}
                    onVoltar={handleVoltarLista}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
