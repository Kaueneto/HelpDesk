
import { useCallback, useState } from 'react';
import {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import toast from 'react-hot-toast';
import type { Chamado, DragOverInfo, UseKanbanDragDropReturn, KanbanColumn } from '../utils/kanbanTypes';


import {
  calcPositionBetweenTickets,
  getPositionForGroupBy,
} from '../utils/kanbanPositionCalculator';

interface UseKanbanDragDropProps {
  tickets: Chamado[];
  groupBy: string;
  columns: KanbanColumn[];
  ticketsByColumn: Record<string, Chamado[]>;
  groupedTickets: any;
  getCustomTicketPosition?: (ticket: Chamado) => number;
  onMoveTicket: (
    ticketId: number,
    targetColumn: string,
    newPosition: number,
    fromColumnId: string
  ) => Promise<void>;
}

export function useKanbanDragDrop({
  tickets,
  groupBy,
  columns,
  ticketsByColumn,
  groupedTickets,
  getCustomTicketPosition,
  onMoveTicket,
}: UseKanbanDragDropProps): UseKanbanDragDropReturn {
  const [activeTicket, setActiveTicket] = useState<Chamado | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<DragOverInfo | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const ticket = tickets.find((t) => t.id === Number(active.id));
    setActiveTicket(ticket || null);
    setDragOverInfo(null);
  }, [tickets]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      setDragOverInfo(null);
      return;
    }

    const activeId = Number(active.id);
    const overId = over.id;

    if (activeId === overId) return;

    let targetColumnId: string | null = null;
    const overData = over.data.current as any;

    if (overData?.type === 'column') {
      targetColumnId = String(overId);
    } else if (overData?.sortable?.containerId) {
      targetColumnId = String(overData.sortable.containerId);
    } else if (overData?.columnValue !== undefined) {
      targetColumnId = String(overData.columnValue);
    }

    if (targetColumnId) {
      setDragOverInfo({
        ticketId: activeId,
        targetColumn: targetColumnId,
        overId,
      });
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDragOverInfo(null);

      const { active, over } = event;
      setActiveTicket(null);

      if (!over) {
        console.warn('⚠️ DROP WITHOUT VALID ZONE');
        return;
      }

      const ticketId = Number(active.id);
      const ticket = tickets.find((t) => t.id === ticketId);

      if (!ticket) {
        console.warn('⚠️ TICKET NAO ENCONTRADO:', ticketId);
        return;
      }

      if (groupBy === 'personalizada') {
        let targetColumnId: string | null = null;
        let newPosition: number = 1000;

        const isValidColumn =
          over.id === 'unassigned' || columns.some((col) => col.id.toString() === over.id);

        if (isValidColumn) {
          targetColumnId = over.id as string;
          const columnTickets = ticketsByColumn[targetColumnId] || [];
          const filteredTickets = columnTickets.filter((t) => t.id !== ticketId);

          if (filteredTickets.length === 0) {
            newPosition = 1000;
          } else {
            const lastTicket = filteredTickets[filteredTickets.length - 1];
            const lastPos = getCustomTicketPosition
              ? getCustomTicketPosition(lastTicket)
              : getPositionForGroupBy(lastTicket.kanbanPositions, groupBy);
            const lastPositionValue =
              lastPos !== 999999 ? lastPos : filteredTickets.length * 1000;
            newPosition = lastPositionValue + 1000;
          }
        } else {
          let foundTicket = false;

          for (const col of columns as KanbanColumn[]) {
            const colId = col.id.toString();
            const columnTickets = ticketsByColumn[colId] || [];
const targetIndex = columnTickets.findIndex((t: Chamado) => t.id === over.id);
            if (targetIndex !== -1) {
              targetColumnId = colId;
              newPosition = calcPositionBetweenTickets(
                columnTickets,
                targetIndex,
                groupBy,
                ticketId,
                getCustomTicketPosition
              );
              foundTicket = true;
              break;
            }
          }

          if (!foundTicket) {
            const unassignedTickets = ticketsByColumn['unassigned'] || [];
            const targetIndex = unassignedTickets.findIndex((t: Chamado) => t.id === over.id);

            if (targetIndex !== -1) {
              targetColumnId = 'unassigned';
              newPosition = calcPositionBetweenTickets(
                unassignedTickets,
                targetIndex,
                groupBy,
                ticketId,
                getCustomTicketPosition
              );
              foundTicket = true;
            }
          }

          if (!foundTicket) {
            console.warn('⚠️ Target ticket not found:', over.id);
            return;
          }
        }

        if (!targetColumnId) return;
        await onMoveTicket(ticketId, targetColumnId, newPosition, '');
        return;
      }

      let targetColumnId: string | null = null;
      let newPosition: number = 1000;

      const isValidColumn = groupedTickets.columns.some((col: any) => col.id === over.id);
      if (isValidColumn) {
        targetColumnId = over.id as string;
        const columnTickets = groupedTickets.groups[targetColumnId] || [];
        const filteredTickets = columnTickets.filter((t: Chamado) => t.id !== ticketId);

        if (filteredTickets.length === 0) {
          newPosition = 1000;
        } else {
          const lastTicket = filteredTickets[filteredTickets.length - 1];
          const lastPos = getPositionForGroupBy(lastTicket.kanbanPositions, groupBy);
          const lastPositionValue =
            lastPos !== 999999 ? lastPos : filteredTickets.length * 1000;
          newPosition = lastPositionValue + 1000;
        }
      } else {
        let foundTicket = false;

        for (const columnId of Object.keys(groupedTickets.groups)) {
          const columnTickets = groupedTickets.groups[columnId];
          const targetIndex = columnTickets.findIndex((t: Chamado) => t.id === over.id);

          if (targetIndex !== -1 && over.id !== ticketId) {
            targetColumnId = columnId;
            newPosition = calcPositionBetweenTickets(
              columnTickets,
              targetIndex,
              groupBy,
              ticketId
            );
            foundTicket = true;
            break;
          }
        }

        if (!foundTicket) {
          console.warn('⚠️ TARGET TICKET  NAO ENCONTRADOR:', over.id);
          return;
        }
      }

      if (!targetColumnId) {
        console.warn('⚠️ TARGET COLUMN NAO ENCONTRADA');
        return;
      }

      await onMoveTicket(ticketId, targetColumnId, newPosition, '');
    },
    [tickets, groupBy, columns, ticketsByColumn, groupedTickets, getCustomTicketPosition, onMoveTicket]
  );

  return {
    activeTicket,
    dragOverInfo,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
