import express, { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Users } from "../entities/Users";
import { Chamados } from "../entities/Chamados";
import { PaginationService } from "../services/PaginationService";
import * as yup from "yup";
import { Not } from "typeorm";
const router = express.Router();
import bcrypt from "bcryptjs"
import { verifyToken } from "../Middleware/AuthMiddleware";
import { AuthService } from "../services/AuthService";
import { SecurityUtils } from "../utils/SecurityUtils";
import { supabase, SUPABASE_BUCKET } from "../config/supabase";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
  file?: Express.Multer.File;
}

const sanitizeFilename = (filename: string): string => {
  const withoutControls = filename.replace(/[\x00-\x1F\x7F]/g, "");
  const ascii = withoutControls
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/\s+/g, "_");

  const cleaned = ascii.replace(/[\\/:*?"<>|]/g, "_").trim();
  if (!cleaned) {
    return "avatar";
  }

  if (cleaned.length <= 180) {
    return cleaned;
  }

  const extIndex = cleaned.lastIndexOf(".");
  if (extIndex <= 0) {
    return cleaned.slice(0, 180);
  }

  const ext = cleaned.slice(extIndex);
  const base = cleaned.slice(0, extIndex);
  const maxBaseLength = Math.max(1, 180 - ext.length);
  return `${base.slice(0, maxBaseLength)}${ext}`;
};

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
      query = query.andWhere("user.createdAt <= :dataCadastroFim", { 
        dataCadastroFim: new Date(dataCadastroFim as string)
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

    // gerar signed URLs para avatares
    const usersWithAvatarUrls = await Promise.all(
      users.map(async (user) => {
        if (user.avatar_url) {
          try {
            const { data: signedUrlData } = await supabase.storage
              .from(SUPABASE_BUCKET)
              .createSignedUrl(user.avatar_url, 3600);
            return {
              ...user,
              avatar_url: signedUrlData?.signedUrl || user.avatar_url,
            };
          } catch (error) {
            console.warn(`Erro ao gerar signed URL para avatar do usuário ${user.id}:`, error);
            return user;
          }
        }
        return user;
      })
    );

    res.status(200).json(usersWithAvatarUrls);
  } catch (error) {
    
    res.status(500).json({ mensagem: "Erro ao listar usuários" });
  }
});

// bsucar usuario pelo id 
router.get("/users/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
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
      id_departament: yup
        .string()
        .required("O departamento é obrigatório!"),
    });

    await schema.validate(data, { abortEarly: false });

    // validar força da senha (exceto para senha padrão "padrao")
    if (data.password !== "padrao") {
      const passwordValidation = SecurityUtils.validatePassword(data.password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          mensagem: passwordValidation.errors,
        });
      }
    }

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
      id_departament: data.id_departament,
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
    
    res.status(500).json({ mensagem: "Erro ao alterar situação dos usuários" });
  }
});

// desativar múltiplos usuários com motivo
router.patch("/users/desativar-multiplos", verifyToken, async (req: Request, res: Response) => {
  try {
    const { usuariosIds, situationUserId, motivoInativacao } = req.body;

    if (!usuariosIds || !Array.isArray(usuariosIds) || usuariosIds.length === 0) {
      return res.status(400).json({ mensagem: "IDs de usuários são obrigatórios" });
    }

    if (!situationUserId) {
      return res.status(400).json({ mensagem: "ID da situação é obrigatório" });
    }

    if (!motivoInativacao || !motivoInativacao.trim()) {
      return res.status(400).json({ mensagem: "Motivo da inativação é obrigatório" });
    }

    const userRepository = AppDataSource.getRepository(Users);

    // Desativar usuários: alterar situação, definir data e motivo de inativação
    await userRepository
      .createQueryBuilder()
      .update(Users)
      .set({ 
        situationUserId: situationUserId,
        dataInativacao: new Date(),
        motivoInativacao: motivoInativacao.trim(),
        updatedAt: new Date() 
      })
      .where("id IN (:...ids)", { ids: usuariosIds })
      .execute();

    res.status(200).json({ mensagem: "Usuários desativados com sucesso!" });
  } catch (error) {
  
    res.status(500).json({ mensagem: "Erro ao desativar usuários" });
  }
});

// ativar múltiplos usuários (limpa tentativas, data inativação, motivo e altera situação)
router.patch("/users/ativar-multiplos", verifyToken, async (req: Request, res: Response) => {
  try {
    const { usuariosIds, situationUserId } = req.body;

    if (!usuariosIds || !Array.isArray(usuariosIds) || usuariosIds.length === 0) {
      return res.status(400).json({ mensagem: "IDs de usuários são obrigatórios" });
    }

    if (!situationUserId) {
      return res.status(400).json({ mensagem: "ID da situação é obrigatório" });
    }

    const userRepository = AppDataSource.getRepository(Users);

    // Ativar usuários: limpar tentativas de login, data e motivo de inativação, alterar situação
    await userRepository
      .createQueryBuilder()
      .update(Users)
      .set({ 
        situationUserId: situationUserId, 
        tentativasLogin: 0,
        dataInativacao: null,
        motivoInativacao: null,
        updatedAt: new Date() 
      })
      .where("id IN (:...ids)", { ids: usuariosIds })
      .execute();

    res.status(200).json({ mensagem: "Usuários ativados com sucesso!" });
  } catch (error) {
    
    res.status(500).json({ mensagem: "Erro ao ativar usuários" });
  }
});

// excluir multiplos usuarios
router.delete("/users/excluir-multiplos", verifyToken, async (req: Request, res: Response) => {
  try {
    const { usuariosIds } = req.body;

    if (!usuariosIds || !Array.isArray(usuariosIds) || usuariosIds.length === 0) {
      return res.status(400).json({ mensagem: "IDs de usuários são obrigatórios" });
    }

    const userRepository = AppDataSource.getRepository(Users);

    // buscar usuarios que serão excluidos
    const usuarios = await userRepository
      .createQueryBuilder("user")
      .where("user.id IN (:...ids)", { ids: usuariosIds })
      .getMany();

    if (usuarios.length === 0) {
      return res.status(404).json({ mensagem: "Nenhum usuário encontrado para exclusão" });
    }

    // Verificar e tratar dependências em chamados ANTES da exclusão
    const chamadosRepository = AppDataSource.getRepository(Chamados);
    
    // Verificar quantos chamados são afetados
    const chamadosAfetadosResult = await AppDataSource.query(`
      SELECT COUNT(*) as count 
      FROM chamados 
      WHERE id_user = ANY($1) 
         OR id_user_responsavel = ANY($1) 
         OR id_user_finalizou = ANY($1)
    `, [usuariosIds]);
    
    const chamadosAfetados = parseInt(chamadosAfetadosResult[0].count);

    if (chamadosAfetados > 0) {
      // Limpar referencias dos usuarios nos chamados usando SQL direto
      await AppDataSource.query(`
        UPDATE chamados 
        SET id_user_responsavel = NULL, 
            id_user_finalizou = NULL, 
            updated_at = NOW() 
        WHERE id_user_responsavel = ANY($1) 
           OR id_user_finalizou = ANY($1)
      `, [usuariosIds]);

      // Se o usuário criou chamados, não permitir exclusão (manter histórico)
      const chamadosCriadosResult = await AppDataSource.query(`
        SELECT COUNT(*) as count 
        FROM chamados 
        WHERE id_user = ANY($1)
      `, [usuariosIds]);
      
      const chamadosCriados = parseInt(chamadosCriadosResult[0].count);

      if (chamadosCriados > 0) {
        return res.status(400).json({ 
          mensagem: `Não é possível excluir usuário(s) que criaram chamados. ${chamadosCriados} chamado(s) encontrado(s). Use a função 'Desativar' para preservar o histórico.`
        });
      }
    }

    // excluir os users após limpar dependências  
    await userRepository.remove(usuarios);

    res.status(200).json({ 
      mensagem: `${usuarios.length} usuário(s) excluído(s) com sucesso!${chamadosAfetados > 0 ? ` ${chamadosAfetados} chamado(s) foram atualizados.` : ''}` 
    });
  } catch (error) {
    
    res.status(500).json({ 
      mensagem: "Erro ao excluir usuários",
      erro: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

// usuario autenticado alterar sua propria senha
interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

router.put("/users/alterar-minha-senha", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usuarioId = req.userId;
    const { senhaAtual, novaSenha } = req.body;

    // validação básica
    const schema = yup.object().shape({
      senhaAtual: yup.string().required("A senha atual é obrigatória!"),
      novaSenha: yup.string().required("A nova senha é obrigatória!"),
    });

    await schema.validate({ senhaAtual, novaSenha }, { abortEarly: false });

    // validar senha forte
    const passwordValidation = AuthService.validatePassword(novaSenha);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        mensagem: SecurityUtils.getPasswordErrorMessage(passwordValidation)
      });
    }

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
  
    
    if (error.name === "ValidationError") {
      return res.status(400).json({ mensagem: error.errors[0] });
    }
    
    res.status(500).json({ mensagem: "Erro ao alterar senha" });
  }
});

// usuario autenticado alterar seu proprio nome
router.put("/users/alterar-meu-nome", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usuarioId = req.userId;
    const { nome } = req.body;

    // validacao de nome
    const schema = yup.object().shape({
      nome: yup
        .string()
        .required("O nome é obrigatório!")
        .min(3, "O nome deve conter pelo menos 3 caracteres."),
    });

    await schema.validate({ nome }, { abortEarly: false });

    const userRepository = AppDataSource.getRepository(Users);

    // buscar usuario
    const user = await userRepository.findOne({
      where: { id: usuarioId },
    });

    if (!user) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    // update nome
    user.name = nome;
    user.updatedAt = new Date();
    await userRepository.save(user);

    res.status(200).json({ 
      mensagem: "Nome alterado com sucesso!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    });
  } catch (error: any) {

    
    if (error.name === "ValidationError") {
      return res.status(400).json({ mensagem: error.errors[0] });
    }
    
    res.status(500).json({ mensagem: "Erro ao alterar nome" });
  }
});


// atualizar user 
router.put("/users/:id",  verifyToken,  async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, roleId, situationUserId, id_departament } = req.body;

    const schema = yup.object().shape({
      name: yup
        .string()
        .required("O nome do usuário é obrigatório!")
        .min(3, "O nome do usuário deve conter no mínimo 3 caracteres!"),
      email: yup
        .string()
        .email("Formato de e-mail inválido")
        .required("O e-mail do usuário é obrigatório!"),
      id_departament: yup
        .string()
        .required("O departamento é obrigatório!"),
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
      id_departament,
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

 
    return res.status(500).json({
      mensagem: "Erro ao atualizar usuário",  
    });
  }
});

// upload de avatar
router.post("/users/upload-avatar/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ mensagem: "Nenhum arquivo foi enviado" });
    }

    // validar tipo de arquivo
    const tiposPermitidos = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!tiposPermitidos.includes(file.mimetype)) {
      return res.status(400).json({ mensagem: "Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WebP" });
    }

    // validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ mensagem: "Arquivo muito grande. Máximo 5MB" });
    }

    const userRepository = AppDataSource.getRepository(Users);

    // buscar user 
    const user = await userRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    // se já tem avatar, deletar o antigo
    if (user.avatar_url) {
      try {
        await supabase.storage.from(SUPABASE_BUCKET).remove([user.avatar_url]);
      } catch (deleteError) {
        console.warn("Aviso: não foi possível deletar avatar anterior", deleteError);
      }
    }

    // gerar path único: avatars/{userId}/{timestamp}-{nome}
    const timestamp = Date.now();
    const safeFilename = sanitizeFilename(file.originalname);
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const storagePath = `avatars/${parseInt(id)}/${timestamp}-${randomSuffix}-${safeFilename}`;

    // upload para o Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({
        mensagem: "Erro ao fazer upload do arquivo",
        erro: uploadError.message,
      });
    }

    // att avatar URL no usuário (salva apenas a path, não a URL completa)
    user.avatar_url = storagePath;
    user.updatedAt = new Date();
    await userRepository.save(user);

    // gerar signed URL para retornar (válida por 1 hora)
    const { data: signedUrlData } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(storagePath, 3600);

    res.status(200).json({
      mensagem: "Avatar atualizado com sucesso!",
      avatar_url: storagePath,
      signedUrl: signedUrlData?.signedUrl,
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    res.status(500).json({ mensagem: "Erro ao fazer upload do avatar" });
  }
});

// deletar a foto
router.delete("/users/delete-avatar/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRepository = AppDataSource.getRepository(Users);

    // Buscar user
    const user = await userRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    // se tem avatar, deletar do storage
    if (user.avatar_url) {
      try {
        await supabase.storage.from(SUPABASE_BUCKET).remove([user.avatar_url]);
      } catch (deleteError) {
        console.warn("Aviso: não foi possível deletar arquivo do storage", deleteError);
      }
    }

    // remover avatar_url do banco
    user.avatar_url = null;
    user.updatedAt = new Date();
    await userRepository.save(user);

    res.status(200).json({ mensagem: "Avatar removido com sucesso!" });
  } catch (error) {
    console.error("Erro ao deletar avatar:", error);
    res.status(500).json({ mensagem: "Erro ao remover avatar" });
  }
});

// get avatar signed URL
router.get("/users/:id/avatar-url", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRepository = AppDataSource.getRepository(Users);

    const user = await userRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    if (!user.avatar_url) {
      return res.status(404).json({ mensagem: "Usuário não possui avatar" });
    }

    // gerar signed URL para a path armazenada (válida por 1 hora)
    const { data: signedUrlData } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(user.avatar_url, 3600);

    res.status(200).json({
      avatar_url: user.avatar_url,
      signedUrl: signedUrlData?.signedUrl,
    });
  } catch (error) {
    console.error("Erro ao gerar signed URL:", error);
    res.status(500).json({ mensagem: "Erro ao gerar URL do avatar" });
  }
});

export default router;
