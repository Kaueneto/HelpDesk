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
  ativo: boolean;
  roleId: number;
  role: {
    id: number;
    nome: string;
  };
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
  const [ativo, setAtivo] = useState('');

  // Dados
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);

  // Seleção múltipla
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<number[]>([]);
  const [todosChecados, setTodosChecados] = useState(false);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const pageSize = 10;

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
      if (ativo !== '') params.ativo = ativo;

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
    setAtivo('');
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

    try {
      await api.patch('/users/desativar-multiplos', {
        usuariosIds: usuariosSelecionados,
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
      await api.delete('/users/excluir-multiplos', {
        data: {
          usuariosIds: usuariosSelecionados,
        },
      });

      alert('Usuários excluídos com sucesso!');
      await carregarUsuarios();
    } catch (error) {
      console.error('Erro ao excluir usuários:', error);
      alert('Erro ao excluir usuários');
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
              onClick={() => alert('Funcionalidade em desenvolvimento')}
              className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <span className="text-lg font-bold">+</span>
              Novo
            </button>
            <button
              onClick={resetarSenha}
              disabled={usuariosSelecionados.length === 0}
              className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium text-sm disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              Resetar Senha
            </button>
            <button
              onClick={desativarUsuarios}
              disabled={usuariosSelecionados.length === 0}
              className="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium text-sm disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              Desativar
            </button>
            <button
              onClick={excluirUsuarios}
              disabled={usuariosSelecionados.length === 0}
              className="px-5 py-2 bg-red-900 text-white rounded hover:bg-red-950 transition-colors font-medium text-sm disabled:bg-red-800 disabled:cursor-not-allowed"
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

              {/* Ativo */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ativo
                </label>
                <select
                  value={ativo}
                  onChange={(e) => setAtivo(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                >
                  <option value="">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Tipo usuário (Role)
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Ativo
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Criado em
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Atualizado em
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario, index) => (
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
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            usuario.ativo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {usuario.ativo ? 'Sim' : 'Não'}
                        </span>
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
    </>
  );
}