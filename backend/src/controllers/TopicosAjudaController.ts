import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { TopicosAjuda } from "../entities/TopicosAjuda";

const router = Router();


router.get("/topicos_ajuda", async (req: Request, res: Response) => {
  try {
    const topicosRepository = AppDataSource.getRepository(TopicosAjuda);
    const topicos = await topicosRepository.find({
      order: { nome: "ASC" },
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
    const { nome, ativo } = req.body;
    
    if (!nome) {
      return res.status(400).json({ mensagem: "O nome do tópico é obrigatório" });
    }

    const topicosRepository = AppDataSource.getRepository(TopicosAjuda);

    // validar se existe um topico com o mesmo nome
    const topicoExistente = await topicosRepository.findOne({
      where: { nome },
    });

    if (topicoExistente) {
      return res.status(409).json({ mensagem: "Já existe um tópico com esse nome" });
    }

    const novoTopico = topicosRepository.create({
      nome,
      ativo: ativo !== undefined ? ativo : true,
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
    const { nome, ativo } = req.body;

    if (!nome) {
      return res.status(400).json({ mensagem: "Nome do tópico é obrigatório" });
    }

    const topicosRepository = AppDataSource.getRepository(TopicosAjuda);

    const topico = await topicosRepository.findOne({
      where: { id: Number(id) },
    });

    if (!topico) {
      return res.status(404).json({ mensagem: "Tópico não encontrado para atualização" });
    }

    topico.nome = nome;
    if (ativo !== undefined) {
      topico.ativo = ativo;
    }
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

// rota para ativar/desativar tópico
router.patch("/topicos_ajuda/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;

    if (ativo === undefined) {
      return res.status(400).json({ mensagem: "Status ativo é obrigatório" });
    }

    const topicosRepository = AppDataSource.getRepository(TopicosAjuda);

    const topico = await topicosRepository.findOne({
      where: { id: Number(id) },
    });

    if (!topico) {
      return res.status(404).json({ mensagem: "Tópico não encontrado" });
    }

    topico.ativo = ativo;
    await topicosRepository.save(topico);

    return res.status(200).json({
      mensagem: `Tópico ${ativo ? 'ativado' : 'desativado'} com sucesso!`,
      topico,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao alterar status do tópico",
    });
  }
});

export default router;
