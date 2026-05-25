
"use client";
import { useMemo, useCallback, useState } from "react";
import { DndContext, DragOverlay, pointerWithin, rectIntersection } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useTheme } from "../../contexts/ThemeContext";
import { useBoardData } from "../../hooks/useBoardData";
import { useRealtimeBoard } from "../../hooks/useRealtimeBoard";
import { useKanbanGrouping } from "./hooks/useKanbanGrouping";
import { useKanbanDragDrop } from "./hooks/useKanbanDragDrop";
import { useKanbanColumnManagement } from "./hooks/useKanbanColumnManagement";
import { useKanbanFiltering } from "./hooks/useKanbanFiltering";
import { moveTicket as moveTicketService, getColumnValueForGroupBy } from "./services/ticketMovementService";
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

  // handler para selecionar/desselecionar tickets
  const handleSelectTicket = useCallback((ticketId: number, selected: boolean) => {
    setSelectedTickets((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(ticketId);
      } else {
        newSet.delete(ticketId);
      }
      console.log(`📋 [SELECT] Total selecionados: ${newSet.size}`);
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
  } = useBoardData(departamentoId);

  const { groupBy, selectedBoardId, somenteAbertos, allGroupByOptions, handleGroupByChange, setGroupBy, setSomenteAbertos } =
    useKanbanFiltering({ boards, selectBoard });

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
  } = useKanbanColumnManagement({ departamentoId, onRefresh, createColumn, deleteColumn, removeColumnLocal, updateColumn });

  //  dragOverInfo começa null — o grouping base é calculado SEM ele
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
    dragOverInfo: null, // preview é aplicado dentro do hook separadamente via estado
  });

  // expoxto para o DragDrop hook controlar o preview
  const [dragOverInfoState, setDragOverInfoState] = useState<any>(null);

  // grouping COM preview visual (apenas clona o resultado base + reordena)
  const { groupedTickets: groupedWithDrag, ticketsByColumn: ticketsByColumnWithDrag } = useKanbanGrouping({
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
    dragOverInfo: dragOverInfoState,
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
           
      onTicketUpdate?.(ticketId, (prev: Chamado[]) => prev.map((t: Chamado) => 
        t.id === ticketId ? { 
          ...t, 
          kanbanPositions: { groupBy: "personalizada", columnValue: targetColumn, position: newPosition } 
        } : t
      ));

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
          ticketId, targetColumn, newPosition, groupBy,
          columnValue ?? null,
          groupBy === "personalizada" ? selectedBoardId ?? undefined : undefined,
          tickets, statusList, prioridades, departamentos, topicosAjuda, usuarios, onTicketUpdate
        );
       // console.log("Movimentação concluída!");
      } catch (error) {
        console.error("ERRO:", error);
        onRefresh?.();
      }
    },
    [groupBy, selectedBoardId, cards, moveCard, addCardToColumn, onTicketUpdate, onRefresh, tickets, statusList, prioridades, departamentos, topicosAjuda, usuarios]
  );

  // mover todos os cards selecionados para uma coluna
  const handleMoveSelectedCards = useCallback(
    async (targetColumnId: string) => {
      if (selectedTickets.size === 0) {
        toast.error("Nenhum card selecionado");
        return;
      }

      //console.log(`Movendo ${selectedTickets.size} cards selecionados para coluna ${targetColumnId}`);
      
      const selectedTicketsArray = Array.from(selectedTickets);
      
      // mopve em sequência, cada um na primeira posição
      for (let i = 0; i < selectedTicketsArray.length; i++) {
        const ticketId = selectedTicketsArray[i];
        const position = 1000 + i * 100; // Spread them out: 1000, 1100, 1200, etc
        
        try {
          await onMoveTicket(ticketId, targetColumnId, position, "");
        } catch (error) {
          console.error(`ERRO AO MOVER TICKET ${ticketId}:`, error);
        }
      }
      
      // limpar seleção após mover
      setSelectedTickets(new Set());
      toast.success(`${selectedTicketsArray.length} card(s) movido(s)!`);
    },
    [selectedTickets, onMoveTicket]
  );

  const handleCardMovedRealtime = useCallback((data: any) => {

    const isDraggingThisCard = dragOverInfoState?.ticketId === data.chamadoId;
    

    //console.log(`[REALTIME] Atualizando card em tempo real: ${data.chamadoId}`);
    onTicketUpdate?.(data.chamadoId, (prev: Chamado[]) =>
      prev.map((t: Chamado) =>
        t.id !== data.chamadoId ? t : {
          ...t,
          kanbanPositions: { groupBy: data.groupBy || "personalizada", columnValue: data.columnValue?.toString() ?? null, position: data.position },
        }
      )
    );
  }, [onTicketUpdate, dragOverInfoState]);

  const { activeTicket, sensors, handleDragStart, handleDragOver, handleDragEnd } = useKanbanDragDrop({
    tickets,
    groupBy,
    columns: columns as any,
    ticketsByColumn,
    groupedTickets,
    getCustomTicketPosition,
    onMoveTicket,
  });

  // callback externo para atualizar preview durante drag
  const handleDragOverCallback = useCallback(
    (args: any) => {
      handleDragOver(args);
      // setDragOverInfoState é atualizado dentro de handleDragOver
    },
    [handleDragOver]
  );

  const collisionDetection = useCallback((args: any) => {
    const pointerIntersections = pointerWithin(args);
    if (pointerIntersections.length > 0) return pointerIntersections;
    return rectIntersection(args);
  }, []);

  // Realtime handlers
 



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

  // wrapper para abrir modal sem argumentos
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
    if (groupBy === "responsavel") return columnId === "sem-responsavel" ? "sem-responsavel" : columnId;
    return columnId;
  };

  // decide qual snapshot usar para renderizar (com ou sem preview)
  const displayGroupedTickets = dragOverInfoState ? groupedWithDrag : groupedTickets;
  const displayTicketsByColumn = dragOverInfoState ? ticketsByColumnWithDrag : ticketsByColumn;


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
            onDragStart={handleDragStart}
            onDragOver={handleDragOverCallback}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
              <AnimatePresence initial={false}>
                {displayTicketsByColumn["unassigned"]?.length > 0 && (
                  <div key="unassigned">
                    <KanbanColumn
                      id="unassigned"
                      title="Tickets sem coluna"
                      color={theme.border.secondary}
                      tickets={displayTicketsByColumn["unassigned"]}
                      onTicketClick={onTicketClick}
                      groupBy="personalizada"
                      columnValue="unassigned"
                      selectedTickets={selectedTickets}
                      onTicketSelect={handleSelectTicket}
                      onSelectAll={handleSelectAllCardsInColumn}
                      onMoveAllCards={handleMoveSelectedCards}
                      availableColumns={columns.map((col: any) => ({ id: col.id.toString(), nome: col.nome }))}
                      isSpecialColumn={true}
                      dragOverInfo={dragOverInfoState}
                    />
                  </div>
                )}
              </AnimatePresence>

              {columns.map((column: any) => (
                <div key={column.id}>
                  <KanbanColumn
                    id={column.id.toString()}
                    title={column.nome}
                    color={theme.brand.primary}
                    tickets={displayTicketsByColumn[column.id.toString()] ?? []}
                    onTicketClick={onTicketClick}
                    groupBy="personalizada"
                    columnValue={column.id.toString()}
                    selectedTickets={selectedTickets}
                    onTicketSelect={handleSelectTicket}
                    onSelectAll={handleSelectAllCardsInColumn}
                    onDeleteColumn={() => handleDeleteColumn(column.id.toString())}
                    onRenameColumn={(newName: string) => handleRenameColumn(column.id.toString(), newName)}
                    onMoveAllCards={handleMoveSelectedCards}
                    dragOverInfo={dragOverInfoState}
                    availableColumns={columns
                      .filter((c: any) => c.id !== column.id)
                      .map((c: any) => ({ id: c.id.toString(), nome: c.nome }))}
                  />
                </div>
              ))}

              {/* bt / input nova coluna */}
              <AnimatePresence mode="wait" initial={false}>
                {!isAddingColumn ? (
                  <motion.button
                    key="add-button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setIsAddingColumn(true)}
                    disabled={boardLoading}
                    className="min-w-80 h-fit px-5 py-3 rounded-lg border flex flex-col items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 shrink-0"
                    style={{
                      borderColor: "rgba(107,114,128,0.3)",
                      color: theme.text.tertiary,
                      backgroundColor: "rgba(107,114,128,0.08)",
                    }}
                  >
                    <span className="text-sm">Nova coluna</span>
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
                        if (e.key === "Enter") handleCreateColumn(newColumnName);
                        else if (e.key === "Escape") handleCancelColumnEdit();
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
                        style={{ backgroundColor: theme.brand.primary }}
                      >
                        Criar
                      </button>
                      <button
                        onClick={handleCancelColumnEdit}
                        disabled={boardLoading}
                        className="flex-1 px-3 py-2 rounded font-medium text-sm transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderColor: theme.border.secondary, color: theme.text.secondary }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
              {activeTicket && (
                <div style={{ transform: "rotate(2deg) scale(1.03)", opacity: 0.95, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", borderRadius: "0.5rem", zIndex: 9999 }}>
                  <TicketCard chamado={activeTicket} isDragging={true} onSelect={() => {}} isSelected={false} />
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
              {displayGroupedTickets.columns.map((column: any) => (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  tickets={displayGroupedTickets.groups[column.id] ?? []}
                  onTicketClick={onTicketClick}
                  groupBy={groupBy}
                  columnValue={getColumnValue(column.id)}
                  selectedTickets={selectedTickets}
                  onTicketSelect={handleSelectTicket}
                  dragOverInfo={dragOverInfoState}
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
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.background.surface }}>
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: theme.text.primary }}>Nenhum chamado encontrado</h3>
                <p style={{ color: theme.text.tertiary }}>Use os filtros para buscar chamados ou crie um novo.</p>
              </div>
            </motion.div>
          )}

          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
            {activeTicket && (
              <div style={{ transform: "rotate(2deg) scale(1.03)", opacity: 0.95, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", borderRadius: "0.5rem", zIndex: 9999 }}>
                <TicketCard chamado={activeTicket} isDragging={true} onSelect={() => {}} isSelected={false} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* modal confirmar delete coluna */}
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
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Deletar coluna?</h3>
              <p className="mb-6 text-sm" style={{ color: theme.text.secondary }}>
                Tem certeza que deseja deletar esta coluna? Caso tenha tickets nesta coluna, eles serão movidos para Tickets sem coluna.
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
                  style={{ borderColor: theme.border.secondary, color: theme.text.secondary }}
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
