'use client';

import { useState } from 'react';

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
  const [incluirConversa, setIncluirConversa] = useState(false);
  const [incluirHistorico, setIncluirHistorico] = useState(false);

  const handleConfirmar = () => {
    onConfirm(incluirConversa, incluirHistorico);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
      onClick={onClose}
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.2s ease-out', willChange: 'transform, opacity' }}
      >
        {/* Header do Modal */}
        <div className="relative bg-gradient-to-r from-[#001933] to-[#1a3c7a] px-6 py-5 rounded-t-2xl">
          <h3 className="text-xl font-bold text-white">
            Preferências de impressão
          </h3>
      
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body do Modal */}
        <div className="p-6 space-y-3">
            <h1 className="text-sm font-medium text-gray-900">
                Selecione:
            </h1>
          {/* Opção: Incluir conversa do chamado */}
          <div
            onClick={() => setIncluirConversa(!incluirConversa)}
            className={`
              relative flex items-center p-4 rounded-xl border-2 cursor-pointer
              transition-all duration-200
              ${incluirConversa
                ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                : 'border-gray-300 bg-white text-gray-900 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
              }
            `}
          >
            <span className="text-lg font-medium">
              Incluir na impressão a conversa do chamado
            </span>
          </div>

          {/* Opção: Imprimir histórico do chamado */}
          <div
            onClick={() => setIncluirHistorico(!incluirHistorico)}
            className={`
              relative flex items-center p-4 rounded-xl border-2 cursor-pointer
              transition-all duration-200
              ${incluirHistorico
                ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                : 'border-gray-300 bg-white text-gray-900 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
              }
            `}
          >
            <span className="text-lg font-medium">
              Imprimir histórico do chamado
            </span>
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3 justify-end border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            className="px-6 py-2.5 bg-[#001933] text-white rounded-lg hover:bg-[#062975] transition-all font-medium shadow-lg shadow-blue-500/30 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
