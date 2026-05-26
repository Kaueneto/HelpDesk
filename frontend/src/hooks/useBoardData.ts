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
  board?: { id: number };
  column?: { id: number } | null;
  chamado?: { id: number };
}

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
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
  createBoard: (nome: string, idDepartamento: number) => Promise<Board | null>;
  selectBoard: (boardId: number) => Promise<void>;
  deleteBoard: (boardId: number) => Promise<void>;
  updateBoard: (boardId: number, updates: Partial<Board>) => Promise<void>;
  createColumn: (nome: string) => Promise<Column | null>;
  updateColumn: (columnId: number, nome: string) => Promise<void>;
  deleteColumn: (columnId: number) => Promise<void>;
  removeColumnLocal: (columnId: number) => void;
  reorderColumns: (columnIds: number[]) => Promise<void>;
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

  // 🔑 Chave para localStorage baseada no departamento
  const storageKey = `selectedBoard_dept_${idDepartamento}`;

  // ⚡ Restaurar selectedBoardId do localStorage ao carregar o hook
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBoardId = localStorage.getItem(storageKey);
      if (savedBoardId) {
        const boardId = parseInt(savedBoardId, 10);
        console.log(`🔄 [STORAGE] Restaurando board ${boardId} do localStorage`);
        // Será carregado após loadBoards
      }
    }
  }, [storageKey]);


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
        const newBoard = response.data.data;
        setBoards((prev) => [...prev, newBoard]);
        setSelectedBoard(newBoard);
        // 💾 Salvar novo board no localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, newBoard.id.toString());
          console.log(`💾 [STORAGE] Novo board criado e selecionado: ${newBoard.nome}`);
        }
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

  // ✅ Corrigido: busca o board na API se não estiver no estado local ainda
  const selectBoard = useCallback(
    async (boardId: number) => {
      try {
        setLoading(true);
        setError(null);

        let board = boards.find((b) => b.id === boardId) || null;

        if (!board) {
          const response = await api.get(`/boards/${boardId}`);
          board = response.data.data;
          if (board) {
            setBoards((prev) =>
              prev.some((b) => b.id === boardId) ? prev : [...prev, board!]
            );
          }
        }

        if (!board) throw new Error('Board não encontrado');

        setSelectedBoard(board);
        // 💾 Salvar boardId no localStorage para persistência
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, board.id.toString());
          console.log(`💾 [STORAGE] Board selecionado salvo: ${board.nome} (ID: ${board.id})`);
        }
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
          // 💾 Limpar localStorage quando o board selecionado é deletado
          if (typeof window !== 'undefined') {
            localStorage.removeItem(storageKey);
            console.log(`🗑️ [STORAGE] Board deletado e removido do localStorage`);
          }
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

  const updateBoard = useCallback(
    async (boardId: number, updates: Partial<Board>) => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.patch(`/boards/${boardId}`, updates);
        const updatedBoard = response.data.data;
        setBoards((prev) => prev.map((b) => (b.id === boardId ? updatedBoard : b)));
        if (selectedBoard?.id === boardId) setSelectedBoard(updatedBoard);
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

  const createColumn = useCallback(
    async (nome: string): Promise<Column | null> => {
      if (!selectedBoard) {
        toast.error('Nenhum board selecionado');
        return null;
      }
      try {
        setLoading(true);
        setError(null);
        const payload = { nome, ordem: columns.length + 1 };
        const response = await api.post(`/boards/${selectedBoard.id}/columns`, payload);
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

  const updateColumn = useCallback(async (columnId: number, nome: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.patch(`/columns/${columnId}`, { nome });
      const updatedColumn = response.data.data;
      setColumns((prev) => prev.map((c) => (c.id === columnId ? updatedColumn : c)));
      toast.success('Coluna atualizada!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Erro ao atualizar coluna';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteColumn = useCallback(async (columnId: number) => {
    try {
      setLoading(true);
      setError(null);
      await api.delete(`/columns/${columnId}`);
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setCards((prev) => prev.filter((card) => card.columnId !== columnId));
      toast.success('Coluna deletada!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Erro ao deletar coluna';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const reorderColumns = useCallback(
    async (columnIds: number[]) => {
      if (!selectedBoard) return;
      try {
        setLoading(true);
        setError(null);
        // ✅ Corrigido: era 'columnIds', o backend espera 'colunaIds'
        await api.post(`/boards/${selectedBoard.id}/columns/reorder`, { colunaIds: columnIds });
        // atualizar localmente a ordem baseada no novo array columnIds
        const updatedColumns = columns.map((col) => {
          const newIndex = columnIds.indexOf(col.id);
          return {
            ...col,
            ordem: newIndex !== -1 ? (newIndex + 1) * 1000 : col.ordem,
          };
        });
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
const moveCard = useCallback(
  async (cardId: number, columnId: number | null, posicao: number) => {
    if (!selectedBoard) return;

    // ⚡ Otimista antes da API
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, columnId, posicao } : c))
    );

    try {
      const payload = {
        boardId: selectedBoard.id,
        novaColumnId: columnId,
        novaPosition: posicao,
      };
      console.log("🔍 Payload do MOVE sendo enviado:", JSON.stringify(payload));

      const response = await api.patch(`/cards/${cardId}/move`, payload);
      const updatedCard = normalizeCard(response.data.data);

      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, ...updatedCard, columnId } : c))
      );

      console.log("✅ Card movido com sucesso:", { cardId, columnId, posicao });
    } catch (err: any) {
      console.error("❌ moveCard falhou, recarregando cards:", err);
      await loadCards(selectedBoard.id);
      toast.error("Erro ao mover card");
      throw err;
    }
  },
  [selectedBoard, loadCards]
);

const addCardToColumn = useCallback(
  async (columnId: number | null, chamadoId: number, posicao: number = 1000): Promise<Card | null> => {
    if (!selectedBoard) return null;

    const existingCard = cards.find((c) => c.idChamado === chamadoId);
    if (existingCard) {
      console.log("🔍 Card já existe, movendo em vez de criar:", existingCard.id);
      await moveCard(existingCard.id, columnId, posicao);
      return { ...existingCard, columnId, posicao };
    }

    // otimismo: cria um card fake imediatamente para evitar flickers
    const tempId = -Math.floor(Math.random() * 1000000);
    const tempCard: Card = {
      id: tempId,
      boardId: selectedBoard.id,
      columnId,
      idChamado: chamadoId,
      posicao,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    setCards((prev) => [...prev, tempCard]);

    try {
      const payload = { columnId, chamadoId, posicao };
      console.log("🔍 addCardToColumn payload:", JSON.stringify(payload));
      console.log("🔍 URL:", `/boards/${selectedBoard.id}/cards`);

      const response = await api.post(`/boards/${selectedBoard.id}/cards`, payload);
      const newCard = normalizeCard(response.data.data);

      setCards((prev) => {
        const removedTemp = prev.filter((c) => c.id !== tempId);
        const exists = removedTemp.some((c) => c.id === newCard.id);
        return exists
          ? removedTemp.map((c) => (c.id === newCard.id ? newCard : c))
          : [...removedTemp, newCard];
      });
      return newCard;
    } catch (err: any) {
      setCards((prev) => prev.filter((c) => c.id !== tempId));
      toast.error(err.response?.data?.message || 'Erro ao adicionar card');
      throw err;
    }
  },
  [selectedBoard, cards, moveCard] // ⚡ cards e moveCard nas deps
);

  const removeCard = useCallback(async (cardId: number) => {
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
  }, []);

  const removeColumnLocal = useCallback((columnId: number) => {
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    setCards((prev) => prev.filter((card) => card.columnId !== columnId));
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  // 🔄 Após carregar boards, restaurar o board selecionado do localStorage
  useEffect(() => {
    if (boards.length > 0 && !selectedBoard) {
      if (typeof window !== 'undefined') {
        const savedBoardId = localStorage.getItem(storageKey);
        if (savedBoardId) {
          const boardId = parseInt(savedBoardId, 10);
          const savedBoard = boards.find((b) => b.id === boardId);
          if (savedBoard) {
            console.log(`✅ [STORAGE] Restaurando board selecionado: ${savedBoard.nome} (ID: ${boardId})`);
            setSelectedBoard(savedBoard);
            loadColumns(boardId);
            loadCards(boardId);
            return;
          }
        }
      }
      // Se não houver board salvo, seleciona o primeiro
      console.log(`📌 [STORAGE] Primeiro acesso ou board não encontrado, selecionando: ${boards[0].nome}`);
      setSelectedBoard(boards[0]);
      loadColumns(boards[0].id);
      loadCards(boards[0].id);
    }
  }, [boards, selectedBoard, storageKey]);

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