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
  synchronize: false, 
  logging: true,
  entities: [SituationsUsers, Users, ChamadoHistorico, ChamadoMensagens, Departamentos, TipoPrioridade, Chamados, TopicosAjuda, StatusChamado, Roles, ChamadoAnexos, ParametrosSistema, LogsSistema, Preferences, PrefUsers],
  subscribers: [],
  migrations: [__dirname + "/migration/*.js"],
  
});
//inicializar conexao com bd

AppDataSource.initialize()
  .then(() => {
    console.log("Banco de dados conectado com sucesso!");
  })
  .catch((error) => {
    console.log("erro na conexao com o banco de dados!", error);
  });
