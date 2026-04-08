"use client";

import { useState, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiFileText, FiCheck, FiEdit } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Work_Sans } from "next/font/google";
import { useTheme } from '@/contexts/ThemeContext';

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

const TicketCard = memo(({ chamado, onClick, isDragging = false, onSelect, isSelected = false }: TicketCardProps) => {
  const { theme } = useTheme();
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
    
    switch (normalizedName) {
      case 'baixa':
      case 'baixo':
        return theme.priority.baixa;
      case 'média':
      case 'media':
      case 'médio':
      case 'medio':
        return theme.priority.media;
      case 'alta':
      case 'alto':
        return theme.priority.alta;
      case 'crítica':
      case 'critica':
        return theme.priority.critica;
      case 'urgente':
        return theme.priority.urgente;
      default:
        return theme.priority.media;
    }
  };

  const getStatusColor = (statusId: number) => {
    switch (statusId) {
      case 1: return theme.status.aberto;           // ABERTO
      case 2: return theme.status.emAtendimento;    // EM ATENDIMENTO
      case 3: return theme.status.encerrado;        // ENCERRADO
      case 4: return theme.status.cancelado;        // CANCELADO
      case 5: return theme.status.aguardando;       // AGUARDANDO
      case 6: return theme.status.pendenteUsuario;  // PENDENTE_USUARIO
      case 7: return theme.status.pendente;         // PENDENTE
      default: return theme.status.aberto;
    }
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
        backgroundColor: theme.background.card,
        borderColor: isSelected ? theme.brand.primary : theme.border.secondary,
        borderWidth: '1px',
        cursor: sortableIsDragging || isDragging ? 'grabbing' : 'pointer',
        boxShadow: sortableIsDragging || isDragging ? `0 10px 15px -3px ${theme.brand.primary}66` : isSelected ? `0 0 0 2px ${theme.brand.primary}` : '0 1px 2px rgba(0, 0, 0, 0.1)',
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
            style={{ borderColor: theme.indicators.sucesso }}
          />
        )}
      </AnimatePresence>
      {/* visual indicator pra drag */}
      {sortableIsDragging && (
        <div className="absolute inset-0 opacity-10" style={{ backgroundColor: theme.brand.primary }}></div>
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
            w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all
          `}
          style={{
            backgroundColor: isSelected ? theme.brand.primary : theme.background.hover,
            borderColor: isSelected ? theme.brand.primary : theme.brand.primary,
            opacity: isSelected ? 1 : 0.7
          }}
          >
            {isSelected ? (
              <FiCheck className="w-3 h-3 text-white" strokeWidth={3} />
            ) : (
              <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: theme.text.tertiary }}></div>
            )}
          </div>
        </motion.div>

          {/* conteudo principal */}
          <div className="flex-1 min-w-0">
            <h3 className="font-segoe text-base font-semibold line-clamp-2 leading-tight"
              style={{ color: theme.text.primary }}
            >
              {chamado.resumoChamado}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: theme.text.secondary }}>
              #{chamado.numeroChamado || chamado.id}
            </p>
          </div>

         
        </div>

        {/* conteudo do card */}
        <div className="space-y-1.5">
          {/* prioridade */}
          <div>
            {(() => {
              const colors = getPriorityColor(chamado.tipoPrioridade.nome);
              return (
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border 
                `}
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  borderColor: colors.border
                }}
                >
                  {chamado.tipoPrioridade.nome}
                </span>
              );
            })()}
          </div>

          {/* topico */}
          <div className={`${workSans.className} flex items-center text-sm gap-1.5`}
            style={{ color: theme.text.secondary }}
          >
            <FiFileText className="w-3 h-3 shrink-0" />
            <span className="truncate">{chamado.topicoAjuda.nome}</span>
          </div>

          {/* status */}
          <div>
            {(() => {
              const colors = getStatusColor(chamado.status.id);
              return (
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border 
                `}
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  borderColor: colors.border
                }}
                >
                  {chamado.status.nome}
                </span>
              );
            })()}
          </div>

          {/* datas */}
          <div className="space-y-1">
            <div className="flex items-center text-xs gap-1" style={{ color: theme.text.secondary }}>
              <FiEdit  className="w-3 h-3" />
              <span>{formatDate(chamado.dataAbertura)}</span>
            </div>
            {chamado.dataFechamento && (
              <div className="flex items-center text-xs gap-1" style={{ color: theme.text.secondary }}>
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