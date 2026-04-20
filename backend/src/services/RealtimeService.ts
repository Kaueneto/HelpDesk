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
      console.log(`✅ Cliente WebSocket conectado: ${socket.id}`);
      
      // rastrear qual board este socket está observando
      let currentBoardId: number | null = null;

      /**
       * Entrar em sala de um board específico
       * O frontend envia o boardId ao conectar
       */
      socket.on("join-board", (boardId: number) => {
        const room = `board-${boardId}`;
        
        // se estava em outra sala, sair dela primeiro
        if (currentBoardId !== null && currentBoardId !== boardId) {
          const oldRoom = `board-${currentBoardId}`;
          console.log(`   → Cliente ${socket.id} saiu de ${oldRoom} (mudando de board)`);
          socket.leave(oldRoom);
        }
        
        socket.join(room);
        currentBoardId = boardId;
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
        if (currentBoardId === boardId) {
          socket.leave(room);
          currentBoardId = null;
          console.log(`Cliente ${socket.id} saiu da sala ${room}`);

          this.io.to(room).emit("user-left", {
            userId: socket.id,
            boardId,
            timestamp: new Date(),
          });
        } else {
          console.warn(`⚠️ Cliente ${socket.id} tentou sair de ${room}, mas está em board ${currentBoardId}`);
        }
      });

      socket.on("disconnect", () => {
        console.log(`❌ Cliente desconectado: ${socket.id}`);
        // a desconexão automática remove o socket de todas as salas
        if (currentBoardId !== null) {
          const room = `board-${currentBoardId}`;
          this.io.to(room).emit("user-left", {
            userId: socket.id,
            boardId: currentBoardId,
            timestamp: new Date(),
          });
          currentBoardId = null;
        }
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
    
    // verificar quantos clientes estão na sala
    const roomClients = this.io.sockets.adapter.rooms.get(room);
    const clientCount = roomClients ? roomClients.size : 0;
    
    console.log(`   [REALTIME] Notificando movimento de card`);
    console.log(`   Sala: ${room}`);
    console.log(`   Ticket ID: ${data.chamadoId}`);
    console.log(`   Coluna: ${data.columnValue}`);
    console.log(`   Posição: ${data.position}`);
    console.log(`   Clientes conectados na sala: ${clientCount}`);
    if (clientCount > 0) {
      console.log(`   IDs: ${Array.from(roomClients!).join(', ')}`);
    }
    
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
