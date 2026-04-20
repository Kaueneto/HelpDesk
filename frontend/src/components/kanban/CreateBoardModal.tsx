"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { FiX } from 'react-icons/fi';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (nome: string) => Promise<void>;
  isLoading?: boolean;
}

const CreateBoardModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateBoardModalProps) => {
  const { theme } = useTheme();
  const [nomeBoardValue, setNomeBoardValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomeBoardValue.trim()) {
      return;
    }

    try {
      await onSubmit(nomeBoardValue.trim());
      setNomeBoardValue('');
      onClose();
    } catch (error) {
      // Erro já é tratado no hook
      console.error('Erro ao criar board:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: theme.background.modal,
          borderColor: theme.background.modal,
          borderWidth: '1px',
        }}
      >
        <div className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="flex items-start justify-between w-full mb-16">
              <input
                id="nomeBoard"
                type="text"
                value={nomeBoardValue}
                onChange={(e) => setNomeBoardValue(e.target.value)}
                placeholder="Digite o nome do quadro..."
                disabled={isLoading}
                autoFocus
                className="w-full text-left text-3xl font-bold border-none outline-none focus:outline-none focus:ring-0 appearance-none"   
              style={{
                backgroundColor: 'transparent',
                color: theme.text.primary,
                caretColor: theme.brand.primary,
              }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />

              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="p-1 rounded-lg transition-all duration-200 hover:opacity-75 disabled:opacity-50 shrink-0 ml-4"
                style={{ color: theme.text.primary }}
              >
                <FiX size={28} />
              </button>
            </div>

            {/* Buttons */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="py-2.5 px-6 rounded-xl text-sm font-semibold border transition-all duration-200 hover:opacity-90 hover:shadow-md disabled:opacity-50"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: theme.brand.primary,
                  color: theme.brand.primary,
                }}
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={isLoading || !nomeBoardValue.trim()}
                className="py-2.5 px-8 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: theme.brand.primary,
                  color: '#fff',
                }}
              >
                {isLoading ? 'Criando...' : 'Criar'}
              </button>
            </div>

          </form>
        </div>
      </motion.div>
    </>
  );
};

export default CreateBoardModal;
