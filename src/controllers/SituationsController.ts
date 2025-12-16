import express, { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Situations } from "../entities/Situations";
import { PaginationService } from "../services/PaginationService";
import * as yup from "yup";
import { Not } from "typeorm";

//importar o arquivo com as credenciais do banco de dados

//criar aplicacao express
const router = express.Router();

// rota principal da aplicação
router.get("/Situations", async (req: Request, res: Response) => {
  try {
    // obter o respositorio da entidade situation
    const situationRepository = AppDataSource.getRepository(Situations);

    //receber o numero de pagina e definir pagina 1 como padrao
    const page = Number(req.query.page) || 1;
    //definir o limite de registros por pagina
    const limit = Number(req.query.limit) || 10;

    const result = await PaginationService.paginate(
      situationRepository,
      page,
      limit,
      { id: "DESC" }
    );

    //retornar a resposta com os dados e infromações de paginação
    res.status(200).json(result);
    return;
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao listar situação",
    });
    return;
  }
});

//crir a visualizacao d oitem cadastrado em situacao

router.get("/Situations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const situationRepository = AppDataSource.getRepository(Situations);

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
//atualiza
router.put("/Situations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    var data = req.body;

    const schema = yup.object().shape({
      nameSituation: yup
        .string()
        .required("o campo nome é obrigatório!")
        .min(3, "o campo nome deve conter no minimo 3 caracteres!"),
    });
    await schema.validate(data, { abortEarly: false });

    const situationRepository = AppDataSource.getRepository(Situations);

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
        nameSituation: data.nameSituation,
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
router.delete("/Situations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const situationRepository = AppDataSource.getRepository(Situations);

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
router.post("/Situations", async (req: Request, res: Response) => {
  try {
    var data = req.body;

    const schema = yup.object().shape({
      nameSituation: yup
        .string()
        .required("o campo nome da situação é obrigatório!")
        .min(3, "o campo nome da situação deve conter no minimo 3 caracteres!"),
    });

    await schema.validate(data, { abortEarly: false });

    const situationRepository = AppDataSource.getRepository(Situations);

    //valida duplicidade
    const existingSituation = await situationRepository.findOne({
      where: { nameSituation: data.nameSituation },
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
