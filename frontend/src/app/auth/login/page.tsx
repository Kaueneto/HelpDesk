'use client';

import { useState } from 'react';
import Login from '../Login';
import Cadastrarse from '../Cadastrarse';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'entrar' | 'cadastrar'>('entrar');

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mt-24 w-full max-w-md px-4">
        {/* Título */}
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Sistema de Chamados
        </h1>
          <h3 className="text-xl font-bold text-center text-gray-900 mb-3">
          HelpDesk
        </h3>
        {/* Container Tabs */}
        <div className="w-full">
          {/* Barra de Tabs */}
          <div className="h-10 items-center justify-center rounded-md bg-gray-200/70 p-1 text-gray-500 grid w-full grid-cols-2" role="tablist">
            <button
              type="button"
              role="tab"
              onClick={() => setActiveTab('entrar')}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                activeTab === 'entrar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Fazer Login
            </button>
            <button
              type="button"
              role="tab"
              onClick={() => setActiveTab('cadastrar')}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                activeTab === 'cadastrar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cadastre-se
            </button>
          </div>

          {/* Conteúdo das Tabs */}
          <div className="mt-2 rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow">
            {activeTab === 'entrar' && (
              <Login onCadastrarClick={() => setActiveTab('cadastrar')} />
            )}

            {activeTab === 'cadastrar' && (
              <Cadastrarse 
                onLoginClick={() => setActiveTab('entrar')} 
                onSuccess={() => setActiveTab('entrar')} 
              />
            )}
          </div>
     
        </div>
      </div>
    </div>
  );
}
