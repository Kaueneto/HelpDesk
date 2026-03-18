import { Router, Response, Request } from "express";
import { AppDataSource } from "../data-source";
import { Chamados } from "../entities/Chamados";
import { KanbanPositions } from "../entities/KanbanPositions";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { StatusChamado } from "../entities/StatusChamado";
import { TipoPrioridade } from "../entities/TipoPrioridade";
import { Users } from "../entities/Users";
import { Departamentos } from "../entities/Departamentos";
import { TopicosAjuda } from "../entities/TopicosAjuda";
import { verifyToken } from "../Middleware/AuthMiddleware";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

const router = Router();


router.patch("/chamados/:id/move", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const chamadoId = parseInt(req.params.id);
    const userId = req.userId;
    const userRoleId = req.userRoleId;
    const { groupBy, columnValue, position } = req.body;


    // validar entrada
    if (!chamadoId || !groupBy || position === undefined) {
      const errorMsg = `Parâmetros inválidos: chamadoId=${chamadoId}, groupBy=${groupBy}, position=${position}`;
   
      return res.status(400).json({
        error: true,
        message: "Parâmetros inválidos. Necessário: groupBy, position, e columnValue (pode ser null)"
      });
    }

    // validar tipos de agrupamento permitidos
    const allowedGroupBy = ['status', 'prioridade', 'responsavel', 'departamento', 'topico'];
    if (!allowedGroupBy.includes(groupBy)) {
   
      return res.status(400).json({
        error: true,
        message: "Tipo de agrupamento inválido"
      });
    }

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const kanbanRepository = AppDataSource.getRepository(KanbanPositions);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);

    // verificar se o chamado existe
    const chamado = await chamadoRepository.findOne({
      where: { id: chamadoId },
      relations: ['usuario', 'userResponsavel', 'status', 'tipoPrioridade', 'departamento', 'topicoAjuda']
    });

    if (!chamado) {
      return res.status(404).json({
        error: true,
        message: "Chamado não encontrado"
      });
    }

    // verificar permissões
    const isAdmin = userRoleId === 1;
    const isOwner = chamado.usuario?.id === userId;
    const isAssigned = chamado.userResponsavel?.id === userId;

    if (!isAdmin && !isOwner && !isAssigned) {
      return res.status(403).json({
        error: true,
        message: "Você não tem permissão para mover este chamado"
      });
    }

    // obter usuário para histórico
    const usuarioHistorico = await userRepository.findOne({ where: { id: userId } });
    if (!usuarioHistorico) {
      return res.status(400).json({
        error: true,
        message: "Usuário não encontrado"
      });
    }

    // preparar atualizações do chamado baseado no tipo de agrupamento
    const updates: any = {};
    let descricaoHistorico = '';

    switch (groupBy) {
      case 'status':
        if (columnValue && columnValue !== chamado.status.id.toString()) {
          const statusIdParsed = parseInt(columnValue as string);
          
          const statusRepo = AppDataSource.getRepository(StatusChamado);
          const novoStatus = await statusRepo.findOne({ where: { id: statusIdParsed } });
          
          
          if (!novoStatus) {
            return res.status(400).json({
              error: true,
              message: "Status inválido",
              debug: { columnValue, statusIdParsed }
            });
          }
          updates.status = novoStatus;
          updates.updatedAt = new Date();
          descricaoHistorico = `Status alterado de "${chamado.status.nome}" para "${novoStatus.nome}" via visualização em modo Quadro (Kanban)`;
        }
        break;

      case 'prioridade':
        if (columnValue && columnValue !== chamado.tipoPrioridade.id.toString()) {
          const prioridadeRepo = AppDataSource.getRepository(TipoPrioridade);
          const novaPrioridade = await prioridadeRepo.findOne({ where: { id: parseInt(columnValue) } });
          if (!novaPrioridade) {
            return res.status(400).json({
              error: true,
              message: "Prioridade inválida"
            });
          }
          updates.tipoPrioridade = novaPrioridade;
          updates.updatedAt = new Date();
          descricaoHistorico = `Prioridade alterada de "${chamado.tipoPrioridade.nome}" para "${novaPrioridade.nome}" via visualização em modo Quadro (Kanban)`;
        }
        break;

      case 'responsavel':
        const novoResponsavelId = columnValue ? parseInt(columnValue) : null;
        if (novoResponsavelId !== chamado.userResponsavel?.id) {
          if (novoResponsavelId) {
            const userRepo = AppDataSource.getRepository(Users);
            const novoResponsavel = await userRepo.findOne({ where: { id: novoResponsavelId } });
            if (!novoResponsavel) {
              return res.status(400).json({
                error: true,
                message: "Usuário responsável inválido"
              });
            }
            updates.userResponsavel = novoResponsavel;
            updates.dataAtribuicao = new Date();
            descricaoHistorico = `Responsável alterado para "${novoResponsavel.name}" via visualização em modo Quadro (Kanban)`;
          } else {
            updates.userResponsavel = null;
            updates.dataAtribuicao = null;
            descricaoHistorico = "Responsável removido via visualização em modo Quadro (Kanban)";
          }
          updates.updatedAt = new Date();
        }
        break;

      case 'departamento':
        if (columnValue && columnValue !== chamado.departamento.id.toString()) {
          const deptRepo = AppDataSource.getRepository(Departamentos);
          const novoDepartamento = await deptRepo.findOne({ where: { id: parseInt(columnValue) } });
          if (!novoDepartamento) {
            return res.status(400).json({
              error: true,
              message: "Departamento invalido"
            });
          }
          updates.departamento = novoDepartamento;
          updates.updatedAt = new Date();
          descricaoHistorico = `Departamento alterado para "${novoDepartamento.name}" via Kanban`;
        }
        break;

      case 'topico':
        if (columnValue && columnValue !== chamado.topicoAjuda.id.toString()) {
          const topicoRepo = AppDataSource.getRepository(TopicosAjuda);
          const novoTopico = await topicoRepo.findOne({ where: { id: parseInt(columnValue) } });
          if (!novoTopico) {
            return res.status(400).json({
              error: true,
              message: "Tópico inválido"
            });
          }
          updates.topicoAjuda = novoTopico;
          updates.updatedAt = new Date();
          descricaoHistorico = `Tópico alterado para "${novoTopico.nome}" via Kanban`;
        }
        break;
    }

    // iniciar transação para consistência
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // att chamado se houver mudanças
      if (Object.keys(updates).length > 0) {
        await queryRunner.manager.update(Chamados, chamadoId, updates);

        // add histórico
        if (descricaoHistorico) {
          const historico = queryRunner.manager.create(ChamadoHistorico, {
            chamado: chamado,
            usuario: usuarioHistorico,
            acao: descricaoHistorico,
            dataMov: new Date()
          });
          await queryRunner.manager.save(historico);
        }
      }

      // att ou criar posição no Kanban
      const existingPosition = await queryRunner.manager.findOne(KanbanPositions, {
        where: {
          idChamado: chamadoId,
          groupBy: groupBy
        }
      });

      if (existingPosition) {
        await queryRunner.manager.update(KanbanPositions, existingPosition.id, {
          columnValue: columnValue,
          position: position,
          updatedBy: userId,
          updatedAt: new Date()
        });
      } else {
        const newPosition = queryRunner.manager.create(KanbanPositions, {
          idChamado: chamadoId,
          groupBy: groupBy,
          columnValue: columnValue,
          position: position,
          updatedBy: userId
        });
        await queryRunner.manager.save(newPosition);
      }

      await queryRunner.commitTransaction();

  
      res.json({
        error: false,
        message: "Chamado movido com sucesso",
        data: {
          chamadoId,
          groupBy,
          columnValue,
          position
        }
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();

      throw error;
    } finally {
      await queryRunner.release();
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    res.status(500).json({
      error: true,
      message: "Erro interno do servidor",
      details: errorMessage
    });
  }
});

export default router;