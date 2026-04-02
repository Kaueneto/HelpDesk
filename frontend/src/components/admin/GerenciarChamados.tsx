
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ModalNovoChamado from '@/app/admin/Modal/ModalNovoChamado';
import ModalEditarChamadoAdmin from '@/app/admin/Modal/ModalEditarChamadoAdmin';
import { motion, AnimatePresence } from 'framer-motion';
import { FiGrid, FiList, FiFilter, FiPlus } from 'react-icons/fi';
import KanbanView from '../kanban/KanbanView';
import { HiOutlineChevronDown } from 'react-icons/hi';



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
  const { theme } = useTheme();
  
  // filtros
  const [dataAberturaInicio, setDataAberturaInicio] = useState<Date | null>(null);
  const [dataAberturaFim, setDataAberturaFim] = useState<Date | null>(null);
  const [dataFechamentoInicio, setDataFechamentoInicio] = useState<Date | null>(null);
  const [dataFechamentoFim, setDataFechamentoFim] = useState<Date | null>(null);
  const [departamentoId, setDepartamentoId] = useState<string[]>([]);
  const [topicoAjudaId, setTopicoAjudaId] = useState<string[]>([]);
  const [prioridadeId, setPrioridadeId] = useState('');
  const [statusId, setStatusId] = useState<string[]>([]);
  const [assunto, setAssunto] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');

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
  const [pageSize, setPageSize] = useState(20);

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

  // modal de novo chamado
  const [modalNovoChamadoAberto, setModalNovoChamadoAberto] = useState(false);

  // modal de editar chamado individual
  const [modalEditarChamadoAberto, setModalEditarChamadoAberto] = useState(false);
  const [chamadoIdEditar, setChamadoIdEditar] = useState<number | null>(null);

  // visualização Kanban/Tabela
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(() => {
    return (localStorage.getItem('ticketsView') as 'table' | 'kanban') || 'table';
  });

  // filtro de abas (Todos, Meus, Outros)
  const [abaFiltro, setAbaFiltro] = useState<'todos' | 'meus' | 'outros'>('todos');
  const [ocultarConcluidos, setOcultarConcluidos] = useState(false);
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(() => {
    const saved = localStorage.getItem('filtrosVisiveis');
    return saved !== null ? saved === 'true' : true;
  });



  useEffect(() => {
    // só carregar dados se estiver autenticado
    if (authLoading) return;
    if (!isAuthenticated) return;
    
    carregarDadosIniciais();
    // carregar chamados automaticamente ao montar
    pesquisarChamados(1);
    // limpar cache antigo para evitar conflitos
    localStorage.removeItem('chamadosCache');
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    // Guardar preferência de filtros visíveis no localStorage
    localStorage.setItem('filtrosVisiveis', String(filtrosVisiveis));
  }, [filtrosVisiveis]);

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

  const chamadosFiltrados = useMemo(() => {
    let filtrados = chamados;
    
    // filtrar por aba
    if (abaFiltro === 'todos') {
      filtrados = chamados;
    } else if (abaFiltro === 'meus') {
      //mostra somente chamados onde o usuario atual é responsavel
      filtrados = chamados.filter(c => c.userResponsavel?.id === user?.id);
    } else if (abaFiltro === 'outros') {
      //mostrar chamados onde o usuario naoé responsavel 
      filtrados = chamados.filter(c => c.userResponsavel?.id !== user?.id);
    }
    
    return filtrados;
  }, [chamados, abaFiltro, user?.id]);

  const chamadosOrdenados = ordenarPor
    ? [...chamadosFiltrados].sort((a, b) => {
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
    : chamadosFiltrados;

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

      setDepartamentos(deptosRes.data);
      setTopicosAjuda(topicosRes.data);
      setPrioridades(prioridadesRes.data);
      setStatusList(statusRes.data);
      
      // filtrar apenas usuários admin
            const todosUsuarios = Array.isArray(usersRes.data) 
        ? usersRes.data
        : (usersRes.data.usuarios || usersRes.data);
      
      // filtrar admins - testar diferentes propriedades
      const admins = todosUsuarios.filter((u: any) => {
        const isAdmin = u.roleId === 1 || u.role?.id === 1;
        return isAdmin;
      });
      
      setUsuariosAdmin(admins);
    } catch (error) {
    }
  };

  const pesquisarChamados = async (page: number = 1, ocultarConcluidosFiltro: boolean = ocultarConcluidos) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize: pageSize || 20,
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
      if (departamentoId.length > 0) params.departamentoId = departamentoId.join(',');
      if (topicoAjudaId.length > 0) params.topicoAjudaId = topicoAjudaId.join(',');
      if (prioridadeId) params.prioridadeId = prioridadeId;
      if (statusId.length > 0) {
        params.statusId = statusId.join(',');
      } else if (ocultarConcluidosFiltro) {
        // Se ocultar concluídos está ativado e nenhum statusId foi selecionado, filtra todos menos o concluído (id 3)
        params.statusId = [1,2,4,5,6,7].join(',');
      }
      if (assunto) params.assunto = assunto;
      if (nomeUsuario) params.nomeUsuario = nomeUsuario;
      if (nomeResponsavel) params.nomeResponsavel = nomeResponsavel;

      const response = await api.get('/chamados', { params });
    
      const chamadosRecebidos = response.data.chamados || response.data;
      setChamados(chamadosRecebidos);
      setTotalChamados(response.data.total || chamadosRecebidos.length);
      setTotalPaginas(response.data.totalPages || Math.ceil((response.data.total || chamadosRecebidos.length) / pageSize));
      setPaginaAtual(page);
      setChamadosSelecionados([]);
      setTodosChecados(false);
      
    } catch (error) {
   
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
    setDepartamentoId([]);
    setTopicoAjudaId([]);
    setPrioridadeId('');
    setStatusId([]);
    setAssunto('');
    setNomeUsuario('');
    setNomeResponsavel('');
    setChamados([]);
    setChamadosSelecionados([]);
    setTodosChecados(false);
    setPaginaAtual(1);
    setTotalPaginas(0);
    setTotalChamados(0);
    setPageSize(20);
    localStorage.removeItem('chamadosCache');
  };

  // Funções para modo Kanban
  const toggleViewMode = (mode: 'table' | 'kanban') => {
    setViewMode(mode);
    localStorage.setItem('ticketsView', mode);
    // Resetar paginação ao alternar modo
    setPaginaAtual(1);
    setPageSize(20);
  };

  const handleTicketUpdate = (ticketId: number, updatedTickets: Chamado[]) => {
    // Atualizar tickets localmente SEM fazer refetch
    setChamados(updatedTickets);
  };

  const handleTicketClick = (ticket: Chamado) => {
    router.push(`/chamado/${ticket.id}`);
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
      'Esta ação é IRREVERSÍVEL e removerá permanentemente\n' +
      'o chamado e suas informações, todas as mensagens,\n' +
      'todo o histórico e seus anexos.\n' +
      'Tem certeza que deseja continuar?'
    );

    if (!primeiraConfirmacao) {
      return;
    }

    const segundaConfirmacao = window.confirm(
      `Tem certeza que deseja excluir definitivamente ${chamadosSelecionados.length} chamado(s)?` 
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
    
      const errorMessage = error.response?.data?.mensagem || 
                          error.response?.data?.erros || 
                          error.message || 
                          'Erro ao excluir chamados';
      alert(`Erro: ${errorMessage}`);
    } finally {
      setSubmittingEdicao(false);
    }
  };

  const editarChamadoIndividual = () => {
    if (chamadosSelecionados.length !== 1) {
      alert('Selecione exatamente 1 chamado para editar.');
      return;
    }

    const chamadoId = chamadosSelecionados[0];
    const chamado = chamados.find(c => c.id === chamadoId);
    
    // Validar se o chamado está encerrado
    if (chamado && chamado.status?.id === 3) {
      const confirmacao = window.confirm('Este chamado está encerrado Tem certeza que deseja editar?.');
      if (!confirmacao) {
        return;
      }
    }
    
    setChamadoIdEditar(chamadoId);
    setModalEditarChamadoAberto(true);
  };

  const handleSucessoEdicaoChamado = async () => {
    setChamadosSelecionados([]);
    setTodosChecados(false);
    await pesquisarChamados(paginaAtual);
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
    <div className={pageSliding ? 'slideOutLeft' : ''} style={{ backgroundColor: `rgb(var(--bg-primary))` }}>
      <div className="px-6 py-3" style={{ backgroundColor: `rgb(var(--cor-header-fundo))` }}>
        <h2 className="text-white text-2xl font-semibold">Painel de Chamados</h2>
      </div>

      <div className="px-2 min-h-screen" style={{ backgroundColor: `rgb(var(--bg-primary))` }}>
          
        <div className="p-2 flex gap-3 justify-between items-center" style={{ backgroundColor: `rgb(var(--bg-primary))` }}>
          {/* Botões de ação existentes */}
          <div className="flex gap-3">
            <button
              onClick={() => setModalNovoChamadoAberto(true)}
              className="px-2.5 py-1 bg-transparent border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm flex items-center gap-1.5 disabled:border-green-300 disabled:text-green-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-1 focus:ring-green-500/50"
            >
              <FiPlus className="w-3 h-3" />
              Novo
            </button>

            <button
              onClick={editarChamadoIndividual}
              disabled={chamadosSelecionados.length !== 1}
              title={chamadosSelecionados.length !== 1 ? "Selecione exatamente 1 chamado para editar" : "Editar chamado selecionado"}
              className="px-2.5 py-1 bg-transparent border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm flex items-center gap-1.5 disabled:border-blue-300 disabled:text-blue-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
          </div>
  {/* container com togglezinho de selecao pra escolher modo de viusalizacao */}
      <div className="flex overflow-hidden rounded-lg shadow-sm" style={{ backgroundColor: `rgba(var(--bg-hover), 0.4)` }}>
        {(['table', 'kanban'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => toggleViewMode(mode)}
            className={`
              px-4 py-1 text-[13px] font-medium transition-all duration-200 rounded-none 
            `}
            style={viewMode === mode ? {
              backgroundColor: `rgb(var(--bg-cinzaescuro))`,
              color: 'white'
            } : {
              color: `rgb(var(--text-primary))`
            }}
          >
            {mode === 'table' ? 'Tabela' : 'Quadro'}
          </button>
        ))}
      </div>
   </div>

        <div className="rounded-lg shadow-lg overflow-hidden" style={{
          backgroundColor: `rgb(var(--bg-elevated))`,
          borderColor: `rgb(var(--border-secondary))`,
          borderWidth: '1px'
        }}>

          {/* filtros apenas visivel no modo tabela */}
          {viewMode === 'table' && filtrosVisiveis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* area de Filtros */}
          <div className="p-6" style={{
            borderColor: `rgb(var(--cor-borda-primaria))`,
            backgroundColor: `rgb(var(--bg-filtros))`,
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid'
          }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 ">
              {/* Período de abertura */}
              <div className="min-w-0">
                <label className="block text-sm font-medium mb-1" style={{ color: `rgb(var(--text-primary))` }}>
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
                  className="w-full min-w-0 px-3 py-2 border rounded text-sm focus:outline-none transition-all"
                  isClearable={true}
                />
              </div>

              {/* periodo de fechamento */}
              <div className="min-w-0">
                <label className="block text-sm font-medium mb-1" style={{ color: `rgb(var(--text-primary))` }}>
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
                  className="w-full min-w-0 px-3 py-2 border rounded text-sm focus:outline-none transition-all"
                  isClearable={true}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-sm font-medium mb-1" style={{ color: `rgb(var(--text-primary))` }}>
                  Departamento
                </label>
                <Select
                  isMulti
                  isClearable
                  closeMenuOnSelect={false}
                  options={departamentos.filter(dept => dept.ativo).map((dept) => ({
                    value: dept.id.toString(),
                    label: `${dept.codigo} - ${dept.name}`
                  }))}
                  value={
                    departamentoId.length === 0
                      ? []
                      : departamentos
                          .filter((dept) => departamentoId.includes(dept.id.toString()))
                          .map((dept) => ({
                            value: dept.id.toString(),
                            label: `${dept.codigo} - ${dept.name}`
                          }))
                  }
                  onChange={(selected) => {
                    if (!selected || selected.length === 0) {
                      setDepartamentoId([]);
                    } else {
                      setDepartamentoId(selected.map(item => item.value));
                    }
                  }}
                  placeholder="Selecione..."
                  noOptionsMessage={() => "Nenhuma opção disponível"}
                  className="text-sm"
                  styles={{
                    control: (base) => ({
                       ...base,
                      minHeight: '38px',
                      overflowX: "auto",
                      whiteSpace: "nowrap",
                      fontSize: '14px',
                      borderColor: 'rgb(var(--border-secondary))',
                      backgroundColor: 'rgb(var(--bg-secondary))',
                      '&:hover': { borderColor: '#3b82f6', backgroundColor: 'rgb(var(--bg-secondary))' },
                      boxShadow: 'none',
                      padding: '2px 4px',
                      color: 'rgb(var(--text-primary))',
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: 'rgb(var(--bg-secondary))',
                      borderColor: 'rgb(var(--border-secondary))',
                      border: '1px solid rgb(var(--border-secondary))',
                    }),
                    menuList: (base) => ({
                      ...base,
                      backgroundColor: 'rgb(var(--bg-secondary))',
                      color: 'rgb(var(--text-primary))',
                    }),
                    option: (base, state) => ({
                      ...base,
                      fontSize: '14px',
                      backgroundColor: state.isSelected ? '#0066CC' : (state.isFocused ? 'rgb(var(--bg-hover))' : 'rgb(var(--bg-secondary))'),
                      color: state.isSelected ? 'white' : 'rgb(var(--text-primary))',
                      cursor: 'pointer',
                      '&:hover': {                   backgroundColor: 'rgb(var(--bg-hover))',
                        color: 'rgb(var(--text-primary))'
                      }
                    }),
                    multiValue: (base) => ({
                      ...base,
                      backgroundColor: '#0066CC',
                      margin: '2px 2px',
                      padding: '0 4px',
                      minWidth: 0,
                    }),
                    multiValueLabel: (base) => ({
                      ...base,
                      color: 'white',
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }),
                    multiValueRemove: (base) => ({
                      ...base,
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#004399',
                        color: 'white',
                      },
                    }),
                    valueContainer: (base) => ({
                      ...base,
                      padding: '2px 4px',
                      maxHeight: '34px',
                      overflowY: 'auto',
                    }),
                    input: (base) => ({
                      ...base,
                      color: 'rgb(var(--text-primary))',
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: 'rgb(var(--text-secondary))',
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: 'rgb(var(--text-primary))',
                    }),
                  }}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-sm font-medium mb-1" style={{ color: `rgb(var(--text-primary))` }}>
                  Tópico de ajuda
                </label>
                <Select
                  isMulti
                  isClearable
                  closeMenuOnSelect={false}
                  options={topicosAjuda.filter(topico => topico.ativo).map((topico) => ({
                    value: topico.id.toString(),
                    label: `${topico.codigo} - ${topico.nome}`
                  }))}
                  value={
                    topicoAjudaId.length === 0
                      ? []
                      : topicosAjuda
                          .filter((topico) => topicoAjudaId.includes(topico.id.toString()))
                          .map((topico) => ({
                            value: topico.id.toString(),
                            label: `${topico.codigo} - ${topico.nome}`
                          }))
                  }
                  onChange={(selected) => {
                    if (!selected || selected.length === 0) {
                      setTopicoAjudaId([]);
                    } else {
                      setTopicoAjudaId(selected.map(item => item.value));
                    }
                  }}
                  placeholder="Selecione..."
                  noOptionsMessage={() => "Nenhuma opção disponível"}
                  className="text-base"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '38px',
                      overflowX: "auto",
                      whiteSpace: "nowrap",
                      fontSize: '14px',
                      borderColor: 'rgb(var(--border-secondary))',
                      backgroundColor: 'rgb(var(--bg-secondary))',
                      '&:hover': { borderColor: '#3b82f6', backgroundColor: 'rgb(var(--bg-secondary))' },
                      boxShadow: 'none',
                      padding: '2px 4px',
                      color: 'rgb(var(--text-primary))',
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: 'rgb(var(--bg-secondary))',
                      borderColor: 'rgb(var(--border-secondary))',
                      border: '1px solid rgb(var(--border-secondary))',
                    }),
                    menuList: (base) => ({
                      ...base,
                      backgroundColor: 'rgb(var(--bg-secondary))',
                      color: 'rgb(var(--text-primary))',
                    }),
                    option: (base, state) => ({
                      ...base,
                      fontSize: '14px',
                      backgroundColor: state.isSelected ? '#0066CC' : (state.isFocused ? 'rgb(var(--bg-hover))' : 'rgb(var(--bg-secondary))'),
                      color: state.isSelected ? 'white' : 'rgb(var(--text-primary))',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgb(var(--bg-hover))',
                        color: 'rgb(var(--text-primary))'
                      }
                    }),
                    multiValue: (base) => ({
                      ...base,
                      backgroundColor: '#0066CC',
                      margin: '2px 2px',
                      padding: '0 4px',
                      minWidth: 0,
                    }),
                    multiValueLabel: (base) => ({
                      ...base,
                      color: 'white',
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }),
                    multiValueRemove: (base) => ({
                      ...base,
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#004399',
                        color: 'white',
                      },
                    }),
                    valueContainer: (base) => ({
                      ...base,
                      padding: '2px 4px',
                      maxHeight: '34px',
                      overflowY: 'auto',
                    }),
                    input: (base) => ({
                      ...base,
                      color: 'rgb(var(--text-primary))',
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: 'rgb(var(--text-secondary))',
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: 'rgb(var(--text-primary))',
                    }),
                  }}
                />
              </div>


              <div className="min-w-0">
                <label className="block text-sm font-medium mb-1" style={{ color: `rgb(var(--text-primary))` }}>
                  Status
                </label>
                <Select
                  isMulti
                  isClearable
                  closeMenuOnSelect={false}
                  options={statusList.map((status) => ({
                    value: status.id.toString(),
                    label: status.nome
                  }))}
                  value={
                    statusId.length === 0
                      ? []
                      : statusList
                          .filter((status) => statusId.includes(status.id.toString()))
                          .map((status) => ({
                            value: status.id.toString(),
                            label: status.nome
                          }))
                  }
                  onChange={(selected) => {
                    if (!selected || selected.length === 0) {
                      setStatusId([]);
                    } else {
                      setStatusId(selected.map(item => item.value));
                    }
                  }}
                  placeholder="Selecione..."
                  noOptionsMessage={() => "Nenhuma opção disponível"}
                  className="text-sm"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '38px',
                      overflowX: "auto",
                      whiteSpace: "nowrap",
                      fontSize: '14px',
                      borderColor: 'rgb(var(--border-secondary))',
                      backgroundColor: 'rgb(var(--bg-secondary))',
                      '&:hover': { borderColor: '#3b82f6', backgroundColor: 'rgb(var(--bg-secondary))' },
                      boxShadow: 'none',
                      padding: '2px 4px',
                      color: 'rgb(var(--text-primary))',
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: 'rgb(var(--bg-secondary))',
                      borderColor: 'rgb(var(--border-secondary))',
                      border: '1px solid rgb(var(--border-secondary))',
                    }),
                    menuList: (base) => ({
                      ...base,
                      backgroundColor: 'rgb(var(--bg-secondary))',
                      color: 'rgb(var(--text-primary))',
                    }),
                    option: (base, state) => ({
                      ...base,
                      fontSize: '14px',
                      backgroundColor: state.isSelected ? '#0066CC' : (state.isFocused ? 'rgb(var(--bg-hover))' : 'rgb(var(--bg-secondary))'),
                      color: state.isSelected ? 'white' : 'rgb(var(--text-primary))',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgb(var(--bg-hover))',
                        color: 'rgb(var(--text-primary))'
                      }
                    }),
                    multiValue: (base) => ({
                      ...base,
                      backgroundColor: '#0066CC',
                      margin: '2px 2px',
                      padding: '0 4px',
                      minWidth: 0,
                    }),
                    multiValueLabel: (base) => ({
                      ...base,
                      color: 'white',
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }),
                    multiValueRemove: (base) => ({
                      ...base,
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#004399',
                        color: 'white',
                      },
                    }),
                    valueContainer: (base) => ({
                      ...base,
                      padding: '2px 4px',
                      maxHeight: '34px',
                      overflowY: 'auto',
                    }),
                    input: (base) => ({
                      ...base,
                      color: 'rgb(var(--text-primary))',
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: 'rgb(var(--text-secondary))',
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: 'rgb(var(--text-primary))',
                    }),
                  }}
                />
              </div>
            </div>

            {/* 2 linha de filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {/* Assunto */}
              <div className="min-w-0">
                <label className="block text-sm font-medium mb-1" style={{ color: `rgb(var(--text-primary))` }}>
                  Assunto
                </label>
                <input
                  type="text"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  placeholder="Digite o assunto"
                  className="w-full min-w-0 px-3 py-2 border rounded text-sm focus:outline-none transition-all"
                />
              </div>

              {/* nome user */}
              <div className="min-w-0">
                <label className="block text-sm font-medium mb-1" style={{ color: `rgb(var(--text-primary))` }}>
                  Nome usuário
                </label>
                <input
                  type="text"
                  value={nomeUsuario}
                  onChange={(e) => setNomeUsuario(e.target.value)}
                  placeholder="Digite o nome"
                  className="w-full min-w-0 px-3 py-2 border rounded text-sm focus:outline-none transition-all"
                />
              </div>

              {/* prioridade - botões visuais */}
              <div className="min-w-0">
                <label className="block text-sm  mb-1" style={{ color: `rgb(var(--text-primary))` }}>
                  Nível de prioridade
                </label>
                <div className="grid grid-cols-5 h-10 rounded-lg overflow-hidden" style={{
                  borderWidth: '1px',
                  borderColor: `rgb(var(--cor-borda-primaria))`
                }}>
                  {/* botao TODOS */}
                  <button
                    type="button"
                    onClick={() => setPrioridadeId('')}
                    className="flex items-center justify-center text-xs font-medium transition-all min-w-0"
                    style={{
                      backgroundColor: prioridadeId === '' ? (theme === 'dark' ? '#555555' : '#1F2937') : `rgb(var(--bg-hover))`,
                      color: prioridadeId === '' ? 'white' : `rgb(var(--text-primary))`,
                    
                      border: 'none',
                      outline: 'none'
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
                        backgroundColor: prioridadeId === String(prioridade.id) ? prioridade.cor : `rgb(var(--bg-hover))`,
                        color: prioridadeId === String(prioridade.id) ? '#FFFFFF' : `rgb(var(--text-primary))`,
              
                        border: 'none',
                        outline: 'none'
                      }}
                    >
                      <span className="truncate px-1">{prioridade.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
           </div>

              <div className="flex items-end gap-6 mt-4">
                {/* Responsável */}
                <div className="flex-none"> {/* flex-none impede que ele cresça ou encolha além do necessário */}
                  <label className="block text-sm font-medium mb-2" style={{ color: `rgb(var(--text-primary))` }}>
                    Responsável
                  </label>
                  <select
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                    className="w-64 px-3 py-2 border rounded text-sm focus:outline-none transition-all"
                  >
                    <option value="">Todos os responsáveis</option>
                    {usuariosAdmin
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((admin) => (
                        <option key={admin.id} value={admin.name}>
                          {admin.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Ocultar concluídos */}
                <div className="flex items-center gap-3 mb-2.5"> {/* items-center coloca na mesma linha e mb-2.5 alinha com o select */}
                  <label className="text-sm font-medium whitespace-nowrap" style={{ color: `rgb(var(--text-primary))` }}>
                    Ocultar concluídos
                  </label>
                  <button
                    type="button"
                    onClick={() => setOcultarConcluidos(!ocultarConcluidos)}
                    className="relative w-10 h-5 rounded-full transition-colors duration-100 shrink-0"
                    style={{
                      backgroundColor: ocultarConcluidos ? "#0066CC" : `rgb(var(--bg-hover))`
                    }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow transform transition-transform duration-100"
                      style={{
                        backgroundColor: `rgb(var(--bg-primary))`,
                        transform: ocultarConcluidos ? "translateX(20px)" : "translateX(0)"
                      }}
                    />
                  </button>
                </div>
              </div>
              
            {/* botoes de acoes dos filtros */}
            <div className="flex gap-3 mt-6 justify-end flex-nowrap overflow-x-auto whitespace-nowrap pb-2">
              <button
                onClick={limparFiltros}
                className="px-6 py-2 rounded transition-all font-medium text-sm hover:shadow-md active:scale-95"
                style={{
                  backgroundColor: `rgb(var(--bg-hover))`,
                  color: `rgb(var(--text-primary))`
                }}
              >
                Limpar Filtros
              </button>
              <button
                onClick={() => pesquisarChamados(1)}
                disabled={loading}
                className="px-6 py-2 text-white rounded font-medium text-sm transition-all hover:shadow-md active:scale-95"
                style={{
                  backgroundColor: loading ? '#0066CC' : 'rgb(var(--cor-botao-primario))',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Pesquisando...' : 'Pesquisar'}
              </button>
            </div>
          </div>
              </motion.div>
          )}

          {/* pequena setinha que oculta os filtros no modo tabela */}
          {viewMode === 'table' && (
       <div className="flex justify-center" style={{
          backgroundColor: `rgb(var(--bg-elevated))`,
          borderBottomColor: `rgb(var(--border-secondary))`,
          borderBottomWidth: '0px'
        }}>
          <button
            type="button"
            onClick={() => setFiltrosVisiveis(!filtrosVisiveis)}
            className="flex items-center transition-colors space-x-1 py-2" style={{ color: `rgb(var(--text-tertiary))` }}>
            <span className="select-none">.............</span>

            <HiOutlineChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${filtrosVisiveis ? 'rotate-180' : ''}`}
            />

            <span className="select-none">.............</span>
          </button>
        </div>
          )}

          {/* acao em multiplos registros - Visível apenas no modo tabela */}
          {chamados.length > 0 && viewMode === 'table' && (
            <div className="px-3 py-2 border-b flex gap-3 items-center flex-nowrap overflow-x-auto whitespace-nowrap" style={{
              backgroundColor: `rgb(var(--bg-secondary))`,
              borderBottomColor: `rgb(var(--border-secondary))`
            }}>
              <button
                onClick={marcarComoResolvido}
                disabled={chamadosSelecionados.length === 0}
                className="action-button px-5 py-2 rounded transition-all font-medium text-sm hover:shadow-md active:scale-95"
                style={{
                  backgroundColor: chamadosSelecionados.length === 0 ? `rgb(var(--bg-disabled))` : `rgb(var(--cor-botao-primario))`,
                  color: chamadosSelecionados.length === 0 ? `rgb(var(--text-disabled))` : 'white',
                  borderWidth: '0px',
                  cursor: chamadosSelecionados.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: chamadosSelecionados.length === 0 ? 0.5 : 1
                }}
              >
                Marcar como resolvido
              </button>
              <button
                onClick={editarMultiplos}
                disabled={chamadosSelecionados.length === 0}
                className="action-button px-5 py-2 rounded transition-all font-medium text-sm hover:shadow-md active:scale-95"
                style={{
                  backgroundColor: chamadosSelecionados.length === 0 ? `rgb(var(--bg-disabled))` : `rgb(var(--cor-botao-primario))`,
                  color: chamadosSelecionados.length === 0 ? `rgb(var(--text-disabled))` : 'white',
                  borderWidth: '0px',
                  cursor: chamadosSelecionados.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: chamadosSelecionados.length === 0 ? 0.5 : 1
                }}
              >
                Editar Múltiplos
              </button>
              <button
                onClick={atribuirAMim}
                disabled={chamadosSelecionados.length === 0}
                className="action-button px-5 py-2 rounded transition-all font-medium text-sm hover:shadow-md active:scale-95"
                style={{
                  backgroundColor: chamadosSelecionados.length === 0 ? `rgb(var(--bg-disabled))` : `rgb(var(--cor-botao-primario))`,
                  color: chamadosSelecionados.length === 0 ? `rgb(var(--text-disabled))` : 'white',
                  borderWidth: '0px',
                  cursor: chamadosSelecionados.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: chamadosSelecionados.length === 0 ? 0.5 : 1
                }}
              >
                Atribuir a mim
              </button>
              {chamadosSelecionados.length > 0 && (
                <span className="text-sm flex items-center ml-2" style={{ color: `rgb(var(--text-secondary))` }}>
                  {chamadosSelecionados.length} selecionado(s)
                </span>
              )}
            </div>
          )}

          {/* Visualização Principal - Tabela ou Kanban */}
          <div>
            {loading ? (
              <div className="p-8 text-center" style={{ color: `rgb(var(--text-secondary))` }}>
                Carregando chamados...
              </div>
            ) : viewMode === 'kanban' ? (
              /* Visualização Kanban */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="p-4"
              >
                <KanbanView
                  tickets={chamados}
                  onTicketClick={handleTicketClick}
                  onTicketUpdate={handleTicketUpdate}
                  departamentos={departamentos}
                  statusList={statusList}
                  prioridades={prioridades}
                  usuarios={usuariosAdmin}
                  topicosAjuda={topicosAjuda}
                />
              </motion.div>
            ) : (
              /* Visualização Tabela Original */
              chamados.length === 0 ? (
                <div className="p-8 text-center" style={{  
                  color: `rgb(var(--text-secondary))`,
                  backgroundColor: `rgb(var(--bg-elevated))`
                }}>
                  Nenhum chamado encontrado. Use os filtros para pesquisar.
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
              <>
                {/* filtro de abas no topo da tabela */}
                <div className="px-3 py-3 flex gap-4 items-center justify-between" style={{
                  backgroundColor: `rgb(var(--bg-elevated))`,
                  borderBottomColor: `rgb(var(--border-secondary))`,
                  borderBottomWidth: '1px'
                }}>
                 <div className="flex overflow-hidden rounded-lg shadow-sm w-max" style={{

                  borderColor: `rgb(var(--cor-borda-primaria))`,
                  borderWidth: '1px',
                   backgroundColor: `rgb(var(--bg-secondary))`
                 }}>
                  {(['todos', 'meus', 'outros'] as const).map((aba) => {
                    const labels = {
                      todos: 'Todos',
                      meus: 'Meus',
                      outros: 'Outros'
                    };

                    return (
                      <button
                        key={aba}
                        onClick={() => setAbaFiltro(aba)}
                        className={`
                          px-4 py-1 text-[13px] font-medium transition-all duration-200
                          ${aba === 'todos' ? 'rounded-l-lg' : ''} 
                          ${aba === 'outros' ? 'rounded-r-lg' : ''} 
                        `}
                        style={abaFiltro === aba ? {
                          backgroundColor: `rgb(var(--bg-cinzaescuro))`,
                          color: 'white',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                        } : {
                          color: `rgb(var(--text-primary))`
                        }}
                      >
                        {labels[aba]}
                      </button>
                    );
                  })}
                </div>

                </div>

                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full">
                    <thead style={{
                      backgroundColor: `rgb(var(--bg-secondary))`,
                      borderBottomColor: `rgb(var(--border-secondary))`,
                      borderBottomWidth: '1px'
                    }}>
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={todosChecados}
                            onChange={handleCheckAll}
                            className="theme-checkbox"
                          />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none min-w-20"
                          style={{ color: `rgb(var(--text-primary))` }}
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
                          className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none min-w-20"
                          style={{ color: `rgb(var(--text-primary))` }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)} 
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                          className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none min-w-50"
                          style={{ color: `rgb(var(--text-primary))` }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)} 
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          onClick={() => handleOrdenar('resumo')}
                        >
                          <div className="flex items-center gap-1">
                            Assunto
                            {ordenarPor === 'resumo' && (
                              <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none min-w-40"
                          style={{ color: `rgb(var(--text-primary))` }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)} 
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                          className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none min-w-50"
                          style={{ color: `rgb(var(--text-primary))` }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)} 
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                          className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none min-w-38"
                          style={{ color: `rgb(var(--text-primary))` }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)} 
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                          className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none min-w-30"
                          style={{ color: `rgb(var(--text-primary))` }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)} 
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                          className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none min-w-25"
                          style={{ color: `rgb(var(--text-primary))` }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)} 
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                          className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none min-w-25"
                          style={{ color: `rgb(var(--text-primary))` }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)} 
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                          className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none min-w-50"
                          style={{ color: `rgb(var(--text-primary))` }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)} 
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          onClick={() => handleOrdenar('responsavel')}
                        >
                          <div className="flex items-center gap-1">
                            Responsável
                            {ordenarPor === 'responsavel' && (
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
                          className={`transition-colors cursor-pointer ${linhaAnimando === chamado.id ? 'slideOutLeft' : ''}`}
                          style={{
                            backgroundColor: index % 2 === 0 ? `rgb(var(--bg-primary))` : `rgb(var(--bg-secondary))`,
                            borderBottomColor: `rgb(var(--border-secondary))`,
                            borderBottomWidth: '1px'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? `rgb(var(--bg-primary))` : `rgb(var(--bg-secondary))`)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={chamadosSelecionados.includes(chamado.id)}
                              onChange={() => handleCheckChamado(chamado.id)}
                              className="theme-checkbox"
                            />
                          </td>
                          {/* Código chamado */}
                          <td className="px-4 py-3 text-sm font-medium whitespace-nowrap" style={{ color: `rgb(var(--text-primary))` }}>
                            {chamado.numeroChamado || chamado.id}
                          </td>
                          {/* Prioridade */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: chamado.tipoPrioridade?.cor || '#gray' }}
                              ></div>
                              <span className="text-sm" style={{ color: `rgb(var(--text-primary))` }}>
                                {chamado.tipoPrioridade?.nome || '-'}
                              </span>
                            </div>
                          </td>
                          {/* Assunto/Resumo */}
                          <td className="px-4 py-3 text-sm max-w-50 truncate overflow-hidden text-ellipsis" style={{ color: `rgb(var(--text-primary))` }} title={chamado.resumoChamado}>
                            {chamado.resumoChamado}
                          </td>
                          {/* Usuário */}
                          <td className="px-4 py-3 text-sm max-w-30 truncate overflow-hidden text-ellipsis" style={{ color: `rgb(var(--text-primary))` }} title={chamado.usuario?.name}>
                            {chamado.usuario?.name || '-'}
                          </td>
                          {/* Departamento */}
                          <td className="px-4 py-3 text-sm max-w-30 truncate overflow-hidden text-ellipsis" style={{ color: `rgb(var(--text-primary))` }} title={chamado.departamento?.nome || chamado.departamento?.name}>
                            {chamado.departamento?.nome || chamado.departamento?.name || '-'}
                          </td>
                          {/* Tópico */}
                          <td className="px-4 py-3 text-sm max-w-38 truncate overflow-hidden text-ellipsis" style={{ color: `rgb(var(--text-primary))` }} title={chamado.topicoAjuda?.nome}>
                            {chamado.topicoAjuda?.nome || '-'}
                          </td>
                          {/* Status */}
                          <td className="px-1 py-1 text-center whitespace-nowrap">
                            <span
                              className="px-2 py-1 rounded-full text-xs border font-medium"
                              style={{
                                backgroundColor: `rgb(var(--status-${chamado.status.id}-bg))`,
                                color: `rgb(var(--status-${chamado.status.id}-texto))`,
                                borderColor: `rgb(var(--status-${chamado.status.id}-borda))`,
                                borderWidth: '1.5px'
                              }}
                            >
                              {chamado.status?.nome || 'Desconhecido'}
                            </span>
                          </td>
                          {/* Data Abertura */}
                          <td className="px-1 py-3 text-sm whitespace-nowrap" style={{ color: `rgb(var(--text-secondary))` }}>
                            {formatarData(chamado.dataAbertura)}
                          </td>
                          {/* Data Fechamento */}
                          <td className="px-1 py-3 text-sm whitespace-nowrap" style={{ color: `rgb(var(--text-secondary))` }}>
                            {formatarData(chamado.dataFechamento)}
                          </td>
                          {/* Responsável */}
                          <td className="px-4 py-3 text-sm max-w-30 truncate overflow-hidden text-ellipsis" style={{ color: `rgb(var(--text-primary))` }} title={chamado.userResponsavel?.name}>
                            {chamado.userResponsavel?.name || (
                              <span className="italic" style={{ color: `rgb(var(--text-secondary))` }}>Não atribuído</span>
                            )}
                          </td>
                        </tr>))}
                    </tbody>
                  </table>
                </div>

                {/* modo mobile, exibir tipo uns cards */}
                <div className="md:hidden space-y-3 p-3">
                  {chamadosOrdenados.map((chamado) => (
                    <div
                      key={chamado.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                          return;
                        }
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
                        }, 240);
                      }}
                      className={`rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                        linhaAnimando === chamado.id ? 'slideOutLeft' : ''
                      }`}
                      style={{
                        backgroundColor: `rgb(var(--bg-elevated))`,
                        borderColor: `rgb(var(--border-secondary))`,
                        borderWidth: '1px'
                      }}
                    >
                      {/* header: Assunto e Checkbox */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base mb-1 line-clamp-2" style={{ color: `rgb(var(--text-primary))` }}>
                            {chamado.resumoChamado}
                          </h3>
                          <p className="text-xs" style={{ color: `rgb(var(--text-secondary))` }}>
                            #{chamado.numeroChamado || chamado.id}
                          </p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()} className="ml-2">
                          <input
                            type="checkbox"
                            checked={chamadosSelecionados.includes(chamado.id)}
                            onChange={() => handleCheckChamado(chamado.id)}
                            className="theme-checkbox"
                          />
                        </div>
                      </div>

                      {/* info: topico e Departamento */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-start">
                          <span className="text-xs w-24 shrink-0" style={{ color: `rgb(var(--text-secondary))` }}>Tópico:</span>
                          <span className="text-xs font-medium" style={{ color: `rgb(var(--text-primary))` }}>{chamado.topicoAjuda?.nome || '-'}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="text-xs w-24 shrink-0" style={{ color: `rgb(var(--text-secondary))` }}>Departamento:</span>
                          <span className="text-xs font-medium" style={{ color: `rgb(var(--text-primary))` }}>{chamado.departamento?.nome || chamado.departamento?.name || '-'}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="text-xs w-24 shrink-0" style={{ color: `rgb(var(--text-secondary))` }}>Usuário:</span>
                          <span className="text-xs font-medium" style={{ color: `rgb(var(--text-primary))` }}>{chamado.usuario?.name || '-'}</span>
                        </div>
                      </div>

                      {/* badges: prioridade e Status */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{
                          backgroundColor: `rgb(var(--bg-secondary))`,
                          borderColor: `rgb(var(--border-secondary))`
                        }}>
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: chamado.tipoPrioridade?.cor || '#gray' }}
                          ></div>
                          <span className="text-xs font-medium" style={{ color: `rgb(var(--text-primary))` }}>
                            {chamado.tipoPrioridade?.nome || '-'}
                          </span>
                        </div>
                        <span
                          className="px-3 py-1.5 rounded-full text-xs font-medium border"
                          style={{
                            backgroundColor: `rgb(var(--status-${chamado.status.id}-bg))`,
                            color: `rgb(var(--status-${chamado.status.id}-texto))`,
                            borderColor: `rgb(var(--status-${chamado.status.id}-borda))`,
                            borderWidth: '1.5px'
                          }}
                        >
                          {chamado.status?.nome || 'Desconhecido'}
                        </span>
                      </div>

                      {/* footer data de Abertura */}
                      <div className="flex items-center justify-between text-xs pt-2" style={{
                        color: `rgb(var(--text-secondary))`,
                        borderTopColor: `rgb(var(--border-secondary))`,
                        borderTopWidth: '1px'
                      }}>
                        <span>{formatarData(chamado.dataAbertura)}</span>
                        {chamado.dataFechamento && (
                          <span>Fechado: {formatarData(chamado.dataFechamento)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
                </motion.div>
              )
            )}
          </div>

          {/* Controles de Paginação - Apenas no modo tabela */}
          {chamados.length > 0 && viewMode === 'table' && (
            <div className="px-6 py-4 border-t" style={{
              backgroundColor: `rgb(var(--bg-secondary))`,
              borderTopColor: `rgb(var(--border-secondary))`
            }}>
              {/* Seletor de registros por página */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium" style={{ color: `rgb(var(--text-primary))` }}>
                    Registros por página:
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value));
                      setPaginaAtual(1);
                    }}
                    className="px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 text-sm"
                    style={{
                      borderColor: `rgb(var(--border-secondary))`,
                      backgroundColor: `rgb(var(--bg-primary))`,
                      color: `rgb(var(--text-primary))`
                    }}
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="40">40</option>
                    <option value="50">50</option>
                  </select>
                </div>
                <div className="text-sm" style={{ color: `rgb(var(--text-secondary))` }}>
                  Mostrando {(paginaAtual - 1) * pageSize + 1} a {Math.min(paginaAtual * pageSize, totalChamados)} de {totalChamados} chamado(s)
                </div>
              </div>

              {/* Controles de navegação */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => pesquisarChamados(paginaAtual - 1)}
                  disabled={paginaAtual === 1 || loading}
                  className="px-4 py-2 rounded transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: `rgb(var(--bg-hover))`,
                    color: `rgb(var(--text-primary))`
                  }}
                  onMouseEnter={(e) => !((e.target as HTMLButtonElement).disabled) && (e.currentTarget.style.backgroundColor = `rgb(var(--bg-active))`)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)}
                >
                  ← Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => pesquisarChamados(page)}
                      className="px-3 py-2 rounded font-medium text-sm transition-colors"
                      style={paginaAtual === page ? {
                        backgroundColor: '#0066CC',
                        color: 'white'
                      } : {
                        backgroundColor: `rgb(var(--bg-secondary))`,
                        color: `rgb(var(--text-primary))`
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => pesquisarChamados(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas || loading}
                  className="px-4 py-2 rounded transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: `rgb(var(--bg-hover))`,
                    color: `rgb(var(--text-primary))`
                  }}
                  onMouseEnter={(e) => !((e.target as HTMLButtonElement).disabled) && (e.currentTarget.style.backgroundColor = `rgb(var(--bg-active))`)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)}
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
          <div className="shadow-2xl w-full max-w-3xl transform transition-all rounded-md" style={{
            backgroundColor: `rgb(var(--bg-primary))`
          }}>
            {/* header */}
            <div className="bg-linear-to-r from-[#001933] to-[#1A4877] px-6 py-4 rounded-md">
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
      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: `rgb(var(--text-secondary))` }}>
        Prioridade
      </label>
      <select
        value={novaPrioridadeId}
        onChange={(e) => setNovaPrioridadeId(e.target.value)}
        className="w-full px-3 py-2 border rounded-md focus:ring-1 text-sm transition-all"
        style={{
          borderColor: `rgb(var(--border-secondary))`,
          color: `rgb(var(--text-primary))`,
          backgroundColor: `rgb(var(--bg-secondary))`
        }}
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
      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: `rgb(var(--text-secondary))` }}>
        Departamento
      </label>
      <select
        value={novoDepartamentoId}
        onChange={(e) => setNovoDepartamentoId(e.target.value)}
        className="w-full px-3 py-2 border rounded-md text-sm transition-all"
        style={{
          borderColor: `rgb(var(--border-secondary))`,
          color: `rgb(var(--text-primary))`,
          backgroundColor: `rgb(var(--bg-secondary))`
        }}
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
      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: `rgb(var(--text-secondary))` }}>
        Status
      </label>
      <select
        value={novoStatusId}
        onChange={(e) => setNovoStatusId(e.target.value)}
        className="w-full px-3 py-2 border rounded-md focus:ring-1 text-sm transition-all"
        style={{
          borderColor: `rgb(var(--border-secondary))`,
          color: `rgb(var(--text-primary))`,
          backgroundColor: `rgb(var(--bg-secondary))`
        }}
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
      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: `rgb(var(--text-secondary))` }}>
        Tópico de ajuda
      </label>
      <select
        value={novoTopicoAjudaId}
        onChange={(e) => setNovoTopicoAjudaId(e.target.value)}
        className="w-full px-3 py-2 border rounded-md focus:ring-1 text-sm transition-all"
        style={{
          borderColor: `rgb(var(--border-secondary))`,
          color: `rgb(var(--text-primary))`,
          backgroundColor: `rgb(var(--bg-secondary))`
        }}
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

  <div className="mb-8 p-4 rounded-lg" style={{
    backgroundColor: `rgb(var(--bg-secondary))`,
    borderColor: `rgb(var(--border-secondary))`,
    borderWidth: '1px'
  }}>
    <div className="flex items-center gap-2 mb-3">
      <svg className="w-4 h-4 text-[#1A00FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h4 className="text-sm font-semibold" style={{ color: `rgb(var(--text-primary))` }}>Redirecionar Chamado</h4>
    </div>
    
    <select
      value={novoResponsavelId}
      onChange={(e) => setNovoResponsavelId(e.target.value)}
      className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 text-sm"
      style={{
        borderColor: `rgb(var(--border-secondary))`,
        color: `rgb(var(--text-primary))`,
        backgroundColor: `rgb(var(--bg-primary))`
      }}
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
    <p className="mt-2 text-[14px] italic" style={{ color: `rgb(var(--text-secondary))` }}>
      * Apenas chamados sob sua responsabilidade podem ser redirecionados.
    </p>
  </div>

  {/* Botões */}
  <div className="flex gap-3 justify-end pt-6" style={{
    borderTopColor: `rgb(var(--border-secondary))`,
    borderTopWidth: '1px'
  }}>
    <button
      onClick={fecharModalEdicao}
      disabled={submittingEdicao}
      className="px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: 'transparent',
        borderWidth: '1px',
        borderColor: `rgb(var(--border-secondary))`,
        color: `rgb(var(--text-primary))`
      }}
      onMouseEnter={(e) => !((e.target as HTMLButtonElement).disabled) && (e.currentTarget.style.backgroundColor = `rgb(var(--bg-hover))`)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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

      {/* modal de novochamado */}
      <ModalNovoChamado
        isOpen={modalNovoChamadoAberto}
        onClose={() => setModalNovoChamadoAberto(false)}
        onSuccess={() => {
         //atualizar os chamdos depois de criar 
          pesquisarChamados(paginaAtual);
        }}
      />

      {/* modal de editar chamado individual */}
      {chamadoIdEditar && (
        <ModalEditarChamadoAdmin
          isOpen={modalEditarChamadoAberto}
          onClose={() => {
            setModalEditarChamadoAberto(false);
            setChamadoIdEditar(null);
          }}
          onSuccess={handleSucessoEdicaoChamado}
          chamadoId={chamadoIdEditar}
        />
      )}
    </div>
  );
}