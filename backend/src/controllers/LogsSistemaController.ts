import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { LogsSistema } from "../entities/LogsSistema";
import { verifyToken } from "../Middleware/AuthMiddleware";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

const router = Router();

// buscar logs do sistema (apenas admin)
router.get("/logs-sistema", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRoleId = req.userRoleId;

    // verificar se é admin
    if (userRoleId !== 1) {
      return res.status(403).json({
        mensagem: "Apenas administradores podem visualizar logs do sistema",
      });
    }

    const { 
      page = 1, 
      limit = 20, 
      tipoOperacao, 
      entidade,
      dataInicio,
      dataFim 
    } = req.query;

    const logsRepository = AppDataSource.getRepository(LogsSistema);
    const queryBuilder = logsRepository.createQueryBuilder("log");

    // aplicar filtros
    if (tipoOperacao) {
      queryBuilder.andWhere("log.tipoOperacao = :tipoOperacao", { tipoOperacao });
    }

    if (entidade) {
      queryBuilder.andWhere("log.entidade = :entidade", { entidade });
    }

    if (dataInicio) {
      queryBuilder.andWhere("log.dataAlteracao >= :dataInicio", { dataInicio });
    }

    if (dataFim) {
      queryBuilder.andWhere("log.dataAlteracao <= :dataFim", { dataFim });
    }

    // ordenar por data decrescente (mais recente primeiro)
    queryBuilder.orderBy("log.dataAlteracao", "DESC");

    // paginação
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    return res.status(200).json({
      logs,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Erro ao buscar logs do sistema:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar logs do sistema",
    });
  }
});

export default router;
