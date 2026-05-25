import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Board, GroupByOption, UseKanbanFilteringReturn } from '../utils/kanbanTypes';

interface UseKanbanFilteringProps {
  boards: Board[];
  selectBoard: (boardId: number) => void;
}

const STORAGE_KEY_GROUP_BY = 'kanbanGroupBy';
const STORAGE_KEY_SELECTED_BOARD = 'kanbanSelectedBoard';

const BASE_GROUP_BY_OPTIONS: GroupByOption[] = [
  { value: 'status', label: 'Status' },
  { value: 'prioridade', label: 'Prioridade' },
  { value: 'responsavel', label: 'Responsável' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'topico', label: 'Tópico' },
];

export function useKanbanFiltering({
  boards,
  selectBoard,
}: UseKanbanFilteringProps): UseKanbanFilteringReturn {
  const [groupBy, setGroupByState] = useState<string>(() => {
    return typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY_GROUP_BY) || 'status'
      : 'status';
  });

  const [selectedBoardId, setSelectedBoardIdState] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(STORAGE_KEY_SELECTED_BOARD);
    return saved ? parseInt(saved) : null;
  });

  const selectedBoard = useMemo(() => {
    return boards.find((b) => b.id === selectedBoardId) || null;
  }, [boards, selectedBoardId]);

  const [somenteAbertos, setSomenteAbertos] = useState(false);

  // ref para evitar que selectBoard entre nas deps e cause loop infinito
  const selectBoardRef = useRef(selectBoard);
  useEffect(() => {
    selectBoardRef.current = selectBoard;
  }, [selectBoard]);

  // efeito 1: persiste o selectedBoardId no localStorage quando muda
  // removida a chamada redundante a setSelectedBoardIdState (já está no estado)
  useEffect(() => {
    if (groupBy === 'personalizada' && selectedBoardId !== null) {
      localStorage.setItem(STORAGE_KEY_SELECTED_BOARD, selectedBoardId.toString());
    }
  }, [selectedBoardId, groupBy]);

  // efeito 2: restaura o board salvo ao trocar para modo personalizada
  // Corrigido: só chama selectBoard se o board ainda não está selecionado
  // e não inclui selectBoard nas deps para evitar re-renders infinitos
  useEffect(() => {
    if (groupBy !== 'personalizada') return;
    if (boards.length === 0) return;

    const savedBoardId = localStorage.getItem(STORAGE_KEY_SELECTED_BOARD);
    if (!savedBoardId) return;

    const boardId = parseInt(savedBoardId);

    // guard: só chama se for um board diferente do atual
    if (boardId === selectedBoardId) return;

    const board = boards.find((b) => b.id === boardId);
    if (board) {
      setSelectedBoardIdState(boardId);
      selectBoardRef.current(boardId);
    }
  // guard: selectBoard e selectedBoardId fora das deps propositalmente
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, boards]);

  const allGroupByOptions = useMemo(() => {
    const boardOptions = boards.map((board) => ({
      value: `board_${board.id}`,
      label: board.nome,
    }));
    return [...BASE_GROUP_BY_OPTIONS, ...boardOptions];
  }, [boards]);

  const setGroupBy = useCallback((value: string) => {
    setGroupByState(value);
    localStorage.setItem(STORAGE_KEY_GROUP_BY, value);
  }, []);

  const setSelectedBoardId = useCallback((value: number | null) => {
    setSelectedBoardIdState(value);
    if (value !== null) {
      localStorage.setItem(STORAGE_KEY_SELECTED_BOARD, value.toString());
    } else {
      localStorage.removeItem(STORAGE_KEY_SELECTED_BOARD);
    }
  }, []);

  const handleGroupByChange = useCallback(
    (option: GroupByOption | null) => {
      if (!option) return;

      if (option.value.startsWith('board_')) {
        const boardId = parseInt(option.value.replace('board_', ''));
        setGroupBy('personalizada');
        setSelectedBoardId(boardId);
        selectBoardRef.current(boardId);
      } else {
        // ao trocar para agrupamento padrão, limpa o board selecionado
        setGroupBy(option.value);
        setSelectedBoardId(null);
        localStorage.removeItem(STORAGE_KEY_SELECTED_BOARD);
      }
    },
    [setGroupBy, setSelectedBoardId]
    // selectBoard removido das deps — usamos a ref para evitar loop
  );

  return {
    groupBy,
    selectedBoardId,
    selectedBoard,
    somenteAbertos,
    allGroupByOptions,
    setGroupBy,
    setSomenteAbertos,
    setSelectedBoardId,
    handleGroupByChange,
  };
}