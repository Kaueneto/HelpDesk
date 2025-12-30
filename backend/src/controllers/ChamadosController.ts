import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Chamados } from "../entities/Chamados";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { ChamadoMensagens } from "../entities/ChamadoMensagens";
import { ChamadoAnexos } from "../entities/ChamadoAnexos";
import { Users } from "../entities/Users";
import { StatusChamado } from "../entities/StatusChamado";
import { TipoPrioridade } from "../entities/TipoPrioridade";
import { ParametrosSistema } from "../entities/ParametrosSistema";
import { verifyToken } from "../Middleware/AuthMiddleware";
import { supabase, SUPABASE_BUCKET } from "../config/supabase";

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

// buscar um chamado específico por ID
router.get("/chamados/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const chamadoRepository = AppDataSource.getRepository(Chamados);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: [
        "usuario",
        "tipoPrioridade",
        "departamento",
        "topicoAjuda",
        "status",
        "userResponsavel",
        "userFechamento",
        "anexos"
      ],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Buscar apenas anexos do tipo CHAMADO (anexos iniciais) e gerar signed URLs
    const anexosIniciais = chamado.anexos?.filter(a => a.tipoAnexo === 'CHAMADO') || [];
    const anexosComUrls = await Promise.all(
      anexosIniciais.map(async (anexo) => {
        const { data: signedUrlData } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .createSignedUrl(anexo.url, 3600);
        
        return {
          id: anexo.id,
          filename: anexo.filename,
          signedUrl: signedUrlData?.signedUrl,
          criadoEm: anexo.criadoEm,
        };
      })
    );

    // Formatar resposta
    const chamadoFormatado = {
      id: chamado.id,
      numeroChamado: chamado.numeroChamado,
      ramal: chamado.ramal,
      resumoChamado: chamado.resumoChamado,
      descricaoChamado: chamado.descricaoChamado,
      dataAbertura: chamado.dataAbertura,
      dataAtribuicao: chamado.dataAtribuicao,
      dataFechamento: chamado.dataFechamento,
      usuario: chamado.usuario ? {
        id: chamado.usuario.id,
        name: chamado.usuario.name,
        email: chamado.usuario.email
      } : null,
      tipoPrioridade: chamado.tipoPrioridade,
      departamento: chamado.departamento,
      topicoAjuda: chamado.topicoAjuda,
      status: chamado.status,
      userResponsavel: chamado.userResponsavel ? {
        id: chamado.userResponsavel.id,
        name: chamado.userResponsavel.name
      } : null,
      userFechamento: chamado.userFechamento ? {
        id: chamado.userFechamento.id,
        name: chamado.userFechamento.name
      } : null,
      anexos: anexosComUrls, // Anexos iniciais com signed URLs
    };

    return res.status(200).json(chamadoFormatado);
  } catch (error) {
    console.error("Erro ao buscar chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar chamado",
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
      dataFechamentoFim,
      page = 1,
      pageSize = 10
    } = req.query;
    
    const userRoleId = req.userRoleId; // role do usuario logado
    const userId = req.userId; // id do usuario logado

    // Converter para números
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const pageSizeNum = Math.max(1, Math.min(100, parseInt(String(pageSize)) || 10)); // máximo 100 registros
    const offset = (pageNum - 1) * pageSizeNum;

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

    // Obter total de registros ANTES de aplicar paginação
    const total = await queryBuilder.getCount();

    // Aplicar paginação
    queryBuilder.offset(offset).limit(pageSizeNum);

    const chamados = await queryBuilder.getMany();

    // Calcular total de páginas
    const totalPages = Math.ceil(total / pageSizeNum);

    // Formatar resposta
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

    return res.status(200).json({
      chamados: chamadosFormatados,
      total,
      totalPages,
      currentPage: pageNum,
      pageSize: pageSizeNum,
    });
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
    const userRepository = AppDataSource.getRepository(Users);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Buscar nomes dos usuários para o histórico
    const [usuarioAtribuiu, usuarioResponsavel] = await Promise.all([
      userRepository.findOne({ where: { id: usuarioId }, select: ["id", "name"] }),
      userRepository.findOne({ where: { id: userResponsavelId }, select: ["id", "name"] })
    ]);

    // save status anterior antes de mudar
    const statusAnteriorId = chamado.status?.id || 1;

    // atribuir responsável e data de atribuição
    chamado.userResponsavel = { id: userResponsavelId } as Users;
    chamado.dataAtribuicao = new Date();
    chamado.status = { id: 2 } as StatusChamado; // 2 = EM ATENDIMENTO

    await chamadoRepository.save(chamado);

    // registrar no historico com nomes dos usuários
    const nomeQuemAtribuiu = usuarioAtribuiu?.name || "Usuário";
    const nomeResponsavel = usuarioResponsavel?.name || "Usuário";
    
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: `${nomeQuemAtribuiu} definiu este chamado para ${nomeResponsavel}`,
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

// assumir chamado (admin assume responsabilidade pelo chamado)
router.put("/chamados/:id/assumir", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.userId; // usuário que está assumindo

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["status", "userResponsavel"],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Verificar se já está encerrado
    if (chamado.status?.id === 3) {
      return res.status(400).json({ mensagem: "Não é possível assumir um chamado encerrado" });
    }

    // save status anterior antes de mudar
    const statusAnteriorId = chamado.status?.id || 1;
    const responsavelAnterior = chamado.userResponsavel?.id;

    // Atribuir responsável e data de atribuição
    chamado.userResponsavel = { id: usuarioId } as Users;
    chamado.dataAtribuicao = new Date();
    
    // Se estava aberto (status 1), mudar para em atendimento (status 2)
    if (chamado.status?.id === 1) {
      chamado.status = { id: 2 } as StatusChamado; // 2 = EM ATENDIMENTO
    }

    await chamadoRepository.save(chamado);

    // Buscar nome do usuário para o histórico
    const usuario = await userRepository.findOne({
      where: { id: usuarioId },
      select: ["id", "name"]
    });

    const nomeUsuario = usuario?.name || "Usuário";

    // registrar no historico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: `Este chamado foi assumido por ${nomeUsuario}`,
      statusAnterior: { id: statusAnteriorId },
      statusNovo: chamado.status,
      dataMov: new Date(),
    });

    // Recarregar chamado com todas as relações
    const chamadoAtualizado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: [
        "usuario",
        "userResponsavel",
        "userFechamento",
        "tipoPrioridade",
        "departamento",
        "topicoAjuda",
        "status",
      ],
    });

    return res.status(200).json({
      mensagem: "Chamado assumido com sucesso!",
      chamado: chamadoAtualizado,
    });
  } catch (error) {
    console.error("Erro ao assumir chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao assumir chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// reabrir chamado encerrado (apenas admin)
router.put("/chamados/:id/reabrir", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.userId; // usuário que está reabrindo

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["status"],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Verificar se está encerrado
    if (chamado.status?.id !== 3) {
      return res.status(400).json({ mensagem: "Apenas chamados encerrados podem ser reabertos" });
    }

    // Buscar nome do usuário
    const usuario = await userRepository.findOne({
      where: { id: usuarioId },
      select: ["id", "name"]
    });

    const nomeUsuario = usuario?.name || "Usuário";

    // Limpar dados de fechamento
    chamado.dataFechamento = null;
    chamado.userFechamento = null;

    // Definir novo responsável (quem está reabrindo)
    chamado.userResponsavel = { id: usuarioId } as Users;
    chamado.dataAtribuicao = new Date();
    
    // Mudar status para EM ATENDIMENTO (2)
    chamado.status = { id: 2 } as StatusChamado;

    await chamadoRepository.save(chamado);

    // Registrar no histórico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: `${nomeUsuario} reabriu este chamado`,
      statusAnterior: { id: 3 }, // ENCERRADO
      statusNovo: { id: 2 }, // EM ATENDIMENTO
      dataMov: new Date(),
    });

    // Recarregar chamado com todas as relações
    const chamadoAtualizado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: [
        "usuario",
        "userResponsavel",
        "userFechamento",
        "tipoPrioridade",
        "departamento",
        "topicoAjuda",
        "status",
      ],
    });

    return res.status(200).json({
      mensagem: "Chamado reaberto com sucesso!",
      chamado: chamadoAtualizado,
    });
  } catch (error) {
    console.error("Erro ao reabrir chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao reabrir chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// editar chamado (apenas usuário criador e apenas se status = ABERTO)
router.put("/chamados/:id/editar", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.userId;
    const {
      resumoChamado,
      descricaoChamado,
      ramal,
      departamentoId,
      topicoAjudaId,
      prioridadeId,
    } = req.body;

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["status", "usuario"],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Verificar se é o criador do chamado
    if (chamado.usuario.id !== usuarioId) {
      return res.status(403).json({ mensagem: "Você não tem permissão para editar este chamado" });
    }

    // Verificar se está ABERTO (status 1)
    if (chamado.status?.id !== 1) {
      return res.status(400).json({ 
        mensagem: "Você não pode editar este chamado agora pois um usuário já está te ajudando com a resolução" 
      });
    }

    // Buscar nome do usuário
    const usuario = await userRepository.findOne({
      where: { id: usuarioId },
      select: ["id", "name"]
    });

    const nomeUsuario = usuario?.name || "Usuário";

    // Atualizar campos
    chamado.resumoChamado = resumoChamado;
    chamado.descricaoChamado = descricaoChamado;
    chamado.ramal = ramal;
    chamado.departamento = { id: departamentoId } as any;
    chamado.topicoAjuda = { id: topicoAjudaId } as any;
    chamado.tipoPrioridade = { id: prioridadeId } as any;

    await chamadoRepository.save(chamado);

    // Registrar no histórico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: `${nomeUsuario} editou este chamado`,
      statusAnterior: chamado.status,
      statusNovo: chamado.status,
      dataMov: new Date(),
    });

    // Recarregar com relações
    const chamadoAtualizado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: [
        "usuario",
        "userResponsavel",
        "userFechamento",
        "tipoPrioridade",
        "departamento",
        "topicoAjuda",
        "status",
      ],
    });

    return res.status(200).json({
      mensagem: "Chamado editado com sucesso!",
      chamado: chamadoAtualizado,
    });
  } catch (error) {
    console.error("Erro ao editar chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao editar chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// remover anexo de chamado (usuário criador ou admin)
router.delete("/chamados/:id/anexo/:anexoId", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, anexoId } = req.params;
    const usuarioId = req.userId;

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const anexoRepository = AppDataSource.getRepository(ChamadoAnexos);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["usuario"],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Verificar permissão (criador ou admin)
    if (chamado.usuario.id !== usuarioId && req.userRoleId !== 1) {
      return res.status(403).json({ mensagem: "Você não tem permissão para remover este anexo" });
    }

    const anexo = await anexoRepository.findOne({
      where: { id: Number(anexoId), chamado: { id: Number(id) } },
    });

    if (!anexo) {
      return res.status(404).json({ mensagem: "Anexo não encontrado" });
    }

    // Remover arquivo do Supabase
    try {
      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([anexo.url]);

      if (error) {
        console.error("Erro ao remover arquivo do Supabase:", error);
      }
    } catch (storageError) {
      console.error("Erro ao acessar Supabase Storage:", storageError);
    }

    // Remover do banco
    await anexoRepository.remove(anexo);

    return res.status(200).json({ mensagem: "Anexo removido com sucesso!" });
  } catch (error) {
    console.error("Erro ao remover anexo:", error);
    return res.status(500).json({
      mensagem: "Erro ao remover anexo",
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
    console.log(`[DEBUG] Buscando mensagens do chamado ${id}`);
    
    const mensagensRepository = AppDataSource.getRepository(ChamadoMensagens);
    const anexosRepository = AppDataSource.getRepository(ChamadoAnexos);
    
    // Buscar mensagens
    const mensagens = await mensagensRepository
      .createQueryBuilder("mensagem")
      .leftJoinAndSelect("mensagem.usuario", "usuario")
      .where("mensagem.chamado_id = :chamadoId", { chamadoId: Number(id) })
      .orderBy("mensagem.dataEnvio", "ASC")
      .getMany();

    console.log(`[DEBUG] Mensagens encontradas: ${mensagens.length}`);

    if (mensagens.length === 0) {
      return res.status(200).json([]);
    }

    // Buscar todos os anexos de uma vez
    const mensagensIds = mensagens.map(m => m.id);
    const todosAnexos = await anexosRepository
      .createQueryBuilder("anexo")
      .where("anexo.mensagemId IN (:...ids)", { ids: mensagensIds })
      .andWhere("anexo.tipoAnexo = :tipo", { tipo: 'MENSAGEM' })
      .getMany();

    console.log(`[DEBUG] Total de anexos encontrados: ${todosAnexos.length}`);

    // Mapear anexos para as mensagens correspondentes
    const mensagensComAnexos = await Promise.all(
      mensagens.map(async (msg) => {
        const anexosDaMensagem = todosAnexos.filter(anexo => anexo.mensagemId === msg.id);
        
        // Gerar signed URLs para cada anexo
        const anexosComSignedUrl = await Promise.all(
          anexosDaMensagem.map(async (anexo) => {
            try {
              const { data, error } = await supabase.storage
                .from(SUPABASE_BUCKET!)
                .createSignedUrl(anexo.url, 3600);

              if (error) {
                console.error(`[ERROR] Erro ao gerar signed URL para ${anexo.filename}:`, error);
                return { ...anexo, signedUrl: null };
              }

              return { ...anexo, signedUrl: data?.signedUrl };
            } catch (err) {
              console.error(`[ERROR] Exceção ao gerar signed URL:`, err);
              return { ...anexo, signedUrl: null };
            }
          })
        );

        return {
          ...msg,
          anexos: anexosComSignedUrl
        };
      })
    );

    console.log(`[DEBUG] Retornando ${mensagensComAnexos.length} mensagens com anexos`);
    return res.status(200).json(mensagensComAnexos);
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar mensagens",
    });
  }
});

// Editar múltiplos chamados
router.patch("/chamados/editar-multiplos", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chamadosIds, statusId, prioridadeId } = req.body;
    const usuarioId = req.userId;

    if (!chamadosIds || !Array.isArray(chamadosIds) || chamadosIds.length === 0) {
      return res.status(400).json({
        message: "Nenhum chamado selecionado",
      });
    }

    if (!statusId && !prioridadeId) {
      return res.status(400).json({
        message: "Selecione ao menos um campo para alterar",
      });
    }

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);
    const statusRepository = AppDataSource.getRepository(StatusChamado);

    // Buscar usuário
    const usuario = await userRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Buscar chamados
    const chamados = await chamadoRepository.find({
      where: chamadosIds.map((id: number) => ({ id })),
      relations: ["status", "tipoPrioridade"],
    });

    const erros: string[] = [];
    const alterados: number[] = [];

    for (const chamado of chamados) {
      const statusAnterior = chamado.status;
      const prioridadeAnterior = chamado.tipoPrioridade;
      let alterou = false;

      // Validar e alterar status
      if (statusId) {
        // Validação: não pode alterar para o mesmo status
        if (chamado.status.id === statusId) {
          const statusNome = chamado.status.nome.toLowerCase();
          if (statusNome.includes('aberto')) {
            erros.push(`Chamado ${chamado.numeroChamado} já está aberto`);
            continue;
          } else if (statusNome.includes('encerrado') || statusNome.includes('fechado')) {
            erros.push(`Chamado ${chamado.numeroChamado} já está encerrado`);
            continue;
          } else if (statusNome.includes('atendimento') || statusNome.includes('andamento')) {
            erros.push(`Chamado ${chamado.numeroChamado} já está em atendimento`);
            continue;
          }
        }

        const novoStatus = await statusRepository.findOne({
          where: { id: statusId },
        });

        if (novoStatus) {
          chamado.status = novoStatus;
          
          // Se for encerrado, definir data de fechamento e usuário que finalizou
          if (novoStatus.nome.toLowerCase().includes('encerrado') || 
              novoStatus.nome.toLowerCase().includes('fechado')) {
            chamado.dataFechamento = new Date();
            chamado.userFechamento = { id: usuarioId } as any;
          }

          // Salvar histórico de status
          await historicoRepository.save({
            chamado: { id: chamado.id },
            usuario: { id: usuarioId },
            acao: `${usuario.name} alterou o status do chamado para '${novoStatus.nome}'`,
            statusAnterior: { id: statusAnterior.id },
            statusNovo: { id: novoStatus.id },
            dataMov: new Date(),
          });

          alterou = true;
        }
      }

      // Validar e alterar prioridade
      if (prioridadeId && chamado.tipoPrioridade.id !== prioridadeId) {
        chamado.tipoPrioridade = { id: prioridadeId } as any;

        // Buscar nome da prioridade para o histórico
        const prioridadeRepository = AppDataSource.getRepository(TipoPrioridade);
        const prioridade = await prioridadeRepository.findOne({
          where: { id: prioridadeId },
        });

        const prioridadeNome = prioridade?.nome || 'DESCONHECIDA';

        // Salvar histórico de prioridade
        await historicoRepository.save({
          chamado: { id: chamado.id },
          usuario: { id: usuarioId },
          acao: `${usuario.name} definiu a prioridade deste chamado para: ${prioridadeNome.toUpperCase()}`,
          statusAnterior: chamado.status ? { id: chamado.status.id } : undefined,
          statusNovo: chamado.status ? { id: chamado.status.id } : undefined,
          dataMov: new Date(),
        });

        alterou = true;
      }

      if (alterou) {
        await chamadoRepository.save(chamado);
        alterados.push(chamado.id);
      }
    }

    if (erros.length > 0 && alterados.length === 0) {
      return res.status(400).json({
        message: erros.join('. '),
      });
    }

    return res.status(200).json({
      message: `${alterados.length} chamado(s) alterado(s) com sucesso`,
      alterados,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro ao editar múltiplos chamados:", error);
    return res.status(500).json({
      message: "Erro ao editar chamados",
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
