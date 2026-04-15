"use client";

import { useMemo, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  rectIntersection,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import toast from 'react-hot-toast';
import { FiRefreshCw } from 'react-icons/fi';
import { useTheme } from '@/contexts/ThemeContext';
import KanbanColumn from './KanbanColumn';
import TicketCard from './TicketCard';
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
}

// Opções de agrupamento
const groupByOptions: GroupByOption[] = [
  { value: 'status', label: 'Status' },
  { value: 'prioridade', label: 'Prioridade' },
  { value: 'responsavel', label: 'Responsável' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'topico', label: 'Tópico' },
];

const KanbanView = ({
  tickets,
  onTicketClick,
  onTicketUpdate,
  onRefresh,
  departamentos = [],
  statusList = [],
  prioridades = [],
  usuarios = [],
  topicosAjuda = []
}: KanbanViewProps) => {
  const { theme } = useTheme();
  const [groupBy, setGroupBy] = useState<string>(() => {
    return localStorage.getItem('kanbanGroupBy') || 'status';
  });

  const [activeTicket, setActiveTicket] = useState<Chamado | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<number>>(new Set());

  // Helper para obter cor baseado em statusId
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

  const handleTicketSelect = (ticketId: number, selected: boolean) => {
    const newSelected = new Set(selectedTickets);
    if (selected) {
      newSelected.add(ticketId);
    } else {
      newSelected.delete(ticketId);
    }
    setSelectedTickets(newSelected);
  };
const [somenteAbertos, setSomenteAbertos] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
          targetGroup = ticket.status.id.toString();
          break;
        case 'prioridade':
          targetGroup = ticket.tipoPrioridade.id.toString();
          break;
        case 'responsavel':
          targetGroup = ticket.userResponsavel
            ? ticket.userResponsavel.id.toString()
            : 'sem-responsavel';
          break;
        case 'departamento':
          targetGroup = ticket.departamento.id.toString();
          break;
        case 'topico':
          targetGroup = ticket.topicoAjuda.id.toString();
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

    return { groups, columns };
  }, [tickets, groupBy, statusList, prioridades, departamentos, topicosAjuda, somenteAbertos, theme]);

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

    setGroupBy(option.value);
    localStorage.setItem('kanbanGroupBy', option.value);
  }, []);

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

  const moveTicket = async (
    ticketId: number,
    targetColumn: string,
    newPosition: number = 1500,
    fromColumnId: string = ''
  ) => {

    // find  o ticket que será movido
    const ticketToMove = tickets.find(t => t.id === ticketId);
    if (!ticketToMove) {

      return;
    }

    // backup do estado anterior (para rollback se falhar)
    const previousTickets = tickets;

    try {
      const columnValue = getColumnValue(targetColumn);
   

      //  optmistic update - atualizar ui imediatamente
      const updatedTickets = tickets.map(ticket => {
        if (ticket.id !== ticketId) return ticket;

        const updatedTicket = { ...ticket };

        // Atualizar a posição do kanban
        updatedTicket.kanbanPositions = {
          groupBy,
          columnValue: columnValue || null,
          position: newPosition
        };

        // Atualizar os campos com base no groupBy
        switch (groupBy) {
          case 'status':
            const statusFound = statusList.find(s => s.id.toString() === targetColumn);
            if (statusFound) {

              updatedTicket.status = statusFound;
            }
            break;
          case 'prioridade':
            const prioridadeFound = prioridades.find(p => p.id.toString() === targetColumn);
            if (prioridadeFound) {
              updatedTicket.tipoPrioridade = prioridadeFound;
            }
            break;
          case 'responsavel':
            if (targetColumn === 'sem-responsavel') {
              updatedTicket.userResponsavel = null;
            } else {
              const userFound = usuarios.find(u => u.id.toString() === targetColumn);
              if (userFound) {
                updatedTicket.userResponsavel = userFound;
              }
            }
            break;
          case 'departamento':
            const deptFound = departamentos.find(d => d.id.toString() === targetColumn);
            if (deptFound) {
              updatedTicket.departamento = deptFound;
            }
            break;
          case 'topico':
            const topicoFound = topicosAjuda.find(t => t.id.toString() === targetColumn);
            if (topicoFound) {
              updatedTicket.topicoAjuda = topicoFound;
            }
            break;
        }

        return updatedTicket;
      });

      // Atualizar tickets localmente (UI fica fluida)

      if (onTicketUpdate) {
        onTicketUpdate(ticketId, updatedTickets);
      } else {
        console.warn('⚠️ onTicketUpdate não está definido');
      }

      // fazer a request pro backend SEM bloquear a UI
      const payload = {
        groupBy,
        columnValue: columnValue === null ? null : columnValue,
        position: newPosition
      };

      const response = await api.patch(`/chamados/${ticketId}/move`, payload);
      toast.success('Chamado movido!');

    } catch (error: any) {
      // se falhar, reverter para o estado anterior
      if (onTicketUpdate) {
        onTicketUpdate(ticketId, previousTickets);
      }
      toast.error(
        error.response?.data?.message ||
        'Erro ao mover chamado'
      );
      console.error('Erro ao mover chamado:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticket = tickets.find(t => t.id === active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Pode adicionar feedback visual aqui se necessário
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) {
      console.warn('⚠️ Drop sem zona válida');
      return;
    }

    const ticketId = active.id as number;

    let targetColumnId: string | null = null;
    let fromColumnId: string | null = null;
    let newPosition: number = 1000;


    // Encontrar a coluna de origem
    for (const columnId of Object.keys(groupedTickets.groups)) {
      if (groupedTickets.groups[columnId].find(t => t.id === ticketId)) {
        fromColumnId = columnId;
        break;
      }
    }

    // Verificar se foi dropado sobre outro card
    let overTicket: Chamado | null = null;
    for (const columnId of Object.keys(groupedTickets.groups)) {
      const foundTicket = groupedTickets.groups[columnId].find(t => t.id === over.id);
      if (foundTicket && over.id !== ticketId) {
        overTicket = foundTicket;
        targetColumnId = columnId;
        break;
      }
    }

    // Se dropou sobre um card, calcular posição entre cards adjacentes
    if (overTicket && targetColumnId) {
      const columnTickets = groupedTickets.groups[targetColumnId];
      const overIndex = columnTickets.findIndex(t => t.id === over.id);

      // Obter as posições dos cards adjacentes
      const overPosition = getPositionForGroupBy(overTicket.kanbanPositions);
      const calculatedOverPosition = overPosition !== 999999 ? overPosition : (overIndex + 1) * 1000;

      // Se for o primeiro card, colocar antes dele
      if (overIndex === 0) {
        newPosition = Math.max(calculatedOverPosition - 500, 100);
      } else {
        // Pegar o card anterior
        const previousTicket = columnTickets[overIndex - 1];
        const previousPos = getPositionForGroupBy(previousTicket.kanbanPositions);
        const previousPosition = previousPos !== 999999 ? previousPos : overIndex * 1000;

        // Calcular posição média entre o anterior e o atual
        newPosition = Math.floor((previousPosition + calculatedOverPosition) / 2);

        // Garantir que não seja igual a nenhum dos dois
        if (newPosition === previousPosition || newPosition === overPosition) {
          newPosition = previousPosition + 500;
        }
      }
    } else {
      // Dropou na coluna vazia ou no final
      targetColumnId = over.id as string;

      if (groupedTickets.groups[targetColumnId] !== undefined) {
        const columnTickets = groupedTickets.groups[targetColumnId];

        if (columnTickets.length === 0) {
          // Coluna vazia
          newPosition = 1000;
        } else {
          // Colocar no final - pegar a maior posição e adicionar
          const lastTicket = columnTickets[columnTickets.length - 1];
          const lastPos = getPositionForGroupBy(lastTicket.kanbanPositions);
          const lastPosition = lastPos !== 999999 ? lastPos : columnTickets.length * 1000;

          newPosition = lastPosition + 1000;
        }

      } else {
        return;
      }
    }

    if (!targetColumnId) {
      return;
    }

    // Move o ticket
    moveTicket(ticketId, targetColumnId, newPosition, fromColumnId || '');
  };

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
            <div className="w-56">
              <Select
                value={groupByOptions.find(opt => opt.value === groupBy)}
                onChange={handleGroupByChange}
                options={groupByOptions}
                placeholder="Selecionar..."
                isSearchable={false}
                styles={getSelectStyles()}
              />
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
          <span>chamados</span>
        </div>
      </div>

      {/* quadro estilo kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
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

        <DragOverlay>
          {activeTicket ? (
            <TicketCard chamado={activeTicket} isDragging={true} />
          ) : null}
        </DragOverlay>
      </DndContext>

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
    </motion.div>
  );
};

export default KanbanView;