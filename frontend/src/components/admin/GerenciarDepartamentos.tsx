'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import ActionButton from './ActionButton';
import { useTheme } from '@/contexts/ThemeContext';

interface Departamento {
  id: number;
  codigo: number;
  name: string;
  ativo: boolean;
}

export default function GerenciarDepartamentos() {
  const { theme } = useTheme();
  
  // Filtros
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');

  // Dados
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(false);

  // ordenação
  const [ordenarPor, setOrdenarPor] = useState<'id' | 'codigo' | 'name' | 'ativo' | null>(null);
  const [direcaoOrdem, setDirecaoOrdem] = useState<'asc' | 'desc'>('asc');

  // Seleção múltipla
  const [departamentosSelecionados, setDepartamentosSelecionados] = useState<number[]>([]);
  const [todosChecados, setTodosChecados] = useState(false);

  // Modal de cadastro
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoAtivo, setNovoAtivo] = useState(true);
  const [submittingCadastro, setSubmittingCadastro] = useState(false);
  const [sucessoCadastro, setSucessoCadastro] = useState(false);

  // Modal de edição
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoCodigo, setEditandoCodigo] = useState('');
  const [editandoNome, setEditandoNome] = useState('');
  const [editandoAtivo, setEditandoAtivo] = useState(true);
  const [submittingEdicao, setSubmittingEdicao] = useState(false);
  const [sucessoEdicao, setSucessoEdicao] = useState(false);

  // Carregar departamentos ao montar
  useEffect(() => {
    carregarDepartamentos();
  }, []);

  const carregarDepartamentos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/departamentos');
      setDepartamentos(response.data);
    } catch (error) {
      alert('Erro ao carregar departamentos');
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = () => {
    setNome('');
    setStatus('todos');
  };

  const handleCheckAll = () => {
    if (todosChecados) {
      setDepartamentosSelecionados([]);
      setTodosChecados(false);
    } else {
      setDepartamentosSelecionados(departamentos.map(d => d.id));
      setTodosChecados(true);
    }
  };

  const handleCheckDepartamento = (id: number) => {
    if (departamentosSelecionados.includes(id)) {
      setDepartamentosSelecionados(departamentosSelecionados.filter(d => d !== id));
      setTodosChecados(false);
    } else {
      setDepartamentosSelecionados([...departamentosSelecionados, id]);
      if (departamentosSelecionados.length + 1 === departamentos.length) {
        setTodosChecados(true);
      }
    }
  };

  const excluirDepartamentos = async () => {
    if (departamentosSelecionados.length === 0) {
      alert('Selecione pelo menos um departamento para excluir');
      return;
    }

    if (!confirm(`Deseja excluir ${departamentosSelecionados.length} departamento(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        departamentosSelecionados.map(id => api.delete(`/departamentos/${id}`))
      );
      alert('Departamentos excluídos com sucesso!');
      setDepartamentosSelecionados([]);
      setTodosChecados(false);
      carregarDepartamentos();
    } catch (error) {

      alert('Erro ao excluir departamentos');
    }
  };

  const ativarDepartamentosSelecionados = async () => {
    if (departamentosSelecionados.length === 0) {
      alert('Selecione pelo menos um departamento para ativar');
      return;
    }

    try {
      await Promise.all(
        departamentosSelecionados.map(id => api.patch(`/departamentos/${id}/status`, { ativo: true }))
      );
      alert(`${departamentosSelecionados.length} departamento(s) ativado(s) com sucesso!`);
      setDepartamentosSelecionados([]);
      setTodosChecados(false);
      carregarDepartamentos();
    } catch (error) {

      alert('Erro ao ativar departamentos');
    }
  };

  const desativarDepartamentosSelecionados = async () => {
    if (departamentosSelecionados.length === 0) {
      alert('Selecione pelo menos um departamento para desativar');
      return;
    }

    try {
      await Promise.all(
        departamentosSelecionados.map(id => api.patch(`/departamentos/${id}/status`, { ativo: false }))
      );
      alert(`${departamentosSelecionados.length} departamento(s) desativado(s) com sucesso!`);
      setDepartamentosSelecionados([]);
      setTodosChecados(false);
      carregarDepartamentos();
    } catch (error) {
    
      alert('Erro ao desativar departamentos');
    }
  };

  const abrirModalCadastro = () => {
    setModalCadastroAberto(true);
    setNovoCodigo('');
    setNovoNome('');
    setNovoAtivo(true);
    setSucessoCadastro(false);
  };

  const fecharModalCadastro = () => {
    setModalCadastroAberto(false);
    setNovoCodigo('');
    setNovoNome('');
    setNovoAtivo(true);
    setSucessoCadastro(false);
  };

  const cadastrarDepartamento = async () => {
    if (!novoCodigo.trim()) {
      alert('Código é obrigatório');
      return;
    }

    if (!novoNome.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    setSubmittingCadastro(true);
    try {
      await api.post('/departamentos', { 
        codigo: Number(novoCodigo),
        name: novoNome.trim(),
        ativo: novoAtivo
      });
      
      setSucessoCadastro(true);
      
      setTimeout(() => {
        setSucessoCadastro(false);
        setNovoCodigo('');
        setNovoNome('');
        setNovoAtivo(true);
        carregarDepartamentos();
      }, 2000);
    } catch (error: any) {
      const mensagem = error.response?.data?.mensagem || 'Erro ao cadastrar departamento';
      // não logar erros de validação (409, 400) no console
      if (error.response?.status !== 409 && error.response?.status !== 400) {
    
      }
      alert(mensagem);
    } finally {
      setSubmittingCadastro(false);
    }
  };

  const abrirModalEdicao = () => {
    if (departamentosSelecionados.length !== 1) {
      alert('Selecione exatamente um departamento para editar');
      return;
    }

    const id = departamentosSelecionados[0];
    const departamento = departamentos.find(d => d.id === id);
    if (!departamento) return;

    setEditandoId(id);
    setEditandoCodigo(String(departamento.codigo));
    setEditandoNome(departamento.name);
    setEditandoAtivo(departamento.ativo);
    setModalEdicaoAberto(true);
    setSucessoEdicao(false);
  };

  const fecharModalEdicao = () => {
    setModalEdicaoAberto(false);
    setEditandoId(null);
    setEditandoCodigo('');
    setEditandoNome('');
    setEditandoAtivo(true);
    setSucessoEdicao(false);
  };

  const salvarEdicao = async () => {
    if (!editandoCodigo.trim()) {
      alert('Código é obrigatório');
      return;
    }

    if (!editandoNome.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    setSubmittingEdicao(true);
    try {
      await api.put(`/departamentos/${editandoId}`, { 
        codigo: Number(editandoCodigo),
        name: editandoNome.trim(),
        ativo: editandoAtivo
      });
      
      setSucessoEdicao(true);
      
      setTimeout(() => {
        setSucessoEdicao(false);
        setDepartamentosSelecionados([]);
        setTodosChecados(false);
        fecharModalEdicao();
        carregarDepartamentos();
      }, 2000);
    } catch (error: any) {
      const mensagem = error.response?.data?.mensagem || 'Erro ao atualizar departamento';
      // não logar erros de validação (409, 400) no console
      if (error.response?.status !== 409 && error.response?.status !== 400) {
     
      }
      alert(mensagem);
    } finally {
      setSubmittingEdicao(false);
    }
  };

  const handleOrdenar = (coluna: 'id' | 'codigo' | 'name' | 'ativo') => {
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

  // Filtrar departamentos
  let departamentosFiltrados = departamentos.filter(d => {
    const nomeMatch = d.name.toLowerCase().includes(nome.toLowerCase());
    const statusMatch = status === 'todos' || 
      (status === 'ativo' && d.ativo) || 
      (status === 'inativo' && !d.ativo);
    return nomeMatch && statusMatch;
  });

  // ordenar departamentos
  if (ordenarPor) {
    departamentosFiltrados = [...departamentosFiltrados].sort((a, b) => {
      let valorA: any = a[ordenarPor];
      let valorB: any = b[ordenarPor];

      if (ordenarPor === 'name') {
        valorA = valorA.toLowerCase();
        valorB = valorB.toLowerCase();
      }

      if (ordenarPor === 'ativo') {
        valorA = valorA ? 1 : 0;
        valorB = valorB ? 1 : 0;
      }

      if (valorA < valorB) return direcaoOrdem === 'asc' ? -1 : 1;
      if (valorA > valorB) return direcaoOrdem === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return (
    <>
      <div className="px-6 py-4" style={{ backgroundColor: theme.brand.subHeader }}>
        <h2 className="text-white text-2xl font-semibold">Gerenciar Departamentos</h2>
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
              disabled={departamentosSelecionados.length !== 1}
            />
            <ActionButton
              type="excluir"
              label="Excluir"
              onClick={excluirDepartamentos}
              disabled={departamentosSelecionados.length === 0}
            />
            <ActionButton
              type="ativar"
              label="Ativar Selecionados"
              onClick={ativarDepartamentosSelecionados}
              disabled={departamentosSelecionados.length === 0}
            />
            <ActionButton
              type="desativar"
              label="Desativar Selecionados"
              onClick={desativarDepartamentosSelecionados}
              disabled={departamentosSelecionados.length === 0}
            />
            {departamentosSelecionados.length > 0 && (
              <span className="text-sm flex items-center ml-2" style={{ color: theme.text.secondary }}>
                {departamentosSelecionados.length} selecionado(s)
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

              {/* Status */}
              <div className="min-w-0">
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'todos' | 'ativo' | 'inativo')}
                  className="w-full min-w-0 px-3 py-2 border rounded focus:outline-none focus:ring-1 text-sm"
                  style={{
                    borderColor: theme.border.secondary,
                    backgroundColor: theme.background.card,
                    color: theme.text.primary,
                  }}
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
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
                onClick={carregarDepartamentos}
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
                Carregando departamentos...
              </div>
            ) : departamentosFiltrados.length === 0 ? (
              <div className="p-8 text-center" style={{ color: theme.text.secondary }}>
                Nenhum departamento encontrado. Use os filtros para pesquisar.
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
                      onClick={() => handleOrdenar('codigo')}
                      style={{ color: theme.text.primary, backgroundColor: theme.background.hover }}
                    >
                      <div className="flex items-center gap-1">
                        Código
                        {ordenarPor === 'codigo' && (
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
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer transition-colors select-none"
                      onClick={() => handleOrdenar('ativo')}
                      style={{ color: theme.text.primary, backgroundColor: theme.background.hover }}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {ordenarPor === 'ativo' && (
                          <span>{direcaoOrdem === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departamentosFiltrados.map((departamento, index) => (
                    <tr
                      key={departamento.id}
                      className="border-b transition-colors"
                      style={{
                        borderColor: theme.border.secondary,
                        backgroundColor: index % 2 === 0 ? theme.background.card : theme.background.surface,
                      }}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={departamentosSelecionados.includes(departamento.id)}
                          onChange={() => handleCheckDepartamento(departamento.id)}
                          className="w-5 h-5 cursor-pointer rounded appearance-none border-2 checked:bg-blue-600 checked:border-blue-600 relative
                          before:content-['✓'] before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-white before:text-sm before:font-bold before:opacity-0 checked:before:opacity-100"
                          style={{
                            borderColor: theme.mode === 'dark' ? '#4B5563' : '#888B95',
                            backgroundColor: departamentosSelecionados.includes(departamento.id) ? '#2563EB' : theme.background.card,
                            boxShadow: `0 0 0 1px ${theme.mode === 'dark' ? '#4B5563' : '#888B95'}`
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: theme.text.primary }}>
                        {departamento.id}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: theme.text.primary }}>
                        {departamento.codigo}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.text.primary }}>
                        {departamento.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full" style={{
                          backgroundColor: departamento.ativo ? '#DCFCE7' : '#FEE2E2',
                          color: departamento.ativo ? '#15803D' : '#7F1D1D',
                        }}>
                          {departamento.ativo ? 'Ativo' : 'Inativo'}
                        </span>
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
                Cadastrar Departamento
              </h3>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6">
              {!sucessoCadastro ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ´codigo */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                        Código *
                      </label>
                      <input
                        type="number"
                        value={novoCodigo}
                        onChange={(e) => setNovoCodigo(e.target.value)}
                        placeholder="Digite o código"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 text-sm"
                        style={{
                          borderColor: theme.border.secondary,
                          backgroundColor: theme.background.card,
                          color: theme.text.primary,
                        }}
                        disabled={submittingCadastro}
                      />
                    </div>

                    {/* nome */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        placeholder="Digite o nome do departamento"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 text-sm"
                        style={{
                          borderColor: theme.border.secondary,
                          backgroundColor: theme.background.card,
                          color: theme.text.primary,
                        }}
                        disabled={submittingCadastro}
                      />
                    </div>

                    {/* ativo */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                        Status
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="novoAtivo"
                            checked={novoAtivo}
                            onChange={() => setNovoAtivo(true)}
                            className="w-4 h-4"
                            style={{ accentColor: theme.brand.primary }}
                            disabled={submittingCadastro}
                          />
                          <span className="ml-2 text-sm" style={{ color: theme.text.primary }}>Ativo</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="novoAtivo"
                            checked={!novoAtivo}
                            onChange={() => setNovoAtivo(false)}
                            className="w-4 h-4"
                            style={{ accentColor: theme.brand.primary }}
                            disabled={submittingCadastro}
                          />
                          <span className="ml-2 text-sm" style={{ color: theme.text.primary }}>Inativo</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* rodapé */}
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
                      onClick={cadastrarDepartamento}
                      disabled={submittingCadastro}
                      className="px-6 py-2 text-white rounded-lg transition-all transform hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      style={{
                        backgroundColor: theme.brand.subHeader,
                      }}
                    >
                      {submittingCadastro ? 'Cadastrando...' : 'Cadastrar'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center min-h-75 animate-fade-in">
                  <div className="text-center">
                    <div className="relative inline-block mb-6">
                      <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
                        <svg className="w-16 h-16 text-white animate-check-draw" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="absolute inset-0 animate-shine-lines">
                        <div className="absolute top-0 left-1/2 w-1 h-6 bg-green-500 -translate-x-1/2 -translate-y-8"></div>
                        <div className="absolute bottom-0 left-1/2 w-1 h-6 bg-green-500 -translate-x-1/2 translate-y-8"></div>
                        <div className="absolute left-0 top-1/2 w-6 h-1 bg-green-500 -translate-x-8 -translate-y-1/2"></div>
                        <div className="absolute right-0 top-1/2 w-6 h-1 bg-green-500 translate-x-8 -translate-y-1/2"></div>
                        <div className="absolute top-3 left-3 w-4 h-1 bg-green-500 -translate-x-8 -translate-y-8 rotate-45"></div>
                        <div className="absolute top-3 right-3 w-4 h-1 bg-green-500 translate-x-8 -translate-y-8 -rotate-45"></div>
                        <div className="absolute bottom-3 left-3 w-4 h-1 bg-green-500 -translate-x-8 translate-y-8 -rotate-45"></div>
                        <div className="absolute bottom-3 right-3 w-4 h-1 bg-green-500 translate-x-8 translate-y-8 rotate-45"></div>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-green-600 mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                      Cadastrado com sucesso!
                    </h2>
                    <p className="text-lg animate-fade-in-up" style={{ animationDelay: '0.3s', color: theme.text.secondary }}>
                      Departamento cadastrado com sucesso!
                    </p>
                  </div>
                </div>
              )}
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
                Editar Departamento
              </h3>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6">
              {!sucessoEdicao ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* código */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                        Código *
                      </label>
                      <input
                        type="number"
                        value={editandoCodigo}
                        onChange={(e) => setEditandoCodigo(e.target.value)}
                        placeholder="Digite o código"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 text-sm"
                        style={{
                          borderColor: theme.border.secondary,
                          backgroundColor: theme.background.card,
                          color: theme.text.primary,
                        }}
                        disabled={submittingEdicao}
                      />
                    </div>

                    {/* nome */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={editandoNome}
                        onChange={(e) => setEditandoNome(e.target.value)}
                        placeholder="Digite o nome do departamento"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 text-sm"
                        style={{
                          borderColor: theme.border.secondary,
                          backgroundColor: theme.background.card,
                          color: theme.text.primary,
                        }}
                        disabled={submittingEdicao}
                      />
                    </div>

                    {/* ativo */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                        Status
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="editandoAtivo"
                            checked={editandoAtivo}
                            onChange={() => setEditandoAtivo(true)}
                            className="w-4 h-4"
                            style={{ accentColor: theme.brand.primary }}
                            disabled={submittingEdicao}
                          />
                          <span className="ml-2 text-sm" style={{ color: theme.text.primary }}>Ativo</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="editandoAtivo"
                            checked={!editandoAtivo}
                            onChange={() => setEditandoAtivo(false)}
                            className="w-4 h-4"
                            style={{ accentColor: theme.brand.primary }}
                            disabled={submittingEdicao}
                          />
                          <span className="ml-2 text-sm" style={{ color: theme.text.primary }}>Inativo</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* rodapé */}
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
                </>
              ) : (
                <div className="flex items-center justify-center min-h-75 animate-fade-in">
                  <div className="text-center">
                    <div className="relative inline-block mb-6">
                      <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
                        <svg className="w-16 h-16 text-white animate-check-draw" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="absolute inset-0 animate-shine-lines">
                        <div className="absolute top-0 left-1/2 w-1 h-6 bg-green-500 -translate-x-1/2 -translate-y-8"></div>
                        <div className="absolute bottom-0 left-1/2 w-1 h-6 bg-green-500 -translate-x-1/2 translate-y-8"></div>
                        <div className="absolute left-0 top-1/2 w-6 h-1 bg-green-500 -translate-x-8 -translate-y-1/2"></div>
                        <div className="absolute right-0 top-1/2 w-6 h-1 bg-green-500 translate-x-8 -translate-y-1/2"></div>
                        <div className="absolute top-3 left-3 w-4 h-1 bg-green-500 -translate-x-8 -translate-y-8 rotate-45"></div>
                        <div className="absolute top-3 right-3 w-4 h-1 bg-green-500 translate-x-8 -translate-y-8 -rotate-45"></div>
                        <div className="absolute bottom-3 left-3 w-4 h-1 bg-green-500 -translate-x-8 translate-y-8 -rotate-45"></div>
                        <div className="absolute bottom-3 right-3 w-4 h-1 bg-green-500 translate-x-8 translate-y-8 rotate-45"></div>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-green-600 mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                      Atualizado com sucesso!
                    </h2>
                   
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}