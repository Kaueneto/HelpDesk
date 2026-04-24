"use client";

import { useMemo, useCallback, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useBoardData } from '@/hooks/useBoardData';
import { useRealtimeBoard } from '@/hooks/useRealtimeBoard';

import { useKanbanGrouping } from './hooks/useKanbanGrouping';
import { useKanbanDragDrop } from './hooks/useKanbanDragDrop';
import { useKanbanColumnManagement } from './hooks/useKanbanColumnManagement';
import { useKanbanFiltering } from './hooks/useKanbanFiltering';

import { moveTicket as moveTicketService } from './services/ticketMovementService';
import { getColumnValueForGroupBy } from './services/ticketMovementService';

import KanbanColumn from './KanbanColumn';
import TicketCard from './TicketCard';
import CreateBoardModal from './CreateBoardModal';
import EmptyBoardState from './EmptyBoardState';
import KanbanHeader from './components/KanbanHeader';

import type { Chamado, KanbanViewProps } from './utils/kanbanTypes';

export default function KanbanView({
  tickets,
  onTicketClick,
  onTicketUpdate,
  onRefresh,
  departamentos = [],
  statusList = [],
  prioridades = [],
  usuarios = [],
  topicosAjuda = [],
  departamentoId = 1,
}: KanbanViewProps) {
  const { theme } = useTheme();

  
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);


  const {
    boards,
    selectedBoard,
    columns,
    cards,
    loading: boardLoading,
    selectBoard,
    createBoard,
    createColumn,
    deleteColumn,
    removeColumnLocal,
    addCardToColumn,
    moveCard,
  } = useBoardData(departamentoId);

  const {
    groupBy,
    selectedBoardId,
    somenteAbertos,
    allGroupByOptions,
    handleGroupByChange,
    setGroupBy,
    setSomenteAbertos,
  } = useKanbanFiltering({ boards, selectBoard });

  const {
    isAddingColumn,
    newColumnName,
    columnInputRef,
    deleteConfirmModal,
    handleCreateColumn,
    handleDeleteColumn,
    handleConfirmDelete,
    handleCancelDelete,
    handleRenameColumn,
    handleCancelColumnEdit,
    setIsAddingColumn,
    setNewColumnName,
  } = useKanbanColumnManagement({ departamentoId, onRefresh });

  const {
    groupedTickets: groupedTicketsBase,
    ticketsByColumn: ticketsByColumnBase,
    calcPositionBetweenTickets,
  } = useKanbanGrouping({
    tickets,
    groupBy,
    columns,
    cards,
    statusList,
    prioridades,
    departamentos,
    topicosAjuda,
    somenteAbertos,
    theme,
    dragOverInfo: null, 
  });


  const {
    activeTicket,
    dragOverInfo,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd: baseDragEnd,
  } = useKanbanDragDrop({
    tickets,
    groupBy,
    columns: columns as any,
    ticketsByColumn: ticketsByColumnBase,
    groupedTickets: groupedTicketsBase,
    getCustomTicketPosition: (ticket) => {
      const card = cards.find((boardCard) => boardCard.idChamado === ticket.id);
      return card ? Number(card.posicao) : 999999;
    },
    onMoveTicket: async (ticketId, targetColumn, newPosition, fromColumnId) => {
      const columnValue = getColumnValueForGroupBy(targetColumn, groupBy);

      if (groupBy === 'personalizada' && selectedBoardId) {
        const existingCard = cards.find((card) => card.idChamado === ticketId);
        const targetColumnId = targetColumn === 'unassigned' ? null : Number(targetColumn);

        if (targetColumn !== 'unassigned' && Number.isNaN(targetColumnId)) {
          throw new Error(`Coluna personalizada inválida: ${targetColumn}`);
        }

        if (existingCard) {
          await moveCard(existingCard.id, targetColumnId, newPosition);
        } else {
          await addCardToColumn(targetColumnId, ticketId, newPosition);
        }
      }

      await moveTicketService(
        ticketId,
        targetColumn,
        newPosition,
        groupBy,
        columnValue ?? null,
        groupBy === 'personalizada' ? selectedBoardId ?? undefined : undefined,
        tickets,
        statusList,
        prioridades,
        departamentos,
        topicosAjuda,
        usuarios,
        onTicketUpdate
      );
    },
  });

  const dragGrouping = useKanbanGrouping({
    tickets,
    groupBy,
    columns,
    cards,
    statusList,
    prioridades,
    departamentos,
    topicosAjuda,
    somenteAbertos,
    theme,
    dragOverInfo,
  });

  const { groupedTickets: groupedTicketsWithDragOver, ticketsByColumn: ticketsByColumnWithDragOver } = useMemo(() => {
    return {
      groupedTickets: dragGrouping.groupedTickets,
      ticketsByColumn: dragGrouping.ticketsByColumn,
    };
  }, [dragGrouping]);

  

  const handleCardMovedRealtime = useCallback(
    (data: any) => {
   
      if (onTicketUpdate) {
        onTicketUpdate(data.chamadoId, (prevTickets: Chamado[]) =>
          prevTickets.map((ticket) => {
            if (ticket.id !== data.chamadoId) return ticket;

            return {
              ...ticket,
              kanbanPositions: {
                groupBy: 'personalizada',
                columnValue: data.columnValue?.toString() || null,
                position: data.position,
              },
            };
          })
        );
      }
    },
    [onTicketUpdate]
  );

  const handleColumnCreatedRealtime = useCallback(() => {
    if (groupBy === 'personalizada' && selectedBoardId) {
      onRefresh?.();
    }
  }, [groupBy, selectedBoardId, onRefresh]);

  const handleColumnDeletedRealtime = useCallback(
    (columnId: number) => {
      if (groupBy === 'personalizada' && selectedBoardId) {
        removeColumnLocal(columnId);
      }
    },
    [groupBy, selectedBoardId, removeColumnLocal]
  );

  useRealtimeBoard({
    boardId: groupBy === 'personalizada' ? selectedBoardId : null,
    enabled: groupBy === 'personalizada',
    onCardMoved: handleCardMovedRealtime,
    onColumnCreated: handleColumnCreatedRealtime,
    onColumnDeleted: handleColumnDeletedRealtime,
  });


  const handleCreateBoard = useCallback(
    async (nome: string) => {
      const newBoard = await createBoard(nome, departamentoId);
      if (newBoard) {
        setGroupBy('personalizada');
        localStorage.setItem('kanbanGroupBy', 'personalizada');
        localStorage.setItem('kanbanSelectedBoard', newBoard.id.toString());
        await selectBoard(newBoard.id);
      }
    },
    [createBoard, selectBoard, departamentoId, setGroupBy]
  );

  const handleRefresh = useCallback(async () => {
    try {
      if (onRefresh) {
        await onRefresh();
      }
      toast.success('Chamados recarregados!');
    } catch (error) {
      toast.error('Erro ao recarregar chamados');
    }
  }, [onRefresh]);

  const handleSelectAllCardsInColumn = useCallback(
    (ticketIds: number[]) => {
      // This functionality could be expanded in the future
      toast.success(`${ticketIds.length} cards selecionados!`);
    },
    []
  );

  const getColumnValue = (columnId: string): string | null => {
    if (groupBy === 'responsavel') {
      return columnId === 'sem-responsavel' ? null : columnId;
    }
    return columnId;
  };

  // ==================== RENDER ====================

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
      {/* Header with grouping selector and filters */}
      <KanbanHeader
        tickets={tickets}
        groupBy={groupBy}
        allGroupByOptions={allGroupByOptions}
        selectedBoard={selectedBoard}
        somenteAbertos={somenteAbertos}
        isRefreshing={false}
        onGroupByChange={handleGroupByChange}
        onToggleSomenteAbertos={() => setSomenteAbertos(!somenteAbertos)}
        onRefresh={handleRefresh}
        onCreateBoard={() => setIsCreateBoardModalOpen(true)}
        theme={theme}
      />

      {/* Kanban Board */}
      {groupBy === 'personalizada' ? (
        // Custom board mode
        selectedBoard ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={baseDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
              <AnimatePresence>
                {/* Unassigned column (if has tickets) */}
                {ticketsByColumnWithDragOver['unassigned']?.length > 0 && (
                  <div key="unassigned">
                    <KanbanColumn
                      id="unassigned"
                      title="Tickets sem coluna"
                      color={theme.border.secondary}
                      tickets={ticketsByColumnWithDragOver['unassigned'] || []}
                      onTicketClick={onTicketClick}
                      groupBy="personalizada"
                      columnValue="unassigned"
                      selectedTickets={new Set()}
                      onTicketSelect={() => {}}
                      onSelectAll={handleSelectAllCardsInColumn}
                      onMoveAllCards={() => {}}
                      availableColumns={columns.map((col) => ({
                        id: col.id.toString(),
                        title: col.nome, // Troque 'nome' por 'title'
                      })) as any}
                      isSpecialColumn={true}
                    />
                  </div>
                )}

                {/* Fixed columns */}
                {columns.map((column) => (
                  <div key={column.id}>
                    <KanbanColumn
                      id={column.id.toString()}
                      title={column.nome}
                      color={theme.brand.primary}
                      tickets={ticketsByColumnWithDragOver[column.id.toString()] || []}
                      onTicketClick={onTicketClick}
                      groupBy="personalizada"
                      columnValue={column.id.toString()}
                      selectedTickets={new Set()}
                      onTicketSelect={() => {}}
                      onSelectAll={handleSelectAllCardsInColumn}
                      onDeleteColumn={() => handleDeleteColumn(column.id.toString())}
                      onRenameColumn={(newName) =>
                        handleRenameColumn(column.id.toString(), newName)
                      }
                      onMoveAllCards={() => {}}
                      availableColumns={columns
                        .filter((c) => c.id !== column.id)
                        .map((c) => ({ 
                          id: c.id.toString(), 
                          title: c.nome // Troque 'nome' por 'title' aqui também
                        })) as any}
                    />
                  </div>
                ))}
              </AnimatePresence>

              {/* Add column button / input */}
              <AnimatePresence mode="wait">
                {!isAddingColumn ? (
                  <motion.button
                    key="add-button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    whileHover={{ scale: 1.0 }}
                    onClick={() => setIsAddingColumn(true)}
                    disabled={boardLoading}
                    className="min-w-80 h-fit px-5 py-3 rounded-lg border flex flex-col items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 shrink-0"
                    style={{
                      borderColor: 'rgba(107, 114, 128, 0.3)',
                      color: theme.text.tertiary,
                      backgroundColor: 'rgba(107, 114, 128, 0.08)',
                    }}
                  >
                    <span className="text-sm">+ Nova coluna</span>
                  </motion.button>
                ) : (
                  <motion.div
                    key="input-field"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="min-w-80 h-fit flex flex-col gap-2 shrink-0"
                  >
                    <input
                      ref={columnInputRef}
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateColumn(newColumnName);
                        } else if (e.key === 'Escape') {
                          handleCancelColumnEdit();
                        }
                      }}
                      placeholder="Nome da coluna"
                      className="w-full px-3 py-2 rounded border transition-all duration-200 outline-none text-sm font-medium"
                      style={{
                        backgroundColor: theme.background.card,
                        borderColor: theme.border.primary,
                        color: theme.text.primary,
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCreateColumn(newColumnName)}
                        disabled={!newColumnName.trim() || boardLoading}
                        className="flex-1 px-3 py-2 rounded font-medium text-sm text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: theme.brand.primary,
                        }}
                      >
                        Criar
                      </button>
                      <button
                        onClick={handleCancelColumnEdit}
                        disabled={boardLoading}
                        className="flex-1 px-3 py-2 rounded font-medium text-sm transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          borderColor: theme.border.secondary,
                          color: theme.text.secondary,
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <DragOverlay
              dropAnimation={{
                duration: 250,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              }}
            >
              {activeTicket ? (
                <div
                  style={{
                    transform: 'rotate(2deg) scale(1.03)',
                    opacity: 0.95,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                    borderRadius: '0.5rem',
                    zIndex: 9999,
                  }}
                >
                  <TicketCard chamado={activeTicket} isDragging={true} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <EmptyBoardState
            hasBoard={false}
            boardName=""
            onCreateBoard={() => {}}
            onCreateColumn={() => setIsAddingColumn(true)}
            isLoading={boardLoading}
          />
        )
      ) : (
        // Standard grouping mode (status, priority, etc)
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={baseDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
            <AnimatePresence>
              {groupedTicketsWithDragOver.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  tickets={groupedTicketsWithDragOver.groups[column.id] || []}
                  onTicketClick={onTicketClick}
                  groupBy={groupBy}
                  columnValue={getColumnValue(column.id) || ''}
                  selectedTickets={new Set()}
                  onTicketSelect={() => {}}
                />
              ))}
            </AnimatePresence>
          </div>

          <DragOverlay
            dropAnimation={{
              duration: 250,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}
          >
            {activeTicket ? (
              <div
                style={{
                  transform: 'rotate(2deg) scale(1.03)',
                  opacity: 0.95,
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                  borderRadius: '0.5rem',
                  zIndex: 9999,
                }}
              >
                <TicketCard chamado={activeTicket} isDragging={true} />
              </div>
            ) : null}
          </DragOverlay>

          {tickets.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-12"
            >
              <div style={{ color: theme.text.tertiary }}>
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.background.surface }}
                />
                <h3 className="text-lg font-medium mb-2" style={{ color: theme.text.primary }}>
                  Nenhum chamado encontrado
                </h3>
                <p style={{ color: theme.text.tertiary }}>
                  use os filtros para buscar chamados ou crie um novo.
                </p>
              </div>
            </motion.div>
          )}
        </DndContext>
      )}

      {/* Delete column confirmation modal */}
      <AnimatePresence>
        {deleteConfirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={handleCancelDelete}
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
                Deletar coluna?
              </h3>
              <p className="mb-6 text-sm" style={{ color: theme.text.secondary }}>
                Tem certeza que deseja deletar esta coluna? Caso tenha tickets nesta coluna,
                eles serão movidos para "Tickets sem coluna".
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 rounded font-medium text-sm text-white transition-all"
                  style={{
                    backgroundColor: '#EF4444',
                  }}
                >
                  Deletar
                </button>
                <button
                  onClick={handleCancelDelete}
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

      {/* Create board modal */}
      <CreateBoardModal
        isOpen={isCreateBoardModalOpen}
        onClose={() => setIsCreateBoardModalOpen(false)}
        onSubmit={handleCreateBoard}
        isLoading={boardLoading}
      />
    </motion.div>
  );
}
