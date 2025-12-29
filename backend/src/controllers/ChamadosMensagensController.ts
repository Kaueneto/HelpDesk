import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ChamadoMensagens } from "../entities/ChamadoMensagens";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { Users } from "../entities/Users";
import { supabase, SUPABASE_BUCKET } from "../config/supabase";

interface AuthenticatedRequest extends Request {
  user?: Users;
}

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

    // Usar createQueryBuilder para ter controle total sobre o JOIN
    const mensagens = await AppDataSource.getRepository(ChamadoMensagens)
      .createQueryBuilder("mensagem")
      .leftJoinAndSelect("mensagem.usuario", "usuario")
      .leftJoinAndSelect("mensagem.anexos", "anexos")
      .where("mensagem.chamado_id = :chamadoId", { chamadoId: Number(id) })
      .orderBy("mensagem.data_envio", "ASC")
      .getMany();

    console.log(`[DEBUG] Mensagens encontradas: ${mensagens.length}`);
    mensagens.forEach((msg, idx) => {
      console.log(`[DEBUG] Mensagem ${idx + 1}: ID=${msg.id}, Texto="${msg.mensagem.substring(0, 30)}...", Anexos=${msg.anexos?.length || 0}`);
      if (msg.anexos && msg.anexos.length > 0) {
        msg.anexos.forEach(a => console.log(`  - Anexo ID=${a.id}: ${a.filename} (mensagemId=${a.mensagemId}, chamadoId=${a.chamadoId})`));
      }
    });

    // Gerar signed URLs para todos os anexos
    const mensagensComAnexos = await Promise.all(
      mensagens.map(async (mensagem) => {
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

    return res.status(200).json(mensagensComAnexos);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar mensagens",
    });
  }
});

export default router;
