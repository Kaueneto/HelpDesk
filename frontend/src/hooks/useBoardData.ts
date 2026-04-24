import { useState, useCallback, useEffect } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';

export interface Board {
  id: number;
  nome: string;
  tipo: 'dinamico' | 'custom';
  agrupamento?: string;
  idDepartamento: number;
  ativo: boolean;
  criadoPor: {
    id: number;
    name: string;
  };
  criadoEm: string;
  atualizadoEm: string;
}

export interface Column {
  id: number;
  boardId: number;
  nome: string;
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Card {
  id: number;
  boardId: number;
  columnId: number | null;
  idChamado: number;
  posicao: number;
  criadoEm: string;
  atualizadoEm: string;
  board?: {
    id: number;
  };
  column?: {
    id: number;
  } | null;
  chamado?: {
    id: number;
  };
}

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeCard = (card: any): Card => ({
  ...card,
  id: Number(card.id),
  boardId: toNumberOrUndefined(card.boardId ?? card.board?.id) ?? 0,
  columnId:
    card.columnId === null
      ? null
      : toNumberOrUndefined(card.columnId ?? card.column?.id) ?? null,
  idChamado: toNumberOrUndefined(card.idChamado ?? card.chamado?.id) ?? 0,
  posicao: Number(card.posicao ?? 1000),
});

interface UseBoardDataReturn {
  boards: Board[];
  selectedBoard: Board | null;
  columns: Column[];
  cards: Card[];
  loading: boolean;
  error: string | null;
  
  // Board operations
  createBoard: (nome: string, idDepartamento: number) => Promise<Board | null>;
  selectBoard: (boardId: number) => Promise<void>;
  deleteBoard: (boardId: number) => Promise<void>;
  updateBoard: (boardId: number, updates: Partial<Board>) => Promise<void>;
  
  // Column operations
  createColumn: (nome: string) => Promise<Column | null>;
  updateColumn: (columnId: number, nome: string) => Promise<void>;
  deleteColumn: (columnId: number) => Promise<void>;
  removeColumnLocal: (columnId: number) => void;
  reorderColumns: (columnIds: number[]) => Promise<void>;
  
  // Card operations
  addCardToColumn: (columnId: number | null, chamadoId: number, posicao?: number) => Promise<Card | null>;
  moveCard: (cardId: number, columnId: number | null, posicao: number) => Promise<void>;
  removeCard: (cardId: number) => Promise<void>;
}

export const useBoardData = (idDepartamento: number): UseBoardDataReturn => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar boards do departamento
  const loadBoards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/boards/departamento/${idDepartamento}`);
      const customBoards = response.data.data.filter((b: Board) => b.tipo === 'custom');
      setBoards(customBoards);
      
      return customBoards;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Erro ao carregar boards';
      setError(errorMsg);
      toast.error(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [idDepartamento]);

  // Carregar colunas do board selecionado
  const loadColumns = useCallback(async (boardId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/boards/${boardId}/columns`);
      setColumns(response.data.data);
      
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Erro ao carregar colunas';
      setError(errorMsg);
      toast.error(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar cards do board selecionado
  const loadCards = useCallback(async (boardId: number) => {
    try {
        const response = await api.get(`/boards/${boardId}/cards`);
        const normalizedCards = response.data.data
          .map(normalizeCard)
          .filter((card: Card) => card.id > 0 && card.idChamado > 0);
        setCards(normalizedCards);
        return normalizedCards;
    } catch (err: any) {
      console.error('Erro ao carregar cards:', err);
      return [];
    }
  }, []);

  // Criar novo board customizado
  const createBoard = useCallback(
    async (nome: string, departamentoId?: number): Promise<Board | null> => {
      try {
        setLoading(true);
        setError(null);

        const payload = {
          nome,
          idDepartamento: departamentoId || idDepartamento,
          tipo: 'custom' as const,
        };

        const response = await api.post('/boards', payload);
        const newBoard = response.data.data;  // Acessa o campo "data" da resposta

        setBoards((prev) => [...prev, newBoard]);
        setSelectedBoard(newBoard);
        
        // Carregar colunas e cards vazios
        await loadColumns(newBoard.id);
        await loadCards(newBoard.id);

        toast.success(`Board "${nome}" criado com sucesso!`);
        return newBoard;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao criar board';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [idDepartamento, loadColumns, loadCards]
  );

  // Selecionar board
  const selectBoard = useCallback(
    async (boardId: number) => {
      try {
        setLoading(true);
        setError(null);

        const board = boards.find((b) => b.id === boardId);
        if (!board) {
          throw new Error('Board não encontrado');
        }

        setSelectedBoard(board);
        await loadColumns(boardId);
        await loadCards(boardId);
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao selecionar board';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [boards, loadColumns, loadCards]
  );

  // Deletar board
  const deleteBoard = useCallback(
    async (boardId: number) => {
      try {
        setLoading(true);
        setError(null);

        await api.delete(`/boards/${boardId}`);

        setBoards((prev) => prev.filter((b) => b.id !== boardId));
        if (selectedBoard?.id === boardId) {
          setSelectedBoard(null);
          setColumns([]);
          setCards([]);
        }

        toast.success('Board deletado com sucesso!');
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao deletar board';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [selectedBoard]
  );

  // Atualizar board
  const updateBoard = useCallback(
    async (boardId: number, updates: Partial<Board>) => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.patch(`/boards/${boardId}`, updates);
        const updatedBoard = response.data.data;

        setBoards((prev) =>
          prev.map((b) => (b.id === boardId ? updatedBoard : b))
        );
        if (selectedBoard?.id === boardId) {
          setSelectedBoard(updatedBoard);
        }

        toast.success('Board atualizado!');
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao atualizar board';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [selectedBoard]
  );

  // Criar coluna
  const createColumn = useCallback(
    async (nome: string): Promise<Column | null> => {
      if (!selectedBoard) {
        toast.error('Nenhum board selecionado');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const payload = {
          nome,
          ordem: columns.length + 1,
        };

        const response = await api.post(
          `/boards/${selectedBoard.id}/columns`,
          payload
        );
        const newColumn = response.data.data;

        setColumns((prev) => [...prev, newColumn]);
        toast.success(`Coluna "${nome}" criada!`);
        return newColumn;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao criar coluna';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [selectedBoard, columns.length]
  );

  // Atualizar coluna
  const updateColumn = useCallback(
    async (columnId: number, nome: string) => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.patch(`/columns/${columnId}`, { nome });
        const updatedColumn = response.data.data;

        setColumns((prev) =>
          prev.map((c) => (c.id === columnId ? updatedColumn : c))
        );

        toast.success('Coluna atualizada!');
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao atualizar coluna';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Deletar coluna
  const deleteColumn = useCallback(
    async (columnId: number) => {
      try {
        setLoading(true);
        setError(null);

        await api.delete(`/columns/${columnId}`);
        setColumns((prev) => prev.filter((c) => c.id !== columnId));
        setCards((prev) =>
          prev.filter((card) => card.columnId !== columnId)
        );

        toast.success('Coluna deletada!');
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao deletar coluna';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Reordenar colunas
  const reorderColumns = useCallback(
    async (columnIds: number[]) => {
      if (!selectedBoard) return;

      try {
        setLoading(true);
        setError(null);

        const payload = {
          columnIds,
        };

        await api.post(
          `/boards/${selectedBoard.id}/columns/reorder`,
          payload
        );

        // Atualizar localmente a ordem
        const updatedColumns = columns.map((col, idx) => ({
          ...col,
          ordem: idx + 1,
        }));
        setColumns(updatedColumns);

        toast.success('Colunas reordenadas!');
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao reordenar colunas';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [selectedBoard, columns]
  );

  // Adicionar card à coluna
  const addCardToColumn = useCallback(
    async (columnId: number | null, chamadoId: number, posicao: number = 1000): Promise<Card | null> => {
      if (!selectedBoard) {
        toast.error('Nenhum board selecionado');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const payload = {
          columnId,
          chamadoId,
          posicao,
        };

        const response = await api.post(
          `/boards/${selectedBoard.id}/cards`,
          payload
        );
        const newCard = normalizeCard(response.data.data);

        setCards((prev) => [...prev, newCard]);
        await loadCards(selectedBoard.id);
        toast.success('Card adicionado!');
        return newCard;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao adicionar card';
        setError(errorMsg);
        toast.error(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedBoard, loadCards]
  );

  // Mover card
  const moveCard = useCallback(
    async (cardId: number, columnId: number | null, posicao: number) => {
      if (!selectedBoard) {
        toast.error('Nenhum board selecionado');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const payload = {
          boardId: selectedBoard.id,
          novaColumnId: columnId,
          novaPosition: posicao,
        };

        const response = await api.patch(`/cards/${cardId}/move`, payload);
        const updatedCard = normalizeCard(response.data.data);

        setCards((prev) =>
          prev.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  ...updatedCard,
                  boardId: selectedBoard.id,
                  columnId,
                  idChamado: updatedCard.idChamado ?? c.idChamado,
                }
              : c
          )
        );
        await loadCards(selectedBoard.id);
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao mover card';
        setError(errorMsg);
        toast.error(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedBoard, loadCards]
  );

  // Remover card
  const removeCard = useCallback(
    async (cardId: number) => {
      try {
        setLoading(true);
        setError(null);

        await api.delete(`/cards/${cardId}`);
        setCards((prev) => prev.filter((c) => c.id !== cardId));

        toast.success('Card removido!');
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao remover card';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // remover coluna do estado local (sem chamada à API) - usado para WebSocket
  const removeColumnLocal = useCallback(
    (columnId: number) => {
      console.log(`removendo coluna ${columnId} do estado local (WebSocket)`);
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setCards((prev) => prev.filter((card) => card.columnId !== columnId));
    },
    []
  );

  // Carregar boards ao montar
  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  return {
    boards,
    selectedBoard,
    columns,
    cards,
    loading,
    error,
    createBoard,
    selectBoard,
    deleteBoard,
    updateBoard,
    createColumn,
    updateColumn,
    deleteColumn,
    removeColumnLocal,
    reorderColumns,
    addCardToColumn,
    moveCard,
    removeCard,
  };
};
