import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Departamentos } from "../entities/Departamentos";
import * as yup from "yup";
import { Not } from "typeorm";

const router = Router();

// listar todos os departamentos
router.get("/departamentos", async (req: Request, res: Response) => {
  try {
    const departamentosRepository = AppDataSource.getRepository(Departamentos);
    
    const departamentos = await departamentosRepository.find({
      order: { name: "ASC" },
    });

    return res.status(200).json(departamentos);
  } catch (error) {
    console.error("Erro ao listar departamentos:", error);
    return res.status(500).json({
      mensagem: "Erro ao listar departamentos",
      erro: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

// buscar departamento por ID
router.get("/departamentos/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const departamentosRepository = AppDataSource.getRepository(Departamentos);

    const departamento = await departamentosRepository.findOne({
      where: { id: Number(id) },
    });

    if (!departamento) {
      return res.status(404).json({ mensagem: "Departamento não encontrado" });
    }

    return res.status(200).json(departamento);
  } catch (error) {
    console.error("Erro ao buscar departamento:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar departamento",
    });
  }
});

// criar novo departamento
router.post("/departamentos", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    const schema = yup.object().shape({
      name: yup
        .string()
        .required("O nome do departamento é obrigatório!")
        .min(3, "O nome deve conter no mínimo 3 caracteres!"),
    });

    await schema.validate(req.body, { abortEarly: false });

    const departamentosRepository = AppDataSource.getRepository(Departamentos);

    // validar se já existe um departamento com esse nome
    const departamentoExistente = await departamentosRepository.findOne({
      where: { name },
    });

    if (departamentoExistente) {
      return res.status(409).json({ mensagem: "Já existe um departamento com esse nome" });
    }

    const novoDepartamento = departamentosRepository.create({
      name,
    });

    await departamentosRepository.save(novoDepartamento);

    return res.status(201).json({
      mensagem: "Departamento cadastrado com sucesso!",
      departamento: novoDepartamento,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({
        mensagem: error.errors,
      });
    }

    console.error("Erro ao cadastrar  departamento:", error);
    return res.status(500).json({
      mensagem: "Erro ao cadastrar departamento",
      erro: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

// atualizar departamento
router.put("/departamentos/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const schema = yup.object().shape({
      name: yup
        .string()
        .required("O nome do departamento é obrigatório!")
        .min(3, "O nome deve conter no mínimo 3 caracteres!"),
    });

    await schema.validate(req.body, { abortEarly: false });

    const departamentosRepository = AppDataSource.getRepository(Departamentos);

    const departamento = await departamentosRepository.findOneBy({
      id: Number(id),
    });

    if (!departamento) {
      return res.status(404).json({
        mensagem: "Departamento não encontrado",
      });
    }

    // validar duplicidade de nome alem do que esta sendo editado
    const nomeExistente = await departamentosRepository.findOne({
      where: {
        name,
        id: Not(Number(id)),
      },
    });

    if (nomeExistente) {
      return res.status(400).json({
        mensagem: "Já existe outro departamento com este nome.",
      });
    }

    // atualizar dados
    departamentosRepository.merge(departamento, { name });

    const departamentoAtualizado = await departamentosRepository.save(departamento);

    return res.status(200).json({
      mensagem: "Departamento atualizado com sucesso",
      departamento: departamentoAtualizado,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({
        mensagem: error.errors,
      });
    }
    
    console.error("Erro ao atualizar departamento:", error);
    return res.status(500).json({
      mensagem: "Erro ao atualizar departamento",
    });
  }
});

// remover departamento
router.delete("/departamentos/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const departamentosRepository = AppDataSource.getRepository(Departamentos);

    const departamento = await departamentosRepository.findOneBy({
      id: Number(id),
    });

    if (!departamento) {
      return res.status(404).json({
        mensagem: "Departamento não encontrado",
      });
    }

    await departamentosRepository.remove(departamento);

    return res.status(200).json({
      mensagem: "Departamento removido com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover departamento:", error);
    return res.status(500).json({
      mensagem: "Erro ao remover departamento",
    });
  }
});

export default router;
