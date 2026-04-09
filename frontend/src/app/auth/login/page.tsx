'use client';

import { useState, useEffect } from 'react';
import Login from '../Login';
import Cadastrarse from '../Cadastrarse';
import EsqueceuSenha from '../EsqueceuSenha';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoginPage() {
  const { theme, mode } = useTheme();
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
    <div className="min-h-screen flex items-start justify-center transition-colors duration-300"
      style={{
        background: mode === 'dark' ? theme.background.pagina : 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)'
      }}
    > 
      <div className="mt-24 w-full max-w-md px-4">
        {/* Título */}
         <h1 className="text-2xl font-bold text-center mb-6 font-sans transition-colors duration-300"
             style={{ color: theme.text.primary }}
         >
            HelpDesk
          </h1>
          
        {/* Logo da empresa */}
        <div className="flex justify-center items-center mb-10">
          <img 
            src={mode === 'dark' ? "/logo.png" : "/logo.png"} 
            className={`h-10 w-auto max-w-xs object-contain transition-all duration-300 ${mode === 'dark' ? 'brightness-0 invert opacity-90' : ''}`}
          />
        </div>
        {/* Container Tabs */}
        <div className="w-full">
          {/* Barra de Tabs - ocultar quando estiver em "esqueceu senha" */}
          <div className="h-10 mb-2">
            <div 
              className={`h-10 items-center justify-center rounded-md p-1 grid w-full grid-cols-2 transition-all duration-300 ${
                activeTab === 'esqueceusenha' 
                  ? 'opacity-0 pointer-events-none' 
                  : 'opacity-100'
              }`}
              style={{
                backgroundColor: mode === 'dark' ? theme.background.card : 'rgba(229, 231, 235, 0.7)',
              }}
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                onClick={() => handleTabChange('entrar')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 shadow-sm ${
                  activeTab === 'entrar'
                    ? ''
                    : 'opacity-70 hover:opacity-100 shadow-none'
                }`}
                style={{
                  backgroundColor: activeTab === 'entrar' ? theme.background.surface : 'transparent',
                  color: theme.text.primary
                }}
              >
                Entrar
              </button>
              <button
                type="button"
                role="tab"
                onClick={() => handleTabChange('cadastrar')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 shadow-sm ${
                  activeTab === 'cadastrar'
                    ? ''
                    : 'opacity-70 hover:opacity-100 shadow-none'
                }`}
                style={{
                  backgroundColor: activeTab === 'cadastrar' ? theme.background.surface : 'transparent',
                  color: theme.text.primary
                }}
              >
                Cadastrar
              </button>
            </div>
          </div>

          {/* Conteúdo das Tabs com animação carrossel */}
          <div className="rounded-lg border shadow-sm overflow-hidden transition-colors duration-300"
            style={{
              backgroundColor: theme.background.surface,
              borderColor: theme.border.secondary
            }}
          >
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
          animation: slideLeft 0.2s ease-out;
        }

        .animate-slideRight {
          animation: slideRight 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

