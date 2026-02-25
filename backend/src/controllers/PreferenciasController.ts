import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Preferences } from "../entities/Preferences";
import { PrefUsers} from "../entities/PrefUsers";


const preferencesRouter = Router();

//buscar todas as preferencias
preferencesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const preferencesRepository = AppDataSource.getRepository(Preferences);
    const preferences = await preferencesRepository.find({
      order: { descricao: "ASC" }
    });

    res.json(preferences);
  } catch (error) {
    console.error("Erro ao buscar preferências:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});


//buscar preferencias do usuario logado
preferencesRouter.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const prefUsersRepository = AppDataSource.getRepository(PrefUsers);
    
    const userPreferences = await prefUsersRepository.find({
      where: { user_id: parseInt(userId) },
      relations: ["preferencia"]
    });

    const preferenceIds = userPreferences.map(pref => pref.preferencia_id);
    res.json(preferenceIds);
  } catch (error) {
    console.error("Erro ao buscar preferências do usuário:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

//buscar preferencias do usuario (nova rota para frontend)
preferencesRouter.get("/usuario/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const prefUsersRepository = AppDataSource.getRepository(PrefUsers);
    
    const userPreferences = await prefUsersRepository.find({
      where: { user_id: parseInt(userId) },
      relations: ["preferencia"]
    });

    res.json({ prefUsers: userPreferences });
  } catch (error) {
    console.error("Erro ao buscar preferências do usuário:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});


//add preferencia para usuario 
preferencesRouter.post("/usuario", async (req: Request, res: Response) => {
  try {
    const { usuarioId, preferenciaId } = req.body;
    const prefUsersRepository = AppDataSource.getRepository(PrefUsers);

    // verificar se já existe
    const existingPref = await prefUsersRepository.findOne({
      where: { 
        user_id: parseInt(usuarioId), 
        preferencia_id: parseInt(preferenciaId) 
      }
    });

    if (existingPref) {
      return res.status(409).json({ message: "Preferência já está ativa para este usuário" });
    }

    // criar nova preferencia do usuário
    const newPrefUser = new PrefUsers();
    newPrefUser.user_id = parseInt(usuarioId);
    newPrefUser.preferencia_id = parseInt(preferenciaId);

    await prefUsersRepository.save(newPrefUser);

    res.status(201).json({ message: "Preferência adicionada com sucesso" });
  } catch (error) {
    console.error("Erro ao adicionar preferência:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// remover preferencia do usuaior 
preferencesRouter.delete("/usuario/:userId/:preferenciaId", async (req: Request, res: Response) => {
  try {
    const { userId, preferenciaId } = req.params;
    const prefUsersRepository = AppDataSource.getRepository(PrefUsers);

    // buscar  as preferencias do usuário
    const prefUser = await prefUsersRepository.findOne({
      where: { 
        user_id: parseInt(userId), 
        preferencia_id: parseInt(preferenciaId) 
      }
    });

    if (!prefUser) {
      return res.status(404).json({ message: "Preferência não encontrada para este usuário" });
    }

    await prefUsersRepository.remove(prefUser);

    res.json({ message: "Preferência removida com sucesso" });
  } catch (error) {
    console.error("Erro ao remover preferência:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

//add preferencias pro usuario
preferencesRouter.post("/user/:userId/preference/:preferenceId", async (req: Request, res: Response) => {
  try {
    const { userId, preferenceId } = req.params;
    const prefUsersRepository = AppDataSource.getRepository(PrefUsers);

    // verificar se já existe
    const existingPref = await prefUsersRepository.findOne({
      where: { 
        user_id: parseInt(userId), 
        preferencia_id: parseInt(preferenceId) 
      }
    });

    if (existingPref) {
      return res.status(409).json({ message: "Preferência já está ativa para este usuário" });
    }

    // criar nova preferencia do usuário
    const newPrefUser = new PrefUsers();
    newPrefUser.user_id = parseInt(userId);
    newPrefUser.preferencia_id = parseInt(preferenceId);

    await prefUsersRepository.save(newPrefUser);

    res.status(201).json({ message: "Preferência adicionada com sucesso" });
  } catch (error) {
    console.error("Erro ao adicionar preferência:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// remver preferencia do usuário
preferencesRouter.delete("/user/:userId/preference/:preferenceId", async (req: Request, res: Response) => {
  try {
    const { userId, preferenceId } = req.params;
    const prefUsersRepository = AppDataSource.getRepository(PrefUsers);

    // Buscar a preferencia do usuário
    const prefUser = await prefUsersRepository.findOne({
      where: { 
        user_id: parseInt(userId), 
        preferencia_id: parseInt(preferenceId) 
      }
    });

    if (!prefUser) {
      return res.status(404).json({ message: "Preferência não encontrada para este usuário" });
    }

    await prefUsersRepository.remove(prefUser);

    res.json({ message: "Preferência removida com sucesso" });
  } catch (error) {
    console.error("Erro ao remover preferência:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

export { preferencesRouter };