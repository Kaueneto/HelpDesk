import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ChamadoMensagens } from "../entities/ChamadoMensagens";
import { ChamadoAnexos } from "../entities/ChamadoAnexos";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { Chamados } from "../entities/Chamados";
import { Users } from "../entities/Users";
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
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const chamadosRepository = AppDataSource.getRepository(Chamados);

    // Buscar o chamado para verificar se tem um userResponsavel atribuído
    const chamado = await chamadosRepository.findOne({
      where: { id: Number(id) },
      relations: ["userResponsavel"],
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

    // Criar histórico
    const novoHistorico = await historicoRepository.save({
      chamado: { id: Number(id) },
      usuario: { id: usuarioId },
      acao: "Mensagem enviada",
      status: "MENSAGEM",
      dataMov: new Date(),
    });

    // buscar histórico completo com dados do usuário
    const historicoComUsuario = await AppDataSource.getRepository(ChamadoHistorico)
      .createQueryBuilder("historico")
      .leftJoinAndSelect("historico.usuario", "usuario")
      .where("historico.id = :id", { id: novoHistorico.id })
      .getOne();

    // emitir eventos WebSocket para todos os clientes na sala do chamado
    try {
      const realtimeService = RealtimeService.getInstance();
      
      if (mensagemComUsuario) {
        realtimeService.notifyNovaMsg(Number(id), mensagemComUsuario);
      }
      
      if (historicoComUsuario) {
        realtimeService.notifyNovoHistorico(Number(id), historicoComUsuario);
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

    // Gerar signed URLs para todos os anexos
    const mensagensComSignedUrls = await Promise.all(
      mensagensComAnexos.map(async (mensagem) => {
        if (mensagem.anexos && mensagem.anexos.length > 0) {
          const anexosComSignedUrl = await Promise.all(
            mensagem.anexos.map(async (anexo) => {
              const { data: signedUrlData } = await supabase.storage
                .from(SUPABASE_BUCKET)
                .createSignedUrl(anexo.url, 3600);
              
              return {
                ...anexo,
                signedUrl: signedUrlData?.signedUrl,
              };
            })
          );
          
          return {
            ...mensagem,
            anexos: anexosComSignedUrl,
          };
        }
        
        return mensagem;
      })
    );

    return res.status(200).json(mensagensComSignedUrls);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar mensagens",
    });
  }
});

export default router;
