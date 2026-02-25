import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // obter token do cookie
    const token = req.cookies['auth-token'];

    if (!token) {
      return res.status(401).json({ mensagem: "Token não fornecido" });
    }

    // verif token
    jwt.verify(token, process.env.JWT_SECRET || "secret-key-default", (err: any, decoded: any) => {
      if (err) {
        return res.status(401).json({ mensagem: "Token inválido ou expirado" });
      }

      // add userId ao request para uso nos controllers
      (req as any).userId = Number(decoded.id);
      (req as any).userEmail = decoded.email;
      (req as any).userRoleId = decoded.roleId;

      return next();
    });
  } catch (error) {
    return res.status(500).json({ mensagem: "Erro ao validar token" });
  }
};
