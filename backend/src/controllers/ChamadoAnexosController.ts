import { Router, Request, Response } from "express";
import multer from "multer";
import { AppDataSource } from "../data-source";
import { ChamadoAnexos } from "../entities/ChamadoAnexos";
import { Chamados } from "../entities/Chamados";
import { verifyToken } from "../Middleware/AuthMiddleware";
import { supabase, SUPABASE_BUCKET } from "../config/supabase";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

const router = Router();

// Configurar multer para processar arquivos em memória (não salvar em disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por arquivo
    files: 5, // Máximo 5 arquivos
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas certos tipos de arquivo
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido"));
    }
  },
});

// Upload de anexos INICIAIS (na abertura do chamado) - SEM mensagem
router.post(
  "/chamado/:id/anexo",
  verifyToken,
  upload.array("arquivos", 5),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const chamadoId = Number(req.params.id);
      const files = req.files as Express.Multer.File[];

      console.log(`[DEBUG] Upload inicial para chamado ${chamadoId}, arquivos: ${files?.length || 0}`);

      if (!files || files.length === 0) {
        return res.status(400).json({ mensagem: "Nenhum arquivo enviado" });
      }

      // Verificar se o chamado existe
      const chamadoRepository = AppDataSource.getRepository(Chamados);
      const chamado = await chamadoRepository.findOne({
        where: { id: chamadoId },
      });

      if (!chamado) {
        return res.status(404).json({ mensagem: "Chamado não encontrado" });
      }

      // Fazer upload no Supabase Storage e salvar no banco
      const anexoRepository = AppDataSource.getRepository(ChamadoAnexos);
      const anexosSalvos = [];

      for (const file of files) {
        // Gerar path único: chamados/{chamadoId}/{timestamp}-{nomeOriginal}
        const timestamp = Date.now();
        const storagePath = `chamados/${chamadoId}/${timestamp}-${file.originalname}`;

        // Upload para o Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (uploadError) {
          console.error("Erro ao fazer upload no Supabase:", uploadError);
          return res.status(500).json({
            mensagem: "Erro ao fazer upload do arquivo",
            erro: uploadError.message,
          });
        }

        // Salvar registro no banco SEM mensagemId (anexo inicial)
        const anexo = anexoRepository.create({
          chamadoId,
          // mensagemId omitido = undefined = anexo inicial, não vinculado a mensagem
          filename: file.originalname,
          url: storagePath,
        });

        const anexoSalvo = await anexoRepository.save(anexo);
        
        // Gerar signed URL imediatamente
        const { data: signedUrlData } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .createSignedUrl(storagePath, 3600);

        anexosSalvos.push({
          ...anexoSalvo,
          signedUrl: signedUrlData?.signedUrl,
        });
      }

      console.log(`[DEBUG] ${anexosSalvos.length} anexos iniciais salvos`);

      return res.status(201).json({
        mensagem: "Anexos enviados com sucesso",
        anexos: anexosSalvos,
      });
    } catch (error) {
      console.error("Erro ao fazer upload de anexos:", error);
      return res.status(500).json({
        mensagem: "Erro ao fazer upload de anexos",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

// Upload de anexos para uma mensagem específica (NO CHAT)
router.post(
  "/mensagem/:mensagemId/anexo",
  verifyToken,
  upload.array("arquivos", 5),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const mensagemId = Number(req.params.mensagemId);
      const files = req.files as Express.Multer.File[];

      console.log(`[DEBUG] Upload para mensagem ${mensagemId}, arquivos: ${files?.length || 0}`);

      if (!files || files.length === 0) {
        return res.status(400).json({ mensagem: "Nenhum arquivo enviado" });
      }

      // Buscar a mensagem e o chamado associado
      const { ChamadoMensagens } = await import("../entities/ChamadoMensagens");
      const mensagemRepository = AppDataSource.getRepository(ChamadoMensagens);
      const mensagem = await mensagemRepository.findOne({
        where: { id: mensagemId },
        relations: ["chamado"],
      });

      console.log(`[DEBUG] Mensagem encontrada: ${mensagem ? 'SIM' : 'NÃO'}, ChamadoID: ${mensagem?.chamado?.id}`);

      if (!mensagem) {
        return res.status(404).json({ mensagem: "Mensagem não encontrada" });
      }

      const chamadoId = mensagem.chamado.id;

      // Fazer upload no Supabase Storage e salvar no banco
      const anexoRepository = AppDataSource.getRepository(ChamadoAnexos);
      const anexosSalvos = [];

      for (const file of files) {
        // Gerar path único: chamados/{chamadoId}/{timestamp}-{nomeOriginal}
        const timestamp = Date.now();
        const storagePath = `chamados/${chamadoId}/${timestamp}-${file.originalname}`;

        // Upload para o Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (uploadError) {
          console.error("Erro ao fazer upload no Supabase:", uploadError);
          return res.status(500).json({
            mensagem: "Erro ao fazer upload do arquivo",
            erro: uploadError.message,
          });
        }

        // Salvar registro no banco vinculado à mensagem
        const anexo = anexoRepository.create({
          chamadoId,
          mensagemId,
          filename: file.originalname,
          url: storagePath,
        });

        const anexoSalvo = await anexoRepository.save(anexo);
        
        // Gerar signed URL imediatamente
        const { data: signedUrlData } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .createSignedUrl(storagePath, 3600);

        anexosSalvos.push({
          ...anexoSalvo,
          signedUrl: signedUrlData?.signedUrl,
        });
      }

      return res.status(201).json({
        mensagem: "Anexos enviados com sucesso",
        anexos: anexosSalvos,
      });
    } catch (error) {
      console.error("Erro ao fazer upload de anexos:", error);
      return res.status(500).json({
        mensagem: "Erro ao fazer upload de anexos",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

// Gerar signed URL para um anexo específico
router.get(
  "/anexo/:id/url",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const anexoId = Number(req.params.id);

      const anexoRepository = AppDataSource.getRepository(ChamadoAnexos);
      const anexo = await anexoRepository.findOne({
        where: { id: anexoId },
        relations: ["chamado", "chamado.usuario"],
      });

      if (!anexo) {
        return res.status(404).json({ mensagem: "Anexo não encontrado" });
      }

      // Verificar se o usuário tem permissão (é o dono do chamado ou é admin)
      const userRoleId = req.userRoleId;
      const userId = req.userId;

      if (userRoleId !== 1 && anexo.chamado.usuario?.id !== userId) {
        return res.status(403).json({ mensagem: "Sem permissão para acessar este anexo" });
      }

      // Gerar signed URL válida por 1 hora (3600 segundos)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .createSignedUrl(anexo.url, 3600);

      if (signedUrlError || !signedUrlData) {
        console.error("Erro ao gerar signed URL:", signedUrlError);
        return res.status(500).json({
          mensagem: "Erro ao gerar URL do arquivo",
          erro: signedUrlError?.message,
        });
      }

      return res.status(200).json({
        signedUrl: signedUrlData.signedUrl,
        filename: anexo.filename,
      });
    } catch (error) {
      console.error("Erro ao gerar signed URL:", error);
      return res.status(500).json({
        mensagem: "Erro ao gerar URL do anexo",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

// Buscar chamado com anexos (com signed URLs)
router.get("/chamado/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const chamadoId = Number(req.params.id);

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const chamado = await chamadoRepository.findOne({
      where: { id: chamadoId },
      relations: [
        "usuario",
        "tipoPrioridade",
        "topicoAjuda",
        "departamento",
        "status",
        "userResponsavel",
        "userFechamento",
        "anexos",
      ],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Gerar signed URLs para cada anexo
    if (chamado.anexos && chamado.anexos.length > 0) {
      const anexosComUrls = await Promise.all(
        chamado.anexos.map(async (anexo) => {
          const { data: signedUrlData } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .createSignedUrl(anexo.url, 3600);

          return {
            ...anexo,
            signedUrl: signedUrlData?.signedUrl || null,
          };
        })
      );
      chamado.anexos = anexosComUrls as any;
    }

    return res.status(200).json(chamado);
  } catch (error) {
    console.error("Erro ao buscar chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar chamado",
    });
  }
});

// Deletar anexo
router.delete("/anexo/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const anexoId = Number(req.params.id);

    const anexoRepository = AppDataSource.getRepository(ChamadoAnexos);
    const anexo = await anexoRepository.findOne({
      where: { id: anexoId },
      relations: ["chamado", "chamado.usuario"],
    });

    if (!anexo) {
      return res.status(404).json({ mensagem: "Anexo não encontrado" });
    }

    // Verificar permissão
    const userRoleId = req.userRoleId;
    const userId = req.userId;

    if (userRoleId !== 1 && anexo.chamado.usuario?.id !== userId) {
      return res.status(403).json({ mensagem: "Sem permissão para deletar este anexo" });
    }

    // Deletar arquivo do Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([anexo.url]);

    if (deleteError) {
      console.error("Erro ao deletar arquivo do Supabase:", deleteError);
      // Continua mesmo com erro, pois queremos remover do banco
    }

    // Deletar registro do banco
    await anexoRepository.remove(anexo);

    return res.status(200).json({ mensagem: "Anexo deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar anexo:", error);
    return res.status(500).json({
      mensagem: "Erro ao deletar anexo",
    });
  }
});

export default router;
