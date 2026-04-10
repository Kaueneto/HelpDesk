'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import api from '@/services/api';
import DatePicker from 'react-datepicker';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '@/utils/passwordValidation';
import { useAuth } from '@/contexts/AuthContext';
import ActionButton from './ActionButton';

interface Usuario {
  id: number;
  name: string;
  email: string;
  situationUserId: number;
  situationUser: {
    id: number;
    nomeSituacao: string;
  };
  roleId: number;
  role: {
    id: number;
    nome: string;
  };
  createdAt: string;
  updatedAt: string;
  tentativasLogin?: number;
  dataInativacao?: string | null;
  motivoInativacao?: string | null;
}

interface SituationUser {
  id: number;
  nomeSituacao: string;
  createdAt: string;
  updatedAt: string;
}

export default function GerenciarUsuarios() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  
  // Filtros
  const [dataCadastroInicio, setDataCadastroInicio] = useState<Date | null>(null);
  const [dataCadastroFim, setDataCadastroFim] = useState<Date | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [situationUserId, setSituationUserId] = useState('');

  // Dados
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [situacoes, setSituacoes] = useState<SituationUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Ordenação
  const [ordenarPor, setOrdenarPor] = useState<'id' | 'name' | 'email' | 'role' | 'situationUser' | 'createdAt' | 'updatedAt' | null>(null);
  const [direcaoOrdem, setDirecaoOrdem] = useState<'asc' | 'desc'>('asc');

  // Seleção múltipla
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<number[]>([]);
  const [todosChecados, setTodosChecados] = useState(false);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const pageSize = 10;

  // Modal de cadastro
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [novoUsuarioNome, setNovoUsuarioNome] = useState('');
  const [novoUsuarioEmail, setNovoUsuarioEmail] = useState('');
  const [novoUsuarioSenha, setNovoUsuarioSenha] = useState('padrao');
  const [novoUsuarioSituationUserId, setNovoUsuarioSituationUserId] = useState(1); // 1 = Ativo por padrão
  const [novoUsuarioRoleId, setNovoUsuarioRoleId] = useState(2); // 2 = Usuário comum por padrão
  const [submittingCadastro, setSubmittingCadastro] = useState(false);

  // Modal de edição
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [editandoUsuarioId, setEditandoUsuarioId] = useState<number | null>(null);
  const [editandoUsuarioNome, setEditandoUsuarioNome] = useState('');
  const [editandoUsuarioEmail, setEditandoUsuarioEmail] = useState('');
  const [editandoUsuarioSituationUserId, setEditandoUsuarioSituationUserId] = useState(1);
  const [editandoUsuarioRoleId, setEditandoUsuarioRoleId] = useState(2);
  const [submittingEdicao, setSubmittingEdicao] = useState(false);

  // Carregar situações ao montar o componente
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    
    const carregarSituacoes = async () => {
      if (!isAuthenticated) return;
      
      try {
        const response = await api.get('/SituationsUsers');
        setSituacoes(response.data);
      } catch (error) {

      }
    };
    carregarSituacoes();
  }, [isAuthenticated, authLoading]);

  const carregarUsuarios = async (pageOrEvent?: number | React.MouseEvent<HTMLButtonElement>) => {
    if (!isAuthenticated) return; // Proteção adicional
    
    const page = typeof pageOrEvent === 'number' ? pageOrEvent : 1;
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };
      
      if (dataCadastroInicio) params.dataCadastroInicio = dataCadastroInicio.toISOString();
      if (dataCadastroFim) {
        const fim = new Date(dataCadastroFim);
        fim.setHours(23, 59, 59, 999);
        params.dataCadastroFim = fim.toISOString();
      }
      if (nome) params.nome = nome;
      if (email) params.email = email;
      if (situationUserId !== '') params.situationUserId = situationUserId;

      const response = await api.get('/users', { params });
      setUsuarios(response.data.usuarios || response.data);
      setTotalUsuarios(response.data.total || response.data.length);
      setTotalPaginas(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / pageSize));
      setPaginaAtual(page);
      setUsuariosSelecionados([]);
      setTodosChecados(false);
    } catch (error) {
   
      alert('Erro ao buscar usuários');
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = () => {
    setDataCadastroInicio(null);
    setDataCadastroFim(null);
    setNome('');
    setEmail('');
    setSituationUserId('');
    setUsuarios([]);
    setUsuariosSelecionados([]);
    setTodosChecados(false);
    setPaginaAtual(1);
    setTotalPaginas(0);
    setTotalUsuarios(0);
  };

  const handleCheckAll = () => {
    if (todosChecados) {
      setUsuariosSelecionados([]);
      setTodosChecados(false);
    } else {
      setUsuariosSelecionados(usuarios.map(u => u.id));
      setTodosChecados(true);
    }
  };

  const handleCheckUsuario = (usuarioId: number) => {
    if (usuariosSelecionados.includes(usuarioId)) {
      setUsuariosSelecionados(usuariosSelecionados.filter(id => id !== usuarioId));
      setTodosChecados(false);
    } else {
      const novaSeleção = [...usuariosSelecionados, usuarioId];
      setUsuariosSelecionados(novaSeleção);
      if (novaSeleção.length === usuarios.length) {
        setTodosChecados(true);
      }
    }
  };

  const handleOrdenar = (coluna: 'id' | 'name' | 'email' | 'role' | 'situationUser' | 'createdAt' | 'updatedAt') => {
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

  // ordernar usuarios
  const usuariosOrdenados = ordenarPor ? [...usuarios].sort((a, b) => {
    let valorA: any;
    let valorB: any;

    if (ordenarPor === 'role') {
      valorA = a.role?.nome?.toLowerCase() || '';
      valorB = b.role?.nome?.toLowerCase() || '';
    } else if (ordenarPor === 'situationUser') {
      valorA = a.situationUser?.nomeSituacao?.toLowerCase() || '';
      valorB = b.situationUser?.nomeSituacao?.toLowerCase() || '';
    } else if (ordenarPor === 'name' || ordenarPor === 'email') {
      valorA = a[ordenarPor].toLowerCase();
      valorB = b[ordenarPor].toLowerCase();
    } else if (ordenarPor === 'createdAt' || ordenarPor === 'updatedAt') {
      valorA = new Date(a[ordenarPor]).getTime();
      valorB = new Date(b[ordenarPor]).getTime();
    } else {
      valorA = a[ordenarPor];
      valorB = b[ordenarPor];
    }

    if (valorA < valorB) return direcaoOrdem === 'asc' ? -1 : 1;
    if (valorA > valorB) return direcaoOrdem === 'asc' ? 1 : -1;
    return 0;
  }) : usuarios;

  const resetarSenha = async () => {
    if (usuariosSelecionados.length === 0) {
      alert('Selecione ao menos um usuário');
      return;
    }

    if (!confirm(`Deseja resetar a senha de ${usuariosSelecionados.length} usuário(s)? A nova senha será "padrao"`)) {
      return;
    }

    try {
      await api.patch('/users/resetar-senha-multiplos', {
        usuariosIds: usuariosSelecionados,
      });

      alert('Senhas resetadas com sucesso!');
      await carregarUsuarios();
    } catch (error) {
    
      alert('Erro ao resetar senhas');
    }
  };

  const desativarUsuarios = async () => {
    if (usuariosSelecionados.length === 0) {
      alert('Selecione ao menos um usuário');
      return;
    }

    if (!confirm(`Deseja desativar ${usuariosSelecionados.length} usuário(s)?`)) {
      return;
    }

    //pedir motivo da inativacao de usuario
    const motivo = prompt(
      'Digite o motivo da inativação dos usuários selecionados:\n\n'
    );

    if (!motivo || !motivo.trim()) {
      alert('Motivo da inativação é obrigatório para prosseguir.');
      return;
    }

    // Buscar ID da situação "inativo"
    const situacaoInativa = situacoes.find(s => s.nomeSituacao.toLowerCase() === 'inativo');
    if (!situacaoInativa) {
      alert('Situação "inativo" não encontrada. Cadastre-a primeiro.');
      return;
    }

    try {
      await api.patch('/users/desativar-multiplos', {
        usuariosIds: usuariosSelecionados,
        situationUserId: situacaoInativa.id,
        motivoInativacao: motivo.trim(),
      });

      alert('Usuários desativados com sucesso!');
      await carregarUsuarios();
    } catch (error) {
    
      alert('Erro ao desativar usuários');
    }
  };

  const excluirUsuarios = async () => {
    if (usuariosSelecionados.length === 0) {
      alert('Selecione ao menos um usuário');
      return;
    }

    // Primeira confirmação
    if (!confirm(`AVISO: Você está prestes a excluir ${usuariosSelecionados.length} usuário(s) permanentemente.\n\n• Usuários que criaram chamados não poderão ser excluídos (para preservar histórico)\n• Usuários responsáveis/finalizadores de chamados serão removidos dos chamados\n• Esta ação é IRREVERSÍVEL\n\nDeseja continuar?`)) {
      return;
    }

    // Segunda confirmação com input
    const confirmacao = prompt(
      'Esta é uma ação irreversível! Digite "EXCLUIR" para confirmar a exclusão:'
    );

    if (confirmacao !== 'EXCLUIR') {
      alert('Confirmação incorreta. Exclusão cancelada.');
      return;
    }

    try {

      const payload = {
        usuariosIds: usuariosSelecionados,
      };
      
      const response = await api.delete('/users/excluir-multiplos', {
        data: payload
      });
      
      alert(response.data.mensagem || 'Usuários excluídos com sucesso!');
      await carregarUsuarios(1);
    } catch (error: any) {

      
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao excluir usuários';
      const detalhesErro = error.response?.data?.erro ? `\n\nDetalhes: ${error.response.data.erro}` : '';
      
      if (error.response?.status === 400) {
        //erros de validacao
        alert(`EXCLUSÃO INTERROMPIDA\n\n${mensagemErro}\n\n .`);
      } else {
        alert(mensagemErro + detalhesErro);
      }
    }
  };

  const ativarUsuarios = async () => {
    if (usuariosSelecionados.length === 0) {
      alert('Selecione ao menos um usuário');
      return;
    }

    if (!confirm(`Deseja ativar ${usuariosSelecionados.length} usuário(s)? `)) {
      return;
    }

    //buscar id da situacao 'ativo'
    const situacaoAtiva = situacoes.find(s => s.nomeSituacao.toLowerCase() === 'ativo');
    if (!situacaoAtiva) {
      alert('Situação "ativo" não encontrada. Cadastre-a primeiro.');
      return;
    }

    try {
      await api.patch('/users/ativar-multiplos', {
        usuariosIds: usuariosSelecionados,
        situationUserId: situacaoAtiva.id,
      });

      alert('Usuários ativados com sucesso!');
      await carregarUsuarios();
    } catch (error) {

      alert('Erro ao ativar usuários');
    }
  };

  const abrirModalCadastro = () => {
    setModalCadastroAberto(true);
    setNovoUsuarioNome('');
    setNovoUsuarioEmail('');
    setNovoUsuarioSenha('padrao');
    setNovoUsuarioSituationUserId(1); // Padrão: Ativo
    setNovoUsuarioRoleId(2);
  };

  const fecharModalCadastro = () => {
    setModalCadastroAberto(false);
    setNovoUsuarioNome('');
    setNovoUsuarioEmail('');
    setNovoUsuarioSenha('padrao');
    setNovoUsuarioSituationUserId(1);
    setNovoUsuarioRoleId(2);
  };

  const cadastrarUsuario = async () => {
    if (!novoUsuarioNome.trim()) {
      alert('O nome é obrigatório');
      return;
    }

    if (!novoUsuarioEmail.trim()) {
      alert('O e-mail é obrigatório');
      return;
    }

    // validar força da senha
    if (novoUsuarioSenha !== "padrao") {
      const passwordValidation = validatePassword(novoUsuarioSenha);
      if (!passwordValidation.isValid) {
        alert('Senha não atende aos critérios de segurança:\n\n' + passwordValidation.errors.join('\n'));
        return;
      }
    }

    setSubmittingCadastro(true);
    try {
      await api.post('/users', {
        name: novoUsuarioNome,
        email: novoUsuarioEmail,
        password: novoUsuarioSenha,
        situationUserId: novoUsuarioSituationUserId,
        roleId: novoUsuarioRoleId,
      });

      alert('Usuário cadastrado com sucesso!');
      fecharModalCadastro();
      await carregarUsuarios(1);
    } catch (error: any) {
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao cadastrar usuário';
      alert(Array.isArray(mensagemErro) ? mensagemErro.join('\n') : mensagemErro);
    } finally {
      setSubmittingCadastro(false);
    }
  };

  const abrirModalEdicao = () => {
    if (usuariosSelecionados.length !== 1) {
      alert('Selecione apenas um usuário para editar');
      return;
    }

    const usuarioId = usuariosSelecionados[0];
    const usuario = usuarios.find(u => u.id === usuarioId);

    if (!usuario) {
      alert('Usuário não encontrado');
      return;
    }

    setEditandoUsuarioId(usuario.id);
    setEditandoUsuarioNome(usuario.name);
    setEditandoUsuarioEmail(usuario.email);
    setEditandoUsuarioSituationUserId(usuario.situationUserId);
    setEditandoUsuarioRoleId(usuario.roleId);
    setModalEdicaoAberto(true);
  };

  const fecharModalEdicao = () => {
    setModalEdicaoAberto(false);
    setEditandoUsuarioId(null);
    setEditandoUsuarioNome('');
    setEditandoUsuarioEmail('');
    setEditandoUsuarioSituationUserId(1);
    setEditandoUsuarioRoleId(2);
  };

  const salvarEdicaoUsuario = async () => {
    if (!editandoUsuarioNome.trim()) {
      alert('O nome é obrigatório');
      return;
    }

    if (!editandoUsuarioEmail.trim()) {
      alert('O e-mail é obrigatório');
      return;
    }

    if (!editandoUsuarioId) {
      alert('ID do usuário não encontrado');
      return;
    }

    setSubmittingEdicao(true);
    try {
      await api.put(`/users/${editandoUsuarioId}`, {
        name: editandoUsuarioNome,
        email: editandoUsuarioEmail,
        situationUserId: editandoUsuarioSituationUserId,
        roleId: editandoUsuarioRoleId,
      });

      alert('Usuário atualizado com sucesso!');
      fecharModalEdicao();
      await carregarUsuarios(paginaAtual);
    } catch (error: any) {
     
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao atualizar usuário';
      alert(Array.isArray(mensagemErro) ? mensagemErro.join('\n') : mensagemErro);
    } finally {
      setSubmittingEdicao(false);
    }
  };

  const formatarData = (data: string) => {
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
    <>
      <div className="px-6 py-4" style={{ backgroundColor: theme.brand.subHeader }}>
        <h2 className="text-white text-2xl font-semibold">Gerenciar Usuários</h2>
      </div>

      <div className="p-2" style={{ backgroundColor: theme.background.surface }}>
        <div className="rounded-lg shadow-lg overflow-hidden" style={{ backgroundColor: theme.background.card, border: `1px solid ${theme.border.primary}` }}>
          {/* Botões de ação acima dos filtros */}
          <div className="px-6 py-3 border-b flex gap-4" style={{ backgroundColor: theme.background.surface, borderColor: theme.border.primary }}>
            <ActionButton
              type="novo"
              label="Novo"
              onClick={abrirModalCadastro}
            />
            <ActionButton
              type="resetarSenha"
              label="Resetar Senha"
              onClick={resetarSenha}
              disabled={usuariosSelecionados.length === 0}
            />
            <ActionButton
              type="editar"
              label="Editar"
              onClick={abrirModalEdicao}
              disabled={usuariosSelecionados.length !== 1}
            />
            <ActionButton
              type="desativar"
              label="Desativar"
              onClick={desativarUsuarios}
              disabled={usuariosSelecionados.length === 0}
            />
            <ActionButton
              type="ativar"
              label="Ativar"
              onClick={ativarUsuarios}
              disabled={usuariosSelecionados.length === 0}
            />
            <ActionButton
              type="excluir"
              label="Excluir"
              onClick={excluirUsuarios}
              disabled={usuariosSelecionados.length === 0}
            />
            {usuariosSelecionados.length > 0 && (
              <span className="text-sm flex items-center ml-2" style={{ color: theme.text.secondary }}>
                {usuariosSelecionados.length} selecionado(s)
              </span>
            )}
          </div>

          {/* Área de Filtros */}
          <div className="p-6 border-b" style={{ backgroundColor: theme.background.pagina, borderColor: theme.border.primary }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Período de cadastro */}
              <div className="min-w-0">
                <label className="block text-base font-medium mb-1" style={{ color: theme.text.primary }}>
                  Período de cadastro
                </label>
                <DatePicker
                  selectsRange={true}
                  startDate={dataCadastroInicio}
                  endDate={dataCadastroFim}
                  onChange={(update) => {
                    const [start, end] = update;
                    setDataCadastroInicio(start);
                    setDataCadastroFim(end);
                  }}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Selecione o período"
                  className="w-full min-w-0 px-3 py-2 border rounded focus:outline-none focus:ring-1 text-sm"
                  style={{
                    borderColor: theme.border.secondary,
                    backgroundColor: theme.background.card,
                    color: theme.text.primary,
                  }}
                  isClearable={true}
                />
              </div>

              {/* Nome */}
              <div className="min-w-0">
                <label className="block text-base font-medium mb-1" style={{ color: theme.text.primary }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite o nome"
                  className="w-full min-w-0 px-3 py-2 border rounded focus:outline-none focus:ring-1 text-sm"
                  style={{
                    borderColor: theme.border.secondary,
                    backgroundColor: theme.background.card,
                    color: theme.text.primary,
                  }}
                />
              </div>

              {/* Email */}
              <div className="min-w-0">
                <label className="block text-base font-medium mb-1" style={{ color: theme.text.primary }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite o email"
                  className="w-full min-w-0 px-3 py-2 border rounded focus:outline-none focus:ring-1 text-sm"
                  style={{
                    borderColor: theme.border.secondary,
                    backgroundColor: theme.background.card,
                    color: theme.text.primary,
                  }}
                />
              </div>

              {/* Situação Usuário */}
              <div className="min-w-0">
                <label className="block text-base font-medium mb-1" style={{ color: theme.text.primary }}>
                  Situação Usuário
                </label>
                <select
                  value={situationUserId}
                  onChange={(e) => setSituationUserId(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 border rounded focus:outline-none focus:ring-1 text-sm"
                  style={{
                    borderColor: theme.border.secondary,
                    backgroundColor: theme.background.card,
                    color: theme.text.primary,
                  }}
                >
                  <option value="">Todas</option>
                  {situacoes.map(situacao => (
                    <option key={situacao.id} value={situacao.id}>
                      {situacao.nomeSituacao}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botões de ação dos filtros */}
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={limparFiltros}
                className="px-6 py-2 rounded font-medium text-sm transition-colors"
                style={{
                  backgroundColor: theme.background.surface,
                  color: theme.text.primary,
                  border: `1px solid ${theme.border.secondary}`,
                }}
              >
                Limpar Filtros
              </button>
              <button
                onClick={() => carregarUsuarios(1)}
                disabled={loading}
                className="px-6 py-2 text-white rounded font-medium text-sm transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: theme.brand.subHeader,
                }}
              >
                {loading ? 'Pesquisando...' : 'Pesquisar'}
              </button>
            </div>
          </div>

          {/* Tabela de resultados */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center" style={{ color: theme.text.secondary }}>
                Carregando usuários...
              </div>
            ) : usuarios.length === 0 ? (
              <div className="p-8 text-center" style={{ color: theme.text.secondary }}>
                Nenhum usuário encontrado. Use os filtros para pesquisar.
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b" style={{ backgroundColor: theme.background.surface, borderColor: theme.border.primary }}>
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={todosChecados}
                        onChange={handleCheckAll}
                        className="w-5 h-5 cursor-pointer rounded appearance-none border-2 checked:bg-blue-600 checked:border-blue-600 relative transition-colors
                        before:content-['✓'] before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-white before:text-sm before:font-bold before:opacity-0 checked:before:opacity-100"
                        style={{
                          borderColor: theme.mode === 'dark' ? '#4B5563' : '#888B95',
                          backgroundColor: todosChecados ? '#2563EB' : theme.background.card,
                          boxShadow: `0 0 0 1px ${theme.mode === 'dark' ? '#4B5563' : '#888B95'}`
                        }}
                      />
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none"
                      onClick={() => handleOrdenar('id')}
                      style={{ color: theme.text.primary, backgroundColor: theme.background.hover }}
                    >
                      <div className="flex items-center gap-1">
                        ID
                        {ordenarPor === 'id' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none"
                      onClick={() => handleOrdenar('name')}
                      style={{ color: theme.text.primary, backgroundColor: theme.background.hover }}
                    >
                      <div className="flex items-center gap-1">
                        Nome
                        {ordenarPor === 'name' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('email')}
                    >
                      <div className="flex items-center gap-1">
                        Email
                        {ordenarPor === 'email' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('role')}
                    >
                      <div className="flex items-center gap-1">
                        Tipo usuário (Role)
                        {ordenarPor === 'role' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('situationUser')}
                    >
                      <div className="flex items-center gap-1">
                        Situação
                        {ordenarPor === 'situationUser' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none"
                      onClick={() => handleOrdenar('createdAt')}
                      style={{ color: theme.text.primary, backgroundColor: theme.background.hover }}
                    >
                      <div className="flex items-center gap-1">
                        Criado em
                        {ordenarPor === 'createdAt' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none"
                      onClick={() => handleOrdenar('updatedAt')}
                      style={{ color: theme.text.primary, backgroundColor: theme.background.hover }}
                    >
                      <div className="flex items-center gap-1">
                        Atualizado em
                        {ordenarPor === 'updatedAt' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: theme.text.primary }}>
                      Tentativas Login
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: theme.text.primary }}>
                      Data Inativação
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: theme.text.primary }}>
                      Motivo Inativação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosOrdenados.map((usuario, index) => (
                    <tr
                      key={usuario.id}
                      className="border-b transition-colors"
                      style={{
                        borderColor: theme.border.secondary,
                        backgroundColor: index % 2 === 0 ? theme.background.card : theme.background.surface,
                      }}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={usuariosSelecionados.includes(usuario.id)}
                          onChange={() => handleCheckUsuario(usuario.id)}
                          className="w-5 h-5 cursor-pointer rounded appearance-none border-2 checked:bg-blue-600 checked:border-blue-600 relative transition-colors
                          before:content-['✓'] before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-white before:text-sm before:font-bold before:opacity-0 checked:before:opacity-100"
                          style={{
                            borderColor: theme.mode === 'dark' ? '#4B5563' : '#888B95',
                            backgroundColor: usuariosSelecionados.includes(usuario.id) ? '#2563EB' : theme.background.card,
                            boxShadow: `0 0 0 1px ${theme.mode === 'dark' ? '#4B5563' : '#888B95'}`
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: theme.text.primary }}>
                        {usuario.id}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.text.primary }}>
                        {usuario.name}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.text.primary }}>
                        {usuario.email}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.text.primary }}>
                        {usuario.role?.nome || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {usuario.situationUser ? (
                          <span
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: usuario.situationUser.nomeSituacao.toLowerCase() === 'ativo' ? '#DCFCE7' : '#FEE2E2',
                              color: usuario.situationUser.nomeSituacao.toLowerCase() === 'ativo' ? '#15803D' : '#7F1D1D',
                            }}
                          >
                            {usuario.situationUser.nomeSituacao}
                          </span>
                        ) : (
                          <span className="text-sm" style={{ color: theme.text.secondary }}>Sem situação</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.text.secondary }}>
                        {formatarData(usuario.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.text.secondary }}>
                        {formatarData(usuario.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.text.secondary }}>
                        {usuario.tentativasLogin || 0}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.text.secondary }}>
                        {usuario.dataInativacao ? formatarData(usuario.dataInativacao) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.text.secondary }}>
                        {usuario.motivoInativacao || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Controles de Paginação */}
          {usuarios.length > 0 && (
            <div className="px-6 py-4 border-t flex items-center justify-between" style={{ backgroundColor: theme.background.surface, borderColor: theme.border.primary }}>
              <div className="text-sm" style={{ color: theme.text.secondary }}>
                Mostrando {(paginaAtual - 1) * pageSize + 1} a {Math.min(paginaAtual * pageSize, totalUsuarios)} de {totalUsuarios} usuário(s)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => carregarUsuarios(paginaAtual - 1)}
                  disabled={paginaAtual === 1 || loading}
                  className="px-4 py-2 rounded transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: theme.background.card,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border.secondary}`,
                  }}
                >
                  ← Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => carregarUsuarios(page)}
                      className="px-3 py-2 rounded font-medium text-sm transition-colors"
                      style={{
                        backgroundColor: paginaAtual === page ? theme.brand.subHeader : theme.background.card,
                        color: paginaAtual === page ? 'white' : theme.text.primary,
                        border: `1px solid ${theme.border.secondary}`,
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => carregarUsuarios(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas || loading}
                  className="px-4 py-2 rounded transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: theme.background.card,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border.secondary}`,
                  }}
                >
                  Próximo →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro de Usuário */}
      {modalCadastroAberto && (
        <div 
          className="fixed inset-0 bg-black/60 bg-opacity-30 flex items-center justify-center z-50 animate-fadeIn"
          onClick={fecharModalCadastro}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-xl font-semibold text-gray-800 text-center">
                Cadastrar Usuário
              </h3>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={novoUsuarioNome}
                    onChange={(e) => setNovoUsuarioNome(e.target.value)}
                    placeholder="Digite o nome completo"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    disabled={submittingCadastro}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={novoUsuarioEmail}
                    onChange={(e) => setNovoUsuarioEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    disabled={submittingCadastro}
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha *
                  </label>
                  <input
                    type="text"
                    value={novoUsuarioSenha}
                    onChange={(e) => setNovoUsuarioSenha(e.target.value)}
                    placeholder="Senha forte: 6+ chars, maiúscula, minúscula, número, especial"
                    className={`w-full px-4 py-2 border ${getPasswordStrengthColor(novoUsuarioSenha)} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900`}
                    disabled={submittingCadastro}
                  />
                  {novoUsuarioSenha && novoUsuarioSenha !== 'padrao' && (
                    <div className={`text-xs mt-1 ${
                      getPasswordStrengthColor(novoUsuarioSenha) === 'border-green-500' ? 'text-green-600' :
                      getPasswordStrengthColor(novoUsuarioSenha) === 'border-yellow-500' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {getPasswordStrengthText(novoUsuarioSenha)}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Use uma senha forte ou mantenha "padrao" para o padrão do sistema.
                  </p>
                </div>

                {/* Situação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Situação
                  </label>
                  <select
                    value={novoUsuarioSituationUserId}
                    onChange={(e) => setNovoUsuarioSituationUserId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    disabled={submittingCadastro}
                  >
                    {situacoes.map(situacao => (
                      <option key={situacao.id} value={situacao.id}>
                        {situacao.nomeSituacao}
                      </option>
                    ))}
                  </select>
                </div>

                {/* tipo do user (admin ou normal) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de usuário
                  </label>
                  <select
                    value={novoUsuarioRoleId}
                    onChange={(e) => setNovoUsuarioRoleId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    disabled={submittingCadastro}
                  >
                    <option value={1}>Administrador</option>
                    <option value={2}>Usuário Comum</option>
                  </select>
                </div>
              </div>
            </div>

            {/* rodape*/}
            <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end bg-gray-50 rounded-b-lg">
              <button
                onClick={fecharModalCadastro}
                disabled={submittingCadastro}
                className="px-6 py-2 bg-transparent border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 transform hover:scale-105 font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed"

              >
                Fechar
              </button>
              <button
                onClick={cadastrarUsuario}
                disabled={submittingCadastro}
                className="px-6 py-2 bg-[#001960] text-white rounded-lg hover:bg-[#001960]/80 transition-all transform hover:scale-105 font-medium disabled:bg-blue-400 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submittingCadastro ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Usuário */}
      {modalEdicaoAberto && (
        <div 
          className="fixed inset-0 bg-black/60 bg-opacity-30 flex items-center justify-center z-50 animate-fadeIn"
          onClick={fecharModalEdicao}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-xl font-semibold text-gray-800 text-center">
                Editar Usuário
              </h3>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={editandoUsuarioNome}
                    onChange={(e) => setEditandoUsuarioNome(e.target.value)}
                    placeholder="Digite o nome completo"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    disabled={submittingEdicao}
                  />
                </div>

                {/* Email */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editandoUsuarioEmail}
                    onChange={(e) => setEditandoUsuarioEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    disabled={submittingEdicao}
                  />
                </div>

                {/* Situação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Situação
                  </label>
                  <select
                    value={editandoUsuarioSituationUserId}
                    onChange={(e) => setEditandoUsuarioSituationUserId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    disabled={submittingEdicao}
                  >
                    {situacoes.map(situacao => (
                      <option key={situacao.id} value={situacao.id}>
                        {situacao.nomeSituacao}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de usuário */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de usuário
                  </label>
                  <select
                    value={editandoUsuarioRoleId}
                    onChange={(e) => setEditandoUsuarioRoleId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    disabled={submittingEdicao}
                  >
                    <option value={1}>Administrador</option>
                    <option value={2}>Usuário Comum</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end bg-gray-50 rounded-b-lg">
              <button
                onClick={fecharModalEdicao}
                disabled={submittingEdicao}
                className="px-6 py-2 bg-transparent border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 transform hover:scale-105 font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicaoUsuario}
                disabled={submittingEdicao}
                className="px-6 py-2 bg-[#001960] text-white rounded-lg hover:bg-[#001960]/80 transition-all transform hover:scale-105 font-medium disabled:bg-blue-400 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submittingEdicao ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}