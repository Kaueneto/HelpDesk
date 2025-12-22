import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Chamados } from "../entities/Chamados";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { ChamadoMensagens } from "../entities/ChamadoMensagens";
import { Users } from "../entities/Users";
import { StatusChamado } from "../entities/StatusChamado";
import { ParametrosSistema } from "../entities/ParametrosSistema";
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

    // criar a data atual + log no backend
    const dataAtual = new Date();
    console.log('Data de abertura no backend:', dataAtual.toISOString());

    // criar chamado com apenas os campos obrigatórios iniciais
    const chamado = chamadoRepository.create({
      ramal,
      numeroChamado: Date.now(), // Gerado automaticamente (pode melhorar depois)
      dataAbertura: dataAtual, // defin explicitamente a data
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
    console.log('Chamado salvo - dataAbertura:', chamado.dataAbertura);

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



//rotar para obter os chamados com filtros (usuarios comuns e administradores)
router.get("/chamados", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      statusId, 
      topicoAjudaId, 
      assunto, 
      departamentoId, 
      prioridadeId, 
      nomeUsuario,
      dataAberturaInicio,
      dataAberturaFim,
      dataFechamentoInicio,
      dataFechamentoFim
    } = req.query;
    
    const userRoleId = req.userRoleId; // role do usuario logado
    const userId = req.userId; // id do usuario logado

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const queryBuilder = chamadoRepository
      .createQueryBuilder("chamado")
      .leftJoinAndSelect("chamado.usuario", "usuario")
      .leftJoinAndSelect("chamado.tipoPrioridade", "tipoPrioridade")
      .leftJoinAndSelect("chamado.departamento", "departamento")
      .leftJoinAndSelect("chamado.topicoAjuda", "topicoAjuda")
      .leftJoinAndSelect("chamado.status", "status")
      .leftJoinAndSelect("chamado.userResponsavel", "userResponsavel")
      .leftJoinAndSelect("chamado.userFechamento", "userFechamento");

    // Filtro obrigatorio: usuarios comuns veem apenas seus proprios chamados
    if (userRoleId !== 1) {
      queryBuilder.andWhere("chamado.id_user = :userId", { userId });
    }

    // Lógica especial para ATRASADO (statusId = 4)
    if (statusId === '4') {
      // Buscar horas para atraso dos parâmetros do sistema
      const parametrosRepository = AppDataSource.getRepository(ParametrosSistema);
      const parametros = await parametrosRepository.findOne({ where: { id: 1 } });
      const horasParaAtraso = parametros?.horasParaAtraso || 24;

      // Calcular a data limite (agora - horasParaAtraso)
      const dataLimite = new Date();
      dataLimite.setHours(dataLimite.getHours() - horasParaAtraso);

      // Filtrar chamados ABERTOS (status = 1) que estão abertos há mais tempo que o configurado
      queryBuilder.andWhere("chamado.id_status = :statusAberto", { statusAberto: 1 });
      queryBuilder.andWhere("chamado.data_abertura < :dataLimite", { dataLimite });
    } else if (statusId) {
      // Status normal (1, 2, 3)
      queryBuilder.andWhere("chamado.id_status = :statusId", { statusId });
    }

    // Filtro por tópico de ajuda
    if (topicoAjudaId) {
      queryBuilder.andWhere("chamado.id_topico_ajuda = :topicoAjudaId", { topicoAjudaId });
    }

    // Filtro por assunto (resumo ou descrição)
    if (assunto) {
      queryBuilder.andWhere(
        "(chamado.resumo_chamado ILIKE :assunto OR chamado.descricao_chamado ILIKE :assunto)",
        { assunto: `%${assunto}%` }
      );
    }

    // Filtros extras apenas para administradores (roleId = 1)
    if (userRoleId === 1) {
      // Filtro por departamento
      if (departamentoId) {
        queryBuilder.andWhere("chamado.id_departamento = :departamentoId", { departamentoId });
      }

      // Filtro por prioridade
      if (prioridadeId) {
        queryBuilder.andWhere("chamado.id_prioridade = :prioridadeId", { prioridadeId });
      }

      // Filtro por nome do usuário
      if (nomeUsuario) {
        queryBuilder.andWhere("usuario.name ILIKE :nomeUsuario", { nomeUsuario: `%${nomeUsuario}%` });
      }

      // Filtro por data de abertura
      if (dataAberturaInicio && dataAberturaFim) {
        queryBuilder.andWhere("chamado.data_abertura BETWEEN :dataAberturaInicio AND :dataAberturaFim", {
          dataAberturaInicio,
          dataAberturaFim,
        });
      } else if (dataAberturaInicio) {
        queryBuilder.andWhere("chamado.data_abertura >= :dataAberturaInicio", { dataAberturaInicio });
      } else if (dataAberturaFim) {
        queryBuilder.andWhere("chamado.data_abertura <= :dataAberturaFim", { dataAberturaFim });
      }

      // Filtro por data de fechamento
      if (dataFechamentoInicio && dataFechamentoFim) {
        queryBuilder.andWhere("chamado.data_fechamento BETWEEN :dataFechamentoInicio AND :dataFechamentoFim", {
          dataFechamentoInicio,
          dataFechamentoFim,
        });
      } else if (dataFechamentoInicio) {
        queryBuilder.andWhere("chamado.data_fechamento >= :dataFechamentoInicio", { dataFechamentoInicio });
      } else if (dataFechamentoFim) {
        queryBuilder.andWhere("chamado.data_fechamento <= :dataFechamentoFim", { dataFechamentoFim });
      }
    }

    // Ordenar por data de abertura (mais recentes primeiro)
    queryBuilder.orderBy("chamado.data_abertura", "DESC");

    const chamados = await queryBuilder.getMany();

    // Formatar resposta para retornar apenas dados essenciais dos usuarios
    const chamadosFormatados = chamados.map((chamado) => ({
      id: chamado.id,
      numeroChamado: chamado.numeroChamado,
      ramal: chamado.ramal,
      resumoChamado: chamado.resumoChamado,
      descricaoChamado: chamado.descricaoChamado,
      dataAbertura: chamado.dataAbertura,
      dataAtribuicao: chamado.dataAtribuicao,
      dataFechamento: chamado.dataFechamento,
      usuario: chamado.usuario ? { id: chamado.usuario.id, name: chamado.usuario.name } : null,
      tipoPrioridade: chamado.tipoPrioridade,
      departamento: chamado.departamento,
      topicoAjuda: chamado.topicoAjuda,
      status: chamado.status,
      userResponsavel: chamado.userResponsavel ? { id: chamado.userResponsavel.id, name: chamado.userResponsavel.name } : null,
      userFechamento: chamado.userFechamento ? { id: chamado.userFechamento.id, name: chamado.userFechamento.name } : null,
    }));

    return res.status(200).json(chamadosFormatados);
  } catch (error) {
    console.error("Erro ao listar chamados:", error);
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

// Buscar mensagens de um chamado
router.get("/chamados/:id/mensagens", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const mensagensRepository = AppDataSource.getRepository(ChamadoMensagens);
    const mensagens = await mensagensRepository.find({
      where: { chamado: { id: Number(id) } },
      relations: ["usuario"],
      order: { dataEnvio: "ASC" },
    });

    return res.status(200).json(mensagens);
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar mensagens",
    });
  }
});

// Buscar lista de status
router.get("/status", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const statusRepository = AppDataSource.getRepository(StatusChamado);
    const statusList = await statusRepository.find({
      order: { id: "ASC" },
    });

    // Mapear para incluir descricaoStatus (compatibilidade com frontend)
    const statusFormatted = statusList.map(status => ({
      id: status.id,
      descricaoStatus: status.nome,
      nome: status.nome,
    }));

    return res.status(200).json(statusFormatted);
  } catch (error) {
    console.error("Erro ao buscar status:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar status",
    });
  }
});

export default router;
