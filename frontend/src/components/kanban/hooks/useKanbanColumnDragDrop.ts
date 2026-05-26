import { useCallback, useState, useEffect } from "react";
import { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import type { KanbanColumn } from "../utils/kanbanTypes";
import toast from "react-hot-toast";

interface UseKanbanColumnDragDropProps {
  columns: KanbanColumn[];
  boardId?: number;
  onReorderColumns: (columnIds: number[]) => Promise<void>;
}

export function useKanbanColumnDragDrop({
  columns,
  boardId,
  onReorderColumns,
}: UseKanbanColumnDragDropProps) {
  const [activeColumnId, setActiveColumnId] = useState<number | null>(null);

  // Ordem inicial das colunas baseada em `ordem`
  const [columnOrder, setColumnOrder] = useState<number[]>(() =>
    columns
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .map((c) => c.id)
  );

  // Atualizar columnOrder quando as colunas mudam (por exemplo, vindo do backend)
  useEffect(() => {
    const newOrder = columns
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .map((c) => c.id);

    setColumnOrder(newOrder);
  }, [columns]);

const handleDragStartColumn = useCallback((event: DragStartEvent) => {
  const columnId = Number(event.active.id);

  setActiveColumnId(columnId);
}, []);

  const handleDragOverColumn = useCallback((event: DragOverEvent) => {
  const { active, over } = event;
  if (!over) return;

  const activeId = Number(active.id);
  const overId = Number(over.id);


  if (activeId === overId) return;

  setColumnOrder((prevOrder) => {
    const activeIndex = prevOrder.indexOf(activeId);
    const overIndex = prevOrder.indexOf(overId);

    console.log("COLUMN indices:", { prevOrder, activeIndex, overIndex });

    if (activeIndex === -1 || overIndex === -1) return prevOrder;

    const newOrder = Array.from(prevOrder);
    newOrder.splice(activeIndex, 1);
    newOrder.splice(overIndex, 0, activeId);

    console.log("📍 [COLUMN DRAGOVER] Nova ordem:", newOrder);
    return newOrder;
  });
}, []);

  const handleDragEndColumn = useCallback(
  async (event: DragEndEvent) => {
    const { active } = event;
    const columnId = Number(active.id);

    setActiveColumnId(null);

    try {
      console.log("✅ [COLUMN DROP] Finalizando reorder:", columnOrder);
      await onReorderColumns(columnOrder);
    } catch (error) {
      console.error("❌ Erro ao reordenar colunas:", error);
      setColumnOrder(
        columns
          .slice()
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
          .map((c) => c.id)
      );
    }
  },
  [columnOrder, columns, onReorderColumns]
);
  return {
    activeColumnId,
    columnOrder,
    handleDragStartColumn,
    handleDragOverColumn,
    handleDragEndColumn,
  };
}