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
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-xl"
        style={{
          backgroundColor: theme.background.surface,
          borderColor: theme.border.primary,
          borderWidth: '1px',
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2
              className="text-xl font-semibold"
              style={{ color: theme.text.primary }}
            >
              Criar Novo Quadro
            </h2>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 rounded-lg transition-all duration-200 hover:opacity-75 disabled:opacity-50"
              style={{ color: theme.text.secondary }}
              title="Fechar"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                htmlFor="nomeBoard"
                className="block text-sm font-medium mb-2"
                style={{ color: theme.text.secondary }}
              >
                Nome do Quadro
              </label>
              <input
                id="nomeBoard"
                type="text"
                value={nomeBoardValue}
                onChange={(e) => setNomeBoardValue(e.target.value)}
                placeholder="Ex: Sprint 10, Backlog, etc."
                disabled={isLoading}
                autoFocus
                className="w-full px-4 py-2.5 rounded-lg border transition-all duration-200 disabled:opacity-50"
                style={{
                  backgroundColor: theme.background.surface,
                  borderColor: theme.border.secondary,
                  color: theme.text.primary,
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleSubmit(e);
                  }
                }}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                style={{
                  backgroundColor: theme.background.hover,
                  color: theme.text.primary,
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !nomeBoardValue.trim()}
                className="flex-1 py-2 px-4 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: theme.brand.primary,
                }}
              >
                {isLoading ? 'Criando...' : 'Criar Quadro'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
};

export default CreateBoardModal;
