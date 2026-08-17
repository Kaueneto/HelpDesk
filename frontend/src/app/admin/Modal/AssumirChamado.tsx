import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface ModalAssumirChamadoProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}
  
const ModalAssumirChamado: React.FC<ModalAssumirChamadoProps> = ({ isOpen, onConfirm, onClose, isLoading = false }) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="assumir-chamado-titulo">
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-lg modalLightEnter"
        style={{ backgroundColor: theme.background.modal }}
      >
        <h2 id="assumir-chamado-titulo" className="mb-4 text-2xl font-bold" style={{ color: theme.text.primary }}>Atribuir chamado</h2>
        <p className="mb-6 text-base" style={{ color: theme.text.secondary }}>Deseja realmente atribuir a responsabilidade por este chamado?</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: theme.background.hover,
              border: `1px solid ${theme.border.primary}`,
              color: theme.text.secondary,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            
             {isLoading ? (
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
