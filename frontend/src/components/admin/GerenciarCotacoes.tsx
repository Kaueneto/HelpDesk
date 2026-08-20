'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { FiFileText, FiTrash2, FiSearch, FiPackage } from 'react-icons/fi';

interface Usuario {
  id: number;
  name: string;
  email: string;
}

interface Chamado {
  id: number;
  numeroChamado: number;
  resumoChamado: string;
  usuario: Usuario;
}

interface CotacaoItemOpcao {
  id: number;
  valor_avista: number;
  valor_parcelado: number;
  valor_frete: number;
  valor_total: number;
  quantidade: number;
  selecionado: boolean;
}

interface CotacaoItem {
  id: number;
  descricao: string;
  quantidade: number;
  opcoes?: CotacaoItemOpcao[];
}

interface Cotacao {
  id: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  criadoPor: Usuario;
  chamado: Chamado;
  itens?: CotacaoItem[];
}

//  helpers de estilo 
const STATUS_STYLE: Record<string, {
  bgLight: string; bgDark: string; textLight: string; textDark: string; dot: string; label: string;
}> = {
  EM_ANDAMENTO:         { bgLight:'#dbeafe', bgDark:'#1e3a5f', textLight:'#1d4ed8', textDark:'#93c5fd', dot:'#3b82f6', label:'Em Andamento'  },
  AGUARDANDO_APROVACAO: { bgLight:'#fef3c7', bgDark:'#451a03', textLight:'#92400e', textDark:'#fcd34d', dot:'#f59e0b', label:'Aguardando Aprovação' },
  APROVADA:             { bgLight:'#dcfce7', bgDark:'#14532d', textLight:'#15803d', textDark:'#86efac', dot:'#22c55e', label:'Aprovada'       },
  EM_COMPRA:            { bgLight:'#f3e8ff', bgDark:'#2e1065', textLight:'#7c3aed', textDark:'#c4b5fd', dot:'#8b5cf6', label:'Em Compra'      },
  FINALIZADA:           { bgLight:'#f1f5f9', bgDark:'#1e293b', textLight:'#475569', textDark:'#94a3b8', dot:'#64748b', label:'Finalizada'     },
  CANCELADA:            { bgLight:'#fee2e2', bgDark:'#450a0a', textLight:'#b91c1c', textDark:'#fca5a5', dot:'#ef4444', label:'Cancelada'      },
};

function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Calcula o menor valor total entre as opções de todos os itens (soma dos menores preços por item)
function calcularValorTotal(itens?: CotacaoItem[]): number | null {
  if (!itens || itens.length === 0) return null;
  let total = 0;
  let temOpcao = false;
  for (const item of itens) {
    if (!item.opcoes || item.opcoes.length === 0) continue;
    const precos = item.opcoes.map(o => Number(o.valor_avista || 0) * item.quantidade);
    const menor = Math.min(...precos);
    if (isFinite(menor)) { total += menor; temOpcao = true; }
  }
  return temOpcao ? total : null;
}

function calcularValorMedio(itens?: CotacaoItem[]): number | null {
  if (!itens || itens.length === 0) return null;
  let somaMedias = 0;
  let count = 0;
  for (const item of itens) {
    if (!item.opcoes || item.opcoes.length === 0) continue;
    const media = item.opcoes.reduce((acc, o) => acc + Number(o.valor_avista || 0), 0) / item.opcoes.length;
    somaMedias += media * item.quantidade;
    count++;
  }
  return count > 0 ? somaMedias : null;
}

//  componente principal 
export default function GerenciarCotacoes() {
  const { mode, theme } = useTheme();
  const router   = useRouter();

  const [cotacoes, setCotacoes]         = useState<Cotacao[]>([]);
  const [loading, setLoading]           = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca]               = useState('');

  // cores
  const bg      = mode === 'dark' ? '#0F172A' : '#EDEDED';
  const card    = mode === 'dark' ? '#1E293B' : '#cdcdcdff';
  const text    = mode === 'dark' ? '#F1F5F9' : '#1E293B';
  const border  = mode === 'dark' ? '#334155' : '#E2E8F0';
  const inputBg = mode === 'dark' ? '#1E293B' : '#FFFFFF';
  const muted   = mode === 'dark' ? '#64748b' : '#94a3b8';
  const seconcolorgray =  mode === 'dark' ? '#aaaaaad3' : '#94a3b8';
  
  useEffect(() => { carregarCotacoes(); }, []);

  async function carregarCotacoes() {
    setLoading(true);
    try {
      const r = await api.get('/compras/cotacoes');
      setCotacoes(r.data);
    } catch {
      alert('Erro ao carregar cotações');
    } finally {
      setLoading(false);
    }
  }

  async function excluirCotacao(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir esta cotação?')) return;
    try {
      await api.delete(`/compras/cotacoes/${id}`);
      setCotacoes(prev => prev.filter(c => c.id !== id));
    } catch {
      alert('Erro ao excluir cotação');
    }
  }

  // fitlros
  const filtradas = useMemo(() => cotacoes.filter(c => {
    const okStatus = filtroStatus === 'todos' || c.status === filtroStatus;
    const q = busca.toLowerCase();
    const okBusca = !q
      || c.id.toString().includes(q)
      || c.chamado.numeroChamado.toString().includes(q)
      || c.chamado.resumoChamado.toLowerCase().includes(q)
      || c.criadoPor.name.toLowerCase().includes(q)
      || c.chamado.usuario.name.toLowerCase().includes(q);
    return okStatus && okBusca;
  }), [cotacoes, busca, filtroStatus]);

  const abasStatus = [
    { value: 'todos', label: 'Todas', dot: '#7c3aed', bgLight: '#f8fafc', bgDark: '#1e293b', textLight: '#475569', textDark: '#cbd5e1' },
    ...Object.entries(STATUS_STYLE).map(([value, status]) => ({ value, label: status.label, dot: status.dot, bgLight: status.bgLight, bgDark: status.bgDark, textLight: status.textLight, textDark: status.textDark })),
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: bg }}>
      <div className="text-lg" style={{ color: text }}>Carregando...</div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg }}>

      {/*  header  */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 shadow-lg">
        <h1 className="text-2xl font-bold">Cotações</h1>
        <p className="text-blue-100 text-sm mt-1 opacity-80">Gerencie todas as cotações do sistema</p>
      </div>

      <div className="px-8 py-6 space-y-6">

        {/*  filtros  */}
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: text }} />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por ID, chamado, solicitante ou responsável..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm "
              style={{ backgroundColor: inputBg, borderColor: border, color: text }}
            />
          </div>
          <div className="h-10 mb-2" role="tablist" aria-label="Status das cotações">
            <div
              className="h-10 w-full flex items-center gap-1 rounded-md p-1 transition-all duration-300 overflow-x-auto"
              style={{ backgroundColor: mode === 'dark' ? theme.background.card : 'rgba(229, 231, 235, 0.7)' }}
            >
            {abasStatus.map((aba) => {
              const ativo = filtroStatus === aba.value;
              const quantidade = aba.value === 'todos' ? cotacoes.length : cotacoes.filter(c => c.status === aba.value).length;
              const tabText = mode === 'dark' ? aba.textDark : aba.textLight;
              return (
                <button
                  key={aba.value}
                  type="button"
                  role="tab"
                  aria-selected={ativo}
                  onClick={() => setFiltroStatus(aba.value)}
                  className={`inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-sm px-3 text-[11px] font-medium uppercase tracking-[0.04em] transition-all duration-200 ${ativo ? 'shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                  style={{
                    backgroundColor: ativo ? theme.background.surface : 'transparent',
                    color: ativo ? tabText : theme.text.primary,
                  }}
                >
                  <span>{aba.label}</span>
                  <span
                    className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-[3px] text-[10px] font-semibold leading-none"
                    style={{
                      backgroundColor: ativo ? `${aba.dot}22` : mode === 'dark' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.08)',
                      color: ativo ? tabText : theme.text.secondary,
                    }}
                  >
                    {quantidade}
                  </span>
                </button>
              );
            })}
            </div>
          </div>
        </div>

        {/*  lista  */}
        <div className="space-y-3">
          {filtradas.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ backgroundColor: card, color: text }}>
              <FiFileText className="mx-auto text-5xl mb-4 opacity-20" />
              <p className="text-lg font-medium opacity-60">Nenhuma cotação encontrada</p>
            </div>
          ) : filtradas.map(cot => {
            const st       = STATUS_STYLE[cot.status];
            const stBg     = st ? (mode === 'dark' ? st.bgDark   : st.bgLight)   : (mode === 'dark' ? '#1e293b' : '#f1f5f9');
            const stText   = st ? (mode === 'dark' ? st.textDark : st.textLight) : '#94a3b8';
            const dot      = st?.dot ?? '#94a3b8';
            const nItens   = cot.itens?.length ?? 0;
            const nOpcoes  = cot.itens?.reduce((a, i) => a + (i.opcoes?.length ?? 0), 0) ?? 0;
            const valorMin = calcularValorTotal(cot.itens);
            const valorMed = calcularValorMedio(cot.itens);

            return (
              <div
                key={cot.id}
                onClick={() => router.push(`/compras/cotacoes/${cot.id}`)}
                className="cursor-pointer"
                style={{
                  backgroundColor: bg,
                  borderRadius: '12px',
                  border: `1px solid ${card}`,
                  transition: 'box-shadow 200ms ease, transform 200ms ease',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(-1px)';
                  el.style.boxShadow = mode === 'dark'
                    ? '0 8px 10px 4px rgba(3, 219, 243, 0.15), 0 2px 4px rgba(0,0,0,0.6)'
                    : '0 4px 10px rgba(0, 0, 0, 0.17)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(0)';
                  el.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center gap-4 px-5 py-4">

                  {/* ID */}
                  <span
                    className="text-[13px] font-segoe font-bold shrink-0 px-2 py-0.5 rounded"
                    style={{ color: dot, backgroundColor: `${dot}15` }}
                  >
                    #{cot.id}
                  </span>

                  {/* info principal */}
                  <div className="flex-1 min-w-0">
                    {/* linha 1: título + status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate font-segoe" style={{ color: text }}>
                        #{cot.chamado.numeroChamado} — {cot.chamado.resumoChamado}
                      </span>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 flex items-center gap-1.5"
                        style={{ backgroundColor: stBg, color: stText }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
                        {st?.label ?? cot.status}
                      </span>
                    </div>

                    {/* linha 2: metadados */}
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      {/* itens */}
                      <span className="flex items-center gap-1 text-xs" style={{ color: muted }}>
                        <FiPackage size={11} />
                        <span>{nItens} {nItens === 1 ? 'item' : 'itens'}</span>
                        {nOpcoes > 0 && <span className="opacity-60">· {nOpcoes} opções</span>}
                      </span>

                      {/* solicitante */}
                      <span className="text-xs hidden sm:block" style={{ color: muted }}>
                        Solicitante: <span style={{ color: seconcolorgray }}>{cot.chamado.usuario.name}</span>
                      </span>

                      {/* criado por */}
                      <span className="text-xs hidden md:block" style={{ color: muted }}>
                        Criado por: <span style={{ color: seconcolorgray }}>{cot.criadoPor.name}</span>
                      </span>

                      {/* data */}
                      <span className="text-xs hidden lg:block" style={{ color: muted }}>
                        Criado em: {fmtData(cot.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* valores + excluir */}
                  <div className="flex items-center gap-3 shrink-0">

                    {/* bloco de valores destacado */}
                    {(valorMin !== null || valorMed !== null) && (
                      <div className="text-right hidden sm:block">
                        {valorMin !== null && (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] uppercase tracking-wide" style={{ color: muted }}>Total</span>
                            <span
                              className="text-sm font-bold tabular-nums"
                              style={{ color: mode === 'dark' ? '#4ade80' : '#16a34a' }}
                            >
                              {fmtMoeda(valorMin)}
                            </span>
                          </div>
                        )}
                        {valorMed !== null && (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px]  tracking-wide" style={{ color: muted }}>Média</span>
                            <span className="text-xs font-medium tabular-nums" style={{ color: muted }}>
                              {fmtMoeda(valorMed)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* separador */}
                    {(valorMin !== null || valorMed !== null) && (
                      <div className="w-px h-8 hidden sm:block" style={{ backgroundColor: border }} />
                    )}

                  {/* excluir */}
                  <div className="relative group shrink-0">
                    <button
                      onClick={e => excluirCotacao(e, cot.id)}
                      className="p-1.5 rounded-lg transition-all duration-150 opacity-20 hover:opacity-100 hover:text-red-500"
                      style={{ color: text }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ef444415'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                    >
                      <FiTrash2 size={14} />
                    </button>
                    <div
                      className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-10"
                      style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#334155', color: '#fff' }}
                    >
                      Excluir cotação
                      <div className="absolute top-full right-3 w-0 h-0"
                        style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
                          borderTop: `4px solid ${mode === 'dark' ? '#1e293b' : '#334155'}` }}
                      />
                    </div>
                  </div>

                </div>{/* fim: valores + excluir */}
              </div>{/* fim: flex row do card */}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
