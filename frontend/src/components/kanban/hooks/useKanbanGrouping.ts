
import { useMemo } from 'react';
import type { Card as BoardCard } from '@/hooks/useBoardData';
import type {
  Chamado,
  KanbanColumn,
  DragOverInfo,
  Theme,
  UseKanbanGroupingReturn,
} from '../utils/kanbanTypes';
import {
  getPositionForGroupBy,
  calcPositionBetweenTickets as calcPositionHelper,
} from '../utils/kanbanPositionCalculator';

interface UseKanbanGroupingProps {
  tickets: Chamado[];
  groupBy: string;
  columns: any[];
  cards: BoardCard[];
  statusList: any[];
  prioridades: any[];
  departamentos: any[];
  topicosAjuda: any[];
  somenteAbertos: boolean;
  theme: Theme;
  dragOverInfo: DragOverInfo | null;
}

export function useKanbanGrouping({
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
}: UseKanbanGroupingProps): UseKanbanGroupingReturn {
  const ticketsByColumn = useMemo(() => {
    if (groupBy !== 'personalizada') return {};

    const map: { [columnId: string]: Chamado[] } = {};
    const cardByTicketId = new Map<number, BoardCard>();

    map['unassigned'] = [];

    columns.forEach((col) => {
      map[col.id.toString()] = [];
    });

    cards.forEach((card) => {
      if (card.idChamado > 0) {
        cardByTicketId.set(Number(card.idChamado), card);
      }
    });

    const getPos = (ticket: Chamado) => {
      const boardCard = cardByTicketId.get(ticket.id);
      if (boardCard) {
        return Number(boardCard.posicao);
      }

      return 999999;
    };


    tickets.forEach((ticket) => {
      const boardCard = cardByTicketId.get(ticket.id);

      if (boardCard) {
        const boardColumnId = boardCard.columnId?.toString() || null;
        if (boardColumnId && map[boardColumnId]) {
          map[boardColumnId].push(ticket);
        } else {
          map['unassigned'].push(ticket);
        }
        return;
      }

      map['unassigned'].push(ticket);
    });

    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => {
        const posA = getPos(a);
        const posB = getPos(b);
        return posA - posB;
      });
    });

    if (dragOverInfo) {
      const { ticketId, targetColumn, overId } = dragOverInfo;
      let foundTicket: Chamado | null = null;

      for (const col of Object.keys(map)) {
        const idx = map[col].findIndex((t) => t.id === ticketId);
        if (idx !== -1) {
          foundTicket = map[col][idx];
          map[col] = [...map[col]];
          map[col].splice(idx, 1);
          break;
        }
      }

      if (foundTicket && map[targetColumn]) {
        map[targetColumn] = [...map[targetColumn]];

        if (targetColumn === String(overId)) {
          map[targetColumn].push(foundTicket);
        } else {
          const targetIndex = map[targetColumn].findIndex(
            (t) => t.id === overId
          );
          if (targetIndex !== -1) {
            map[targetColumn].splice(targetIndex, 0, foundTicket);
          } else {
            map[targetColumn].push(foundTicket);
          }
        }
      }
    }

    return map;
  }, [tickets, columns, cards, groupBy, dragOverInfo]);

  const groupedTickets = useMemo(() => {
    const groups: { [key: string]: Chamado[] } = {};
    const columnsList: KanbanColumn[] = [];

    switch (groupBy) {
      case 'status': {
        const sortedStatus = [...statusList].sort((a, b) => {
          if (a.id === 3) return 1;
          if (b.id === 3) return -1;
          return 0;
        });

        sortedStatus.forEach((status) => {
          const key = status.id.toString();
          groups[key] = [];
          columnsList.push({
            id: key,
            title: status.nome,
            color: getStatusColorTheme(status.id, theme),
          });
        });
        break;
      }

      case 'prioridade':
        prioridades.forEach((prioridade) => {
          const key = prioridade.id.toString();
          groups[key] = [];
          columnsList.push({
            id: key,
            title: prioridade.nome,
            color: getPriorityColorTheme(prioridade.nome, theme),
          });
        });
        break;

      case 'responsavel': {
        const responsaveis = new Set<string>();
        tickets.forEach((ticket) => {
          if (ticket.userResponsavel) {
            responsaveis.add(
              `${ticket.userResponsavel.id}:${ticket.userResponsavel.name}`
            );
          }
        });

        groups['sem-responsavel'] = [];
        columnsList.push({
          id: 'sem-responsavel',
          title: 'Sem responsável',
          color: theme.text.tertiary,
        });

        Array.from(responsaveis).forEach((resp) => {
          const [id, name] = resp.split(':');
          groups[id] = [];
          columnsList.push({
            id: id,
            title: name,
            color: theme.brand.primary,
          });
        });
        break;
      }

      case 'departamento':
        departamentos.forEach((dept) => {
          const key = dept.id.toString();
          groups[key] = [];
          columnsList.push({
            id: key,
            title: dept.name || dept.nome,
            color: theme.brand.primary,
          });
        });
        break;

      case 'topico':
        topicosAjuda.forEach((topico) => {
          const key = topico.id.toString();
          groups[key] = [];
          columnsList.push({
            id: key,
            title: topico.nome,
            color: theme.indicators.info,
          });
        });
        break;
    }

    tickets.forEach((ticket) => {
      if (somenteAbertos && ticket.status.id === 3) {
        return;
      }

      let targetGroup: string;

      switch (groupBy) {
        case 'status':
          targetGroup = ticket.status?.id?.toString() || 'default';
          break;
        case 'prioridade':
          targetGroup = ticket.tipoPrioridade?.id?.toString() || 'default';
          break;
        case 'responsavel':
          targetGroup = ticket.userResponsavel
            ? ticket.userResponsavel.id.toString()
            : 'sem-responsavel';
          break;
        case 'departamento':
          targetGroup = ticket.departamento?.id?.toString() || 'default';
          break;
        case 'topico':
          targetGroup = ticket.topicoAjuda?.id?.toString() || 'default';
          break;
        default:
          targetGroup = 'default';
      }

      if (groups[targetGroup]) {
        groups[targetGroup].push(ticket);
      }
    });

    Object.keys(groups).forEach((groupKey) => {
      groups[groupKey].sort((a, b) => {
        let aPosition = 999999;
        let bPosition = 999999;

        if (a.kanbanPositions) {
          if (Array.isArray(a.kanbanPositions)) {
            const posicaoA = a.kanbanPositions.find((p: any) => p.groupBy === groupBy);
            aPosition = posicaoA ? posicaoA.position : 999999;
          } else if (a.kanbanPositions.groupBy === groupBy) {
            aPosition = a.kanbanPositions.position;
          }
        }

        if (b.kanbanPositions) {
          if (Array.isArray(b.kanbanPositions)) {
            const posicaoB = b.kanbanPositions.find((p: any) => p.groupBy === groupBy);
            bPosition = posicaoB ? posicaoB.position : 999999;
          } else if (b.kanbanPositions.groupBy === groupBy) {
            bPosition = b.kanbanPositions.position;
          }
        }

        return aPosition - bPosition;
      });
    });

    if (dragOverInfo) {
      const { ticketId, targetColumn, overId } = dragOverInfo;
      let foundTicket: Chamado | null = null;

      for (const col of Object.keys(groups)) {
        const idx = groups[col].findIndex((t) => t.id === ticketId);
        if (idx !== -1) {
          foundTicket = groups[col][idx];
          groups[col] = [...groups[col]];
          groups[col].splice(idx, 1);
          break;
        }
      }

      if (foundTicket && groups[targetColumn]) {
        groups[targetColumn] = [...groups[targetColumn]];

        if (targetColumn === String(overId)) {
          groups[targetColumn].push(foundTicket);
        } else {
          const targetIndex = groups[targetColumn].findIndex(
            (t) => t.id === overId
          );
          if (targetIndex !== -1) {
            groups[targetColumn].splice(targetIndex, 0, foundTicket);
          } else {
            groups[targetColumn].push(foundTicket);
          }
        }
      }
    }

    return { groups, columns: columnsList };
  }, [
    tickets,
    groupBy,
    statusList,
    prioridades,
    departamentos,
    topicosAjuda,
    somenteAbertos,
    theme,
    dragOverInfo,
  ]);

  return {
    groupedTickets,
    ticketsByColumn,
    getPositionForGroupBy: (positions: any) => getPositionForGroupBy(positions, groupBy),
    calcPositionBetweenTickets: calcPositionHelper,
  };
}

function getStatusColorTheme(statusId: number, theme: Theme): string {
  switch (statusId) {
    case 1:
      return theme.status.aberto.border;
    case 2:
      return theme.status.emAtendimento.border;
    case 3:
      return theme.status.encerrado.border;
    case 4:
      return theme.status.cancelado.border;
    case 5:
      return theme.status.aguardando.border;
    case 6:
      return theme.status.pendenteUsuario.border;
    case 7:
      return theme.status.pendente.border;
    default:
      return theme.border.primary;
  }
}

function getPriorityColorTheme(prioridadeName: string, theme: Theme): string {
  const normalized = prioridadeName.toLowerCase();
  switch (normalized) {
    case 'baixa':
    case 'baixo':
      return theme.priority.baixa.border;
    case 'média':
    case 'media':
    case 'médio':
    case 'medio':
      return theme.priority.media.border;
    case 'alta':
    case 'alto':
      return theme.priority.alta.border;
    case 'crítica':
    case 'critica':
      return theme.priority.critica.border;
    case 'urgente':
      return theme.priority.urgente.border;
    default:
      return theme.brand.secondary;
  }
}
