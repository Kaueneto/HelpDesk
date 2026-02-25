import { AppDataSource } from "../data-source";
import { Users } from "../entities/Users";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SecurityUtils } from "../utils/SecurityUtils";

export class AuthService {
  /**
   * relaiza o login do usuário com sistema de tentativas
   * @param email - Email do usuário
   * @param password - Senha do usuário
   * @returns Dados do usuário e token JWT
   */
  async login(email: string, password: string) {
    const userRepository = AppDataSource.getRepository(Users);

    // Buscar usuário pelo email
    const user = await userRepository.findOne({
      where: { email },
      relations: ["situationUser"],
    });

    if (!user) {
      throw new Error("Credenciais inválidas");
    }

    // verificar se o usuário está bloqueado por excesso de tentativas
    if (SecurityUtils.isUserBlocked(user.tentativasLogin)) {
      throw new Error("Conta bloqueada por excesso de tentativas. Entre em contato com o administrador.");
    }

    // Verificar se o usuário está ativo (situação = "ativo")
    if (!user.situationUser || user.situationUser.nomeSituacao.toLowerCase() !== "ativo") {
      throw new Error("Usuário inativo. Entre em contato com o administrador.");
    }

    // Comparar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // incrementar tentativas de login
      user.tentativasLogin = SecurityUtils.incrementLoginAttempts(user.tentativasLogin);
      
      // se atingiu 5 tentativas, inativar o usuário
      if (SecurityUtils.isUserBlocked(user.tentativasLogin)) {
        user.situationUserId = 2; 
        user.dataInativacao = new Date();
        user.motivoInativacao = "Conta bloqueada automaticamente por excesso de tentativas de login";
      }
      
      await userRepository.save(user);
      
      const tentativasRestantes = 5 - user.tentativasLogin;
      if (tentativasRestantes > 0) {
        throw new Error(`Credenciais inválidas. ${tentativasRestantes} tentativa(s) restante(s).`);
      } else {
        throw new Error("Conta bloqueada por excesso de tentativas. Entre em contato com o administrador.");
      }
    }

    // se login for bem-sucedido= zerar tentativas
    user.tentativasLogin = SecurityUtils.resetLoginAttempts();
    await userRepository.save(user);

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        roleId: user.roleId 
      },
      process.env.JWT_SECRET || "secret-key-default",
      { expiresIn: "8h" } // Token expira em 8 horas
    );

    // Retornar dados do usuário (sem a senha) e o token
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      token,
      // dados para localStorage (sem informações sensíveis)
      userInfo: {
        name: user.name,
        email: user.email,
        roleId: user.roleId
      }
    };
  }

  /**
   * valida a  senha forte para novos users ou alteração de senha
   */
  static validatePassword(password: string) {
    return SecurityUtils.validatePassword(password);
  }
}
