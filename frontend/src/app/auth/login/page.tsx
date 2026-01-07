'use client';

import { useState, useEffect } from 'react';
import Login from '../Login';
import Cadastrarse from '../Cadastrarse';
import EsqueceuSenha from '../EsqueceuSenha';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'entrar' | 'cadastrar' | 'esqueceusenha'>('entrar');
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);

  const handleTabChange = (newTab: 'entrar' | 'cadastrar' | 'esqueceusenha') => {
    if (newTab === activeTab) return;
    
    // Determinar direção
    if (activeTab === 'entrar' && (newTab === 'cadastrar' || newTab === 'esqueceusenha')) {
      setDirection('left');
    } else {
      setDirection('right');
    }
    
    setActiveTab(newTab);
  };

  useEffect(() => {
    if (direction) {
      const timer = setTimeout(() => setDirection(null), 400);
      return () => clearTimeout(timer);
    }
  }, [direction]);

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
          {/* Barra de Tabs - ocultar quando estiver em "esqueceu senha" */}
          <div className="h-10 mb-2">
            <div 
              className={`h-10 items-center justify-center rounded-md bg-gray-200/70 p-1 text-gray-500 grid w-full grid-cols-2 transition-opacity duration-300 ${
                activeTab === 'esqueceusenha' 
                  ? 'opacity-0 pointer-events-none' 
                  : 'opacity-100'
              }`}
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                onClick={() => handleTabChange('entrar')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'entrar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                role="tab"
                onClick={() => handleTabChange('cadastrar')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'cadastrar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Cadastrar
              </button>
            </div>
          </div>

          {/* Conteúdo das Tabs com animação carrossel */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div 
              className={`transition-transform duration-400 ease-out ${
                direction === 'left' ? 'animate-slideLeft' :
                direction === 'right' ? 'animate-slideRight' : ''
              }`}
            >
              {activeTab === 'entrar' && (
                <Login 
                  onCadastrarClick={() => handleTabChange('cadastrar')} 
                  onEsqueceuSenhaClick={() => handleTabChange('esqueceusenha')}
                />
              )}

              {activeTab === 'cadastrar' && (
                <Cadastrarse 
                  onLoginClick={() => handleTabChange('entrar')} 
                  onSuccess={() => handleTabChange('entrar')} 
                />
              )}

              {activeTab === 'esqueceusenha' && (
                <EsqueceuSenha 
                  onVoltarClick={() => handleTabChange('entrar')} 
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideLeft {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideRight {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slideLeft {
          animation: slideLeft 0.4s ease-out;
        }

        .animate-slideRight {
          animation: slideRight 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

