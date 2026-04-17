import { AppDataSource } from "../data-source";
import { KanbanBoard, KanbanBoardType, KanbanAgrupamento } from "../entities/KanbanBoard";
import { KanbanColumn } from "../entities/KanbanColumn";
import { Departamentos } from "../entities/Departamentos";
import { Users } from "../entities/Users";

interface CreateBoardDTO {
  nome: string;
  descricao?: string;
  idDepartamento: number;
  tipo: KanbanBoardType;
  agrupamento?: KanbanAgrupamento;
  criadoPorId: number;
}

interface UpdateBoardDTO {
  nome?: string;
  descricao?: string;
  ativo?: boolean;
  agrupamento?: KanbanAgrupamento;
}

export class BoardService {
  private boardRepository = AppDataSource.getRepository(KanbanBoard);
  private departamentoRepository = AppDataSource.getRepository(Departamentos);
  private userRepository = AppDataSource.getRepository(Users);

  //criar um novo quadro kanban
  async createBoard(dto: CreateBoardDTO): Promise<KanbanBoard> {
    // validare departamento
    const departamento = await this.departamentoRepository.findOne({
      where: { id: dto.idDepartamento },
    });
    if (!departamento) {
      throw new Error("Departamento não encontrado");
    }

    // validar usuario
    const usuario = await this.userRepository.findOne({
      where: { id: dto.criadoPorId },
    });
    if (!usuario) {
      throw new Error("Usuário não encontrado");
    }

    // validar agrupamento para board dinâmico
    if (dto.tipo === "dinamico" && !dto.agrupamento) {
      throw new Error("Board dinâmico deve ter um agrupamento definido");
    }

    // validar que não existe board dinâmico com mesmo agrupamento no departamento
    if (dto.tipo === "dinamico") {
      const existente = await this.boardRepository.findOne({
        where: {
          departamento: { id: dto.idDepartamento },
          tipo: "dinamico",
          agrupamento: dto.agrupamento as any,
        },
      });

      if (existente) {
        throw new Error(
          `Já existe um board dinâmico por "${dto.agrupamento}" neste departamento`
        );
      }
    }

    const novoBoard = this.boardRepository.create({
      nome: dto.nome,
      descricao: dto.descricao || null,
      departamento,
      tipo: dto.tipo,
      agrupamento: dto.agrupamento || null,
      criadoPor: usuario,
      ativo: true,
    });

    return this.boardRepository.save(novoBoard);
  }

  //listar boards por departamento
  async listByDepartamento(
    idDepartamento: number,
    onlyAtivos: boolean = true
  ): Promise<KanbanBoard[]> {
    const query = this.boardRepository
      .createQueryBuilder("b")
      .where("b.departamento.id = :deptId", { deptId: idDepartamento })
      .leftJoinAndSelect("b.colunas", "c")
      .leftJoinAndSelect("b.criadoPor", "u");

    if (onlyAtivos) {
      query.andWhere("b.ativo = :ativo", { ativo: true });
    }

    query.orderBy("b.atualizadoEm", "DESC");

    return query.getMany();
  }


 //Obter um board por ID

    async getBoardById(boardId: number): Promise<KanbanBoard | null> {
     return this.boardRepository.findOne({
      where: { id: boardId },
      relations: ["departamento", "criadoPor", "colunas"],
        });
    }

 //atualizar um board
  async updateBoard(boardId: number, dto: UpdateBoardDTO): Promise<KanbanBoard> {
    const board = await this.getBoardById(boardId);
    if (!board) {
      throw new Error("Board não encontrado");
    }

    Object.assign(board, dto);
    board.atualizadoEm = new Date();

    return this.boardRepository.save(board);
  }

 //deletar um board
  async deleteBoard(boardId: number): Promise<void> {
    const resultado = await this.boardRepository.delete(boardId);
    if (resultado.affected === 0) {
      throw new Error("Board não encontrado");
    }
  }

    //Ativar/Desativar um board
  
  async toggleBoardStatus(boardId: number): Promise<KanbanBoard> {
    const board = await this.getBoardById(boardId);
    if (!board) {
      throw new Error("Board não encontrado");
    }

    board.ativo = !board.ativo;
    board.atualizadoEm = new Date();

    return this.boardRepository.save(board);
  }

//listar boards dinamidos disponiveis
   async listDynamicBoards(idDepartamento: number): Promise<KanbanBoard[]> {
      return this.boardRepository.find({
        where: {
            departamento: { id: idDepartamento },
            tipo: "dinamico",
            ativo: true,
        },
        relations: ["criadoPor"],
        });
    }


   // Listar boards customizados disponíveis
   
  async listCustomBoards(idDepartamento: number): Promise<KanbanBoard[]> {
    return this.boardRepository.find({
      where: {
        departamento: { id: idDepartamento },
        tipo: "custom",
        ativo: true,
      },
      relations: ["colunas", "criadoPor"],
      order: {
        atualizadoEm: "DESC",
      },
    });
  }

  //obter board por tipo e agrupamento (útil para dinâmicos)
  async getBoardByTypeAndAgrupamento(
    idDepartamento: number,
    tipo: KanbanBoardType,
    agrupamento?: KanbanAgrupamento
  ): Promise<KanbanBoard | null> {
    const query = this.boardRepository
      .createQueryBuilder("b")
      .where("b.departamento.id = :deptId", { deptId: idDepartamento })
      .andWhere("b.tipo = :tipo", { tipo })
      .andWhere("b.ativo = :ativo", { ativo: true });

    if (agrupamento) {
      query.andWhere("b.agrupamento = :agrupamento", { agrupamento });
    }

    return query.getOne();
  }
}
