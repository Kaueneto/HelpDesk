import { useCallback, useState } from "react";
import {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Chamado, DragOverInfo, UseKanbanDragDropReturn, KanbanColumn } from "../utils/kanbanTypes";
import { calcPositionBetweenTickets, getPositionForGroupBy } from "../utils/kanbanPositionCalculator";

interface UseKanbanDragDropProps {
  tickets: Chamado[];
  groupBy: string;
  columns: KanbanColumn[];
  ticketsByColumn: Record<string, Chamado[]>;
  groupedTickets: any;
  getCustomTicketPosition?: (ticket: Chamado) => number;
  onMoveTicket: (ticketId: number, targetColumn: string, newPosition: number, fromColumnId: string) => Promise<void>;
  onDragOverInfo?: (info: DragOverInfo | null) => void;
}

export function useKanbanDragDrop({
  tickets,
  groupBy,
  columns,
  ticketsByColumn,
  groupedTickets,
  getCustomTicketPosition,
  onMoveTicket,
  onDragOverInfo,
}: UseKanbanDragDropProps): UseKanbanDragDropReturn {
  const [activeTicket, setActiveTicket] = useState<Chamado | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<DragOverInfo | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateDragOverInfo = useCallback(
    (info: DragOverInfo | null) => {
      setDragOverInfo(info);
      onDragOverInfo?.(info);
    },
    [onDragOverInfo]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const ticket = tickets.find((t) => t.id === Number(event.active.id));
      setActiveTicket(ticket ?? null);
      updateDragOverInfo(null);
    },
    [tickets, updateDragOverInfo]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) { 
            updateDragOverInfo(null); 
        return; 
      }

      const activeId = Number(active.id);
      const overId = over.id;
      if (activeId === Number(overId)) {
        return;
      }

      const overData = over.data.current as any;
      let targetColumnId: string | null = null;
      let overIndex: number = 0;
      let insertPosition: "above" | "below" = "below";

      console.log(`📍 [DRAGOVER] Detecção:`, {
        activeId,
        overId,
        overType: overData?.type,
        containerId: overData?.sortable?.containerId,
        columnValue: overData?.columnValue,
      });

      if (overData?.type === "column") {
        // Hovering sobre a zona vazia da coluna
        targetColumnId = String(overId);
        overIndex = 0;
        insertPosition = "above";
      } else if (overData?.sortable) {
        // Hovering sobre um card — CORRIGIDO: não usar containerId, procurar em qual coluna o card está
        const overTicketId = Number(overId);
        
        // Procurar em qual coluna está esse ticket no ticketsByColumn
        let foundInColumn: string | null = null;
        let foundIndex: number = 0;
        
        for (const [colId, tickets] of Object.entries(ticketsByColumn)) {
          const idx = (tickets as any[]).findIndex((t) => t.id === overTicketId);
          if (idx !== -1) {
            foundInColumn = colId;
            foundIndex = idx;
            break;
          }
        }

        if (foundInColumn) {
          targetColumnId = foundInColumn;
          overIndex = foundIndex;
          
          // determinar se coloca acima ou abaixo baseado em delta.y
          const deltaY = event.delta.y ?? 0;
          if (Math.abs(deltaY) > 2) {
            insertPosition = deltaY < 0 ? "above" : "below";
          } else {
            insertPosition = "below";
          }
        } else {
        }
      } else if (overData?.columnValue !== undefined) {
        // fllback para columnValue (alguns componentes podem usar isso)
        targetColumnId = String(overData.columnValue);
        overIndex = 0;
        insertPosition = "above";
      }

      if (targetColumnId) {
        const dragInfo = { 
          ticketId: activeId, 
          targetColumn: targetColumnId, 
          overId,
          overIndex,
          insertPosition,
        };
        updateDragOverInfo(dragInfo);
      } else {
      }
    },
    [updateDragOverInfo, ticketsByColumn]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      // nao limpar dragOverInfo ainda — manter visual fluido enquanto requisição processa
      const { active, over } = event;
      setActiveTicket(null);

      if (!over || active.id === over.id) {
        // se cancelou o drag, limpar imediatamente
        updateDragOverInfo(null);
        return;
      }

      const ticketId = Number(active.id);
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) {
        updateDragOverInfo(null);
        return;
      }

      const fromColumnId =
        groupBy === "personalizada"
          ? Object.keys(ticketsByColumn).find((colId) =>
              ticketsByColumn[colId].some((t) => t.id === ticketId)
            ) ?? ""
          : Object.keys(groupedTickets.groups).find((colId) =>
              (groupedTickets.groups[colId] as Chamado[]).some((t) => t.id === ticketId)
            ) ?? "";

      // ---------MODO PERSONALIZADA ---------------------------------------------------
      if (groupBy === "personalizada") {
        let targetColumnId: string | null = null;
        let newPosition = 1000;

        const isValidColumn =
          over.id === "unassigned" || columns.some((col) => col.id.toString() === over.id);

        if (isValidColumn) {
          // solto no container da coluna — vai para o final da lista
          targetColumnId = over.id as string;
          const allColumnTickets = ticketsByColumn[targetColumnId] ?? [];
          const columnTicketsWithoutActive = allColumnTickets.filter((t) => t.id !== ticketId);

          if (columnTicketsWithoutActive.length === 0) {
            newPosition = 1000;
          } else {
            const lastTicket = columnTicketsWithoutActive[columnTicketsWithoutActive.length - 1];
            const lastPos = getCustomTicketPosition
              ? getCustomTicketPosition(lastTicket)
              : getPositionForGroupBy(lastTicket.kanbanPositions, groupBy);
            newPosition = (lastPos !== 999999 ? lastPos : columnTicketsWithoutActive.length * 1000) + 1000;
          }
        } else {
          // solto sobre outro ticket — encontra a coluna e calcula a posição entre vizinhos
          let found = false;

          for (const col of columns) {
            const colId = col.id.toString();
            // array ORIGINAL (inclui o ativo) — necessário para calcPositionBetweenTickets
            // determinar corretamente isMovingDown (cima ou baixo)
            const allColumnTickets = ticketsByColumn[colId] ?? [];
            const overIndexInOriginal = allColumnTickets.findIndex((t) => t.id === Number(over.id));

            if (overIndexInOriginal !== -1) {
              targetColumnId = colId;
              newPosition = calcPositionBetweenTickets(
                allColumnTickets,     
                overIndexInOriginal,   
                groupBy,
                ticketId,
                getCustomTicketPosition
              );
              found = true;
              break;
            }
          }

          // verifica coluna unassigned
          if (!found) {
            const allUnassigned = ticketsByColumn["unassigned"] ?? [];
            const overIndexInOriginal = allUnassigned.findIndex((t) => t.id === Number(over.id));

            if (overIndexInOriginal !== -1) {
              targetColumnId = "unassigned";
              newPosition = calcPositionBetweenTickets(
                allUnassigned,
                overIndexInOriginal,
                groupBy,
                ticketId,
                getCustomTicketPosition
              );
              found = true;
            }
          }

          if (!found) {
            updateDragOverInfo(null);
            return;
          }
        }

        if (!targetColumnId) {
          updateDragOverInfo(null);
          return;
        }
        
        // manter dragOverInfo e executar move SEM bloquear visual
        try {
          await onMoveTicket(ticketId, targetColumnId, newPosition, fromColumnId);
        } finally {
          // limpar APÓS confirmação do servidor
          updateDragOverInfo(null);
        }
        return;
      }

      // ---------------MODO PADRAO--------------------------------
      let targetColumnId: string | null = null;
      let newPosition = 1000;

      const isValidColumn = groupedTickets.columns.some((col: any) => col.id === over.id);

      if (isValidColumn) {
        // solto no container da coluna — vai para o final
        targetColumnId = over.id as string;
        const allColumnTickets = (groupedTickets.groups[targetColumnId] ?? []) as Chamado[];
        const columnTicketsWithoutActive = allColumnTickets.filter((t) => t.id !== ticketId);

        if (columnTicketsWithoutActive.length === 0) {
          newPosition = 1000;
        } else {
          const lastTicket = columnTicketsWithoutActive[columnTicketsWithoutActive.length - 1];
          const lastPos = getPositionForGroupBy(lastTicket.kanbanPositions, groupBy);
          newPosition = (lastPos !== 999999 ? lastPos : columnTicketsWithoutActive.length * 1000) + 1000;
        }
      } else {
        // solto sobre outro ticket
        let found = false;

        for (const columnId of Object.keys(groupedTickets.groups)) {
          // array original para cálculo correto de isMovingDown
          const allColumnTickets = groupedTickets.groups[columnId] as Chamado[];
          const overIndexInOriginal = allColumnTickets.findIndex((t) => t.id === Number(over.id));

          if (overIndexInOriginal !== -1) {
            targetColumnId = columnId;
            newPosition = calcPositionBetweenTickets(
              allColumnTickets,
              overIndexInOriginal,
              groupBy,
              ticketId
            );
            found = true;
            break;
          }
        }

        if (!found) return;
      }

      if (!targetColumnId) return;
      await onMoveTicket(ticketId, targetColumnId, newPosition, fromColumnId);
    },
    [tickets, groupBy, columns, ticketsByColumn, groupedTickets, getCustomTicketPosition, onMoveTicket, updateDragOverInfo]
  );

  return { activeTicket, dragOverInfo, sensors, handleDragStart, handleDragOver, handleDragEnd };
}