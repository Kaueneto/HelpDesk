import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { EmailTopicoConfig } from "../entities/EmailTopicoConfig";
import { EmailTopicoDestinatario } from "../entities/EmailTopicoDestinatario";
import { TopicosAjuda } from "../entities/TopicosAjuda";
import { verifyToken } from "../Middleware/AuthMiddleware";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userRoleId?: number;
}

// valida formato de e-mail 
function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// apenas roleId 1 (Administrador) pode gerenciar configurações 
function requireAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (req.userRoleId !== 1) {
    res.status(403).json({ mensagem: "Acesso restrito a administradores." });
    return false;
  }
  return true;
}

const router = Router();


// GET /email-topico-config
// Lista todas as configurações com tópico e destinatários

router.get(
  "/email-topico-config",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(EmailTopicoConfig);
      const configs = await repo
        .createQueryBuilder("config")
        .leftJoinAndSelect("config.topico", "topico")
        .leftJoinAndSelect("config.destinatarios", "destinatarios")
        .leftJoinAndSelect("config.usuarioCriador", "usuarioCriador")
        .leftJoinAndSelect("config.usuarioEditor", "usuarioEditor")
        .orderBy("topico.nome", "ASC")
        .getMany();

      return res.status(200).json(configs);
    } catch (error) {
      console.error("[EmailTopicoConfig] Erro ao listar:", error);
      return res.status(500).json({ mensagem: "Erro ao listar configurações." });
    }
  }
);


// GET /email-topico-config/:id
// Busca uma configuração específica

router.get(
  "/email-topico-config/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(EmailTopicoConfig);
      const config = await repo
        .createQueryBuilder("config")
        .leftJoinAndSelect("config.topico", "topico")
        .leftJoinAndSelect("config.destinatarios", "destinatarios")
        .leftJoinAndSelect("config.usuarioCriador", "usuarioCriador")
        .leftJoinAndSelect("config.usuarioEditor", "usuarioEditor")
        .where("config.id = :id", { id: Number(req.params.id) })
        .getOne();

      if (!config) {
        return res.status(404).json({ mensagem: "Configuração não encontrada." });
      }

      return res.status(200).json(config);
    } catch (error) {
      console.error("[EmailTopicoConfig] Erro ao buscar:", error);
      return res.status(500).json({ mensagem: "Erro ao buscar configuração." });
    }
  }
);


// POST /email-topico-config
// Cria uma nova configuração
// Body: { topicoId: number, ativo?: boolean, destinatarios: { email: string, tipo: 'cc'|'bcc' }[] }

router.post(
  "/email-topico-config",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!requireAdmin(req, res)) return;

    try {
      const { topicoId, ativo = true, destinatarios } = req.body;
      const userId = req.userId;

      //validações de entrada 
      if (!topicoId) {
        return res.status(400).json({ mensagem: "O tópico é obrigatório." });
      }

      if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
        return res
          .status(400)
          .json({ mensagem: "Informe pelo menos um destinatário." });
      }

      // vaiidar cada destinatário
      for (const dest of destinatarios) {
        if (!dest.email || !isEmailValido(dest.email)) {
          return res.status(400).json({
            mensagem: `E-mail inválido: "${dest.email || ""}"`,
          });
        }
        if (!["to", "cc", "bcc"].includes(dest.tipo)) {
          return res.status(400).json({
            mensagem: `Tipo inválido para "${dest.email}". Use "to", "cc" ou "bcc".`,
          });
        }
      }

      // garantir que exista pelo menos um destinatário principal (to)
      const temDestinatarioPrincipal = destinatarios.some((d: any) => d.tipo === "to");
      if (!temDestinatarioPrincipal) {
        return res.status(400).json({
          mensagem: "É necessário informar pelo menos um destinatário principal (Para).",
        });
      }

      // verificar duplicatas de e-mail dentro do payload
      const emailsPayload = destinatarios.map((d: any) =>
        d.email.trim().toLowerCase()
      );
      if (new Set(emailsPayload).size !== emailsPayload.length) {
        return res
          .status(400)
          .json({ mensagem: "Existem e-mails duplicados na lista de destinatários." });
      }

      //verificar se o tópico existe 
      const topicoRepo = AppDataSource.getRepository(TopicosAjuda);
      const topico = await topicoRepo.findOne({
        where: { id: Number(topicoId) },
      });
      if (!topico) {
        return res.status(404).json({ mensagem: "Tópico não encontrado." });
      }

      // verificar se já existe configuração para este tópico ─
      const configRepo = AppDataSource.getRepository(EmailTopicoConfig);
      const existente = await configRepo.findOne({
        where: { topicoId: Number(topicoId) },
      });
      if (existente) {
        return res.status(409).json({
          mensagem: "Já existe uma configuração para este tópico.",
        });
      }

      // criar a configuração com destinatários 
      const novaConfig = configRepo.create({
        topicoId: Number(topicoId),
        ativo: Boolean(ativo),
        criadoPor: userId || null,
        criadoEm: new Date(),
        editadoPor: null,
        editadoEm: null,
        destinatarios: destinatarios.map((d: any) => ({
          email: d.email.trim().toLowerCase(),
          tipo: d.tipo as "to" | "cc" | "bcc",
        })),
      });

      await configRepo.save(novaConfig);

      // recarregar com relações para retornar objeto completo
      const configCompleta = await configRepo
        .createQueryBuilder("config")
        .leftJoinAndSelect("config.topico", "topico")
        .leftJoinAndSelect("config.destinatarios", "destinatarios")
        .where("config.id = :id", { id: novaConfig.id })
        .getOne();

      return res.status(201).json({
        mensagem: "Configuração criada com sucesso!",
        config: configCompleta,
      });
    } catch (error) {
      console.error("[EmailTopicoConfig] Erro ao criar:", error);
      return res.status(500).json({ mensagem: "Erro ao criar configuração." });
    }
  }
);


// PUT /email-topico-config/:id
// Atualiza uma configuração existente (substitui destinatários)
// Body: { topicoId?: number, ativo?: boolean, destinatarios: { email: string, tipo: 'cc'|'bcc' }[] }

router.put(
  "/email-topico-config/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!requireAdmin(req, res)) return;

    try {
      const configId = Number(req.params.id);
      const { topicoId, ativo, destinatarios } = req.body;
      const userId = req.userId;

      // validações de entrada 
      if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
        return res
          .status(400)
          .json({ mensagem: "Informe pelo menos um destinatário." });
      }

      for (const dest of destinatarios) {
        if (!dest.email || !isEmailValido(dest.email)) {
          return res.status(400).json({
            mensagem: `E-mail inválido: "${dest.email || ""}"`,
          });
        }
        if (!["to", "cc", "bcc"].includes(dest.tipo)) {
          return res.status(400).json({
            mensagem: `Tipo inválido para "${dest.email}". Use "to", "cc" ou "bcc".`,
          });
        }
      }

      const temDestinatarioPrincipal = destinatarios.some((d: any) => d.tipo === "to");
      if (!temDestinatarioPrincipal) {
        return res.status(400).json({
          mensagem: "É necessário informar pelo menos um destinatário principal (Para).",
        });
      }

      const emailsPayload = destinatarios.map((d: any) =>
        d.email.trim().toLowerCase()
      );
      if (new Set(emailsPayload).size !== emailsPayload.length) {
        return res
          .status(400)
          .json({ mensagem: "Existem e-mails duplicados na lista de destinatários." });
      }

      // buscar a configuração existente 
      const configRepo = AppDataSource.getRepository(EmailTopicoConfig);
      const config = await configRepo.findOne({
        where: { id: configId },
        relations: ["destinatarios"],
      });
      if (!config) {
        return res.status(404).json({ mensagem: "Configuração não encontrada." });
      }

      // verificar unicidade se o tópico estiver sendo alterado 
      if (topicoId && Number(topicoId) !== config.topicoId) {
        const topicoRepo = AppDataSource.getRepository(TopicosAjuda);
        const topico = await topicoRepo.findOne({
          where: { id: Number(topicoId) },
        });
        if (!topico) {
          return res.status(404).json({ mensagem: "Tópico não encontrado." });
        }

        const duplicado = await configRepo
          .createQueryBuilder("c")
          .where("c.topicoId = :topicoId", { topicoId: Number(topicoId) })
          .andWhere("c.id != :id", { id: configId })
          .getOne();
        if (duplicado) {
          return res.status(409).json({
            mensagem: "Já existe uma configuração para este tópico.",
          });
        }

        config.topicoId = Number(topicoId);
      }

      if (ativo !== undefined) {
        config.ativo = Boolean(ativo);
      }
      config.editadoPor = userId || null;
      config.editadoEm = new Date();

      // substituir destinatários via repositório auxiliar
      const destRepo = AppDataSource.getRepository(EmailTopicoDestinatario);
      await destRepo.delete({ configId });

      config.destinatarios = destinatarios.map((d: any) =>
        destRepo.create({
          email: d.email.trim().toLowerCase(),
          tipo: d.tipo as "to" | "cc" | "bcc",
          configId,
        })
      );

      await configRepo.save(config);

      //recarregar com relações
      const configAtualizada = await configRepo
        .createQueryBuilder("config")
        .leftJoinAndSelect("config.topico", "topico")
        .leftJoinAndSelect("config.destinatarios", "destinatarios")
        .where("config.id = :id", { id: configId })
        .getOne();

      return res.status(200).json({
        mensagem: "Configuração atualizada com sucesso!",
        config: configAtualizada,
      });
    } catch (error) {
      console.error("[EmailTopicoConfig] Erro ao atualizar:", error);
      return res.status(500).json({ mensagem: "Erro ao atualizar configuração." });
    }
  }
);


// DELETE /email-topico-config/:id
// remove uma configuração (destinatários são removidos em cascata pelo banco)

router.delete(
  "/email-topico-config/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!requireAdmin(req, res)) return;

    try {
      const configRepo = AppDataSource.getRepository(EmailTopicoConfig);
      const config = await configRepo.findOne({
        where: { id: Number(req.params.id) },
      });

      if (!config) {
        return res.status(404).json({ mensagem: "Configuração não encontrada." });
      }

      await configRepo.remove(config);

      return res.status(200).json({ mensagem: "Configuração removida com sucesso!" });
    } catch (error) {
      console.error("[EmailTopicoConfig] Erro ao remover:", error);
      return res.status(500).json({ mensagem: "Erro ao remover configuração." });
    }
  }
);


// PATCH /email-topico-config/:id/status
// ativa ou desativa uma configuração sem alterar os destinatários
// Body: { ativo: boolean }

router.patch(
  "/email-topico-config/:id/status",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!requireAdmin(req, res)) return;

    try {
      const { ativo } = req.body;

      if (ativo === undefined) {
        return res.status(400).json({ mensagem: "O campo 'ativo' é obrigatório." });
      }

      const configRepo = AppDataSource.getRepository(EmailTopicoConfig);
      const config = await configRepo.findOne({
        where: { id: Number(req.params.id) },
      });

      if (!config) {
        return res.status(404).json({ mensagem: "Configuração não encontrada." });
      }

      config.ativo = Boolean(ativo);
      config.editadoPor = req.userId || null;
      config.editadoEm = new Date();
      await configRepo.save(config);

      return res.status(200).json({
        mensagem: `Configuração ${ativo ? "ativada" : "desativada"} com sucesso!`,
        config,
      });
    } catch (error) {
      console.error("[EmailTopicoConfig] Erro ao alterar status:", error);
      return res
        .status(500)
        .json({ mensagem: "Erro ao alterar status da configuração." });
    }
  }
);

export default router;
