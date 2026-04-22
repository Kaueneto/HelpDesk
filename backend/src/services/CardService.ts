import { AppDataSource } from "../data-source";
import { KanbanCard } from "../entities/KanbanCard";
import { KanbanBoard } from "../entities/KanbanBoard";
import { KanbanColumn } from "../entities/KanbanColumn";
import { Chamados } from "../entities/Chamados";

interface AddCardToColumnDTO {
  boardId: number;
  columnId?: number | null;
  chamadoId: number;
  posicao?: number;
}

interface MoveCardDTO {
  boardId: number;
  novaColumnId: number | null;
  novaPosition: number;
}

interface GetCardsDTO {
  boardId: number;
  columnId?: number;
}

export class CardService {
  private cardRepository = AppDataSource.getRepository(KanbanCard);
  private boardRepository = AppDataSource.getRepository(KanbanBoard);
  private columnRepository = AppDataSource.getRepository(KanbanColumn);
  private chamadoRepository = AppDataSource.getRepository(Chamados);

  
  //add um chamado a um board customizado
   
  async addCardToBoard(dto: AddCardToColumnDTO): Promise<KanbanCard> {
    const board = await this.boardRepository.findOne({
      where: { id: dto.boardId },
    });

    if (!board) {
      throw new Error("Board não encontrado");
    }

    if (board.tipo !== "custom") {
      throw new Error("Apenas boards customizados aceitam cards manualmente");
    }

    const chamado = await this.chamadoRepository.findOne({
      where: { id: dto.chamadoId },
    });

    if (!chamado) {
      throw new Error("Chamado não encontrado");
    }

    // validar coluna se fornecida
    let coluna: KanbanColumn | null = null;
    if (dto.columnId) {
      coluna = await this.columnRepository.findOne({
        where: { id: dto.columnId },
        relations: ["board"],
      });

      if (!coluna || coluna.board.id !== dto.boardId) {
        throw new Error("Coluna inválida para este board");
      }
    }

    // validar se card já existe
    const existente = await this.cardRepository.findOne({
      where: {
        board: { id: dto.boardId },
        chamado: { id: dto.chamadoId },
      },
    });

    if (existente) {
      throw new Error("Este chamado já está no board");
    }

    // calcular posição se não fornecida
    let posicao = dto.posicao ?? 1000;
    if (posicao === 1000 && coluna) {
      const ultimoCard = await this.cardRepository.findOne({
        where: { column: { id: coluna.id } },
        order: { posicao: "DESC" },
      });
      posicao = (ultimoCard?.posicao ?? 0) + 1000;
    }

    const novoCard = this.cardRepository.create({
      board,
      column: coluna,
      chamado,
      posicao,
    });

    return this.cardRepository.save(novoCard);
  }

   //mover um card entre colunas ou reposicionar
   
  async moveCard(
    cardId: number,
    dto: MoveCardDTO
    ): Promise<KanbanCard> {
        const card = await this.cardRepository.findOne({
        where: { id: cardId },
        relations: ["board", "column"],
        });

    if (!card) {
      throw new Error("Card não encontrado");
    }

    if (card.board.id !== dto.boardId) {
      throw new Error("Card não pertence a este board");
    }

    // validar nova coluna
    let novaColuna: KanbanColumn | null = null;
    if (dto.novaColumnId) {
      novaColuna = await this.columnRepository.findOne({
        where: { id: dto.novaColumnId },
        relations: ["board"],
      });

      if (!novaColuna || novaColuna.board.id !== dto.boardId) {
        throw new Error("Coluna de destino inválida");
      }
    }

    card.column = novaColuna;
    card.posicao = dto.novaPosition;
    card.atualizadoEm = new Date();

    return this.cardRepository.save(card);
  }

 //obter cards de um board ou coluna
  async getCards(dto: GetCardsDTO): Promise<KanbanCard[]> {
    const query = this.cardRepository
      .createQueryBuilder("k")
      .where("k.board.id = :boardId", { boardId: dto.boardId })
      .leftJoinAndSelect("k.chamado", "c")
      .leftJoinAndSelect("k.column", "col")
      .leftJoinAndSelect("c.status", "s")
      .leftJoinAndSelect("c.tipoPrioridade", "tp");

    if (dto.columnId) {
      query.andWhere("k.column.id = :columnId", { columnId: dto.columnId });
    }

    query.orderBy("k.posicao", "ASC");

    return query.getMany();
  }

  //calcular nova posição entre dois cards
  calculatePositionBetween(
    previousPosition: number | null,
    nextPosition: number | null
  ): number {
    if (!previousPosition && !nextPosition) {
      return 1000;
    }

    if (!previousPosition) {
      return nextPosition! / 2;
    }

    if (!nextPosition) {
      return previousPosition + 1000;
    }

    // media entre as duas posições
    return (previousPosition + nextPosition) / 2;
  }

 
   //remover um card do board
  async removeCard(cardId: number): Promise<void> {
    const resultado = await this.cardRepository.delete(cardId);
    if (resultado.affected === 0) {
      throw new Error("Card não encontrado");
    }
  }

 //obter card por ID
  async getCardById(cardId: number): Promise<KanbanCard | null> {
    return this.cardRepository.findOne({
      where: { id: cardId },
      relations: ["board", "column", "chamado"],
    });
  }

 //reorganizar cards dentro de uma coluna
  async reorderCardsInColumn(
    columnId: number,
    cardIds: number[]
  ): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // usar espaçamento de 1000 para reordenar
      for (let i = 0; i < cardIds.length; i++) {
        const cardId = cardIds[i];
        await queryRunner.manager.update(
          KanbanCard,
          cardId,
          {
            posicao: (i + 1) * 1000,
            atualizadoEm: new Date(),
          }
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }


    //contar cards de uma coluna
     async countCardsInColumn(columnId: number): Promise<number> {
    return this.cardRepository.count({
      where: { column: { id: columnId } },
    });
  }

 //obter cards de um board com eagerness (para renderização)
  async getBoardCardsWithDetails(boardId: number): Promise<KanbanCard[]> {
    return this.cardRepository.find({
      where: { board: { id: boardId } },
      relations: [
        "chamado",
        "chamado.status",
        "chamado.tipoPrioridade",
        "chamado.topicoAjuda",
        "chamado.departamento",
        "chamado.usuario",
        "chamado.userResponsavel",
        "column",
      ],
      order: { posicao: "ASC" },
    });
  }
}
