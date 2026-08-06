import "reflect-metadata";
import { DataSource } from "typeorm";
const dialect = process.env.DB_DIALECT ?? "mysql";

import { SituationsUsers } from "./entities/SituationsUsers";
import { Users } from "./entities/Users";


//importar variavies de ambiente
import dotenv from "dotenv";
import { ChamadoHistorico } from "./entities/ChamadoHistorico";
import { ChamadoMensagens } from "./entities/ChamadoMensagens";
import { Departamentos } from "./entities/Departamentos";
import { TipoPrioridade } from "./entities/TipoPrioridade";
import { Chamados } from "./entities/Chamados";
import { TopicosAjuda } from "./entities/TopicosAjuda";
import { StatusChamado } from "./entities/StatusChamado";
import { Roles } from "./entities/Roles";
import { ChamadoAnexos } from "./entities/ChamadoAnexos";
import { ParametrosSistema } from "./entities/ParametrosSistema";
import { LogsSistema } from "./entities/LogsSistema";
import { Preferences } from "./entities/Preferences";
import { PrefUsers } from "./entities/PrefUsers";
import { KanbanPositions } from "./entities/KanbanPositions";
import { Sugestoes } from "./entities/Sugestoes";
import { SugestoesVotos } from "./entities/SugestoesVotos";
import { SugestoesInteracoes } from "./entities/SugestoesInteracoes";
import { KanbanBoard } from "./entities/KanbanBoard";
import { KanbanColumn } from "./entities/KanbanColumn";
import { KanbanCard } from "./entities/KanbanCard";
import { Cotacoes } from "./entities/Cotacoes";
import { CotacaoItens } from "./entities/CotacaoItens";
import { CotacaoItemOpcoes } from "./entities/CotacaoItemOpcoes";
import { CotacaoItemOpcaoClassificacoes } from "./entities/CotacaoItemOpcaoClassificacoes";
//carregar as variaveis  do arquivo .env


// carrega o .env do projeto
dotenv.config();

export const AppDataSource = new DataSource({
  type: process.env.DB_DIALECT as any || "postgres",
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  extra: {
    // pool de conexões — evita abrir nova conexão a cada requisição
    max: 5,
    min: 1,
    acquire: 30000,
    idle: 10000,
  },
  synchronize: false,
  logging: false,
  entities: [SituationsUsers, Users, ChamadoHistorico, ChamadoMensagens, Departamentos, TipoPrioridade, Chamados, TopicosAjuda, StatusChamado, Roles, ChamadoAnexos, ParametrosSistema, LogsSistema, Preferences, PrefUsers, KanbanPositions, Sugestoes, SugestoesVotos, SugestoesInteracoes, KanbanBoard, KanbanColumn, KanbanCard, Cotacoes, CotacaoItens, CotacaoItemOpcoes, CotacaoItemOpcaoClassificacoes],
  subscribers: [],
  migrations: [__dirname + "/migrations/*.js"],
});
//inicializar conexao com bd

// A inicialização é feita somente no index.ts
// AppDataSource.initialize() não deve ser chamado aqui
