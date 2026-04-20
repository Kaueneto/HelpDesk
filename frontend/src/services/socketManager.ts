import { io, Socket } from 'socket.io-client';

//gerenciador singleton de websocket para o kanban
class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private currentBoardId: number | null = null;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 5;
  private listeners: Map<string, Set<Function>> = new Map();

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  
   // conectar ao servidor WebSocket (apenas uma vez)
    public connect(): Socket {
    // se já está conectado, retornar o socket existente
    if (this.socket?.connected) {
      console.log(`[SOCKET] Reusando conexão existente`);
      return this.socket;
    }

    // se está tentando reconectar, aguardar
    if (this.socket && !this.socket.connected) {
      console.log(`⏳ [SOCKET] Aguardando reconexão...`);
      return this.socket;
    }

    console.log(`🔌 [SOCKET] Criando nova conexão WebSocket...`);

    this.socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxConnectionAttempts,
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log(`[SOCKET] WebSocket conectado: ${this.socket!.id}`);
      this.connectionAttempts = 0;

      // re-entrar no board se estava em um
      if (this.currentBoardId) {
        console.log(`[SOCKET] Re-entrando no board ${this.currentBoardId}`);
        this.socket!.emit('join-board', this.currentBoardId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ [SOCKET] WebSocket desconectado: ${reason}`);
    });

    this.socket.on('connect_error', (error) => {
      console.error(`❌ [SOCKET] Erro ao conectar:`, error);
      this.connectionAttempts += 1;
    });

    // listeners registrados dinamicamente
    this.socket.on('card-moved', (data) => {
      this.emitToListeners('card-moved', data);
    });

    this.socket.on('column-created', (data) => {
      this.emitToListeners('column-created', data);
    });

    this.socket.on('column-deleted', (data) => {
      this.emitToListeners('column-deleted', data);
    });

    this.socket.on('column-updated', (data) => {
      this.emitToListeners('column-updated', data);
    });

    this.socket.on('columns-reordered', (data) => {
      this.emitToListeners('columns-reordered', data);
    });

    this.socket.on('user-joined', (data) => {
      this.emitToListeners('user-joined', data);
    });

    this.socket.on('user-left', (data) => {
      this.emitToListeners('user-left', data);
    });
  }

    //entrar em um board
  public joinBoard(boardId: number): void {
    const socket = this.connect();

    //se já está em outro board, sair primeiro
    if (this.currentBoardId !== null && this.currentBoardId !== boardId) {
      console.log(`[SOCKET] Saindo do board ${this.currentBoardId}`);
      socket.emit('leave-board', this.currentBoardId);
    }

    this.currentBoardId = boardId;
    console.log(`[SOCKET] Entrando no board ${boardId}`);
    socket.emit('join-board', boardId);
  }

//sair do board atual
  public leaveBoard(): void {
    if (!this.socket || !this.currentBoardId) return;

    console.log(`[SOCKET] Saindo do board ${this.currentBoardId}`);
    this.socket.emit('leave-board', this.currentBoardId);
    this.currentBoardId = null;
  }

 //desconectar completamente do WebSocket
  public disconnect(): void {
    if (this.socket) {
      this.leaveBoard();
      console.log(`[SOCKET] Desconectando WebSocket...`);
      this.socket.disconnect();
      this.socket = null;
      this.currentBoardId = null;
      this.listeners.clear();
    }
  }


   // registrar listener para um evento
   
  public on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // retornar função para unsubscribe
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }


   // emitir para todos os listeners de um evento
  private emitToListeners(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ [SOCKET] Erro ao executar listener para ${event}:`, error);
        }
      });
    }
  }

 //obter status atual
  public getStatus() {
    return {
      connected: this.socket?.connected ?? false,
      currentBoardId: this.currentBoardId,
      socketId: this.socket?.id,
    };
  }
}

export default SocketManager;
