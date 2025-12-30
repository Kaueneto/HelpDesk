import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ChamadoMensagens } from "../entities/ChamadoMensagens";
import { ChamadoAnexos } from "../entities/ChamadoAnexos";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { Users } from "../entities/Users";
import { supabase, SUPABASE_BUCKET } from "../config/supabase";

interface AuthenticatedRequest extends Request {
  user?: Users;
}

console.log("🔥🔥🔥 CARREGANDO CHAMADO MENSAGENS CONTROLLER - VERSÃO NOVA 2025-12-29 🔥🔥🔥");

const router = Router();


router.post("/chamados/:id/mensagens", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;
    const usuarioId = req.user?.id;

    const mensagensRepository = AppDataSource.getRepository(ChamadoMensagens);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);

    const novaMensagem = mensagensRepository.create({
      mensagem,
      usuario: { id: usuarioId },
      chamado: { id: Number(id) },
    });

    await mensagensRepository.save(novaMensagem);

    await historicoRepository.save({
      chamado: { id: Number(id) },
      usuario: { id: usuarioId },
      acao: "Mensagem enviada",
      status: "MENSAGEM",
      dataMov: new Date(),
    });

    return res.status(201).json(novaMensagem);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao enviar mensagem",
    });
  }
});

router.get("/chamados/:id/mensagens", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`[DEBUG] Buscando mensagens do chamado ${id}`);

    // Buscar mensagens primeiro
    const mensagens = await AppDataSource.getRepository(ChamadoMensagens)
      .createQueryBuilder("mensagem")
      .leftJoinAndSelect("mensagem.usuario", "usuario")
      .where("mensagem.chamado_id = :chamadoId", { chamadoId: Number(id) })
      .orderBy("mensagem.dataEnvio", "ASC")
      .getMany();

    console.log(`[DEBUG] Mensagens encontradas: ${mensagens.length}`);

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

    console.log(`[DEBUG] Total de anexos encontrados: ${todosAnexos.length}`);
    todosAnexos.forEach(a => console.log(`  - Anexo: ${a.filename}, mensagemId=${a.mensagemId}, tipoAnexo=${a.tipoAnexo}`));

    // Mapear anexos para suas mensagens
    const mensagensComAnexos = mensagens.map(msg => ({
      ...msg,
      anexos: todosAnexos.filter(anexo => anexo.mensagemId === msg.id)
    }));

    console.log(`[DEBUG] Após mapear anexos:`);
    mensagensComAnexos.forEach((msg, idx) => {
      console.log(`  Mensagem ${idx + 1}: ID=${msg.id}, Anexos=${msg.anexos.length}`);
    });

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
