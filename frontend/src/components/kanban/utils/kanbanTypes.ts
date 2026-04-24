
export interface Chamado {
  id: number;
  numeroChamado: number;
  dataAbertura: string;
  dataFechamento: string | null;
  resumoChamado: string;
  usuario: {
    id: number;
    name: string;
  };
  userResponsavel: {
    id: number;
    name: string;
  } | null;
  tipoPrioridade: {
    id: number;
    nome: string;
    cor: string;
  };
  topicoAjuda: {
    id: number;
    nome: string;
  };
  departamento: {
    id: number;
    nome: string;
    name?: string;
  };
  status: {
    id: number;
    nome: string;
  };
  historico?: Array<{
    id: number;
    descricao: string;
    dataHistorico: string;
    usuario?: {
      name: string;
    };
  }>;
  kanbanPositions?: Array<{
    groupBy: string;
    columnValue: string | null;
    position: number;
  }> | {
    groupBy: string;
    columnValue: string | null;
    position: number;
  } | null;
}

export interface GroupByOption {
  value: string;
  label: string;
}

export interface KanbanViewProps {
  tickets: Chamado[];
  onTicketClick?: (ticket: Chamado) => void;
  onTicketUpdate?: (ticketId: number, updates: any) => void;
  onRefresh?: () => void;
  departamentos?: any[];
  statusList?: any[];
  prioridades?: any[];
  usuarios?: any[];
  topicosAjuda?: any[];
  departamentoId?: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}

export interface KanbanPosition {
  groupBy: string;
  columnValue: string | null;
  position: number;
}

export interface DragOverInfo {
  ticketId: number;
  targetColumn: string;
  overId: string | number;
}

export interface Board {
  id: number;
  nome: string;
  tipo?: 'dinamico' | 'custom';
}

import type { Column } from '@/hooks/useBoardData';

export interface Card {
  id: number;
  chamadoId: number;
  columnId: number;
  boardId: number;
  posicao: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Theme {
  status: {
    aberto: { border: string };
    emAtendimento: { border: string };
    encerrado: { border: string };
    cancelado: { border: string };
    aguardando: { border: string };
    pendenteUsuario: { border: string };
    pendente: { border: string };
  };
  priority: {
    baixa: { border: string };
    media: { border: string };
    alta: { border: string };
    critica: { border: string };
    urgente: { border: string };
  };
  border: {
    primary: string;
    secondary: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  background: {
    surface: string;
    card: string;
    hover: string;
  };
  brand: {
    primary: string;
    secondary: string;
  };
  indicators: {
    info: string;
  };
}

export interface MoveTicketPayload {
  groupBy: string;
  columnValue: string | number | null;
  position: number;
  moveId: string;
  boardId?: number;
}

export interface UseKanbanGroupingReturn {
  groupedTickets: {
    groups: Record<string, Chamado[]>;
    columns: KanbanColumn[];
  };
  ticketsByColumn: Record<string, Chamado[]>;
  getPositionForGroupBy: (positions: any) => number;
  calcPositionBetweenTickets: (
    columnTickets: Chamado[],
    overIndex: number,
    currentGroupBy: string,
    activeTicketId: number,
    positionGetter?: (ticket: Chamado) => number
  ) => number;
}

export interface UseKanbanDragDropReturn {
  activeTicket: Chamado | null;
  dragOverInfo: DragOverInfo | null;
  sensors: any;
  handleDragStart: (event: any) => void;
  handleDragOver: (event: any) => void;
  handleDragEnd: (event: any) => void;
}

export interface UseKanbanColumnManagementReturn {
  isAddingColumn: boolean;
  newColumnName: string;
  columnInputRef: React.RefObject<HTMLInputElement | null>;
  
  deleteConfirmModal: {
    isOpen: boolean;
    columnId: number | null;
  };

  handleColumnSubmit: () => void; 
  handleCreateColumn: (nome: string) => Promise<void>;
  handleDeleteColumn: (columnId: string) => void;
  handleConfirmDelete: () => Promise<void>;
  handleCancelDelete: () => void;
  handleRenameColumn: (columnId: string, newName: string) => Promise<void>;
  handleCancelColumnEdit: () => void;
  
  setIsAddingColumn: (value: boolean) => void;
  setNewColumnName: (value: string) => void;
  boards: Board[];
  selectedBoard: Board | null;
  columns: Column[]; 
  boardLoading: boolean;
  selectBoard: (boardId: number) => void;
  createBoard: (nome: string, departamentoId: number) => Promise<Board | null>;
  createColumn: (nome: string) => Promise<void>;
  deleteColumn: (columnId: number) => Promise<void>;
  removeColumnLocal: (columnId: number) => void;
}

export interface UseKanbanFilteringReturn {
  groupBy: string;
  selectedBoardId: number | null;
  selectedBoard: Board | null;
  somenteAbertos: boolean;
  allGroupByOptions: GroupByOption[];
  setGroupBy: (value: string) => void;
  setSomenteAbertos: (value: boolean) => void;
  setSelectedBoardId: (value: number | null) => void;
  handleGroupByChange: (option: GroupByOption | null) => void;
}

export interface KanbanHeaderProps {
  tickets: Chamado[];
  groupBy: string;
  allGroupByOptions: GroupByOption[];
  selectedBoard: Board | null;
  somenteAbertos: boolean;
  isRefreshing: boolean;
  onGroupByChange: (option: GroupByOption | null) => void;
  onToggleSomenteAbertos: () => void;
  onRefresh: () => void;
  onCreateBoard: () => void;
  theme: Theme;
}
