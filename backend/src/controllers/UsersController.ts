import express, { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Users } from "../entities/Users";
import { PaginationService } from "../services/PaginationService";
import * as yup from "yup";
import { Not } from "typeorm";
const router = express.Router();
import bcrypt from "bcryptjs"
import { verifyToken } from "../Middleware/AuthMiddleware";

// listar todos os users
router.get("/users", verifyToken, async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(Users);
    
    const { dataCadastroInicio, dataCadastroFim, nome, email, situationUserId } = req.query;
    
    let query = userRepository.createQueryBuilder("user")
      .leftJoinAndSelect("user.role", "role")
      .leftJoinAndSelect("user.situationUser", "situationUser");
    
    // Filtro por período de cadastro
    if (dataCadastroInicio) {
      query = query.andWhere("user.createdAt >= :dataCadastroInicio", { 
        dataCadastroInicio: new Date(dataCadastroInicio as string) 
      });
    }
    
    if (dataCadastroFim) {
      const dataFim = new Date(dataCadastroFim as string);
      dataFim.setHours(23, 59, 59, 999);
      query = query.andWhere("user.createdAt <= :dataCadastroFim", { 
        dataCadastroFim: dataFim 
      });
    }
    
    // Filtro por nome
    if (nome) {
      query = query.andWhere("LOWER(user.name) LIKE LOWER(:nome)", { 
        nome: `%${nome}%` 
      });
    }
    
    // Filtro por email
    if (email) {
      query = query.andWhere("LOWER(user.email) LIKE LOWER(:email)", { 
        email: `%${email}%` 
      });
    }
    
    // Filtro por situação
    if (situationUserId !== undefined && situationUserId !== '') {
      query = query.andWhere("user.situation_user_id = :situationUserId", { 
        situationUserId: parseInt(situationUserId as string) 
      });
    }
    
    const users = await query
      .orderBy("user.id", "DESC")
      .getMany();
    
    res.status(200).json(users);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({ mensagem: "Erro ao listar usuários" });
  }
});

// bsucar usuario pelo id 
router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRepository = AppDataSource.getRepository(Users);

    const user = await userRepository.findOne({
      where: { id: parseInt(id) },
      relations: ["role", "situationUser"],
    });

    if (!user)
      return res.status(404).json({ mensagem: "Usuário não encontrado" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao buscar usuário" });
  }
});

// criar novo usuario
router.post("/users", async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const schema = yup.object().shape({
      name: yup
        .string()
        .required("O nome do usuário é obrigatório!")
        .min(3, "O nome do usuário deve conter no mínimo 3 caracteres!"),
      email: yup
        .string()
        .email("Formato de e-mail inválido")
        .required("O e-mail do usuário é obrigatório!"),
      password: yup
        .string()
        .required("A senha do usuário é obrigatória!")
        .min(6, "A senha deve conter pelo menos 6 caracteres."),
    });

    await schema.validate(data, { abortEarly: false });

    const userRepository = AppDataSource.getRepository(Users);
    const existingUserName = await userRepository.findOne({
      where: { name: data.name },
    });
 
    // valida duplicidade do email
    const existingUserEmail = await userRepository.findOne({
      where: { email: data.email },
    });
    if (existingUserEmail) {
      return res.status(400).json({
        mensagem: "Este e-mail já está cadastrado para outro usuário. Se você esqueceu sua senha, utilize a opção de recuperação de senha.",
      });
    }

    // criptografar senha antes de salvar
    data.password = await bcrypt.hash(data.password, 10);

    // cria o usuário com situação padrão (1 = ativo)
    const newUser = userRepository.create({
      ...data,
      situationUserId: data.situationUserId || 1, // Padrão: ativo
    });

    await userRepository.save(newUser);

    return res
      .status(201)
      .json({ mensagem: "Usuário criado com sucesso!", user: newUser });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({
        mensagem: error.errors,
      });
    }

    return res.status(500).json({ mensagem: "Erro ao criar usuário" });
  }
});




router.put("/users-password/:id", async (req: Request, res: Response) => {
  
try {
  //obter o id da situacao a partir dos parametros da requisicao
  const { id } = req.params;  
  //receber os dados enviados no corpo da requisicao
  const data = req.body;
  //validar os dados
  
    const schema = yup.object().shape({
      password: yup.string()
      .required("a senha do usuario é obrigatoria!")
      .min(6, "a senha deve conter pelo menos 6 caracteres."),

    });
    //verifica se os dados passaram pela validacao
    await schema.validate(data, { abortEarly: false });
    //obter o repositorio da entidade user
    const userRepository = AppDataSource.getRepository(Users);
    //buscar o usua
    const user = await userRepository.findOneBy({ id: parseInt(id) });
    //verifica se o user foi encontrado
    if (!user) {
      res.status(404).json({
        mensagem: "Usuário não encontrado"
      });
      return;
    }

    //criptografar a senha antes de salvar
    data.password = await bcrypt.hash(data.password, 10);
     //atualizar dados do user
     userRepository.merge( user, data );
     //salvar os dados atualizados no banco
     const updatedUser = await userRepository.save(user);
     //retornar a resposta de sucesso
     res.status(200).json({ mensagem: "Senha do usuário atualizada com sucesso", user: updatedUser });

  } catch (error) {
    if (error instanceof yup.ValidationError) {
      //retornar os erros de validacao
      res.status(400).json({
        mensagem: error.errors,
      });
      return;
    }
    //retornar erro em caso de falha
    res.status(500).json({ mensagem: "Erro ao atualizar a senha do usuário" });

 } 
});




//remover usuario
router.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRepository = AppDataSource.getRepository(Users);

    const user = await userRepository.findOneBy({ id: parseInt(id) });
    if (!user)
      return res.status(404).json({ mensagem: "Usuário não encontrado" });

    await userRepository.remove(user);

    res.status(200).json({ mensagem: "Usuário excluído com sucesso" });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao remover usuário" });
  }
});

// resetar senha de multiplos usuarios
router.patch("/users/resetar-senha-multiplos", verifyToken, async (req: Request, res: Response) => {
  try {
    const { usuariosIds } = req.body;

    if (!usuariosIds || !Array.isArray(usuariosIds) || usuariosIds.length === 0) {
      return res.status(400).json({ mensagem: "IDs de usuários são obrigatórios" });
    }

    const userRepository = AppDataSource.getRepository(Users);
    const senhaHash = await bcrypt.hash("padrao", 10);

    await userRepository
      .createQueryBuilder()
      .update(Users)
      .set({ password: senhaHash, updatedAt: new Date() })
      .where("id IN (:...ids)", { ids: usuariosIds })
      .execute();

    res.status(200).json({ mensagem: "Senhas resetadas com sucesso!" });
  } catch (error) {
    console.error("Erro ao resetar senhas:", error);
    res.status(500).json({ mensagem: "Erro ao resetar senhas" });
  }
});

// alterar situação de usuários em massa
router.patch("/users/alterar-situacao-multiplos", verifyToken, async (req: Request, res: Response) => {
  try {
    const { usuariosIds, situationUserId } = req.body;

    if (!usuariosIds || !Array.isArray(usuariosIds) || usuariosIds.length === 0) {
      return res.status(400).json({ mensagem: "IDs de usuários são obrigatórios" });
    }

    if (!situationUserId) {
      return res.status(400).json({ mensagem: "ID da situação é obrigatório" });
    }

    const userRepository = AppDataSource.getRepository(Users);

    await userRepository
      .createQueryBuilder()
      .update(Users)
      .set({ situationUserId: situationUserId, updatedAt: new Date() })
      .where("id IN (:...ids)", { ids: usuariosIds })
      .execute();

    res.status(200).json({ mensagem: "Situação dos usuários alterada com sucesso!" });
  } catch (error) {
    console.error("Erro ao alterar situação dos usuários:", error);
    res.status(500).json({ mensagem: "Erro ao alterar situação dos usuários" });
  }
});

// usuario autenticado alterar sua propria senha
interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

router.put("/users/alterar-minha-senha", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    console.log("debug: ROTA ALTERAR SENHA EXECUTADA");
  try {
    const usuarioId = req.userId;
    const { senhaAtual, novaSenha } = req.body;

    // validação
    const schema = yup.object().shape({
      senhaAtual: yup.string().required("A senha atual é obrigatória!"),
      novaSenha: yup
        .string()
        .required("A nova senha é obrigatória!")
        .min(6, "A nova senha deve conter pelo menos 6 caracteres."),
    });

    await schema.validate({ senhaAtual, novaSenha }, { abortEarly: false });

    const userRepository = AppDataSource.getRepository(Users);

    // Buscar usuário
    const user = await userRepository.findOne({
      where: { id: usuarioId },
      select: ["id", "email", "password"],
    });

    if (!user) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    // Verificar se a senha atual está correta
    const senhaCorreta = await bcrypt.compare(senhaAtual, user.password);

    if (!senhaCorreta) {
      return res.status(401).json({ mensagem: "Senha atual incorreta" });
    }

    // Criptografar nova senha
    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

    // Atualizar senha
    user.password = novaSenhaHash;
    user.updatedAt = new Date();
    await userRepository.save(user);

    res.status(200).json({ mensagem: "Senha alterada com sucesso!" });
  } catch (error: any) {
    console.error("Erro ao alterar senha:", error);
    
    if (error.name === "ValidationError") {
      return res.status(400).json({ mensagem: error.errors[0] });
    }
    
    res.status(500).json({ mensagem: "Erro ao alterar senha" });
  }
});


// atualizar user 
router.put("/users/:id",  verifyToken,  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, roleId, situationUserId } = req.body;

    const schema = yup.object().shape({
      name: yup
        .string()
        .required("O nome do usuário é obrigatório!")
        .min(3, "O nome do usuário deve conter no mínimo 3 caracteres!"),
      email: yup
        .string()
        .email("Formato de e-mail inválido")
        .required("O e-mail do usuário é obrigatório!"),
    });

    await schema.validate(req.body, { abortEarly: false });

    const userRepository = AppDataSource.getRepository(Users);

    // verificar se o usuario existe
    const user = await userRepository.findOneBy({ id: Number(id) });
    if (!user) {
      return res.status(404).json({
        mensagem: "Usuário não encontrado",
      });
    }


    const emailExistente = await userRepository.findOne({
      where: {
        email,
        id: Not(Number(id)),
      },
    });

    if (emailExistente) {
      return res.status(400).json({
        mensagem: "Já existe outro usuário com este e-mail.",
      });
    }

    // preparar dados para atualização (update parcial)
    const updateData: Partial<Users> = {
      name,
      email,
      updatedAt: new Date(),
    };

    if (roleId !== undefined) updateData.roleId = roleId;
    if (situationUserId !== undefined) updateData.situationUserId = situationUserId;

    // atualizar dados
    userRepository.merge(user, updateData);

    const updatedUser = await userRepository.save(user);

    return res.status(200).json({
      mensagem: "Usuário atualizado com sucesso",
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({
        mensagem: error.errors,
      });
    }

    console.error("Erro ao atualizar usuário:", error);
    return res.status(500).json({
      mensagem: "Erro ao atualizar usuário",  
    });
  }
});
export default router;
