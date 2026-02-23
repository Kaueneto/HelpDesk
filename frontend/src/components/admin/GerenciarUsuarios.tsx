'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
}

interface SituationUser {
  id: number;
  nomeSituacao: string;
  createdAt: string;
  updatedAt: string;
}

export default function GerenciarUsuarios() {
  const router = useRouter();
  
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
    const carregarSituacoes = async () => {
      try {
        const response = await api.get('/SituationsUsers');
        setSituacoes(response.data);
      } catch (error) {
        console.error('Erro ao carregar situações:', error);
      }
    };
    carregarSituacoes();
  }, []);

  const carregarUsuarios = async (pageOrEvent?: number | React.MouseEvent<HTMLButtonElement>) => {
    const page = typeof pageOrEvent === 'number' ? pageOrEvent : 1;
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };
      
      if (dataCadastroInicio) params.dataCadastroInicio = dataCadastroInicio.toISOString().split('T')[0];
      if (dataCadastroFim) params.dataCadastroFim = dataCadastroFim.toISOString().split('T')[0];
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
      console.error('Erro ao carregar usuários:', error);
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
      console.error('Erro ao resetar senhas:', error);
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

    // Buscar ID da situação "inativo"
    const situacaoInativa = situacoes.find(s => s.nomeSituacao.toLowerCase() === 'inativo');
    if (!situacaoInativa) {
      alert('Situação "inativo" não encontrada. Cadastre-a primeiro.');
      return;
    }

    try {
      await api.patch('/users/alterar-situacao-multiplos', {
        usuariosIds: usuariosSelecionados,
        situationUserId: situacaoInativa.id,
      });

      alert('Usuários desativados com sucesso!');
      await carregarUsuarios();
    } catch (error) {
      console.error('Erro ao desativar usuários:', error);
      alert('Erro ao desativar usuários');
    }
  };

  const excluirUsuarios = async () => {
    if (usuariosSelecionados.length === 0) {
      alert('Selecione ao menos um usuário');
      return;
    }

    // Primeira confirmação
    if (!confirm(`AVISO: Você está prestes a excluir ${usuariosSelecionados.length} usuário(s) permanentemente. Esta ação NÃO pode ser desfeita.\n\nDeseja continuar?`)) {
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
      
      alert('Usuários excluídos com sucesso!');
      await carregarUsuarios(1);
    } catch (error: any) {

      
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao excluir usuários';
      const detalhesErro = error.response?.data?.erro ? `\n\nDetalhes: ${error.response.data.erro}` : '';
      alert(mensagemErro + detalhesErro);
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
      console.error('Erro ao cadastrar usuário:', error);
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
      console.error('Erro ao atualizar usuário:', error);
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
    });
  };

  return (
    <>
      <div className="bg-[#51A2FF] px-6 py-4">
        <h2 className="text-white text-2xl font-semibold">Gerenciar Usuários</h2>
      </div>

      <div className="p-2 bg-[#EDEDED]">
        <div className="bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden">
          {/* Botões de ação acima dos filtros */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-300 flex gap-4">
            <button
              onClick={abrirModalCadastro}
              className="px-4 py-0.5 bg-transparent border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm flex items-center gap-2 disabled:border-green-300 disabled:text-green-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500/50"

            >
              <span className="text-lg font-bold">+</span>
              Novo
            </button>
            <button
              onClick={resetarSenha}
              disabled={usuariosSelecionados.length === 0}
              className="px-4 py-0.5 bg-transparent border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm disabled:border-blue-300 disabled:text-blue-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              Resetar Senha
            </button>
            <button
              onClick={abrirModalEdicao}
              disabled={usuariosSelecionados.length !== 1}
              className="px-4 py-0.5 bg-transparent border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm disabled:border-purple-300 disabled:text-purple-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              Editar
            </button>
            <button
              onClick={desativarUsuarios}
              disabled={usuariosSelecionados.length === 0}
              className="px-4 py-0.5 bg-transparent border border-orange-600 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm disabled:border-orange-300 disabled:text-orange-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              Desativar
            </button>
            <button
              onClick={excluirUsuarios}
              disabled={usuariosSelecionados.length === 0}
              className="px-4 py-0.5 bg-transparent border border-red-600 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm disabled:border-red-300 disabled:text-red-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              Excluir
            </button>
            {usuariosSelecionados.length > 0 && (
              <span className="text-sm text-gray-600 flex items-center ml-2">
                {usuariosSelecionados.length} selecionado(s)
              </span>
            )}
          </div>

          {/* Área de Filtros */}
          <div className="p-6 border-b border-gray-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Período de cadastro */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  isClearable={true}
                />
              </div>

              {/* Nome */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite o nome"
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>

              {/* Email */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite o email"
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>

              {/* Situação Usuário */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Situação Usuário
                </label>
                <select
                  value={situationUserId}
                  onChange={(e) => setSituationUserId(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-gray-50"
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
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium text-sm"
              >
                Limpar Filtros
              </button>
              <button
                onClick={() => carregarUsuarios(1)}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium text-sm disabled:bg-blue-400"
              >
                {loading ? 'Pesquisando...' : 'Pesquisar'}
              </button>
            </div>
          </div>

          {/* Tabela de resultados */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Carregando usuários...
              </div>
            ) : usuarios.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum usuário encontrado. Use os filtros para pesquisar.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-300">
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
                      onClick={() => handleOrdenar('id')}
                    >
                      <div className="flex items-center gap-1">
                        ID
                        {ordenarPor === 'id' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('name')}
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
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Criado em
                        {ordenarPor === 'createdAt' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors select-none"
                      onClick={() => handleOrdenar('updatedAt')}
                    >
                      <div className="flex items-center gap-1">
                        Atualizado em
                        {ordenarPor === 'updatedAt' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosOrdenados.map((usuario, index) => (
                    <tr
                      key={usuario.id}
                      className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={usuariosSelecionados.includes(usuario.id)}
                          onChange={() => handleCheckUsuario(usuario.id)}
                          className="w-5 h-5 cursor-pointer rounded appearance-none border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 relative
                          before:content-['✓'] before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-white before:text-sm before:font-bold before:opacity-0 checked:before:opacity-100"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {usuario.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {usuario.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {usuario.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {usuario.role?.nome || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {usuario.situationUser ? (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              usuario.situationUser.nomeSituacao.toLowerCase() === 'ativo'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {usuario.situationUser.nomeSituacao}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Sem situação</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatarData(usuario.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatarData(usuario.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Controles de Paginação */}
          {usuarios.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {(paginaAtual - 1) * pageSize + 1} a {Math.min(paginaAtual * pageSize, totalUsuarios)} de {totalUsuarios} usuário(s)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => carregarUsuarios(paginaAtual - 1)}
                  disabled={paginaAtual === 1 || loading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => carregarUsuarios(page)}
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
                  onClick={() => carregarUsuarios(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas || loading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                    placeholder="Digite a senha"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={submittingCadastro}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Senha padrão é "padrao". Pode ser alterada aqui ou depois pelo usuário.
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 font-medium disabled:bg-blue-400 disabled:cursor-not-allowed disabled:transform-none"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all transform hover:scale-105 font-medium disabled:bg-purple-400 disabled:cursor-not-allowed disabled:transform-none"
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