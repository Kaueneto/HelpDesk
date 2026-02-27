

import "reflect-metadata";

// importar biblioteca express
import express from "express";

// importar variáveis de ambiente
import dotenv from "dotenv";
dotenv.config();

// importar biblioteca para permitir conexão externa
import cors from "cors";

// importar cookie-parser
import cookieParser from "cookie-parser";

// importar DataSource
import { AppDataSource } from "./data-source";

// criar a aplicação express
const app = express();

// middlewares
app.use(express.json());
app.use(cors({
  origin: function (origin, callback) {
   
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      process.env.SURL
    ];
    
    // permitir requisições sem origem (ex: Postman, aplicações mobile)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // PRODUÇÃO: permtir  qualquer origem da rede interna e localhost
    if (origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        origin.includes('192.168.') || 
        origin.includes('10.') ||
        origin.includes('172.16.') || 
        origin.includes('172.17.') || 
        origin.includes('172.18.') || 
        origin.includes('172.19.') || 
        origin.includes('172.2') || 
        origin.includes('172.3') ||
        origin.match(/^http:\/\/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}:[0-9]+$/)) {
      return callback(null, true);
    }
    
    const msg = 'A política de CORS desta aplicação não permite acesso da origem ' + origin;
    return callback(new Error(msg), false);
  },
  credentials: true // permite cookies
}));
app.use(cookieParser()); // sporte a cookies

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
import ChamadosMensagensController from "./controllers/ChamadosMensagensController";
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
app.use("/", ChamadosMensagensController);
app.use("/", LogsSistemaController);
app.use("/", ParametrosSistemaController); 
app.use("/preferencias", preferencesRouter);
app.use(rolesRouter);

// inicializar banco ANTES de subir o servidor
AppDataSource.initialize()
  .then(() => {
    console.log("Banco de dados conectado com sucesso!");

    // Usar porta configurada no .env
    const PORT = Number(process.env.PORT) || 3000;

    app.listen(PORT, '0.0.0.0', () => {
      console.log(' Servidor backend iniciado com sucesso!');
      console.log(` Porta: ${PORT}`);
      console.log(` Acesso local:     http://localhost:${PORT}`);
      console.log(` Acesso na rede:   http://{IP-DO-SERVIDOR}:${PORT}`);
      console.log(` este conexão:    http://localhost:${PORT}/test-connection`);
      console.log('═'.repeat(60));
    });
  })
  .catch((error) => {
    console.error("Erro na conexão com o banco de dados!", error);
  });
