'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
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
  name: string;
}

interface TopicoAjuda {
  id: number;
  nome: string;
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

export default function GerenciarChamados() {
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
  const [loading, setLoading] = useState(false);

  // selecao multipla
  const [chamadosSelecionados, setChamadosSelecionados] = useState<number[]>([]);
  const [todosChecados, setTodosChecados] = useState(false);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      const [deptosRes, topicosRes, prioridadesRes] = await Promise.all([
        api.get('/departamentos'),
        api.get('/topicos_ajuda'),
        api.get('/tipo_prioridade'),
      ]);

      console.log('Departamentos:', deptosRes.data);
      console.log('Tópicos:', topicosRes.data);
      console.log('Prioridades:', prioridadesRes.data);

      setDepartamentos(deptosRes.data);
      setTopicosAjuda(topicosRes.data);
      setPrioridades(prioridadesRes.data);

      // status
      setStatusList([
        { id: 1, nome: 'Aberto' },
        { id: 2, nome: 'Em Andamento' },
        { id: 3, nome: 'Encerrado' },
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const pesquisarChamados = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (dataAberturaInicio) params.dataAberturaInicio = dataAberturaInicio.toISOString().split('T')[0];
      if (dataAberturaFim) params.dataAberturaFim = dataAberturaFim.toISOString().split('T')[0];
      if (dataFechamentoInicio) params.dataFechamentoInicio = dataFechamentoInicio.toISOString().split('T')[0];
      if (dataFechamentoFim) params.dataFechamentoFim = dataFechamentoFim.toISOString().split('T')[0];
      if (departamentoId) params.departamentoId = departamentoId;
      if (topicoAjudaId) params.topicoAjudaId = topicoAjudaId;
      if (prioridadeId) params.prioridadeId = prioridadeId;
      if (statusId) params.statusId = statusId;
      if (assunto) params.assunto = assunto;
      if (nomeUsuario) params.nomeUsuario = nomeUsuario;

      console.log('Parâmetros de pesquisa:', params);

      const response = await api.get('/chamados', { params });
      console.log('Resposta do backend:', response.data);
      setChamados(response.data);
      setChamadosSelecionados([]);
      setTodosChecados(false);
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
    if (chamadosSelecionados.length === 0) {
      alert('Selecione ao menos um chamado');
      return;
    }

    alert('Funcionalidade de edição múltipla em desenvolvimento');
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
    });
  };

  return (
    <>
      <div className="bg-[#51A2FF] px-6 py-4">
        <h2 className="text-white text-2xl font-semibold">Chamados</h2>
      </div>

      <div className="p-6 bg-[#EDEDED] min-h-screen">
        <div className="bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden">
          {/* area de Filtros */}
          <div className="p-6 border-b border-gray-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  isClearable={true}
                />
              </div>

              {/* periodo de fechamento */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período de fechamento
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
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
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
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                >
                  <option value="">Todos</option>
                  {departamentos.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
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
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                >
                  <option value="">Todos</option>
                  {topicosAjuda.map((topico) => (
                    <option key={topico.id} value={topico.id}>
                      {topico.nome}
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
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
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
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
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
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
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
                onClick={pesquisarChamados}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium text-sm disabled:bg-blue-400"
              >
                {loading ? 'Pesquisando...' : 'Pesquisar'}
              </button>
            </div>
          </div>

          {/* acao em multiplos registros */}
          {chamados.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-300 flex gap-3">
              <button
                onClick={marcarComoResolvido}
                disabled={chamadosSelecionados.length === 0}
                className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium text-sm disabled:bg-green-300 disabled:cursor-not-allowed"
              >
                Marcar como resolvido
              </button>
              <button
                onClick={editarMultiplos}
                disabled={chamadosSelecionados.length === 0}
                className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium text-sm disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                Editar Múltiplos
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
                      Cód.
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Prioridade
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Tópico ajuda
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Departamento
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Resumo
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Usuário
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Abertura
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chamados.map((chamado, index) => (
                    <tr
                      key={chamado.id}
                      className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={chamadosSelecionados.includes(chamado.id)}
                          onChange={() => handleCheckChamado(chamado.id)}
                          className="w-5 h-5 cursor-pointer rounded appearance-none border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 relative
                          before:content-['✓'] before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-white before:text-sm before:font-bold before:opacity-0 checked:before:opacity-100"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {chamado.numeroChamado || chamado.id}
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {chamado.topicoAjuda?.nome || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {chamado.departamento?.nome || chamado.departamento?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            chamado.status?.id === 1
                              ? 'bg-yellow-100 text-yellow-800'
                              : chamado.status?.id === 2
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {chamado.status?.nome || 'Desconhecido'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {chamado.resumoChamado}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {chamado.usuario?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatarData(chamado.dataAbertura)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
