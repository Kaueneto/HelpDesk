import { AppDataSource } from '../data-source';
import { Sugestoes } from '../entities/Sugestoes';
import { SugestoesVotos } from '../entities/SugestoesVotos';
import { SugestoesInteracoes } from '../entities/SugestoesInteracoes';
import { Users } from '../entities/Users';

export class SugestoesService {
  private static readonly ROLE_ADMIN = 1;
  private static readonly ROLE_USER = 2;
  private static readonly ROLE_USUARIO_PRO = 3;

  private sugestoesRepository = AppDataSource.getRepository(Sugestoes);
  private votosRepository = AppDataSource.getRepository(SugestoesVotos);
  private interacoesRepository = AppDataSource.getRepository(SugestoesInteracoes);
  private usersRepository = AppDataSource.getRepository(Users);

  // criar nova sugestão
  async criarSugestao(dados: {
    titulo: string;
    descricao: string;
    usuarioCriacaoId: number;
    departamentoId: number;
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
  async listarSugestoes(usuarioId: number, roleId: number, filtros?: {
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

      // converter departamento do usuário de string para integer
      let userDepartamentoId: number | null = null;
      if (usuario.id_departament) {
        userDepartamentoId = parseInt(usuario.id_departament);
        if (isNaN(userDepartamentoId)) {
          console.warn(`[SECURITY] User ${usuarioId} has invalid department ID: ${usuario.id_departament}`);
          // para usuário comum, se departamento inválido, nega acesso (seguro)
          if (roleId !== SugestoesService.ROLE_ADMIN) {
            return [];
          }
          userDepartamentoId = null;
        }
      }

      // construir query
      let query = this.sugestoesRepository.createQueryBuilder('s')
        .leftJoinAndSelect('s.usuarioCriacao', 'usuarioCriacao')
        .leftJoinAndSelect('s.departamento', 'departamento')
        .leftJoinAndSelect('s.votos', 'votos')
        .leftJoinAndSelect('votos.usuario', 'usuarioVoto')
        .leftJoinAndSelect('s.interacoes', 'interacoes')
        .leftJoinAndSelect('interacoes.usuario', 'usuarioInteracao');

      // LÓGICA DE VISIBILIDADE BASEADA NO ROLE
      if (roleId === SugestoesService.ROLE_ADMIN) {
        // ADMIN - pode ver TUDO, incluindo sugestões privadas
      
        //SEM where clause aplicado admin ve todas as sugestoes
        console.log(`[ADMIN] User ${usuarioId} - sem filtros, pode ver sugestões privadas`);
      } else if (roleId === SugestoesService.ROLE_USUARIO_PRO) {
        // SUPERVISOR - ve sugestões públicas globais + sugestões do seu departamento + suas proprias privadas
        // MAS NÃO vê sugestões privadas de outros usuários
        const whereClause = `(
          (s.privado = false AND s.escopo = 'global')
          OR (s.privado = false AND s.escopo = 'departamento' AND s.departamento_id = :deptId)
          OR (s.privado = true AND s.usuario_criacao_id = :uid)
        )`;

        query.where(whereClause, {
          uid: usuarioId,
          deptId: userDepartamentoId,
        });

        console.log(`[SUPERVISOR] User ${usuarioId} (dept ${userDepartamentoId}) - filtro aplicado`);
      } else {
      
        const whereClause = `(
          (s.privado = false AND s.escopo = 'global')
          OR (s.privado = true AND s.usuario_criacao_id = :uid)
          OR (s.privado = false AND s.escopo = 'departamento' AND s.departamento_id = :deptId)
        )`;

        query.where(whereClause, {
          uid: usuarioId,
          deptId: userDepartamentoId,
        });

        console.log(`[USER] User ${usuarioId} (dept ${userDepartamentoId}) - filtro aplicado`);
      }

      // Aplicar filtros adicionais
      if (filtros?.status) {
        query.andWhere('s.status = :status', { status: filtros.status });
      }

      if (filtros?.departamentoId && roleId === SugestoesService.ROLE_ADMIN) {
        query.andWhere('s.departamento_id = :filtroDepId', { filtroDepId: filtros.departamentoId });
      }

      // Ordenação - fazer em memória para votos
      let resultados = await query.getMany();

      console.log(`[RESULT] User ${usuarioId} (dept ${userDepartamentoId}) vê ${resultados.length} sugestões`);
      resultados.forEach(s => {
        console.log(`  - S${s.id}: escopo=${s.escopo}, privado=${s.privado}, dept=${s.departamentoId}, uid_criador=${s.usuarioCriacaoId}`);
      });

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
  async obterDetalhes(sugestaoId: number, usuarioId: number, roleId: number) {
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

    // converter departamento do usuário de string para integer
    let userDepartamentoId: number | null = null;
    if (usuario?.id_departament) {
      userDepartamentoId = parseInt(usuario.id_departament);
      if (isNaN(userDepartamentoId)) {
        console.warn(`[SECURITY] User ${usuarioId} has invalid/missing department`);
        // Se é admin, deixa passar; se não, nega
        if (roleId !== SugestoesService.ROLE_ADMIN) {
          throw new Error('Você precisa estar vinculado a um departamento válido');
        }
        userDepartamentoId = null;
      }
    }

    const temAcesso = this.verificarAcesso(sugestao, usuarioId, roleId, userDepartamentoId);

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
    const sugestao = await this.sugestoesRepository.findOne({
      where: { id: sugestaoId },
      relations: ['usuarioCriacao'],
    });

    if (!sugestao) {
      throw new Error('Sugestão não encontrada');
    }

    const usuario = await this.usersRepository.findOne({ where: { id: usuarioId } });
    const isAdmin = usuario?.roleId === SugestoesService.ROLE_ADMIN;

    // verificar permissão para comentar em sugestão privada
    // apenas o criador pode comentar em sugestões privadas (admin e supervisor também podem)
    if (sugestao.privado && sugestao.usuarioCriacaoId !== usuarioId && !isAdmin && usuario?.roleId !== SugestoesService.ROLE_USUARIO_PRO) {
      throw new Error('Apenas o criador da sugestão privada pode adicionar comentários');
    }

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

  // atualizar escopo (apenas admin)
  async atualizarEscopo(sugestaoId: number, escopo: 'departamento' | 'global', usuarioId?: number) {
    const sugestao = await this.sugestoesRepository.findOne({ where: { id: sugestaoId } });

    if (!sugestao) {
      throw new Error('Sugestão não encontrada');
    }

    const escopoAnterior = sugestao.escopo;
    sugestao.escopo = escopo;
    await this.sugestoesRepository.save(sugestao);

    // registrar mudança como interação
    if (usuarioId) {
      const mensagem = `Escopo alterado de "${escopoAnterior}" para "${escopo}"`;
      const interacao = this.interacoesRepository.create({
        sugestaoId,
        usuarioId,
        mensagem,
        tipo: 'mudanca_escopo',
        escopo_anterior: escopoAnterior,
        escopo_novo: escopo,
      });

      await this.interacoesRepository.save(interacao);
    }

    return sugestao;
  }

  // verificar acesso à sugestão - VALIDAÇÃO RIGOROSA
  private verificarAcesso(
    sugestao: Sugestoes,
    usuarioId: number,
    roleId: number,
    departamentoId?: string | number | null
  ): boolean {
    // Admin tem acesso a TUDO, incluindo sugestões privadas
    if (roleId === SugestoesService.ROLE_ADMIN) {
      console.log(`[ADMIN] User ${usuarioId} - acesso total`);
      return true;
    }

    // supervisor tem acesso a sugestões públicas + suas próprias privadas
    // (não vê sugestões privadas de outros usuários)
    if (roleId === SugestoesService.ROLE_USUARIO_PRO) {
      if (sugestao.privado) {
        const temAcesso = sugestao.usuarioCriacaoId === usuarioId;
        console.log(`[SUPERVISOR-PRIVATE] User ${usuarioId} acessa privada de ${sugestao.usuarioCriacaoId}: ${temAcesso}`);
        return temAcesso;
      }
      // para sugestões públicas, segue a mesma logica do user comum
    }

    // sugestão privada - APENAS o criador pode ver
    if (sugestao.privado) {
      const temAcesso = sugestao.usuarioCriacaoId === usuarioId;
      console.log(`[PRIVATE] User ${usuarioId} acessa privada de ${sugestao.usuarioCriacaoId}: ${temAcesso}`);
      return temAcesso;
    }

    // sugestão pública - verifica escopo
    if (sugestao.escopo === 'global') {
      // Global: TODOS podem ver
      console.log(`[GLOBAL] User ${usuarioId} acessa sugestão global`);
      return true;
    }

    // sugestão pública com escopo='departamento' - APENAS do mesmo departamento
    if (sugestao.escopo === 'departamento') {
  
      if (!departamentoId) {
        console.warn(`[SECURITY] User ${usuarioId} sem departamento vinculado tentou acessar sugestão de departamento`);
        return false;
      }

      const deptId = typeof departamentoId === 'string' ? parseInt(departamentoId) : departamentoId;

      if (isNaN(deptId)) {
        console.warn(`[SECURITY] Invalid dept ID after parsing: ${departamentoId}`);
        return false;
      }

      if (!sugestao.departamentoId) {
        console.warn(`[SECURITY] Sugestão ${sugestao.id} com escopo='departamento' mas sem departamento_id!`);
        return false;
      }

      const temAcesso = sugestao.departamentoId === deptId;
      console.log(`[DEPT] User ${usuarioId} (dept ${deptId}) acessa sugestão de dept ${sugestao.departamentoId}: ${temAcesso}`);
      return temAcesso;
    }

    // qualquer outro nega acesso por segurança (ex: escopo desconhecido)
    console.warn(`[SECURITY] Escopo desconhecido: ${sugestao.escopo}`);
    return false;
  }
}
