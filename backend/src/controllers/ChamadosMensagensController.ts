import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ChamadoMensagens } from "../entities/ChamadoMensagens";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { Users } from "../entities/Users";

interface AuthenticatedRequest extends Request {
  user?: Users;
}

const router = Router();


router.post("/chamados/:id/mensagens", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;
    const usuarioId = req.user?.id;

    const mensagensRepository = AppDataSource.getRepository(ChamadoMensagens);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);

    const novaMensagem = mensagensRepository.create({
      mensagem,
      usuario: { id: usuarioId },
      chamado: { id: Number(id) },
    });

    await mensagensRepository.save(novaMensagem);

    await historicoRepository.save({
      chamado: { id: Number(id) },
      usuario: { id: usuarioId },
      acao: "Mensagem enviada",
      status: "MENSAGEM",
      dataMov: new Date(),
    });

    return res.status(201).json(novaMensagem);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao enviar mensagem",
    });
  }
});

router.get("/chamados/:id/mensagens", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const mensagens = await AppDataSource.getRepository(ChamadoMensagens).find({
      where: { chamado: { id: Number(id) } },
      relations: ["usuario"],
      order: { dataEnvio: "ASC" },
    });

    return res.status(200).json(mensagens);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar mensagens",
    });
  }
});

export default router;
