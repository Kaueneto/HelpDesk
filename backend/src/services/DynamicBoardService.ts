import { AppDataSource } from "../data-source";
import { In } from "typeorm";
import { Chamados } from "../entities/Chamados";
import { KanbanBoard, KanbanAgrupamento } from "../entities/KanbanBoard";
import { StatusChamado } from "../entities/StatusChamado";
import { TipoPrioridade } from "../entities/TipoPrioridade";
import { TopicosAjuda } from "../entities/TopicosAjuda";
import { Users } from "../entities/Users";

export interface GroupedTickets {
  [groupKey: string]: Chamados[];
}

export interface ColumnInfo {
  id: string;
  title: string;
  color: string;
  value?: string | number | null;
}

export interface DynamicBoardData {
  columns: ColumnInfo[];
  tickets: GroupedTickets;
}

export class DynamicBoardService {
  private chamadoRepository = AppDataSource.getRepository(Chamados);
  private statusRepository = AppDataSource.getRepository(StatusChamado);
  private prioridadeRepository = AppDataSource.getRepository(TipoPrioridade);
  private topicoRepository = AppDataSource.getRepository(TopicosAjuda);
  private userRepository = AppDataSource.getRepository(Users);

  
   //gerar dados dinamicos de um board sem persistência
   // bsuca chamados do departamento e agrupa conforme o tipo
  async generateBoardData(
    board: KanbanBoard,
    filtros?: {
      usuarioId?: number;
      statusIds?: number[];
      prioridadeIds?: number[];
      search?: string;
    }
  ): Promise<DynamicBoardData> {
    if (board.tipo !== "dinamico" || !board.agrupamento) {
      throw new Error("Board deve ser dinâmico e ter um agrupamento definido");
    }

    // obter chamados do departamento
    let query = this.chamadoRepository
      .createQueryBuilder("c")
      .where("c.departamento.id = :deptId", { deptId: board.departamento.id })
      .leftJoinAndSelect("c.status", "s")
      .leftJoinAndSelect("c.tipoPrioridade", "tp")
      .leftJoinAndSelect("c.topicoAjuda", "ta")
      .leftJoinAndSelect("c.usuario", "u")
      .leftJoinAndSelect("c.userResponsavel", "ur")
      .leftJoinAndSelect("c.departamento", "d");

    // aplicar filtros opcionais
    if (filtros?.search) {
      query.andWhere(
        "c.resumoChamado ILIKE :search OR c.numeroChamado::text ILIKE :search",
        { search: `%${filtros.search}%` }
      );
    }

    if (filtros?.statusIds && filtros.statusIds.length > 0) {
      query.andWhere("c.status.id IN (:...statusIds)", {
        statusIds: filtros.statusIds,
      });
    }

    if (filtros?.prioridadeIds && filtros.prioridadeIds.length > 0) {
      query.andWhere("c.tipoPrioridade.id IN (:...prioridadeIds)", {
        prioridadeIds: filtros.prioridadeIds,
      });
    }

    if (filtros?.usuarioId) {
      query.andWhere(
        "(c.usuario.id = :usuarioId OR c.userResponsavel.id = :usuarioId)",
        { usuarioId: filtros.usuarioId }
      );
    }

    const chamados = await query.getMany();

    // agrupar conforme o tipo
    const { columns, grouped } = await this.groupTickets(
      chamados,
      board.agrupamento
    );

    return {
      columns,
      tickets: grouped,
    };
  }

 
   //agrupar chamados conforme o critério
   
  private async groupTickets(
    chamados: Chamados[],
    agrupamento: KanbanAgrupamento
  ): Promise<{ columns: ColumnInfo[]; grouped: GroupedTickets }> {
    const columns: ColumnInfo[] = [];
    const grouped: GroupedTickets = {};

    switch (agrupamento) {
      case "status":
        return this.groupByStatus(chamados, columns, grouped);

      case "prioridade":
        return this.groupByPrioridade(chamados, columns, grouped);

      case "topico":
        return this.groupByTopico(chamados, columns, grouped);

      case "responsavel":
        return this.groupByResponsavel(chamados, columns, grouped);

      case "departamento":
        return this.groupByDepartamento(chamados, columns, grouped);

      default:
        throw new Error(`Agrupamento inválido: ${agrupamento}`);
    }
  }

 //agrupar por status
  private async groupByStatus(
    chamados: Chamados[],
    columns: ColumnInfo[],
    grouped: GroupedTickets
  ): Promise<{ columns: ColumnInfo[]; grouped: GroupedTickets }> {
    const statusMap = new Map<number, ColumnInfo>();

    // obter todos os status disponíveis
    const allStatus = await this.statusRepository.find();

    allStatus.forEach((status) => {
      statusMap.set(status.id, {
        id: `status-${status.id}`,
        title: status.nome,
        color: this.getStatusColor(status.id),
        value: status.id,
      });

      grouped[`status-${status.id}`] = [];
    });

    // agrupar chamados
    chamados.forEach((chamado) => {
      const key = `status-${chamado.status.id}`;
      if (grouped[key]) {
        grouped[key].push(chamado);
      }
    });

    // ordenar colunas
    columns.push(
      ...Array.from(statusMap.values()).sort((a, b) => {
        const ordem: { [key: string]: number } = {
          "status-1": 1,
          "status-2": 2,
          "status-3": 3,
          "status-4": 4,
          "status-5": 5,
          "status-6": 6,
          "status-7": 7,
        };
        return (ordem[a.id] || 99) - (ordem[b.id] || 99);
      })
    );

    return { columns, grouped };
  }

 //agrupar por prioridade
  private async groupByPrioridade(
    chamados: Chamados[],
    columns: ColumnInfo[],
    grouped: GroupedTickets
  ): Promise<{ columns: ColumnInfo[]; grouped: GroupedTickets }> {
    const prioridadeMap = new Map<number, ColumnInfo>();

    const allPrioridades = await this.prioridadeRepository.find();

    allPrioridades.forEach((pri) => {
      prioridadeMap.set(pri.id, {
        id: `prioridade-${pri.id}`,
        title: pri.nome,
        color: pri.cor || this.getPriorityColor(pri.nome),
        value: pri.id,
      });

      grouped[`prioridade-${pri.id}`] = [];
    });

    chamados.forEach((chamado) => {
      const key = `prioridade-${chamado.tipoPrioridade.id}`;
      if (grouped[key]) {
        grouped[key].push(chamado);
      }
    });

    columns.push(...Array.from(prioridadeMap.values()));

    return { columns, grouped };
  }
//agrupar por topico
  private async groupByTopico(
    chamados: Chamados[],
    columns: ColumnInfo[],
    grouped: GroupedTickets
  ): Promise<{ columns: ColumnInfo[]; grouped: GroupedTickets }> {
    const topicoMap = new Map<number, ColumnInfo>();

    const allTopicos = await this.topicoRepository.find();

    allTopicos.forEach((topico) => {
      topicoMap.set(topico.id, {
        id: `topico-${topico.id}`,
        title: topico.nome,
        color: "#8B5CF6",
        value: topico.id,
      });

      grouped[`topico-${topico.id}`] = [];
    });

    chamados.forEach((chamado) => {
      const key = `topico-${chamado.topicoAjuda.id}`;
      if (grouped[key]) {
        grouped[key].push(chamado);
      }
    });

    columns.push(...Array.from(topicoMap.values()));

    return { columns, grouped };
  }

//agrupar por responsavel
  private async groupByResponsavel(
    chamados: Chamados[],
    columns: ColumnInfo[],
    grouped: GroupedTickets
  ): Promise<{ columns: ColumnInfo[]; grouped: GroupedTickets }> {
    // sem responsavel
    columns.push({
      id: "sem-responsavel",
      title: "Sem responsável",
      color: "#9CA3AF",
      value: null,
    });
    grouped["sem-responsavel"] = [];

    const responsaveisSet = new Set<number>();

    chamados.forEach((chamado) => {
      if (chamado.userResponsavel) {
        responsaveisSet.add(chamado.userResponsavel.id);
      }
    });

    // bsucar usuarios responsaveis
    const responsaveisArray = Array.from(responsaveisSet);
    const responsaveis = responsaveisArray.length > 0 
      ? await this.userRepository.find({
          where: { id: In(responsaveisArray) },
        })
      : [];

    responsaveis.forEach((resp) => {
      columns.push({
        id: `responsavel-${resp.id}`,
        title: resp.name,
        color: "#3B82F6",
        value: resp.id,
      });

      grouped[`responsavel-${resp.id}`] = [];
    });

    // agrupar chamados
    chamados.forEach((chamado) => {
      if (chamado.userResponsavel) {
        const key = `responsavel-${chamado.userResponsavel.id}`;
        if (grouped[key]) {
          grouped[key].push(chamado);
        }
      } else {
        grouped["sem-responsavel"].push(chamado);
      }
    });

    return { columns, grouped };
  }

//agrupar por departamentos
  private async groupByDepartamento(
    chamados: Chamados[],
    columns: ColumnInfo[],
    grouped: GroupedTickets
  ): Promise<{ columns: ColumnInfo[]; grouped: GroupedTickets }> {
    const departamentosSet = new Set<number>();

    chamados.forEach((chamado) => {
      departamentosSet.add(chamado.departamento.id);
    });

    const departamentos = await AppDataSource.getRepository("Departamentos").find({
      where: { id: Array.from(departamentosSet) },
    } as any);

    (departamentos as any).forEach((dept: any) => {
      columns.push({
        id: `departamento-${dept.id}`,
        title: dept.nome || dept.name,
        color: "#10B981",
        value: dept.id,
      });

      grouped[`departamento-${dept.id}`] = [];
    });

    chamados.forEach((chamado) => {
      const key = `departamento-${chamado.departamento.id}`;
      if (grouped[key]) {
        grouped[key].push(chamado);
      }
    });

    return { columns, grouped };
  }

//cores padrao pra statusd
  private getStatusColor(statusId: number): string {
    const colors: { [key: number]: string } = {
      1: "#3B82F6", // ABERTO
      2: "#F59E0B", // EM ATENDIMENTO
      3: "#10B981", // ENCERRADO
      4: "#EF4444", // CANCELADO
      5: "#6366F1", // AGUARDANDO
      6: "#EC4899", // PENDENTE_USUARIO
      7: "#8B5CF6", // PENDENTE
    };
    return colors[statusId] || "#6B7280";
  }
//cores padrao pra prioridades
  private getPriorityColor(priorityName: string): string {
    const normalized = priorityName.toLowerCase();
    const colors: { [key: string]: string } = {
      baixa: "#10B981",
      baixo: "#10B981",
      média: "#F59E0B",
      media: "#F59E0B",
      médio: "#F59E0B",
      medio: "#F59E0B",
      alta: "#EF4444",
      alto: "#EF4444",
      crítica: "#7C3AED",
      critica: "#7C3AED",
      urgente: "#DC2626",
    };
    return colors[normalized] || "#6B7280";
  }
}
