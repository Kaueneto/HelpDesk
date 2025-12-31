import { AppDataSource } from "../data-source";
import { Users } from "../entities/Users";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export class AuthService {
  /**
   * Realiza o login do usuário
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

    // Verificar se o usuário está ativo (situação = "ativo")
    if (!user.situationUser || user.situationUser.nomeSituacao.toLowerCase() !== "ativo") {
      throw new Error("Usuário inativo. Entre em contato com o administrador.");
    }

    // Comparar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Credenciais inválidas");
    }

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
      situationUserId: user.situationUserId,
      situationUser: user.situationUser,
      token,
    };
  }
}
