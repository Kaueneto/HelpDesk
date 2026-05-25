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
  // ⚡ Guarda sempre a versão mais recente dos callbacks SEM entrar nas deps do useEffect
  const callbacksRef = useRef({
    onCardMoved,
    onColumnCreated,
    onColumnDeleted,
    onColumnUpdated,
    onColumnsReordered,
    onUserJoined,
    onUserLeft,
  });

  // Atualiza os refs a cada render sem disparar o useEffect
  useEffect(() => {
    callbacksRef.current = {
      onCardMoved,
      onColumnCreated,
      onColumnDeleted,
      onColumnUpdated,
      onColumnsReordered,
      onUserJoined,
      onUserLeft,
    };
  });

  const unsubscribersRef = useRef<Array<() => void>>([]);
  const lastEventRef = useRef<{ [key: string]: number }>({});

  // ⚡ Só boardId e enabled nas dependências — callbacks nunca causam re-subscribe
  useEffect(() => {
    if (!boardId || !enabled) {
      console.log(`⚠️  [REALTIME] Hook desabilitado: boardId=${boardId}, enabled=${enabled}`);
      unsubscribersRef.current.forEach((u) => u());
      unsubscribersRef.current = [];
      return;
    }

    console.log(`🔧 [REALTIME] Inicializando hook para board ${boardId} (enabled=${enabled})`);

    const socketManager = SocketManager.getInstance();
    socketManager.joinBoard(boardId);
    console.log(`✅ [REALTIME] joinBoard chamado para board ${boardId}`);
    unsubscribersRef.current = [];

    // card movido
    console.log(`🔧 [REALTIME] Registrando listener para 'card-moved'...`);
    const unsubCardMoved = socketManager.on('card-moved', (data: any) => {
      const eventKey = `card-moved-${data.chamadoId}-${data.columnValue}-${data.position}`;
      const now = Date.now();
      if (now - (lastEventRef.current[eventKey] || 0) < 100) {
        console.log(`⏭️  [REALTIME] Evento duplicado ignorado para card ${data.chamadoId}`);
        return;
      }
      lastEventRef.current[eventKey] = now;
      console.log(`✅ [REALTIME] Card movido em tempo real:`, {
        chamadoId: data.chamadoId,
        columnValue: data.columnValue,
        position: data.position,
        fromServer: data.fromServer,
        timestamp: data.timestamp,
      });
      callbacksRef.current.onCardMoved?.(data);
    });
    unsubscribersRef.current.push(unsubCardMoved);

    // coluna criada
    const unsubColumnCreated = socketManager.on('column-created', (column: any) => {
      console.log(`➕ [REALTIME] Coluna criada em tempo real:`, column);
      callbacksRef.current.onColumnCreated?.(column);
    });
    unsubscribersRef.current.push(unsubColumnCreated);

    // coluna deletada
    const unsubColumnDeleted = socketManager.on('column-deleted', (data: any) => {
      console.log(`🗑️ [REALTIME] Coluna deletada em tempo real:`, data.columnId);
      callbacksRef.current.onColumnDeleted?.(data.columnId);
    });
    unsubscribersRef.current.push(unsubColumnDeleted);

    // coluna atualizada
    const unsubColumnUpdated = socketManager.on('column-updated', (column: any) => {
      console.log(`✏️ [REALTIME] Coluna atualizada em tempo real:`, column);
      callbacksRef.current.onColumnUpdated?.(column);
    });
    unsubscribersRef.current.push(unsubColumnUpdated);

    // colunas reordenadas
    const unsubColumnsReordered = socketManager.on('columns-reordered', (data: any) => {
      console.log(`↔️ [REALTIME] Colunas reordenadas em tempo real:`, data.columns);
      callbacksRef.current.onColumnsReordered?.(data.columns);
    });
    unsubscribersRef.current.push(unsubColumnsReordered);

    // user entrou
    const unsubUserJoined = socketManager.on('user-joined', (data: any) => {
      console.log(`👤 [REALTIME] Usuário entrou na sala:`, data.userId);
      callbacksRef.current.onUserJoined?.(data);
    });
    unsubscribersRef.current.push(unsubUserJoined);

    // user saiu
    const unsubUserLeft = socketManager.on('user-left', (data: any) => {
      console.log(`👤 [REALTIME] Usuário saiu da sala:`, data.userId);
      callbacksRef.current.onUserLeft?.(data);
    });
    unsubscribersRef.current.push(unsubUserLeft);

    return () => {
      console.log(`👋 [REALTIME] Limpando listeners do board ${boardId}`);
      unsubscribersRef.current.forEach((u) => u());
      unsubscribersRef.current = [];
      socketManager.leaveBoard();
    };
  }, [boardId, enabled]); // ⚡ APENAS boardId e enabled — sem callbacks nas deps
}

export default useRealtimeBoard;
