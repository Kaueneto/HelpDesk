/**
 * useKanbanColumnManagement Hook
 *
 * Encapsulates all logic for managing custom board columns.
 * Integrates with useBoardData hook.
 *
 * Manages:
 * - Creating new columns inline
 * - Deleting columns with confirmation
 * - Renaming columns
 * - UI state (input field, modals)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useBoardData } from '@/hooks/useBoardData';
import type { UseKanbanColumnManagementReturn } from '../utils/kanbanTypes';

interface UseKanbanColumnManagementProps {
  departamentoId: number;
  onRefresh?: () => void;
}

export function useKanbanColumnManagement({
  departamentoId,
  onRefresh,
}: UseKanbanColumnManagementProps): UseKanbanColumnManagementReturn {
  const {
    boards,
    selectedBoard,
    columns,
    loading: boardLoading,
    selectBoard,
    createBoard,
    createColumn,
    deleteColumn,
    removeColumnLocal,
  } = useBoardData(departamentoId);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const columnInputRef = useRef<HTMLInputElement>(null);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    columnId: number | null;
  }>({ isOpen: false, columnId: null });

  useEffect(() => {
    if (isAddingColumn && columnInputRef.current) {
      columnInputRef.current?.focus();
    }
  }, [isAddingColumn]);

  useEffect(() => {
    if (!isAddingColumn) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (columnInputRef.current && !columnInputRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('button[class*="flex-1"]')) {
          handleCancelColumnEdit();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddingColumn]);

  const handleCreateColumn = useCallback(
    async (nome: string) => {
      if (!nome.trim()) {
        toast.error('Nome da coluna não pode estar vazio');
        return;
      }
      try {
        await createColumn(nome);
        setNewColumnName('');
        toast.success('Coluna criada com sucesso!');
      } catch (error) {
        toast.error('Erro ao criar coluna');
      }
    },
    [createColumn]
  );

  const handleColumnInputSubmit = useCallback(() => {
    handleCreateColumn(newColumnName);
  }, [newColumnName, handleCreateColumn]);

  const handleCancelColumnEdit = useCallback(() => {
    setIsAddingColumn(false);
    setNewColumnName('');
  }, []);

const handleDeleteColumn = useCallback((columnId: string) => {
  setDeleteConfirmModal({ isOpen: true, columnId: Number(columnId) });
}, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      if (!deleteConfirmModal.columnId) return;

      const numColumnId = deleteConfirmModal.columnId;
      console.log(`deleting column ${numColumnId}...`);

      await deleteColumn(numColumnId);

      console.log(`Column ${numColumnId} deleted successfully!`);
      setDeleteConfirmModal({ isOpen: false, columnId: null });
    } catch (error: any) {
      console.error('❌ error deleting column:', error);
      
    }
  }, [deleteConfirmModal.columnId, deleteColumn]);

  // Handler: Cancel deletion
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmModal({ isOpen: false, columnId: null });
  }, []);


  const handleRenameColumn = useCallback(
    async (columnId: string, newName: string) => {
      try {
        toast.success('Coluna renomeada com sucesso!');
        onRefresh?.();
      } catch (error) {
        toast.error('Erro ao renomear coluna');
      }
    },
    [onRefresh]
  );

 return {
    
    isAddingColumn,
    newColumnName,
    columnInputRef,
    deleteConfirmModal, 

    handleCreateColumn,
    handleDeleteColumn,
    handleConfirmDelete,
    handleCancelDelete,
    handleRenameColumn,
    handleCancelColumnEdit,
    handleColumnSubmit: handleColumnInputSubmit,

   
    setIsAddingColumn,
    setNewColumnName,

    
    boards,
    selectedBoard,
    columns,
    boardLoading,
    selectBoard,
    createBoard,
    createColumn: async (nome: string) => {
       await createColumn(nome);
    },
    deleteColumn,
    removeColumnLocal,
  };
}
