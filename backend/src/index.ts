

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

// registrar rotas
app.use("/", TestConnectionController);
app.use("/", AuthController);
app.use("/", ChamadosController);
app.use("/", SituationsController);
app.use("/", UsersController);
app.use("/", TopicosAjudaController);
app.use("/", TipoPrioridadeController);
app.use("/", DepartamentosController);
app.use(rolesRouter);

// inicializar banco ANTES de subir o servidor
AppDataSource.initialize()
  .then(() => {
    console.log("Banco de dados conectado com sucesso!");

    app.listen(process.env.PORT, () => {
      console.log(
        `Servidor iniciado na porta ${process.env.PORT}: http://localhost:${process.env.PORT}`
      );
    });
  })
  .catch((error) => {
    console.error("Erro na conexão com o banco de dados!", error);
  });
