

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
  if (!Number.isFinite(lastPosition)) {
    return DEFAULT_POSITION;
  }
  return lastPosition + spacing;
}


export function calcPositionBetweenTickets(
  columnTickets: Chamado[],
  overIndex: number,
  currentGroupBy: string,
  activeTicketId: number,
  positionGetter?: (ticket: Chamado) => number
): number {
  const resolvePosition = (ticket: Chamado): number =>
    positionGetter ? positionGetter(ticket) : getPositionForGroupBy(ticket.kanbanPositions, currentGroupBy);

  const activeIndexOriginal = columnTickets.findIndex((t) => t.id === activeTicketId);
  const isMovingDown = activeIndexOriginal !== -1 && activeIndexOriginal < overIndex;


  const filteredTickets = columnTickets.filter((t) => t.id !== activeTicketId);

  const overTicket = columnTickets[overIndex];
  if (!overTicket) return DEFAULT_POSITION;

  if (overTicket.id === activeTicketId) {
    const currentPos = resolvePosition(overTicket);
    return currentPos !== 999999 ? currentPos : DEFAULT_POSITION;
  }

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const posA = resolvePosition(a);
    const posB = resolvePosition(b);
    const valA = posA !== 999999 ? posA : Number.MAX_SAFE_INTEGER;
    const valB = posB !== 999999 ? posB : Number.MAX_SAFE_INTEGER;
    return valA - valB;
  });

  const actualIndex = sortedTickets.findIndex((t) => t.id === overTicket.id);

  if (actualIndex === -1) {
    return DEFAULT_POSITION;
  }

  const overPosValue =
    resolvePosition(overTicket) !== 999999
      ? resolvePosition(overTicket)
      : (actualIndex + 1) * DEFAULT_POSITION_SPACING;

  let prevPosValue: number;
  let nextPosValue: number;

  if (isMovingDown) {
    prevPosValue = overPosValue;
    const nextTicket = sortedTickets[actualIndex + 1];
    nextPosValue = nextTicket
      ? resolvePosition(nextTicket) !== 999999
        ? resolvePosition(nextTicket)
        : overPosValue + DEFAULT_POSITION_SPACING * 2
      : overPosValue + DEFAULT_POSITION_SPACING * 2;
  } else {
    nextPosValue = overPosValue;
    if (actualIndex === 0) {
      prevPosValue = 0; 
    } else {
      const prevTicket = sortedTickets[actualIndex - 1];
      prevPosValue =
        resolvePosition(prevTicket) !== 999999
          ? resolvePosition(prevTicket)
          : nextPosValue - DEFAULT_POSITION_SPACING;
    }
  }

  if (prevPosValue === 0) {
    const newPos = Math.max(
      DEFAULT_POSITION,
      Math.floor(nextPosValue / 2)
    );
    return newPos >= nextPosValue ? nextPosValue - 100 : newPos;
  }

  if (prevPosValue >= nextPosValue) {
    return prevPosValue + DEFAULT_POSITION_SPACING;
  }

  return Math.floor((prevPosValue + nextPosValue) / 2);
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
