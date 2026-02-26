import express, { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import * as yup from "yup";
import nodemailer from "nodemailer";
import { AppDataSource } from "../data-source";
import { Users } from "../entities/Users";
import crypto from "crypto";
import { verifyToken } from "../Middleware/AuthMiddleware";
import bcrypt from "bcryptjs";
import { SecurityUtils } from "../utils/SecurityUtils";

const router = express.Router();

// Login de usuário com sistema de segurança
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

    // Configurar cookie seguro com o token
    res.cookie('auth-token', userData.token, {
      httpOnly: true, // Não acessível via JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS em produção
      sameSite: 'lax', // Proteção CSRF
      maxAge: 8 * 60 * 60 * 1000, // 8 horas em milissegundos
      path: '/'
    });

    // retornar a resposta de sucesso com apenas os dados básicos do usuário
    return res.status(200).json({
      mensagem: "Login realizado com sucesso!",
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        roleId: userData.roleId
      },
    });
  } catch (error: any) {
    console.error("Erro ao realizar login:", error);
    return res.status(401).json({
      mensagem: error.message || "Erro ao realizar o login",
    });
  }
});

// Logout - limpar cookie
router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie('auth-token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  
  return res.status(200).json({
    mensagem: "Logout realizado com sucesso!"
  });
});

// rota de validação de token com cookies
router.get("/validate-token", verifyToken, async (req: Request, res: Response) => {
  return res.status(200).json({
    mensagem: "Token válido OK!",
    userId: (req as any).userId,
    userEmail: (req as any).userEmail,
    userRoleId: (req as any).userRoleId,
  });
});

// Rota para validar senha forte
router.post("/validate-password", async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        mensagem: "Senha é obrigatória para validação"
      });
    }

    const validation = AuthService.validatePassword(password);

    return res.status(200).json({
      isValid: validation.isValid,
      errors: validation.errors,
      mensagem: validation.isValid ? "Senha válida" : SecurityUtils.getPasswordErrorMessage(validation)
    });
  } catch (error) {
    console.error("Erro ao validar senha:", error);
    return res.status(500).json({
      mensagem: "Erro interno ao validar senha"
    });
  }
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


Você está recebendo esse e-mail porque está cadastrado no nosso banco de dados
Nenhum e-mail enviado por nós tem arquivos anexados ou solicita
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

 
         <p style="color: #001531 ; text-align: left; margin: 0;">
          Você está recebendo esse e-mail porque está cadastrado no nosso banco de dados
          Nenhum e-mail enviado por nós tem arquivos anexados ou solicita
          o preenchimento de senhas ou informações cadastrais.
        </p>
          <p style="font-size: 14px; color: #888; text-align: left; margin: 0;">
              Este é um email automático, não responda.
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
        .min(8, "A senha deve conter pelo menos 8 caracteres."),
    });

    await schema.validate(data, { abortEarly: false });

    // Validar senha forte
    const passwordValidation = AuthService.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        mensagem: SecurityUtils.getPasswordErrorMessage(passwordValidation)
      });
    }

    const userRepository = AppDataSource.getRepository(Users);

    const user = await userRepository.findOneBy({
      email: data.email,
      recoverPassword: data.recoverPassword,
    });

    console.log('Usuário encontrado:', user ? 'SIM' : 'NÃO');

    if (!user) {
      console.log('ERRO: Token não corresponde ao usuário');
      return res.status(404).json({ mensagem: "A chave de recuperação é inválida" });
    }

    console.log('Senha antiga (hash):', user.password);

    // criptografar nova senha
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    console.log('Nova senha (hash):', hashedPassword);

    // atualizar senha, limpar token de recuperação e zerar tentativas
    user.password = hashedPassword;
    user.recoverPassword = null;
    user.tentativasLogin = SecurityUtils.resetLoginAttempts();

    await userRepository.save(user);
    
    console.log('Senha atualizada com sucesso no banco!');

    return res.status(200).json({
      mensagem: "Senha atualizada com sucesso!",
    });
  } catch (error) {
    console.error('ERRO no update-password:', error);
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({ mensagem: error.errors });
    }

    console.error("Erro ao atualizar senha:", error);
    return res.status(500).json({ mensagem: "Erro interno ao atualizar senha" });
  }
});

export default router;
