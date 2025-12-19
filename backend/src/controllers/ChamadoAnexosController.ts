import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { AppDataSource } from "../data-source";
import { ChamadoAnexos } from "../entities/ChamadoAnexos";
import { Chamados } from "../entities/Chamados";
import { verifyToken } from "../Middleware/AuthMiddleware";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

const router = Router();

// Configurar multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
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

// Upload de anexos para um chamado
router.post(
  "/chamado/:id/anexo",
  verifyToken,
  upload.array("arquivos", 5),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const chamadoId = Number(req.params.id);
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ mensagem: "Nenhum arquivo enviado" });
      }

      // Verificar se o chamado existe
      const chamadoRepository = AppDataSource.getRepository(Chamados);
      const chamado = await chamadoRepository.findOne({
        where: { id: chamadoId },
      });

      if (!chamado) {
        // Deletar arquivos enviados
        files.forEach((file) => {
          fs.unlinkSync(file.path);
        });
        return res.status(404).json({ mensagem: "Chamado não encontrado" });
      }

      // Salvar anexos no banco de dados
      const anexoRepository = AppDataSource.getRepository(ChamadoAnexos);
      const anexosSalvos = [];

      for (const file of files) {
        const anexo = anexoRepository.create({
          chamadoId,
          filename: file.originalname,
          url: `/uploads/${file.filename}`,
        });

        const anexoSalvo = await anexoRepository.save(anexo);
        anexosSalvos.push(anexoSalvo);
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

// Buscar chamado com anexos
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
    });

    if (!anexo) {
      return res.status(404).json({ mensagem: "Anexo não encontrado" });
    }

    // Deletar arquivo do sistema
    const filePath = path.join(__dirname, "../../", anexo.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
