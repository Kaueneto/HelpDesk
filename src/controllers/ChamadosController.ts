import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Chamados } from "../entities/Chamados";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { ChamadoMensagens } from "../entities/ChamadoMensagens";
import { Users } from "../entities/Users";
import { StatusChamado } from "../entities/StatusChamado";
// import verifyToken from "../middlewares/verifyToken";

interface AuthenticatedRequest extends Request {
  user?: Users;
}

const router = Router();


router.post("/chamados", /*verifyToken,*/ async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      ramal,
      prioridadeId,
      topicoAjudaId,
      departamentoId,
      resumoChamado,
      descricaoChamado,
    } = req.body;

    const usuarioId = req.user?.id; // vindo do token futuramente

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);

    const chamado = chamadoRepository.create({
      ramal,
      numeroChamado: Date.now(), // simples por enquanto
      status: { id: 1 }, // ABERTO
      resumoChamado,
      descricaoChamado,
      usuario: { id: usuarioId },
      tipoPrioridade: { id: prioridadeId },
      topicoAjuda: { id: topicoAjudaId },
      departamento: { id: departamentoId },
    });

    await chamadoRepository.save(chamado);

    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: "Chamado aberto",
      status: "ABERTO",
      dataMov: new Date(),
    });

    return res.status(201).json({
      mensagem: "Chamado aberto com sucesso!",
      chamado,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao abrir chamado",
      error,
    });
  }
});


router.get("/chamados/meus", /*verifyToken,*/ async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id;

    const chamados = await AppDataSource.getRepository(Chamados).find({
      where: { usuario: { id: usuarioId } },
      relations: ["tipoPrioridade", "departamento", "topicoAjuda", "status"],
      order: { dataAbertura: "DESC" },
    });

    return res.status(200).json(chamados);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar chamados",
    });
  }
});


router.get("/chamados", /*verifyToken,*/ async (req: AuthenticatedRequest, res: Response) => {
  try {
    const chamados = await AppDataSource.getRepository(Chamados).find({
      relations: ["usuario", "tipoPrioridade", "departamento", "status"],
      order: { dataAbertura: "DESC" },
    });

    return res.status(200).json(chamados);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar chamados",
    });
  }
});

router.put("/chamados/:id/encerrar", /*verifyToken,*/ async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    chamado.status = { id: 3 } as StatusChamado; // ENCERRADO
    chamado.dataFechamento = new Date();
    chamado.userFechamento = { id: usuarioId } as Users;

    await chamadoRepository.save(chamado);

    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: "Chamado encerrado",
      status: "ENCERRADO",
      dataMov: new Date(),
    });

    return res.status(200).json({
      mensagem: "Chamado encerrado com sucesso!",
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao encerrar chamado",
    });
  }
});


router.get("/chamados/:id/historico", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const historico = await AppDataSource.getRepository(ChamadoHistorico).find({
      where: { chamado: { id: Number(id) } },
      relations: ["usuario"],
      order: { dataMov: "ASC" },
    });

    return res.status(200).json(historico);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao buscar histórico do chamado",
    });
  }
});


router.post("/chamados/:id/mensagens", /*verifyToken,*/ async (req: AuthenticatedRequest, res: Response) => {
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

export default router;
