import { AppDataSource } from '../data-source';
import { Sugestoes } from '../entities/Sugestoes';
import { SugestoesVotos } from '../entities/SugestoesVotos';
import { SugestoesInteracoes } from '../entities/SugestoesInteracoes';
import { Users } from '../entities/Users';

export class SugestoesService {
  private sugestoesRepository = AppDataSource.getRepository(Sugestoes);
  private votosRepository = AppDataSource.getRepository(SugestoesVotos);
  private interacoesRepository = AppDataSource.getRepository(SugestoesInteracoes);
  private usersRepository = AppDataSource.getRepository(Users);

  // criar nova sugestão
  async criarSugestao(dados: {
    titulo: string;
    descricao: string;
    usuarioCriacaoId: number;
    departamentoId: number | null;
    escopo: 'departamento' | 'global';
    privado: boolean;
  }) {
    const sugestao = this.sugestoesRepository.create({
      ...dados,
      status: 'aberta',
    });

    return await this.sugestoesRepository.save(sugestao);
  }

  // listar sugestões com filtros
  async listarSugestoes(usuarioId: number, isAdmin: boolean, filtros?: {
    status?: string;
    departamentoId?: number;
    ordenarPor?: 'votos' | 'recente' | 'antigo';
  }) {
    try {
      // Buscar usuário para pegar departamento
      const usuario = await this.usersRepository.findOne({
        where: { id: usuarioId },
        select: ['id', 'id_departament'],
      });

      if (!usuario) {
        throw new Error('Usuário não encontrado');
      }

      // construir query simplificada
      let query = this.sugestoesRepository.createQueryBuilder('s')
        .leftJoinAndSelect('s.usuarioCriacao', 'usuarioCriacao')
        .leftJoinAndSelect('s.departamento', 'departamento')
        .leftJoinAndSelect('s.votos', 'votos')
        .leftJoinAndSelect('votos.usuario', 'usuarioVoto')
        .leftJoinAndSelect('s.interacoes', 'interacoes')
        .leftJoinAndSelect('interacoes.usuario', 'usuarioInteracao');

      // logica de visibilidade
      if (isAdmin) {
        // adm ve tudo (sem filtros específicos)
      } else {
        // user comum ve:
        // 1. Sugestões públicas (seu depto ou global)
        // 2. Suas próprias sugestões privadas
        query.where(
          '(s.privado = false AND (s.escopo = :escopoGlobal OR (s.escopo = :escopoDept AND s.departamento_id = :deptId))) OR (s.privado = true AND s.usuario_criacao_id = :usuarioId)',
          {
            escopoGlobal: 'global',
            escopoDept: 'departamento',
            deptId: usuario.id_departament,
            usuarioId,
          }
        );
      }

      // Aplicar filtros adicionais
      if (filtros?.status) {
        query.andWhere('s.status = :status', { status: filtros.status });
      }

      if (filtros?.departamentoId && isAdmin) {
        query.andWhere('s.departamento_id = :filtroDepId', { filtroDepId: filtros.departamentoId });
      }

      // Ordenação - fazer em memória para votos
      let resultados = await query.getMany();

      if (filtros?.ordenarPor === 'votos') {
        resultados.sort((a, b) => (b.votos?.length || 0) - (a.votos?.length || 0));
      } else if (filtros?.ordenarPor === 'recente') {
        resultados.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
      } else {
        resultados.sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime());
      }

      return resultados;
    } catch (error: any) {
      console.error('Erro ao listar sugestões:', error);
      throw error;
    }
  }

  // Obter detalhes de uma sugestão
  async obterDetalhes(sugestaoId: number, usuarioId: number, isAdmin: boolean) {
    const sugestao = await this.sugestoesRepository.findOne({
      where: { id: sugestaoId },
      relations: ['usuarioCriacao', 'departamento', 'votos', 'votos.usuario', 'interacoes', 'interacoes.usuario'],
    });

    if (!sugestao) {
      throw new Error('Sugestão não encontrada');
    }

    // Verificar acesso
    const usuario = await this.usersRepository.findOne({
      where: { id: usuarioId },
      select: ['id', 'id_departament'],
    });

    const temAcesso = this.verificarAcesso(sugestao, usuarioId, isAdmin, usuario?.id_departament);

    if (!temAcesso) {
      throw new Error('Sem permissão para visualizar esta sugestão');
    }

    return sugestao;
  }

  // Votar em uma sugestão
  async votarEmSugestao(sugestaoId: number, usuarioId: number) {
    const sugestao = await this.sugestoesRepository.findOne({ where: { id: sugestaoId } });

    if (!sugestao) {
      throw new Error('Sugestão não encontrada');
    }

    if (sugestao.privado) {
      throw new Error('Não é possível votar em sugestões privadas');
    }

    // Verificar se já votou
    const votoExistente = await this.votosRepository.findOne({
      where: { sugestaoId, usuarioId },
    });

    if (votoExistente) {
      // Remover voto
      await this.votosRepository.remove(votoExistente);
      return { acao: 'removido' };
    }

    // Adicionar voto
    const novoVoto = this.votosRepository.create({
      sugestaoId,
      usuarioId,
    });

    await this.votosRepository.save(novoVoto);
    return { acao: 'adicionado' };
  }

  // Adicionar comentário
  async adicionarComentario(sugestaoId: number, usuarioId: number, mensagem: string) {
    const sugestao = await this.sugestoesRepository.findOne({ where: { id: sugestaoId } });

    if (!sugestao) {
      throw new Error('Sugestão não encontrada');
    }

    const usuario = await this.usersRepository.findOne({ where: { id: usuarioId } });
    const isAdmin = usuario?.roleId === 1;

    const interacao = this.interacoesRepository.create({
      sugestaoId,
      usuarioId,
      mensagem,
      tipo: isAdmin ? 'resposta_admin' : 'comentario',
    });

    return await this.interacoesRepository.save(interacao);
  }

  // Alterar status (apenas admin)
  async alterarStatus(
    sugestaoId: number,
    novoStatus: string,
    usuarioId: number,
    motivo?: string
  ) {
    const sugestao = await this.sugestoesRepository.findOne({ where: { id: sugestaoId } });

    if (!sugestao) {
      throw new Error('Sugestão não encontrada');
    }

    const statusAnterior = sugestao.status;

    // Atualizar status
    sugestao.status = novoStatus as any;
    await this.sugestoesRepository.save(sugestao);

    // Registrar mudança como interação
    const mensagem = motivo || `Status alterado de "${statusAnterior}" para "${novoStatus}"`;

    const interacao = this.interacoesRepository.create({
      sugestaoId,
      usuarioId,
      mensagem,
      tipo: 'mudanca_status',
      status_anterior: statusAnterior,
      status_novo: novoStatus,
    });

    await this.interacoesRepository.save(interacao);

    return sugestao;
  }

  // Promover escopo (apenas admin)
  async promoverParaGlobal(sugestaoId: number) {
    const sugestao = await this.sugestoesRepository.findOne({ where: { id: sugestaoId } });

    if (!sugestao) {
      throw new Error('Sugestão não encontrada');
    }

    sugestao.escopo = 'global';
    return await this.sugestoesRepository.save(sugestao);
  }

  // Verificar acesso à sugestão
  private verificarAcesso(
    sugestao: Sugestoes,
    usuarioId: number,
    isAdmin: boolean,
    departamentoId?: string | number | null
  ): boolean {
    // Admin tem acesso a tudo
    if (isAdmin) return true;

    // Sugestão privada
    if (sugestao.privado) {
      return sugestao.usuarioCriacaoId === usuarioId;
    }

    // Sugestão pública - escopo departamento
    if (sugestao.escopo === 'departamento') {
      const deptId = typeof departamentoId === 'string' ? parseInt(departamentoId) : departamentoId;
      return sugestao.departamentoId === deptId;
    }

    // Sugestão pública - escopo global
    return true;
  }
}
