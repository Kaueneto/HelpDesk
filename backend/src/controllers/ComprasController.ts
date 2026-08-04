import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Chamados } from "../entities/Chamados";
import { Cotacoes, StatusCotacao } from "../entities/Cotacoes";
import { CotacaoItens } from "../entities/CotacaoItens";
import { CotacaoItemOpcoes } from "../entities/CotacaoItemOpcoes";
import {
  CotacaoItemOpcaoClassificacoes,
  TipoClassificacao,
} from "../entities/CotacaoItemOpcaoClassificacoes";
import { verifyToken } from "../Middleware/AuthMiddleware";
import * as yup from "yup";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

const router = Router();

//listar todos os chamados do topico de solicitacao de compras   (id = 26)
router.get("/compras/solicitacoes",  verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const chamadosRepository = AppDataSource.getRepository(Chamados);

      const solicitacoes = await chamadosRepository.find({
        where: { topicoAjuda: { id: 26 } },
        relations: [
          "usuario",
          "tipoPrioridade",
          "departamento",
          "topicoAjuda",
          "status",
          "userResponsavel",
        ],
        order: { dataAbertura: "DESC" },
      });

      return res.status(200).json(solicitacoes);
    } catch (error) {
      console.error("Erro ao listar solicitações:", error);
      return res.status(500).json({
        mensagem: "Erro ao listar solicitações de compra",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);



//bsucar uma solicitacao especifica com suas cotaoesc
router.get(  "/compras/solicitacoes/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const idNum = Number(id);
      if (!id || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de solicitação inválido" });
      }

      const chamadosRepository = AppDataSource.getRepository(Chamados);
      const cotacoesRepository = AppDataSource.getRepository(Cotacoes);

      const solicitacao = await chamadosRepository.findOne({
        where: { id: Number(id), topicoAjuda: { id: 26 } },
        relations: [
          "usuario",
          "tipoPrioridade",
          "departamento",
          "topicoAjuda",
          "status",
          "userResponsavel",
        ],
      });

      if (!solicitacao) {
        return res.status(404).json({
          mensagem: "Solicitação de compra não encontrada",
        });
      }

      // buscar cotações da solicitação
      const cotacoes = await cotacoesRepository.find({
        where: { chamado: { id: Number(id) } },
        relations: ["criadoPor", "itens", "itens.opcoes", "itens.opcoes.classificacoes"],
        order: { createdAt: "DESC" },
      });

      return res.status(200).json({
        solicitacao,
        cotacoes,
      });
    } catch (error) {
      console.error("Erro ao buscar solicitação:", error);
      return res.status(500).json({
        mensagem: "Erro ao buscar solicitação de compra",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

//listar todas as cotações
router.get(  "/compras/cotacoes", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const cotacoesRepository = AppDataSource.getRepository(Cotacoes);

      const cotacoes = await cotacoesRepository.find({
        relations: [
          "chamado",
          "chamado.usuario",
          "criadoPor",
          "itens",
          "itens.opcoes",
          "itens.opcoes.classificacoes",
        ],
        order: { createdAt: "DESC" },
      });

      return res.status(200).json(cotacoes);
    } catch (error) {
      console.error("Erro ao listar cotações:", error);
      return res.status(500).json({
        mensagem: "Erro ao listar cotações",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);


//buscar uma cotacao especifica
router.get(  "/compras/cotacoes/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const idNum = Number(id);
      if (!id || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de cotação inválido" });
      }

      const cotacoesRepository = AppDataSource.getRepository(Cotacoes);

      const cotacao = await cotacoesRepository.findOne({
        where: { id: Number(id) },
        relations: [
          "chamado",
          "chamado.usuario",
          "chamado.departamento",
          "chamado.tipoPrioridade",
          "chamado.status",
          "criadoPor",
          "itens",
          "itens.opcoes",
          "itens.opcoes.classificacoes",
        ],
      });

      if (!cotacao) {
        return res.status(404).json({
          mensagem: "Cotação não encontrada",
        });
      }

      return res.status(200).json(cotacao);
    } catch (error) {
      console.error("Erro ao buscar cotação:", error);
      return res.status(500).json({
        mensagem: "Erro ao buscar cotação",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);


//criar uma nova cotacao para uma solicitacao de compra 
router.post( "/compras/cotacoes", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { chamadoId } = req.body;
      const usuarioId = req.userId;

      const schema = yup.object().shape({
        chamadoId: yup
          .number()
          .required("ID do chamado é obrigatório")
          .positive("ID do chamado deve ser um número positivo"),
      });

      await schema.validate(req.body, { abortEarly: false });

      // verificar se o chamado existe e é uma solicitação de compra
      const chamadosRepository = AppDataSource.getRepository(Chamados);
      const chamado = await chamadosRepository.findOne({
        where: { id: Number(chamadoId), topicoAjuda: { id: 26 } },
      });

      if (!chamado) {
        return res.status(404).json({
          mensagem: "Solicitação de compra não encontrada",
        });
      }

      const cotacoesRepository = AppDataSource.getRepository(Cotacoes);

      const novaCotacao = cotacoesRepository.create({
        chamado: { id: Number(chamadoId) } as any,
        criadoPor: { id: usuarioId } as any,
        status: StatusCotacao.EM_ANDAMENTO,
      });

      await cotacoesRepository.save(novaCotacao);

      // recarregar com relações
      const cotacaoCompleta = await cotacoesRepository.findOne({
        where: { id: novaCotacao.id },
        relations: ["chamado", "criadoPor"],
      });

      return res.status(201).json({
        mensagem: "Cotação criada com sucesso!",
        cotacao: cotacaoCompleta,
      });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        return res.status(400).json({
          mensagem: error.errors,
        });
      }

      console.error("Erro ao criar cotação:", error);
      return res.status(500).json({
        mensagem: "Erro ao criar cotação",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

//atualizar status da  cotacao
router.put("/compras/cotacoes/:id/status", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const idNum = Number(id);
      if (!id || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de cotação inválido" });
      }

      const schema = yup.object().shape({
        status: yup
          .string()
          .required("Status é obrigatório")
          .oneOf(Object.values(StatusCotacao), "Status inválido"),
      });

      await schema.validate({ status }, { abortEarly: false });

      const cotacoesRepository = AppDataSource.getRepository(Cotacoes);

      const cotacao = await cotacoesRepository.findOne({
        where: { id: Number(id) },
      });

      if (!cotacao) {
        return res.status(404).json({
          mensagem: "Cotação não encontrada",
        });
      }

      cotacao.status = status as StatusCotacao;
      await cotacoesRepository.save(cotacao);

      return res.status(200).json({
        mensagem: "Status atualizado com sucesso!",
        cotacao,
      });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        return res.status(400).json({
          mensagem: error.errors,
        });
      }

      console.error("Erro ao atualizar status:", error);
      return res.status(500).json({
        mensagem: "Erro ao atualizar status da cotação",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

//excluir uma cotacao
router.delete("/compras/cotacoes/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const idNum = Number(id);
      if (!id || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de cotação inválido" });
      }

      const cotacoesRepository = AppDataSource.getRepository(Cotacoes);

      const cotacao = await cotacoesRepository.findOne({
        where: { id: Number(id) },
      });

      if (!cotacao) {
        return res.status(404).json({
          mensagem: "Cotação não encontrada",
        });
      }

      await cotacoesRepository.remove(cotacao);

      return res.status(200).json({
        mensagem: "Cotação excluída com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao excluir cotação:", error);
      return res.status(500).json({
        mensagem: "Erro ao excluir cotação",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

//add item a cotacao
router.post("/compras/cotacoes/:cotacaoId/itens", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { cotacaoId } = req.params;
      const { descricao, quantidade, observacao } = req.body;

      const idNum = Number(cotacaoId);
      if (!cotacaoId || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de cotação inválido" });
      }

      const schema = yup.object().shape({
        descricao: yup
          .string()
          .required("Descrição é obrigatória")
          .min(3, "Descrição deve ter no mínimo 3 caracteres"),
        quantidade: yup
          .number()
          .required("Quantidade é obrigatória")
          .positive("Quantidade deve ser maior que zero")
          .integer("Quantidade deve ser um número inteiro"),
        observacao: yup.string().optional().nullable(),
      });

      await schema.validate(req.body, { abortEarly: false });

      const itensRepository = AppDataSource.getRepository(CotacaoItens);

      const novoItem = itensRepository.create({
        cotacao: { id: Number(cotacaoId) } as any,
        descricao,
        quantidade,
        observacao: observacao || null,
      });

      await itensRepository.save(novoItem);

      return res.status(201).json({
        mensagem: "Item adicionado com sucesso!",
        item: novoItem,
      });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        return res.status(400).json({
          mensagem: error.errors,
        });
      }

      console.error("Erro ao adicionar item:", error);
      return res.status(500).json({
        mensagem: "Erro ao adicionar item",
        erro: error instanceof Error ? error.message : "erro desconhecido",
      });
    }
  }
);
//atualizar item da cotacao
router.put("/compras/itens/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { descricao, quantidade, observacao } = req.body;

      const idNum = Number(id);
      if (!id || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de item inválido" });
      }

      const schema = yup.object().shape({
        descricao: yup
          .string()
          .required("Descrição é obrigatória")
          .min(3, "Descrição deve ter no mínimo 3 caracteres"),
        quantidade: yup
          .number()
          .required("Quantidade é obrigatória")
          .positive("Quantidade deve ser maior que zero")
          .integer("Quantidade deve ser um número inteiro"),
        observacao: yup.string().optional().nullable(),
      });

      await schema.validate(req.body, { abortEarly: false });

      const itensRepository = AppDataSource.getRepository(CotacaoItens);

      const item = await itensRepository.findOne({
        where: { id: Number(id) },
      });

      if (!item) {
        return res.status(404).json({
          mensagem: "Item não encontrado",
        });
      }

      item.descricao = descricao;
      item.quantidade = quantidade;
      item.observacao = observacao || null;

      await itensRepository.save(item);

      return res.status(200).json({
        mensagem: "Item atualizado com sucesso!",
        item,
      });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        return res.status(400).json({
          mensagem: error.errors,
        });
      }

      console.error("Erro ao atualizar item:", error);
      return res.status(500).json({
        mensagem: "Erro ao atualizar item",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

//excluir item da cotacao
router.delete("/compras/itens/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const idNum = Number(id);
      if (!id || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de item inválido" });
      }

      const itensRepository = AppDataSource.getRepository(CotacaoItens);

      const item = await itensRepository.findOne({
        where: { id: Number(id) },
      });

      if (!item) {
        return res.status(404).json({
          mensagem: "Item não encontrado",
        });
      }

      await itensRepository.remove(item);

      return res.status(200).json({
        mensagem: "Item excluído com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      return res.status(500).json({
        mensagem: "Erro ao excluir item",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

//add opção de cotação ao item
 router.post("/compras/itens/:itemId/opcoes", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { itemId } = req.params;

      const idNum = Number(itemId);
      if (!itemId || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de item inválido" });
      }

      const {
        fornecedor,
        descricao_produto,
        link_produto,
        quantidade,
        valor_avista,
        valor_parcelado,
        valor_frete,
        observacao,
      } = req.body;

      const schema = yup.object().shape({
        fornecedor: yup.string().required("Fornecedor é obrigatório"),
        descricao_produto: yup.string().required("Descrição do produto é obrigatória"),
        link_produto: yup.string().optional().nullable(),
        quantidade: yup
          .number()
          .required("Quantidade é obrigatória")
          .positive("Quantidade deve ser maior que zero")
          .integer("Quantidade deve ser um número inteiro"),
        valor_avista: yup
          .number()
          .required("Preço à vista é obrigatório")
          .min(0, "Preço à vista deve ser maior ou igual a zero"),
        valor_parcelado: yup
          .number()
          .required("Preço parcelado é obrigatório")
          .min(0, "Preço parcelado deve ser maior ou igual a zero"),
        valor_frete: yup
          .number()
          .optional()
          .default(0)
          .min(0, "Frete deve ser maior ou igual a zero"),
        observacao: yup.string().optional().nullable(),
      });

      await schema.validate(req.body, { abortEarly: false });

      const opcoesRepository = AppDataSource.getRepository(CotacaoItemOpcoes);

      const valor_total = Number(valor_avista || 0) * Number(quantidade);

      const novaOpcao = opcoesRepository.create({
        cotacaoItem: { id: Number(itemId) } as any,
        fornecedor,
        descricao_produto,
        link_produto: link_produto || null,
        quantidade,
        valor_avista: Number(valor_avista || 0),
        valor_parcelado: Number(valor_parcelado || 0),
        valor_frete: Number(valor_frete || 0),
        valor_total,
        observacao: observacao || null,
        selecionado: false,
      });

      await opcoesRepository.save(novaOpcao);

      return res.status(201).json({
        mensagem: "Opção adicionada com sucesso!",
        opcao: novaOpcao,
      });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        return res.status(400).json({
          mensagem: error.errors,
        });
      }

      console.error("Erro ao adicionar opção:", error);
      return res.status(500).json({
        mensagem: "Erro ao adicionar opção",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

//ataulziar opcao de cotacao
router.put("/compras/opcoes/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const idNum = Number(id);
      if (!id || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de opção inválido" });
      }

      const {
        fornecedor,
        descricao_produto,
        link_produto,
        quantidade,
        valor_avista,
        valor_parcelado,
        valor_frete,
        observacao,
        selecionado,
      } = req.body;

      const schema = yup.object().shape({
        fornecedor: yup.string().required("Fornecedor é obrigatório"),
        descricao_produto: yup.string().required("Descrição do produto é obrigatória"),
        link_produto: yup.string().optional().nullable(),
        quantidade: yup
          .number()
          .required("Quantidade é obrigatória")
          .positive("Quantidade deve ser maior que zero")
          .integer("Quantidade deve ser um número inteiro"),
        valor_avista: yup
          .number()
          .required("Preço à vista é obrigatório")
          .min(0, "Preço à vista deve ser maior ou igual a zero"),
        valor_parcelado: yup
          .number()
          .required("Preço parcelado é obrigatório")
          .min(0, "Preço parcelado deve ser maior ou igual a zero"),
        valor_frete: yup
          .number()
          .optional()
          .default(0)
          .min(0, "Frete deve ser maior ou igual a zero"),
        observacao: yup.string().optional().nullable(),
        selecionado: yup.boolean().optional(),
      });

      await schema.validate(req.body, { abortEarly: false });

      const opcoesRepository = AppDataSource.getRepository(CotacaoItemOpcoes);

      const opcao = await opcoesRepository.findOne({
        where: { id: Number(id) },
      });

      if (!opcao) {
        return res.status(404).json({
          mensagem: "Opção não encontrada",
        });
      }

      opcao.fornecedor = fornecedor;
      opcao.descricao_produto = descricao_produto;
      opcao.link_produto = link_produto || null;
      opcao.quantidade = quantidade;
      opcao.valor_avista = Number(valor_avista || 0);
      opcao.valor_parcelado = Number(valor_parcelado || 0);
      opcao.valor_frete = Number(valor_frete || 0);
      opcao.valor_total = Number(valor_avista || 0) * Number(quantidade);
      opcao.observacao = observacao || null;
      if (selecionado !== undefined) {
        opcao.selecionado = selecionado;
      }

      await opcoesRepository.save(opcao);

      return res.status(200).json({
        mensagem: "Opção atualizada com sucesso!",
        opcao,
      });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        return res.status(400).json({
          mensagem: error.errors,
        });
      }

      console.error("Erro ao atualizar opção:", error);
      return res.status(500).json({
        mensagem: "Erro ao atualizar opção",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

//excluir opção de cotação
router.delete("/compras/opcoes/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const idNum = Number(id);
      if (!id || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de opção inválido" });
      }

      const opcoesRepository = AppDataSource.getRepository(CotacaoItemOpcoes);

      const opcao = await opcoesRepository.findOne({
        where: { id: Number(id) },
      });

      if (!opcao) {
        return res.status(404).json({
          mensagem: "Opção não encontrada",
        });
      }

      await opcoesRepository.remove(opcao);

      return res.status(200).json({
        mensagem: "Opção excluída com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao excluir opção:", error);
      return res.status(500).json({
        mensagem: "Erro ao excluir opção",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

//add classificacao a opcao
router.post(
  "/compras/opcoes/:opcaoId/classificacoes",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { opcaoId } = req.params;
      const { tipo } = req.body;

      const idNum = Number(opcaoId);
      if (!opcaoId || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de opção inválido" });
      }

      const schema = yup.object().shape({
        tipo: yup
          .string()
          .required("Tipo de classificação é obrigatório")
          .oneOf(Object.values(TipoClassificacao), "Tipo de classificação inválido"),
      });

      await schema.validate({ tipo }, { abortEarly: false });

      const classificacoesRepository = AppDataSource.getRepository(
        CotacaoItemOpcaoClassificacoes
      );

      // verificar se já existe essa classificação para essa opção
      const classificacaoExistente = await classificacoesRepository.findOne({
        where: {
          opcao: { id: Number(opcaoId) },
          tipo: tipo as TipoClassificacao,
        },
      });

      if (classificacaoExistente) {
        return res.status(400).json({
          mensagem: "Esta classificação já foi adicionada a esta opção",
        });
      }

      const novaClassificacao = classificacoesRepository.create({
        opcao: { id: Number(opcaoId) } as any,
        tipo: tipo as TipoClassificacao,
      });

      await classificacoesRepository.save(novaClassificacao);

      return res.status(201).json({
        mensagem: "Classificação adicionada com sucesso!",
        classificacao: novaClassificacao,
      });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        return res.status(400).json({
          mensagem: error.errors,
        });
      }

      console.error("Erro ao adicionar classificação:", error);
      return res.status(500).json({
        mensagem: "Erro ao adicionar classificação",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

//delete exlcuir classificacao
router.delete(
  "/compras/classificacoes/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const idNum = Number(id);
      if (!id || isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensagem: "ID de classificação inválido" });
      }

      const classificacoesRepository = AppDataSource.getRepository(
        CotacaoItemOpcaoClassificacoes
      );

      const classificacao = await classificacoesRepository.findOne({
        where: { id: Number(id) },
      });

      if (!classificacao) {
        return res.status(404).json({
          mensagem: "Classificação não encontrada",
        });
      }

      await classificacoesRepository.remove(classificacao);

      return res.status(200).json({
        mensagem: "Classificação excluída com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao excluir classificação:", error);
      return res.status(500).json({
        mensagem: "Erro ao excluir classificação",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

export default router;
