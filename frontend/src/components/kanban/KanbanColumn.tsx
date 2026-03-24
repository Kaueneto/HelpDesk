"use client";

import { memo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
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
          className={`flex flex-col items-center justify-start p-2 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 cursor-pointer hover:bg-gray-100 ${
            isOver ? 'bg-blue-50 border-blue-400' : ''
          }`}
          style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
          onClick={() => setIsCollapsed(false)}
        >
          {/* icone para expandir */}
          <button
            className="text-gray-500 hover:text-gray-700 transition-colors mb-2"
            title="Expandir coluna"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* contador de tickets */}
          <span className={`text-xs font-medium px-2 py-1 rounded-full mb-2 ${
            isOver
              ? 'bg-blue-200 text-blue-700'
              : 'bg-gray-200 text-gray-500'
          }`}>
            {tickets.length}
          </span>

          {/* titulo vertical */}
          <div className={`${workSans.className} flex-1 flex items-center justify-center`}>
            <h3
              className={` text-sm font-semibold text-gray-900 whitespace-nowrap`}
              style={{
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
            className={`flex items-center justify-between p-4 bg-gray-50 rounded-t-lg border border-gray-200 transition-all duration-200 ${
              isOver ? 'bg-blue-50 border-blue-400' : ''
            }`}
            style={{ borderTopColor: color, borderTopWidth: '3px' }}
          >
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <h3 className={`${workSans.className} text-sm font-semibold text-gray-900 truncate`}>
                {title}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              {/* botao de recolher */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                title="Recolher coluna"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              {/* contador */}
              <span className={`text-xs font-medium px-2 py-1 rounded-full transition-all ${
                isOver
                  ? 'bg-blue-200 text-blue-700'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {tickets.length}
              </span>
            </div>
          </div>

          {/* zona de drop */}
          <div
            ref={setNodeRef}
            className={`
              flex-1 min-h-32 p-2 bg-white rounded-b-lg border border-t-0 border-gray-200
              transition-all duration-150
              ${isOver
                ? 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-300 ring-opacity-50'
                : 'hover:bg-gray-50'
              }
            `}
          >
            {/* indicador de drop */}
            {isOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-2 p-2 border-2 border-dashed border-blue-400 bg-blue-100/50 rounded-lg"
              >
                <p className="text-xs text-blue-600 font-medium text-center">
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
                    <div className="text-gray-300 text-sm">
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