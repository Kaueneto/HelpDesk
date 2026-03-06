import React, { useState } from 'react';

interface ModalAssumirChamadoProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}
  
const ModalAssumirChamado: React.FC<ModalAssumirChamadoProps> = ({ isOpen, onConfirm, onClose, isLoading = false }) => {const [internalLoading, setInternalLoading] = useState(false);
  const loading = isLoading || internalLoading;
  if (!isOpen) return null;

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-[#f4f4f4] rounded-xl shadow-lg w-full max-w-md p-6 modalLightEnter">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Atribuir chamado</h2>
        <p className="text-gray-700 mb-6 text-base">Deseja realmente atribuir a responsabilidade por este chamado?</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition  shadow-sm border-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold shadow-sm"
          >
            
             {loading ? (
              <>
                <div className="spinnerSoft h-4 w-4 border-2 border-white border-t-transparent rounded-full -ml-1 mr-2"></div>
                Processando...
              </>
            ) : (
              'Sim, Atribuir'
            )}
        
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAssumirChamado;
