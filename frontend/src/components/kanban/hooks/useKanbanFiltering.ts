
import { useState, useCallback, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    if (groupBy === 'personalizada' && selectedBoard) {
      setSelectedBoardIdState(selectedBoard.id);
      localStorage.setItem(STORAGE_KEY_SELECTED_BOARD, selectedBoard.id.toString());
    }
  }, [selectedBoard, groupBy]);

  useEffect(() => {
    if (groupBy === 'personalizada') {
      const savedBoardId = localStorage.getItem(STORAGE_KEY_SELECTED_BOARD);
      if (savedBoardId && boards.length > 0) {
        const board = boards.find((b) => b.id === parseInt(savedBoardId));
        if (board) {
          selectBoard(board.id);
        }
      }
    }
  }, [groupBy, boards, selectBoard]);

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
        selectBoard(boardId);
      } else {
        // Standard grouping selected
        setGroupBy(option.value);
        setSelectedBoardId(null);
        localStorage.removeItem(STORAGE_KEY_SELECTED_BOARD);
      }
    },
    [setGroupBy, setSelectedBoardId, selectBoard]
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
