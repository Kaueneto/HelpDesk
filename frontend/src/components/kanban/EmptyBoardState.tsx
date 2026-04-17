"use client";

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { FiPlus } from 'react-icons/fi';

interface EmptyBoardStateProps {
  onCreateBoard: () => void;
  onCreateColumn: () => void;
  isLoading?: boolean;
  boardName?: string;
  hasBoard: boolean;
}

const EmptyBoardState = ({
  onCreateBoard,
  onCreateColumn,
  isLoading = false,
  boardName = '',
  hasBoard = false,
}: EmptyBoardStateProps) => {
  const { theme } = useTheme();

  // Guard clause - se theme não existir, não renderizar
  if (!theme) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="h-full flex items-center justify-center"
    >
      <div className="text-center">
        {!hasBoard ? (
          // Estado 1: Sem nenhum board criado
          <>
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: theme.background.surface,
              }}
            >
              <FiPlus
                size={40}
                style={{ color: theme.brand.primary }}
                strokeWidth={1.5}
              />
            </div>
            <h3
              className="text-xl font-semibold mb-2"
              style={{ color: theme.text.primary }}
            >
              Criar uma exibição personalizada 
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: theme.text.tertiary }}
            >
              Customize suas colunas e organize seus chamados do jeito que preferir
            </p>
            <button
              onClick={onCreateBoard}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: theme.brand.primary,
              }}
            >
              <FiPlus size={18} />
              {isLoading ? 'Criando...' : 'Novo'}
            </button>
          </>
        ) : (
          // Estado 2: Board criado mas sem colunas
          <>
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: theme.background.surface,
              }}
            >
              <FiPlus
                size={40}
                style={{ color: theme.indicators.info }}
                strokeWidth={1.5}
              />
            </div>
            <h3
              className="text-xl font-semibold mb-2"
              style={{ color: theme.text.primary }}
            >
              {boardName}
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: theme.text.tertiary }}
            >
              Crie coluna
            </p>
            <button
              onClick={onCreateColumn}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: theme.indicators.info,
              }}
            >
              <FiPlus size={18} />
              {isLoading ? 'Criando...' : 'Adicionar Coluna'}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default EmptyBoardState;
