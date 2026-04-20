"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiPlus } from 'react-icons/fi';
import { useTheme } from '@/contexts/ThemeContext';
import KanbanColumn from './KanbanColumn';
import TicketCard from './TicketCard';
import CreateBoardModal from './CreateBoardModal';
import EmptyBoardState from './EmptyBoardState';
import { useBoardData } from '@/hooks/useBoardData';
import { useRealtimeBoard } from '@/hooks/useRealtimeBoard';
import api from '@/services/api';

interface Chamado {
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

interface GroupByOption {
  value: string;
  label: string;
}

interface KanbanViewProps {
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

// opções de agrupamento - REMOVIDAS, agora criadas dinamicamente em useMemo

const KanbanView = ({
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
}: KanbanViewProps) => {
  const { theme } = useTheme();
  const [groupBy, setGroupBy] = useState<string>(() => {
    return localStorage.getItem('kanbanGroupBy') || 'status';
  });

  // board customizado
  const {
    boards,
    selectedBoard,
    columns,
    loading: boardLoading,
    createBoard,
    selectBoard,
    createColumn,
    deleteColumn,
    removeColumnLocal,
  } = useBoardData(departamentoId);

  
  // criar opções dinamicamente (padrão + quadros customizados)
  const allGroupByOptions = useMemo(() => {
    const baseOptions: GroupByOption[] = [
      { value: 'status', label: 'Status' },
      { value: 'prioridade', label: 'Prioridade' },
      { value: 'responsavel', label: 'Responsável' },
      { value: 'departamento', label: 'Departamento' },
      { value: 'topico', label: 'Tópico' },
    ];

    // add quadros customizados como opções
    const boardOptions = boards.map((board) => ({
      value: `board_${board.id}`,
      label: board.nome,
    }));

    return [...baseOptions, ...boardOptions];
  }, [boards]);

  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const columnInputRef = useRef<HTMLInputElement>(null);
  const [activeTicket, setActiveTicket] = useState<Chamado | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<number>>(new Set());
  const [somenteAbertos, setSomenteAbertos] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dragOverInfo, setDragOverInfo] = useState<{ ticketId: number, targetColumn: string, overId: string | number } | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(() => {
    const saved = localStorage.getItem('kanbanSelectedBoard');
    return saved ? parseInt(saved) : null;
  });
  const [lastLocalMoveId, setLastLocalMoveId] = useState<string | null>(null); // Rastrear último movimento local
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; columnId: string | null }>({ isOpen: false, columnId: null });

  // sincronizar selectedBoardId quando selectedBoard muda
  useEffect(() => {
    if (groupBy === 'personalizada' && selectedBoard) {
      setSelectedBoardId(selectedBoard.id);
      localStorage.setItem('kanbanSelectedBoard', selectedBoard.id.toString());
    }
  }, [selectedBoard, groupBy]);

  // focar no input de coluna quando ativa modo edição
  useEffect(() => {
    if (isAddingColumn && columnInputRef.current) {
      columnInputRef.current?.focus();
    }
  }, [isAddingColumn]);

  // fechar campo de coluna ao clicar fora
  useEffect(() => {
    if (!isAddingColumn) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Se clicou fora do input e botões, fecha
      if (columnInputRef.current && !columnInputRef.current.contains(e.target as Node)) {
        // Verificar se clicou em um dos botões (Criar/Cancelar)
        const target = e.target as HTMLElement;
        if (!target.closest('button[class*="flex-1"]')) {
          handleCancelColumnEdit();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddingColumn]);

  // ==================== REALTIME LISTENERS ====================
  const handleCardMovedRealtime = useCallback((data: any) => {
    // ⚠️ ignorar eventos do próprio cliente (para evitar duplicação)
    if (lastLocalMoveId === data.moveId) {
      console.log('🔄 [REALTIME] Ignorando próprio evento:', data.moveId);
      setLastLocalMoveId(null);
      return;
    }

    // att posição do ticket se é para o board atual
    if (groupBy === 'personalizada' && selectedBoardId === data.boardId) {
      console.log('🔄 [REALTIME] Atualizando ticket de outro usuário:', {
        chamadoId: data.chamadoId,
        columnValue: data.columnValue,
        position: data.position,
      });

      // chamar callback para atualizar parent component
      if (onTicketUpdate) {
        onTicketUpdate(data.chamadoId, (prevTickets: Chamado[]) => 
          prevTickets.map(ticket => {
            if (ticket.id !== data.chamadoId) return ticket;
    
            return {
              ...ticket,
              kanbanPositions: {
                groupBy: 'personalizada',
                columnValue: data.columnValue?.toString() || null,
                position: data.position
              }
            };
          })
        );
        console.log('✅ [REALTIME] Ticket atualizado por outro usuário');
      }
    }
  }, [groupBy, selectedBoardId, onTicketUpdate, lastLocalMoveId]);

  const handleColumnCreatedRealtime = useCallback((column: any) => {
    console.log('➕ [REALTIME] Nova coluna criada:', column);
    // recarregar colunas (necessário pois é estrutura de dados)
    if (groupBy === 'personalizada' && selectedBoardId) {
      onRefresh?.();
    }
  }, [groupBy, selectedBoardId, onRefresh]);

  const handleColumnDeletedRealtime = useCallback((columnId: number) => {
    console.log('[REALTIME] Coluna deletada por outro usuário:', columnId);
    // Remover coluna do estado local de forma fluida (sem refresh)
    if (groupBy === 'personalizada' && selectedBoardId) {
      removeColumnLocal(columnId);
      console.log('Coluna removida do estado local com animação suave');
    }
  }, [groupBy, selectedBoardId, removeColumnLocal]);

  // usar WebSocket para atualizações em tempo real (apenas para board personalizado)
  useRealtimeBoard({
    boardId: groupBy === 'personalizada' ? selectedBoardId : null,
    enabled: groupBy === 'personalizada',
    onCardMoved: handleCardMovedRealtime,
    onColumnCreated: handleColumnCreatedRealtime,
    onColumnDeleted: handleColumnDeletedRealtime,
  });

  const getStatusColor = (statusId: number): string => {
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
  };

  // Helper para obter cor de prioridade
  const getPriorityColor = (prioridadeName: string): string => {
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
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleTicketSelect = useCallback((ticketId: number, selected: boolean) => {
    const newSelected = new Set(selectedTickets);
    if (selected) {
      newSelected.add(ticketId);
    } else {
      newSelected.delete(ticketId);
    }
    setSelectedTickets(newSelected);
  }, [selectedTickets]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      toast.success('Chamados recarregados!');
    } catch (error) {
      toast.error('Erro ao recarregar chamados');
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  // ao montar, carregar board selecionado se groupBy === 'personalizada'
  useEffect(() => {
    if (groupBy === 'personalizada') {
      const savedBoardId = localStorage.getItem('kanbanSelectedBoard');
      if (savedBoardId && boards.length > 0) {
        const board = boards.find((b) => b.id === parseInt(savedBoardId));
        if (board) {
          selectBoard(board.id);
        }
      }
    }
  }, [groupBy, boards, selectBoard]);

  // handler para criar novo board
  const handleCreateBoard = useCallback(
    async (nome: string) => {
      const newBoard = await createBoard(nome, departamentoId);
      if (newBoard) {
        // auto-selecionar o novo board
        setGroupBy('personalizada');
        localStorage.setItem('kanbanGroupBy', 'personalizada');
        localStorage.setItem('kanbanSelectedBoard', newBoard.id.toString());
        await selectBoard(newBoard.id);
      }
    },
    [createBoard, selectBoard, departamentoId]
  );

  // handler para criar coluna inline
  const handleCreateColumn = useCallback(
    async (nome: string) => {
      if (!nome.trim()) {
        toast.error('Nome da coluna não pode estar vazio');
        return;
      }
      try {
        await createColumn(nome);
        // limpar input para próxima coluna, mas manter em modo edição
        setNewColumnName('');
        toast.success('Coluna criada com sucesso!');
        // NÃO desativar isAddingColumn - mantém input aberto para próxima coluna
      } catch (error) {
        toast.error('Erro ao criar coluna');
      }
    },
    [createColumn]
  );

  // handler para submit do input inline
  const handleColumnInputSubmit = useCallback(() => {
    handleCreateColumn(newColumnName);
  }, [newColumnName, handleCreateColumn]);

  // handler para cancelar edição da coluna
  const handleCancelColumnEdit = useCallback(() => {
    setIsAddingColumn(false);
    setNewColumnName('');
  }, []);

  const handleSelectAllCardsInColumn = useCallback((ticketIds: number[]) => {
    const newSelected = new Set(selectedTickets);
    ticketIds.forEach(id => newSelected.add(id));
    setSelectedTickets(newSelected);
    toast.success(`${ticketIds.length} cards selecionados!`);
  }, [selectedTickets]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    // abrir modal de confirmação
    setDeleteConfirmModal({ isOpen: true, columnId });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      if (!deleteConfirmModal.columnId) return;

      const numColumnId = parseInt(deleteConfirmModal.columnId, 10);
      console.log(`deletando coluna ${numColumnId}...`);

      // usar função do hook que atualiza estado local de forma fluida
      await deleteColumn(numColumnId);
      
      console.log(`Coluna ${numColumnId} deletada com sucesso!`);
      // fechar modal
      setDeleteConfirmModal({ isOpen: false, columnId: null });
    } catch (error: any) {
      console.error('❌ Erro ao deletar coluna:', error);
      // toast de erro já é mostrado pelo hook
    }
  }, [deleteConfirmModal.columnId, deleteColumn]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmModal({ isOpen: false, columnId: null });
  }, []);

  const handleRenameColumn = useCallback(async (columnId: string, newName: string) => {
    try {
 
      toast.success('Coluna renomeada com sucesso!');
      onRefresh?.();
    } catch (error) {
      toast.error('Erro ao renomear coluna');
    }
  }, [selectedBoardId, onRefresh]);

  // quando em modo personalizada, criar mapa de tickets por coluna
  const ticketsByColumn = useMemo(() => {
    if (groupBy !== 'personalizada') return {};
    
    const map: { [columnId: string]: Chamado[] } = {};
    
    // coluna especial para tickets sem coluna atribuída
    map['unassigned'] = [];
    
    // inicializar cada coluna fixa com array vazio
    columns.forEach(col => {
      map[col.id.toString()] = [];
    });
    
    // helper para pegar posição
    const getPos = (ticket: Chamado) => {
      if (!ticket.kanbanPositions) return 999999;
      if (!Array.isArray(ticket.kanbanPositions) && ticket.kanbanPositions.groupBy === 'personalizada') {
        return ticket.kanbanPositions.position;
      } else if (Array.isArray(ticket.kanbanPositions)) {
        const pos = ticket.kanbanPositions.find((p: any) => p.groupBy === 'personalizada');
        return pos ? pos.position : 999999;
      }
      return 999999;
    };
    
    // distribuir tickets nas colunas baseado na kanbanPositions
    tickets.forEach(ticket => {
      let columnId: string | null = null;
      let hasAssignedColumn = false;
      
      if (ticket.kanbanPositions) {
        // se for um objeto único
        if (!Array.isArray(ticket.kanbanPositions) && ticket.kanbanPositions.groupBy === 'personalizada') {
          columnId = ticket.kanbanPositions.columnValue;
          hasAssignedColumn = !!columnId;
        }
        // se for array
        else if (Array.isArray(ticket.kanbanPositions)) {
          const pos = ticket.kanbanPositions.find((p: any) => p.groupBy === 'personalizada');
          if (pos && pos.columnValue) {
            columnId = pos.columnValue;
            hasAssignedColumn = true;
          }
        }
      }
      
      // se tem coluna atribuída e ela existe, adiciona lá
      if (hasAssignedColumn && columnId && map[columnId]) {
        map[columnId].push(ticket);
      } else {
        // caso contrário, vai para "Tickets sem coluna"
        map['unassigned'].push(ticket);
      }
    });

    // GARANTIR QUE TODAS AS COLUNAS ESTEJAM ORDENADAS PELA POSIÇÃO NO BOARD PERSONALIZADO
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        const posA = getPos(a);
        const posB = getPos(b);
        return posA - posB;
      });
    });

    // INSERIR GHOST PARA VISUALIZAÇÃO DE DRAG INTER-COLUNAS
    if (dragOverInfo) {
      const { ticketId, targetColumn, overId } = dragOverInfo;
      let foundTicket: Chamado | null = null;

      // Localizar o ticket e remove-lo de sua coluna de origem para evitar duplicatas
      for (const col of Object.keys(map)) {
        const idx = map[col].findIndex(t => t.id === ticketId);
        if (idx !== -1) {
          foundTicket = map[col][idx];
          map[col] = [...map[col]]; // clonar
          map[col].splice(idx, 1);
          break;
        }
      }

      // adicionar ele na nova coluna
      if (foundTicket && map[targetColumn]) {
        map[targetColumn] = [...map[targetColumn]]; // clonar a alvo

        if (targetColumn === String(overId)) {
          map[targetColumn].push(foundTicket);
        } else {
          const targetIndex = map[targetColumn].findIndex(t => t.id === overId);
          if (targetIndex !== -1) {
            map[targetColumn].splice(targetIndex, 0, foundTicket);
          } else {
            map[targetColumn].push(foundTicket);
          }
        }
      }
    }
    
    return map;
  }, [tickets, columns, groupBy, dragOverInfo]);

  // agrupar tickets de acordo com o critério selecionado
  const groupedTickets = useMemo(() => {
    const groups: { [key: string]: Chamado[] } = {};
    const columns: { id: string, title: string, color: string }[] = [];

    switch (groupBy) {
      case 'status':

        const sortedStatus = [...statusList].sort((a, b) => {
       
          if (a.id === 3) return 1;
          if (b.id === 3) return -1;
          return 0;
        });

        sortedStatus.forEach(status => {
          const key = status.id.toString();
          groups[key] = [];
          const color = getStatusColor(status.id);
          columns.push({
            id: key,
            title: status.nome,
            color: color
          });
        });
        break;

      case 'prioridade':
        prioridades.forEach(prioridade => {
          const key = prioridade.id.toString();
          groups[key] = [];
          columns.push({
            id: key,
            title: prioridade.nome,
            color: getPriorityColor(prioridade.nome)
          });
        });
        break;

      case 'responsavel':
        // sem responsável + responsáveis únicos dos tickets
        const responsaveis = new Set<string>();
        tickets.forEach(ticket => {
          if (ticket.userResponsavel) {
            responsaveis.add(`${ticket.userResponsavel.id}:${ticket.userResponsavel.name}`);
          }
        });

        groups['sem-responsavel'] = [];
        columns.push({
          id: 'sem-responsavel',
          title: 'Sem responsável',
          color: theme.text.tertiary
        });

        Array.from(responsaveis).forEach(resp => {
          const [id, name] = resp.split(':');
          groups[id] = [];
          columns.push({
            id: id,
            title: name,
            color: theme.brand.primary
          });
        });
        break;

      case 'departamento':
        departamentos.forEach(dept => {
          const key = dept.id.toString();
          groups[key] = [];
          columns.push({
            id: key,
            title: dept.name || dept.nome,
            color: theme.brand.primary
          });
        });
        break;

      case 'topico':
        topicosAjuda.forEach(topico => {
          const key = topico.id.toString();
          groups[key] = [];
          columns.push({
            id: key,
            title: topico.nome,
            color: theme.indicators.info
          });
        });
        break;
    }

    // distribui os tickets nos grupos
    tickets.forEach(ticket => {
  
      //filtrar cards concluidos quando o somenteAbertos esta ativado
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

    // ordenar tickets dentro de cada grupo pela posição do kanban
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].sort((a, b) => {
        // kanbanPositions pode ser um array de posições ou um objeto único
        let aPosition = 999999;
        let bPosition = 999999;

        // Extrair posição correta baseado no groupBy atual
        if (a.kanbanPositions) {
          if (Array.isArray(a.kanbanPositions)) {
            // Se for array, procurar a posição que corresponde ao agrupamento atual
            const posicaoA = a.kanbanPositions.find((p: any) => p.groupBy === groupBy);
            aPosition = posicaoA ? posicaoA.position : 999999;
          } else if (a.kanbanPositions.groupBy === groupBy) {
            // Se for objeto único, verificar se é do agrupamento correto
            aPosition = a.kanbanPositions.position;
          }
        }

        if (b.kanbanPositions) {
          if (Array.isArray(b.kanbanPositions)) {
            // Se for array, procurar a posição que corresponde ao agrupamento atual
            const posicaoB = b.kanbanPositions.find((p: any) => p.groupBy === groupBy);
            bPosition = posicaoB ? posicaoB.position : 999999;
          } else if (b.kanbanPositions.groupBy === groupBy) {
            // Se for objeto único, verificar se é do agrupamento correto
            bPosition = b.kanbanPositions.position;
          }
        }

        return aPosition - bPosition;
      });
    });

    // INSERIR GHOST PARA VISUALIZAÇÃO DE DRAG INTER-COLUNAS  MODOS NORMAIS
    if (dragOverInfo) {
      const { ticketId, targetColumn, overId } = dragOverInfo;
      let foundTicket: Chamado | null = null;

      for (const col of Object.keys(groups)) {
        const idx = groups[col].findIndex(t => t.id === ticketId);
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
          const targetIndex = groups[targetColumn].findIndex(t => t.id === overId);
          if (targetIndex !== -1) {
            groups[targetColumn].splice(targetIndex, 0, foundTicket);
          } else {
            groups[targetColumn].push(foundTicket);
          }
        }
      }
    }

    return { groups, columns };
  }, [tickets, groupBy, statusList, prioridades, departamentos, topicosAjuda, somenteAbertos, theme, dragOverInfo]);

  // estilos para o Select de agrupamento
  const getSelectStyles = () => {
    return {
      control: (base: any) => ({
        ...base,
        minHeight: '32px',
        height: '32px',
        backgroundColor: theme.background.surface,
        borderColor: theme.border.secondary,
        boxShadow: 'none',
        padding: '0 4px',
        '&:hover': {
          borderColor: theme.brand.primary,
        },
      }),
      menu: (base: any) => ({
        ...base,
        backgroundColor: theme.background.surface,
        borderColor: theme.border.secondary,
      }),
      menuList: (base: any) => ({
        ...base,
        backgroundColor: theme.background.surface,
        color: theme.text.primary,
        padding: '4px 0',
      }),
      option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected ? theme.brand.primary : (state.isFocused ? theme.background.hover : 'transparent'),
        color: state.isSelected ? 'white' : theme.text.primary,
        cursor: 'pointer',
        padding: '8px 12px',
      }),
      singleValue: (base: any) => ({
        ...base,
        color: theme.text.primary,
      }),
      input: (base: any) => ({
        ...base,
        color: theme.text.primary,
      }),
      placeholder: (base: any) => ({
        ...base,
        color: theme.text.tertiary,
      }),
      indicatorSeparator: () => ({
        display: 'none',
      }),
      dropdownIndicator: (base: any) => ({
        ...base,
        color: theme.text.primary,
        '&:hover': {
          color: theme.text.primary,
        },
      }),
    };
  };

  const handleGroupByChange = useCallback((option: GroupByOption | null) => {
    if (!option) return;

    // se é um quadro customizado (board_*)
    if (option.value.startsWith('board_')) {
      const boardId = parseInt(option.value.replace('board_', ''));
      setGroupBy('personalizada');
      setSelectedBoardId(boardId);
      localStorage.setItem('kanbanGroupBy', 'personalizada');
      localStorage.setItem('kanbanSelectedBoard', boardId.toString());
      selectBoard(boardId);
    } else {
      // agrupamento padrão
      setGroupBy(option.value);
      setSelectedBoardId(null);
      localStorage.setItem('kanbanGroupBy', option.value);
      localStorage.removeItem('kanbanSelectedBoard');
    }
  }, [selectBoard]);

  const getColumnValue = (columnId: string): string | null => {
    switch (groupBy) {
      case 'responsavel':
        return columnId === 'sem-responsavel' ? null : columnId;
      default:
        return columnId;
    }
  };

  // Helper para extrair posição correta baseado no groupBy atual
  const getPositionForGroupBy = (positions: any): number => {
    if (!positions) return 999999;
    
    if (Array.isArray(positions)) {
      const pos = positions.find((p: any) => p.groupBy === groupBy);
      return pos ? pos.position : 999999;
    } else if (positions.groupBy === groupBy) {
      return positions.position;
    }
    return 999999;
  };

  const moveTicket = useCallback(async (
    ticketId: number,
    targetColumn: string,
    newPosition: number = 1500,
    fromColumnId: string = ''
  ) => {

    const ticketToMove = tickets.find(t => t.id === ticketId);
    if (!ticketToMove) {
      console.error('❌ TICKET NAO ENCONTRADO:', ticketId);
      return;
    }

    // VALIDAR POSIÇÃO
    if (!Number.isFinite(newPosition) || newPosition < 1) {
      console.error('❌ POSIÇÃO INVALIDA:', newPosition);
      toast.error('Erro: posição inválida. Tente novamente.');
      return;
    }

    // GARANTIR QUE POSIÇÃO ESTÁ NO PADRÃO 1000+ (não valores como 156)
    const roundedPosition = Math.round(newPosition);
    if (roundedPosition < 1000 && groupBy === 'personalizada') {
      console.warn('⚠️ POSIÇÃO ABAIXO DE 1000:', roundedPosition, '→ ajustando para 1000');
    }

    const previousTickets = tickets;
    let columnValue: string | number | null = null;
    
    // GERAR ID UNICO PRA ESSE MOVIMENTO (para deduplicação no realtime)
    const moveId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Em modo personalizada, targetColumn é o columnId que precisa ser convertido para número
      if (groupBy === 'personalizada') {
        // Converter para número para colunas fixas
        if (targetColumn !== 'unassigned') {
          columnValue = parseInt(targetColumn, 10);
        } else {
          columnValue = null; // Para "unassigned"
        }
      } else {
        columnValue = getColumnValue(targetColumn);
      }

      // APENAS ATUALIZAR O TICKET MOVIDO
      const updatedTicket = { ...ticketToMove };

      // Preservar outras posições de kanban se já existirem
      const newPosObj = {
        groupBy,
        columnValue: columnValue?.toString() || null,
        position: roundedPosition
      };

      if (Array.isArray(ticketToMove.kanbanPositions)) {
        const existingIndex = ticketToMove.kanbanPositions.findIndex((p: any) => p.groupBy === groupBy);
        const newPositions = [...ticketToMove.kanbanPositions];
        if (existingIndex >= 0) {
          newPositions[existingIndex] = newPosObj;
        } else {
          newPositions.push(newPosObj);
        }
        updatedTicket.kanbanPositions = newPositions;
      } else if (ticketToMove.kanbanPositions && (ticketToMove.kanbanPositions as any).groupBy) {
        const currentPosObj = ticketToMove.kanbanPositions as any;
        if (currentPosObj.groupBy === groupBy) {
          updatedTicket.kanbanPositions = [newPosObj];
        } else {
          updatedTicket.kanbanPositions = [currentPosObj, newPosObj];
        }
      } else {
        updatedTicket.kanbanPositions = [newPosObj];
      }

      // Só atualizar campos se NÃO for personalizada
      if (groupBy !== 'personalizada') {
        switch (groupBy) {
          case 'status':
            const statusFound = statusList.find(s => s.id.toString() === targetColumn);
            if (statusFound) updatedTicket.status = statusFound;
            break;
          case 'prioridade':
            const prioridadeFound = prioridades.find(p => p.id.toString() === targetColumn);
            if (prioridadeFound) updatedTicket.tipoPrioridade = prioridadeFound;
            break;
          case 'responsavel':
            if (targetColumn === 'sem-responsavel') {
              updatedTicket.userResponsavel = null;
            } else {
              const userFound = usuarios.find(u => u.id.toString() === targetColumn);
              if (userFound) updatedTicket.userResponsavel = userFound;
            }
            break;
          case 'departamento':
            const deptFound = departamentos.find(d => d.id.toString() === targetColumn);
            if (deptFound) updatedTicket.departamento = deptFound;
            break;
          case 'topico':
            const topicoFound = topicosAjuda.find(t => t.id.toString() === targetColumn);
            if (topicoFound) updatedTicket.topicoAjuda = topicoFound;
            break;
        }
      }

      // ATUALIZAR APENAS ESTE TICKET VIA FUNÇÃO (Para evitar bugs de concorrência / overwrite local em drags rápidos)
      if (onTicketUpdate) {
        onTicketUpdate(ticketId, (prevTickets: Chamado[]) => 
          prevTickets.map(t => t.id === ticketId ? updatedTicket : t)
        );
      } else {
        console.warn('⚠️ onTicketUpdate não está definido');
      }

      const payload = {
        groupBy,
        columnValue: columnValue === null ? null : columnValue,
        position: roundedPosition,
        moveId,
        ...(groupBy === 'personalizada' && selectedBoardId && { boardId: selectedBoardId })
      };

      console.log('[BACKEND] Enviando:', {
        ticketId,
        position: roundedPosition,
        columnValue,
        groupBy,
      });

      // Guardar moveId para ignorar o próprio evento realtime depois
      setLastLocalMoveId(moveId);

      const response = await api.patch(`/chamados/${ticketId}/move`, payload);
      console.log('[BACKEND] OK - Ticket salvo!');
      toast.success('Chamado movido!');

    } catch (error: any) {
      console.error('[BACKEND] Erro:', error.response?.data?.message);

      // Reverter no frontend APENAS este ticket com o estado anterior via função
      if (onTicketUpdate) {
        onTicketUpdate(ticketId, (prevTickets: Chamado[]) => 
          prevTickets.map(t => t.id === ticketId ? ticketToMove : t)
        );
      }
      toast.error(
        error.response?.data?.message ||
        'Erro ao mover chamado'
      );
    }
  }, [tickets, groupBy, statusList, prioridades, departamentos, topicosAjuda, selectedBoardId, onTicketUpdate]);

  // handler para mover múltiplos cards selecionados
  const handleMoveAllCardsToColumn = useCallback(async (fromColumnId: string, toColumnId: string) => {
    try {
      // pegar cards selecionados
      if (selectedTickets.size === 0) {
        toast.error('Nenhum card selecionado para mover');
        return;
      }

      const cardsToMove = Array.from(selectedTickets);
      console.log(`📦 Movendo ${cardsToMove.length} cards de ${fromColumnId} para ${toColumnId}`);

      // para modo personalizada, calcular posições incrementadas
      const targetColumnTickets = ticketsByColumn[toColumnId] || [];
      let basePosition = targetColumnTickets.length > 0
        ? Math.max(...targetColumnTickets.map(t => getPositionForGroupBy(t.kanbanPositions))) + 1000
        : 1000;

      // mover cada card de forma sequencial
      let movedCount = 0;
      for (const ticketId of cardsToMove) {
        const position = basePosition + (movedCount * 1000);
        await moveTicket(ticketId, toColumnId, position, fromColumnId);
        movedCount++;
      }

      // limpar seleção após mover
      setSelectedTickets(new Set());
      console.log(` ${movedCount} cards movidos com sucesso!`);
      toast.success(`${movedCount} cards movidos com sucesso!`);
    } catch (error) {
      console.error('❌ Erro ao mover cards:', error);
      toast.error('Erro ao mover cards');
    }
  }, [selectedTickets, ticketsByColumn, moveTicket, getPositionForGroupBy]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const ticket = tickets.find(t => t.id === active.id);
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
    
    // descobrir qual a coluna de destino baseada no item alvo
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

  // fun helper para calcular posição entre dois tickets 
  // garante que sempre há um espaço válido
  const calcPositionBetweenTickets = (columnTickets: Chamado[], overIndex: number, currentGroupBy: string, activeTicketId: number): number => {
    // verificar se está movendo para baixo na mesma coluna
    const activeIndexOriginal = columnTickets.findIndex(t => t.id === activeTicketId);
    const isMovingDown = activeIndexOriginal !== -1 && activeIndexOriginal < overIndex;

    // filtrar o activeTicket do array da coluna para simular como a coluna ficará SEM ELE
    // isso é essencial para reordenação na MESMA COLUNA funcionar!
    const filteredTickets = columnTickets.filter(t => t.id !== activeTicketId);
    
    // opcionalmente, recalcular o overIndex se o overTicket não for o activeTicket
    // mas vamos simplesmente procurar quem é o overTicket (onde o mouse soltou os itens)
    const overTicket = columnTickets[overIndex];
    if (!overTicket) return 1000;

    // se soltou em si mesmo na mesma coluna
    if (overTicket.id === activeTicketId) {
      const currentPos = getPositionForGroupBy(overTicket.kanbanPositions);
      return currentPos !== 999999 ? currentPos : 1000;
    }

    const sortedTickets = [...filteredTickets].sort((a, b) => {
      const posA = getPositionForGroupBy(a.kanbanPositions);
      const posB = getPositionForGroupBy(b.kanbanPositions);
      const valA = posA !== 999999 ? posA : Number.MAX_SAFE_INTEGER;
      const valB = posB !== 999999 ? posB : Number.MAX_SAFE_INTEGER;
      return valA - valB;
    });

    const actualIndex = sortedTickets.findIndex(t => t.id === overTicket.id);

    if (actualIndex === -1) {
      // se não achou na lista filtrada (ex: se era o único item na coluna)
      return 1000;
    }

    const overPosValue = getPositionForGroupBy(overTicket.kanbanPositions) !== 999999 
      ? getPositionForGroupBy(overTicket.kanbanPositions) 
      : (actualIndex + 1) * 1000;

    let prevPosValue: number;
    let nextPosValue: number;

    if (isMovingDown) {
      // MOVENDO PRA BAIXO: Colocar DEPOIS do overTicket
      prevPosValue = overPosValue;
      const nextTicket = sortedTickets[actualIndex + 1];
      nextPosValue = nextTicket 
        ? (getPositionForGroupBy(nextTicket.kanbanPositions) !== 999999 ? getPositionForGroupBy(nextTicket.kanbanPositions) : overPosValue + 2000)
        : overPosValue + 2000; // Se não tiver ticket depois, soma 2000
    } else {
      // MOVENDO PRA CIMA: Colocar ANTES do overTicket
      nextPosValue = overPosValue;
      if (actualIndex === 0) {
        prevPosValue = 0; // Usado para forçar o recuo inicial
      } else {
        const prevTicket = sortedTickets[actualIndex - 1];
        prevPosValue = getPositionForGroupBy(prevTicket.kanbanPositions) !== 999999 
          ? getPositionForGroupBy(prevTicket.kanbanPositions) 
          : nextPosValue - 1000;
      }
    }

    if (prevPosValue === 0) {
      const newPos = Math.max(1000, Math.floor(nextPosValue / 2));
      return newPos >= nextPosValue ? nextPosValue - 100 : newPos;
    }

    if (prevPosValue >= nextPosValue) {
      return prevPosValue + 1000;
    }

    return Math.floor((prevPosValue + nextPosValue) / 2);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDragOverInfo(null); // Lipar placeholder imediatamente

    const { active, over } = event;
    setActiveTicket(null);

    if (!over) {
      console.warn('⚠️ DROP SEM ZONA VALIDA');
      return;
    }

    const ticketId = active.id as number;
    const ticket = tickets.find(t => t.id === ticketId);
    
    if (!ticket) {
      console.warn('⚠️ TICKET NAO ENCONTRADO:', ticketId);
      return;
    }

    // modo personalizada
    if (groupBy === 'personalizada') {
      let targetColumnId: string | null = null;
      let newPosition: number = 1000;

      // VERIFICAR SE DROPOU EM UMA COLUNA VAZIA OU NAO 
      const isValidColumn = over.id === 'unassigned' || columns.some(col => col.id.toString() === over.id);

      if (isValidColumn) {
        // dropou na coluna
        targetColumnId = over.id as string;
        const columnTickets = ticketsByColumn[targetColumnId] || [];
        const filteredTickets = columnTickets.filter(t => t.id !== ticketId);

        if (filteredTickets.length === 0) {
          newPosition = 1000;
        } else {
          // colocar no final da coluna
          const lastTicket = filteredTickets[filteredTickets.length - 1];
          const lastPos = getPositionForGroupBy(lastTicket.kanbanPositions);
          const lastPositionValue = lastPos !== 999999 ? lastPos : filteredTickets.length * 1000;
          newPosition = lastPositionValue + 1000;
        }
      } else {
        // dropou sobre um ticket específico
        let foundTicket = false;

        // procurar em todas as colunas
        for (const col of columns) {
          const colId = col.id.toString();
          const columnTickets = ticketsByColumn[colId] || [];
          const targetIndex = columnTickets.findIndex(t => t.id === over.id);

          if (targetIndex !== -1) {
            targetColumnId = colId;
            newPosition = calcPositionBetweenTickets(columnTickets, targetIndex, groupBy, ticketId);
            foundTicket = true;
            break;
          }
        }

        // procurar em "unassigned"
        if (!foundTicket) {
          const unassignedTickets = ticketsByColumn['unassigned'] || [];
          const targetIndex = unassignedTickets.findIndex(t => t.id === over.id);

          if (targetIndex !== -1) {
            targetColumnId = 'unassigned';
            newPosition = calcPositionBetweenTickets(unassignedTickets, targetIndex, groupBy, ticketId);
            foundTicket = true;
          }
        }

        if (!foundTicket) {
          console.warn('⚠️ Ticket alvo não encontrado:', over.id);
          return;
        }
      }

      if (!targetColumnId) return;
      moveTicket(ticketId, targetColumnId, newPosition, '');
      return;
    }

    // ===== MODO NORMAL (status, prioridade, etc) =====
    let targetColumnId: string | null = null;
    let newPosition: number = 1000;

    // verificar se dropou em uma coluna
    const isValidColumn = groupedTickets.columns.some(col => col.id === over.id);

    if (isValidColumn) {
      // dropou na coluna
      targetColumnId = over.id as string;
      const columnTickets = groupedTickets.groups[targetColumnId] || [];
      const filteredTickets = columnTickets.filter(t => t.id !== ticketId);

      if (filteredTickets.length === 0) {
        newPosition = 1000;
      } else {
        // Colocar no final da coluna
        const lastTicket = filteredTickets[filteredTickets.length - 1];
        const lastPos = getPositionForGroupBy(lastTicket.kanbanPositions);
        const lastPositionValue = lastPos !== 999999 ? lastPos : filteredTickets.length * 1000;
        newPosition = lastPositionValue + 1000;
      }
    } else {
      //dropou sobre outro ticket
      let foundTicket = false;

      for (const columnId of Object.keys(groupedTickets.groups)) {
        const columnTickets = groupedTickets.groups[columnId];
        const targetIndex = columnTickets.findIndex(t => t.id === over.id);

        if (targetIndex !== -1 && over.id !== ticketId) {
          targetColumnId = columnId;
          newPosition = calcPositionBetweenTickets(columnTickets, targetIndex, groupBy, ticketId);
          foundTicket = true;
          break;
        }
      }

      if (!foundTicket) {
        console.warn('⚠️ TICKET ALVO NAO ENCONTRADO:', over.id);
        return;
      }
    }

    if (!targetColumnId) {
      console.warn('⚠️ COLUNA DE DESTINO NAO IDENTIFICADA');
      return;
    }

    moveTicket(ticketId, targetColumnId, newPosition, '');
  }, [tickets, groupBy, columns, ticketsByColumn, groupedTickets, moveTicket]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
      {/* seletor de agrupamento */}
      <div className="mb-6 flex justify-between items-center gap-6" style={{ paddingBottom: '12px', borderBottomColor: theme.border.secondary, borderBottomWidth: '1px' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>
              Exibir por
            </span>
            <div className="flex items-center gap-2">
              <div className="w-56">
                <Select
                  value={
                    groupBy === 'personalizada' && selectedBoard
                      ? allGroupByOptions.find(opt => opt.value === `board_${selectedBoard.id}`)
                      : allGroupByOptions.find(opt => opt.value === groupBy)
                  }
                  onChange={handleGroupByChange}
                  options={allGroupByOptions}
                  placeholder="Selecionar..."
                  isSearchable={false}
                  styles={getSelectStyles()}
                />
              </div>
              {/* Botão para criar novo quadro */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCreateBoardModalOpen(true)}
                className="p-1.5 rounded-md transition-all duration-200 hover:opacity-80 flex items-center justify-center shadow-sm"
                style={{
                  backgroundColor: theme.background.hover,
                  color: theme.brand.primary,
                }}
                title="Criar novo quadro"
              >
                <FiPlus className="w-4.5 h-4.5" strokeWidth={3} />
              </motion.button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pl-6" style={{ borderLeftColor: theme.border.secondary, borderLeftWidth: '1px' }}>
            <span className="text-sm" style={{ color: theme.text.secondary }}>
              Não mostrar concluídos
            </span>
            <button
              type="button"
              onClick={() => setSomenteAbertos(!somenteAbertos)}
              className="relative w-11 h-6 rounded-full transition-all duration-200"
              style={{
                backgroundColor: somenteAbertos ? theme.brand.primary : theme.border.secondary,
              }}
            >
              <span
                className="absolute top-1 left-1 w-4 h-4 rounded-full shadow-sm transition-transform duration-200"
                style={{
                  backgroundColor: 'white',
                  transform: somenteAbertos ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>

            {/* botao de recarergar chamados */}
            <div className="border-l" style={{ borderLeftColor: theme.border.secondary, height: '24px', margin: '0 8px' }}></div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg transition-all duration-200 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isRefreshing ? theme.brand.primary : 'transparent',
                color: isRefreshing ? 'white' : theme.text.secondary,
              }}
              title="Recarregar chamados"
            >
              <FiRefreshCw 
                className={`w-4 h-4 ${ isRefreshing ? 'animate-spin' : ''}`}
                strokeWidth={2.5}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm" style={{ color: theme.text.secondary }}>
          <span>{tickets.length}</span>
          <span>Registros</span>
        </div>
      </div>

      {/* quadro estilo kanban */}
      {groupBy === 'personalizada' ? (
        // Renderizar boards customizados
        selectedBoard ? (
          // Board com coluna dinâmica "Tickets sem coluna" + colunas fixas
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {/* Colunas */}
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
              <AnimatePresence>
                {/* Coluna dinâmica - Tickets sem coluna (apenas se houver tickets) */}
                {ticketsByColumn['unassigned']?.length > 0 && (
                  <div key="unassigned">
                    <KanbanColumn
                      id="unassigned"
                      title="Tickets sem coluna"
                      color={theme.border.secondary}
                      tickets={ticketsByColumn['unassigned'] || []}
                      onTicketClick={onTicketClick}
                      groupBy="personalizada"
                      columnValue="unassigned"
                      selectedTickets={selectedTickets}
                      onTicketSelect={handleTicketSelect}
                      onSelectAll={handleSelectAllCardsInColumn}
                      onMoveAllCards={(toColumnId) => handleMoveAllCardsToColumn('unassigned', toColumnId)}
                      availableColumns={columns.map(col => ({ id: col.id.toString(), nome: col.nome }))}
                      isSpecialColumn={true}
                    />
                  </div>
                )}

                {/* Colunas fixas personalizadas */}
                {columns.map((column) => (
                  <div key={column.id}>
                    <KanbanColumn
                      id={column.id.toString()}
                      title={column.nome}
                      color={theme.brand.primary}
                      tickets={ticketsByColumn[column.id.toString()] || []}
                      onTicketClick={onTicketClick}
                      groupBy="personalizada"
                      columnValue={column.id.toString()}
                      selectedTickets={selectedTickets}
                      onTicketSelect={handleTicketSelect}
                      onSelectAll={handleSelectAllCardsInColumn}
                      onDeleteColumn={() => handleDeleteColumn(column.id.toString())}
                      onRenameColumn={(newName) => handleRenameColumn(column.id.toString(), newName)}
                      onMoveAllCards={(toColumnId) => handleMoveAllCardsToColumn(column.id.toString(), toColumnId)}
                      availableColumns={columns.filter(c => c.id !== column.id).map(c => ({ id: c.id.toString(), nome: c.nome }))}
                    />
                  </div>
                ))}
              </AnimatePresence>

              {/* Botão para adicionar coluna - do lado da última coluna */}
              <AnimatePresence mode="wait">
                {!isAddingColumn ? (
                  <motion.button
                    key="add-button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    whileHover={{ scale: 1.0, backgroundColor: 'rgba(107, 114, 128, 0.15)' }}
                    onClick={() => setIsAddingColumn(true)}
                    disabled={boardLoading}
                    className="min-w-80 h-fit px-5 py-3 rounded-lg border flex flex-col items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 shrink-0"
                    style={{
                      borderColor: 'rgba(107, 114, 128, 0.3)',
                      color: theme.text.tertiary,
                      backgroundColor: 'rgba(107, 114, 128, 0.08)',
                    }}
                  >
                    <span className="text-sm">+ Nova coluna</span>
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
                        if (e.key === 'Enter') {
                          handleColumnInputSubmit();
                        } else if (e.key === 'Escape') {
                          handleCancelColumnEdit();
                        }
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
                        onClick={handleColumnInputSubmit}
                        disabled={!newColumnName.trim() || boardLoading}
                        className="flex-1 px-3 py-2 rounded font-medium text-sm text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: theme.brand.primary,
                        }}
                      >
                        Criar
                      </button>
                      <button
                        onClick={handleCancelColumnEdit}
                        disabled={boardLoading}
                        className="flex-1 px-3 py-2 rounded font-medium text-sm transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          borderColor: theme.border.secondary,
                          color: theme.text.secondary,
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <DragOverlay dropAnimation={{
              duration: 250,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
            }}>
              {activeTicket ? (
                <div style={{ transform: 'rotate(2deg) scale(1.03)', opacity: 0.95, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', borderRadius: '0.5rem', zIndex: 9999 }}>
                  <TicketCard chamado={activeTicket} isDragging={true} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          // Sem board selecionado
          <EmptyBoardState
            hasBoard={false}
            boardName=""
            onCreateBoard={() => setIsCreateBoardModalOpen(true)}
            onCreateColumn={() => setIsAddingColumn(true)}
            isLoading={boardLoading}
          />
        )
      ) : (
        // Renderizar boards dinâmicos (agrupamento normal)
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
            <AnimatePresence>
              {groupedTickets.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  tickets={groupedTickets.groups[column.id] || []}
                  onTicketClick={onTicketClick}
                  groupBy={groupBy}
                  columnValue={getColumnValue(column.id) || ''}
                  selectedTickets={selectedTickets}
                  onTicketSelect={handleTicketSelect}
                />
              ))}
            </AnimatePresence>
            </div>

            <DragOverlay dropAnimation={{
              duration: 250,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
            }}>
              {activeTicket ? (
                <div style={{ transform: 'rotate(2deg) scale(1.03)', opacity: 0.95, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', borderRadius: '0.5rem', zIndex: 9999 }}>
                  <TicketCard chamado={activeTicket} isDragging={true} />
                </div>
              ) : null}
            </DragOverlay>

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
                  <p style={{ color: theme.text.tertiary }}>use os filtros para buscar chamados ou crie um novo.</p>
                </div>
              </motion.div>
            )}
        </DndContext>
      )}

      {/* modal de confirmação de deletar coluna */}
      <AnimatePresence>
        {deleteConfirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
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
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
                Deletar coluna?
              </h3>
              <p className="mb-6 text-sm" style={{ color: theme.text.secondary }}>
                Tem certeza que deseja deletar esta coluna? Caso tenha tickets nesta coluna, eles serão movidos para "Tickets sem coluna".
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 rounded font-medium text-sm text-white transition-all"
                  style={{
                    backgroundColor: '#EF4444',
                  }}
                >
                  Deletar
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-2 rounded font-medium text-sm transition-all border"
                  style={{
                    borderColor: theme.border.secondary,
                    color: theme.text.secondary,
                  }}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <CreateBoardModal
        isOpen={isCreateBoardModalOpen}
        onClose={() => setIsCreateBoardModalOpen(false)}
        onSubmit={handleCreateBoard}
        isLoading={boardLoading}
      />
    </motion.div>
  );
};

export default KanbanView;