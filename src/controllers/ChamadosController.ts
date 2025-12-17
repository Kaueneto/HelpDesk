import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Chamados } from "../entities/Chamados";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { ChamadoMensagens } from "../entities/ChamadoMensagens";
import { Users } from "../entities/Users";
import { StatusChamado } from "../entities/StatusChamado";
import { verifyToken } from "../Middleware/AuthMiddleware";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

const router = Router();

//cadastrar chamado
router.post("/chamados", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      ramal,
      prioridadeId,
      topicoAjudaId,
      departamentoId,
      resumoChamado,
      descricaoChamado,
    } = req.body;

    const usuarioId = req.userId; // ID do usuário vindo do token

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);

    // criar chamado com apenas os campos obrigatórios iniciais
    // dataAbertura é automática (@CreateDateColumn)
    // dataAtribuicao, userResponsavel, dataFechamento, userFechamento ficam NULL
    const chamado = chamadoRepository.create({
      ramal,
      numeroChamado: Date.now(), // Gerado automaticamente (pode melhorar depois)
      status: { id: 1 }, // 1 = ABERTO
      resumoChamado,
      descricaoChamado,
      usuario: { id: usuarioId }, // Usuário que abriu o chamado
      tipoPrioridade: { id: prioridadeId },
      topicoAjuda: { id: topicoAjudaId },
      departamento: { id: departamentoId },
      // Campos que ficam NULL inicialmente:
      // - dataAtribuicao (preenchido quando admin atribuir)
      // - userResponsavel (preenchido quando admin atribuir)
      // - dataFechamento (preenchido quando finalizar)
      // - userFechamento (preenchido quando finalizar)
    });

    await chamadoRepository.save(chamado);

    // Registrar no histórico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: "Chamado aberto",
      statusAnterior: undefined, // Não tem status anterior quando abre
      statusNovo: { id: 1 }, // Status ABERTO
      dataMov: new Date(),
    });

    // recaarregar os chamados | essa parte traz as relacoes da tabela
    const chamadoCompleto = await chamadoRepository.findOne({
      where: { id: chamado.id },
      relations: ["usuario", "tipoPrioridade", "departamento", "topicoAjuda", "status"],
    });

    return res.status(201).json({
      mensagem: "Chamado aberto com sucesso!",
      chamado: chamadoCompleto,
    });
  } catch (error) {
    console.error("Erro ao abrir chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao abrir chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});



//rotar para obter os chamados
router.get("/chamados/meus", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usuarioId = req.userId;

    const chamados = await AppDataSource.getRepository(Chamados).find({
      where: { usuario: { id: usuarioId } },
      relations: ["tipoPrioridade", "departamento", "topicoAjuda", "status"],
      order: { dataAbertura: "DESC" },
    });

    return res.status(200).json(chamados);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar chamados",
    });
  }
});



//rotar para obter os chamados
router.get("/chamados", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const chamados = await AppDataSource.getRepository(Chamados).find({
      relations: ["usuario", "tipoPrioridade", "departamento", "topicoAjuda", "status"],
      order: { dataAbertura: "DESC" },
    });

    return res.status(200).json(chamados);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar chamados",
    });
  }
});

// atribuir chamado a um responsável (apenas admin)
router.put("/chamados/:id/atribuir", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userResponsavelId } = req.body;
    const usuarioId = req.userId; // adm que está atribuindo

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // save status anterior antes de mudar
    const statusAnteriorId = chamado.status?.id || 1;

    // atribuir responsável e data de atribuição
    chamado.userResponsavel = { id: userResponsavelId } as Users;
    chamado.dataAtribuicao = new Date();
    chamado.status = { id: 2 } as StatusChamado; // 2 = EM ATENDIMENTO

    await chamadoRepository.save(chamado);

    // registrar no historico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: `Chamado atribuído ao responsável ID ${userResponsavelId}`,
      statusAnterior: { id: statusAnteriorId },
      statusNovo: { id: 2 }, // EM ATENDIMENTO
      dataMov: new Date(),
    });

    return res.status(200).json({
      mensagem: "Chamado atribuído com sucesso!",
      chamado,
    });
  } catch (error) {
    console.error("Erro ao atribuir chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao atribuir chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// encerrar chamado (apenas admin ou responsável)
router.put("/chamados/:id/encerrar", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.userId; // Admin que está encerrando

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["status", "userFechamento"],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // verificar se o chamado já está encerrado
    if (chamado.status?.id === 3) {
      return res.status(400).json({
        mensagem: "Chamado já foi fechado",
        dataFechamento: chamado.dataFechamento,
        usuarioEncerrou: chamado.userFechamento
          ? { id: chamado.userFechamento.id, name: chamado.userFechamento.name }
          : null,
      });
    }

    // save status anterior antes de mudar
    const statusAnteriorId = chamado.status?.id || 2;

    // Encerrar chamado
    chamado.status = { id: 3 } as StatusChamado; // 3 = ENCERRADO
    chamado.dataFechamento = new Date();
    chamado.userFechamento = { id: usuarioId } as Users;

    await chamadoRepository.save(chamado);

    // registrar no historico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: "Chamado encerrado",
      statusAnterior: { id: statusAnteriorId },
      statusNovo: { id: 3 }, // ENCERRADO
      dataMov: new Date(),
    });

    // recarregar o chamado com todas as relações
    const chamadoCompleto = await chamadoRepository.findOne({
      where: { id: chamado.id },
      relations: ["usuario", "tipoPrioridade", "departamento", "topicoAjuda", "status", "userResponsavel", "userFechamento"],
    });

    // formatar resposta para retornar apenas o nome dos ususrios
    const response = {
      ...chamadoCompleto,
      usuario: chamadoCompleto?.usuario ? { id: chamadoCompleto.usuario.id, name: chamadoCompleto.usuario.name } : null,
      userResponsavel: chamadoCompleto?.userResponsavel ? { id: chamadoCompleto.userResponsavel.id, name: chamadoCompleto.userResponsavel.name } : null,
      userFechamento: chamadoCompleto?.userFechamento ? { id: chamadoCompleto.userFechamento.id, name: chamadoCompleto.userFechamento.name } : null,
    };

    return res.status(200).json({
      mensagem: "Chamado encerrado com sucesso!",
      chamado: response,
    });
  } catch (error) {
    console.error("Erro ao encerrar chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao encerrar chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});


router.get("/chamados/:id/historico", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const historico = await AppDataSource.getRepository(ChamadoHistorico).find({
      where: { chamado: { id: Number(id) } },
      relations: ["usuario"],
      order: { dataMov: "ASC" },
    });

    return res.status(200).json(historico);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao buscar histórico do chamado",
    });
  }
});


router.post("/chamados/:id/mensagens", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;
    const usuarioId = req.userId;

    const mensagensRepository = AppDataSource.getRepository(ChamadoMensagens);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);

    const novaMensagem = mensagensRepository.create({
      mensagem,
      usuario: { id: usuarioId },
      chamado: { id: Number(id) },
    });

    await mensagensRepository.save(novaMensagem);

    // buscar o chamado para pegar o status atual
    const chamado = await AppDataSource.getRepository(Chamados).findOne({
      where: { id: Number(id) },
      relations: ["status"],
    });

    await historicoRepository.save({
      chamado: { id: Number(id) },
      usuario: { id: usuarioId },
      acao: "Mensagem enviada",
      statusAnterior: chamado ? { id: chamado.status.id } : undefined,
      statusNovo: chamado ? { id: chamado.status.id } : undefined, // Status não muda
      dataMov: new Date(),
    });

    return res.status(201).json(novaMensagem);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao enviar mensagem",
    });
  }
});

export default router;
