import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // console.log("VALIDATE TOKEN:");
    // console.log("Cookies:", req.cookies);
    // console.log("All headers:", Object.keys(req.headers));
    // console.log("cookie header:", req.headers.cookie);
    
    // obter token do cookie
    const token = req.cookies['auth-token'];
    
    console.log("Token encontrado:", token ? `${token.substring(0, 20)}...` : "NENHUM");

    if (!token) {
      console.log("Token ausente");
      return res.status(401).json({ mensagem: "Token não fornecido" });
    }

    // verif token
    jwt.verify(token, process.env.JWT_SECRET || "secret-key-default", (err: any, decoded: any) => {
      if (err) {
        console.log("Token inválido:", err.message);
        return res.status(401).json({ mensagem: "Token inválido ou expirado" });
      }

      console.log("Token válido para usuário:", decoded.email);
      // add userId ao request para uso nos controllers
      (req as any).userId = Number(decoded.id);
      (req as any).userEmail = decoded.email;
      (req as any).userRoleId = decoded.roleId;

      return next();
    });
  } catch (error) {
    console.log("Erro na validação:", error);
    return res.status(500).json({ mensagem: "Erro ao validar token" });
  }
};
