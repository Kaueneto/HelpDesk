import api from '@/services/api';
import toast from 'react-hot-toast';
import type { Chamado, MoveTicketPayload } from '../utils/kanbanTypes';
import {
  generateMoveId,
  validateAndNormalizePosition,
} from '../utils/kanbanPositionCalculator';

/**
 * Main function to move a ticket to a new position and column
 *
 * @param ticketId - ID of the ticket to move
 * @param targetColumn - Target column ID
 * @param newPosition - New position in the column
 * @param groupBy - Current grouping mode (status, priority, responsavel, etc)
 * @param columnValue - Value to use for the target column (depends on groupBy)
 * @param selectedBoardId - Board ID if in custom board mode
 * @param tickets - Current tickets array for optimistic update
 * @param statusList - Status list for updating ticket status if needed
 * @param prioridades - Priorities list
 * @param departamentos - Departments list
 * @param topicosAjuda - Help topics list
 * @param usuarios - Users list
 * @param onTicketUpdate - Callback to update parent component state
 * @returns Object with moveId and response
 */
export async function moveTicket(
  ticketId: number,
  targetColumn: string,
  newPosition: number,
  groupBy: string,
  columnValue: string | number | null,
  selectedBoardId?: number,
  tickets?: Chamado[],
  statusList?: any[],
  prioridades?: any[],
  departamentos?: any[],
  topicosAjuda?: any[],
  usuarios?: any[],
  onTicketUpdate?: (ticketId: number, updater: (prev: Chamado[]) => Chamado[]) => void
): Promise<{ moveId: string; response: any }> {
  const ticketToMove = tickets?.find((t) => t.id === ticketId);
  if (!ticketToMove && tickets) {
    console.error('❌ TICKET NOT FOUND:', ticketId);
    throw new Error(`Ticket ${ticketId} not found`);
  }

  const positionValidation = validateAndNormalizePosition(newPosition);
  if (!positionValidation.valid) {
    console.error('❌ INVALID POSITION:', newPosition);
    toast.error(`Erro: ${positionValidation.error}`);
    throw new Error(positionValidation.error);
  }

  const roundedPosition = positionValidation.position;
  const moveId = generateMoveId();

  console.log('[MOVEMENT SERVICE] Moving ticket:', {
    ticketId,
    targetColumn,
    position: roundedPosition,
    groupBy,
    columnValue,
    moveId,
  });

  try {
    let updatedTicket = ticketToMove;
    if (ticketToMove) {
      updatedTicket = { ...ticketToMove };

      const newPosObj = {
        groupBy,
        columnValue: columnValue?.toString() || null,
        position: roundedPosition,
      };

      if (Array.isArray(ticketToMove.kanbanPositions)) {
        const existingIndex = ticketToMove.kanbanPositions.findIndex(
          (p: any) => p.groupBy === groupBy
        );
        const newPositions = [...ticketToMove.kanbanPositions];
        if (existingIndex >= 0) {
          newPositions[existingIndex] = newPosObj;
        } else {
          newPositions.push(newPosObj);
        }
        updatedTicket.kanbanPositions = newPositions;
      } else if (
        ticketToMove.kanbanPositions &&
        (ticketToMove.kanbanPositions as any).groupBy
      ) {
        const currentPosObj = ticketToMove.kanbanPositions as any;
        if (currentPosObj.groupBy === groupBy) {
          updatedTicket.kanbanPositions = [newPosObj];
        } else {
          updatedTicket.kanbanPositions = [currentPosObj, newPosObj];
        }
      } else {
        updatedTicket.kanbanPositions = [newPosObj];
      }

      if (groupBy !== 'personalizada') {
        updateTicketFields(updatedTicket, targetColumn, groupBy, {
          statusList,
          prioridades,
          departamentos,
          topicosAjuda,
          usuarios,
        });
      }

if (onTicketUpdate) {
  onTicketUpdate(ticketId, (prevTickets: Chamado[]) => {
    return prevTickets.map((t) => {
      if (t.id === ticketId) {
        return updatedTicket;
      }
      return t;
    }) as Chamado[];
  });
}
    }

    const payload: MoveTicketPayload = {
      groupBy,
      columnValue: columnValue === null ? null : columnValue,
      position: roundedPosition,
      moveId,
      ...(groupBy === 'personalizada' && selectedBoardId && { boardId: selectedBoardId }),
    };

    console.log('[BACKEND] Sending:', payload);

    const response = await api.patch(`/chamados/${ticketId}/move`, payload);
    console.log('[BACKEND] OK - Ticket saved!');
    toast.success('Chamado movido!');

    return { moveId, response };
  } catch (error: any) {
    console.error('[BACKEND] Error:', error.response?.data?.message || error.message);

    if (ticketToMove && onTicketUpdate) {
      onTicketUpdate(ticketId, (prevTickets: Chamado[]) =>
        prevTickets.map((t) => (t.id === ticketId ? ticketToMove : t))
      );
    }

    const errorMessage =
      error.response?.data?.message || 'Erro ao mover chamado';
    toast.error(errorMessage);

    throw error;
  }
}


function updateTicketFields(
  ticket: Chamado,
  targetColumn: string,
  groupBy: string,
  data: {
    statusList?: any[];
    prioridades?: any[];
    departamentos?: any[];
    topicosAjuda?: any[];
    usuarios?: any[];
  }
): void {
  const { statusList, prioridades, departamentos, topicosAjuda, usuarios } = data;

  switch (groupBy) {
    case 'status':
      if (statusList) {
        const statusFound = statusList.find((s) => s.id.toString() === targetColumn);
        if (statusFound) ticket.status = statusFound;
      }
      break;

    case 'prioridade':
      if (prioridades) {
        const prioridadeFound = prioridades.find(
          (p) => p.id.toString() === targetColumn
        );
        if (prioridadeFound) ticket.tipoPrioridade = prioridadeFound;
      }
      break;

    case 'responsavel':
      if (targetColumn === 'sem-responsavel') {
        ticket.userResponsavel = null;
      } else if (usuarios) {
        const userFound = usuarios.find((u) => u.id.toString() === targetColumn);
        if (userFound) ticket.userResponsavel = userFound;
      }
      break;

    case 'departamento':
      if (departamentos) {
        const deptFound = departamentos.find(
          (d) => d.id.toString() === targetColumn
        );
        if (deptFound) ticket.departamento = deptFound;
      }
      break;

    case 'topico':
      if (topicosAjuda) {
        const topicoFound = topicosAjuda.find(
          (t) => t.id.toString() === targetColumn
        );
        if (topicoFound) ticket.topicoAjuda = topicoFound;
      }
      break;

    default:
      break;
  }
}


export function getColumnValueForGroupBy(columnId: string, groupBy: string): string | number | null {
  if (groupBy === 'responsavel') {
    return columnId === 'sem-responsavel' ? null : columnId;
  }
  return columnId;
}
