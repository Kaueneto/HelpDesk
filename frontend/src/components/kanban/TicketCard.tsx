"use client";

import { useState, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiFileText, FiCheck, FiEdit } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Work_Sans } from "next/font/google";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-worksans",
});


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
  'baixo': '--status-3-bg',      // Verde
  'medio': '--status-2-bg',      // Azul
  'alto': '--status-1-bg',       // Amarelo
  'crítica': '--status-4-bg',    // Vermelho
  'urgente': '--status-4-bg',    // Vermelho
};

const priorityTextColors: { [key: string]: string } = {
  'baixo': '--status-3-texto',
  'medio': '--status-2-texto',
  'alto': '--status-1-texto',
  'crítica': '--status-4-texto',
  'urgente': '--status-4-texto',
};

const priorityBorderColors: { [key: string]: string } = {
  'baixo': '--status-3-borda',
  'medio': '--status-2-borda',
  'alto': '--status-1-borda',
  'crítica': '--status-4-borda',
  'urgente': '--status-4-borda',
};

// mapeamento de cores para status (usando IDs e variáveis CSS)
const statusColorVars: { [key: number]: { bg: string; text: string; border: string } } = {
  1: { bg: '--status-1-bg', text: '--status-1-texto', border: '--status-1-borda' },      // ABERTO
  2: { bg: '--status-2-bg', text: '--status-2-texto', border: '--status-2-borda' },      // EM ATENDIMENTO
  3: { bg: '--status-3-bg', text: '--status-3-texto', border: '--status-3-borda' },      // ENCERRADO
  4: { bg: '--status-4-bg', text: '--status-4-texto', border: '--status-4-borda' },      // CANCELADO
  5: { bg: '--status-5-bg', text: '--status-5-texto', border: '--status-5-borda' },      // AGUARDANDO
  6: { bg: '--status-6-bg', text: '--status-6-texto', border: '--status-6-borda' },      // OUTRO
  7: { bg: '--status-7-bg', text: '--status-7-texto', border: '--status-7-borda' },      // OUTRO
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
    const bgVar = priorityColors[normalizedName] || '--status-6-bg';
    const textVar = priorityTextColors[normalizedName] || '--status-6-texto';
    const borderVar = priorityBorderColors[normalizedName] || '--status-6-borda';
    return { bgVar, textVar, borderVar };
  };

  const getStatusColor = (statusId: number) => {
    return statusColorVars[statusId] || { bg: '--status-6-bg', text: '--status-6-texto', border: '--status-6-borda' };
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
        rounded-lg shadow-sm border transition-all duration-100 ease-out
        relative overflow-hidden group
        select-none
      `}
      style={{
        ...style,
        backgroundColor: `rgb(var(--kanban-card-bg))`,
        borderColor: isSelected ? '#3b82f6' : `rgb(var(--kanban-card-border))`,
        borderWidth: '1px',
        cursor: sortableIsDragging || isDragging ? 'grabbing' : 'pointer',
        boxShadow: sortableIsDragging || isDragging ? '0 10px 15px -3px rgba(59, 130, 246, 0.4)' : isSelected ? '0 0 0 2px #3b82f6' : '0 1px 2px rgba(0, 0, 0, 0.1)',
        opacity: sortableIsDragging ? 0.5 : 1,
        transform: (sortableIsDragging || isDragging) ? 'scale(1.05)' : 'scale(1)',
      }}
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
            className="absolute inset-0 border-2 rounded-lg pointer-events-none"
            style={{ borderColor: '#22c55e' }}
          />
        )}
      </AnimatePresence>
      {/* visual indicator pra drag */}
      {sortableIsDragging && (
        <div className="absolute inset-0 opacity-10" style={{ backgroundColor: '#3b82f6' }}></div>
      )}

      <div className="p-3">
        {/* header com checkbox, assunto e numero */}
        <div className="flex items-start gap-2 mb-2">
          {/* checkbox - aparece ao hover ou quando selecionado */}
          <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{
            width: isHovered || isSelected ? 20 : 0,
            opacity: isHovered || isSelected ? 1 : 0
          }}
          transition={{ duration: 0.2 }}
          className="mt-0.5 shrink-0 overflow-hidden flex items-center"
          onClick={handleCheckboxClick}
        >
          <div className={`
            w-5 h-5 rounded-lg border flex items-center justify-center cursor-pointer transition-all
          `}
          style={{
            backgroundColor: isSelected ? '#3b82f6' : 'transparent',
            borderColor: isSelected ? '#3b82f6' : `rgb(var(--kanban-card-border))`
          }}
          >
            {isSelected && (
              <FiCheck className="w-3 h-3 text-white" strokeWidth={3} />
            )}
          </div>
        </motion.div>

          {/* conteudo principal */}
          <div className="flex-1 min-w-0">
            <h3 className="font-segoe text-base font-semibold line-clamp-2 leading-tight"
              style={{ color: `rgb(var(--kanban-text-primary))` }}
            >
              {chamado.resumoChamado}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: `rgb(var(--kanban-text-secondary))` }}>
              #{chamado.numeroChamado || chamado.id}
            </p>
          </div>

         
        </div>

        {/* conteudo do card */}
        <div className="space-y-1.5">
          {/* prioridade */}
          <div>
            {(() => {
              const { bgVar, textVar, borderVar } = getPriorityColor(chamado.tipoPrioridade.nome);
              return (
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border 
                `}
                style={{
                  backgroundColor: `rgb(var(${bgVar}))`,
                  color: `rgb(var(${textVar}))`,
                  borderColor: `rgb(var(${borderVar}))`
                }}
                >
                  {chamado.tipoPrioridade.nome}
                </span>
              );
            })()}
          </div>

          {/* topico */}
          <div className={`${workSans.className} flex items-center text-sm gap-1.5`}
            style={{ color: `rgb(var(--kanban-text-secondary))` }}
          >
            <FiFileText className="w-3 h-3 shrink-0" />
            <span className="truncate">{chamado.topicoAjuda.nome}</span>
          </div>

          {/* status */}
          <div>
            {(() => {
              const { bg, text, border } = getStatusColor(chamado.status.id);
              return (
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border 
                `}
                style={{
                  backgroundColor: `rgb(var(${bg}))`,
                  color: `rgb(var(${text}))`,
                  borderColor: `rgb(var(${border}))`
                }}
                >
                  {chamado.status.nome}
                </span>
              );
            })()}
          </div>

          {/* datas */}
          <div className="space-y-1">
            <div className="flex items-center text-xs gap-1" style={{ color: `rgb(var(--kanban-text-secondary))` }}>
              <FiEdit  className="w-3 h-3" />
              <span>{formatDate(chamado.dataAbertura)}</span>
            </div>
            {chamado.dataFechamento && (
              <div className="flex items-center text-xs gap-1" style={{ color: `rgb(var(--kanban-text-secondary))` }}>
                <FiCheck className="w-3 h-3" />
                <span>{formatDate(chamado.dataFechamento)}</span>
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