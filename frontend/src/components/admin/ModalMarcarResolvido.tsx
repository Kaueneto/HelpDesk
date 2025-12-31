import React from 'react';

interface ModalMarcarResolvidoProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const ModalMarcarResolvido: React.FC<ModalMarcarResolvidoProps> = ({ isOpen, onConfirm, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" style={{backdropFilter: 'blur(2px)'}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-fade-in border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Marcar como Resolvido</h2>
        <p className="text-gray-700 mb-6 text-base">Deseja realmente marcar este chamado como resolvido?</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-semibold shadow-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-semibold shadow-sm"
          >
            Sim
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMarcarResolvido;
