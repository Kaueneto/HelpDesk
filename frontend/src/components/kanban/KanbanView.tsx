"use client";

import { useMemo, useCallback, useState } from "react";
import { DndContext, DragOverlay, pointerWithin, rectIntersection } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useTheme } from "../../contexts/ThemeContext";
import { useBoardData } from "../../hooks/useBoardData";
import { useRealtimeBoard } from "../../hooks/useRealtimeBoard";
import { useKanbanGrouping } from "./hooks/useKanbanGrouping";
import { useKanbanDragDrop } from "./hooks/useKanbanDragDrop";
import { useKanbanColumnDragDrop } from "./hooks/useKanbanColumnDragDrop";
import { useKanbanColumnManagement } from "./hooks/useKanbanColumnManagement";
import { useKanbanFiltering } from "./hooks/useKanbanFiltering";
import {
  moveTicket as moveTicketService,
  getColumnValueForGroupBy,
} from "./services/ticketMovementService";
import KanbanColumn from "./KanbanColumn";
import TicketCard from "./TicketCard";
import CreateBoardModal from "./CreateBoardModal";
import EmptyBoardState from "./EmptyBoardState";
import KanbanHeader from "./components/KanbanHeader";
import type { Chamado, KanbanViewProps } from "./utils/kanbanTypes";

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
  const [selectedTickets, setSelectedTickets] = useState<Set<number>>(new Set());

  const handleSelectTicket = useCallback((ticketId: number, selected: boolean) => {
    setSelectedTickets((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(ticketId);
      } else {
        newSet.delete(ticketId);
      }
      return newSet;
    });
  }, []);

  const {
    boards,
    selectedBoard,
    columns,
    cards,
    loading: boardLoading,
    selectBoard,
    createBoard,
    createColumn,
    updateColumn,
    deleteColumn,
    addCardToColumn,
    moveCard,
    removeColumnLocal,
    reorderColumns,
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
  } = useKanbanColumnManagement({
    departamentoId,
    onRefresh,
    createColumn,
    deleteColumn,
    removeColumnLocal,
    updateColumn,
  });

  const {
    activeColumnId,
    columnOrder,
    handleDragStartColumn,
    handleDragOverColumn,
    handleDragEndColumn,
  } = useKanbanColumnDragDrop({
    columns: columns as any,
    boardId: selectedBoard?.id,
    onReorderColumns: reorderColumns,
  });

  const getCustomTicketPosition = useCallback(
    (ticket: Chamado) => {
      const card = cards.find((c: any) => (c as any).idChamado === ticket.id);
      return card ? Number((card as any).posicao) : 999999;
    },
    [cards]
  );

  const onMoveTicket = useCallback(
    async (ticketId: number, targetColumn: string, newPosition: number, fromColumnId: string) => {
      onTicketUpdate?.(ticketId, (prev: Chamado[]) =>
        prev.map((t: Chamado) =>
          t.id === ticketId
            ? {
                ...t,
                kanbanPositions: {
                  groupBy: "personalizada",
                  columnValue: targetColumn,
                  position: newPosition,
                },
              }
            : t
        )
      );

      try {
        const columnValue = getColumnValueForGroupBy(targetColumn, groupBy);

        if (groupBy === "personalizada" && selectedBoardId) {
          const existingCard = cards.find((c) => (c as any).idChamado === ticketId);
          const targetColumnId = targetColumn === "unassigned" ? null : Number(targetColumn);

          if (existingCard) {
            await moveCard((existingCard as any).id, targetColumnId, newPosition);
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
          groupBy === "personalizada" ? selectedBoardId ?? undefined : undefined,
          tickets,
          statusList,
          prioridades,
          departamentos,
          topicosAjuda,
          usuarios,
          onTicketUpdate
        );
      } catch (error) {
        console.error("ERRO:", error);
        onRefresh?.();
      }
    },
    [
      groupBy,
      selectedBoardId,
      cards,
      moveCard,
      addCardToColumn,
      onTicketUpdate,
      onRefresh,
      tickets,
      statusList,
      prioridades,
      departamentos,
      topicosAjuda,
      usuarios,
    ]
  );

  const { groupedTickets, ticketsByColumn } = useKanbanGrouping({
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

  const { activeTicket, dragOverInfo, sensors, handleDragStart, handleDragOver, handleDragEnd } =
    useKanbanDragDrop({
      tickets,
      groupBy,
      columns: columns as any,
      ticketsByColumn,
      groupedTickets,
      getCustomTicketPosition,
      onMoveTicket,
    });

  const handleMoveSelectedCards = useCallback(
    async (targetColumnId: string) => {
      if (selectedTickets.size === 0) {
        toast.error("Nenhum card selecionado");
        return;
      }

      const selectedTicketsArray = Array.from(selectedTickets);

      for (let i = 0; i < selectedTicketsArray.length; i++) {
        const ticketId = selectedTicketsArray[i];
        const position = 1000 + i * 100;

        try {
          await onMoveTicket(ticketId, targetColumnId, position, "");
        } catch (error) {
          console.error(`ERRO AO MOVER TICKET ${ticketId}:`, error);
        }
      }

      setSelectedTickets(new Set());
      toast.success(`${selectedTicketsArray.length} card(s) movido(s)!`);
    },
    [selectedTickets, onMoveTicket]
  );

  const handleCardMovedRealtime = useCallback(
    (data: any) => {
      if (!data.fromServer) return;

      onTicketUpdate?.(data.chamadoId, (prev: Chamado[]) =>
        prev.map((t: Chamado) =>
          t.id !== data.chamadoId
            ? t
            : {
                ...t,
                kanbanPositions: {
                  groupBy: data.groupBy || "personalizada",
                  columnValue: data.columnValue?.toString() ?? null,
                  position: data.position,
                },
              }
        )
      );
    },
    [onTicketUpdate]
  );

  const handleDragOverCallback = useCallback(
    (args: any) => {
      handleDragOver(args);
    },
    [handleDragOver]
  );

  const combinedHandleDragStart = useCallback(
    (event: any) => {
      const isColumn = event.active.data?.current?.type === "column";
      if (isColumn) {
        handleDragStartColumn(event);
      } else {
        handleDragStart(event);
      }
    },
    [handleDragStart, handleDragStartColumn]
  );

  const combinedHandleDragOver = useCallback(
    (event: any) => {
      const isColumn = event.active.data?.current?.type === "column";
      if (isColumn) {
        handleDragOverColumn(event);
      } else {
        handleDragOverCallback(event);
      }
    },
    [handleDragOverCallback, handleDragOverColumn]
  );

  const combinedHandleDragEnd = useCallback(
    (event: any) => {
      const isColumn = event.active.data?.current?.type === "column";
      if (isColumn) {
        handleDragEndColumn(event);
      } else {
        handleDragEnd(event);
      }
    },
    [handleDragEnd, handleDragEndColumn]
  );

  const collisionDetection = useCallback((args: any) => {
    const pointerIntersections = pointerWithin(args);
    if (pointerIntersections.length > 0) return pointerIntersections;
    return rectIntersection(args);
  }, []);

  const handleColumnCreatedRealtime = useCallback(() => {
    if (groupBy === "personalizada" && selectedBoardId) onRefresh?.();
  }, [groupBy, selectedBoardId, onRefresh]);

  const handleColumnDeletedRealtime = useCallback(
    (columnId: number) => {
      if (groupBy === "personalizada" && selectedBoardId) removeColumnLocal(columnId);
    },
    [groupBy, selectedBoardId, removeColumnLocal]
  );

  useRealtimeBoard({
    boardId: groupBy === "personalizada" ? selectedBoardId : null,
    enabled: groupBy === "personalizada",
    onCardMoved: handleCardMovedRealtime,
    onColumnCreated: handleColumnCreatedRealtime,
    onColumnDeleted: handleColumnDeletedRealtime,
  });

  const handleCreateBoard = useCallback(
    async (nome: string) => {
      const newBoard = await createBoard(nome, departamentoId);
      if (newBoard) {
        setGroupBy("personalizada");
        localStorage.setItem("kanbanGroupBy", "personalizada");
        localStorage.setItem("kanbanSelectedBoard", newBoard.id.toString());
        await selectBoard(newBoard.id);
      }
    },
    [createBoard, selectBoard, departamentoId, setGroupBy]
  );

  const handleOpenCreateBoardModal = useCallback(() => {
    setIsCreateBoardModalOpen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      if (onRefresh) await onRefresh();
      toast.success("Chamados recarregados!");
    } catch {
      toast.error("Erro ao recarregar chamados");
    }
  }, [onRefresh]);

  const handleSelectAllCardsInColumn = useCallback((ticketIds: number[]) => {
    setSelectedTickets((prev) => {
      const newSet = new Set(prev);
      ticketIds.forEach((id) => {
        newSet.add(id);
      });
      return newSet;
    });

    toast.success(`${ticketIds.length} card(s) selecionado(s)!`);
  }, []);

  const getColumnValue = (columnId: string): string => {
    if (groupBy === "responsavel")
      return columnId === "sem-responsavel" ? "sem-responsavel" : columnId;
    return columnId;
  };

  const sortedColumns = useMemo(() => {
    if (groupBy !== "personalizada" || !selectedBoard) return columns;

    const columnMap = new Map(columns.map((col) => [col.id, col]));
    return columnOrder
      .map((id) => columnMap.get(id))
      .filter((col) => col !== undefined) as typeof columns;
  }, [columns, columnOrder, groupBy, selectedBoard]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
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

      {groupBy === "personalizada" ? (
        selectedBoard ? (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={combinedHandleDragStart}
            onDragOver={combinedHandleDragOver}
            onDragEnd={combinedHandleDragEnd}
          >
            <SortableContext
              items={sortedColumns.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
                <AnimatePresence initial={false}>
                  {ticketsByColumn["unassigned"]?.length > 0 && (
                    <div key="unassigned">
                      <KanbanColumn
                        id="unassigned"
                        title="Tickets sem coluna"
                        color={theme.border.secondary}
                        tickets={ticketsByColumn["unassigned"]}
                        onTicketClick={onTicketClick}
                        groupBy="personalizada"
                        columnValue="unassigned"
                        selectedTickets={selectedTickets}
                        onTicketSelect={handleSelectTicket}
                        onSelectAll={handleSelectAllCardsInColumn}
                        onMoveAllCards={handleMoveSelectedCards}
                        availableColumns={sortedColumns.map((col: any) => ({
                          id: col.id.toString(),
                          nome: col.nome,
                        }))}
                        isSpecialColumn={true}
                        dragOverInfo={dragOverInfo}
                      />
                    </div>
                  )}
                </AnimatePresence>

                {sortedColumns.map((column: any) => (
                  <div key={column.id}>
                    <KanbanColumn
                      id={column.id.toString()}
                      title={column.nome}
                      color={theme.brand.primary}
                      tickets={ticketsByColumn[column.id.toString()] ?? []}
                      onTicketClick={onTicketClick}
                      groupBy="personalizada"
                      columnValue={column.id.toString()}
                      selectedTickets={selectedTickets}
                      onTicketSelect={handleSelectTicket}
                      onSelectAll={handleSelectAllCardsInColumn}
                      onDeleteColumn={() => handleDeleteColumn(column.id.toString())}
                      onRenameColumn={(newName: string) =>
                        handleRenameColumn(column.id.toString(), newName)
                      }
                      onMoveAllCards={handleMoveSelectedCards}
                      dragOverInfo={dragOverInfo}
                      availableColumns={sortedColumns
                        .filter((c: any) => c.id !== column.id)
                        .map((c: any) => ({ id: c.id.toString(), nome: c.nome }))}
                      columnId={column.id}
                      isColumnDragging={activeColumnId === column.id}
                    />
                  </div>
                ))}

                {!isAddingColumn ? (
                  <button
                    onClick={() => setIsAddingColumn(true)}
                    disabled={boardLoading}
                    className="
                      min-w-80
                      h-fit
                      px-4
                      py-3
                      rounded-2xl
                      flex
                      items-center
                      gap-2
                      font-medium
                      transition-all
                      duration-200
                      shrink-0
                      backdrop-blur-sm
                      hover:scale-[1.01]
                      active:scale-[0.99]
                    "
                    style={{
                      background: `linear-gradient(
                        180deg,
                        ${(theme.background as any).card },
                        ${theme.background.card}
                      )`,
                      border: `1px solid ${theme.background.hover}`,
                      color: theme.text.secondary,
                      boxShadow: `0 4px 12px rgba(0,0,0,0.12)`,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: theme.background.card,
                        border: `1px solid ${theme.background.hover}`,
                      }}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>

                    <span className="text-sm font-semibold tracking-wide">
                      Adicionar coluna
                    </span>
                  </button>
                ) : (
                  <div
                    className="
                      min-w-80
                      h-fit
                      rounded-2xl
                      p-2
                      shrink-0
                      backdrop-blur-sm
                      transition-all
                    "
                    style={{
                      backgroundColor: theme.background.card,
                      border: `1px solid ${theme.background.hover}`,

                    }}
                  >
                    <input
                      ref={columnInputRef}
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateColumn(newColumnName);
                        else if (e.key === "Escape") handleCancelColumnEdit();
                      }}
                      placeholder="Nome da coluna..."
                      className="
                        w-full
                        px-3
                        py-2.5
                        rounded-xl
                        outline-none
                        text-sm
                        font-medium
                        transition-all
                      "
                      style={{
                        backgroundColor: theme.background.card,
                        color: theme.text.primary,
                        border: `1px solid ${theme.background.hover}`,
                      }}
                      onBlur={() => {
                        if (newColumnName.trim()) return;
                        handleCancelColumnEdit();
                      }}
                    />
                  </div>
                )}
              </div>
            </SortableContext>

            <DragOverlay
              dropAnimation={{
                duration: 200,
                easing: "cubic-bezier(0.18,0.67,0.6,1.22)",
              }}
            >
              {activeTicket && (
                <div
                  style={{
                    transform: "rotate(2deg) scale(1.03)",
                    opacity: 0.95,
                    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
                    borderRadius: "0.5rem",
                    zIndex: 9999,
                  }}
                >
                  <TicketCard
                    chamado={activeTicket}
                    isDragging={true}
                    onSelect={() => {}}
                    isSelected={false}
                  />
                </div>
              )}
              {activeColumnId && (
                <div
                  style={{
                    transform: "scale(1.02) rotate(1deg)",
                    opacity: 0.9,
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                    borderRadius: "0.5rem",
                    zIndex: 9999,
                    backgroundColor: theme.kanban.columnBg,
                    border: `1px solid ${theme.kanban.columnBorder}`,
                    width: "320px",
                    height: "400px",
                    padding: "16px",
                  }}
                >
                  <div style={{ color: theme.text.secondary }}>Reordenando coluna...</div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <EmptyBoardState
            hasBoard={false}
            boardName=""
            onCreateBoard={handleOpenCreateBoardModal}
            onCreateColumn={() => setIsAddingColumn(true)}
            isLoading={boardLoading}
          />
        )
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOverCallback}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
            <AnimatePresence initial={false}>
              {groupedTickets.columns.map((column: any) => (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  tickets={groupedTickets.groups[column.id] ?? []}
                  onTicketClick={onTicketClick}
                  groupBy={groupBy}
                  columnValue={getColumnValue(column.id)}
                  selectedTickets={selectedTickets}
                  onTicketSelect={handleSelectTicket}
                  dragOverInfo={dragOverInfo}
                />
              ))}
            </AnimatePresence>
          </div>

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
                <h3
                  className="text-lg font-medium mb-2"
                  style={{ color: theme.text.primary }}
                >
                  Nenhum chamado encontrado
                </h3>
                <p style={{ color: theme.text.tertiary }}>
                  Use os filtros para buscar chamados ou crie um novo.
                </p>
              </div>
            </motion.div>
          )}

          <DragOverlay
            dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}
          >
            {activeTicket && (
              <div
                style={{
                  transform: "rotate(2deg) scale(1.03)",
                  opacity: 0.95,
                  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
                  borderRadius: "0.5rem",
                  zIndex: 9999,
                }}
              >
                <TicketCard
                  chamado={activeTicket}
                  isDragging={true}
                  onSelect={() => {}}
                  isSelected={false}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <AnimatePresence>
        {deleteConfirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
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
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: theme.text.primary }}
              >
                Deletar coluna?
              </h3>
              <p className="mb-6 text-sm" style={{ color: theme.text.secondary }}>
                Tem certeza que deseja deletar esta coluna? Caso tenha tickets nesta
                coluna, eles serão movidos para Tickets sem coluna.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 rounded font-medium text-sm text-white transition-all"
                  style={{ backgroundColor: "#EF4444" }}
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

      <CreateBoardModal
        isOpen={isCreateBoardModalOpen}
        onClose={() => setIsCreateBoardModalOpen(false)}
        onSubmit={handleCreateBoard}
        isLoading={boardLoading}
      />
    </motion.div>
  );
}