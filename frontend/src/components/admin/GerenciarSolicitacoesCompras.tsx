'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import {
  FiPlus,
  FiChevronRight,
  FiEye,
  FiX,
  FiFileText,
  FiSearch,
} from 'react-icons/fi';
import { SearchableSelect, type SelectOption } from '@/components/ui/SearchableSelect';

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
// bgLight/bgDark adaptativos — texto sempre legível em ambos os temas
const STATUS_CHAMADO_STYLE: Record<number, {
  bgLight: string; bgDark: string; textLight: string; textDark: string; dot: string; label: string;
}> = {
  1: { bgLight:'#fef3c7', bgDark:'#451a03', textLight:'#92400e', textDark:'#fcd34d', dot:'#f59e0b', label:'Aberto'        },
  2: { bgLight:'#dbeafe', bgDark:'#1e3a5f', textLight:'#1d4ed8', textDark:'#93c5fd', dot:'#3b82f6', label:'Em Análise'    },
  3: { bgLight:'#dcfce7', bgDark:'#14532d', textLight:'#15803d', textDark:'#86efac', dot:'#22c55e', label:'Encerrado'     },
  4: { bgLight:'#fee2e2', bgDark:'#450a0a', textLight:'#b91c1c', textDark:'#fca5a5', dot:'#ef4444', label:'Cancelado'     },
  5: { bgLight:'#ffedd5', bgDark:'#431407', textLight:'#c2410c', textDark:'#fdba74', dot:'#f97316', label:'Reaberto'      },
  6: { bgLight:'#ede9fe', bgDark:'#2e1065', textLight:'#7c3aed', textDark:'#c4b5fd', dot:'#8b5cf6', label:'Pend. Usuário' },
  7: { bgLight:'#e0f2fe', bgDark:'#0c4a6e', textLight:'#0369a1', textDark:'#7dd3fc', dot:'#0ea5e9', label:'Pend. Terceiros'},
};

const STATUS_COTACAO_STYLE: Record<string, { bgLight:string; bgDark:string; textLight:string; textDark:string; label:string }> = {
  EM_ANDAMENTO:        { bgLight:'#dbeafe', bgDark:'#1e3a5f', textLight:'#1d4ed8', textDark:'#93c5fd', label:'Em Andamento'  },
  AGUARDANDO_APROVACAO:{ bgLight:'#fef3c7', bgDark:'#451a03', textLight:'#92400e', textDark:'#fcd34d', label:'Ag. Aprovação' },
  APROVADA:            { bgLight:'#dcfce7', bgDark:'#14532d', textLight:'#15803d', textDark:'#86efac', label:'Aprovada'       },
  EM_COMPRA:           { bgLight:'#f3e8ff', bgDark:'#2e1065', textLight:'#7c3aed', textDark:'#c4b5fd', label:'Em Compra'      },
  FINALIZADA:          { bgLight:'#f1f5f9', bgDark:'#1e293b', textLight:'#475569', textDark:'#94a3b8', label:'Finalizada'     },
  CANCELADA:           { bgLight:'#fee2e2', bgDark:'#450a0a', textLight:'#b91c1c', textDark:'#fca5a5', label:'Cancelada'      },
};

const PRIORIDADE_STYLE: Record<string, { dot: string; label: string }> = {
  BAIXO:   { dot:'#22c55e', label:'Baixo'   },
  MEDIO:   { dot:'#3b82f6', label:'Médio'   },
  ALTO:    { dot:'#f97316', label:'Alto'    },
  URGENTE: { dot:'#ef4444', label:'Urgente' },
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
  const [filtroStatus, setFiltroStatus]           = useState<string | number | (string | number)[]>('todos');
  const [modalAberto, setModalAberto]             = useState(false);
  const [chamadoSelecionado, setChamadoSelecionado] = useState<number | null>(null);
  const [criando, setCriando]                     = useState(false);

  const statusOptions: SelectOption[] = [
    { value: 'todos', label: 'Todos os status' },
    { value: '1', label: 'Aberto' },
    { value: '2', label: 'Em Análise' },
    { value: '3', label: 'Encerrado' },
    { value: '5', label: 'Reaberto' },
  ];

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
  const STATUS_ORDEM: Record<number, number> = {
    1: 0,
    2: 1,
    6: 2,
    7: 3,
    5: 4,
    3: 5,
    4: 6,
  };

  const solicitacoesAgrupadas = useMemo(() => {
    const filtradas = solicitacoes.filter(s => {
      let okStatus = false;
      if (filtroStatus === 'todos') {
        okStatus = true;
      } else if (Array.isArray(filtroStatus)) {
        okStatus = filtroStatus.some(st => s.status.id.toString() === st.toString());
      } else {
        okStatus = s.status.id.toString() === filtroStatus.toString();
      }
      const q = busca.toLowerCase();
      const okBusca  = !q
        || s.numeroChamado.toString().includes(q)
        || s.resumoChamado.toLowerCase().includes(q)
        || s.usuario.name.toLowerCase().includes(q)
        || s.departamento.name.toLowerCase().includes(q);
      return okStatus && okBusca;
    });

    const ordenadas = [...filtradas].sort((a, b) => {
      const ordemA = STATUS_ORDEM[a.status.id] ?? 99;
      const ordemB = STATUS_ORDEM[b.status.id] ?? 99;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return new Date(b.dataAbertura).getTime() - new Date(a.dataAbertura).getTime();
    });

    const ativas = ordenadas.filter(s => s.status.id !== 3);
    const encerradas = ordenadas.filter(s => s.status.id === 3);

    return { ativas, encerradas };
  }, [solicitacoes, busca, filtroStatus]);

  const renderSolicitacaoCard = (sol: Solicitacao) => {
    const isExpanded = expandedIds.has(sol.id);
    const det = detalhes[sol.id];

    const prioNome = sol.tipoPrioridade.nome.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const prio = PRIORIDADE_STYLE[prioNome] ?? { dot: '#94a3b8', label: sol.tipoPrioridade.nome };

    const statusSt = STATUS_CHAMADO_STYLE[sol.status.id] ?? {
      bgLight: '#f1f5f9',
      bgDark: '#1e293b',
      textLight: '#475569',
      textDark: '#94a3b8',
      dot: '#94a3b8',
      label: sol.status.nome,
    };
    const accent = statusSt.dot;

    const cardBase: React.CSSProperties = {
      backgroundColor: card,
      borderRadius: '12px',
      overflow: 'hidden',
      border: `1px solid ${border}`,
      transition: 'box-shadow 200ms ease, transform 200ms ease',
    };

    const totalCotacoes = det?.cotacoes?.length ?? 0;

    return (
      <div
        key={sol.id}
        style={cardBase}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = 'translateY(-2px)';
          el.style.boxShadow = mode === 'dark'
            ? `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px ${accent}40`
            : `0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px ${accent}30`;
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = 'translateY(0)';
          el.style.boxShadow = isExpanded
            ? (mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.08)')
            : 'none';
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
          onClick={() => toggleExpand(sol.id)}
        >
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0"
            style={{
              color: isExpanded ? accent : (mode === 'dark' ? '#64748b' : '#94a3b8'),
              transition: 'transform 220ms cubic-bezier(0.4,0,0.2,1), color 180ms ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            <FiChevronRight size={15} />
          </span>

          <span
            className="text-[11px] font-mono font-bold shrink-0 px-2 py-0.5 rounded"
            style={{ color: accent, backgroundColor: `${accent}15` }}
          >
            #{sol.numeroChamado}
          </span>

          <span className="font-medium flex-1 truncate text-sm" style={{ color: text }}>
            {sol.resumoChamado}
          </span>

          <div className="hidden md:flex items-center gap-4 shrink-0 text-xs" style={{ color: text }}>
            <span
              className="px-2.5 py-1 rounded-full font-semibold tracking-wide uppercase text-[10px] flex items-center gap-1.5"
              style={{
                backgroundColor: `${prio.dot}20`,
                color: prio.dot,
                border: `1px solid ${prio.dot}40`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: prio.dot }}></span>
              {prio.label}
            </span>

            {det && (
              <span
                className="px-2.5 py-1 rounded-full font-semibold text-[10px] flex items-center gap-1.5"
                style={{
                  backgroundColor: mode === 'dark' ? '#1e40af30' : '#dbeafe',
                  color: mode === 'dark' ? '#93c5fd' : '#1d4ed8',
                  border: `1px solid ${mode === 'dark' ? '#1e40af50' : '#93c5fd50'}`,
                }}
              >
                <FiFileText size={10} />
                {totalCotacoes} {totalCotacoes === 1 ? 'cotação' : 'cotações'}
              </span>
            )}

            <span className="opacity-55 hidden lg:block max-w-[130px] truncate">
              {sol.usuario.name}
            </span>

            <span className="opacity-45 hidden xl:block max-w-[120px] truncate">
              {sol.departamento.name}
            </span>

            <span className="opacity-35 hidden xl:block tabular-nums">
              {fmtData(sol.dataAbertura)}
            </span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => criarCotacao(sol.id)}
              title="Nova cotação"
              className="p-1.5 rounded-lg text-sm transition-all duration-150"
              style={{ color: accent }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${accent}18`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
            >
              <FiPlus size={14} />
            </button>
            <div className="relative group">
              <button
                onClick={() => router.push(`/chamado/${sol.id}`)}
                className="p-1.5 rounded-lg transition-all duration-150 opacity-40 hover:opacity-100"
                style={{ color: text }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${text}10`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
              >
                <FiEye size={14} />
              </button>
              <div
                className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-10"
                style={{
                  backgroundColor: mode === 'dark' ? '#1e293b' : '#334155',
                  color: '#ffffff',
                }}
              >
                Visualizar chamado desta solicitação
                <div
                  className="absolute top-full right-3 w-0 h-0"
                  style={{
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `4px solid ${mode === 'dark' ? '#1e293b' : '#334155'}`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="md:hidden flex flex-wrap items-center gap-3 px-5 pb-3 text-xs"
          style={{ color: text }}
          onClick={() => toggleExpand(sol.id)}
        >
          <span
            className="px-2.5 py-1 rounded-full font-semibold tracking-wide uppercase text-[10px] flex items-center gap-1.5"
            style={{
              backgroundColor: `${prio.dot}20`,
              color: prio.dot,
              border: `1px solid ${prio.dot}40`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: prio.dot }}></span>
            {prio.label}
          </span>
          {det && (
            <span
              className="px-2.5 py-1 rounded-full font-semibold text-[10px] flex items-center gap-1.5"
              style={{
                backgroundColor: mode === 'dark' ? '#1e40af30' : '#dbeafe',
                color: mode === 'dark' ? '#93c5fd' : '#1d4ed8',
                border: `1px solid ${mode === 'dark' ? '#1e40af50' : '#93c5fd50'}`,
              }}
            >
              <FiFileText size={10} />
              {totalCotacoes}
            </span>
          )}
          <span className="opacity-50">{sol.usuario.name}</span>
          <span className="opacity-40">{sol.departamento.name}</span>
        </div>

        <div
          style={{
            maxHeight: isExpanded ? '1000px' : '0',
            overflow: 'hidden',
            transition: 'max-height 320ms cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <div style={{ borderTop: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, backgroundColor: subBg }}>
            <div className="px-6 py-3 flex flex-wrap gap-x-5 gap-y-1 text-xs border-b font-segoe "
              style={{ borderColor: mode === 'dark' ? '#334155' : '#e2e8f0', color: mode === 'dark' ? '#94a3b8' : '#64748b' }}>
              <span>Solicitante: <strong style={{ color: text }}>{sol.usuario.name}</strong></span>
              <span>Departamento: <strong style={{ color: text }}>{sol.departamento.name}</strong></span>
              <span>Solicitado em: <strong style={{ color: text }}>{fmtData(sol.dataAbertura)}</strong></span>
              {sol.userResponsavel && (
                <span>Responsável: <strong style={{ color: text }}>{sol.userResponsavel.name}</strong></span>
              )}
            </div>

            {!det ? (
              <p className="px-6 py-4 text-sm opacity-40" style={{ color: text }}>Carregando...</p>
            ) : !det.cotacoes || det.cotacoes.length === 0 ? (
              <div className="px-6 py-6 text-center">
                <p className="text-sm opacity-40 mb-3" style={{ color: text }}>
                  Nenhuma cotação criada para esta solicitação
                </p>
                <button onClick={() => criarCotacao(sol.id)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium flex items-center gap-2 mx-auto transition-colors">
                  <FiPlus /> Criar Cotação
                </button>
              </div>
            ) : (
              <div className="px-6 py-4 space-y-2">
                {det.cotacoes.map((cot) => {
                  const cs = STATUS_COTACAO_STYLE[cot.status];
                  const cbg = cs ? (mode === 'dark' ? cs.bgDark : cs.bgLight) : (mode === 'dark' ? '#1e293b' : '#f1f5f9');
                  const ctxt = cs ? (mode === 'dark' ? cs.textDark : cs.textLight) : '#94a3b8';

                  return (
                    <div key={cot.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer"
                      style={{
                        backgroundColor: card,
                        border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                        transition: 'box-shadow 150ms ease, transform 150ms ease',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLDivElement;
                        el.style.transform = 'translateX(2px)';
                        el.style.boxShadow = mode === 'dark' ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.09)';
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLDivElement;
                        el.style.transform = 'translateX(0)';
                        el.style.boxShadow = 'none';
                      }}
                      onClick={() => router.push(`/compras/cotacoes/${cot.id}`)}
                    >
                      <div className="flex items-center gap-3 text-sm">
                        <FiFileText size={14} style={{ color: mode === 'dark' ? '#64748b' : '#94a3b8' }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium" style={{ color: text }}>Cotação #{cot.id}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                              style={{ backgroundColor: cbg, color: ctxt }}>
                              {cs?.label ?? cot.status}
                            </span>
                          </div>
                          {cot.itens?.length > 0 && (
                            <p className="text-[11px] mt-0.5 truncate max-w-xs" style={{ color: mode === 'dark' ? '#64748b' : '#94a3b8' }}>
                              {cot.itens.length} {cot.itens.length === 1 ? 'item' : 'itens'}
                              {(cot.itens[0] as any)?.descricao ? ` · ${(cot.itens[0] as any).descricao}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs opacity-40" style={{ color: text }}>
                        <span className="hidden sm:block">{cot.criadoPor.name} · {fmtData(cot.createdAt)}</span>
                        <FiChevronRight size={13} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
            <h1 className="text-2xl font-bold hover:scale-105 transition-transform duration-300">Solicitações de Compras</h1>
    
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
            { label: 'Em Análise',            value: metricas.emAnalise,    color: 'from-red-400 to-red-500'   },
            { label: 'Encerradas',            value: metricas.encerradas,   color: 'from-green-500 to-green-600' },
            { label: 'Cotações Criadas',      value: metricas.totalCotacoes,color: 'from-purple-500 to-purple-600'},
          ].map((m) => (
            <div
              key={m.label}
              className={`bg-gradient-to-br ${m.color} text-white rounded-xl px-5 py-4 shadow-md hover:scale-105 transition-all`}
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
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm hover:scale-101 transition-all"
              style={{ backgroundColor: inputBg, borderColor: border, color: text }}
            />
          </div>
          <div className="w-full sm:w-48">
            <SearchableSelect
              value={filtroStatus}
              onChange={(value: string | number | (string | number)[]) => setFiltroStatus(value)}
              options={statusOptions}
              placeholder="Todos os status"
              width="100%"
              fullWidth
              dropdownWidth={220}
            />
          </div>
        </div>

        {/* lista das solicitações */}
        <div className="space-y-4">
          {solicitacoesAgrupadas.ativas.length === 0 && solicitacoesAgrupadas.encerradas.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ backgroundColor: card, color: text }}>
              <FiFileText className="mx-auto text-5xl mb-4 opacity-20" />
              <p className="text-lg font-medium opacity-60">Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <>
              {solicitacoesAgrupadas.ativas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                      <div className="h-px flex-1 bg-gray-500/20" />
                    <span className="text-xs font-semibold font-segoe " style={{ color: mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                      Em andamento
                    </span>
                      <div className="h-px flex-1 bg-gray-500/20" />
                  </div>
                  {solicitacoesAgrupadas.ativas.map((sol) => renderSolicitacaoCard(sol))}
                </div>
              )}

             {solicitacoesAgrupadas.encerradas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1 pt-2">
                    <div className="h-px flex-1 bg-gray-500/20" />

                    <span
                      className="text-xs font-semibold font-segoe"
                      style={{ color: mode === 'dark' ? '#94a3b8' : '#64748b' }}
                    >
                      Encerradas
                    </span>

                    <div className="h-px flex-1 bg-gray-500/20" />
                  </div>

                  {solicitacoesAgrupadas.encerradas.map((sol) => renderSolicitacaoCard(sol))}
                </div>
              )}
            </>
          )}
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
