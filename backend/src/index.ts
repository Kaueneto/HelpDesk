

import "reflect-metadata";

// importar biblioteca express
import express from "express";

// importar variáveis de ambiente
import dotenv from "dotenv";
dotenv.config();

// importar biblioteca para permitir conexão externa
import cors from "cors";

// importar DataSource
import { AppDataSource } from "./data-source";

// criar a aplicação express
const app = express();

// middlewares
app.use(express.json());
app.use(cors());

// importar controllers
import TestConnectionController from "./controllers/TestConnectionController";
import AuthController from "./controllers/AuthController";
import ChamadosController from "./controllers/ChamadosController";
import UsersController from "./controllers/UsersController";
import SituationsController from "./controllers/SituationsUsersController";
import TopicosAjudaController from "./controllers/TopicosAjudaController";
import rolesRouter from "./controllers/RolesController";
import TipoPrioridadeController from "./controllers/TipoPrioridadeController";
import DepartamentosController from "./controllers/DepartamentosController";
import ChamadoAnexosController from "./controllers/ChamadoAnexosController";
import ParametrosSistemaController from "./controllers/ParametrosSistemaController";
import LogsSistemaController from "./controllers/LogsSistemaController";
import { preferencesRouter } from "./controllers/PreferenciasController";

// registrar rotas
app.use("/", TestConnectionController);
app.use("/", AuthController);
app.use("/", ChamadosController);
app.use("/", SituationsController);
app.use("/", UsersController);
app.use("/", TopicosAjudaController);
app.use("/", TipoPrioridadeController);
app.use("/", DepartamentosController);
app.use("/", ChamadoAnexosController);
app.use("/", LogsSistemaController);
app.use("/", ParametrosSistemaController); 
app.use("/preferencias", preferencesRouter);
app.use(rolesRouter);

// inicializar banco ANTES de subir o servidor
AppDataSource.initialize()
  .then(() => {
    console.log("Banco de dados conectado com sucesso!");

    const PORT = Number(process.env.PORT) || 3000;

    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `Servidor iniciado na porta ${PORT}:`
      );
      console.log(`  - Local:   http://localhost:${PORT}`);
      console.log(`  - Network: http://192.168.0.157:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erro na conexão com o banco de dados!", error);
  });
