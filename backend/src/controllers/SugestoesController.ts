import { Router, Request, Response } from 'express';
import { SugestoesService } from '../services/SugestoesService';
import { verifyToken } from '../Middleware/AuthMiddleware';

const router = Router();
const sugestoesService = new SugestoesService();

// criar uma nova sugestao
router.post('/sugestoes', verifyToken, async (req: Request, res: Response) => {
  try {
    const { titulo, descricao, escopo, privado } = req.body;
    const usuarioId = (req as any).usuarioAutenticado.id;
    const departamentoId = (req as any).usuarioAutenticado.id_departament;

    if (!titulo || !descricao) {
      return res.status(400).json({ mensagem: 'Título e descrição são obrigatórios' });
    }

    const sugestao = await sugestoesService.criarSugestao({
      titulo,
      descricao,
      usuarioCriacaoId: usuarioId,
      departamentoId: departamentoId ? parseInt(departamentoId) : null,
      escopo: escopo || 'departamento',
      privado: privado || false,
    });

    res.status(201).json({
      mensagem: 'Sugestão criada com sucesso',
      sugestao,
    });
  } catch (error: any) {
    res.status(500).json({ mensagem: 'erro ao criar sugestão', erro: error.message });
  }
});

// listar as sugestoes
router.get('/sugestoes', verifyToken, async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuarioAutenticado?.id;
    const isAdmin = (req as any).usuarioAutenticado?.roleId === 1;

    if (!usuarioId) {
      return res.status(400).json({ mensagem: 'usuarioId não encontrado' });
    }

    const filtros = {
      status: req.query.status as string | undefined,
      departamentoId: req.query.departamentoId ? parseInt(req.query.departamentoId as string) : undefined,
      ordenarPor: (req.query.ordenarPor as 'votos' | 'recente' | 'antigo') || 'recente',
    };

    const sugestoes = await sugestoesService.listarSugestoes(usuarioId, isAdmin, filtros);

    res.json({
      total: sugestoes.length,
      sugestoes,
    });
  } catch (error: any) {
    console.error('erro ao listar sugestões:', error);
    res.status(500).json({ mensagem: 'erro ao listar sugestões', erro: error.message });
  }
});

// ver detalhes da sugestao
router.get('/sugestoes/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const sugestaoId = parseInt(req.params.id);
    const usuarioId = (req as any).usuarioAutenticado.id;
    const isAdmin = (req as any).usuarioAutenticado.roleId === 1;

    const sugestao = await sugestoesService.obterDetalhes(sugestaoId, usuarioId, isAdmin);

    res.json(sugestao);
  } catch (error: any) {
    if (error.message === 'Sem permissão para visualizar esta sugestão') {
      return res.status(403).json({ mensagem: error.message });
    }
    res.status(500).json({ mensagem: 'erro ao obter sugestão', erro: error.message });
  }
});

// votar em sugestao
router.post('/sugestoes/:id/votar', verifyToken, async (req: Request, res: Response) => {
  try {
    const sugestaoId = parseInt(req.params.id);
    const usuarioId = (req as any).usuarioAutenticado.id;

    const resultado = await sugestoesService.votarEmSugestao(sugestaoId, usuarioId);

    res.json({
      mensagem: `Voto ${resultado.acao}`,
      acao: resultado.acao,
    });
  } catch (error: any) {
    res.status(500).json({ mensagem: 'erro ao votar', erro: error.message });
  }
});

// add comentario na suegstao
router.post('/sugestoes/:id/comentario', verifyToken, async (req: Request, res: Response) => {
  try {
    const sugestaoId = parseInt(req.params.id);
    const usuarioId = (req as any).usuarioAutenticado.id;
     const { mensagem } = req.body;

    if (!mensagem) {
      return res.status(400).json({ mensagem: 'Mensagem é obrigatória' });
    }

     const interacao = await sugestoesService.adicionarComentario(sugestaoId, usuarioId, mensagem);

    res.status(201).json({
       mensagem: 'Comentário adicionado com sucesso',
       interacao,
    });
  } catch (error: any) {
       res.status(500).json({ mensagem: 'erro ao adicionar comentário', erro: error.message });
  }
});

// SO PRA QUEM PODE (administrador) - alterar o status da sugestao
router.patch('/sugestoes/:id/status', verifyToken, async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuarioAutenticado.id;
    const isAdmin = (req as any).usuarioAutenticado.roleId === 1;

    if (!isAdmin) {
      return res.status(403).json({ mensagem: 'apenas administradores podem alterar status' });
    }

    const sugestaoId = parseInt(req.params.id);
  const { novoStatus, motivo } = req.body;

    if (!novoStatus) {
      return res.status(400).json({ mensagem: 'novo status é obrigatório' });
    }

    const sugestao = await sugestoesService.alterarStatus(sugestaoId, novoStatus, usuarioId, motivo);

    res.json({
      mensagem: 'Status alterado com sucesso',
      sugestao,
    });
  } catch (error: any) {
    res.status(500).json({ mensagem: 'erro ao alterar status', erro: error.message });
  }
});

// promover sugestao para global (admin apenas)
router.patch('/sugestoes/:id/promover', verifyToken, async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuarioAutenticado.id;
    const isAdmin = (req as any).usuarioAutenticado.roleId === 1;

    if (!isAdmin) {
      return res.status(403).json({ mensagem: 'Apenas administradores podem promover sugestões' });
    }

    const sugestaoId = parseInt(req.params.id);
    const sugestao = await sugestoesService.promoverParaGlobal(sugestaoId);

    res.json({
      mensagem: 'Sugestão promovida para global com sucesso',
      sugestao,
    });
  } catch (error: any) {
    res.status(500).json({ mensagem: 'erro ao promover sugestão', erro: error.message });
  }
});

export default router;
