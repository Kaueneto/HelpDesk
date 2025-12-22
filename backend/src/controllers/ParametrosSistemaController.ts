import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ParametrosSistema } from "../entities/ParametrosSistema";
import { Users } from "../entities/Users";
import { verifyToken } from "../Middleware/AuthMiddleware";
import { LogsSistemaService } from "../services/LogsSistemaService";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

const router = Router();

// buscar parametros atuais
router.get("/parametros", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parametrosRepository = AppDataSource.getRepository(ParametrosSistema);
    
    const parametros = await parametrosRepository.findOne({
      where: { id: 1 }, // sempre usa o registro com id 1
    });

    // se nao existir, retorna valor padrao sem salvar no banco
    if (!parametros) {
      return res.status(200).json({
        id: 1,
        horasParaAtraso: 24, // valor padrao
        dataAtualizacao: null,
        usuarioAtualizacaoId: null,
        isDefault: true, // flag indicando que e valor padrao, nao salvo
      });
    }

    return res.status(200).json(parametros);
  } catch (error) {
    console.error("Erro ao buscar parâmetros:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar parâmetros do sistema",
    });
  }
});

// atualizar parametros (apenas admin)
router.put("/parametros", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { horasParaAtraso } = req.body;
    const userRoleId = req.userRoleId;
    const userId = req.userId;

    // verificar se é admin
    if (userRoleId !== 1) {
      return res.status(403).json({
        mensagem: "Apenas administradores podem alterar parâmetros do sistema",
      });
    }

    // validar valor
    if (!horasParaAtraso || horasParaAtraso < 1) {
      return res.status(400).json({
        mensagem: "O valor deve ser maior ou igual a 1 hora",
      });
    }

    const parametrosRepository = AppDataSource.getRepository(ParametrosSistema);
    const usersRepository = AppDataSource.getRepository(Users);
    
    // busca informacoes do usuario para o log
    const usuario = userId ? await usersRepository.findOne({ where: { id: userId } }) : null;
    
    // verifica se ja existe
    let parametros = await parametrosRepository.findOne({
      where: { id: 1 },
    });
    
    const valorAnterior = parametros ? parametros.horasParaAtraso : 24; // 24 é o valor padrão
    
    if (parametros) {
      // atualiza o registro existente
      parametros.horasParaAtraso = horasParaAtraso;
      parametros.usuarioAtualizacaoId = userId || null;
      parametros.dataAtualizacao = new Date();
      await parametrosRepository.save(parametros);
    } else {
      // cria novo registro com id=1
      parametros = parametrosRepository.create({
        id: 1,
        horasParaAtraso,
        usuarioAtualizacaoId: userId || null,
          dataAtualizacao: new Date(),

      });
      await parametrosRepository.save(parametros);
    }
    
    // registrar log da alteracao
    await LogsSistemaService.criarLog({
      tipoOperacao: "PARAMETRO_ALTERADO",
      entidade: "ParametrosSistema",
      campoAlterado: "horasParaAtraso",
      valorAnterior: valorAnterior,
      valorNovo: horasParaAtraso,
      descricao: `Alteração de horas para considerar chamado atrasado: ${valorAnterior}h → ${horasParaAtraso}h`,
      usuarioId: userId || null,
      usuarioNome: usuario ? usuario.name : null,
      registroId: 1,
    });
    
    // busca o registro atualizado/criado
    const parametrosAtualizado = await parametrosRepository.findOne({
      where: { id: 1 },
    });

    return res.status(200).json({
      mensagem: "Parâmetros atualizados com sucesso!",
      parametros: parametrosAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar parâmetros:", error);
    return res.status(500).json({
      mensagem: "Erro ao atualizar parâmetros do sistema",
    });
  }
});

export default router;
