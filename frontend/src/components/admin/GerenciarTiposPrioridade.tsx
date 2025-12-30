'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';

interface TipoPrioridade {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
}

export default function GerenciarTiposPrioridade() {
  // Filtros
  const [nome, setNome] = useState('');

  // Dados
  const [tipos, setTipos] = useState<TipoPrioridade[]>([]);
  const [loading, setLoading] = useState(false);

  // Seleção múltipla
  const [tiposSelecionados, setTiposSelecionados] = useState<number[]>([]);
  const [todosChecados, setTodosChecados] = useState(false);

  // Modal de cadastro
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaCor, setNovaCor] = useState('#000000');
  const [novaOrdem, setNovaOrdem] = useState(1);
  const [submittingCadastro, setSubmittingCadastro] = useState(false);

  // Modal de edição
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNome, setEditandoNome] = useState('');
  const [editandoCor, setEditandoCor] = useState('#000000');
  const [editandoOrdem, setEditandoOrdem] = useState(1);
  const [submittingEdicao, setSubmittingEdicao] = useState(false);

  // Carregar tipos ao montar
  useEffect(() => {
    carregarTipos();
  }, []);

  const carregarTipos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tipo_prioridade');
      setTipos(response.data);
    } catch (error) {
      console.error('Erro ao carregar tipos de prioridade:', error);
      alert('Erro ao carregar tipos de prioridade');
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = () => {
    setNome('');
  };

  const handleCheckAll = () => {
    if (todosChecados) {
      setTiposSelecionados([]);
      setTodosChecados(false);
    } else {
      setTiposSelecionados(tipos.map(t => t.id));
      setTodosChecados(true);
    }
  };

  const handleCheckTipo = (id: number) => {
    if (tiposSelecionados.includes(id)) {
      setTiposSelecionados(tiposSelecionados.filter(t => t !== id));
      setTodosChecados(false);
    } else {
      setTiposSelecionados([...tiposSelecionados, id]);
      if (tiposSelecionados.length + 1 === tipos.length) {
        setTodosChecados(true);
      }
    }
  };

  const excluirTipos = async () => {
    if (tiposSelecionados.length === 0) {
      alert('Selecione pelo menos um tipo para excluir');
      return;
    }

    if (!confirm(`Deseja excluir ${tiposSelecionados.length} tipo(s) de prioridade?`)) {
      return;
    }

    try {
      await Promise.all(
        tiposSelecionados.map(id => api.delete(`/tipo_prioridade/${id}`))
      );
      alert('Tipos excluídos com sucesso!');
      setTiposSelecionados([]);
      setTodosChecados(false);
      carregarTipos();
    } catch (error) {
      console.error('Erro ao excluir tipos:', error);
      alert('Erro ao excluir tipos');
    }
  };

  const abrirModalCadastro = () => {
    setModalCadastroAberto(true);
    setNovoNome('');
    setNovaCor('#000000');
    setNovaOrdem(1);
  };

  const fecharModalCadastro = () => {
    setModalCadastroAberto(false);
    setNovoNome('');
    setNovaCor('#000000');
    setNovaOrdem(1);
  };

  const cadastrarTipo = async () => {
    if (!novoNome.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    setSubmittingCadastro(true);
    try {
      await api.post('/tipo_prioridade', {
        nome: novoNome.trim(),
        cor: novaCor,
        ordem: novaOrdem
      });
      alert('Tipo de prioridade cadastrado com sucesso!');
      fecharModalCadastro();
      carregarTipos();
    } catch (error: any) {
      console.error('Erro ao cadastrar tipo:', error);
      alert(error.response?.data?.mensagem || 'Erro ao cadastrar tipo');
    } finally {
      setSubmittingCadastro(false);
    }
  };

  const abrirModalEdicao = () => {
    if (tiposSelecionados.length !== 1) {
      alert('Selecione exatamente um tipo para editar');
      return;
    }

    const id = tiposSelecionados[0];
    const tipo = tipos.find(t => t.id === id);
    if (!tipo) return;

    setEditandoId(id);
    setEditandoNome(tipo.nome);
    setEditandoCor(tipo.cor);
    setEditandoOrdem(tipo.ordem);
    setModalEdicaoAberto(true);
  };

  const fecharModalEdicao = () => {
    setModalEdicaoAberto(false);
    setEditandoId(null);
    setEditandoNome('');
    setEditandoCor('#000000');
    setEditandoOrdem(1);
  };

  const salvarEdicao = async () => {
    if (!editandoNome.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    setSubmittingEdicao(true);
    try {
      await api.put(`/tipo_prioridade/${editandoId}`, {
        nome: editandoNome.trim(),
        cor: editandoCor,
        ordem: editandoOrdem
      });
      alert('Tipo de prioridade atualizado com sucesso!');
      fecharModalEdicao();
      carregarTipos();
    } catch (error: any) {
      console.error('Erro ao atualizar tipo:', error);
      alert(error.response?.data?.mensagem || 'Erro ao atualizar tipo');
    } finally {
      setSubmittingEdicao(false);
    }
  };

  // Filtrar tipos
  const tiposFiltrados = tipos.filter(t =>
    t.nome.toLowerCase().includes(nome.toLowerCase())
  );

  return (
    <>
      <div className="bg-[#51A2FF] px-6 py-4">
        <h2 className="text-white text-2xl font-semibold">Gerenciar Tipos de Prioridade</h2>
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
              onClick={abrirModalEdicao}
              disabled={tiposSelecionados.length !== 1}
              className="px-4 py-0.5 bg-transparent border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm disabled:border-purple-300 disabled:text-purple-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              Editar
            </button>
            <button
              onClick={excluirTipos}
              disabled={tiposSelecionados.length === 0}
              className="px-4 py-0.5 bg-transparent border border-red-600 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm disabled:border-red-300 disabled:text-red-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              Excluir
            </button>
            {tiposSelecionados.length > 0 && (
              <span className="text-sm text-gray-600 flex items-center ml-2">
                {tiposSelecionados.length} selecionado(s)
              </span>
            )}
          </div>

          {/* Área de Filtros */}
          <div className="p-6 border-b border-gray-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                onClick={carregarTipos}
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
                Carregando tipos de prioridade...
              </div>
            ) : tiposFiltrados.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum tipo encontrado. Use os filtros para pesquisar.
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
                      Cor
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Ordem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tiposFiltrados.map((tipo, index) => (
                    <tr
                      key={tipo.id}
                      className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={tiposSelecionados.includes(tipo.id)}
                          onChange={() => handleCheckTipo(tipo.id)}
                          className="w-5 h-5 cursor-pointer rounded appearance-none border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 relative
                          before:content-['✓'] before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-white before:text-sm before:font-bold before:opacity-0 checked:before:opacity-100"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {tipo.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {tipo.nome}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: tipo.cor }}
                          />
                          <span className="text-sm text-gray-900">{tipo.cor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {tipo.ordem}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Cadastro */}
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
                Cadastrar Tipo de Prioridade
              </h3>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Digite o nome do tipo"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={submittingCadastro}
                  />
                </div>

                {/* Cor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor *
                  </label>
                  <input
                    type="color"
                    value={novaCor}
                    onChange={(e) => setNovaCor(e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                    disabled={submittingCadastro}
                  />
                </div>

                {/* Ordem */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordem *
                  </label>
                  <input
                    type="number"
                    value={novaOrdem}
                    onChange={(e) => setNovaOrdem(Number(e.target.value))}
                    min={1}
                    placeholder="Digite a ordem"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={submittingCadastro}
                  />
                </div>
              </div>

              {/* Rodapé */}
              <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={fecharModalCadastro}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  disabled={submittingCadastro}
                >
                  Cancelar
                </button>
                <button
                  onClick={cadastrarTipo}
                  disabled={submittingCadastro}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400"
                >
                  {submittingCadastro ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
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
                Editar Tipo de Prioridade
              </h3>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={editandoNome}
                    onChange={(e) => setEditandoNome(e.target.value)}
                    placeholder="Digite o nome do tipo"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={submittingEdicao}
                  />
                </div>

                {/* Cor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor *
                  </label>
                  <input
                    type="color"
                    value={editandoCor}
                    onChange={(e) => setEditandoCor(e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                    disabled={submittingEdicao}
                  />
                </div>

                {/* Ordem */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordem *
                  </label>
                  <input
                    type="number"
                    value={editandoOrdem}
                    onChange={(e) => setEditandoOrdem(Number(e.target.value))}
                    min={1}
                    placeholder="Digite a ordem"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={submittingEdicao}
                  />
                </div>
              </div>

              {/* Rodapé */}
              <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={fecharModalEdicao}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  disabled={submittingEdicao}
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarEdicao}
                  disabled={submittingEdicao}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400"
                >
                  {submittingEdicao ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}