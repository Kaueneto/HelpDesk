import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

export class RealtimeService {
  private io: SocketIOServer;
  private static instance: RealtimeService;

  private constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.setupEventListeners();
  }

  public static initialize(httpServer: HTTPServer): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService(httpServer);
    }
    return RealtimeService.instance;
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      throw new Error("RealtimeService não foi inicializado. Chame initialize() primeiro.");
    }
    return RealtimeService.instance;
  }

  private setupEventListeners() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`✅ cliente WebSocket conectado: ${socket.id}`);

      /**
       * Entrar em sala de um board específico
       * O frontend envia o boardId ao conectar
       */
      socket.on("join-board", (boardId: number) => {
        const room = `board-${boardId}`;
        socket.join(room);
        console.log(`📌 Cliente ${socket.id} entrou na sala ${room}`);

        // Notificar outros clientes que alguém entrou
        this.io.to(room).emit("user-joined", {
          userId: socket.id,
          boardId,
          timestamp: new Date(),
        });
      });

      /**
       * Sair da sala de um board
       */
      socket.on("leave-board", (boardId: number) => {
        const room = `board-${boardId}`;
        socket.leave(room);
        console.log(`👋 Cliente ${socket.id} saiu da sala ${room}`);

        this.io.to(room).emit("user-left", {
          userId: socket.id,
          boardId,
          timestamp: new Date(),
        });
      });

      socket.on("disconnect", () => {
        console.log(`❌ Cliente desconectado: ${socket.id}`);
      });
    });
  }

  /**
   * Notificar movimento de card em tempo real para todos os clientes do board
   */
  public notifyCardMoved(boardId: number, data: {
    chamadoId: number;
    columnValue: number | string;
    position: number;
    groupBy: string;
  }) {
    const room = `board-${boardId}`;
    console.log(`   [REALTIME] Notificando movimento de card`);
    console.log(`   Sala: ${room}`);
    console.log(`   Ticket ID: ${data.chamadoId}`);
    console.log(`   Coluna: ${data.columnValue}`);
    console.log(`   Posição: ${data.position}`);
    
    // Verificar quantos clientes estão na sala
    const room_obj = this.io.sockets.adapter.rooms.get(room);
    const clientCount = room_obj ? room_obj.size : 0;
    console.log(`   Clientes na sala: ${clientCount}`);
    
    // Incluir boardId no evento
    this.io.to(room).emit("card-moved", {
      ...data,
      boardId, // add boardId
      timestamp: new Date(),
      fromServer: true,
    });
    console.log(`✅ evento 'card-moved' emitido para ${clientCount} clientes`);
  }

  /**
   * Notificar nova coluna criada
   */
  public notifyColumnCreated(boardId: number, column: any) {
    const room = `board-${boardId}`;
    console.log(`➕ Notificando coluna criada na sala ${room}:`, column);
    this.io.to(room).emit("column-created", column);
  }

  /**
   * Notificar deleção de coluna
   */
  public notifyColumnDeleted(boardId: number, columnId: number) {
    const room = `board-${boardId}`;
    console.log(`🗑️ Notificando deleção de coluna na sala ${room}`);
    this.io.to(room).emit("column-deleted", { columnId });
  }

  /**
   * Notificar reorder de colunas
   */
  public notifyColumnReordered(boardId: number, columns: any[]) {
    const room = `board-${boardId}`;
    console.log(`↔️ Notificando reorder de colunas na sala ${room}`);
    this.io.to(room).emit("columns-reordered", { columns });
  }

  /**
   * Notificar atualização de coluna
   */
  public notifyColumnUpdated(boardId: number, column: any) {
    const room = `board-${boardId}`;
    console.log(` Notificando atualização de coluna na sala ${room}`);
    this.io.to(room).emit("column-updated", column);
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

export default RealtimeService;
