import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // obter token do header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ mensagem: "Token não fornecido" });
    }

    // formato esperado: "Bearer TOKEN"
    const parts = authHeader.split(" ");

    if (parts.length !== 2) {
      return res.status(401).json({ mensagem: "Formato de token inválido" });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({ mensagem: "Token mal formatado" });
    }

    // verif token
    jwt.verify(token, process.env.JWT_SECRET || "secret-key-default", (err, decoded: any) => {
      if (err) {
        return res.status(401).json({ mensagem: "Token inválido ou expirado" });
      }

      // add userId ao request para uso nos controllers
      (req as any).userId = decoded.userId;
      (req as any).userEmail = decoded.email;
      (req as any).userRoleId = decoded.roleId;

      return next();
    });
  } catch (error) {
    return res.status(500).json({ mensagem: "Erro ao validar token" });
  }
};
