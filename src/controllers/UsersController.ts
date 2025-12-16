import express, { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Users } from "../entities/Users";
import { PaginationService } from "../services/PaginationService";
import * as yup from "yup";
import { Not } from "typeorm";
const router = express.Router();
import bcrypt from "bcryptjs"

// Listar todos os usuários
router.get("/users", /*verifyToken*/ async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(Users);
    
    // Teste simples sem paginação
    const users = await userRepository.find();
    
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao listar usuários" });
  }
});

// Buscar usuário pelo ID
router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRepository = AppDataSource.getRepository(Users);

    const user = await userRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user)
      return res.status(404).json({ mensagem: "Usuário não encontrado" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao buscar usuário" });
  }
});

// Criar novo usuário
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
    if (existingUserName) {
      return res.status(400).json({
        mensagem: "Um usuário com esse nome já existe.",
      });
    }

    // valida duplicidade do email
    const existingUserEmail = await userRepository.findOne({
      where: { email: data.email },
    });
    if (existingUserEmail) {
      return res.status(400).json({
        mensagem: "Este e-mail já está cadastrado para outro usuário.",
      });
    }

    // criptografar senha antes de salvar
    //data.password = await bcrypt.hash(data.password, 10);

    // cria o usuário
    const newUser = userRepository.create({
      ...data,
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


// Atualizar usuário
router.put("/users/:id",/*verifyToken*/ async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    const schema = yup.object().shape({
      name: yup.string().required("o nome do usuario é obrigatório!").min(3, "o nome do usuario deve conter no minimo 3 caracteres!"),
      email: yup.string().email("formato de email inválido").required("o email do usuario é obrigatório!"),
      password: yup.string().required("a senha do usuario é obrigatoria!").min(6, "a senha deve conter pelo menos 6 caracteres."),
    });

    await schema.validate(req.body, { abortEarly: false });

    const userRepository = AppDataSource.getRepository(Users);

    const user = await userRepository.findOneBy({ id: parseInt(id) });
    if (!user)
      return res.status(404).json({ mensagem: "Usuário não encontrado" });

   //valida duplicidade do nome
    const existingUserName = await userRepository.findOne({
      where: { name: req.body.name },
    });
    if (existingUserName) {
      res.status(400).json({
        mensagem: "um usuario com esse nome ja existe.",
      });
      return;
    }

    //valida duplicidade do email
    const existingUserEmail = await userRepository.findOne({
      where: { email: req.body.email },
    });
    if (existingUserEmail) {
      res.status(400).json({
        mensagem: "este email ja esta cadastrado para outro usuario.",
      });
      return;
    }

    if (name) user.name = name;
    if (email) user.email = email;

    const updatedUser = await userRepository.save(user);

    res.status(200).json({ mensagem: "Usuário atualizado", user: updatedUser });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({
        mensagem: error.errors,
      });
      return;
    }
    res.status(500).json({ mensagem: "Erro ao atualizar usuário" });
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
    // data.password = await bcrypt.hash(data.password, 10);
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




// Remover usuário
router.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRepository = AppDataSource.getRepository(Users);

    const user = await userRepository.findOneBy({ id: parseInt(id) });
    if (!user)
      return res.status(404).json({ mensagem: "Usuário não encontrado" });

    await userRepository.remove(user);

    res.status(200).json({ mensagem: "Usuário removido com sucesso" });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao remover usuário" });
  }
});

export default router;
