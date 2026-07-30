'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import {
  FiPlus,
  FiChevronDown,
  FiChevronRight,
  FiEye,
  FiX,
  FiFileText,
  FiSearch,
  FiFilter,
} from 'react-icons/fi';

// ─── tipos ───────────────────────────────────────────────────
interface Usuario      { id: number; name: string; email: string }
interface Status       { id: number; nome: string }
interface TipoPrioridade { id: number; nome: string }
interface Departamento { id: number; name: string }
interface Cotacao {
  id: number;
  status: string;
  createdAt: string;
  criadoPor: Usuario;
  itens: { id: number; descricao: string; quantidade: number; opcoes: unknown[] }[];
}
interface Solicitacao {
  id: number;
  numeroChamado: number;
  resumoChamado: string;
  descricaoChamado: string;
  dataAbertura: string;
  dataFechamento: string | null;
  usuario: Usuario;
  tipoPrioridade: TipoPrioridade;
  departamento: Departamento;
  status: Status;
  userResponsavel: Usuario | null;
  cotacoes?: Cotacao[];
}

// ─── helpers de cor ─────────────────────────────────────────
const STATUS_CHAMADO_COLOR: Record<number, string> = {
  1: 'bg-yellow-400 text-yellow-900',
  2: 'bg-blue-500 text-white',
  3: 'bg-green-500 text-white',
  4: 'bg-red-500 text-white',
  5: 'bg-orange-400 text-white',
};

const STATUS_COTACAO_COLOR: Record<string, string> = {
  EM_ANDAMENTO:        'bg-blue-500 text-white',
  AGUARDANDO_APROVACAO:'bg-yellow-400 text-yellow-900',
  APROVADA:            'bg-green-500 text-white',
  EM_COMPRA:           'bg-purple-500 text-white',
  FINALIZADA:          'bg-gray-400 text-white',
  CANCELADA:           'bg-red-500 text-white',
};

const STATUS_COTACAO_LABEL: Record<string, string> = {
  EM_ANDAMENTO:        'Em Andamento',
  AGUARDANDO_APROVACAO:'Aguardando Aprovação',
  APROVADA:            'Aprovada',
  EM_COMPRA:           'Em Compra',
  FINALIZADA:          'Finalizada',
  CANCELADA:           'Cancelada',
};

const PRIORIDADE_COLOR: Record<string, string> = {
  BAIXA:  'bg-gray-100 text-gray-600',
  MÉDIA:  'bg-yellow-100 text-yellow-700',
  MEDIA:  'bg-yellow-100 text-yellow-700',
  ALTA:   'bg-orange-100 text-orange-700',
  URGENTE:'bg-red-100 text-red-700',
};

function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── componente principal ───────────────────────────────────
export default function GerenciarSolicitacoesCompras() {
  const { mode } = useTheme();
  const router   = useRouter();

  const [solicitacoes, setSolicitacoes]           = useState<Solicitacao[]>([]);
  const [detalhes, setDetalhes]                   = useState<Record<number, Solicitacao>>({});
  const [expandedIds, setExpandedIds]             = useState<Set<number>>(new Set());
  const [loading, setLoading]                     = useState(false);
  const [busca, setBusca]                         = useState('');
  const [filtroStatus, setFiltroStatus]           = useState('todos');
  const [modalAberto, setModalAberto]             = useState(false);
  const [chamadoSelecionado, setChamadoSelecionado] = useState<number | null>(null);
  const [criando, setCriando]                     = useState(false);

  // cores
  const bg     = mode === 'dark' ? '#0F172A' : '#EDEDED';
  const card   = mode === 'dark' ? '#1E293B' : '#FFFFFF';
  const text   = mode === 'dark' ? '#F1F5F9' : '#1E293B';
  const border = mode === 'dark' ? '#334155' : '#E2E8F0';
  const subBg  = mode === 'dark' ? '#0F172A' : '#F8FAFC';
  const inputBg= mode === 'dark' ? '#1E293B' : '#FFFFFF';

  useEffect(() => { carregarSolicitacoes(); }, []);

  async function carregarSolicitacoes() {
    setLoading(true);
    try {
      const r = await api.get('/compras/solicitacoes');
      setSolicitacoes(r.data);
    } catch { alert('Erro ao carregar solicitações'); }
    finally { setLoading(false); }
  }

  async function carregarDetalhes(id: number) {
    try {
      const r = await api.get(`/compras/solicitacoes/${id}`);
      setDetalhes(prev => ({
        ...prev,
        [id]: { ...r.data.solicitacao, cotacoes: r.data.cotacoes },
      }));
    } catch { alert('Erro ao carregar detalhes'); }
  }

  async function toggleExpand(id: number) {
    const next = new Set(expandedIds);
    if (next.has(id)) { next.delete(id); }
    else {
      next.add(id);
      if (!detalhes[id]) await carregarDetalhes(id);
    }
    setExpandedIds(next);
  }

  async function criarCotacao(chamadoId: number) {
    if (!chamadoId) return;
    setCriando(true);
    try {
      const r = await api.post('/compras/cotacoes', { chamadoId });
      setModalAberto(false);
      setChamadoSelecionado(null);
      router.push(`/compras/cotacoes/${r.data.cotacao.id}`);
    } catch { alert('Erro ao criar cotação'); }
    finally { setCriando(false); }
  }

  // ─── métricas para o mini dashboard ──────────────────────
  const metricas = useMemo(() => {
    const total     = solicitacoes.length;
    const abertas   = solicitacoes.filter(s => s.status.id === 1).length;
    const emAnalise = solicitacoes.filter(s => s.status.id === 2).length;
    const encerradas= solicitacoes.filter(s => s.status.id === 3).length;
    const totalCotacoes = Object.values(detalhes).reduce(
      (acc, d) => acc + (d.cotacoes?.length ?? 0), 0
    );
    return { total, abertas, emAnalise, encerradas, totalCotacoes };
  }, [solicitacoes, detalhes]);

  // ─── filtro ──────────────────────────────────────────────
  const filtradas = useMemo(() => solicitacoes.filter(s => {
    const okStatus = filtroStatus === 'todos' || s.status.id.toString() === filtroStatus;
    const q = busca.toLowerCase();
    const okBusca  = !q
      || s.numeroChamado.toString().includes(q)
      || s.resumoChamado.toLowerCase().includes(q)
      || s.usuario.name.toLowerCase().includes(q)
      || s.departamento.name.toLowerCase().includes(q);
    return okStatus && okBusca;
  }), [solicitacoes, busca, filtroStatus]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: bg }}>
      <div className="text-lg" style={{ color: text }}>Carregando...</div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg }}>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Solicitações de Compras</h1>
    
          </div>
          <button
            onClick={() => { setModalAberto(true); setChamadoSelecionado(null); }}
            className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <FiPlus /> Nova Cotação
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total de Solicitações', value: metricas.total,        color: 'from-blue-500 to-blue-600'   },
            { label: 'Abertas',               value: metricas.abertas,      color: 'from-yellow-400 to-yellow-500'},
            { label: 'Em Análise',            value: metricas.emAnalise,    color: 'from-blue-400 to-blue-500'   },
            { label: 'Encerradas',            value: metricas.encerradas,   color: 'from-green-500 to-green-600' },
            { label: 'Cotações Criadas',      value: metricas.totalCotacoes,color: 'from-purple-500 to-purple-600'},
          ].map((m) => (
            <div
              key={m.label}
              className={`bg-gradient-to-br ${m.color} text-white rounded-xl px-5 py-4 shadow-md`}
            >
              <p className="text-3xl font-bold">{m.value}</p>
              <p className="text-sm mt-1 opacity-90">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
       
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: text }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por número, assunto, solicitante..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm"
              style={{ backgroundColor: inputBg, borderColor: border, color: text }}
            />
          </div>
                 <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: text }} />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-lg border text-sm appearance-none"
              style={{ backgroundColor: inputBg, borderColor: border, color: text }}
            >
              <option value="todos">Todos os status</option>
              <option value="1">Aberto</option>
              <option value="2">Em Análise</option>
              <option value="3">Encerrado</option>
              <option value="5">Reaberto</option>
            </select>
          </div>
        </div>

        {/* lista das coliticacoes */}
        <div className="space-y-3">
          {filtradas.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ backgroundColor: card, color: text }}>
              <FiFileText className="mx-auto text-5xl mb-4 opacity-20" />
              <p className="text-lg font-medium opacity-60">Nenhuma solicitação encontrada</p>
            </div>
          ) : filtradas.map((sol) => {
            const isExpanded = expandedIds.has(sol.id);
            const det        = detalhes[sol.id];
            const prioKey    = sol.tipoPrioridade.nome.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
            const prioCls    = PRIORIDADE_COLOR[prioKey] ?? 'bg-gray-100 text-gray-600';

            return (
              <div
                key={sol.id}
                className="rounded-xl overflow-hidden shadow-sm"
                style={{ backgroundColor: card, border: `1px solid ${border}` }}
              >
                {/* Linha principal */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-opacity-80 transition-colors"
                  style={{ backgroundColor: card }}
                  onClick={() => toggleExpand(sol.id)}
                >
                  {/* chevron */}
                  <span style={{ color: text }}>
                    {isExpanded ? <FiChevronDown className="text-xl" /> : <FiChevronRight className="text-xl" />}
                  </span>

                  {/* número */}
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white shrink-0">
                    #{sol.numeroChamado}
                  </span>

                  {/* título */}
                  <span className="font-semibold flex-1 truncate" style={{ color: text }}>
                    {sol.resumoChamado}
                  </span>

                  {/* badges */}
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CHAMADO_COLOR[sol.status.id] ?? 'bg-gray-300 text-gray-700'}`}>
                      {sol.status.nome}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${prioCls}`}>
                      {sol.tipoPrioridade.nome}
                    </span>
                    <span className="text-xs opacity-50 hidden lg:block" style={{ color: text }}>
                      {sol.departamento.name}
                    </span>
                    <span className="text-xs opacity-50 hidden lg:block" style={{ color: text }}>
                      {fmtData(sol.dataAbertura)}
                    </span>
                  </div>

                  {/* ações */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => criarCotacao(sol.id)}
                      title="Nova cotação"
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
                    >
                      <FiPlus />
                    </button>
                    <button
                      onClick={() => router.push(`/chamado/${sol.id}`)}
                      title="Ver chamado"
                      className="p-2 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                      style={{ color: text }}
                    >
                      <FiEye />
                    </button>
                  </div>
                </div>

                {/* info extra mobile */}
                <div className="md:hidden flex flex-wrap gap-2 px-5 pb-3" onClick={() => toggleExpand(sol.id)}>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CHAMADO_COLOR[sol.status.id] ?? 'bg-gray-300'}`}>
                    {sol.status.nome}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${prioCls}`}>
                    {sol.tipoPrioridade.nome}
                  </span>
                  <span className="text-xs opacity-50" style={{ color: text }}>{sol.departamento.name}</span>
                </div>

                {/* ── Accordion: cotações ── */}
                {isExpanded && (
                  <div style={{ backgroundColor: subBg, borderTop: `1px solid ${border}` }}>
                    {!det ? (
                      <p className="px-6 py-4 text-sm opacity-50" style={{ color: text }}>Carregando...</p>
                    ) : !det.cotacoes || det.cotacoes.length === 0 ? (
                      <div className="px-6 py-6 text-center">
                        <p className="text-sm opacity-50 mb-3" style={{ color: text }}>
                          Nenhuma cotação criada para esta solicitação
                        </p>
                        <button
                          onClick={() => criarCotacao(sol.id)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium flex items-center gap-2 mx-auto"
                        >
                          <FiPlus /> Criar Cotação
                        </button>
                      </div>
                    ) : (
                      <div className="px-6 py-4 space-y-3">
                        {det.cotacoes.map((cot) => (
                          <div
                            key={cot.id}
                            className="flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                            style={{ backgroundColor: card, border: `1px solid ${border}` }}
                            onClick={() => router.push(`/compras/cotacoes/${cot.id}`)}
                          >
                            <div className="flex items-center gap-3">
                              <FiFileText className="text-blue-500" />
                              <span className="font-medium text-sm" style={{ color: text }}>
                                Cotação #{cot.id}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COTACAO_COLOR[cot.status] ?? 'bg-gray-300'}`}>
                                {STATUS_COTACAO_LABEL[cot.status] ?? cot.status}
                              </span>
                              {cot.itens?.length > 0 && (
                                <span className="text-xs opacity-50" style={{ color: text }}>
                                  {cot.itens.length} {cot.itens.length === 1 ? 'item' : 'itens'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs opacity-40 hidden sm:block" style={{ color: text }}>
                                por {cot.criadoPor.name} em {fmtData(cot.createdAt)}
                              </span>
                              <FiChevronRight className="opacity-40" style={{ color: text }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── modal Nova Cotação ── */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl"
            style={{ backgroundColor: card }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{ color: text }}>Nova Cotação</h2>
              <button onClick={() => setModalAberto(false)} className="opacity-50 hover:opacity-100 transition-opacity" style={{ color: text }}>
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: text }}>
                  Selecione a solicitação de compra
                </label>
                <select
                  value={chamadoSelecionado ?? ''}
                  onChange={(e) => setChamadoSelecionado(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg border text-sm"
                  style={{ backgroundColor: mode === 'dark' ? '#334155' : '#F8FAFC', borderColor: border, color: text }}
                >
                  <option value="">Escolha uma solicitação...</option>
                  {solicitacoes.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.numeroChamado} — {s.resumoChamado} ({s.usuario.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 rounded-lg border text-sm"
                  style={{ borderColor: border, color: text }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => chamadoSelecionado && criarCotacao(chamadoSelecionado)}
                  disabled={!chamadoSelecionado || criando}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  {criando ? 'Criando...' : <><FiPlus /> Criar Cotação</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
