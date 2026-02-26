import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { TipoPrioridade } from "../entities/TipoPrioridade";
import * as yup from "yup";
import { Not } from "typeorm";
import { verifyToken } from "../Middleware/AuthMiddleware";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

const router = Router();

// listar todos os tipos de prioridade (ordenados)
router.get("/tipo_prioridade", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tipoPrioridadeRepository = AppDataSource.getRepository(TipoPrioridade);
    
    const tipos = await tipoPrioridadeRepository.find({
      order: { ordem: "ASC" }, // Ordenar pela ordem definida
    });

    return res.status(200).json(tipos);
  } catch (error) {
    console.error("Erro ao listar tipos de prioridade:", error);
    return res.status(500).json({
      mensagem: "Erro ao listar tipos de prioridade",
      erro: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

// buscar tipo de prioridade por ID
router.get("/tipo_prioridade/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tipoPrioridadeRepository = AppDataSource.getRepository(TipoPrioridade);

    const tipo = await tipoPrioridadeRepository.findOne({
      where: { id: Number(id) },
    });

    if (!tipo) {
      return res.status(404).json({ mensagem: "Tipo de prioridade não encontrado" });
    }

    return res.status(200).json(tipo);
  } catch (error) {
    console.error("Erro ao buscar tipo de prioridade:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar tipo de prioridade",
    });
  }
});

// criar novo tipo de prioridade
router.post("/tipo_prioridade", async (req: Request, res: Response) => {
  try {
    const { nome, cor, ordem } = req.body;

    const schema = yup.object().shape({
      nome: yup
        .string()
        .required("O nome do tipo de prioridade é obrigatório!")
        .min(3, "O nome deve conter no mínimo 3 caracteres!"),
      cor: yup
        .string()
        .required("A cor é obrigatória!")
        .matches(/^#[0-9A-Fa-f]{6}$/, "A cor deve estar no formato hexadecimal (#RRGGBB)"),
      ordem: yup
        .number()
        .required("A ordem é obrigatória!")
        .integer("A ordem deve ser um número inteiro")
        .min(1, "A ordem deve ser no mínimo 1"),
    });

    await schema.validate(req.body, { abortEarly: false });

    const tipoPrioridadeRepository = AppDataSource.getRepository(TipoPrioridade);

    // validar se já não existe um tipo com esse nome
    const tipoExistente = await tipoPrioridadeRepository.findOne({
      where: { nome },
    });

    if (tipoExistente) {
      return res.status(409).json({ mensagem: "Já existe um tipo de prioridade com esse nome" });
    }

    // validar se já existe um tipo com essa mesma ordem
    const ordemExistente = await tipoPrioridadeRepository.findOne({
      where: { ordem },
    });

    if (ordemExistente) {
      return res.status(409).json({ mensagem: "Já existe um tipo de prioridade com essa ordem" });
    }

    const novoTipo = tipoPrioridadeRepository.create({
      nome,
      cor,
      ordem,
    });

    await tipoPrioridadeRepository.save(novoTipo);

    return res.status(201).json({
      mensagem: "Tipo de prioridade criado com sucesso!",
      tipo: novoTipo,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({
        mensagem: error.errors,
      });
    }

    console.error("Erro ao criar tipo de prioridade:", error);
    return res.status(500).json({
      mensagem: "Erro ao criar tipo de prioridade",
      erro: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

// atualizar tipo de prioridade
router.put("/tipo_prioridade/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, cor, ordem } = req.body;

    const schema = yup.object().shape({
      nome: yup
        .string()
        .required("O nome do tipo de prioridade é obrigatório!")
        .min(3, "O nome deve conter no mínimo 3 caracteres!"),
      cor: yup
        .string()
        .required("A cor é obrigatória!")
        .matches(/^#[0-9A-Fa-f]{6}$/, "A cor deve estar no formato hexadecimal (#RRGGBB)"),
      ordem: yup
        .number()
        .required("A ordem é obrigatória!")
        .integer("A ordem deve ser um número inteiro")
        .min(1, "A ordem deve ser no mínimo 1"),
    });

    await schema.validate(req.body, { abortEarly: false });

    const tipoPrioridadeRepository = AppDataSource.getRepository(TipoPrioridade);

    const tipo = await tipoPrioridadeRepository.findOneBy({
      id: Number(id),
    });

    if (!tipo) {
      return res.status(404).json({
        mensagem: "Tipo de prioridade não encontrado",
      });
    }

    // validar duplicidade de nome
    const nomeExistente = await tipoPrioridadeRepository.findOne({
      where: {
        nome,
        id: Not(Number(id)),
      },
    });

    if (nomeExistente) {
      return res.status(400).json({
        mensagem: "Já existe outro tipo de prioridade com este nome.",
      });
    }

    // validar duplicidade de ordem
    const ordemExistente = await tipoPrioridadeRepository.findOne({
      where: {
        ordem,
        id: Not(Number(id)),
      },
    });

    if (ordemExistente) {
      return res.status(400).json({
        mensagem: "Já existe outro tipo de prioridade com esta ordem.",
      });
    }

    // atualizar dados
    tipoPrioridadeRepository.merge(tipo, { nome, cor, ordem });

    const tipoAtualizado = await tipoPrioridadeRepository.save(tipo);

    return res.status(200).json({
      mensagem: "Tipo de prioridade atualizado com sucesso",
      tipo: tipoAtualizado,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({
        mensagem: error.errors,
      });
    }
    
    console.error("Erro ao atualizar tipo de prioridade:", error);
    return res.status(500).json({
      mensagem: "Erro ao atualizar tipo de prioridade",
    });
  }
});

// remover tipo de prioridade
router.delete("/tipo_prioridade/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tipoPrioridadeRepository = AppDataSource.getRepository(TipoPrioridade);

    const tipo = await tipoPrioridadeRepository.findOneBy({
      id: Number(id),
    });

    if (!tipo) {
      return res.status(404).json({
        mensagem: "Tipo de prioridade não encontrado",
      });
    }

    await tipoPrioridadeRepository.remove(tipo);

    return res.status(200).json({
      mensagem: "Tipo de prioridade removido com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover tipo de prioridade:", error);
    return res.status(500).json({
      mensagem: "Erro ao remover tipo de prioridade",
    });
  }
});

export default router;
