"use client";

import { memo, useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
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
  onSelectAll?: (ticketIds: number[]) => void;
  onDeleteColumn?: () => void;
  onRenameColumn?: (newName: string) => void;
  onMoveAllCards?: (targetColumnId: string) => void | Promise<void>;
  availableColumns?: Array<{ id: string; nome: string }>;
  isSpecialColumn?: boolean;
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
  onTicketSelect,
  onSelectAll,
  onDeleteColumn,
  onRenameColumn,
  onMoveAllCards,
  availableColumns = [],
  isSpecialColumn = false
}: KanbanColumnProps) => {
  const { theme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(title);
  const [isMoveSubmenuOpen, setIsMoveSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  //memoizar lista de IDs de tickets para evitar re-ordenações desnecessárias
  const ticketIds = tickets.map(t => t.id);

  // handlers para as ações do menu
  const handleSelectAll = () => {
    onSelectAll?.(ticketIds);
    setIsMenuOpen(false);
  };

  const handleRename = () => {
    if (newName.trim() && newName !== title) {
      onRenameColumn?.(newName);
    }
    setIsRenaming(false);
  };

  const handleMoveToColumn = (targetColumnId: string) => {
    onMoveAllCards?.(targetColumnId);
    setIsMenuOpen(false);
  };

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
          className={`flex flex-col items-center justify-start p-2 rounded-lg transition-all duration-200 cursor-pointer ${
            isOver ? 'shadow-lg' : ''
          }`}
          style={{
            backgroundColor: theme.kanban.columnBg,
            borderTop: `1px solid ${theme.kanban.columnBorder}`,
            borderRight: `1px solid ${theme.kanban.columnBorder}`,
            borderBottom: `1px solid ${theme.kanban.columnBorder}`,
            borderLeft: `3px solid ${color}`
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
            className={`flex items-center justify-between p-4 rounded-t-lg transition-all duration-200`}
            style={{
              backgroundColor: theme.kanban.columnBg,
              borderTop: `4px solid ${color}`,
              borderRight: `1px solid ${theme.kanban.columnBorder}`,
              borderBottom: '0px',
              borderLeft: `1px solid ${theme.kanban.columnBorder}`
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

              {/* menuzinho das colunas */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="transition-colors p-1 rounded hover:opacity-70"
                  style={{ color: theme.kanban.textSecondary }}
                  title="Opções da coluna"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg z-50 py-1"
                      style={{
                        backgroundColor: theme.background.surface,
                        borderColor: theme.border.secondary,
                        border: `1px solid ${theme.border.secondary}`
                      }}
                    >
                      {/* sel. Todos */}
                      <button
                        onClick={handleSelectAll}
                        className="w-full text-left px-4 py-2 text-sm transition-colors"
                        style={{
                          color: theme.text.primary,
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = theme.background.hover;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        }}
                      >
                        Selecionar Todos
                      </button>

                      {/* mudar nome da coluna - nao disponivel pra coluna especial (coluna que contem os tickets semcoluna) */}
                      {!isSpecialColumn && (
                        <button
                          onClick={() => {
                            setIsRenaming(true);
                            setIsMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm transition-colors"
                          style={{
                            color: theme.text.primary,
                            backgroundColor: 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = theme.background.hover;
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          Alterar Nome
                        </button>
                      )}

                      {availableColumns.length > 0 && (
                        <>
                          <div className="border-t" style={{ borderColor: theme.border.secondary }} />
                          <div className="relative">
                            <button
                              onClick={() => setIsMoveSubmenuOpen(!isMoveSubmenuOpen)}
                              className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between"
                              style={{
                                color: theme.text.primary,
                                backgroundColor: isMoveSubmenuOpen ? theme.background.hover : 'transparent',
                              }}
                              onMouseEnter={(e) => {
                                if (!isMoveSubmenuOpen) {
                                  (e.currentTarget as HTMLElement).style.backgroundColor = theme.background.hover;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isMoveSubmenuOpen) {
                                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <span>Mover Cards Para</span>
                              <svg
                                className={`w-4 h-4 transition-transform ${isMoveSubmenuOpen ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>

                            <AnimatePresence>
                              {isMoveSubmenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -8 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute left-full top-0 mt-0 ml-1 w-40 rounded-lg shadow-lg z-50 bg-transparent"
                                >
                                  <div
                                    className="rounded-lg py-1"
                                    style={{
                                      backgroundColor: theme.background.surface,
                                      border: `1px solid ${theme.border.secondary}`
                                    }}
                                  >
                                    {availableColumns.map((col) => (
                                      <button
                                        key={col.id}
                                        onClick={() => {
                                          handleMoveToColumn(col.id);
                                          setIsMoveSubmenuOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm transition-colors"
                                        style={{
                                          color: theme.text.primary,
                                          backgroundColor: 'transparent',
                                        }}
                                        onMouseEnter={(e) => {
                                          (e.currentTarget as HTMLElement).style.backgroundColor = theme.background.hover;
                                        }}
                                        onMouseLeave={(e) => {
                                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                        }}
                                      >
                                        {col.nome}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </>
                      )}
                      {!isSpecialColumn && (
                        <>
                          <div className="border-t" style={{ borderColor: theme.border.secondary }} />
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              onDeleteColumn?.();
                            }}
                            className="w-full text-left px-4 py-2 text-sm transition-colors"
                            style={{
                              color: '#EF4444',
                              backgroundColor: 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.backgroundColor = `rgba(239, 68, 68, 0.1)`;
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                            }}
                          >
                            Excluir Coluna
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

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
              flex-1 min-h-32 p-2 rounded-b-lg
              max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar
              transition-all duration-150
            `}
            style={{
              backgroundColor: isOver ? `${theme.brand.primary}19` : theme.kanban.columnBg,
              borderRight: `1px solid ${isOver ? theme.brand.primary : theme.kanban.columnBorder}`,
              borderBottom: `1px solid ${isOver ? theme.brand.primary : theme.kanban.columnBorder}`,
              borderLeft: `1px solid ${isOver ? theme.brand.primary : theme.kanban.columnBorder}`
            }}
          >
            {/* indicador de drop */}
            {isOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-2 p-2 border-2 border-dashed rounded-lg shrink-0"
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
              id={id}
              items={ticketIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 pr-1 min-h-25">
                {tickets.length > 0 ? (
                  tickets.map((ticket) => (
                    <div key={ticket.id} className="mb-2">
                      <TicketCard
                        chamado={ticket}
                        onClick={() => onTicketClick?.(ticket)}
                        isSelected={selectedTickets.has(ticket.id)}
                        onSelect={onTicketSelect}
                      />
                    </div>
                  ))
              ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center py-8"
                  >
                    <div style={{ color: theme.kanban.textSecondary }} className="text-sm">
                      Arraste ticket's aqui
                    </div>
                  </motion.div>
                )}
              </div>
            </SortableContext>
          </div>

          {/*modal pra renomear */}
          <AnimatePresence>
            {isRenaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center z-50"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                onClick={() => setIsRenaming(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-lg p-6 w-96 shadow-xl"
                  style={{ backgroundColor: theme.background.surface }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
                    Alterar Nome da Coluna
                  </h3>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRename();
                      } else if (e.key === 'Escape') {
                        setIsRenaming(false);
                        setNewName(title);
                      }
                    }}
                    autoFocus
                    className="w-full px-3 py-2 rounded border mb-4 outline-none text-sm"
                    style={{
                      backgroundColor: theme.background.card,
                      borderColor: theme.border.primary,
                      color: theme.text.primary,
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRename}
                      className="flex-1 px-4 py-2 rounded font-medium text-sm text-white transition-all"
                      style={{
                        backgroundColor: theme.brand.primary,
                      }}
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setIsRenaming(false);
                        setNewName(title);
                      }}
                      className="flex-1 px-4 py-2 rounded font-medium text-sm transition-all border"
                      style={{
                        borderColor: theme.border.secondary,
                        color: theme.text.secondary,
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;