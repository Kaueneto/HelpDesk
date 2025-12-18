import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Roles } from "../entities/Roles";

const router = Router();

router.get("/roles", async (req: Request, res: Response) => {
  try {
    const rolesRepository = AppDataSource.getRepository(Roles);
    const roles = await rolesRepository.find();

    return res.status(200).json(roles);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar roles",
    });
  }
});


router.get("/roles/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rolesRepository = AppDataSource.getRepository(Roles);

    const role = await rolesRepository.findOne({
      where: { id: Number(id) },
    });

    if (!role) {
      return res.status(404).json({ mensagem: "Role não encontrado" });
    }

    return res.status(200).json(role);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao buscar role",
    });
  }
});


router.post("/roles", async (req: Request, res: Response) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ mensagem: "Nome do role é obrigatório" });
    }

    const rolesRepository = AppDataSource.getRepository(Roles);
    const newRole = rolesRepository.create({
      nome,

    });

    await rolesRepository.save(newRole);

    return res.status(201).json({
      mensagem: "Role criado com sucesso!",
      role: newRole,
    });
  } catch (error) {
    console.error("Erro ao criar role:", error);
    return res.status(500).json({
      mensagem: "Erro ao criar role",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});


router.put("/roles/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ mensagem: "Nome do role é obrigatório" });
    }

    const rolesRepository = AppDataSource.getRepository(Roles);

    const role = await rolesRepository.findOne({
      where: { id: Number(id) },
    });

    if (!role) {
      return res.status(404).json({ mensagem: "Role não encontrado" });
    }

    role.nome = nome;

    await rolesRepository.save(role);

    return res.status(200).json({
      mensagem: "Role atualizado com sucesso!",
      role,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao atualizar role",
    });
  }
});

//rota pra deletar
router.delete("/roles/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rolesRepository = AppDataSource.getRepository(Roles);

    const role = await rolesRepository.findOne({
      where: { id: Number(id) },
    });

    if (!role) {
      return res.status(404).json({ mensagem: "Role não encontrado" });
    }

    await rolesRepository.remove(role);

    return res.status(200).json({
      mensagem: "Role deletado com sucesso!",
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao deletar role",
    });
  }
});

export default router;