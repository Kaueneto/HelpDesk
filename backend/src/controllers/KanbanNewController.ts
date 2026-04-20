import { Router, Response, Request } from "express";
import { verifyToken } from "../Middleware/AuthMiddleware";
import { BoardService } from "../services/BoardService";
import { ColumnService } from "../services/ColumnService";
import { CardService } from "../services/CardService";
import { DynamicBoardService } from "../services/DynamicBoardService";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

const router = Router();

// log de inicialização
console.log("***KanbanNewController carregado - rotas registradas em /boards");

// instanciar serviços
const boardService = new BoardService();
const columnService = new ColumnService();
const cardService = new CardService();
const dynamicBoardService = new DynamicBoardService();

//listar todos os boards de um departamento
router.get("/boards/departamento/:idDepartamento", verifyToken,  async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log("    GET /boards/departamento/:idDepartamento chamado");
      console.log("   Params:", req.params);
      console.log("   UserId:", req.userId);
      
      const idDepartamento = parseInt(req.params.idDepartamento);

      const boards = await boardService.listByDepartamento(idDepartamento);

      console.log("✅boards encontrados:", boards.length);
      
      res.json({
        error: false,
        data: boards,
      });
    } catch (error: any) {
      console.error("❌ eerro em GET /boards/departamento:", error);
      res.status(500).json({
        error: true,
        message: error.message || "Erro ao listar boards",
      });
    }
  }
);


 //Criar um novo board (dinamico ou customizado)
 
router.post("/boards", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log("   POST /boards chamado");
    console.log("   Body:", req.body);
    console.log("   UserId:", req.userId);
    
    const { nome, descricao, idDepartamento, tipo, agrupamento } = req.body;

    if (!nome || !idDepartamento || !tipo) {
      return res.status(400).json({
        error: true,
        message: "Parâmetros obrigatórios: nome, idDepartamento, tipo",
      });
    }

    const novoBoard = await boardService.createBoard({
      nome,
      descricao,
      idDepartamento,
      tipo,
      agrupamento: tipo === "dinamico" ? agrupamento : undefined,
      criadoPorId: req.userId!,
    });
    
    console.log("✅ board criado com ID:", novoBoard.id);

    res.status(201).json({
      error: false,
      message: "Board criado com sucesso",
      data: novoBoard,
    });
  } catch (error: any) {
    res.status(400).json({
      error: true,
      message: error.message || "Erro ao criar board",
    });
  }
});

//obter detalhes de um board
router.get("/boards/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const boardId = parseInt(req.params.id);

    const board = await boardService.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({
        error: true,
        message: "Board não encontrado",
      });
    }

    res.json({
      error: false,
      data: board,
    });
  } catch (error: any) {
    res.status(500).json({
      error: true,
      message: error.message || "Erro ao obter board",
    });
  }
});

//atualizar um board
router.patch("/boards/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const boardId = parseInt(req.params.id);
    const { nome, descricao, ativo, agrupamento } = req.body;

    const boardAtualizado = await boardService.updateBoard(boardId, {
      nome,
      descricao,
      ativo,
      agrupamento,
    });

    res.json({
      error: false,
      message: "Board atualizado com sucesso",
      data: boardAtualizado,
    });
  } catch (error: any) {
    res.status(400).json({
      error: true,
      message: error.message || "Erro ao atualizar board",
    });
  }
});

//deletar um board
router.delete("/boards/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const boardId = parseInt(req.params.id);

    await boardService.deleteBoard(boardId);

    res.json({
      error: false,
      message: "Board deletado com sucesso",
    });
  } catch (error: any) {
    res.status(400).json({
      error: true,
      message: error.message || "Erro ao deletar board",
    });
  }
});

//cruar uma nova coluna em um board customizado
router.post(
  "/boards/:boardId/columns",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const boardId = parseInt(req.params.boardId);
      const { nome, ordem } = req.body;

      if (!nome) {
        return res.status(400).json({
          error: true,
          message: "Nome da coluna é obrigatório",
        });
      }

      const novaColuna = await columnService.createColumn({
        boardId,
        nome,
        ordem,
      });

      res.status(201).json({
        error: false,
        message: "Coluna criada com sucesso",
        data: novaColuna,
      });
    } catch (error: any) {
      res.status(400).json({
        error: true,
        message: error.message || "Erro ao criar coluna",
      });
    }
  }
);

//listar colunas de um board
router.get("/boards/:boardId/columns", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const boardId = parseInt(req.params.boardId);

      const colunas = await columnService.getColumnsByBoardId(boardId);

      res.json({
        error: false,
        data: colunas,
      });
    } catch (error: any) {
      res.status(500).json({
        error: true,
        message: error.message || "Erro ao listar colunas",
      });
    }
  }
);

//att uma coluna
router.patch("/columns/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const colunaId = parseInt(req.params.id);
    const { nome, ordem } = req.body;

    const colunaAtualizada = await columnService.updateColumn(colunaId, {
      nome,
      ordem,
    });

    res.json({
      error: false,
      message: "Coluna atualizada com sucesso",
      data: colunaAtualizada,
    });
  } catch (error: any) {
    res.status(400).json({
      error: true,
      message: error.message || "Erro ao atualizar coluna",
    });
  }
});

//deletar uma coluna
router.delete("/columns/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const colunaId = parseInt(req.params.id);

    // buscar coluna para pegar boardId antes de deletar
    const colunaAtual = await columnService.getColumnById(colunaId);
    if (!colunaAtual) {
      return res.status(404).json({
        error: true,
        message: "Coluna não encontrada",
      });
    }

    const boardId = colunaAtual.board.id;

    // deletar coluna
    await columnService.deleteColumn(colunaId);

    // notificar outros clientes via WebSocket
    const realtimeService = (global as any).RealtimeService;
    if (realtimeService) {
      realtimeService.notifyColumnDeleted(boardId, colunaId);
      console.log(`Broadcast enviado para sala board-${boardId}: coluna ${colunaId} deletada`);
    }

    res.json({
      error: false,
      message: "Coluna deletada com sucesso",
    });
  } catch (error: any) {
    res.status(400).json({
      error: true,
      message: error.message || "Erro ao deletar coluna",
    });
  }
});

//reodernar colunas dentro de um board
router.post("/boards/:boardId/columns/reorder", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const boardId = parseInt(req.params.boardId);
      const { colunaIds } = req.body;

      if (!Array.isArray(colunaIds)) {
        return res.status(400).json({
          error: true,
          message: "colunaIds deve ser um array",
        });
      }

      await columnService.reorderColumns(boardId, { colunaIds });

      res.json({
        error: false,
        message: "Colunas reordenadas com sucesso",
      });
    } catch (error: any) {
      res.status(400).json({
        error: true,
        message: error.message || "Erro ao reordenar colunas",
      });
    }
  }
);

// add um chamado a um board customizado
router.post("/boards/:boardId/cards", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const boardId = parseInt(req.params.boardId);
      const { columnId, chamadoId, posicao } = req.body;

      if (!chamadoId) {
        return res.status(400).json({
          error: true,
          message: "chamadoId é obrigatório",
        });
      }

      const novoCard = await cardService.addCardToBoard({
        boardId,
        columnId: columnId || null,
        chamadoId,
        posicao,
      });

      res.status(201).json({
        error: false,
        message: "Card adicionado com sucesso",
        data: novoCard,
      });
    } catch (error: any) {
      res.status(400).json({
        error: true,
        message: error.message || "Erro ao adicionar card",
      });
    }
  }
);

//listar todos os cards de um board (opcionalmente filtrando por coluna)
router.get("/boards/:boardId/cards", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const boardId = parseInt(req.params.boardId);
      const columnId = req.query.columnId ? parseInt(req.query.columnId as string) : undefined;

      const cards = await cardService.getCards({
        boardId,
        columnId,
      });

      res.json({
        error: false,
        data: cards,
      });
    } catch (error: any) {
      res.status(500).json({
        error: true,
        message: error.message || "Erro ao listar cards",
      });
    }
  }
);

//mover um card entre colunas ou reposicionar
router.patch("/cards/:id/move", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cardId = parseInt(req.params.id);
    const { boardId, novaColumnId, novaPosition } = req.body;

    if (!boardId || novaPosition === undefined) {
      return res.status(400).json({
        error: true,
        message: "Parâmetros obrigatórios: boardId, novaPosition",
      });
    }

    const cardMovido = await cardService.moveCard(cardId, {
      boardId,
      novaColumnId: novaColumnId || null,
      novaPosition,
    });

    res.json({
      error: false,
      message: "Card movido com sucesso",
      data: cardMovido,
    });
  } catch (error: any) {
    res.status(400).json({
      error: true,
      message: error.message || "Erro ao mover card",
    });
  }
});

//remover um card do board
router.delete("/cards/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cardId = parseInt(req.params.id);

    await cardService.removeCard(cardId);

    res.json({
      error: false,
      message: "Card removido com sucesso",
    });
  } catch (error: any) {
    res.status(400).json({
      error: true,
      message: error.message || "Erro ao remover card",
    });
  }
});

//reordenar cards dentro de uma coluna
router.post("/boards/:boardId/cards/reorder", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const boardId = parseInt(req.params.boardId);
      const { columnId, cardIds } = req.body;

      if (!columnId || !Array.isArray(cardIds)) {
        return res.status(400).json({
          error: true,
          message: "Parâmetros obrigatórios: columnId, cardIds (array)",
        });
      }

      await cardService.reorderCardsInColumn(columnId, cardIds);

      res.json({
        error: false,
        message: "Cards reordenados com sucesso",
      });
    } catch (error: any) {
      res.status(400).json({
        error: true,
        message: error.message || "Erro ao reordenar cards",
      });
    }
  }
);

// ============================================================
// DYNAMIC BOARD ENDPOINTS
// ============================================================

//obter dados dinamicos sem persistencia apenas pra boards dinamicos
router.get(
  "/boards/:boardId/dynamic-data",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const boardId = parseInt(req.params.boardId);

      const board = await boardService.getBoardById(boardId);
      if (!board) {
        return res.status(404).json({
          error: true,
          message: "Board não encontrado",
        });
      }

      if (board.tipo !== "dinamico") {
        return res.status(400).json({
          error: true,
          message: "Apenas boards dinâmicos possuem dados dinâmicos",
        });
      }

      const filtros = {
        search: req.query.search as string | undefined,
        statusIds: req.query.statusIds
          ? (req.query.statusIds as string).split(",").map(Number)
          : undefined,
        prioridadeIds: req.query.prioridadeIds
          ? (req.query.prioridadeIds as string).split(",").map(Number)
          : undefined,
        usuarioId: req.query.usuarioId ? parseInt(req.query.usuarioId as string) : undefined,
      };

      const dados = await dynamicBoardService.generateBoardData(board, filtros);

      res.json({
        error: false,
        data: dados,
      });
    } catch (error: any) {
      res.status(500).json({
        error: true,
        message: error.message || "Erro ao gerar dados dinâmicos",
      });
    }
  }
);

export default router;
