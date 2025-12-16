import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";

export class ChamadoHistoricoController {

  async listar(req: Request, res: Response) {
    const { chamadoId } = req.params;

    const historico = await AppDataSource.getRepository(ChamadoHistorico).find({
      where: { chamado: { id: Number(chamadoId) } },
      relations: ["usuario"],
      order: { dataMov: "ASC" }
    });

    return res.json(historico);
  }
}
