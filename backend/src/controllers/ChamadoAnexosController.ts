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

const isSupabaseConfigured = () => {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const router = Router();

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

const decodeFilename = (filename: string): string => {
  try {
    return Buffer.from(filename, "latin1").toString("utf8");
  } catch {
    return filename;
  }
};

const sanitizeFilename = (filename: string): string => {
  const decoded = decodeFilename(filename);
  const withoutControls = decoded.replace(/[\x00-\x1F\x7F]/g, "");
  const ascii = withoutControls
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/\s+/g, "_");

  const cleaned = ascii.replace(/[\\/:*?"<>|]/g, "_").trim();
  if (!cleaned) {
    return "arquivo";
  }

  if (cleaned.length <= 180) {
    return cleaned;
  }

  const extIndex = cleaned.lastIndexOf(".");
  if (extIndex <= 0) {
    return cleaned.slice(0, 180);
  }

  const ext = cleaned.slice(extIndex);
  const base = cleaned.slice(0, extIndex);
  const maxBaseLength = Math.max(1, 180 - ext.length);
  return `${base.slice(0, maxBaseLength)}${ext}`;
};

const getUploadedFiles = (req: Request): Express.Multer.File[] => {
  if (!req.files) {
    return [];
  }

  if (Array.isArray(req.files)) {
    return req.files as Express.Multer.File[];
  }

  const filesByField = req.files as { [fieldname: string]: Express.Multer.File[] };
  return Object.values(filesByField).flat();
};

// Configurar multer para processar arquivos em memória (não salvar em disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por arquivo
    files: 5, // Máximo 5 arquivos
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype || "desconhecido"}`));
    }
  },
});

const uploadAnexos = upload.fields([
  { name: "arquivos", maxCount: 5 },
  { name: "arquivo", maxCount: 5 },
  { name: "anexos", maxCount: 5 },
  { name: "anexo", maxCount: 5 },
]);

const processUpload = (req: Request, res: Response, next: Function) => {
  uploadAnexos(req, res, (err: any) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      const mensagem =
        err.code === "LIMIT_FILE_SIZE"
          ? "arquivo excede o limite de tamanho(10MB)"
          : err.code === "LIMIT_FILE_COUNT"
            ? "Máximo de 5 arquivos por envio"
            : `erro no upload: ${err.message}`;

      return res.status(400).json({ mensagem, erro: err.code });
    }

    return res.status(400).json({
      mensagem: "falha ao processar anexos",
      erro: err?.message || "Erro desconhecido",
    });
  });
};

//upload de anexos iniciais na abertura do chamado
router.post("/chamado/:id/anexo", verifyToken, processUpload,
  async (req: AuthenticatedRequest, res: Response) => {

    
    try {
      if (!isSupabaseConfigured()) {
        return res.status(500).json({
          mensagem: "upload indisponível no momento",
          erro: "configuração do Supabase ausente no servidor",
        });
      }

      const chamadoId = Number(req.params.id);
      const files = getUploadedFiles(req);

      if (!Number.isFinite(chamadoId) || chamadoId <= 0) {
        return res.status(400).json({ mensagem: "id do chamado invalido" });
      }


      if (!files || files.length === 0) {
        return res.status(400).json({ mensagem: "Nenhum arquivo enviado" });
      }

      // verificar se o chamado existe
      const chamadoRepository = AppDataSource.getRepository(Chamados);
      const chamado = await chamadoRepository.findOne({
        where: { id: chamadoId },
      });

      if (!chamado) {
      
        return res.status(404).json({ mensagem: "Chamado não encontrado" });
      }


      
      // fazer upload no Supabase Storage e salvar no banco
      const anexoRepository = AppDataSource.getRepository(ChamadoAnexos);
      const anexosSalvos = [];

      for (const file of files) {
   
        // Gerar path único: chamados/{chamadoId}/{timestamp}-{nomeOriginal}
        const timestamp = Date.now();
        const decodedOriginalName = decodeFilename(file.originalname);
        const safeFilename = sanitizeFilename(decodedOriginalName);
        const randomSuffix = Math.random().toString(36).slice(2, 8);
        const storagePath = `chamados/${chamadoId}/${timestamp}-${randomSuffix}-${safeFilename}`;

        // Upload para o Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {

          return res.status(500).json({
            mensagem: "Erro ao fazer upload do arquivo",
            erro: uploadError.message,
            detalhes: {
              chamadoId,
              filename: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
            },
          });
        }


        
        // Salvar registro no banco SEM mensagemId (anexo inicial)
        const anexo = anexoRepository.create({
          chamadoId,
          tipoAnexo: 'CHAMADO',
          filename: decodedOriginalName,
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
      return res.status(500).json({
        mensagem: "Erro ao fazer upload de anexos",
        erro: getErrorMessage(error),
      });
    }
  }
);

// Upload de anexos para uma mensagem específica (NO CHAT)
router.post(
  "/mensagem/:mensagemId/anexo",
  verifyToken,
  processUpload,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(500).json({
          mensagem: "upload indisponível no momento",
          erro: "configuração do Supabase ausente no servidor",
        });
      }

      const mensagemId = Number(req.params.mensagemId);
      const files = getUploadedFiles(req);

      if (!Number.isFinite(mensagemId) || mensagemId <= 0) {
        return res.status(400).json({ mensagem: "id da mensagem inválido" });
      }


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
        const decodedOriginalName = decodeFilename(file.originalname);
        const safeFilename = sanitizeFilename(decodedOriginalName);
        const randomSuffix = Math.random().toString(36).slice(2, 8);
        const storagePath = `chamados/${chamadoId}/${timestamp}-${randomSuffix}-${safeFilename}`;

        // Upload para o Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          return res.status(500).json({
            mensagem: "Erro ao fazer upload do arquivo",
            erro: uploadError.message,
            detalhes: {
              mensagemId,
              chamadoId,
              filename: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
            },
          });
        }

        // Salvar registro no banco vinculado à mensagem
        const anexo = anexoRepository.create({
          chamadoId,
          mensagemId,
          tipoAnexo: 'MENSAGEM',
          filename: decodedOriginalName,
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
      return res.status(500).json({
        mensagem: "Erro ao fazer upload de anexos",
        erro: getErrorMessage(error),
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

      // Continua mesmo com erro, pois queremos remover do banco
    }

    // Deletar registro do banco
    await anexoRepository.remove(anexo);

    return res.status(200).json({ mensagem: "Anexo deletado com sucesso" });
  } catch (error) {

    return res.status(500).json({
      mensagem: "Erro ao deletar anexo",
    });
  }
});

export default router;
