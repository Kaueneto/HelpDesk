import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { TopicosAjuda } from "../entities/TopicosAjuda";

const router = Router();


router.get("/topicos_ajuda", async (req: Request, res: Response) => {
  try {
    const topicosRepository = AppDataSource.getRepository(TopicosAjuda);
    const topicos = await topicosRepository.find({
      relations: ["chamados"],
    });

    return res.status(200).json(topicos);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar tópicos",
    });
  }
});


router.get("/topicos_ajuda/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const topicosRepository = AppDataSource.getRepository(TopicosAjuda);

    const topico = await topicosRepository.findOne({
      where: { id: Number(id) },
      relations: ["chamados"],
    });

    if (!topico) {
      return res.status(404).json({ mensagem: "Tópico não encontrado" });
    }

    return res.status(200).json(topico);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao buscar tópico",
    });
  }
});


router.post("/topicos_ajuda", async (req: Request, res: Response) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ mensagem: "Nome do tópico é obrigatório" });
    }

    const topicosRepository = AppDataSource.getRepository(TopicosAjuda);

    const novoTopico = topicosRepository.create({
      nome,
      ativo: req.body.ativo || "SIM",
    });

    await topicosRepository.save(novoTopico);

    return res.status(201).json({
      mensagem: "Tópico criado com sucesso!",
      topico: novoTopico,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao criar tópico",
    });
  }
});


router.put("/topicos_ajuda/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ mensagem: "Nome do tópico é obrigatório" });
    }

    const topicosRepository = AppDataSource.getRepository(TopicosAjuda);

    const topico = await topicosRepository.findOne({
      where: { id: Number(id) },
    });

    if (!topico) {
      return res.status(404).json({ mensagem: "Tópico não encontrado" });
    }

    topico.nome = nome;
    await topicosRepository.save(topico);

    return res.status(200).json({
      mensagem: "Tópico atualizado com sucesso!",
      topico,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao atualizar tópico",
    });
  }
});

//rota pra apagar topico de ajuda
router.delete("/topicos_ajuda/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const topicosRepository = AppDataSource.getRepository(TopicosAjuda);

    const topico = await topicosRepository.findOne({
      where: { id: Number(id) },
    });

    if (!topico) {
      return res.status(404).json({ mensagem: "Tópico não encontrado" });
    }

    await topicosRepository.remove(topico);

    return res.status(200).json({
      mensagem: "Tópico deletado com sucesso!",
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao deletar tópico",
    });
  }
});

export default router;
