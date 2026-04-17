import { AppDataSource } from "../data-source";
import { KanbanColumn } from "../entities/KanbanColumn";
import { KanbanBoard } from "../entities/KanbanBoard";

interface CreateColumnDTO {
  boardId: number;
  nome: string;
  ordem?: number;
}

interface UpdateColumnDTO {
  nome?: string;
  ordem?: number;
}

interface ReorderColumnsDTO {
  colunaIds: number[];
}

export class ColumnService {
  private columnRepository = AppDataSource.getRepository(KanbanColumn);
  private boardRepository = AppDataSource.getRepository(KanbanBoard);

 //Criar uma nova coluna
  async createColumn(dto: CreateColumnDTO): Promise<KanbanColumn> {
    // validar board
    const board = await this.boardRepository.findOne({
      where: { id: dto.boardId },
    });
    if (!board) {
      throw new Error("Board não encontrado");
    }

    if (board.tipo !== "custom") {
      throw new Error("Apenas boards customizados podem ter colunas customizadas");
    }

    // validar nome único no board
    const existente = await this.columnRepository.findOne({
      where: {
        board: { id: dto.boardId },
        nome: dto.nome,
      },
    });

    if (existente) {
      throw new Error("Já existe uma coluna com este nome neste board");
    }

    // obter próxima ordem se não informada
    let ordem = dto.ordem ?? 0;
    if (ordem === 0) {
      const ultimaColuna = await this.columnRepository.findOne({
        where: { board: { id: dto.boardId } },
        order: { ordem: "DESC" },
      });
      ordem = (ultimaColuna?.ordem ?? 0) + 1;
    }

    const novaColuna = this.columnRepository.create({
      board,
      nome: dto.nome,
      ordem,
    });

    return this.columnRepository.save(novaColuna);
  }

 //obter colunas de um board
  async getColumnsByBoardId(boardId: number): Promise<KanbanColumn[]> {
    return this.columnRepository.find({
      where: { board: { id: boardId } },
      relations: ["board"],
      order: { ordem: "ASC" },
    });
  }

//obter uma coluna por ID
  async getColumnById(columnId: number): Promise<KanbanColumn | null> {
    return this.columnRepository.findOne({
      where: { id: columnId },
      relations: ["board", "cards"],
    });
  }

 //atualizar uma coluna
  async updateColumn(columnId: number, dto: UpdateColumnDTO): Promise<KanbanColumn> {
    const coluna = await this.getColumnById(columnId);
    if (!coluna) {
      throw new Error("Coluna não encontrada");
    }

    // validar nome único se for alterado
    if (dto.nome && dto.nome !== coluna.nome) {
      const existente = await this.columnRepository.findOne({
        where: {
          board: { id: coluna.board.id },
          nome: dto.nome,
        },
      });

      if (existente) {
        throw new Error("Já existe uma coluna com este nome neste board");
      }
    }

    Object.assign(coluna, dto);
    coluna.atualizadoEm = new Date();

    return this.columnRepository.save(coluna);
  }

//deletar uma coluna
  async deleteColumn(columnId: number): Promise<void> {
    const coluna = await this.getColumnById(columnId);
    if (!coluna) {
      throw new Error("Coluna não encontrado");
    }

    // ppcional: remover cards associados ou movê-los para coluna padrão
    await this.columnRepository.delete(columnId);
  }

   // reordenar colunas
  
  async reorderColumns(boardId: number, dto: ReorderColumnsDTO): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < dto.colunaIds.length; i++) {
        const columnId = dto.colunaIds[i];
        await queryRunner.manager.update(
          KanbanColumn,
          columnId,
          {
            ordem: i + 1,
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

//contar colunas de um board
  async countColumnsByBoardId(boardId: number): Promise<number> {
    return this.columnRepository.count({
      where: { board: { id: boardId } },
    });
  }
}
