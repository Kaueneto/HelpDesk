'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import ActionButton from './ActionButton';
import { FiMail, FiX, FiPlus, FiAlertTriangle } from 'react-icons/fi';
import { ThemedSelect } from '@/components/ui/ThemedSelect';
import Checkbox from '@/components/ui/Checkbox';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Destinatario {
  id?: number;
  email: string;
  tipo: 'to' | 'cc' | 'bcc';
}

interface TopicoAjuda {
  id: number;
  codigo: number;
  nome: string;
  ativo: boolean;
}

interface EmailTopicoConfig {
  id: number;
  topicoId: number;
  topico: TopicoAjuda;
  ativo: boolean;
  criadoEm: string;
  editadoEm: string | null;
  destinatarios: Destinatario[];
}

// ─── Validação de e-mail ──────────────────────────────────────────────────────

function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GerenciarNotificacoesTopico() {
  const { theme, mode } = useTheme();

  // ── Estado de dados ──────────────────────────────────────────────────────
  const [configs, setConfigs] = useState<EmailTopicoConfig[]>([]);
  const [topicos, setTopicos] = useState<TopicoAjuda[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Seleção múltipla ─────────────────────────────────────────────────────
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [todosChecados, setTodosChecados] = useState(false);

  // ── Modal de cadastro ────────────────────────────────────────────────────
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [novoTopicoId, setNovoTopicoId] = useState<number | ''>('');
  const [novoAtivo, setNovoAtivo] = useState(true);
  const [novosDestinatarios, setNovosDestinatarios] = useState<Destinatario[]>([]);
  const [novoEmail, setNovoEmail] = useState('');
  const [novoTipo, setNovoTipo] = useState<'to' | 'cc' | 'bcc'>('to');
  const [emailErro, setEmailErro] = useState('');
  const [submittingCadastro, setSubmittingCadastro] = useState(false);
  const [sucessoCadastro, setSucessoCadastro] = useState(false);

  // ── Modal de edição ──────────────────────────────────────────────────────
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoTopicoId, setEditandoTopicoId] = useState<number | ''>('');
  const [editandoAtivo, setEditandoAtivo] = useState(true);
  const [editandoDestinatarios, setEditandoDestinatarios] = useState<Destinatario[]>([]);
  const [editandoEmail, setEditandoEmail] = useState('');
  const [editandoTipo, setEditandoTipo] = useState<'to' | 'cc' | 'bcc'>('to');
  const [editEmailErro, setEditEmailErro] = useState('');
  const [submittingEdicao, setSubmittingEdicao] = useState(false);
  const [sucessoEdicao, setSucessoEdicao] = useState(false);

  // ── Modal de confirmação de exclusão ─────────────────────────────────────
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // ── Filtro ───────────────────────────────────────────────────────────────
  const [filtroTopico, setFiltroTopico] = useState('');

  // ── Carregamento inicial ─────────────────────────────────────────────────

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resConfigs, resTopicos] = await Promise.all([
        api.get('/email-topico-config'),
        api.get('/topicos_ajuda'),
      ]);
      setConfigs(resConfigs.data);
      setTopicos(resTopicos.data.filter((t: TopicoAjuda) => t.ativo));
    } catch (error: any) {
      alert(error.response?.data?.mensagem || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  // ── IDs de tópicos já configurados (para evitar duplicatas no select) ────
  const topicosConfigurados = configs.map((c) => c.topicoId);

  // ── Seleção múltipla ─────────────────────────────────────────────────────

  const handleCheckAll = () => {
    if (todosChecados) {
      setSelecionados([]);
      setTodosChecados(false);
    } else {
      setSelecionados(configsFiltradas.map((c) => c.id));
      setTodosChecados(true);
    }
  };

  const handleCheck = (id: number) => {
    if (selecionados.includes(id)) {
      const next = selecionados.filter((s) => s !== id);
      setSelecionados(next);
      setTodosChecados(false);
    } else {
      const next = [...selecionados, id];
      setSelecionados(next);
      setTodosChecados(next.length === configsFiltradas.length);
    }
  };

  // ── Helpers de destinatários ─────────────────────────────────────────────

  const adicionarDestinatario = (
    email: string,
    tipo: 'to' | 'cc' | 'bcc',
    lista: Destinatario[],
    setLista: (d: Destinatario[]) => void,
    setErro: (e: string) => void,
    setEmail: (e: string) => void
  ) => {
    const emailNormalizado = email.trim().toLowerCase();

    if (!emailNormalizado) {
      setErro('Digite um e-mail.');
      return;
    }
    if (!isEmailValido(emailNormalizado)) {
      setErro('E-mail inválido.');
      return;
    }
    if (lista.some((d) => d.email === emailNormalizado)) {
      setErro('Este e-mail já foi adicionado.');
      return;
    }

    setLista([...lista, { email: emailNormalizado, tipo }]);
    setEmail('');
    setErro('');
  };

  const removerDestinatario = (
    index: number,
    lista: Destinatario[],
    setLista: (d: Destinatario[]) => void
  ) => {
    setLista(lista.filter((_, i) => i !== index));
  };

  // ── Modal de cadastro ────────────────────────────────────────────────────

  const abrirModalCadastro = () => {
    setNovoTopicoId('');
    setNovoAtivo(true);
    setNovosDestinatarios([]);
    setNovoEmail('');
    setNovoTipo('to');
    setEmailErro('');
    setSucessoCadastro(false);
    setModalCadastroAberto(true);
  };

  const fecharModalCadastro = () => {
    setModalCadastroAberto(false);
  };

  const cadastrar = async () => {
    if (!novoTopicoId) {
      alert('Selecione um tópico.');
      return;
    }
    if (novosDestinatarios.length === 0) {
      alert('Adicione pelo menos um destinatário.');
      return;
    }
    if (!novosDestinatarios.some((d) => d.tipo === 'to')) {
      alert('É necessário informar pelo menos um destinatário principal (Para).');
      return;
    }

    setSubmittingCadastro(true);
    try {
      await api.post('/email-topico-config', {
        topicoId: novoTopicoId,
        ativo: novoAtivo,
        destinatarios: novosDestinatarios,
      });

      setSucessoCadastro(true);
      setTimeout(() => {
        setSucessoCadastro(false);
        fecharModalCadastro();
        carregarDados();
        setSelecionados([]);
        setTodosChecados(false);
      }, 1800);
    } catch (error: any) {
      alert(error.response?.data?.mensagem || 'Erro ao criar configuração.');
    } finally {
      setSubmittingCadastro(false);
    }
  };

  // ── Modal de edição ──────────────────────────────────────────────────────

  const abrirModalEdicao = () => {
    if (selecionados.length !== 1) {
      alert('Selecione exatamente uma configuração para editar.');
      return;
    }
    const config = configs.find((c) => c.id === selecionados[0]);
    if (!config) return;

    setEditandoId(config.id);
    setEditandoTopicoId(config.topicoId);
    setEditandoAtivo(config.ativo);
    setEditandoDestinatarios(config.destinatarios.map((d) => ({ ...d })));
    setEditandoEmail('');
    setEditandoTipo('to');
    setEditEmailErro('');
    setSucessoEdicao(false);
    setModalEdicaoAberto(true);
  };

  const fecharModalEdicao = () => {
    setModalEdicaoAberto(false);
    setEditandoId(null);
  };

  const salvarEdicao = async () => {
    if (!editandoTopicoId) {
      alert('Selecione um tópico.');
      return;
    }
    if (editandoDestinatarios.length === 0) {
      alert('Adicione pelo menos um destinatário.');
      return;
    }
    if (!editandoDestinatarios.some((d) => d.tipo === 'to')) {
      alert('É necessário informar pelo menos um destinatário principal (Para).');
      return;
    }

    setSubmittingEdicao(true);
    try {
      await api.put(`/email-topico-config/${editandoId}`, {
        topicoId: editandoTopicoId,
        ativo: editandoAtivo,
        destinatarios: editandoDestinatarios,
      });

      setSucessoEdicao(true);
      setTimeout(() => {
        setSucessoEdicao(false);
        fecharModalEdicao();
        carregarDados();
        setSelecionados([]);
        setTodosChecados(false);
      }, 1800);
    } catch (error: any) {
      alert(error.response?.data?.mensagem || 'Erro ao atualizar configuração.');
    } finally {
      setSubmittingEdicao(false);
    }
  };

  // ── Exclusão ─────────────────────────────────────────────────────────────

  const abrirModalExclusao = () => {
    if (selecionados.length === 0) {
      alert('Selecione pelo menos uma configuração para excluir.');
      return;
    }
    setModalExclusaoAberto(true);
  };

  const confirmarExclusao = async () => {
    setExcluindo(true);
    try {
      await Promise.all(selecionados.map((id) => api.delete(`/email-topico-config/${id}`)));
      setSelecionados([]);
      setTodosChecados(false);
      setModalExclusaoAberto(false);
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.mensagem || 'Erro ao excluir configuração.');
    } finally {
      setExcluindo(false);
    }
  };

  // ── Filtro ───────────────────────────────────────────────────────────────

  const configsFiltradas = configs.filter((c) =>
    c.topico?.nome?.toLowerCase().includes(filtroTopico.toLowerCase())
  );

  // ─── Estilos compartilhados ──────────────────────────────────────────────

  const inputStyle = {
    borderColor: theme.border.secondary,
    backgroundColor: theme.background.card,
    color: theme.text.primary,
  };

  // ─── Badge de tipo de destinatário ───────────────────────────────────────

  const BadgeTipo = ({ tipo }: { tipo: 'to' | 'cc' | 'bcc' }) => {
    const styles: Record<'to' | 'cc' | 'bcc', { bg: string; color: string; border: string; label: string }> = {
      to: {
        bg:     mode === 'dark' ? '#0f172a' : '#dcfce7',
        color:  mode === 'dark' ? '#4ade80' : '#15803d',
        border: mode === 'dark' ? '#4ade80' : '#86efac',
        label: 'Para',
      },
      cc: {
        bg:     mode === 'dark' ? '#0f172a' : '#dbeafe',
        color:  mode === 'dark' ? '#93c5fd' : '#1d4ed8',
        border: mode === 'dark' ? '#93c5fd' : '#93c5fd',
        label: 'CC',
      },
      bcc: {
        bg:     mode === 'dark' ? '#0f172a' : '#f3e8ff',
        color:  mode === 'dark' ? '#d8b4fe' : '#7c3aed',
        border: mode === 'dark' ? '#d8b4fe' : '#c4b5fd',
        label: 'BCC',
      },
    };
    const s = styles[tipo];
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border"
        style={{ backgroundColor: s.bg, color: s.color, borderColor: s.border }}
      >
        {s.label}
      </span>
    );
  };

  // ─── Subcomponente: formulário de destinatários ──────────────────────────

  const FormDestinatarios = ({
    lista,
    setLista,
    emailInput,
    setEmailInput,
    tipoInput,
    setTipoInput,
    erro,
    setErro,
    disabled,
  }: {
    lista: Destinatario[];
    setLista: (d: Destinatario[]) => void;
    emailInput: string;
    setEmailInput: (v: string) => void;
    tipoInput: 'to' | 'cc' | 'bcc';
    setTipoInput: (v: 'to' | 'cc' | 'bcc') => void;
    erro: string;
    setErro: (v: string) => void;
    disabled?: boolean;
  }) => (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
        Destinatários *
      </label>

      {/* Campo de adição */}
      <div className="flex gap-2 mb-2">
        <input
          type="email"
          value={emailInput}
          onChange={(e) => { setEmailInput(e.target.value); setErro(''); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              adicionarDestinatario(emailInput, tipoInput, lista, setLista, setErro, setEmailInput);
            }
          }}
          placeholder="nome@empresa.com"
          disabled={disabled}
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1"
          style={inputStyle}
        />
        <ThemedSelect
          value={tipoInput}
          onChange={(v) => setTipoInput(v as 'to' | 'cc' | 'bcc')}
          disabled={disabled}
          options={[
            { value: 'to',  label: 'Destinatário' },
            { value: 'cc',  label: 'CC - Cópia' },
            { value: 'bcc', label: 'BCC - Cópia oculta' },
          ]}
        />
        <button
          type="button"
          onClick={() =>
            adicionarDestinatario(emailInput, tipoInput, lista, setLista, setErro, setEmailInput)
          }
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: theme.brand.subHeader }}
        >
          <FiPlus size={15} />
          Adicionar
        </button>
      </div>

      {/* Mensagem de erro de e-mail */}
      {erro && (
        <p className="text-xs mb-2" style={{ color: theme.indicators.erro }}>
          {erro}
        </p>
      )}

      {/* Lista de destinatários adicionados */}
      {lista.length > 0 ? (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: theme.background.hover }}
        >
          {lista.map((dest, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-2"
              style={{ backgroundColor: theme.background.surface }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FiMail size={14} style={{ color: theme.text.secondary, flexShrink: 0 }} />
                <span
                  className="text-sm truncate"
                  style={{ color: theme.text.primary }}
                >
                  {dest.email}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <BadgeTipo tipo={dest.tipo} />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removerDestinatario(idx, lista, setLista)}
                    className="p-1 rounded transition-colors hover:bg-red-100"
                    title="Remover destinatário"
                  >
                    <FiX size={14} style={{ color: theme.indicators.erro }} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs italic py-2" style={{ color: theme.text.secondary }}>
          Nenhum destinatário adicionado. Pressione Enter ou clique em "Adicionar".
        </p>
      )}
    </div>
  );

  // ─── Subcomponente: animação de sucesso ───────────────────────────────────

  const SucessoAnimacao = ({ mensagem }: { mensagem: string }) => (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: '#dcfce7' }}
      >
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#16a34a" />
          <path
            d="M7 13l3 3 7-7"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-base font-semibold" style={{ color: '#16a34a' }}>
        {mensagem}
      </p>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Cabeçalho — padrão de todas as telas admin */}
      <div className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg flex items-center justify-between">
        <h2 className="text-white text-2xl font-semibold font-segoe hover:scale-103 transition-transform duration-300">
          Notificações por Tópico
        </h2>
      </div>

      <div className="p-2" style={{ backgroundColor: theme.background.surface }}>
        <div
          className="rounded-lg shadow-lg overflow-hidden"
          style={{
            backgroundColor: theme.background.card,
            border: `1px solid ${theme.border.light}`,
          }}
        >
          {/* Barra de ações */}
          <div
            className="px-6 py-3  flex flex-wrap gap-3 items-center"
            style={{ backgroundColor: theme.background.surface, borderColor: theme.border.primary }}
          >
            <ActionButton type="novo" label="Nova Configuração" onClick={abrirModalCadastro} />
            <ActionButton
              type="editar"
              label="Editar"
              onClick={abrirModalEdicao}
              disabled={selecionados.length !== 1}
            />
            <ActionButton
              type="excluir"
              label="Excluir"
              onClick={abrirModalExclusao}
              disabled={selecionados.length === 0}
            />
            {selecionados.length > 0 && (
              <span className="text-sm flex items-center ml-1" style={{ color: theme.text.secondary }}>
                {selecionados.length} selecionado(s)
              </span>
            )}
          </div>

          {/* Filtro */}
          <div
            className="px-6 py-4 border-b"
            style={{ backgroundColor: theme.background.pagina, borderColor: theme.border.primary }}
          >
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 min-w-0 max-w-sm">
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>
                  Filtrar por tópico
                </label>
                <input
                  type="text"
                  value={filtroTopico}
                  onChange={(e) => setFiltroTopico(e.target.value)}
                  placeholder="Digite o nome do tópico"
                  className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1"
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFiltroTopico('')}
                  className="px-4 py-2 rounded text-sm font-medium border transition-colors"
                  style={{
                    backgroundColor: theme.background.surface,
                    color: theme.text.primary,
                    borderColor: theme.border.secondary,
                  }}
                >
                  Limpar
                </button>
                <button
                  onClick={carregarDados}
                  disabled={loading}
                  className="px-4 py-2 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: theme.brand.subHeader }}
                >
                  {loading ? 'Atualizando...' : 'Atualizar'}
                </button>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-10 text-center" style={{ color: theme.text.secondary }}>
                Carregando configurações...
              </div>
            ) : configsFiltradas.length === 0 ? (
              <div className="p-10 text-center" style={{ color: theme.text.secondary }}>
                {configs.length === 0
                  ? 'Nenhuma configuração cadastrada. Clique em "Nova Configuração" para começar.'
                  : 'Nenhuma configuração encontrada para o filtro informado.'}
              </div>
            ) : (
              <table className="w-full">
                <thead
                  className="border-b"
                  style={{
                    backgroundColor: theme.background.surface,
                    borderColor: theme.border.light,
                  }}
                >
                  <tr>
                    {/* Checkbox */}
                    <th className="px-4 py-3 text-left w-10">
                      <Checkbox
                        checked={todosChecados}
                        onChange={handleCheckAll}
                        indeterminate={selecionados.length > 0 && !todosChecados}
                      />
                    </th>
                    {/* Tópico */}
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold"
                      style={{ color: theme.text.primary, backgroundColor: theme.background.pagina }}
                    >
                      Tópico
                    </th>
                    {/* Destinatários */}
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold"
                      style={{ color: theme.text.primary, backgroundColor: theme.background.pagina }}
                    >
                      Destinatários
                    </th>
                    {/* Status */}
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold"
                      style={{ color: theme.text.primary, backgroundColor: theme.background.pagina }}
                    >
                      Status
                    </th>
                    {/* Criado em */}
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold"
                      style={{ color: theme.text.primary, backgroundColor: theme.background.pagina }}
                    >
                      Criado em
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {configsFiltradas.map((config, index) => (
                    <tr
                      key={config.id}
                      className="border-b transition-colors"
                      style={{
                        borderColor: theme.border.secondary,
                        backgroundColor:
                          mode === 'dark'
                            ? '#1a1a1a'
                            : index % 2 === 0
                            ? theme.background.card
                            : theme.background.surface,
                      }}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selecionados.includes(config.id)}
                          onChange={() => handleCheck(config.id)}
                        />
                      </td>

                      {/* Tópico */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: mode === 'dark' ? '#f1f1f1' : theme.text.primary }}
                          >
                            {config.topico?.nome ?? '—'}
                          </span>
                          {config.topico?.codigo && (
                            <span
                              className="text-xs"
                              style={{ color: mode === 'dark' ? '#999' : theme.text.secondary }}
                            >
                              Código {config.topico.codigo}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Destinatários */}
                      <td className="px-4 py-3">
                        {config.destinatarios.length === 0 ? (
                          <span
                            className="text-sm italic"
                            style={{ color: theme.text.secondary }}
                          >
                            Sem destinatários
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {config.destinatarios.map((dest, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span
                                  className="text-xs"
                                  style={{ color: mode === 'dark' ? '#e5e7eb' : theme.text.primary }}
                                >
                                  {dest.email}
                                </span>
                                <BadgeTipo tipo={dest.tipo} />
                                {i < config.destinatarios.length - 1 && (
                                  <span style={{ color: theme.border.secondary }}>·</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-3 py-1 text-xs font-semibold rounded-lg border"
                          style={{
                            backgroundColor:
                              mode === 'dark'
                                ? '#0f172a'
                                : config.ativo
                                ? '#DCFCE7'
                                : '#FEE2E2',
                            color:
                              mode === 'dark'
                                ? config.ativo
                                  ? '#4ade80'
                                  : '#f87171'
                                : config.ativo
                                ? '#15803D'
                                : '#7F1D1D',
                            borderColor:
                              mode === 'dark'
                                ? config.ativo
                                  ? '#4ade80'
                                  : '#f87171'
                                : config.ativo
                                ? '#86efac'
                                : '#fca5a5',
                            borderWidth: '1.5px',
                          }}
                        >
                          {config.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      {/* Criado em */}
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: mode === 'dark' ? '#999' : theme.text.secondary }}
                      >
                        {new Date(config.criadoEm).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de Cadastro ─────────────────────────────────────────────── */}
      {modalCadastroAberto && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs"
          onClick={fecharModalCadastro}
        >
          <div
            className="rounded-lg    w-full max-w-2xl max-h-[90vh] overflow-y-auto "
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: theme.background.surface }}
          >
            {/* Cabeçalho */}
            <div className="border-b px-6 py-4" style={{ borderColor: theme.background.surface }}>
              <h3 className="text-xl font-semibold" style={{ color: theme.text.primary }}>
                Nova Configuração de Notificação por email
              </h3>
            </div>

            {/* Corpo */}
            <div className="p-6">
              {!sucessoCadastro ? (
                <div className="flex flex-col gap-5">
                  {/* Tópico */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: theme.text.primary }}
                    >
                      Tópico do chamado *
                    </label>
                    <ThemedSelect
                      value={novoTopicoId !== '' ? String(novoTopicoId) : ''}
                      onChange={(v) => setNovoTopicoId(v ? Number(v) : '')}
                      disabled={submittingCadastro}
                      placeholder=" Selecione um tópico "
                      fullWidth
                      options={[
                        { value: '', label: ' Selecione um tópico ', disabled: true },
                        ...topicos
                          .filter((t) => !topicosConfigurados.includes(t.id))
                          .map((t) => ({
                            value: String(t.id),
                            label: `${t.nome} (cód. ${t.codigo})`,
                          })),
                      ]}
                    />
                    {topicos.filter((t) => !topicosConfigurados.includes(t.id)).length === 0 && (
                      <p className="text-xs mt-1" style={{ color: theme.text.secondary }}>
                        Todos os tópicos ativos já possuem configuração.
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: theme.text.primary }}
                    >
                      Status
                    </label>
                    <div className="flex items-center gap-5">
                      {(['ativo', 'inativo'] as const).map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={novoAtivo === (opt === 'ativo')}
                            onChange={() => setNovoAtivo(opt === 'ativo')}
                            disabled={submittingCadastro}
                            className="w-4 h-4"
                            style={{ accentColor: theme.brand.primary }}
                          />
                          <span className="text-sm capitalize" style={{ color: theme.text.primary }}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Destinatários */}
                  <FormDestinatarios
                    lista={novosDestinatarios}
                    setLista={setNovosDestinatarios}
                    emailInput={novoEmail}
                    setEmailInput={setNovoEmail}
                    tipoInput={novoTipo}
                    setTipoInput={setNovoTipo}
                    erro={emailErro}
                    setErro={setEmailErro}
                    disabled={submittingCadastro}
                  />
                </div>
              ) : (
                <SucessoAnimacao mensagem="Configuração criada com sucesso!" />
              )}
            </div>

            {/* Rodapé */}
            {!sucessoCadastro && (
              <div
                className="flex justify-end gap-3 px-6 py-4 border-t"
                style={{ borderColor: theme.border.primary }}
              >
                <button
                  onClick={fecharModalCadastro}
                  disabled={submittingCadastro}
                  className="px-5 py-2 border rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
                  style={{
                    borderColor: theme.border.secondary,
                    color: theme.text.primary,
                    backgroundColor: theme.background.surface,
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={cadastrar}
                  disabled={submittingCadastro}
                  className="px-5 py-2 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  style={{ backgroundColor: theme.brand.subHeader }}
                >
                  {submittingCadastro ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de Edição ───────────────────────────────────────────────── */}
      {modalEdicaoAberto && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={fecharModalEdicao}
        >
          <div
            className="rounded-lg  w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: theme.background.modal }}
          >
            {/* Cabeçalho */}
            <div className="border-b px-6 py-4" style={{ borderColor: theme.border.primary }}>
              <h3 className="text-xl font-semibold" style={{ color: theme.text.primary }}>
                Editar Configuração
              </h3>
            </div>

            {/* Corpo */}
            <div className="p-6">
              {!sucessoEdicao ? (
                <div className="flex flex-col gap-5">
                  {/* Tópico */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: theme.text.primary }}
                    >
                      Tópico do chamado *
                    </label>
                    <ThemedSelect
                      value={editandoTopicoId !== '' ? String(editandoTopicoId) : ''}
                      onChange={(v) => setEditandoTopicoId(v ? Number(v) : '')}
                      disabled={submittingEdicao}
                      placeholder=" Selecione um tópico "
                      fullWidth
                      options={[
                        { value: '', label: ' Selecione um tópico ', disabled: true },
                        ...topicos
                          .filter(
                            (t) =>
                              !topicosConfigurados.includes(t.id) ||
                              t.id === editandoTopicoId
                          )
                          .map((t) => ({
                            value: String(t.id),
                            label: `${t.nome} (cód. ${t.codigo})`,
                          })),
                      ]}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: theme.text.primary }}
                    >
                      Status
                    </label>
                    <div className="flex items-center gap-5">
                      {(['ativo', 'inativo'] as const).map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={editandoAtivo === (opt === 'ativo')}
                            onChange={() => setEditandoAtivo(opt === 'ativo')}
                            disabled={submittingEdicao}
                            className="w-4 h-4"
                            style={{ accentColor: theme.brand.primary }}
                          />
                          <span className="text-sm capitalize" style={{ color: theme.text.primary }}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Destinatários */}
                  <FormDestinatarios
                    lista={editandoDestinatarios}
                    setLista={setEditandoDestinatarios}
                    emailInput={editandoEmail}
                    setEmailInput={setEditandoEmail}
                    tipoInput={editandoTipo}
                    setTipoInput={setEditandoTipo}
                    erro={editEmailErro}
                    setErro={setEditEmailErro}
                    disabled={submittingEdicao}
                  />
                </div>
              ) : (
                <SucessoAnimacao mensagem="Configuração atualizada com sucesso!" />
              )}
            </div>

            {/* Rodapé */}
            {!sucessoEdicao && (
              <div
                className="flex justify-end gap-3 px-6 py-4 border-t"
                style={{ borderColor: theme.border.primary }}
              >
                <button
                  onClick={fecharModalEdicao}
                  disabled={submittingEdicao}
                  className="px-5 py-2 border rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
                  style={{
                    borderColor: theme.border.secondary,
                    color: theme.text.primary,
                    backgroundColor: theme.background.surface,
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarEdicao}
                  disabled={submittingEdicao}
                  className="px-5 py-2 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  style={{ backgroundColor: theme.brand.subHeader }}
                >
                  {submittingEdicao ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de Confirmação de Exclusão ──────────────────────────────── */}
      {modalExclusaoAberto && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => !excluindo && setModalExclusaoAberto(false)}
        >
          <div
            className="rounded-lg shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: theme.background.modal }}
          >
            {/* Cabeçalho */}
            <div className="border-b px-6 py-4" style={{ borderColor: theme.border.primary }}>
              <h3 className="text-xl font-semibold" style={{ color: theme.text.primary }}>
                Confirmar Exclusão
              </h3>
            </div>

            {/* Corpo */}
            <div className="p-6">
              <div className="flex gap-3 items-start">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#fee2e2' }}
                >
                  <FiAlertTriangle size={20} color="#dc2626" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: theme.text.primary }}>
                    Tem certeza que deseja excluir{' '}
                    {selecionados.length === 1
                      ? 'esta configuração'
                      : `estas ${selecionados.length} configurações`}
                    ?
                  </p>
                  <p className="text-sm" style={{ color: theme.text.secondary }}>
                    Os destinatários vinculados também serão removidos. Esta ação não pode ser
                    desfeita.
                  </p>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div
              className="flex justify-end gap-3 px-6 py-4 border-t"
              style={{ borderColor: theme.border.primary }}
            >
              <button
                onClick={() => setModalExclusaoAberto(false)}
                disabled={excluindo}
                className="px-5 py-2 border rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
                style={{
                  borderColor: theme.border.secondary,
                  color: theme.text.primary,
                  backgroundColor: theme.background.surface,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                disabled={excluindo}
                className="px-5 py-2 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:transform-none"
                style={{ backgroundColor: '#dc2626' }}
              >
                {excluindo ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
