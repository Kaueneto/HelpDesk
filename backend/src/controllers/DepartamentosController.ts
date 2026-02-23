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
    const { codigo, name, ativo = true } = req.body;

    const schema = yup.object().shape({
      codigo: yup
        .number()
        .required("O código do departamento é obrigatório!")
        .positive("O código deve ser um número positivo!"),
      name: yup
        .string()
        .required("O nome do departamento é obrigatório!")
        .min(3, "O nome deve conter no mínimo 3 caracteres!"),
      ativo: yup.boolean().optional(),
    });

    await schema.validate(req.body, { abortEarly: false });

    const departamentosRepository = AppDataSource.getRepository(Departamentos);

    // validar se já existe um departamento com esse código
    const codigoExistente = await departamentosRepository.findOne({
      where: { codigo },
    });

    if (codigoExistente) {
      return res.status(409).json({ mensagem: "Já existe um departamento com esse código" });
    }

    // validar se já existe um departamento com esse nome
    const departamentoExistente = await departamentosRepository.findOne({
      where: { name },
    });

    if (departamentoExistente) {
      return res.status(409).json({ mensagem: "Já existe um departamento com esse nome" });
    }

    const novoDepartamento = departamentosRepository.create({
      codigo,
      name,
      ativo,
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
    const { codigo, name, ativo } = req.body;

    const schema = yup.object().shape({
      codigo: yup
        .number()
        .required("O código do departamento é obrigatório!")
        .positive("O código deve ser um número positivo!"),
      name: yup
        .string()
        .required("O nome do departamento é obrigatório!")
        .min(3, "O nome deve conter no mínimo 3 caracteres!"),
      ativo: yup.boolean().optional(),
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

    // validar duplicidade de código além do que está sendo editado
    const codigoExistente = await departamentosRepository.findOne({
      where: {
        codigo,
        id: Not(Number(id)),
      },
    });

    if (codigoExistente) {
      return res.status(400).json({
        mensagem: "Já existe outro departamento com este código.",
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
    const updateData: any = { codigo, name };
    if (ativo !== undefined) {
      updateData.ativo = ativo;
    }
    
    departamentosRepository.merge(departamento, updateData);

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

// ativar/desativar departamento
router.patch("/departamentos/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;

    const schema = yup.object().shape({
      ativo: yup.boolean().required("O status ativo é obrigatório!"),
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

    departamento.ativo = ativo;
    await departamentosRepository.save(departamento);

    return res.status(200).json({
      mensagem: `Departamento ${ativo ? 'ativado' : 'desativado'} com sucesso`,
      departamento,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({
        mensagem: error.errors,
      });
    }
    
    console.error("Erro ao alterar status do departamento:", error);
    return res.status(500).json({
      mensagem: "Erro ao alterar status do departamento",
    });
  }
});

export default router;
