"use client";

import { memo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import TicketCard from './TicketCard';
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
  historico?: Array<{
    id: number;
    descricao: string;
    dataHistorico: string;
    usuario?: {
      name: string;
    };
  }>;
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

interface KanbanColumnProps {
  id: string;
  title: string;
  color?: string;
  tickets: Chamado[];
  onTicketClick?: (ticket: Chamado) => void;
  groupBy: string;
  columnValue: string;
  selectedTickets?: Set<number>;
  onTicketSelect?: (ticketId: number, selected: boolean) => void;
}

const KanbanColumn = memo(({
  id,
  title,
  color = '#3B82F6',
  tickets,
  onTicketClick,
  groupBy,
  columnValue,
  selectedTickets = new Set(),
  onTicketSelect
}: KanbanColumnProps) => {
  const { theme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    isOver,
    setNodeRef
  } = useDroppable({
    id: id,
    data: {
      type: 'column',
      groupBy,
      columnValue,
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{
        opacity: 1,
        x: 0,
        width: isCollapsed ? 'auto' : undefined
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isCollapsed ? 'flex-row' : 'flex-col'} h-full ${isCollapsed ? 'min-w-12' : 'min-w-80 max-w-80'}`}
    >
      {isCollapsed ? (
        /* cxoluna recolhida - vertical */
        <div
          className={`flex flex-col items-center justify-start p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
            isOver ? 'shadow-lg' : ''
          }`}
          style={{
            backgroundColor: theme.kanban.columnBg,
            borderColor: color,
            borderLeftColor: color,
            borderLeftWidth: '3px',
            borderWidth: '1px'
          }}
          onClick={() => setIsCollapsed(false)}
        >
          {/* icone para expandir */}
          <button
            className="transition-colors mb-2"
            title="Expandir coluna"
            style={{ color: theme.kanban.textSecondary }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* contador de tickets */}
          <span className={`text-xs font-medium px-2 py-1 rounded-full mb-2 transition-all`}
            style={{
              backgroundColor: isOver ? theme.brand.primary : theme.kanban.columnBorder,
              color: isOver ? '#FFFFFF' : theme.kanban.textSecondary
            }}
          >
            {tickets.length}
          </span>

          {/* titulo vertical */}
          <div className={`${workSans.className} flex-1 flex items-center justify-center`}>
            <h3
              className={`text-sm font-semibold whitespace-nowrap`}
              style={{
                color: theme.kanban.textPrimary,
                writingMode: 'vertical-rl',
                textOrientation: 'mixed'
              }}
            >
              {title}
            </h3>
          </div>

          {/* indicador de cor */}
          <div
            className="w-3 h-3 rounded-full mt-2"
            style={{ backgroundColor: color }}
          />
        </div>
      ) : (
        /* coluna expandida - normal */
        <>
          {/* header da Coluna */}
          <div
            className={`flex items-center justify-between p-4 rounded-t-lg border transition-all duration-200`}
            style={{
              backgroundColor: theme.kanban.columnBg,
              borderColor: theme.kanban.columnBorder,
              borderTopColor: color,
              borderTopWidth: '3px',
              borderWidth: '1px'
            }}
          >
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <h3 className={`${workSans.className} text-sm font-semibold truncate`}
                style={{ color: theme.kanban.textPrimary }}
              >
                {title}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              {/* botao de recolher */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="transition-colors p-1"
                style={{ color: theme.kanban.textSecondary }}
                title="Recolher coluna"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              {/* contador */}
              <span className={`text-xs font-medium px-2 py-1 rounded-full transition-all`}
                style={{
                  backgroundColor: isOver ? theme.brand.primary : theme.kanban.columnBorder,
                  color: isOver ? '#FFFFFF' : theme.kanban.textSecondary
                }}
              >
                {tickets.length}
              </span>
            </div>
          </div>

          {/* zona de drop */}
          <div
            ref={setNodeRef}
            className={`
              flex-1 min-h-32 p-2 rounded-b-lg border border-t-0
              transition-all duration-150
            `}
            style={{
              backgroundColor: isOver ? `${theme.brand.primary}19` : theme.kanban.columnBg,
              borderColor: isOver ? theme.brand.primary : theme.kanban.columnBorder
            }}
          >
            {/* indicador de drop */}
            {isOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-2 p-2 border-2 border-dashed rounded-lg"
                style={{
                  borderColor: theme.brand.primary,
                  backgroundColor: `${theme.brand.primary}1a`
                }}
              >
                <p className="text-xs font-medium text-center" style={{ color: theme.brand.primary }}>
                  ↓ Solte o card aqui
                </p>
              </motion.div>
            )}

            {/* lista de tickets */}
            <SortableContext
              items={tickets.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-2">
                <div className="space-y-2">
                {tickets.length > 0 ? (
                  tickets.map((ticket, index) => (
                    <motion.div
                      key={ticket.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <TicketCard
                      chamado={ticket}
                      onClick={() => onTicketClick?.(ticket)}
                      isSelected={selectedTickets.has(ticket.id)}
                      onSelect={onTicketSelect}
                    />
                  </motion.div>
                ))
              ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center py-8"
                  >
                    <div style={{ color: theme.kanban.textSecondary }} className="text-sm">
                      Arraste cards aqui
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            </SortableContext>
          </div>
        </>
      )}
    </motion.div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;