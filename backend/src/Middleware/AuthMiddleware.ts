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

      // add propriedades individuais para compatibilidade com controllers
      (req as any).userId = Number(decoded.id);
      (req as any).userEmail = decoded.email;
      (req as any).userRoleId = decoded.roleId;

      return next();
    });
  } catch (error) {
    // console.log("Erro na validação:", error);
    return res.status(500).json({ mensagem: "Erro ao validar token" });
  }
};

/**
 * Middleware exclusivo para rotas de compras.
 * Permite acesso para: Administrador (1), Usuário Pro (3) e princpalmente compras (4).
 */
export const verifyComprasAccess = (req: Request, res: Response, next: NextFunction) => {
  // primeiro valida o token normalmente
  verifyToken(req, res, () => {
    const roleId = (req as any).userRoleId;
    const ALLOWED_ROLES = [1, 3, 4];

    if (!ALLOWED_ROLES.includes(roleId)) {
      return res.status(403).json({
        mensagem: "Acesso negado. Seu perfil não tem permissão para acessar o módulo de compras.",
      });
    }

    return next();
  });
};
