'use client';

import { useState } from 'react';
import { LuCheck, LuMessageSquare, LuHistory, LuX, LuPrinter } from 'react-icons/lu';
import { useTheme } from '@/contexts/ThemeContext';

interface ModalImprimirChamadoProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (incluirConversa: boolean, incluirHistorico: boolean) => void;
}

export default function ModalImprimirChamado({
  isOpen,
  onClose,
  onConfirm,
}: ModalImprimirChamadoProps) {
  const { theme } = useTheme();
  const [incluirConversa, setIncluirConversa] = useState(false);
  const [incluirHistorico, setIncluirHistorico] = useState(false);

  const handleConfirmar = () => {
    onConfirm(incluirConversa, incluirHistorico);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          backgroundColor: theme.modalEnviarEmail.background,
          animation: 'modalAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header do Modal */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-start border-b" style={{ borderColor: theme.modalEnviarEmail.border }}>
          <div>
            <h3 className="text-2xl font-bold tracking-tight" style={{ color: theme.modalEnviarEmail.textPrimary }}>
              Opções de Impressão
            </h3>
            <p className="text-sm mt-1" style={{ color: theme.modalEnviarEmail.textSecondary }}>
              Selecione o que deseja incluir na impressão.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors"
            style={{ 
              color: theme.modalEnviarEmail.textSecondary,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.modalEnviarEmail.border}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LuX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-4">
          
        {/* Opção: Incluir conversa do chamado */}
          <button
            onClick={() => setIncluirConversa(!incluirConversa)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 group"
            style={{
              borderColor: incluirConversa ? theme.brand.primary : theme.modalEnviarEmail.border,
              backgroundColor: incluirConversa ? `${theme.brand.primary}20` : theme.modalEnviarEmail.input.bg,
            }}
          >
            <div 
              className="p-3 rounded-xl transition-colors"
              style={{
                backgroundColor: incluirConversa ? theme.brand.primary : theme.modalEnviarEmail.input.bg,
                color: incluirConversa ? '#FFFFFF' : theme.modalEnviarEmail.textSecondary,
              }}
            >
              <LuMessageSquare size={22} />
            </div>
            
            <div className="flex-1 text-left">
              <span 
                className="block font-semibold transition-colors"
                style={{ color: incluirConversa ? theme.brand.primary : theme.modalEnviarEmail.textPrimary }}
              >
                Conversa do chamado
              </span>
              <span className="text-xs" style={{ color: theme.modalEnviarEmail.textSecondary }}>
                Incluir mensagens/atualizações
              </span>
            </div>

            <div 
              className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
              style={{
                backgroundColor: incluirConversa ? theme.brand.primary : theme.modalEnviarEmail.background,
                borderColor: incluirConversa ? theme.brand.primary : theme.modalEnviarEmail.border,
              }}
            >
              {incluirConversa && <LuCheck size={14} className="text-white stroke-[3px]" />}
            </div>
          </button>

        {/* Opção: Imprimir histórico do chamado */}
          <button
            onClick={() => setIncluirHistorico(!incluirHistorico)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 group"
            style={{
              borderColor: incluirHistorico ? theme.brand.primary : theme.modalEnviarEmail.border,
              backgroundColor: incluirHistorico ? `${theme.brand.primary}20` : theme.modalEnviarEmail.input.bg,
            }}
          >
            <div 
              className="p-3 rounded-xl transition-colors"
              style={{
                backgroundColor: incluirHistorico ? theme.brand.primary : theme.modalEnviarEmail.input.bg,
                color: incluirHistorico ? '#FFFFFF' : theme.modalEnviarEmail.textSecondary,
              }}
            >
              <LuHistory size={22} />
            </div>
            
            <div className="flex-1 text-left">
              <span 
                className="block font-semibold transition-colors"
                style={{ color: incluirHistorico ? theme.brand.primary : theme.modalEnviarEmail.textPrimary }}
              >
                Histórico completo
              </span>
              <span className="text-xs" style={{ color: theme.modalEnviarEmail.textSecondary }}>
                Logs de eventos e mudanças
              </span>
            </div>

            <div 
              className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
              style={{
                backgroundColor: incluirHistorico ? theme.brand.primary : theme.modalEnviarEmail.background,
                borderColor: incluirHistorico ? theme.brand.primary : theme.modalEnviarEmail.border,
              }}
            >
              {incluirHistorico && <LuCheck size={14} className="text-white stroke-[3px]" />}
            </div>
          </button>
        </div>

        {/* Footer */}
        <div 
          className="px-8 py-6 border-t flex gap-3"
          style={{ 
            backgroundColor: theme.modalEnviarEmail.input.bg,
            borderColor: theme.modalEnviarEmail.border 
          }}
        >
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl transition-all font-medium"
            style={{
              color: theme.modalEnviarEmail.button.secondary.text,
              borderColor: theme.modalEnviarEmail.button.secondary.border,
              backgroundColor: theme.modalEnviarEmail.button.secondary.bg,
              border: `1px solid ${theme.modalEnviarEmail.button.secondary.border}`
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.modalEnviarEmail.button.secondary.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.modalEnviarEmail.button.secondary.bg}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            className="flex-2 px-4 py-3 text-white rounded-xl transition-all font-bold shadow-lg flex items-center justify-center gap-2 group"
            style={{
              backgroundColor: theme.modalEnviarEmail.button.primary.bg,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.modalEnviarEmail.button.primary.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.modalEnviarEmail.button.primary.bg}
          >
            <LuPrinter size={18} className="group-hover:scale-110 transition-transform" />
            Confirmar Impressão
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalAppear {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}