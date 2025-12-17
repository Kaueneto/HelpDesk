import express, { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import * as yup from "yup";
import nodemailer from "nodemailer";
import { AppDataSource } from "../data-source";
import { Users } from "../entities/Users";
import crypto from "crypto";
import { verifyToken } from "../Middleware/AuthMiddleware";
import bcrypt from "bcryptjs";

const router = express.Router();

// Login de usuário
router.post("/login", async (req: Request, res: Response) => {
  try {
    // Extrair email e senha do corpo da requisição
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        mensagem: "Email e senha são obrigatórios!",
      });
    }

    // criar uma instancia do serviço de autenticacao
    const authService = new AuthService();

    // chamar o metodo login para validar as credenciais e obter os dados do usuário
    const userData = await authService.login(email, password);

    // retornar a resposta de sucesso com os dados do usuario
    return res.status(200).json({
      mensagem: "Login realizado com sucesso!",
      user: userData,
    });
  } catch (error: any) {
    console.error("Erro ao realizar login:", error);
    return res.status(401).json({
      mensagem: error.message || "Erro ao realizar o login",
    });
  }
});

// rota de validação de token
router.get("/validate-token", verifyToken, async (req: Request, res: Response) => {
  return res.status(200).json({
    mensagem: "Token válido OK!",
    userId: (req as any).userId,
    userEmail: (req as any).userEmail,
    userRoleId: (req as any).userRoleId,
  });
});

// solicitar recuperação de senha
router.post("/recoverPassword", async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const schema = yup.object().shape({
      urlRecoverPassword: yup.string().required("A URL é obrigatória!"),
      email: yup
        .string()
        .email("Formato de e-mail inválido")
        .required("O e-mail do usuário é obrigatório!"),
    });

    await schema.validate(data, { abortEarly: false });

    const userRepository = AppDataSource.getRepository(Users);

    const user = await userRepository.findOneBy({
      email: data.email,
    });

    if (!user) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    // gerar token de recuperação
    const recoverToken = crypto.randomBytes(32).toString("hex");
    user.recoverPassword = recoverToken;
    await userRepository.save(user);

    // configurar e-mail
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const messageContent = {
      from: process.env.EMAIL_FROM,
      to: data.email,
      subject: "Recuperação de Senha - HelpDesk",
      text: `Prezado(a) ${user.name},

Informamos que a sua solicitação de alteração de senha foi recebida com sucesso.

Clique ou copie o link para criar uma nova senha em nosso sistema:
${data.urlRecoverPassword}?email=${data.email}&key=${recoverToken}

Esta mensagem foi enviada a você pela empresa ${process.env.APP || "HelpDesk"}.
Você está recebendo porque está cadastrado no banco de dados da empresa ${process.env.APP || "HelpDesk"}.
Nenhum e-mail enviado pela empresa ${process.env.APP || "HelpDesk"} tem arquivos anexados ou solicita
o preenchimento de senhas ou informações cadastrais.
`,
      html: `
        <p>Prezado(a) <strong>${user.name}</strong>,</p>

        <p>Informamos que a sua solicitação de alteração de senha foi recebida com sucesso.</p>

        <p>Clique no link para criar uma nova senha em nosso sistema:</p>
        <p>
          <a href="${data.urlRecoverPassword}?email=${data.email}&key=${recoverToken}">
            ${data.urlRecoverPassword}?email=${data.email}&key=${recoverToken}
          </a>
        </p>

        <br>

        <p>Esta mensagem foi enviada a você pela empresa <strong>${process.env.APP || "HelpDesk"}</strong>.</p>
        <p>
          Você está recebendo porque está cadastrado no banco de dados da empresa <strong>${process.env.APP || "HelpDesk"}</strong>.
          Nenhum e-mail enviado pela empresa <strong>${process.env.APP || "HelpDesk"}</strong> tem arquivos anexados ou solicita
          o preenchimento de senhas e informações cadastrais.
        </p>
      `,
    };

    transporter.sendMail(messageContent, function (err) {
      if (err) {
        console.error("Erro ao enviar email:", err);
        return res.status(500).json({
          mensagem: `E-mail não enviado, tente novamente ou contate ${process.env.EMAIL_ADM || "o administrador"}.`,
        });
      }

      return res.status(200).json({
        mensagem: "E-mail enviado com sucesso! Verifique sua caixa de entrada.",
        urlRecoverPassword: `${data.urlRecoverPassword}?email=${data.email}&key=${recoverToken}`,
      });
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({ mensagem: error.errors });
    }

    console.error("Erro ao recuperar senha:", error);
    return res.status(500).json({ mensagem: "Erro ao processar recuperação de senha" });
  }
});

// validar token de recuperação de senha
router.post("/validate-recover-password", async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const schema = yup.object().shape({
      recoverPassword: yup.string().required("A chave é obrigatória!"),
      email: yup
        .string()
        .email("Formato de e-mail inválido")
        .required("O e-mail do usuário é obrigatório!"),
    });

    await schema.validate(data, { abortEarly: false });

    const userRepository = AppDataSource.getRepository(Users);

    const user = await userRepository.findOneBy({
      email: data.email,
      recoverPassword: data.recoverPassword,
    });

    if (!user) {
      return res.status(404).json({ mensagem: "a chave de recuperação é inválida" });
    }

    return res.status(200).json({
      mensagem: "a chave para recuperar senha é válida!",
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({ mensagem: error.errors });
    }

    console.error("Erro ao validar chave:", error);
    return res.status(500).json({ mensagem: "Erro interno ao validar a chave" });
  }
});

// atualizar senha com token de recuperação
router.put("/update-password", async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const schema = yup.object().shape({
      recoverPassword: yup.string().required("A chave é obrigatória!"),
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

    const user = await userRepository.findOneBy({
      email: data.email,
      recoverPassword: data.recoverPassword,
    });

    if (!user) {
      return res.status(404).json({ mensagem: "A chave de recuperação é inválida" });
    }

    // criptografar nova senha
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // atualizar senha e limpar token de recuperação
    user.password = hashedPassword;
    user.recoverPassword = null;

    await userRepository.save(user);

    return res.status(200).json({
      mensagem: "Senha atualizada com sucesso!",
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({ mensagem: error.errors });
    }

    console.error("Erro ao atualizar senha:", error);
    return res.status(500).json({ mensagem: "Erro interno ao atualizar senha" });
  }
});

export default router;
