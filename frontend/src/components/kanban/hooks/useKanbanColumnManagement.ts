import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import type { Column } from '@/hooks/useBoardData';
import type { UseKanbanColumnManagementReturn } from '../utils/kanbanTypes';

interface UseKanbanColumnManagementProps {
  departamentoId: number;
  onRefresh?: () => void;
  createColumn: (nome: string) => Promise<Column | null>;
  deleteColumn: (columnId: number) => Promise<void>;
  removeColumnLocal: (columnId: number) => void;
  updateColumn?: (columnId: number, nome: string) => Promise<void>;
}

export function useKanbanColumnManagement({
  departamentoId,
  onRefresh,
  createColumn,
  deleteColumn,
  removeColumnLocal,
  updateColumn,
}: UseKanbanColumnManagementProps): UseKanbanColumnManagementReturn {

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const columnInputRef = useRef<HTMLInputElement>(null);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    columnId: number | null;
  }>({ isOpen: false, columnId: null });

  useEffect(() => {
    if (isAddingColumn && columnInputRef.current) {
      columnInputRef.current.focus();
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
        setIsAddingColumn(false);
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
    if (!deleteConfirmModal.columnId) return;
    try {
      const numColumnId = deleteConfirmModal.columnId;
      await deleteColumn(numColumnId);
      setDeleteConfirmModal({ isOpen: false, columnId: null });
    } catch (error: any) {
      console.error('ERRO AO DELETAR COLUNA:', error);
      toast.error('Erro ao deletar coluna');
    }
  }, [deleteConfirmModal.columnId, deleteColumn]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmModal({ isOpen: false, columnId: null });
  }, []);

  const handleRenameColumn = useCallback(
    async (columnId: string, newName: string) => {
      if (!newName.trim()) {
        toast.error('Nome da coluna não pode estar vazio');
        return;
      }
      try {
        const id = Number(columnId);
        if (updateColumn) {
          await updateColumn(id, newName.trim());
        }
        onRefresh?.();
      } catch (error) {
        toast.error('Erro ao renomear coluna');
      }
    },
    [updateColumn, onRefresh]
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

  
  };
}