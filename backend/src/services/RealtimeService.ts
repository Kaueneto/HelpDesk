import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

export class RealtimeService {
  private io: SocketIOServer;
  private static instance: RealtimeService;
  
  // rastrear usuários em salas de chamados (para evitar fantasmas)
  private chamadoRooms: Map<string, Set<string>> = new Map();
  // rastrear heartbeat de sockets
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingInterval: 25000, // ping a cada 25 segundos
      pingTimeout: 20000,  // timeout se não houver pong em 20 segundos
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
      // rastrear qual chamado este socket está observando
      let currentChamadoId: number | null = null;

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

      //entrar em sala de um chamado pra receber msgs em tempo real
      socket.on("join-chamado", (chamadoId: number, ack: (response: any) => void) => {
        const room = `chamado-${chamadoId}`;
        
        // se estava observando outro chamado, sair primeiro
        if (currentChamadoId !== null && currentChamadoId !== chamadoId) {
          const oldRoom = `chamado-${currentChamadoId}`;
          socket.leave(oldRoom);
          
          // Remover do mapa de rastreamento
          if (this.chamadoRooms.has(oldRoom)) {
            this.chamadoRooms.get(oldRoom)?.delete(socket.id);
          }
          
          // notificar se users saiu
          this.io.to(oldRoom).emit("user-left-chamado", {
            socketId: socket.id,
            chamadoId: currentChamadoId,
            usuariosNaSala: this.getUsuariosNaChamado(currentChamadoId),
            timestamp: new Date(),
          });
        }
        
        // entrar na nova sala
        socket.join(room);
        currentChamadoId = chamadoId;
        
        // rastrear user
        if (!this.chamadoRooms.has(room)) {
          this.chamadoRooms.set(room, new Set());
        }
        this.chamadoRooms.get(room)?.add(socket.id);
        
        // CHAMAR ACK (acknowledgement) para confirmar entrada
        if (typeof ack === 'function') {
          ack({ success: true, room, socketId: socket.id });
        }
        
        // notificar outros clientes
        this.io.to(room).emit("user-joined-chamado", {
          socketId: socket.id,
          chamadoId,
          usuariosNaSala: this.getUsuariosNaChamado(chamadoId),
          timestamp: new Date(),
        });

        // emitir um evento de teste 2 segundos depois para validar comunicação
        setTimeout(() => {
          this.io.to(room).emit("test-event", {
            message: "Este é um evento de teste para validar que eventos customizados funcionam",
            timestamp: new Date(),
          });
        }, 2000);
      });

    //sair da sala de um chamado
      socket.on("leave-chamado", (chamadoId: number) => {
        const room = `chamado-${chamadoId}`;
        if (currentChamadoId === chamadoId) {
          socket.leave(room);
          
          // Remover do mapa de rastreamento
          if (this.chamadoRooms.has(room)) {
            this.chamadoRooms.get(room)?.delete(socket.id);
            // Se sala ficou vazia, remover do mapa
            if (this.chamadoRooms.get(room)?.size === 0) {
              this.chamadoRooms.delete(room);
              console.log(`🗑️ Sala ${room} removida (vazia)`);
            }
          }
          
          currentChamadoId = null;
          console.log(`Cliente ${socket.id} saiu da sala ${room}`);

          // Notificar
          this.io.to(room).emit("user-left-chamado", {
            socketId: socket.id,
            chamadoId,
            usuariosNaSala: this.getUsuariosNaChamado(chamadoId),
            timestamp: new Date(),
          });
        }
      });

      socket.on("disconnect", () => {
        console.log(`❌ Cliente desconectado: ${socket.id}`);
        
        // Limpar heartbeat
        if (this.heartbeatIntervals.has(socket.id)) {
          clearInterval(this.heartbeatIntervals.get(socket.id));
          this.heartbeatIntervals.delete(socket.id);
        }
        
        // Notificar saída de board
        if (currentBoardId !== null) {
          const room = `board-${currentBoardId}`;
          this.io.to(room).emit("user-left", {
            userId: socket.id,
            boardId: currentBoardId,
            timestamp: new Date(),
          });
        }
        
        // Notificar saída de chamado
        if (currentChamadoId !== null) {
          const room = `chamado-${currentChamadoId}`;
          if (this.chamadoRooms.has(room)) {
            this.chamadoRooms.get(room)?.delete(socket.id);
            if (this.chamadoRooms.get(room)?.size === 0) {
              this.chamadoRooms.delete(room);
            }
          }
          
          this.io.to(room).emit("user-left-chamado", {
            socketId: socket.id,
            chamadoId: currentChamadoId,
            usuariosNaSala: this.getUsuariosNaChamado(currentChamadoId),
            timestamp: new Date(),
          });
        }
      });
    });
  }

  //notificar uma nova mensagem no chamado
  public notifyNovaMsg(chamadoId: number, mensagem: any) {
    const room = `chamado-${chamadoId}`;
    
    const eventData = {
      mensagem,
      chamadoId,
      timestamp: new Date(),
    };
    
    this.io.to(room).emit("msg-new", eventData);
  }

 //notificar novo historico no chamdo
  public notifyNovoHistorico(chamadoId: number, historico: any) {
    const room = `chamado-${chamadoId}`;
    
    this.io.to(room).emit("history-new", {
      historico,
      chamadoId,
      timestamp: new Date(),
    });
  }

  private getUsuariosNaChamado(chamadoId: number): string[] {
    const room = `chamado-${chamadoId}`;
    if (this.chamadoRooms.has(room)) {
      return Array.from(this.chamadoRooms.get(room) || []);
    }
    return [];
  }


  public cleanupEmptyRooms(): void {
    const now = Date.now();
    this.chamadoRooms.forEach((usuarios, room) => {
      if (usuarios.size === 0) {
        this.chamadoRooms.delete(room);
        console.log(`🧹 Sala ${room} removida (cleanup)`);
      }
    });
  }
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
