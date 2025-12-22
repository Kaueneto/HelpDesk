import { AppDataSource } from "../data-source";
import { LogsSistema } from "../entities/LogsSistema";

interface CriarLogParams {
  tipoOperacao: string;
  entidade: string;
  campoAlterado?: string | null;
  valorAnterior?: any;
  valorNovo?: any;
  descricao: string;
  usuarioId?: number | null;
  usuarioNome?: string | null;
  registroId?: number | null;
}

export class LogsSistemaService {
  
  static async criarLog(params: CriarLogParams): Promise<void> {
    try {
      const logsRepository = AppDataSource.getRepository(LogsSistema);
      
      const log = logsRepository.create({
        tipoOperacao: params.tipoOperacao,
        entidade: params.entidade,
        campoAlterado: params.campoAlterado || null,
        valorAnterior: params.valorAnterior ? String(params.valorAnterior) : null,
        valorNovo: params.valorNovo ? String(params.valorNovo) : null,
        descricao: params.descricao,
        usuarioId: params.usuarioId || null,
        usuarioNome: params.usuarioNome || null,
        registroId: params.registroId || null,
      });
      
      await logsRepository.save(log);
    } catch (error) {
      console.error("Erro ao criar log do sistema:", error);
      // Não lança erro para não interromper a operação principal
    }
  }
}
