'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import api from '@/services/api';
import ActionButton from './ActionButton';

interface TipoPrioridade {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
}

export default function GerenciarTiposPrioridade() {
  const { theme } = useTheme();
  
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

  // estados de ordenação
  const [ordenarPor, setOrdenarPor] = useState<'id' | 'nome' | 'cor' | 'ordem' | null>(null);
  const [direcaoOrdem, setDirecaoOrdem] = useState<'asc' | 'desc'>('asc');

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

      alert(error.response?.data?.mensagem || 'Erro ao atualizar tipo');
    } finally {
      setSubmittingEdicao(false);
    }
  };

  // função de ordenaco
  const handleOrdenar = (coluna: 'id' | 'nome' | 'cor' | 'ordem') => {
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

  // filtrar e ordenar tipos
  const tiposFiltrados = tipos.filter(t =>
    t.nome.toLowerCase().includes(nome.toLowerCase())
  );

  const tiposOrdenados = ordenarPor
    ? [...tiposFiltrados].sort((a, b) => {
        let valorA: any = a[ordenarPor];
        let valorB: any = b[ordenarPor];

        if (typeof valorA === 'string') {
          valorA = valorA.toLowerCase();
          valorB = valorB.toLowerCase();
        }

        if (valorA < valorB) return direcaoOrdem === 'asc' ? -1 : 1;
        if (valorA > valorB) return direcaoOrdem === 'asc' ? 1 : -1;
        return 0;
      })
    : tiposFiltrados;

  return (
    <>
      <div className="px-6 py-4" style={{ backgroundColor: theme.brand.subHeader }}>
        <h2 className="text-white text-2xl font-semibold">Gerenciar Tipos de Prioridade</h2>
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
              type="editar"
              label="Editar"
              onClick={abrirModalEdicao}
              disabled={tiposSelecionados.length !== 1}
            />
            <ActionButton
              type="excluir"
              label="Excluir"
              onClick={excluirTipos}
              disabled={tiposSelecionados.length === 0}
            />
            {tiposSelecionados.length > 0 && (
              <span className="text-sm flex items-center ml-2" style={{ color: theme.text.secondary }}>
                {tiposSelecionados.length} selecionado(s)
              </span>
            )}
          </div>

          {/* Área de Filtros */}
          <div className="p-6 border-b" style={{ backgroundColor: theme.background.pagina, borderColor: theme.border.primary }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Nome */}
              <div className="min-w-0">
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>
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
                onClick={carregarTipos}
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
                Carregando tipos de prioridade...
              </div>
            ) : tiposFiltrados.length === 0 ? (
              <div className="p-8 text-center" style={{ color: theme.text.secondary }}>
                Nenhum tipo encontrado. Use os filtros para pesquisar.
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
                      onClick={() => handleOrdenar('nome')}
                      style={{ color: theme.text.primary, backgroundColor: theme.background.hover }}
                    >
                      <div className="flex items-center gap-1">
                        Nome
                        {ordenarPor === 'nome' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none"
                      onClick={() => handleOrdenar('cor')}
                      style={{ color: theme.text.primary, backgroundColor: theme.background.hover }}
                    >
                      <div className="flex items-center gap-1">
                        Cor
                        {ordenarPor === 'cor' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none"
                      onClick={() => handleOrdenar('ordem')}
                      style={{ color: theme.text.primary, backgroundColor: theme.background.hover }}
                    >
                      <div className="flex items-center gap-1">
                        Ordem
                        {ordenarPor === 'ordem' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tiposOrdenados.map((tipo, index) => (
                    <tr
                      key={tipo.id}
                      className="border-b transition-colors"
                      style={{
                        borderColor: theme.border.secondary,
                        backgroundColor: index % 2 === 0 ? theme.background.card : theme.background.surface,
                      }}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={tiposSelecionados.includes(tipo.id)}
                          onChange={() => handleCheckTipo(tipo.id)}
                          className="w-5 h-5 cursor-pointer rounded appearance-none border-2 checked:bg-blue-600 checked:border-blue-600 relative transition-colors
                          before:content-['✓'] before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-white before:text-sm before:font-bold before:opacity-0 checked:before:opacity-100"
                          style={{
                            borderColor: theme.mode === 'dark' ? '#4B5563' : '#888B95',
                            backgroundColor: tiposSelecionados.includes(tipo.id) ? '#2563EB' : theme.background.card,
                            boxShadow: `0 0 0 1px ${theme.mode === 'dark' ? '#4B5563' : '#888B95'}`
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: theme.text.primary }}>
                        {tipo.id}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.text.primary }}>
                        {tipo.nome}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: tipo.cor }}
                          />
                          <span className="text-sm" style={{ color: theme.text.primary }}>{tipo.cor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.text.primary }}>
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
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn"
          onClick={fecharModalCadastro}
        >
          <div
            className="rounded-lg shadow-2xl w-full max-w-2xl mx-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: theme.background.modal }}
          >
            {/* Cabeçalho */}
            <div className="border-b px-6 py-4" style={{ borderColor: theme.border.primary }}>
              <h3 className="text-xl font-semibold text-left" style={{ color: theme.text.primary }}>
                Cadastrar Tipo de Prioridade
              </h3>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Digite o nome do tipo"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 text-sm"
                    style={{
                      borderColor: theme.border.secondary,
                      backgroundColor: theme.background.card,
                      color: theme.text.primary,
                    }}
                    disabled={submittingCadastro}
                  />
                </div>

                {/* Cor */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                    Cor *
                  </label>
                  <input
                    type="color"
                    value={novaCor}
                    onChange={(e) => setNovaCor(e.target.value)}
                    className="w-full h-10 border rounded-lg"
                    style={{ borderColor: theme.border.secondary }}
                    disabled={submittingCadastro}
                  />
                </div>

                {/* Ordem */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                    Ordem *
                  </label>
                  <input
                    type="number"
                    value={novaOrdem}
                    onChange={(e) => setNovaOrdem(Number(e.target.value))}
                    min={1}
                    placeholder="Digite a ordem"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 text-sm"
                    style={{
                      borderColor: theme.border.secondary,
                      backgroundColor: theme.background.card,
                      color: theme.text.primary,
                    }}
                    disabled={submittingCadastro}
                  />
                </div>
              </div>

              {/* Rodapé */}
              <div className="flex justify-end gap-4 mt-6 pt-4 border-t" style={{ borderColor: theme.border.primary }}>
                <button
                  onClick={fecharModalCadastro}
                  className="px-6 py-2 border rounded-lg transition-all duration-200 transform hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: theme.border.secondary,
                    color: theme.text.primary,
                    backgroundColor: theme.background.surface,
                  }}
                  disabled={submittingCadastro}
                >
                  Cancelar
                </button>
                <button
                  onClick={cadastrarTipo}
                  disabled={submittingCadastro}
                  className="px-6 py-2 text-white rounded-lg transition-all transform hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  style={{
                    backgroundColor: theme.brand.subHeader,
                  }}
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
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn"
          onClick={fecharModalEdicao}
        >
          <div
            className="rounded-lg shadow-2xl w-full max-w-2xl mx-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: theme.background.modal }}
          >
            {/* Cabeçalho */}
            <div className="border-b px-6 py-4" style={{ borderColor: theme.border.primary }}>
              <h3 className="text-xl font-semibold text-center" style={{ color: theme.text.primary }}>
                Editar Tipo de Prioridade
              </h3>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={editandoNome}
                    onChange={(e) => setEditandoNome(e.target.value)}
                    placeholder="Digite o nome do tipo"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 text-sm"
                    style={{
                      borderColor: theme.border.secondary,
                      backgroundColor: theme.background.card,
                      color: theme.text.primary,
                    }}
                    disabled={submittingEdicao}
                  />
                </div>

                {/* Cor */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                    Cor *
                  </label>
                  <input
                    type="color"
                    value={editandoCor}
                    onChange={(e) => setEditandoCor(e.target.value)}
                    className="w-full h-10 border rounded-lg"
                    style={{ borderColor: theme.border.secondary }}
                    disabled={submittingEdicao}
                  />
                </div>

                {/* Ordem */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                    Ordem *
                  </label>
                  <input
                    type="number"
                    value={editandoOrdem}
                    onChange={(e) => setEditandoOrdem(Number(e.target.value))}
                    min={1}
                    placeholder="Digite a ordem"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 text-sm"
                    style={{
                      borderColor: theme.border.secondary,
                      backgroundColor: theme.background.card,
                      color: theme.text.primary,
                    }}
                    disabled={submittingEdicao}
                  />
                </div>
              </div>

              {/* Rodapé */}
              <div className="flex justify-end gap-4 mt-6 pt-4 border-t" style={{ borderColor: theme.border.primary }}>
                <button
                  onClick={fecharModalEdicao}
                  className="px-6 py-2 border rounded-lg transition-all duration-200 transform hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: theme.border.secondary,
                    color: theme.text.primary,
                    backgroundColor: theme.background.surface,
                  }}
                  disabled={submittingEdicao}
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarEdicao}
                  disabled={submittingEdicao}
                  className="px-6 py-2 text-white rounded-lg transition-all transform hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  style={{
                    backgroundColor: theme.brand.subHeader,
                  }}
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