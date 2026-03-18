"use client";

import { useState, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiClock, FiUser, FiCalendar, FiCheckCircle, FiFileText, FiCheck } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Chamado {
  id: number;
  numeroChamado: number;
  dataAbertura: string;
  dataFechamento: string | null;
  resumoChamado: string;
  usuario: {
    id: number;
    name: string;
  };
  userResponsavel: {
    id: number;
    name: string;
  } | null;
  tipoPrioridade: {
    id: number;
    nome: string;
    cor: string;
  };
  topicoAjuda: {
    id: number;
    nome: string;
  };
  departamento: {
    id: number;
    nome: string;
    name?: string;
  };
  status: {
    id: number;
    nome: string;
  };
  kanbanPositions?: Array<{
    groupBy: string;
    columnValue: string | null;
    position: number;
  }> | {
    groupBy: string;
    columnValue: string | null;
    position: number;
  } | null;
}

interface TicketCardProps {
  chamado: Chamado;
  onClick?: () => void;
  isDragging?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  isSelected?: boolean;
}

// mapeamento de cores para prioridades
const priorityColors: { [key: string]: string } = {
  'baixo': 'bg-green-100 text-green-800 border-green-500',
  'medio': 'bg-blue-100 text-blue-600 border-blue-500',
  'alto': 'bg-yellow-100 text-yellow-700 border-yellow-500',
  'crítica': 'bg-red-100 text-red-800 border-red-500',
  'urgente': 'bg-red-100 text-red-800 border-red-700',
};

// mapeamento de cores para status
const statusColors: { [key: number]: string } = {
  1: 'bg-yellow-100 text-yellow-700 border-yellow-500',      // ABERTO
  2: 'bg-blue-100 text-blue-600 border-blue-500',            // EM ATENDIMENTO
  3: 'bg-green-100 text-green-800 border-green-700',         // ENCERRADO
  4: 'bg-gray-100 text-red-800 border-red-700',              // CANCELADO
  5: 'bg-purple-100 text-purple-700 border-purple-500',      // AGUARDANDO
  6: 'bg-gray-100 text-gray-800 border-gray-700',            // OUTRO CASO HOUVER MAIS NA FRENTE
  7: 'bg-orange-100 text-orange-800 border-orange-700',      // OUTRO CASO HOUVER MAIS NA FRENTE
};

const TicketCard = memo(({ chamado, onClick, isDragging = false, onSelect, isSelected = false }: TicketCardProps) => {
 
  const [isHovered, setIsHovered] = useState(false);
  const [showMoveAnimation, setShowMoveAnimation] = useState(false);
  const [prevPositions, setPrevPositions] = useState(JSON.stringify(chamado.kanbanPositions));

  // Detectar quando o card foi movido para uma nova coluna/posição
  useEffect(() => {
    const currentPositions = JSON.stringify(chamado.kanbanPositions);
    if (prevPositions !== currentPositions && prevPositions !== undefined) {
      // Card foi movido! Ativar animação de destaque
      setShowMoveAnimation(true);
      
      // Desativar animação após 800ms
      const timer = setTimeout(() => {
        setShowMoveAnimation(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
    
    // atualizar posições anteriores
    setPrevPositions(currentPositions);
  }, [chamado.kanbanPositions, prevPositions]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id: chamado.id,
    data: {
      type: 'ticket',
      ticket: chamado,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableIsDragging ? 0.5 : 1,
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getPriorityColor = (prioridadeNome: string) => {
    const normalizedName = prioridadeNome.toLowerCase();
    return priorityColors[normalizedName] || 'bg-gray-100 text-gray-800 border-gray-500';
  };

  const getStatusColor = (statusId: number) => {
    return statusColors[statusId] || 'bg-red-100 text-red-800 border-red-800';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // evita conflito entre drag e click
    if (sortableIsDragging || isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    if (onClick) {
      onClick();
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onSelect) {
      onSelect(chamado.id, !isSelected);
    }
  };


  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: showMoveAnimation ? 1.02 : 1,
      }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ 
        duration: 0.3, 
        ease: "easeOut",
        scale: { duration: 0.4 }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        bg-[#fdfdfd] rounded-lg shadow-sm border transition-all duration-100 ease-out
        relative overflow-hidden group
        ${isSelected
          ? 'border-blue-500 shadow-md bg-blue-50'
          : 'border-gray-200 hover:shadow-md hover:border-blue-300'
        }
        ${sortableIsDragging || isDragging
          ? 'shadow-lg border-blue-500 bg-blue-50 opacity-50 scale-105 cursor-grabbing'
          : 'cursor-pointer hover:bg-blue-50/30'
        }
        ${showMoveAnimation ? 'shadow-lg shadow-green-400 border-green-400' : ''}
        select-none
      `}
      onClick={handleCardClick}
    >
      {/* efeito de glow quando move */}
      <AnimatePresence>
        {showMoveAnimation && (
          <motion.div
            initial={{ opacity: 1, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 border-2 border-green-400 rounded-lg pointer-events-none"
          />
        )}
      </AnimatePresence>
      {/* visual indicator pra drag */}
      {sortableIsDragging && (
        <div className="absolute inset-0 bg-blue-400 opacity-10"></div>
      )}

      <div className="p-3">
        {/* header com checkbox, assunto e numero */}
        <div className="flex items-start gap-2 mb-2">
          {/* checkbox - aparece ao hover ou quando selecionado */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isHovered || isSelected ? 1 : 0, scale: isHovered || isSelected ? 1 : 0.8 }}
            transition={{ duration: 0.15 }}
            className="mt-0.5 shrink-0"
            onClick={handleCheckboxClick}
          >
            <div className={`
              w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all
              ${isSelected 
                ? 'bg-blue-500 border-blue-500' 
                : 'border-gray-300 hover:border-blue-400'
              }
            `}>
              {isSelected && (
                <FiCheck className="w-3 h-3 text-white" strokeWidth={3} />
              )}
            </div>
          </motion.div>

          {/* conteudo principal */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight">
              {chamado.resumoChamado}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              #{chamado.numeroChamado || chamado.id}
            </p>
          </div>

         
        </div>

        {/* conteudo do card */}
        <div className="space-y-1.5">
          {/* prioridade */}
          <div>
            <span className={`
              inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
              ${getPriorityColor(chamado.tipoPrioridade.nome)}
            `}>
              {chamado.tipoPrioridade.nome}
            </span>
          </div>

          {/* topico */}
          <div className="flex items-center text-xs text-gray-600 gap-1.5">
            <FiFileText className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="truncate">{chamado.topicoAjuda.nome}</span>
          </div>

          {/* status */}
          <div>
            <span className={`
              inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
              ${getStatusColor(chamado.status.id)}
            `}>
              {chamado.status.nome}
            </span>
          </div>

          {/* datas */}
          <div className="space-y-1">
            <div className="flex items-center text-xs text-gray-500 gap-1">
              <FiClock className="w-3 h-3" />
              <span>Abertura: {formatDate(chamado.dataAbertura)}</span>
            </div>
            {chamado.dataFechamento && (
              <div className="flex items-center text-xs text-gray-500 gap-1">
                <FiCheckCircle className="w-3 h-3" />
                <span>Conclusão: {formatDate(chamado.dataFechamento)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

TicketCard.displayName = 'TicketCard';

export default TicketCard;

// add estilos globais para animação de movimento
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes moveGlow {
      0% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7),
         0 1px 3px 0 rgba(0, 0, 0, 0.1);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.3),
          0 10px 15px -3px rgba(0, 0, 0, 0.2);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0),
         0 1px 3px 0 rgba(0, 0, 0, 0.1);
      }
    }

    @keyframes movePulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.02);
      }
    }
  `;
  document.head.appendChild(style);
}