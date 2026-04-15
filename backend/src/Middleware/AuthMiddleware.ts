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

      // add usuarioAutenticado ao request para uso nos controllers
      (req as any).usuarioAutenticado = {
        id: Number(decoded.id),
        email: decoded.email,
        roleId: decoded.roleId,
        id_departament: decoded.id_departament,
        nome: decoded.nome,
      };

      return next();
    });
  } catch (error) {
    // console.log("Erro na validação:", error);
    return res.status(500).json({ mensagem: "Erro ao validar token" });
  }
};
