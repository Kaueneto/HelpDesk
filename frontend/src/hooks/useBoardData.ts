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
  columnId: number;
  idChamado: number;
  posicao: number;
  criadoEm: string;
  atualizadoEm: string;
}

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
  reorderColumns: (columnIds: number[]) => Promise<void>;
  
  // Card operations
  addCardToColumn: (columnId: number, chamadoId: number) => Promise<Card | null>;
  moveCard: (cardId: number, columnId: number, posicao: number) => Promise<void>;
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
      setCards(response.data.data);
      return response.data.data;
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
    async (columnId: number, chamadoId: number): Promise<Card | null> => {
      if (!selectedBoard) {
        toast.error('Nenhum board selecionado');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const payload = {
          columnId,
          idChamado: chamadoId,
          posicao: 1000,
        };

        const response = await api.post(
          `/boards/${selectedBoard.id}/cards`,
          payload
        );
        const newCard = response.data.data;

        setCards((prev) => [...prev, newCard]);
        toast.success('Card adicionado!');
        return newCard;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao adicionar card';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [selectedBoard]
  );

  // Mover card
  const moveCard = useCallback(
    async (cardId: number, columnId: number, posicao: number) => {
      try {
        setLoading(true);
        setError(null);

        const payload = {
          columnId,
          posicao,
        };

        const response = await api.patch(`/cards/${cardId}/move`, payload);
        const updatedCard = response.data.data;

        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? updatedCard : c))
        );
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Erro ao mover card';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
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
    reorderColumns,
    addCardToColumn,
    moveCard,
    removeCard,
  };
};
