import React, { useState } from 'react';

interface ModalMarcarResolvidoProps {
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

const ModalMarcarResolvido: React.FC<ModalMarcarResolvidoProps> = ({ 
  isOpen, 
  onConfirm, 
  onClose, 
  isLoading = false 
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = isLoading || internalLoading;

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (loading) return;
    
    try {
      setInternalLoading(true);
      await onConfirm();
    } catch (error) {
      // erro será tratado pelo onConfirm
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 modalLightEnter">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Marcar como Resolvido</h2>
        </div>
        
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          Esta ação marcará o chamado como resolvido e enviará uma notificação de conclusão para o usuário.
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[80px] justify-center"
          >
            {loading ? (
              <>
                <div className="spinnerSoft h-4 w-4 border-2 border-white border-t-transparent rounded-full -ml-1 mr-2"></div>
                Processando...
              </>
            ) : (
              'Sim, resolver'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMarcarResolvido;
