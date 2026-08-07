import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ChamadoMensagens } from "../entities/ChamadoMensagens";
import { ChamadoAnexos } from "../entities/ChamadoAnexos";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { Chamados } from "../entities/Chamados";
import { Users } from "../entities/Users";
import { StatusChamado } from "../entities/StatusChamado";
import { supabase, SUPABASE_BUCKET } from "../config/supabase";
import { verifyToken } from "../Middleware/AuthMiddleware";
import RealtimeService from "../services/RealtimeService";
import * as fs from "fs";
import * as path from "path";

interface AuthenticatedRequest extends Request {
  user?: Users;
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}


const router = Router();




router.post("/chamados/:id/mensagens", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;
    const usuarioId = req.userId;
    const roleId = req.userRoleId;

    const mensagensRepository = AppDataSource.getRepository(ChamadoMensagens);
    const chamadosRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);

    // Buscar o chamado com status e responsável
    const chamado = await chamadosRepository.findOne({
      where: { id: Number(id) },
      relations: ["userResponsavel", "status", "usuario"],
    });

    if (!chamado) {
      return res.status(404).json({
        mensagem: "Chamado não encontrado",
      });
    }

    // Validação APENAS para admins (roleId = 1)
    // Se for admin e o chamado não tiver userResponsavel atribuído, bloqueia
    if (roleId === 1 && (!chamado.userResponsavel || !chamado.userResponsavel.id)) {
      return res.status(400).json({
        mensagem: "Assuma o chamado antes de responder.",
      });
    }

    // Se o chamado está ENCERRADO (status 3) e um usuário comum está enviando mensagem,
    // reabrir automaticamente para status REABERTO (5)
    let reaberto = false;
    if (chamado.status?.id === 3 && roleId !== 1) {
      chamado.status = { id: 5 } as StatusChamado; // REABERTO
      chamado.dataFechamento = null;
      chamado.userFechamento = null;
      await chamadosRepository.save(chamado);

      // registrar no histórico
      await historicoRepository.save({
        chamado,
        usuario: { id: usuarioId },
        acao: "Chamado reaberto pelo usuário ao enviar nova mensagem",
        statusAnterior: { id: 3 }, // ENCERRADO
        statusNovo: { id: 5 },     // REABERTO
        dataMov: new Date(),
      });

      reaberto = true;
    }

    const novaMensagem = mensagensRepository.create({
      mensagem,
      usuario: { id: usuarioId },
      chamado: { id: Number(id) },
    });

    await mensagensRepository.save(novaMensagem);

    // buscar mensagem completa com dados do usuário para emitir via WebSocket
    const mensagemComUsuario = await AppDataSource.getRepository(ChamadoMensagens)
      .createQueryBuilder("mensagem")
      .leftJoinAndSelect("mensagem.usuario", "usuario")
      .where("mensagem.id = :id", { id: novaMensagem.id })
      .getOne();

    // emitir eventos WebSocket para todos os clientes na sala do chamado
    try {
      const realtimeService = RealtimeService.getInstance();
      
      if (mensagemComUsuario) {
        realtimeService.notifyNovaMsg(Number(id), mensagemComUsuario);
      }

      // se reabriu, emitir history-new para atualizar status em tempo real
      if (reaberto) {
        realtimeService.notifyNovoHistorico(Number(id), {
          acao: "Chamado reaberto pelo usuário ao enviar nova mensagem",
          statusNovo: { id: 5 },
          dataMov: new Date(),
        });
      }
    } catch (wsError) {
      console.error("❌ Erro ao emitir eventos WebSocket:", wsError);
      // nao falha a requisição se WebSocket falhar
    }

    return res.status(201).json(mensagemComUsuario);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return res.status(500).json({
      mensagem: "Erro ao enviar mensagem",
    });
  }
});

router.get("/chamados/:id/mensagens", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar mensagens primeiro
    const mensagens = await AppDataSource.getRepository(ChamadoMensagens)
      .createQueryBuilder("mensagem")
      .leftJoinAndSelect("mensagem.usuario", "usuario")
      .where("mensagem.chamado_id = :chamadoId", { chamadoId: Number(id) })
      .orderBy("mensagem.dataEnvio", "ASC")
      .getMany();

    // Buscar anexos MANUALMENTE para todas as mensagens
    const mensagensIds = mensagens.map(m => m.id);
    const anexosRepository = AppDataSource.getRepository(ChamadoAnexos);
    
    const todosAnexos = mensagensIds.length > 0
      ? await anexosRepository
          .createQueryBuilder("anexo")
          .where("anexo.mensagemId IN (:...ids)", { ids: mensagensIds })
          .andWhere("anexo.tipoAnexo = :tipo", { tipo: 'MENSAGEM' })
          .getMany()
      : [];

    // Mapear anexos para suas mensagens
    const mensagensComAnexos = mensagens.map(msg => ({
      ...msg,
      anexos: todosAnexos.filter(anexo => anexo.mensagemId === msg.id)
    }));

    // Gerar signed URLs para todos os anexos em lote (uma chamada por arquivo único)
    // Coletar todos os paths únicos de uma vez
    const todosOsPaths = new Set<string>();
    mensagensComAnexos.forEach(msg => {
      msg.anexos?.forEach(a => todosOsPaths.add(a.url));
    });

    const signedUrlMap = new Map<string, string>();
    if (todosOsPaths.size > 0) {
      await Promise.all(
        Array.from(todosOsPaths).map(async (filePath) => {
          try {
            const { data } = await supabase.storage
              .from(SUPABASE_BUCKET)
              .createSignedUrl(filePath, 3600);
            if (data?.signedUrl) signedUrlMap.set(filePath, data.signedUrl);
          } catch {
            // ignora e mantém sem signed URL
          }
        })
      );
    }

    const mensagensComSignedUrls = mensagensComAnexos.map((mensagem) => ({
      ...mensagem,
      anexos: mensagem.anexos?.map(anexo => ({
        ...anexo,
        signedUrl: signedUrlMap.get(anexo.url),
      })) ?? [],
    }));

    return res.status(200).json(mensagensComSignedUrls);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar mensagens",
    });
  }
});

export default router;
