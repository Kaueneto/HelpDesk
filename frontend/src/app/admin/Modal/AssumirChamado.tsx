import React from 'react';

interface ModalAssumirChamadoProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const ModalAssumirChamado: React.FC<ModalAssumirChamadoProps> = ({ isOpen, onConfirm, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" style={{backdropFilter: 'blur(2px)'}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-fade-in border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Atribuir chamado</h2>
        <p className="text-gray-700 mb-6 text-base">Deseja realmente atribuir a responsabilidade por este chamado?</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-semibold shadow-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold shadow-sm"
          >
            Sim
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAssumirChamado;
