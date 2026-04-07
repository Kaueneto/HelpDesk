import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { In } from "typeorm";
import { Chamados } from "../entities/Chamados";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { ChamadoMensagens } from "../entities/ChamadoMensagens";
import { ChamadoAnexos } from "../entities/ChamadoAnexos";
import { Users } from "../entities/Users";
import { StatusChamado } from "../entities/StatusChamado";
import { TipoPrioridade } from "../entities/TipoPrioridade";
import { Departamentos } from "../entities/Departamentos";
import { TopicosAjuda } from "../entities/TopicosAjuda";
import { ParametrosSistema } from "../entities/ParametrosSistema";
import { verifyToken } from "../Middleware/AuthMiddleware";
import { supabase, SUPABASE_BUCKET } from "../config/supabase";
import * as EmailService from "../services/EmailService";
import { KanbanPositions } from "../entities/KanbanPositions";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

const router = Router();

// rota pra enviar atualizacao por email com cc, cco e alteracao de status
router.post(
  "/chamados/:id/enviar-atualizacao-email",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { destinatario, mensagem, statusId, cc, cco, incluirTopico } = req.body;
      const chamadoId = Number(req.params.id);
      const usuarioId = req.userId;

      if (!destinatario || !mensagem || !chamadoId) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
      }

      const chamadoRepository = AppDataSource.getRepository(Chamados);
      const userRepository = AppDataSource.getRepository(Users);
      const statusRepository = AppDataSource.getRepository(StatusChamado);

      const chamado = await chamadoRepository.findOne({
        where: { id: chamadoId },
        relations: ["usuario", "status", "topicoAjuda", "userFechamento", "userResponsavel"],
      });
      if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado.' });
      const usuario = chamado.usuario;

      // salvar status anterior antes de qualquer alteração
      let statusAnterior = chamado.status;
      let statusNovo = chamado.status;
      let alterouStatus = false;
      if (statusId && chamado.status?.id !== statusId) {
        const novoStatus = await statusRepository.findOne({ where: { id: statusId } });
        if (novoStatus) {
          chamado.status = novoStatus;
          
          // LOGICA DE ATUALIZAÇÃO DE CAMPOS CONFORME O STATUS
          // STATUS 3 = ENCERRADO
          if (statusId === 3) {
            chamado.dataFechamento = new Date();
            chamado.userFechamento = { id: usuarioId } as Users;
          }
          // STATUS 5 = REABERTO
          else if (statusId === 5) {
            chamado.dataFechamento = null;
            chamado.userFechamento = null;
            chamado.userResponsavel = { id: usuarioId } as Users;
            chamado.dataAtribuicao = new Date();
          }
          
          await chamadoRepository.save(chamado);
          statusNovo = novoStatus;
          alterouStatus = true;
        }
      }

      // buscar nome do usuário que está enviando (admin ou usuario normalç)
      let nomeRemetente = "Equipe de Suporte";
      if (usuarioId) {
        const remetente = await userRepository.findOne({ where: { id: usuarioId } });
        if (remetente) nomeRemetente = remetente.name;
      }


      const mensagensRepository = AppDataSource.getRepository(ChamadoMensagens);
      const usuarioMensagem = usuarioId
        ? await userRepository.findOne({ where: { id: usuarioId } })
        : null;

      console.log('EMAIL DEBUG:', {
        destinatario,
        cc,
        cco,
        mensagem,
        chamadoId,
        usuarioId
      });

      await mensagensRepository.save({
        usuario: usuarioMensagem || usuario,
        chamado: chamado,
        mensagem: mensagem,
        enviadoPorEmail: true,
        email_enviado: destinatario || '',
        email_copia: cc || '',
        email_copia_oculta: cco || '',
      });

      // registrar o  histórico sempre que enviar atualização por email
      const historicoRepository = AppDataSource.getRepository(require("../entities/ChamadoHistorico").ChamadoHistorico);
      let acaoHistorico = "Mensagem enviada através de atualização no Email.";
      if (alterouStatus && statusNovo) {
        acaoHistorico = `Mensagem enviada através de atualização no Email e status atualizado para: ${statusNovo.nome}`;
      }
      await historicoRepository.save({
        chamado: chamado,
        usuario: usuarioMensagem || usuario,
        acao: acaoHistorico,
        dataMov: new Date(),
        statusAnterior: statusAnterior,
        statusNovo: statusNovo,
      });

      // enviar o email
      try {
        await EmailService.enviarAtualizacaoChamadoPorEmail({
          chamado,
          usuario,
          destinatario,
          mensagem,
          nomeRemetente,
          cc,
          cco,
          incluirTopico: !!incluirTopico,
        });

        // recarregar chamado com todas as relações para retornar os dados atualizados
        const chamadoAtualizado = await chamadoRepository.findOne({
          where: { id: chamadoId },
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
          message: 'Email enviado com sucesso.',
          chamado: chamadoAtualizado 
        });

      } catch (error: any) {
        console.error(error);
        // retorna mensagem amigável ao frontend caso tenha erro
        return res.status(500).json({ mensagem: error.message || 'Erro ao enviar o email.' });
      }
    }catch (error: any) {
      console.error(error);
      return res.status(500).json({
        mensagem: error.message || 'Erro geral na rota.'
      });
    }
  
  }
  
);

//cadastrar chamado //novo chamado
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

    // criar chamado com apenas os campos obrigatórios iniciais
    const chamado = chamadoRepository.create({
      ramal,
      //numero do chamdo sera gerado automaticamente no banco pela SEQUENCE
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


    
    // enviar resposta de imediato, antes dos emails
    // this evita timeout no frontend
    const response = res.status(201).json({
      mensagem: "Chamado aberto com sucesso!",
      chamado: chamadoCompleto,
    });
    //enviar emails de forma assincrone pra nao bloquear a resposta e evitar timeout no frontend
    setImmediate(async () => {
      try {
        // verif administradores que devem receber notificações
        const usersRepository = AppDataSource.getRepository(Users);
        const administradores = await usersRepository.find({
          where: { roleId: 1 }, // Buscar apenas administradores
          select: ["id", "name", "email"]
        });
        
        // buscar dados do usuário que abriu o chamado
        const usuarioSolicitante = await usersRepository.findOne({
          where: { id: usuarioId },
          select: ["id", "name", "email"]
        });
        
        if (usuarioSolicitante && administradores.length > 0) {
          // para cada administrador, verificar suas preferências e notificar
          for (const admin of administradores) {
            const preferenciasAdmin = await EmailService.verificarPreferenciasUsuario(admin.id);
            
            // verif se deve enviar email (preferência ID 1)
            if (preferenciasAdmin.includes(1)) {
              await EmailService.enviarEmailNotificacaoAdmin(admin, usuarioSolicitante, chamadoCompleto!);
            }
          }
          
          // verificar se o usuário quer receber email de abertura (preferência ID 2)
          const preferenciasUsuario = await EmailService.verificarPreferenciasUsuario(usuarioSolicitante.id);
          if (preferenciasUsuario.includes(2)) {
            await EmailService.enviarEmailConfirmacaoUsuario(usuarioSolicitante, chamadoCompleto!);
          }
        }

      } catch (emailError) {
        // log do erro de email, mas NÃO interrompe o fluxo
      }
    });

    return response;
  } catch (error) {

    return res.status(500).json({
      mensagem: "Erro ao abrir chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

//rota pra admin abriem chamados
router.post("/chamados/admin/criar", verifyToken, async (req: AuthenticatedRequest, res: Response) => {

  
  try {
    const {
      resumoChamado,
      descricaoChamado,
      topicoAjudaId,
      departamentoId,
      prioridadeId,
      userResponsavelId,
    } = req.body;

    const adminId = req.userId; // ID do admin que está criando
    const adminRoleId = req.userRoleId;

    // Verificar se é admin
    if (adminRoleId !== 1) {
      return res.status(403).json({
        mensagem: "Apenas administradores podem usar esta função",
      });
    }

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);

    const dataAtual = new Date();

    // Validar que responsável foi fornecido
    if (!userResponsavelId) {
      return res.status(400).json({
        mensagem: "Responsável é obrigatório",
      });
    }

    const chamado = chamadoRepository.create({
      ramal: 0, 
      //numero do chamdo sera gerado automaticamente no banco pela SEQUENCE
      dataAbertura: dataAtual,
      status: { id: userResponsavelId ? 2 : 1 }, // 2 = EM ANALISE se houver responsável, 1 = ABERTO caso contrário
      resumoChamado,
      descricaoChamado,
      usuario: { id: adminId }, // Admin é o "usuário" que abriu
      tipoPrioridade: { id: prioridadeId },
      topicoAjuda: { id: topicoAjudaId },
      departamento: { id: departamentoId },
      userResponsavel: userResponsavelId ? { id: userResponsavelId } : null, // Atribuir responsável JÁ na criação
      dataAtribuicao: userResponsavelId ? new Date() : null, // Data de atribuição se houver responsável
    });

    await chamadoRepository.save(chamado);


    // Buscar nome do admin
    const admin = await userRepository.findOne({
      where: { id: adminId },
      select: ["id", "name", "email"]
    });

    const nomeAdmin = admin?.name || "Admin";

    // Registrar no histórico
    const statusNovo = userResponsavelId ? 2 : 1; // EM ANALISE se houver responsável, ABERTO caso contrário
    await historicoRepository.save({
      chamado,
      usuario: { id: adminId },
      acao: userResponsavelId 
        ? `Chamado criado por administrador ${nomeAdmin}.`
        : `Chamado criado por administrador ${nomeAdmin}`,
      statusAnterior: undefined,
      statusNovo: { id: statusNovo },
      dataMov: new Date(),
    });

    // Se houver responsável, enviar email
    if (userResponsavelId) {
      setImmediate(async () => {
        try {
          const responsavel = await userRepository.findOne({
            where: { id: userResponsavelId },
            select: ["id", "name", "email"]
          });

          if (responsavel && admin) {
            // recarregar chamado com dados completos para o email
            const chamadoParaEmail = await chamadoRepository.findOne({
              where: { id: chamado.id },
              relations: ["usuario", "tipoPrioridade", "departamento", "topicoAjuda", "status", "userResponsavel"],
            });

            if (chamadoParaEmail) {
              await EmailService.enviarEmailChamadoCriadoPorAdmin(responsavel, admin, chamadoParaEmail);
            }
          }
        } catch (emailError) {
          // Log do erro, mas não interrompe
        }
      });
    }


    const chamadoCompleto = await chamadoRepository.findOne({
      where: { id: chamado.id },
      relations: ["usuario", "tipoPrioridade", "departamento", "topicoAjuda", "status", "userResponsavel"],
    });

    
    return res.status(201).json({
      mensagem: userResponsavelId ? "Chamado criado e atribuído com sucesso!" : "Chamado criado com sucesso!",
      chamado: chamadoCompleto,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao criar chamado",
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
      nomeResponsavel,
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
    const pageSizeNum = userRoleId === 1 ? Math.max(1, parseInt(String(pageSize)) || 10) : Math.max(1, Math.min(100, parseInt(String(pageSize)) || 10)); // máximo 100 para usuários comuns, ilimitado para admins (até 10000)
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

    // verificar se statusId contem múltiplos valores
  
    const statusIds = statusId ? String(statusId).split(',').map(id => id.trim()) : [];
    
    // Lógica especial para ATRASADO (statusId = 4)
    if (statusIds.includes('4')) {
      // Buscar horas para atraso dos parâmetros do sistema
      const parametrosRepository = AppDataSource.getRepository(ParametrosSistema);
      const parametros = await parametrosRepository.findOne({ where: { id: 1 } });
      const horasParaAtraso = parametros?.horasParaAtraso || 24;

      // Calcular a data limite (agora - horasParaAtraso)
      const dataLimite = new Date();
      dataLimite.setHours(dataLimite.getHours() - horasParaAtraso);

      // de atrasado for o único status selecionado
      if (statusIds.length === 1) {
        // filtrar chamados ABERTOS (status = 1) que estão abertos há mais tempo que o configurado
        queryBuilder.andWhere("chamado.id_status = :statusAberto", { statusAberto: 1 });
        queryBuilder.andWhere("chamado.data_abertura < :dataLimite", { dataLimite });
      } else {
        // se ATRASADO estiver junto com outros status, use OR
        const outrosStatus = statusIds.filter(id => id !== '4');
        
        // criar condições para cada status
        const condicoesStatus = [
          // condição para ATRASADO
          "(chamado.id_status = 1 AND chamado.data_abertura < :dataLimite)",
          // pros outros
          ...outrosStatus.map((_, index) => `chamado.id_status = :statusId${index}`)
        ];
        
        // adicionar parâmetros
        const parametros: any = { dataLimite };
        outrosStatus.forEach((id, index) => {
          parametros[`statusId${index}`] = id;
        });
        
        queryBuilder.andWhere(`(${condicoesStatus.join(' OR ')})`, parametros);
      }
    } else if (statusIds.length > 0) {
      // multipos status normais (sem ATRASADO)
      queryBuilder.andWhere("chamado.id_status IN (:...statusIds)", { statusIds });
    }

    // Filtro por tópico de ajuda (aceita múltiplos valores)
    const topicoAjudaIds = topicoAjudaId ? String(topicoAjudaId).split(',').map(id => id.trim()) : [];
    if (topicoAjudaIds.length > 0) {
      queryBuilder.andWhere("chamado.id_topico_ajuda IN (:...topicoAjudaIds)", { topicoAjudaIds });
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
      // Filtro por departamento (aceita múltiplos valores)
      const departamentoIds = departamentoId ? String(departamentoId).split(',').map(id => id.trim()) : [];
      if (departamentoIds.length > 0) {
        queryBuilder.andWhere("chamado.id_departamento IN (:...departamentoIds)", { departamentoIds });
      }

      // Filtro por prioridade
      if (prioridadeId) {
        queryBuilder.andWhere("chamado.id_prioridade = :prioridadeId", { prioridadeId });
      }

      // Filtro por nome do usuário
      if (nomeUsuario) {
        queryBuilder.andWhere("usuario.name ILIKE :nomeUsuario", { nomeUsuario: `%${nomeUsuario}%` });
      }

      // filtro por nome do responsável
      if (nomeResponsavel) {
        queryBuilder.andWhere("userResponsavel.name ILIKE :nomeResponsavel", { nomeResponsavel: `%${nomeResponsavel}%` });
      }

      // filtro por data de abertura
      let dataAberturaFimAjustada = dataAberturaFim;
      if (
        typeof dataAberturaFim === 'string' &&
        dataAberturaFim.length >= 10 &&
        !Array.isArray(dataAberturaFim)
      ) {
        // ajustar para o final do dia no horário local do Brasil (BRT)
        const [ano, mes, dia] = dataAberturaFim.split('T')[0].split('-').map(Number);
        if (ano && mes && dia) {

          const fimLocal = new Date(ano, mes - 1, dia, 23, 59, 59, 999);
          // converter para string no formato ISO local (sem UTC/Z)
          const pad = (n: number) => n.toString().padStart(2, '0');
          const dataAberturaFimStr = `${ano}-${pad(mes)}-${pad(dia)} 23:59:59`;
          dataAberturaFimAjustada = dataAberturaFimStr;
        }
      }
      if (
        typeof dataAberturaInicio === 'string' &&
        dataAberturaInicio.length >= 10 &&
        !Array.isArray(dataAberturaInicio) &&
        typeof dataAberturaFimAjustada === 'string' &&
        dataAberturaFimAjustada.length >= 10 &&
        !Array.isArray(dataAberturaFimAjustada)
      ) {
        queryBuilder.andWhere("chamado.data_abertura BETWEEN :dataAberturaInicio AND :dataAberturaFim", {
          dataAberturaInicio,
          dataAberturaFim: dataAberturaFimAjustada,
        });
      } else if (
        typeof dataAberturaInicio === 'string' &&
        dataAberturaInicio.length >= 10 &&
        !Array.isArray(dataAberturaInicio)
      ) {
        queryBuilder.andWhere("chamado.data_abertura >= :dataAberturaInicio", { dataAberturaInicio });
      } else if (
        typeof dataAberturaFimAjustada === 'string' &&
        dataAberturaFimAjustada.length >= 10 &&
        !Array.isArray(dataAberturaFimAjustada)
      ) {
        queryBuilder.andWhere("chamado.data_abertura <= :dataAberturaFim", { dataAberturaFim: dataAberturaFimAjustada });
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
    // Fazer um clone da query para contar sem os limites
    const countQuery = queryBuilder.clone();
    const total = await countQuery.getCount();

    // Aplicar paginação usando .limit() e .offset()
    queryBuilder.limit(pageSizeNum).offset(offset);

    const chamados = await queryBuilder.getMany();

    // Calcular total de páginas
    const totalPages = Math.ceil(total / pageSizeNum);

    // Buscar TODAS as posições do kanban para os chamados retornados
    const chamadoIds = chamados.map(c => c.id);
    const kanbanPositionsRepo = AppDataSource.getRepository(KanbanPositions);
    const todasAsPosicoes = chamadoIds.length > 0 
      ? await kanbanPositionsRepo.find({
          where: { idChamado: In(chamadoIds) },
          order: { updatedAt: 'DESC' }
        })
      : [];

    // Criar um mapa de posições por chamado
    const posicoesPorChamado: { [key: number]: any[] } = {};
    todasAsPosicoes.forEach(pos => {
      if (!posicoesPorChamado[pos.idChamado]) {
        posicoesPorChamado[pos.idChamado] = [];
      }
      posicoesPorChamado[pos.idChamado].push({
        groupBy: pos.groupBy,
        columnValue: pos.columnValue,
        position: pos.position
      });
    });

    // Formatar resposta
    const chamadosFormatados = chamados.map((chamado: any) => {
      // Se tiver múltiplas posições, retornar um array; senão retornar null ou a primeira
      const posicoesDoCard = posicoesPorChamado[chamado.id] || [];
      return {
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
          roleId: chamado.usuario.roleId // add roleId para o frontend identificar interno/externo
        } : null,
        tipoPrioridade: chamado.tipoPrioridade,
        departamento: chamado.departamento,
        topicoAjuda: chamado.topicoAjuda,
        status: chamado.status,
        userResponsavel: chamado.userResponsavel ? { id: chamado.userResponsavel.id, name: chamado.userResponsavel.name } : null,
        userFechamento: chamado.userFechamento ? { id: chamado.userFechamento.id, name: chamado.userFechamento.name } : null,
        // Retornar array de todas as posições para o frontend escolher a correta
        kanbanPositions: posicoesDoCard.length > 0 ? posicoesDoCard : null,
      };
    });

    return res.status(200).json({
      chamados: chamadosFormatados,
      total,
      totalPages,
      currentPage: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error) {
    console.error('❌ Erro ao listar chamados:', error);
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
    const statusRepository = AppDataSource.getRepository(StatusChamado);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["userResponsavel", "status"],
    });

    if (!chamado) {

      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }



    // permite que qualquer administrador redirecione chamados
    // buscar dados do usuário que está fazendo a atribuição para verificar se é admin
    const usuarioQueAtribui = await userRepository.findOne({ 
      where: { id: usuarioId }, 
      relations: ["role"]
    });
    
    if (!usuarioQueAtribui) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }
    
    // verificar se quem está atribuindo é administrador (role_id = 1)
    if (usuarioQueAtribui.roleId !== 1) {
      return res.status(403).json({ mensagem: "Apenas administradores podem redirecionar chamados." });
    }
    


    // verificar se está tentando redirecionar para si mesmo
    if (userResponsavelId === usuarioId) {

      return res.status(400).json({ mensagem: "Você não pode redirecionar o chamado para si mesmo." });
    }


    // Buscar nomes dos usuários para o histórico
    const [usuarioAtribuiu, usuarioResponsavel] = await Promise.all([
      userRepository.findOne({ where: { id: usuarioId }, select: ["id", "name", "email"] }),
      userRepository.findOne({ where: { id: userResponsavelId }, select: ["id", "name", "email"] })
    ]);

    if (!usuarioResponsavel) {
 
      return res.status(404).json({ mensagem: "Usuário responsável não encontrado" });
    }



    // save status anterior antes de mudar
    const statusAnteriorId = chamado.status?.id || 2;

    // atribuir responsável e data de atribuição
    chamado.userResponsavel = { id: userResponsavelId } as Users;
    chamado.dataAtribuicao = new Date();
    
    //se o status for aberto id=1 entao mudar para id=2 em atendimento
    if (chamado.status?.id === 1) {
      const statusEmAtendimento = await statusRepository.findOne({ where: { id: 2 } });
      if (statusEmAtendimento) {
        chamado.status = statusEmAtendimento;
      }
    }


    await chamadoRepository.save(chamado);

    // registrar no historico com nomes dos usuários
    const nomeQuemAtribuiu = usuarioAtribuiu?.name || "Usuário";
    const nomeResponsavel = usuarioResponsavel?.name || "Usuário";

    // Enviar email de redirecionamento
    try {
  
      await EmailService.enviarEmailRedirecionamento(usuarioResponsavel, usuarioAtribuiu, chamado);
    } catch (emailError) {
      // Não falha a operação se o email der erro, apenas registra
   
    }


    return res.status(200).json({
      mensagem: "Chamado atribuído com sucesso!",
      chamado,
    });
  } catch (error) {
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
      acao: `Este chamado foi atribuído por ${nomeUsuario}`,
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
      mensagem: "Chamado atribuido com sucesso!",
      chamado: chamadoAtualizado,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao atribuir chamado",
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
    
    // mudar status para REABERTO (5)
    chamado.status = { id: 5 } as StatusChamado;

    await chamadoRepository.save(chamado);

    // Registrar no histórico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: `${nomeUsuario} reabriu este chamado`,
      statusAnterior: { id: 3 }, // ENCERRADO
      statusNovo: { id: 5 }, // REABERTO
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

  
    return res.status(500).json({
      mensagem: "Erro ao editar chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// editar chamado -admin sem restricao
router.put("/chamados/:id/editar-admin", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.userId;
    const userRoleId = req.userRoleId;
    const {
      resumoChamado,
      descricaoChamado,
      ramal,
      departamentoId,
      topicoAjudaId,
      prioridadeId,
    } = req.body;

    // verificar se é admin
    if (userRoleId !== 1) {
      return res.status(403).json({ mensagem: "Apenas administradores podem usar esta função" });
    }

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

    // buscar nome do usuário admin
    const usuario = await userRepository.findOne({
      where: { id: usuarioId },
      select: ["id", "name"]
    });
    

    const nomeUsuario = usuario?.name || "Administrador";

    // att campos
    chamado.resumoChamado = resumoChamado;
    chamado.descricaoChamado = descricaoChamado;
    chamado.ramal = ramal ? Number(ramal) : null; // Converter para número ou null
    chamado.departamento = { id: departamentoId } as any;
    chamado.topicoAjuda = { id: topicoAjudaId } as any;
    chamado.tipoPrioridade = { id: prioridadeId } as any;

    await chamadoRepository.save(chamado);

    // registrar no histórico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: `${nomeUsuario} editou este chamado`,
      statusAnterior: chamado.status,
      statusNovo: chamado.status,
      dataMov: new Date(),
    });

    // recarregar com relações
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

      }
    } catch (storageError) {

    }

    // Remover do banco
    await anexoRepository.remove(anexo);

    return res.status(200).json({ mensagem: "Anexo removido com sucesso!" });
  } catch (error) {
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
      relations: ["status", "userFechamento", "usuario"],
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

    // buscar dados do responsável e do usuário para email
    const userRepository = AppDataSource.getRepository(Users);
    
    const [usuarioChamado, adminResponsavel] = await Promise.all([
      chamado.usuario ? userRepository.findOne({ where: { id: chamado.usuario.id }, select: ["id", "name", "email"] }) : null,
      chamado.userFechamento ? userRepository.findOne({ where: { id: chamado.userFechamento.id }, select: ["id", "name", "email"] }) : null
    ]);

    // enviar email de conclusão para o usuário que abriu o chamado
    if (usuarioChamado) {
      
      try {
        const preferenciasUsuario = await EmailService.verificarPreferenciasUsuario(usuarioChamado.id);
        
        if (preferenciasUsuario.includes(3)) {
          await EmailService.enviarEmailConclusaoUsuario(usuarioChamado, chamadoCompleto!, adminResponsavel);
        }
    
      } catch (emailError) {
        // Erro silencioso para não quebrar o fluxo
      }
    }

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

    return res.status(500).json({
      mensagem: "Erro ao encerrar chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});


router.get("/chamados/:id/historico", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
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
    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const statusRepository = AppDataSource.getRepository(StatusChamado);
    const usersRepository = AppDataSource.getRepository(Users);

    // buscar o chamado para pegar o status atual
    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["status", "userResponsavel"],
    });
    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // buscar o usuario que está enviando a mensagem
    const usuarioAtual = await usersRepository.findOne({
      where: { id: usuarioId }
    });

    let statusAnterior = chamado.status;
    let statusNovo = chamado.status;
    let acao = "Mensagem enviada";

    // se o chamado estiver encerrado (status.id === 3), verificar limite e reabrir
    if (chamado.status.id === 3) {
      // verificar se já foi reaberto 2 vezes
      if (chamado.vezesReaberto >= 2) {
        return res.status(400).json({ 
          mensagem: "Você já reabriu esse chamado muitas vezes. Caso queira tratar do mesmo problema, abra outro chamado." 
        });
      }

      const statusReaberto = await statusRepository.findOne({ where: { id: 5 } }); // 5 = REABERTO
      if (statusReaberto) {
        chamado.status = statusReaberto;
        chamado.dataFechamento = null;
        chamado.userFechamento = null;
        chamado.vezesReaberto = (chamado.vezesReaberto || 0) + 1;
        await chamadoRepository.save(chamado);
        statusNovo = statusReaberto;
        acao = `${usuarioAtual?.name || 'Usuário'} reabriu este chamado ao enviar uma mensagem`;
      }
    }

    // Salvar mensagem
    const novaMensagem = mensagensRepository.create({
      mensagem,
      usuario: { id: usuarioId },
      chamado: { id: Number(id) },
    });
    await mensagensRepository.save(novaMensagem);

    // Salvar histórico
    await historicoRepository.save({
      chamado: { id: Number(id) },
      usuario: { id: usuarioId },
      acao,
      statusAnterior,
      statusNovo,
      dataMov: new Date(),
    });

    // Recarregar chamado com todas as relações
      const chamadoCompleto = await chamadoRepository.findOne({
      where: { id: chamado.id },
      relations: ["usuario", "tipoPrioridade", "departamento", "topicoAjuda", "status", "userResponsavel", "userFechamento"],
    });


    return res.status(201).json({
      mensagem: novaMensagem,
      chamado: chamadoCompleto,
    });
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
    const anexosRepository = AppDataSource.getRepository(ChamadoAnexos);
    
    // Buscar mensagens
    const mensagens = await mensagensRepository
      .createQueryBuilder("mensagem")
      .leftJoinAndSelect("mensagem.usuario", "usuario")
      .where("mensagem.chamado_id = :chamadoId", { chamadoId: Number(id) })
      .orderBy("mensagem.dataEnvio", "ASC")
      .getMany();



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
 
                return { ...anexo, signedUrl: null };
              }

              return { ...anexo, signedUrl: data?.signedUrl };
            } catch (err) {

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

  
    return res.status(200).json(mensagensComAnexos);
  } catch (error) {

    return res.status(500).json({
      mensagem: "Erro ao buscar mensagens",
    });
  }
});

// Editar múltiplos chamados
router.patch("/chamados/editar-multiplos", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chamadosIds, statusId, prioridadeId, departamentoId, topicoAjudaId, userResponsavelId } = req.body;
    const usuarioId = req.userId;

    if (!chamadosIds || !Array.isArray(chamadosIds) || chamadosIds.length === 0) {
      return res.status(400).json({
        message: "Nenhum chamado selecionado",
      });
    }

    if (!statusId && !prioridadeId && !departamentoId && !topicoAjudaId && !userResponsavelId) {
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
      relations: ["status", "tipoPrioridade", "usuario"],
    });

    const erros: string[] = [];
    const alterados: number[] = [];
    
    // arrays para armazenar dados de emails que precisam ser enviados (processamento assíncrono)
    const emailsParaEnviar: Array<{ tipo: 'status6' | 'status7' | 'redirecionamento', usuario?: Users, novoResponsavel?: Users, chamado: Chamados }> = [];

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

          const mensagensExtras: Record<number, string> = {
            4: "Algo não saiu como o esperado. Estamos trabalhando para resolver sua demanda o mais rápido possível.",
            7: "Estamos aguardando retorno externo para continuar a análise desta solicitação.",
            6: "Estamos aguardando novas informações para continuar a solicitação."
          };

          // Salvar histórico de status
          let mensagemAcao = `${usuario.name} alterou o status do chamado para '${novoStatus.nome}'`;


          if (mensagensExtras[novoStatus.id]) {
            mensagemAcao += `. ${mensagensExtras[novoStatus.id]}`;
          }

          await historicoRepository.save({
            chamado: { id: chamado.id },
            usuario: { id: usuarioId },
            acao: mensagemAcao,
            statusAnterior: { id: statusAnterior.id },
            statusNovo: { id: novoStatus.id },
            dataMov: new Date(),
          });

          // coletar dados para envio de email assíncrono (Status 6 - Pendente Usuário)
          if (novoStatus.id === 6 && chamado.usuario) {
            emailsParaEnviar.push({
              tipo: 'status6',
              chamado: { ...chamado, status: novoStatus },
              usuario: chamado.usuario
            });
          }
          
          // coletar dados para envio de email assíncrono (Status 7 - Aguardando Terceiros)
          if (novoStatus.id === 7 && chamado.usuario) {
            emailsParaEnviar.push({
              tipo: 'status7',
              chamado: { ...chamado, status: novoStatus },
              usuario: chamado.usuario
            });
          }

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

      // altera departamento
      if (departamentoId && chamado.departamento?.id !== departamentoId) {
        chamado.departamento = { id: departamentoId } as any;

        // busca nome do departamento para o histórico
        const departamentoRepository = AppDataSource.getRepository(Departamentos);
        const departamento = await departamentoRepository.findOne({
          where: { id: departamentoId },
        });

        const departamentoNome = departamento?.name || 'DESCONHECIDO';

        // salva histórico
        await historicoRepository.save({
          chamado: { id: chamado.id },
          usuario: { id: usuarioId },
          acao: `${usuario.name} alterou o departamento para: ${departamentoNome}`,
          statusAnterior: chamado.status ? { id: chamado.status.id } : undefined,
          statusNovo: chamado.status ? { id: chamado.status.id } : undefined,
          dataMov: new Date(),
        });

        alterou = true;
      }

      // alterar o  tópico de ajuda
      if (topicoAjudaId && chamado.topicoAjuda?.id !== topicoAjudaId) {
        chamado.topicoAjuda = { id: topicoAjudaId } as any;

        // buscar o  nome do tópico para o histórico
        const topicoAjudaRepository = AppDataSource.getRepository(TopicosAjuda);
        const topicoAjuda = await topicoAjudaRepository.findOne({
          where: { id: topicoAjudaId },
        });

        const topicoNome = topicoAjuda?.nome || 'DESCONHECIDO';

        // salvar histórico
        await historicoRepository.save({
          chamado: { id: chamado.id },
          usuario: { id: usuarioId },
          acao: `${usuario.name} alterou o tópico de ajuda para: ${topicoNome}`,
          statusAnterior: chamado.status ? { id: chamado.status.id } : undefined,
          statusNovo: chamado.status ? { id: chamado.status.id } : undefined,
          dataMov: new Date(),
        });

        alterou = true;
      }

      // redirecionar p o responsável
      if (userResponsavelId && chamado.userResponsavel?.id !== userResponsavelId) {
        const novoResponsavel = await userRepository.findOne({
          where: { id: userResponsavelId },
          select: ["id", "name", "email"]
        });

        if (novoResponsavel) {
          chamado.userResponsavel = { id: userResponsavelId } as any;
          chamado.dataAtribuicao = new Date();

          // salvar histórico
      
          await historicoRepository.save({
            chamado: { id: chamado.id },
            usuario: { id: usuarioId },
            acao: `${usuario.name} redirecionou este chamado para ${novoResponsavel.name}`,
            statusAnterior: chamado.status ? { id: chamado.status.id } : undefined,
            statusNovo: chamado.status ? { id: chamado.status.id } : undefined,
            dataMov: new Date(),
          });

          alterou = true;

          // coletar dados para envio de email assíncrono (apenas se não for auto-atribuição)
          if (userResponsavelId !== usuarioId) {
            emailsParaEnviar.push({
              tipo: 'redirecionamento',
              novoResponsavel: novoResponsavel,
              usuario: usuario,
              chamado: { ...chamado }
            });
          }
        }
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

    // enviar resposta IMEDIATAMENTE, antes de processar emails
    const response = res.status(200).json({
      message: `${alterados.length} chamado(s) alterado(s) com sucesso`,
      alterados,
      erros: erros.length > 0 ? erros : undefined,
    });

    // processar envio de emails de forma ASSINCRONA em background
    if (emailsParaEnviar.length > 0) {
      setImmediate(async () => {
        
        for (const emailData of emailsParaEnviar) {
          try {
            if (emailData.tipo === 'status6' && emailData.usuario?.email) {
              // status 6
              await EmailService.enviarEmailEsperandoUsuario(emailData.usuario, emailData.chamado);
            } else if (emailData.tipo === 'status7' && emailData.usuario?.email) {
              // status 7
              await EmailService.enviarEmailAguardandoTerceiros(emailData.usuario, emailData.chamado);
            } else if (emailData.tipo === 'redirecionamento') {
              // email de redirecionamento
              await EmailService.enviarEmailRedirecionamento(emailData.novoResponsavel!, emailData.usuario!, emailData.chamado);
            }
          } catch (emailError) {
          }
        }

      });
    }

    return response;
  } catch (error) {

    return res.status(500).json({
      message: "Erro ao editar chamados",
    });
  }
});

// resolver múltiplos chamados (marcar como resolvido)
router.patch("/chamados/resolver-multiplos", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chamadosIds } = req.body;
    const usuarioId = req.userId;

    if (!chamadosIds || !Array.isArray(chamadosIds) || chamadosIds.length === 0) {
      return res.status(400).json({
        mensagem: "Lista de IDs de chamados é obrigatória"
      });
    }



    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);

    // buscar chamados que serão resolvidos
    const chamados = await chamadoRepository.find({
      where: chamadosIds.map(id => ({ id })),
      relations: ["usuario", "status", "userFechamento"]
    });

    if (chamados.length === 0) {
      return res.status(404).json({
        mensagem: "Nenhum chamado encontrado"
      });
    }

    // verificar se há chamados já encerrados
    const chamadosJaEncerrados = chamados.filter(chamado => chamado.status?.id === 3);
    if (chamadosJaEncerrados.length > 0) {
      return res.status(400).json({
        mensagem: `${chamadosJaEncerrados.length} chamado(s) já estão encerrados`,
        chamadosEncerrados: chamadosJaEncerrados.map(c => c.id)
      });
    }

    // buscar dados do usuário para log
    const usuario = await userRepository.findOne({
      where: { id: usuarioId },
      select: ["id", "name", "email"]
    });

    const nomeUsuario = usuario?.name || "Usuário";
    const dataAtual = new Date();
    let chamadosProcessados = 0;
    let emailsEnviados = 0;

    // processar cada chamado
    for (const chamado of chamados) {
      try {
        const statusAnteriorId = chamado.status?.id || 2;
        
        // att status para ENCERRADO (3)
        chamado.status = { id: 3 } as any;
        chamado.dataFechamento = dataAtual;
        chamado.userFechamento = { id: usuarioId } as any;

        await chamadoRepository.save(chamado);

        // registrar no histórico
        await historicoRepository.save({
          chamado: { id: chamado.id },
          usuario: { id: usuarioId },
          acao: `Chamado resolvido por ${nomeUsuario}`,
          statusAnterior: { id: statusAnteriorId },
          statusNovo: { id: 3 },
          dataMov: dataAtual,
        });

        // buscar dados do usuário do chamado para email
        if (chamado.usuario?.id) {
          const usuarioChamado = await userRepository.findOne({
            where: { id: chamado.usuario.id },
            select: ["id", "name", "email"]
          });

          if (usuarioChamado) {
            try {
              // verificar se o usuário quer receber email de conclusão (preferência ID 3)
              const preferenciasUsuario = await EmailService.verificarPreferenciasUsuario(usuarioChamado.id);
              if (preferenciasUsuario.includes(3)) {
                await EmailService.enviarEmailConclusaoUsuario(usuarioChamado, chamado, usuario);
              }
              emailsEnviados++;
            } catch (emailError) {
              // erro no email não deve interromper a operação
              console.error("Erro ao enviar email de conclusão:", emailError);
            }
          }
        }

        chamadosProcessados++;
      
      } catch (error) {
      }
    }


    return res.status(200).json({
      mensagem: `${chamadosProcessados} chamado(s) resolvido(s) com sucesso!`,
      processados: chamadosProcessados,
      total: chamados.length,
      emailsEnviados
    });
  } catch (error) {

    return res.status(500).json({
      mensagem: "Erro ao resolver chamados",
      error: error instanceof Error ? error.message : "Erro desconhecido",
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

    return res.status(500).json({
      mensagem: "Erro ao buscar status",
    });
  }
});

// deletar multiplos chamados (apenas administradores)
router.delete("/chamados/excluir-multiplos", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chamadosIds } = req.body;
    const usuarioId = req.userId;

    if (!chamadosIds || chamadosIds.length === 0) {
      return res.status(400).json({
        error: true,
        message: "IDs de chamados são obrigatórios"
      });
    }

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const result = await chamadoRepository.delete({
      id: In(chamadosIds)
    });

    return res.status(200).json({
      error: false,
      message: `${result.affected || 0} chamado(s) deletado(s) com sucesso`,
      deleted: result.affected || 0
    });
  } catch (error) {
    console.error("Erro ao deletar múltiplos chamados:", error);
    return res.status(500).json({
      error: true,
      message: "Erro ao deletar chamados",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});
  
export default router;