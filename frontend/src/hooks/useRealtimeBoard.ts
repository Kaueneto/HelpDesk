import { useEffect, useRef } from 'react';
import SocketManager from '@/services/socketManager';

interface UseRealtimeBoardProps {
  boardId: number | null;
  enabled?: boolean;
  onCardMoved?: (data: {
    chamadoId: number;
    columnValue: number | string;
    position: number;
    groupBy: string;
    timestamp?: Date;
  }) => void;
  onColumnCreated?: (column: any) => void;
  onColumnDeleted?: (columnId: number) => void;
  onColumnUpdated?: (column: any) => void;
  onColumnsReordered?: (columns: any[]) => void;
  onUserJoined?: (data: any) => void;
  onUserLeft?: (data: any) => void;
}

/**
 * Hook para gerenciar conexão WebSocket em tempo real com o Kanban
 * Conecta a uma sala específica do board e escuta eventos de atualização
 */
export function useRealtimeBoard({
  boardId,
  enabled = true,
  onCardMoved,
  onColumnCreated,
  onColumnDeleted,
  onColumnUpdated,
  onColumnsReordered,
  onUserJoined,
  onUserLeft,
}: UseRealtimeBoardProps) {
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const lastEventRef = useRef<{ [key: string]: number }>({});  // ✅ Deduplicação

  useEffect(() => {
    // Não conectar se board não foi definido ou se está desabilitado
    if (!boardId || !enabled) {
      console.log(`⚠️  [REALTIME] Hook desabilitado: boardId=${boardId}, enabled=${enabled}`);
      // limpar listeners
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current = [];
      return;
    }

    console.log(`🔧 [REALTIME] Inicializando hook para board ${boardId} (enabled=${enabled})`);

    const socketManager = SocketManager.getInstance();
    
    // conectar e entrar no board
    socketManager.joinBoard(boardId);

    // registrar listeners
    unsubscribersRef.current = [];

    // card movido
    if (onCardMoved) {
      const unsubscribe = socketManager.on('card-moved', (data: any) => {
        // DEDUPLICAÇÃO: Ignorar eventos duplicados dentro de 100ms
        const eventKey = `card-moved-${data.chamadoId}-${data.columnValue}-${data.position}`;
        const now = Date.now();
        const lastTime = lastEventRef.current[eventKey] || 0;

        if (now - lastTime < 100) {
          console.log(`⏭️  [REALTIME] Evento duplicado ignorado para card ${data.chamadoId}`);
          return;
        }

        lastEventRef.current[eventKey] = now;

        console.log(`📌 [REALTIME] Card movido em tempo real:`, {
          chamadoId: data.chamadoId,
          columnValue: data.columnValue,
          position: data.position,
          fromServer: data.fromServer,
          timestamp: data.timestamp,
        });
        onCardMoved(data);
      });
      unsubscribersRef.current.push(unsubscribe);
    }

    // coluna criada
    if (onColumnCreated) {
      const unsubscribe = socketManager.on('column-created', (column: any) => {
        console.log(`➕ [REALTIME] Coluna criada em tempo real:`, column);
        onColumnCreated(column);
      });
      unsubscribersRef.current.push(unsubscribe);
    }

    // coluna deletada
    if (onColumnDeleted) {
      const unsubscribe = socketManager.on('column-deleted', (data: any) => {
        console.log(`🗑️ [REALTIME] Coluna deletada em tempo real:`, data.columnId);
        onColumnDeleted(data.columnId);
      });
      unsubscribersRef.current.push(unsubscribe);
    }

    // coluna atualizada
    if (onColumnUpdated) {
      const unsubscribe = socketManager.on('column-updated', (column: any) => {
        console.log(`✏️ [REALTIME] Coluna atualizada em tempo real:`, column);
        onColumnUpdated(column);
      });
      unsubscribersRef.current.push(unsubscribe);
    }

    // Colunas reordenadas
    if (onColumnsReordered) {
      const unsubscribe = socketManager.on('columns-reordered', (data: any) => {
        console.log(`↔️ [REALTIME] Colunas reordenadas em tempo real:`, data.columns);
        onColumnsReordered(data.columns);
      });
      unsubscribersRef.current.push(unsubscribe);
    }

    // user entrou
    if (onUserJoined) {
      const unsubscribe = socketManager.on('user-joined', (data: any) => {
        console.log(`👤 [REALTIME] Usuário entrou na sala:`, data.userId);
        onUserJoined(data);
      });
      unsubscribersRef.current.push(unsubscribe);
    }

    // user saiu
    if (onUserLeft) {
      const unsubscribe = socketManager.on('user-left', (data: any) => {
        console.log(`👤 [REALTIME] Usuário saiu da sala:`, data.userId);
        onUserLeft(data);
      });
      unsubscribersRef.current.push(unsubscribe);
    }

    // cleanup ao desmontar ou mudar de boardId
    return () => {
      console.log(`👋 [REALTIME] Limpando listeners do board ${boardId}`);
      // Desinscrever de todos os eventos
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current = [];
      // Sair do board
      socketManager.leaveBoard();
    };
  }, [boardId, enabled, onCardMoved, onColumnCreated, onColumnDeleted, onColumnUpdated, onColumnsReordered, onUserJoined, onUserLeft]);
}

export default useRealtimeBoard;
