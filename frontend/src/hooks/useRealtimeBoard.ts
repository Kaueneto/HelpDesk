import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

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
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const lastEventRef = useRef<{ [key: string]: number }>({});  // ✅ Deduplicação

  useEffect(() => {
    // Não conectar se board não foi definido ou se está desabilitado
    if (!boardId || !enabled) {
      if (socketRef.current?.connected) {
        socketRef.current?.disconnect();
        socketRef.current = null;
      }
      console.log(`⚠️  [REALTIME] Hook desabilitado: boardId=${boardId}, enabled=${enabled}`);
      return;
    }

    console.log(`🔧 [REALTIME] Inicializando hook para board ${boardId} (enabled=${enabled})`);

    // Se já temos uma conexão, apenas trocar de sala
    if (socketRef.current?.connected) {
      console.log(`🔄 [REALTIME] Reusando conexão existente`);
      // Sair da sala anterior
      const prevBoardId = socketRef.current.id;
      if (prevBoardId) {
        socketRef.current.emit('leave-board', prevBoardId);
      }
      
      // Entrar na nova sala
      socketRef.current.emit('join-board', boardId);
      return;
    }

    // Criar nova conexão WebSocket
    console.log(`🔌 [REALTIME] Conectando WebSocket para board ${boardId}...`);
    console.log(`   API URL: ${process.env.NEXT_PUBLIC_API_URL}`);
    
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Event listeners
    socket.on('connect', () => {
      console.log(`✅ [REALTIME] WebSocket conectado: ${socket.id}`);
      console.log(`   URL: ${process.env.NEXT_PUBLIC_API_URL}`);
      reconnectAttempts.current = 0;
      
      // Entrar na sala do board
      console.log(`📌 [REALTIME] Tentando entrar na sala board-${boardId}`);
      socket.emit('join-board', boardId);
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ [REALTIME] WebSocket desconectado: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [REALTIME] Erro ao conectar WebSocket:', error);
      reconnectAttempts.current += 1;
    });

    // ==================== LISTENERS DE EVENTOS ====================

    /**
     * card movido entre colunas - COM DEDUPLICAÇÃO
     */
    socket.on('card-moved', (data) => {
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
      onCardMoved?.(data);
    });

    /**
     * Nova coluna criada
     */
    socket.on('column-created', (column) => {
      console.log(`➕ [REALTIME] Coluna criada em tempo real:`, column);
      onColumnCreated?.(column);
    });

    /**
     * Coluna deletada
     */
    socket.on('column-deleted', (data) => {
      console.log(`🗑️ [REALTIME] Coluna deletada em tempo real:`, data.columnId);
      onColumnDeleted?.(data.columnId);
    });

    /**
     * Coluna atualizada (nome, etc)
     */
    socket.on('column-updated', (column) => {
      console.log(`✏️ [REALTIME] Coluna atualizada em tempo real:`, column);
      onColumnUpdated?.(column);
    });

    /**
     * Colunas reordenadas
     */
    socket.on('columns-reordered', (data) => {
      console.log(`↔️ [REALTIME] Colunas reordenadas em tempo real:`, data.columns);
      onColumnsReordered?.(data.columns);
    });

    /**
     * Outro usuário entrou na sala
     */
    socket.on('user-joined', (data) => {
      console.log(`👤 [REALTIME] Usuário entrou na sala:`, data.userId);
      onUserJoined?.(data);
    });

    /**
     * Outro usuário saiu da sala
     */
    socket.on('user-left', (data) => {
      console.log(`👤 [REALTIME] Usuário saiu da sala:`, data.userId);
      onUserLeft?.(data);
    });

    // Cleanup ao desmontar
    return () => {
      if (socket.connected) {
        socket.emit('leave-board', boardId);
        socket.disconnect();
      }
    };
  }, [boardId, enabled]);

  return {
    isConnected: socketRef.current?.connected ?? false,
    socket: socketRef.current,
  };
}

export default useRealtimeBoard;
