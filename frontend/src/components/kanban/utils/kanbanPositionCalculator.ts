import type { Chamado } from './kanbanTypes';

const DEFAULT_POSITION = 1000;
const DEFAULT_POSITION_SPACING = 1000;

export function getPositionForGroupBy(positions: any, groupBy: string): number {
  if (!positions) return 999999;
  if (Array.isArray(positions)) {
    const pos = positions.find((p: any) => p.groupBy === groupBy);
    return pos ? pos.position : 999999;
  } else if (positions.groupBy === groupBy) {
    return positions.position;
  }
  return 999999;
}

export function isValidPosition(position: number): boolean {
  return Number.isFinite(position) && position >= 1;
}

export function calculateRoundedPosition(position: number): number {
  return Math.round(position);
}

export function calculateNextPosition(
  lastPosition: number,
  spacing: number = DEFAULT_POSITION_SPACING
): number {
  if (!Number.isFinite(lastPosition)) return DEFAULT_POSITION;
  return lastPosition + spacing;
}

// corrigido: overIndex agora aponta corretamente para o array sem o ticket ativo
export function calcPositionBetweenTickets(
  columnTickets: Chamado[],
  overIndex: number,
  currentGroupBy: string,
  activeTicketId: number,
  positionGetter?: (ticket: Chamado) => number
): number {
  const resolvePosition = (ticket: Chamado): number =>
    positionGetter
      ? positionGetter(ticket)
      : getPositionForGroupBy(ticket.kanbanPositions, currentGroupBy);

  // captura o ticket alvo pelo índice ANTES de filtrar
  const overTicket = columnTickets[overIndex];
  if (!overTicket || overTicket.id === activeTicketId) return DEFAULT_POSITION;

  const activeOriginalIndex = columnTickets.findIndex((t) => t.id === activeTicketId);
  const isMovingDown = activeOriginalIndex !== -1 && activeOriginalIndex < overIndex;

  // filtra e ordena sem o ticket ativo para calcular posições relativas corretas
  const filteredSorted = columnTickets
    .filter((t) => t.id !== activeTicketId)
    .sort((a, b) => {
      const posA = resolvePosition(a);
      const posB = resolvePosition(b);
      return (posA === 999999 ? Number.MAX_SAFE_INTEGER : posA) -
             (posB === 999999 ? Number.MAX_SAFE_INTEGER : posB);
    });

  // busca o índice no array correto (sem o ativo), não no original
  const actualIndex = filteredSorted.findIndex((t) => t.id === overTicket.id);
  if (actualIndex === -1) return DEFAULT_POSITION;

  const overPos = resolvePosition(overTicket);
  const overPosValue = overPos !== 999999
    ? overPos
    : (actualIndex + 1) * DEFAULT_POSITION_SPACING;

  let prevPos: number;
  let nextPos: number;

  if (isMovingDown) {
    prevPos = overPosValue;
    const next = filteredSorted[actualIndex + 1];
    nextPos = next
      ? (resolvePosition(next) !== 999999
          ? resolvePosition(next)
          : overPosValue + DEFAULT_POSITION_SPACING * 2)
      : overPosValue + DEFAULT_POSITION_SPACING * 2;
  } else {
    nextPos = overPosValue;
    if (actualIndex === 0) {
      prevPos = 0;
    } else {
      const prev = filteredSorted[actualIndex - 1];
      prevPos = resolvePosition(prev) !== 999999
        ? resolvePosition(prev)
        : nextPos - DEFAULT_POSITION_SPACING;
    }
  }

  if (prevPos === 0) {
    const newPos = Math.max(DEFAULT_POSITION, Math.floor(nextPos / 2));
    return newPos >= nextPos ? nextPos - 100 : newPos;
  }

  if (prevPos >= nextPos) return prevPos + DEFAULT_POSITION_SPACING;

  return Math.floor((prevPos + nextPos) / 2);
}

export function generateMoveId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function validateAndNormalizePosition(position: number): {
  valid: boolean;
  position: number;
  error?: string;
} {
  if (!isValidPosition(position)) {
    return {
      valid: false,
      position: DEFAULT_POSITION,
      error: 'Position must be finite and positive',
    };
  }
  return {
    valid: true,
    position: calculateRoundedPosition(position),
  };
}