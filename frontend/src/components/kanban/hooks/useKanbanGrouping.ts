import { useMemo } from "react";
import type { Card as BoardCard } from "../../../hooks/useBoardData";
import type { Chamado, KanbanColumn, DragOverInfo, Theme, UseKanbanGroupingReturn } from "../utils/kanbanTypes";
import { getPositionForGroupBy, calcPositionBetweenTickets as calcPositionHelper } from "../utils/kanbanPositionCalculator";

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

// aplica o preview visual do drag sobre um map já calculado (sem recalcular tudo)
function applyDragPreview<T extends { id: number }>(
  map: Record<string, T[]>,
  dragOverInfo: DragOverInfo | null
): Record<string, T[]> {
  if (!dragOverInfo) return map;

  const { ticketId, targetColumn, overId } = dragOverInfo;
  const result: Record<string, T[]> = {};

  // clona o map
  for (const col of Object.keys(map)) {
    result[col] = [...map[col]];
  }

  // remove o ticket da coluna de origem
  let foundTicket: T | null = null;
  for (const col of Object.keys(result)) {
    const idx = result[col].findIndex((t) => t.id === ticketId);
    if (idx !== -1) {
      foundTicket = result[col][idx];
      result[col] = [...result[col]];
      result[col].splice(idx, 1);
      break;
    }
  }

  // insere na coluna destino
  if (foundTicket) {
    result[targetColumn] = result[targetColumn] ? [...result[targetColumn]] : [];
    if (targetColumn === String(overId)) {
      result[targetColumn].push(foundTicket);
    } else {
      const targetIndex = result[targetColumn].findIndex((t) => t.id === Number(overId));
      if (targetIndex !== -1) {
        result[targetColumn].splice(targetIndex, 0, foundTicket);
      } else {
        result[targetColumn].push(foundTicket);
      }
    }
  }

  return result;
}

export function useKanbanGrouping(
  { tickets, groupBy, columns, cards, statusList, prioridades, departamentos, topicosAjuda, somenteAbertos, theme, dragOverInfo }: UseKanbanGroupingProps
): UseKanbanGroupingReturn {

  // MODO PERSONALIZADA — base sem dragOverInfo
  const ticketsByColumnBase = useMemo(() => {
    if (groupBy !== "personalizada") return {};

    const map: Record<string, Chamado[]> = {};
    const cardByTicketId = new Map<number, BoardCard>();

    map["unassigned"] = [];
    columns.forEach((col) => { map[col.id.toString()] = []; });

    cards.forEach((card) => {
      const chamadoId = (card as any).idChamado ?? (card as any).chamado;
      if (chamadoId > 0) cardByTicketId.set(Number(chamadoId), card);
    });

    const getPos = (ticket: Chamado): number => {
      const boardCard = cardByTicketId.get(ticket.id);
      return boardCard ? Number((boardCard as any).posicao) : 999999;
    };

    tickets.forEach((ticket) => {
      const boardCard = cardByTicketId.get(ticket.id);
      if (boardCard) {
        const boardColumnId = (boardCard as any).columnId?.toString() ?? null;
        if (boardColumnId) {
          map[boardColumnId] = map[boardColumnId] ?? [];
          map[boardColumnId].push(ticket);
        } else {
          map["unassigned"].push(ticket);
        }
      } else {
        map["unassigned"].push(ticket);
      }
    });

    // ordena por posição
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => getPos(a) - getPos(b));
    });

    return map;
  }, [tickets, columns, cards, groupBy]);

  // aplica preview do drag SEM recalcular tudo
  const ticketsByColumn = useMemo(
    () => applyDragPreview(ticketsByColumnBase, dragOverInfo),
    [ticketsByColumnBase, dragOverInfo]
  );

  // MODO PADRÃO — base sem dragOverInfo
  const groupedTicketsBase = useMemo(() => {
    const groups: Record<string, Chamado[]> = {};
    const columnsList: any[] = [];

    switch (groupBy) {
      case "status": {
        const sortedStatus = [...statusList].sort((a, b) => {
          if (a.id === 3) return 1;
          if (b.id === 3) return -1;
          return 0;
        });
        sortedStatus.forEach((status) => {
          const key = status.id.toString();
          groups[key] = [];
          columnsList.push({ id: key, title: status.nome, color: getStatusColorTheme(status.id, theme) });
        });
        break;
      }
      case "prioridade":
        prioridades.forEach((prioridade) => {
          const key = prioridade.id.toString();
          groups[key] = [];
          columnsList.push({ id: key, title: prioridade.nome, color: getPriorityColorTheme(prioridade.nome, theme) });
        });
        break;
      case "responsavel": {
        const responsaveis = new Set<string>();
        tickets.forEach((ticket) => {
          if (ticket.userResponsavel)
            responsaveis.add(`${ticket.userResponsavel.id}|${ticket.userResponsavel.name}`);
        });
        groups["sem-responsavel"] = [];
        columnsList.push({ id: "sem-responsavel", title: "Sem responsável", color: theme.text.tertiary });
        Array.from(responsaveis).forEach((resp) => {
          const [id, name] = resp.split("|");
          groups[id] = [];
          columnsList.push({ id, title: name, color: theme.brand.primary });
        });
        break;
      }
      case "departamento":
        departamentos.forEach((dept) => {
          const key = dept.id.toString();
          groups[key] = [];
          columnsList.push({ id: key, title: dept.name ?? dept.nome, color: theme.brand.primary });
        });
        break;
      case "topico":
        topicosAjuda.forEach((topico) => {
          const key = topico.id.toString();
          groups[key] = [];
          columnsList.push({ id: key, title: topico.nome, color: theme.indicators.info });
        });
        break;
    }

    // distribui tickets
    tickets.forEach((ticket) => {
      if (somenteAbertos && ticket.status.id === 3) return;
      let targetGroup: string;
      switch (groupBy) {
        case "status":      targetGroup = ticket.status?.id?.toString() ?? "default"; break;
        case "prioridade":  targetGroup = ticket.tipoPrioridade?.id?.toString() ?? "default"; break;
        case "responsavel": targetGroup = ticket.userResponsavel ? ticket.userResponsavel.id.toString() : "sem-responsavel"; break;
        case "departamento": targetGroup = ticket.departamento?.id?.toString() ?? "default"; break;
        case "topico":      targetGroup = ticket.topicoAjuda?.id?.toString() ?? "default"; break;
        default:            targetGroup = "default";
      }
      if (groups[targetGroup]) groups[targetGroup].push(ticket);
    });

    // odena por kanbanPositions
    Object.keys(groups).forEach((groupKey) => {
      groups[groupKey].sort((a, b) => {
        const getPos = (ticket: Chamado): number => {
          if (!ticket.kanbanPositions) return 999999;
          if (Array.isArray(ticket.kanbanPositions)) {
            const pos = (ticket.kanbanPositions as any[]).find((p) => p.groupBy === groupBy);
            return pos ? pos.position : 999999;
          }
          return (ticket.kanbanPositions as any).groupBy === groupBy
            ? (ticket.kanbanPositions as any).position
            : 999999;
        };
        return getPos(a) - getPos(b);
      });
    });

    return { groups, columns: columnsList };
  }, [tickets, groupBy, statusList, prioridades, departamentos, topicosAjuda, somenteAbertos, theme]);

  // aplica preview do drag SEM recalcular tudo
  const groupedTickets = useMemo(() => {
    if (!dragOverInfo) return groupedTicketsBase;
    const newGroups = applyDragPreview(groupedTicketsBase.groups, dragOverInfo);
    return { ...groupedTicketsBase, groups: newGroups };
  }, [groupedTicketsBase, dragOverInfo]);

  return {
    groupedTickets,
    ticketsByColumn,
    getPositionForGroupBy: (positions: any) => getPositionForGroupBy(positions, groupBy),
    calcPositionBetweenTickets: calcPositionHelper,
  };
}

function getStatusColorTheme(statusId: number, theme: Theme): string {
  switch (statusId) {
    case 1: return theme.status.aberto.border;
    case 2: return theme.status.emAtendimento.border;
    case 3: return theme.status.encerrado.border;
    case 4: return theme.status.cancelado.border;
    case 5: return theme.status.aguardando.border;
    case 6: return theme.status.pendenteUsuario.border;
    case 7: return theme.status.pendente.border;
    default: return theme.border.primary;
  }
}

function getPriorityColorTheme(prioridadeName: string, theme: Theme): string {
  const normalized = prioridadeName.toLowerCase();
  switch (normalized) {
    case "baixa":
    case "baixo":   return theme.priority.baixa.border;
    case "média":
    case "media":
    case "médio":
    case "medio":   return theme.priority.media.border;
    case "alta":
    case "alto":    return theme.priority.alta.border;
    case "crítica":
    case "critica": return theme.priority.critica.border;
    case "urgente": return theme.priority.urgente.border;
    default:        return theme.brand.secondary;
  }
}
