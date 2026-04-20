import { io, Socket } from 'socket.io-client';

//gerenciador singleton de websocket para o kanban
class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private currentBoardId: number | null = null;
  private chamadoRefs: Map<number, number> = new Map(); // chamadoId → contador de refs
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
      console.log(`[SOCKET] Reusando conexão existente (${this.socket.id})`);
      return this.socket;
    }

    // se está tentando reconectar, aguardar
    if (this.socket && !this.socket.connected) {
      console.log(`[SOCKET] Socket existe mas não está conectado. Devolvendo socket para aguardar reconexão...`);
      return this.socket;
    }

    console.log(`🔌 [SOCKET] Criando nova conexão WebSocket...`);

    this.socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxConnectionAttempts,
      transports: ['websocket'], // FORÇAR WEBSOCKET para evitar bugs de polling no Next.js
    });

    console.log(` [SOCKET] Socket criado (aguardando conexão):`, this.socket.id);

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    console.log(` [SOCKET] Registrando event listeners...`);

    this.socket.on('connect', () => {
      console.log(`✅ [SOCKET] WebSocket conectado: ${this.socket!.id}`);
      this.connectionAttempts = 0;

      // re-entrar no board se estava em um
      if (this.currentBoardId) {
        console.log(`[SOCKET] Re-entrando no board ${this.currentBoardId}`);
        this.socket!.emit('join-board', this.currentBoardId);
      }

      // re-entrar em TODOS os chamados ativos
      this.chamadoRefs.forEach((refs, chamadoId) => {
        if (refs > 0) {
          console.log(`[SOCKET] Re-entrando no chamado ${chamadoId} (refs: ${refs})`);
          this.socket!.emit('join-chamado', chamadoId, (response: any) => {
            console.log(`[SOCKET] Re-join chamado ${chamadoId} ACK:`, response);
          });
        }
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ [SOCKET] WebSocket desconectado: ${reason}`);
    });

    this.socket.on('connect_error', (error) => {
      console.error(`❌ [SOCKET] Erro ao conectar:`, error);
      this.connectionAttempts += 1;
    });

    // Listener para evento de teste do servidor
    this.socket.on('test-event', (data) => {
      console.log(`🧪 [SOCKET] Evento de teste recebido:`, data);
    });

    // Listener para broadcast de teste
    this.socket.on('broadcast-test', (data) => {
      console.log(`📢 [SOCKET] Broadcast de teste recebido:`, data);
    });

    // listeners registrados dinamicamente
    this.socket.on('msg-new', (data) => {
      this.emitToListeners('msg-new', data);
    });

    this.socket.on('history-new', (data) => {
      this.emitToListeners('history-new', data);
    });

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

  //entrar em um chamado
  public joinChamado(chamadoId: number): void {
    const socket = this.connect();

    // incrementar contador de referências
    const refs = this.chamadoRefs.get(chamadoId) ?? 0;
    this.chamadoRefs.set(chamadoId, refs + 1);

    console.log(`[SOCKET] joinChamado ${chamadoId} (refs: ${refs + 1})`);
    console.log(`[SOCKET] Socket conectado? ${socket.connected}, Socket ID: ${socket.id}`);

    // so emitir join se for a primeira referência
    if (refs === 0) {
      console.log(`[SOCKET] Primeira referência - emitindo join-chamado`);
      
      // socket.IO enfileira automaticamente, não precisa checar connected
      socket.emit('join-chamado', chamadoId, (response: any) => {
        console.log(`[SOCKET] ACK recebido para join-chamado ${chamadoId}:`, response);
      });
      
      // add listener de teste para confirmar que está na sala
      setTimeout(() => {
        console.log(`[SOCKET] TEST: Verificando se recebi evento de teste após 3s (deve ter recebido em 2s do servidor)...`);
      }, 3000);
    } else {
      console.log(`[SOCKET] Referência já existe (${refs}), não emitindo join novamente`);
    }
  }

  //sair do chamado (específico)
  public leaveChamado(chamadoId: number): void {
    if (!this.socket) return;

    const refs = this.chamadoRefs.get(chamadoId) ?? 0;
    if (refs <= 1) {
      // utl referência — sair de verdade
      this.chamadoRefs.delete(chamadoId);
      console.log(`[SOCKET] Saindo do chamado ${chamadoId} (última ref)`);
      this.socket.emit('leave-chamado', chamadoId);
    } else {
      // ainda tem outros consumidores usando essa sala
      this.chamadoRefs.set(chamadoId, refs - 1);
      console.log(`[SOCKET] leaveChamado ${chamadoId} (refs restantes: ${refs - 1})`);
    }
  }

 //desconectar completamente do WebSocket
  public disconnect(): void {
    if (this.socket) {
      this.leaveBoard();
      this.chamadoRefs.clear(); // limpar todos os chamados
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
      console.log(`[SOCKET LISTENERS] Emitindo '${event}' para ${listeners.size} listener(s).`);
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro no listener para ${event}:`, error);
        }
      });
    } else {
      console.warn(`[SOCKET LISTENERS] Nenhum listener registrado para o evento '${event}'!`);
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
