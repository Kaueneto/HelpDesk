
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Chamado {
  id: number;
  numeroChamado: number;
  dataAbertura: string;
  dataFechamento: string | null;
  resumoChamado: string;
  usuario: {
    id: number;
    name: string;
  };
  userResponsavel: {
    id: number;
    name: string;
  } | null;
  tipoPrioridade: {
    id: number;
    nome: string;
    cor: string;
  };
  topicoAjuda: {
    id: number;
    nome: string;
  };
  departamento: {
    id: number;
    nome: string;
    name?: string;
  };
  status: {
    id: number;
    nome: string;
  };
}

interface Departamento {
  id: number;
  codigo:string;
  name: string;
  ativo: boolean;
}

interface TopicoAjuda {
  id: number;
  codigo:string;
  nome: string;
  ativo: boolean;
}

interface TipoPrioridade {
  id: number;
  nome: string;
  cor: string;
}

interface StatusChamado {
  id: number;
  nome: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  roleId: number;
}

export default function GerenciarChamados() {
    const [linhaAnimando, setLinhaAnimando] = useState<number | null>(null);
    const [pageSliding, setPageSliding] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // filtros
  const [dataAberturaInicio, setDataAberturaInicio] = useState<Date | null>(null);
  const [dataAberturaFim, setDataAberturaFim] = useState<Date | null>(null);
  const [dataFechamentoInicio, setDataFechamentoInicio] = useState<Date | null>(null);
  const [dataFechamentoFim, setDataFechamentoFim] = useState<Date | null>(null);
  const [departamentoId, setDepartamentoId] = useState('');
  const [topicoAjudaId, setTopicoAjudaId] = useState('');
  const [prioridadeId, setPrioridadeId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [assunto, setAssunto] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');

  // dados
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [topicosAjuda, setTopicosAjuda] = useState<TopicoAjuda[]>([]);
  const [prioridades, setPrioridades] = useState<TipoPrioridade[]>([]);
  const [statusList, setStatusList] = useState<StatusChamado[]>([]);
  const [usuariosAdmin, setUsuariosAdmin] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // selecao multipla
  const [chamadosSelecionados, setChamadosSelecionados] = useState<number[]>([]);
  const [todosChecados, setTodosChecados] = useState(false);

  // paginacao
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalChamados, setTotalChamados] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // ordenação
  const [ordenarPor, setOrdenarPor] = useState<'numeroChamado' | 'prioridade' | 'topico' | 'departamento' | 'status' | 'dataAbertura' | 'dataFechamento' | 'usuario' | 'responsavel' | 'resumo' | null>(null);
  const [direcaoOrdem, setDirecaoOrdem] = useState<'asc' | 'desc'>('asc');

  // modal de edicao multipla
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [novoStatusId, setNovoStatusId] = useState<string>('');
  const [novaPrioridadeId, setNovaPrioridadeId] = useState<string>('');
  const [novoDepartamentoId, setNovoDepartamentoId] = useState<string>('');
  const [novoTopicoAjudaId, setNovoTopicoAjudaId] = useState<string>('');
  const [novoResponsavelId, setNovoResponsavelId] = useState<string>('');
  const [submittingEdicao, setSubmittingEdicao] = useState(false);

  useEffect(() => {
    // só carregar dados se estiver autenticado
    if (authLoading) return;
    if (!isAuthenticated) return;
    
    carregarDadosIniciais();
    // Recupera filtros/resultados do localStorage
    const cache = localStorage.getItem('chamadosCache');
    if (cache) {
      try {
        const { filtros, resultados } = JSON.parse(cache);
        setDataAberturaInicio(filtros.dataAberturaInicio ? new Date(filtros.dataAberturaInicio) : null);
        setDataAberturaFim(filtros.dataAberturaFim ? new Date(filtros.dataAberturaFim) : null);
        setDataFechamentoInicio(filtros.dataFechamentoInicio ? new Date(filtros.dataFechamentoInicio) : null);
        setDataFechamentoFim(filtros.dataFechamentoFim ? new Date(filtros.dataFechamentoFim) : null);
        setDepartamentoId(filtros.departamentoId || '');
        setTopicoAjudaId(filtros.topicoAjudaId || '');
        setPrioridadeId(filtros.prioridadeId || '');
        setStatusId(filtros.statusId || '');
        setAssunto(filtros.assunto || '');
        setNomeUsuario(filtros.nomeUsuario || '');
        setChamados(resultados.chamados || []);
        setTotalChamados(resultados.total || 0);
        setTotalPaginas(resultados.totalPages || 0);
        setPaginaAtual(resultados.currentPage || 1);
        setPageSize(resultados.pageSize || 10);
      } catch (e) {
        localStorage.removeItem('chamadosCache');
      }
    }
  }, [isAuthenticated, authLoading]);

  const handleOrdenar = (coluna: 'numeroChamado' | 'prioridade' | 'topico' | 'departamento' | 'status' | 'dataAbertura' | 'dataFechamento' | 'usuario' | 'responsavel' | 'resumo') => {
    if (ordenarPor === coluna) {
      if (direcaoOrdem === 'asc') {
        setDirecaoOrdem('desc');
      } else {
        setOrdenarPor(null);
        setDirecaoOrdem('asc');
      }
    } else {
      setOrdenarPor(coluna);
      setDirecaoOrdem('asc');
    }
  };

  const chamadosOrdenados = ordenarPor
    ? [...chamados].sort((a, b) => {
        let valorA: any;
        let valorB: any;

        switch (ordenarPor) {
          case 'numeroChamado':
            valorA = a.numeroChamado || a.id;
            valorB = b.numeroChamado || b.id;
            break;
          case 'prioridade':
            valorA = a.tipoPrioridade?.nome?.toLowerCase() || '';
            valorB = b.tipoPrioridade?.nome?.toLowerCase() || '';
            break;
          case 'topico':
            valorA = a.topicoAjuda?.nome?.toLowerCase() || '';
            valorB = b.topicoAjuda?.nome?.toLowerCase() || '';
            break;
          case 'departamento':
            valorA = (a.departamento?.nome || a.departamento?.name || '').toLowerCase();
            valorB = (b.departamento?.nome || b.departamento?.name || '').toLowerCase();
            break;
          case 'status':
            valorA = a.status?.nome?.toLowerCase() || '';
            valorB = b.status?.nome?.toLowerCase() || '';
            break;
          case 'dataAbertura':
            valorA = a.dataAbertura ? new Date(a.dataAbertura).getTime() : 0;
            valorB = b.dataAbertura ? new Date(b.dataAbertura).getTime() : 0;
            break;
          case 'dataFechamento':
            valorA = a.dataFechamento ? new Date(a.dataFechamento).getTime() : 0;
            valorB = b.dataFechamento ? new Date(b.dataFechamento).getTime() : 0;
            break;
          case 'usuario':
            valorA = a.usuario?.name?.toLowerCase() || '';
            valorB = b.usuario?.name?.toLowerCase() || '';
            break;
          case 'responsavel':
            valorA = a.userResponsavel?.name?.toLowerCase() || '';
            valorB = b.userResponsavel?.name?.toLowerCase() || '';
            break;
          case 'resumo':
            valorA = a.resumoChamado?.toLowerCase() || '';
            valorB = b.resumoChamado?.toLowerCase() || '';
            break;
          default:
            return 0;
        }

        if (valorA < valorB) return direcaoOrdem === 'asc' ? -1 : 1;
        if (valorA > valorB) return direcaoOrdem === 'asc' ? 1 : -1;
        return 0;
      })
    : chamados;

  const carregarDadosIniciais = async () => {
    if (!isAuthenticated) return; // protecao adicional
    
    try {
      const [deptosRes, topicosRes, prioridadesRes, statusRes, usersRes] = await Promise.all([
        api.get('/departamentos'),
        api.get('/topicos_ajuda'),
        api.get('/tipo_prioridade'),
        api.get('/status'),
        api.get('/users'),
      ]);

      console.log('Departamentos:', deptosRes.data);
      console.log('Tópicos:', topicosRes.data);
      console.log('Prioridades:', prioridadesRes.data);
      console.log('Status:', statusRes.data);
      console.log('Usuários bruto:', usersRes.data);

      setDepartamentos(deptosRes.data);
      setTopicosAjuda(topicosRes.data);
      setPrioridades(prioridadesRes.data);
      setStatusList(statusRes.data);
      
      // filtrar apenas usuários admin
            const todosUsuarios = Array.isArray(usersRes.data) 
        ? usersRes.data
        : (usersRes.data.usuarios || usersRes.data);
      
      console.log('=== DEBUG USUÁRIOS ===');
      console.log('Total de usuários:', todosUsuarios.length);
      console.log('Estrutura do primeiro usuário:', todosUsuarios[0]);
      
      // filtrar admins - testar diferentes propriedades
      const admins = todosUsuarios.filter((u: any) => {
        const isAdmin = u.roleId === 1 || u.role?.id === 1;
        console.log(`User ${u.id} - ${u.name}: roleId=${u.roleId}, role.id=${u.role?.id}, isAdmin=${isAdmin}`);
        return isAdmin;
      });
      
      console.log('Total de admins encontrados:', admins.length);
      console.log('Admins:', admins);
      
      setUsuariosAdmin(admins);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const pesquisarChamados = async (page: number = 1) => {
    if (!isAuthenticated) return; // protecao adicional
    
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };
      if (dataAberturaInicio) params.dataAberturaInicio = dataAberturaInicio.toISOString();
      if (dataAberturaFim) {
        const fim = new Date(dataAberturaFim);
        fim.setHours(23, 59, 59, 999);
        params.dataAberturaFim = fim.toISOString();
      }
      if (dataFechamentoInicio) params.dataFechamentoInicio = dataFechamentoInicio.toISOString();
      if (dataFechamentoFim) {
        const fim = new Date(dataFechamentoFim);
        fim.setHours(23, 59, 59, 999);
        params.dataFechamentoFim = fim.toISOString();
      }
      if (departamentoId) params.departamentoId = departamentoId;
      if (topicoAjudaId) params.topicoAjudaId = topicoAjudaId;
      if (prioridadeId) params.prioridadeId = prioridadeId;
      if (statusId) params.statusId = statusId;
      if (assunto) params.assunto = assunto;
      if (nomeUsuario) params.nomeUsuario = nomeUsuario;

      const response = await api.get('/chamados', { params });
      setChamados(response.data.chamados || response.data);
      setTotalChamados(response.data.total || response.data.length);
      setTotalPaginas(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / pageSize));
      setPaginaAtual(page);
      setChamadosSelecionados([]);
      setTodosChecados(false);

      // Salva filtros/resultados no localStorage
      const filtros = {
        dataAberturaInicio: dataAberturaInicio ? dataAberturaInicio.toISOString() : null,
        dataAberturaFim: dataAberturaFim ? dataAberturaFim.toISOString() : null,
        dataFechamentoInicio: dataFechamentoInicio ? dataFechamentoInicio.toISOString() : null,
        dataFechamentoFim: dataFechamentoFim ? dataFechamentoFim.toISOString() : null,
        departamentoId,
        topicoAjudaId,
        prioridadeId,
        statusId,
        assunto,
        nomeUsuario,
      };
      const resultados = {
        chamados: response.data.chamados || response.data,
        total: response.data.total || response.data.length,
        totalPages: response.data.totalPages || Math.ceil((response.data.total || response.data.length) / pageSize),
        currentPage: page,
        pageSize,
      };
      localStorage.setItem('chamadosCache', JSON.stringify({ filtros, resultados }));
    } catch (error) {
      console.error('Erro ao pesquisar chamados:', error);
      alert('Erro ao buscar chamados');
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = () => {
    setDataAberturaInicio(null);
    setDataAberturaFim(null);
    setDataFechamentoInicio(null);
    setDataFechamentoFim(null);
    setDepartamentoId('');
    setTopicoAjudaId('');
    setPrioridadeId('');
    setStatusId('');
    setAssunto('');
    setNomeUsuario('');
    setChamados([]);
    setChamadosSelecionados([]);
    setTodosChecados(false);
    setPaginaAtual(1);
    setTotalPaginas(0);
    setTotalChamados(0);
    localStorage.removeItem('chamadosCache');
  };

  const handleCheckAll = () => {
    if (todosChecados) {
      setChamadosSelecionados([]);
      setTodosChecados(false);
    } else {
      setChamadosSelecionados(chamados.map(c => c.id));
      setTodosChecados(true);
    }
  };

  const handleCheckChamado = (chamadoId: number) => {
    if (chamadosSelecionados.includes(chamadoId)) {
      setChamadosSelecionados(chamadosSelecionados.filter(id => id !== chamadoId));
      setTodosChecados(false);
    } else {
      const novaSeleção = [...chamadosSelecionados, chamadoId];
      setChamadosSelecionados(novaSeleção);
      if (novaSeleção.length === chamados.length) {
        setTodosChecados(true);
      }
    }
  };

  const marcarComoResolvido = async () => {
    if (chamadosSelecionados.length === 0) {
      alert('Selecione ao menos um chamado');
      return;
    }

    if (!confirm(`Deseja marcar ${chamadosSelecionados.length} chamado(s) como resolvido?`)) {
      return;
    }

    try {
      await api.patch('/chamados/resolver-multiplos', {
        chamadosIds: chamadosSelecionados,
      });

      alert('Chamados marcados como resolvidos!');
      await pesquisarChamados();
    } catch (error) {
      console.error('Erro ao resolver chamados:', error);
      alert('Erro ao marcar chamados como resolvidos');
    }
  };

  const editarMultiplos = () => {
    // verificar se há chamados encerrados nos selçecionados
    const chamadosEncerrados = chamados.filter(
      c => chamadosSelecionados.includes(c.id) && c.status?.id === 3
    );

    if (chamadosEncerrados.length > 0) {
      alert(
        `${chamadosEncerrados.length} chamado(s) selecionado(s) estão encerrados e não podem ser editados.\n\n` +
        `Números: ${chamadosEncerrados.map(c => c.numeroChamado || c.id).join(', ')}`
      );
      return;
    }

    // Inicializar todos os campos com string vazia (para mostrar "Não alterar")
    setNovaPrioridadeId('');
    setNovoStatusId('');
    setNovoDepartamentoId('');
    setNovoTopicoAjudaId('');
    setNovoResponsavelId('');
    setModalEdicaoAberto(true);
  };

  const atribuirAMim = () => {
    if (!user) {
      alert('Erro: usuário não autenticado.');
      return;
    }

    // obtem todos os chamados selecionados
    const chamadosSelecionadosData = chamados.filter(c => chamadosSelecionados.includes(c.id));

    // verifica se há chamados encerrados na seleção
    const chamadosEncerrados = chamadosSelecionadosData.filter(c => c.status?.id === 3);

    if (chamadosEncerrados.length > 0) {
      alert(
        ` ${chamadosEncerrados.length} chamado(s) selecionado(s) estão encerrados e não podem ser atribuídos.\n\n` +
        `Números: ${chamadosEncerrados.map(c => c.numeroChamado || c.id).join(', ')}`
      );
      return;
    }

    // verifica se todos os chamados já são do usuário atual
    const chamadosJaMeus = chamadosSelecionadosData.filter(
      c => c.userResponsavel && c.userResponsavel.id === user.id
    );

    if (chamadosJaMeus.length === chamadosSelecionadosData.length) {
      alert(
        `Todos os ${chamadosJaMeus.length} chamado(s) selecionado(s) já estão atribuídos a você.\n\n` +
        `Não há nada para alterar.`
      );
      return;
    }

    // verifica se há chamados que não pertencem ao usuário logado
    const chamadosDeOutros = chamadosSelecionadosData.filter(
      c => c.userResponsavel && c.userResponsavel.id !== user.id
    );

    // verifica chamados sem responsável
    const chamadosSemResponsavel = chamadosSelecionadosData.filter(
      c => !c.userResponsavel
    );

    const totalParaAtribuir = chamadosDeOutros.length + chamadosSemResponsavel.length;

    if (chamadosDeOutros.length > 0) {
      const mensagem = chamadosJaMeus.length > 0
        ? ` ${chamadosDeOutros.length} chamado(s) estão sendo atendidos por outros usuários:\n\n` +
          chamadosDeOutros.map(c => `#${c.numeroChamado || c.id} - ${c.userResponsavel?.name}`).join('\n') +
          `\n\n${chamadosJaMeus.length} já estão atribuídos a você.\n\n` +
          `Deseja atribuir os ${totalParaAtribuir} chamado(s) restantes a você?`
        : ` ${chamadosDeOutros.length} chamado(s) estão sendo atendidos por outros usuários:\n\n` +
          chamadosDeOutros.map(c => `#${c.numeroChamado || c.id} - ${c.userResponsavel?.name}`).join('\n') +
          `\n\nDeseja realmente atribuir esses chamados a você?`;
      
      const confirmacao = window.confirm(mensagem);
      if (!confirmacao) return;
    } else {
      const mensagem = chamadosJaMeus.length > 0
        ? `${chamadosJaMeus.length} chamado(s) já estão atribuídos a você.\n\n` +
          `Deseja atribuir os ${totalParaAtribuir} chamado(s) restantes a você?`
        : `Deseja atribuir ${totalParaAtribuir} chamado(s) a você?`;
      
      const confirmacao = window.confirm(mensagem);
      if (!confirmacao) return;
    }

    confirmarAtribuirAMim();
  };

  const confirmarAtribuirAMim = async () => {
    if (!user) {
      alert(' Erro: usuário não autenticado.');
      return;
    }

    try {
      setSubmittingEdicao(true);

      const response = await api.patch('/chamados/editar-multiplos', {
        chamadosIds: chamadosSelecionados,
        userResponsavelId: user.id
      });

      alert(response.data.message || ` ${chamadosSelecionados.length} chamado(s) atribuído(s) com sucesso!`);
      setChamadosSelecionados([]);
      setTodosChecados(false);
      await pesquisarChamados(paginaAtual);
    } catch (error: any) {
      console.error('Erro ao atribuir chamados:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.mensagem || 
                          error.response?.data?.erros || 
                          error.message || 
                          'Erro ao atribuir chamados';
      alert(`Erro: ${errorMessage}`);
    } finally {
      setSubmittingEdicao(false);
    }
  };

  const fecharModalEdicao = () => {
    setModalEdicaoAberto(false);
    setNovoStatusId('');
    setNovaPrioridadeId('');
    setNovoDepartamentoId('');
    setNovoTopicoAjudaId('');
    setNovoResponsavelId('');
  };

  const confirmarEdicaoMultipla = async () => {
    try {
      // validacao especifica pra redirecionamento
      if (novoResponsavelId && novoResponsavelId !== '') {
        const chamadosParaRedirecionar = chamados.filter(c => chamadosSelecionados.includes(c.id));
        const chamadosDeOutros = chamadosParaRedirecionar.filter(
          c => c.userResponsavel && c.userResponsavel.id !== user?.id
        );

        if (chamadosDeOutros.length > 0) {
          alert(
            `Você não pode redirecionar chamados que não são seus.\n\n` +
            `${chamadosDeOutros.length} chamado(s) estão sendo atendidos por outras pessoas:\n\n` +
            chamadosDeOutros.map(c => `#${c.numeroChamado || c.id} - Responsável: ${c.userResponsavel?.name}`).join('\n') +
            `\n\nRemova esses chamados da seleção para continuar.`
          );
          return;
        }
      }

      setSubmittingEdicao(true);

      const payload: any = {
        chamadosIds: chamadosSelecionados,
      };

      if (novoStatusId) payload.statusId = parseInt(novoStatusId);
      if (novaPrioridadeId) payload.prioridadeId = parseInt(novaPrioridadeId);
      if (novoDepartamentoId) payload.departamentoId = parseInt(novoDepartamentoId);
      if (novoTopicoAjudaId) payload.topicoAjudaId = parseInt(novoTopicoAjudaId);
      if (novoResponsavelId) payload.userResponsavelId = parseInt(novoResponsavelId);

      const response = await api.patch('/chamados/editar-multiplos', payload);

      alert(response.data.message || ` ${chamadosSelecionados.length} chamado(s) atualizado(s) com sucesso!`);
      setModalEdicaoAberto(false);
      setChamadosSelecionados([]);
      setTodosChecados(false);
      await pesquisarChamados(paginaAtual);
    } catch (error: any) {
      console.error('Erro ao editar chamados:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.mensagem || 
                          error.response?.data?.erros || 
                          error.message || 
                          'Erro ao editar múltiplos chamados';
      alert(`Erro: ${errorMessage}`);
    } finally {
      setSubmittingEdicao(false);
    }
  };

  const excluirChamadosSelecionados = async () => {
    if (chamadosSelecionados.length === 0) {
      alert('Selecione ao menos um chamado para excluir');
      return;
    }

    const primeiraConfirmacao = window.confirm(
      `Você está prestes a excluir ${chamadosSelecionados.length} chamado(s).\n\n` +
      'Esta ação é IRREVERSÍVEL e removerá permanentemente:\n' +
      '- O chamado e suas informações\n' +
      '- Todas as mensagens\n' +
      '- Todo o histórico\n' +
      '- Todos os anexos\n\n' +
      'Tem certeza que deseja continuar?'
    );

    if (!primeiraConfirmacao) {
      return;
    }

    const segundaConfirmacao = window.confirm(
      `CONFIRMAÇÃO FINAL:\n\n` +
      `Excluir definitivamente ${chamadosSelecionados.length} chamado(s)?\n\n` +
      'Esta ação NÃO PODE SER DESFEITA!'
    );

    if (!segundaConfirmacao) {
      return;
    }

    try {
      setSubmittingEdicao(true);

      const response = await api.delete('/chamados/excluir-multiplos', {
        data: {
          chamadosIds: chamadosSelecionados,
        }
      });

      alert(response.data.mensagem || `${chamadosSelecionados.length} chamado(s) excluído(s) com sucesso!`);
      setChamadosSelecionados([]);
      setTodosChecados(false);
      await pesquisarChamados(paginaAtual);
    } catch (error: any) {
      console.error('Erro ao excluir chamados:', error);
      const errorMessage = error.response?.data?.mensagem || 
                          error.response?.data?.erros || 
                          error.message || 
                          'Erro ao excluir chamados';
      alert(`Erro: ${errorMessage}`);
    } finally {
      setSubmittingEdicao(false);
    }
  };

  const formatarData = (data: string | null) => {
    if (!data) return '-';
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  };

  return (
    <div className={pageSliding ? 'slideOutLeft' : ''}>
      <div className="bg-[#1A68CF] px-6 py-4">
        <h2 className="text-white text-2xl font-semibold">Painel de Chamados</h2>
      </div>

      <div className="p-6 bg-[#EDEDED] ">
        <div className="bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden">
          {/* area de Filtros */}
          <div className="p-6  border-gray-300 ">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 ">
              {/* Período de abertura */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período de abertura
                </label>
                <DatePicker
                  selectsRange={true}
                  startDate={dataAberturaInicio}
                  endDate={dataAberturaFim}
                  onChange={(update) => {
                    const [start, end] = update;
                    setDataAberturaInicio(start);
                    setDataAberturaFim(end);
                  }}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Selecione o período"
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded  focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 focus:outline-none"
                  isClearable={true}
                />
              </div>

              {/* periodo de fechamento */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período de Conclusão
                </label>
                <DatePicker
                  selectsRange={true}
                  startDate={dataFechamentoInicio}
                  endDate={dataFechamentoFim}
                  onChange={(update) => {
                    const [start, end] = update;
                    setDataFechamentoInicio(start);
                    setDataFechamentoFim(end);
                  }}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Selecione o período"
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded  focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 focus:outline-none"
                  isClearable={true}
                />
              </div>

              {/* departamento */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={departamentoId}
                  onChange={(e) => setDepartamentoId(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded  focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 focus:outline-none"
                >
                  <option value="">Todos</option>
                  {departamentos.filter(dept => dept.ativo).map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.codigo} - {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* topico de ajuda */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tópico de ajuda
                </label>
                <select
                  value={topicoAjudaId}
                  onChange={(e) => setTopicoAjudaId(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded  focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 focus:outline-none"
                >
                  <option value="">Todos</option>
                  {topicosAjuda.filter(topico => topico.ativo).map((topico) => (
                    <option key={topico.id} value={topico.id}>
                     {topico.codigo} - {topico.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* status */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded  focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 focus:outline-none"
                >
                  <option value="">Todos</option>
                  {statusList.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2 linha de filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {/* Assunto */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assunto
                </label>
                <input
                  type="text"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  placeholder="Digite o assunto"
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded  focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 focus:outline-none "
                />
              </div>

              {/* nome user */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome usuário
                </label>
                <input
                  type="text"
                  value={nomeUsuario}
                  onChange={(e) => setNomeUsuario(e.target.value)}
                  placeholder="Digite o nome"
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded  focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 focus:outline-none"
                />
              </div>

              {/* prioridade - botões visuais */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nível de prioridade
                </label>
                <div className="grid grid-cols-5 h-10 rounded-lg overflow-hidden border border-gray-300">
                  {/* botao TODOS */}
                  <button
                    type="button"
                    onClick={() => setPrioridadeId('')}
                    className="flex items-center justify-center text-xs font-medium transition-all min-w-0"
                    style={{
                      backgroundColor: prioridadeId === '' ? '#3F3F3F' : '#DFDFDF',
                      color: prioridadeId === '' ? 'white' : '#3F3F3F',
                    }}
                  >
                    <span className="truncate px-1">TODOS</span>
                  </button>
                  {/* botoes de prioridade */}
                  {prioridades.map((prioridade) => (
                    <button
                      key={prioridade.id}
                      type="button"
                      onClick={() => setPrioridadeId(String(prioridade.id))}
                      className="flex items-center justify-center text-xs font-medium transition-all min-w-0"
                      style={{
                        backgroundColor: prioridadeId === String(prioridade.id) ? prioridade.cor : '#DFDFDF',
                        color: prioridadeId === String(prioridade.id) ? '#1F1F1F' : '#3F3F3F',
                      }}
                    >
                      <span className="truncate px-1">{prioridade.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* botoes de acoes dos filtros */}
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={limparFiltros}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium text-sm"
              >
                Limpar Filtros
              </button>
      <button
                onClick={() => pesquisarChamados(1)}
                disabled={loading}
                className="px-6 py-2 bg-[#002B57]  text-white rounded hover:bg-[#315377] transition-colors font-medium text-sm disabled:bg-[#002B57]"
              >
                {loading ? 'Pesquisando...' : 'Pesquisar'}
              </button>
            </div>
          </div>

          {/* acao em multiplos registros */}
          {chamados.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-300 flex gap-3 items-center">
              <button
                onClick={marcarComoResolvido}
                disabled={chamadosSelecionados.length === 0}
                className="
                  px-5 py-2 rounded border border-[#1A4877]
                  bg-[#1a4877] text-white
                  hover:bg-[#1A4877] transition-colors font-medium text-sm

                  disabled:bg-transparent
                  disabled:text-[#001933]
                  disabled:border-[#001933]
                  disabled:cursor-not-allowed
                  disabled:hover:bg-transparent
                  "
              >
                Marcar como resolvido
              </button>
              <button
                onClick={editarMultiplos}
                disabled={chamadosSelecionados.length === 0}
                className="
                  px-5 py-2 rounded border border-[#1A4877]
                  bg-[#1a4877] text-white
                  hover:bg-[#1A4877] transition-colors font-medium text-sm

                  disabled:bg-transparent
                  disabled:text-[#001933]
                  disabled:border-[#001933]
                  disabled:cursor-not-allowed
                  disabled:hover:bg-transparent
                  "
                                >
                Editar Múltiplos
              </button>
              <button
                onClick={atribuirAMim}
                disabled={chamadosSelecionados.length === 0}
                className="
                  px-5 py-2 rounded border border-[#1A4877]
                  bg-[#1a4877] text-white
                  hover:bg-[#1A4877] transition-colors font-medium text-sm

                  disabled:bg-transparent
                  disabled:text-[#001933]
                  disabled:border-[#001933]
                  disabled:cursor-not-allowed
                  disabled:hover:bg-transparent
                  "       
                         >
                Atribuir a mim
              </button>
              {chamadosSelecionados.length > 0 && (
                <span className="text-sm text-gray-600 flex items-center ml-2">
                  {chamadosSelecionados.length} selecionado(s)
                </span>
              )}
            </div>
          )}

          {/* tabela de resultados */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Carregando chamados...
              </div>
            ) : chamados.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum chamado encontrado. Use os filtros para pesquisar.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-100  border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={todosChecados}
                        onChange={handleCheckAll}
                        className="w-5 h-5 cursor-pointer rounded appearance-none border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 relative
                        before:content-['✓'] before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-white before:text-sm before:font-bold before:opacity-0 checked:before:opacity-100"
                      />
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('numeroChamado')}
                    >
                      <div className="flex items-center gap-1">
                        Cód. Chamado
                        {ordenarPor === 'numeroChamado' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('prioridade')}
                    >
                      <div className="flex items-center gap-1">
                        Prioridade
                        {ordenarPor === 'prioridade' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('topico')}
                    >
                      <div className="flex items-center gap-1">
                        Tópico
                        {ordenarPor === 'topico' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('departamento')}
                    >
                      <div className="flex items-center gap-1">
                        Departamento
                        {ordenarPor === 'departamento' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {ordenarPor === 'status' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('dataAbertura')}
                    >
                      <div className="flex items-center gap-1">
                        Abertura
                        {ordenarPor === 'dataAbertura' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('dataFechamento')}
                    >
                      <div className="flex items-center gap-1">
                        Fechamento
                        {ordenarPor === 'dataFechamento' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('usuario')}
                    >
                      <div className="flex items-center gap-1">
                        Usuário
                        {ordenarPor === 'usuario' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('responsavel')}
                    >
                      <div className="flex items-center gap-1">
                        Responsável
                        {ordenarPor === 'responsavel' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('resumo')}
                    >
                      <div className="flex items-center gap-1">
                        Resumo
                        {ordenarPor === 'resumo' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chamadosOrdenados.map((chamado, index) => (<tr
                      key={chamado.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                          return;
                        }
                        // grava posição do clique em porcentagem da viewport
                        const xPct = (e.clientX / window.innerWidth) * 100;
                        const yPct = (e.clientY / window.innerHeight) * 100;
                        try {
                          sessionStorage.setItem('detailOrigin', JSON.stringify({ x: `${xPct}%`, y: `${yPct}%` }));
                        } catch (err) {
                          // ignore
                        }
                        setLinhaAnimando(chamado.id);
                        setPageSliding(true);
                        setTimeout(() => {
                          router.push(`/chamado/${chamado.id}`);
                        }, 240); // aguarda animação slideOutLeft (220ms)
                      }}
                      className={`border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } ${linhaAnimando === chamado.id ? 'slideOutLeft' : ''}`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={chamadosSelecionados.includes(chamado.id)}
                          onChange={() => handleCheckChamado(chamado.id)}
                          className="w-5 h-5 cursor-pointer rounded appearance-none border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 relative
                          before:content-['✓'] before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-white before:text-sm before:font-bold before:opacity-0 checked:before:opacity-100"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">
                        {chamado.numeroChamado || chamado.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: chamado.tipoPrioridade?.cor || '#gray' }}
                          ></div>
                          <span className="text-sm text-gray-900">
                            {chamado.tipoPrioridade?.nome || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] truncate">
                        {chamado.topicoAjuda?.nome || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[120px] truncate">
                        {chamado.departamento?.nome || chamado.departamento?.name || '-'}
                      </td>
                      <td className="px-1 py-1 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${
                             chamado.status.id === 1
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-500'
                            : chamado.status.id === 2
                            ? 'bg-blue-100 text-blue-600 border-blue-500'
                            : chamado.status.id === 3
                             ? 'bg-green-100 text-green-800 border-green-700'
                            : chamado.status.id === 5
                            ? 'bg-purple-100 text-purple-700 border-purple-500'
                            : 'bg-red-100 text-red-800 border-red-700'

                          }`}
                        >
                          {chamado.status?.nome || 'Desconhecido'}
                        </span>
                      </td>
                      <td className="px-1 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatarData(chamado.dataAbertura)}
                      </td>
                      <td className="px-1 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatarData(chamado.dataFechamento)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] truncate">
                        {chamado.usuario?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] truncate">
                        {chamado.userResponsavel?.name || (
                          <span className="text-gray-400 italic">Não atribuído</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={chamado.resumoChamado}>
                        {chamado.resumoChamado}
                      </td>
                    </tr>))}
                </tbody>
              </table>
            )}
          </div>

          {/* Controles de Paginação */}
          {chamados.length > 0 && (
            <div className="px-6 py-4 bg-gray-100/50 border-t border-gray-300">
              {/* Seletor de registros por página */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    Registros por página:
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value));
                      setPaginaAtual(1);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded  focus:ring-1 focus:ring-blue-500 text-sm text-gray-900"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="40">40</option>
                    <option value="50">50</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  Mostrando {(paginaAtual - 1) * pageSize + 1} a {Math.min(paginaAtual * pageSize, totalChamados)} de {totalChamados} chamado(s)
                </div>
              </div>

              {/* Controles de navegação */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => pesquisarChamados(paginaAtual - 1)}
                  disabled={paginaAtual === 1 || loading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => pesquisarChamados(page)}
                      className={`px-3 py-2 rounded font-medium text-sm transition-colors ${
                        paginaAtual === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => pesquisarChamados(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas || loading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo →
                </button>
              </div>
            </div>
          )}
          <div>
            <button
              onClick={excluirChamadosSelecionados}
              disabled={chamadosSelecionados.length === 0 || submittingEdicao}
              className="m-5 px-4 py-2 bg-black text-white rounded hover:bg-red-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingEdicao ? 'Excluindo...' : `Excluir Chamado(s) Selecionado(s)`}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Edição Múltipla */}
      {modalEdicaoAberto && (
        <div className="fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4 ">
          <div className="bg-white shadow-2xl w-full max-w-3xl transform transition-all">
            {/* header */}
            <div className="bg-gradient-to-r from-[#001933] to-[#1A4877] px-6 py-4 ">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                  Editar múltiplos chamados
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm bg-white/20 text-white px-3 py-1 rounded-full font-medium">
                    {chamadosSelecionados.length} selecionado(s)
                  </span>
                  <button
                    onClick={fecharModalEdicao}
                    disabled={submittingEdicao}
                    className="text-white hover:bg-white/20 rounded-full p-1 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
          {/* Body */}
<div className="p-8"> 
  {/* Grid de campos */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    
    {/* Prioridade */}
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
        Prioridade
      </label>
      <select
        value={novaPrioridadeId}
        onChange={(e) => setNovaPrioridadeId(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 text-sm text-gray-900 bg-white transition-all"
      >
        <option value="">Manter atual</option>
        {[...prioridades].sort((a, b) => a.id - b.id).map((prioridade) => (
          <option key={prioridade.id} value={prioridade.id}>
            {prioridade.nome}
          </option>
        ))}
      </select>
    </div>

    {/* departamento */}
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
        Departamento
      </label>
      <select
        value={novoDepartamentoId}
        onChange={(e) => setNovoDepartamentoId(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md  text-sm text-gray-900 bg-white transition-all"
      >
        <option value="">Manter atual</option>
        {[...departamentos].filter(dept => dept.ativo).sort((a, b) => a.id - b.id).map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
    </div>

    {/* Status */}
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
        Status
      </label>
      <select
        value={novoStatusId}
        onChange={(e) => setNovoStatusId(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 text-sm text-gray-900 bg-white transition-all"
      >
        <option value="">Manter atual</option>
        {[...statusList].sort((a, b) => a.id - b.id).map((status) => (
          <option key={status.id} value={status.id}>
            {status.nome}
          </option>
        ))}
      </select>
    </div>

    {/* topico */}
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
        Tópico de ajuda
      </label>
      <select
        value={novoTopicoAjudaId}
        onChange={(e) => setNovoTopicoAjudaId(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1text-sm text-gray-900 bg-white transition-all"
      >
        <option value="">Manter atual</option>
        {[...topicosAjuda].filter(topico => topico.ativo).sort((a, b) => a.id - b.id).map((topico) => (
          <option key={topico.id} value={topico.id}>
            {topico.nome}
          </option>
        ))}
      </select>
    </div>
  </div>

  <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
    <div className="flex items-center gap-2 mb-3">
      <svg className="w-4 h-4 text-[#1A00FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h4 className="text-sm font-semibold text-gray-800">Redirecionar Chamado</h4>
    </div>
    
    <select
      value={novoResponsavelId}
      onChange={(e) => setNovoResponsavelId(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-sm bg-white"
    >
      <option value="">Não alterar responsável</option>
      {usuariosAdmin.length === 0 && (
        <option value="" disabled>Nenhum administrador disponível</option>
      )}
      {[...usuariosAdmin].sort((a, b) => a.id - b.id).map((usuario) => (
        <option key={usuario.id} value={usuario.id}>
          {usuario.name}
        </option>
      ))}
    </select>
    <p className="mt-2 text-[14px] text-gray-500 italic">
      * Apenas chamados sob sua responsabilidade podem ser redirecionados.
    </p>
  </div>

  {/* Botões */}
  <div className="flex gap-3 justify-end pt-6 border-t border-gray-100">
    <button
      onClick={fecharModalEdicao}
      disabled={submittingEdicao}
      className="px-6 py-2 bg-transparent border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 transform hover:scale-105 font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed"
    >
      Cancelar
    </button>
    <button
      onClick={confirmarEdicaoMultipla}
      disabled={submittingEdicao}
      className="px-6 py-2 bg-[#001960] text-white rounded-lg hover:bg-[#001960]/80 transition-all transform hover:scale-105 font-medium disabled:bg-blue-400 disabled:cursor-not-allowed disabled:transform-none"
    >
      {submittingEdicao ? (
        <span className="flex items-center gap-2">
      
          Salvando...
        </span>
      ) : (
        "Confirmar Alterações"
      )}
    </button>
  </div>
</div>
          </div>
        </div>
      )}
    </div>
  );
}