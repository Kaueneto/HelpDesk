import express, { Request, Response } from "express";
//importar o arquivo com as credenciais do banco de dados

//criar aplicacao express
const router = express.Router();

// rota principal da aplicação
router.get("/test-connection", (req: Request, res: Response) => {
  res.status(200).json({ message: "Conexão com API realizada com sucesso" });
});

export default router;
