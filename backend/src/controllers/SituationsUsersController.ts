import express, { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { SituationsUsers } from "../entities/SituationsUsers";
import * as yup from "yup";
import { Not } from "typeorm";


//criar aplicacao express
const router = express.Router();

// rota principal da aplicação
router.get("/SituationsUsers", async (req: Request, res: Response) => {
  try {
    // obter o respositorio da entidade situation
    const situationRepository = AppDataSource.getRepository(SituationsUsers);

    const situations = await situationRepository.find();

    //retornar a resposta com os dados
    res.status(200).json(situations);
    return;
  } catch (error) {
    console.error("Erro ao listar SituationsUsers:", error);
    res.status(500).json({
      mensagem: "Erro ao listar situação",
      erro: error instanceof Error ? error.message : "Erro desconhecido"
    });
    return;
  }
});

//crir a visualizacao d oitem cadastrado em situacao

router.get("/SituationsUsers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const situationRepository = AppDataSource.getRepository(SituationsUsers);

    const situations = await situationRepository.findOneBy({
      id: parseInt(id),
    });

    if (!situations) {
      res.status(404).json({
        mensagem: "situação não encontrada",
      });
      return;
    }

    res.status(200).json(situations);
    return;
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao visualizar situação",
    });
    return;
  }
});

// criar nova situação de usuário
router.post("/SituationsUsers", async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const schema = yup.object().shape({
      nomeSituacao: yup
        .string()
        .required("O nome da situação é obrigatório!")
        .min(3, "O nome da situação deve conter no mínimo 3 caracteres!"),
    });

    await schema.validate(data, { abortEarly: false });

    const situationRepository = AppDataSource.getRepository(SituationsUsers);

    // Validar duplicidade
    const existingSituation = await situationRepository.findOne({
      where: { nomeSituacao: data.nomeSituacao },
    });

    if (existingSituation) {
      res.status(400).json({
        mensagem: "Já existe uma situação cadastrada com este nome.",
      });
      return;
    }

    // Criar a situação
    const newSituation = situationRepository.create(data);
    await situationRepository.save(newSituation);

    res.status(201).json({
      mensagem: "Situação criada com sucesso!",
      situation: newSituation,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({
        mensagem: error.errors,
      });
      return;
    }
    res.status(500).json({
      mensagem: "Erro ao criar situação",
    });
  }
});

//atualizar situacao
router.put("/SituationsUsers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    var data = req.body;

    const schema = yup.object().shape({
      nomeSituacao: yup
        .string()
        .required("o campo nome é obrigatório!")
        .min(3, "o campo nome deve conter no minimo 3 caracteres!"),
    });
    await schema.validate(data, { abortEarly: false });

    const situationRepository = AppDataSource.getRepository(SituationsUsers);

    const situations = await situationRepository.findOneBy({
      id: parseInt(id),
    });

    if (!situations) {
      res.status(404).json({
        mensagem: "situação não encontrada",
      });
      return;
    }

    //valida duplicidade
    const existingSituation = await situationRepository.findOne({
      where: {
        nomeSituacao: data.nomeSituacao,
        id: Not(parseInt(id)) 
      },
    });

    if (existingSituation) {
      res.status(400).json({
        mensagem: "Já existe outra situação cadastrada com este nome.",
      });
      return;
    }

    //atualiza os dados
    situationRepository.merge(situations, data);

    //salva as alterações

    const updatedSituation = await situationRepository.save(situations);

    res.status(200).json({
      mensagem: "situação atualizada com sucesso",
      situation: updatedSituation,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({
        mensagem: error.errors,
      });
      return;
    }
    res.status(500).json({
      mensagem: "Erro ao atualizar a situação",
    });
  }
});

// remove o item cadastrado do banco
router.delete("/SituationsUsers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const situationRepository = AppDataSource.getRepository(SituationsUsers);

    const situations = await situationRepository.findOneBy({
      id: parseInt(id),
    });

    if (!situations) {
      res.status(404).json({
        mensagem: "situação não encontrada",
      });
      return;
    }
    //remover os dados
    await situationRepository.remove(situations);

    res.status(200).json({
      mensagem: "situação removida com sucesso",
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao remover a situação",
    });
    return;
  }
});

// cria o item
router.post("/SituationsUsers", async (req: Request, res: Response) => {
  try {
    var data = req.body;

    const schema = yup.object().shape({
      nomeSituacao: yup
        .string()
        .required("o campo nome da situação é obrigatório!")
        .min(3, "o campo nome da situação deve conter no minimo 3 caracteres!"),
    });

    await schema.validate(data, { abortEarly: false });

    const situationRepository = AppDataSource.getRepository(SituationsUsers);

    //valida duplicidade
    const existingSituation = await situationRepository.findOne({
      where: { nomeSituacao: data.nomeSituacao },
    });
    if (existingSituation) {
      res.status(400).json({
        mensagem: "uma situação com esse nome ja existe.",
      });
      return;
    }

    const newSituation = situationRepository.create(data);

    await situationRepository.save(newSituation);

    res.status(201).json({
      mensagem: "Nova situação criada com sucesso!",
      situation: newSituation,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({
        mensagem: error.errors,
      });
      return;
    }

    res.status(500).json({
      mensagem: "Erro ao criar nova situação",
    });
  }
});

export default router;
