'use client';

import { useState } from 'react';

interface ModalConfirmarReaberturaProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ModalConfirmarReabertura({ 
  isOpen, 
  onConfirm, 
  onClose 
}: ModalConfirmarReaberturaProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-start mb-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg 
              className="w-6 h-6 text-yellow-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <div className=" ml-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Atenção
            </h3>
            <p className=" text-base text-gray-900">
              Ao enviar esta mensagem, o chamado será <strong className="text-lg">reaberto</strong> automaticamente pois ele ja foi <strong className="text-lg" style={{color: '#00A123'}}>concluído</strong>.
            </p>
            <p className="text-sm text-gray-600 mt-3">
              Deseja continuar?
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-800 transition"
          >
            Sim, continuar
          </button>
        </div>
      </div>
    </div>
  );
}
