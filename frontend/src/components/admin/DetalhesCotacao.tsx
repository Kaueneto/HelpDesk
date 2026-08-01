'use client';

import React, { useEffect, useState, useRef } from 'react';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import {
  FiTrash2,
  FiPlus,
  FiCheck,
  FiX,
  FiPackage,
  FiChevronDown,
  FiChevronRight,
  FiExternalLink,
  FiEdit2,
  FiPrinter,
} from 'react-icons/fi';
import ModalImpressaoCotacao from './ModalImpressaoCotacao';

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
  departamento: { id: number; name: string };
  tipoPrioridade: { id: number; nome: string };
  status: { id: number; nome: string };
}

interface Classificacao {
  id: number;
  tipo: string;
}

interface CotacaoItemOpcao {
  id: number;
  fornecedor: string;
  descricao_produto: string;
  link_produto: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  prazo_entrega: string | null;
  observacao: string | null;
  selecionado: boolean;
  classificacoes: Classificacao[];
}

interface CotacaoItem {
  id: number;
  descricao: string;
  quantidade: number;
  observacao: string | null;
  opcoes: CotacaoItemOpcao[];
}

interface Cotacao {
  id: number;
  status: string;
  createdAt: string;
  criadoPor: Usuario;
  chamado: Chamado;
  itens: CotacaoItem[];
}

interface DetalhesCotacaoProps {
  cotacaoId: string;
}

export default function DetalhesCotacao({ cotacaoId }: DetalhesCotacaoProps) {
  const { mode } = useTheme();
  const router = useRouter();

  const [cotacao, setCotacao] = useState<Cotacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  // novo item
  const [adicionandoItem, setAdicionandoItem] = useState(false);
  const [novoItemDescricao, setNovoItemDescricao] = useState('');
  const [novoItemQuantidade, setNovoItemQuantidade] = useState(1);
  const [novoItemObservacao, setNovoItemObservacao] = useState('');
  
  // nova opção
  const [adicionandoOpcaoParaItem, setAdicionandoOpcaoParaItem] = useState<number | null>(null);
  const [novaOpcao, setNovaOpcao] = useState({
    descricao_produto: '',
    fornecedor: '',
    valor_unitario: 0,
    prazo_entrega: '',
    link_produto: '',
    observacao: '',
  });

  // refs para navegação Tab
  const refDescricao = useRef<HTMLInputElement>(null);
  const refLoja = useRef<HTMLInputElement>(null);
  const refPreco = useRef<HTMLInputElement>(null);
  const refPrazo = useRef<HTMLInputElement>(null);
  const refLink = useRef<HTMLInputElement>(null);
  const refObs = useRef<HTMLInputElement>(null);

  const [editandoStatus, setEditandoStatus] = useState(false);
  const [novoStatus, setNovoStatus] = useState('');
  const [modalImpressao, setModalImpressao] = useState(false);

  useEffect(() => {
    carregarCotacao();
  }, [cotacaoId]);

  const carregarCotacao = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/compras/cotacoes/${cotacaoId}`);
      setCotacao(response.data);
      setNovoStatus(response.data.status);
    } catch (error) {
      console.error('Erro ao carregar cotação:', error);
      alert('Erro ao carregar cotação');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: number) => {
    const next = new Set(expandedItems);
    next.has(itemId) ? next.delete(itemId) : next.add(itemId);
    setExpandedItems(next);
  };

  const adicionarItem = async () => {
    if (!novoItemDescricao.trim() || novoItemQuantidade <= 0) return;
    try {
      await api.post(`/compras/cotacoes/${cotacaoId}/itens`, {
        descricao: novoItemDescricao.trim(),
        quantidade: novoItemQuantidade,
        observacao: novoItemObservacao.trim() || null,
      });
      setAdicionandoItem(false);
      setNovoItemDescricao('');
      setNovoItemQuantidade(1);
      setNovoItemObservacao('');
      carregarCotacao();
    } catch (error) {
      alert('Erro ao adicionar item');
    }
  };

  // salva  o item e mantém o formulário aberto com foco na descrição para entrada contínua
  const adicionarItemEContinuar = async () => {
    if (!novoItemDescricao.trim() || novoItemQuantidade <= 0) return;
    try {
      await api.post(`/compras/cotacoes/${cotacaoId}/itens`, {
        descricao: novoItemDescricao.trim(),
        quantidade: novoItemQuantidade,
        observacao: novoItemObservacao.trim() || null,
      });
      // limpa mas mantém formulário aberto
      setNovoItemDescricao('');
      setNovoItemQuantidade(1);
      setNovoItemObservacao('');
      // recarrega a cotação para garantir dados corretos
      await carregarCotacao();
      // devolve foco ao campo de descrição
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('[data-novo-item-descricao]');
        input?.focus();
      }, 50);
    } catch (error) {
      alert('Erro ao adicionar item');
    }
  };

  const adicionarOpcao = async (itemId: number) => {
    const { fornecedor, descricao_produto, valor_unitario } = novaOpcao;
    if (!fornecedor.trim() || !descricao_produto.trim() || valor_unitario <= 0) {
      alert('Preencha descrição, loja e preço');
      return;
    }
    try {
      await api.post(`/compras/itens/${itemId}/opcoes`, {
        fornecedor,
        descricao_produto,
        link_produto: novaOpcao.link_produto || null,
        quantidade: 1,
        valor_unitario,
        prazo_entrega: novaOpcao.prazo_entrega || null,
        observacao: novaOpcao.observacao || null,
      });
      setAdicionandoOpcaoParaItem(null);
      setNovaOpcao({ descricao_produto: '', fornecedor: '', valor_unitario: 0, prazo_entrega: '', link_produto: '', observacao: '' });
      carregarCotacao();
    } catch (error) {
      alert('Erro ao adicionar opção');
    }
  };

  // salva a opção e reposiciona o foco na descrição para entrada contínua
  const adicionarOpcaoEContinuar = async (itemId: number) => {
    const { fornecedor, descricao_produto, valor_unitario } = novaOpcao;
    if (!fornecedor.trim() || !descricao_produto.trim() || valor_unitario <= 0) {
      alert('Preencha descrição, loja e preço');
      return;
    }
    try {
      await api.post(`/compras/itens/${itemId}/opcoes`, {
        fornecedor,
        descricao_produto,
        link_produto: novaOpcao.link_produto || null,
        quantidade: 1,
        valor_unitario,
        prazo_entrega: novaOpcao.prazo_entrega || null,
        observacao: novaOpcao.observacao || null,
      });
      // limpa campos mas mantém o formulário aberto com foco na descrição
      setNovaOpcao({ descricao_produto: '', fornecedor: '', valor_unitario: 0, prazo_entrega: '', link_produto: '', observacao: '' });
      // recarrega a cotação para garantir dados corretos
      await carregarCotacao();
      // reposiciona foco após re-render
      setTimeout(() => { refDescricao.current?.focus(); }, 50);
    } catch (error) {
      alert('Erro ao adicionar opção');
    }
  };

  const excluirItem = async (itemId: number) => {
    if (!confirm('Excluir este item?')) return;
    try {
      await api.delete(`/compras/itens/${itemId}`);
      carregarCotacao();
    } catch { alert('Erro ao excluir item'); }
  };

  const excluirOpcao = async (opcaoId: number) => {
    if (!opcaoId) {
      alert('ID da opção inválido');
      return;
    }
    if (!confirm('Excluir esta opção?')) return;
    try {
      await api.delete(`/compras/opcoes/${opcaoId}`);
      carregarCotacao();
    } catch { alert('Erro ao excluir opção'); }
  };

  const toggleSelecionado = async (opcao: CotacaoItemOpcao) => {
    try {
      await api.put(`/compras/opcoes/${opcao.id}`, {
        fornecedor: opcao.fornecedor,
        descricao_produto: opcao.descricao_produto,
        link_produto: opcao.link_produto,
        quantidade: opcao.quantidade,
        valor_unitario: opcao.valor_unitario,
        prazo_entrega: opcao.prazo_entrega,
        observacao: opcao.observacao,
        selecionado: !opcao.selecionado,
      });
      carregarCotacao();
    } catch { alert('Erro ao atualizar seleção'); }
  };

  const toggleClassificacao = async (opcao: CotacaoItemOpcao, tipo: string) => {
    const existente = opcao.classificacoes?.find((c) => c.tipo === tipo);
    try {
      if (existente) {
        await api.delete(`/compras/classificacoes/${existente.id}`);
      } else {
        await api.post(`/compras/opcoes/${opcao.id}/classificacoes`, { tipo });
      }
      carregarCotacao();
    } catch { /* silencioso */ }
  };

  const atualizarStatus = async () => {
    try {
      await api.put(`/compras/cotacoes/${cotacaoId}/status`, { status: novoStatus });
      setEditandoStatus(false);
      carregarCotacao();
    } catch { alert('Erro ao atualizar status'); }
  };

  // Navegação por Tab + Enter para salvar
  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement | null>, itemId?: number) => {
    if (e.key === 'Tab' && !e.shiftKey && nextRef?.current) {
      e.preventDefault();
      nextRef.current.focus();
    } else if (e.key === 'Enter' && itemId) {
      e.preventDefault();
      adicionarOpcao(itemId);
    }
  };

  const STATUS_OPTIONS = [
    { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
    { value: 'AGUARDANDO_APROVACAO', label: 'Aguardando Aprovação' },
    { value: 'APROVADA', label: 'Aprovada' },
    { value: 'EM_COMPRA', label: 'Em Compra' },
    { value: 'FINALIZADA', label: 'Finalizada' },
    { value: 'CANCELADA', label: 'Cancelada' },
  ];

  const getStatusLabel = (s: string) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s;
  const getStatusColor = (s: string): string => ({ 
    EM_ANDAMENTO: 'bg-blue-500', AGUARDANDO_APROVACAO: 'bg-yellow-500',
    APROVADA: 'bg-green-500', EM_COMPRA: 'bg-purple-500',
    FINALIZADA: 'bg-gray-500', CANCELADA: 'bg-red-500',
  } as Record<string,string>)[s] || 'bg-gray-400';

  const formatarMoeda = (v: number) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const CLASSIFICACOES = [
    { tipo: 'ESCOLHIDO',            emoji: '🏆', title: 'Escolhido' },
    { tipo: 'RECOMENDADO',          emoji: '⭐', title: 'Recomendado' },
    { tipo: 'MELHOR_CUSTO_BENEFICIO', emoji: '💰', title: 'Melhor Custo-Benefício' },
    { tipo: 'MENOR_PRECO',          emoji: '🔥', title: 'Menor Preço' },
  ];

  const bg   = mode === 'dark' ? '#0F172A' : '#EDEDED';
  const card = mode === 'dark' ? '#0F172A' : '#FFFFFF';
  const text = mode === 'dark' ? '#F1F5F9' : '#1E293B';
  const border = mode === 'dark' ? '#2e3846ff' : '#E2E8F0';
  const rowAlt = mode === 'dark' ? '#0F172A' : '#F8FAFC';
  const rowSel = mode === 'dark' ? '#052e16' : '#dcfce7';
  const thead  = mode === 'dark' ? '#0f172a' : '#e2e8f0';
  const itemHd = mode === 'dark' ? '#1e293b' : '#f1f5f9';

  // Input fluido — sem borda, sem fundo separado, somente placeholder
  const placeholderColor = mode === 'dark' ? '#4a5568' : '#9ca3af';
  const inputCls =
    "w-full !bg-transparent border-none outline-none shadow-none ring-0 focus:ring-0 focus:outline-none py-1.5 font-bold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none custom-input";
  
  const inputStyle = {
    backgroundColor: 'transparent !important',
    WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
    WebkitTextFillColor: text,
    transition: 'none',
  } as React.CSSProperties;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: bg }}>
        <div className="text-lg" style={{ color: text }}>Carregando...</div>
      </div>
    );
  }

  if (!cotacao) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ backgroundColor: bg }}>
        <p style={{ color: text }}>Cotação não encontrada</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Voltar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg }}>
      <style>{`
        .custom-input::placeholder {
          color: ${placeholderColor};
          opacity: 0.6;
        }
      `}</style>

      {/* modal de impressão */}
      {modalImpressao && cotacao && (
        <ModalImpressaoCotacao
          cotacao={cotacao}
          onClose={() => setModalImpressao(false)}
        />
      )}

      {/* ── Header azul ─────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">Cotação #{cotacao.id}</h1>
              {/* status da cotação — clicável */}
              {editandoStatus ? (
                <div className="flex items-center gap-2">
                  <select
                    value={novoStatus}
                    onChange={(e) => setNovoStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/15 border border-white/25 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/40"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value} className="text-gray-900 bg-white">{s.label}</option>)}
                  </select>
                  <button
                    onClick={atualizarStatus}
                    className="p-1.5 rounded-lg bg-green-400/80 hover:bg-green-300 text-white transition-all"
                    title="Confirmar"
                  >
                    <FiCheck size={13} />
                  </button>
                  <button
                    onClick={() => setEditandoStatus(false)}
                    className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-400 text-white transition-all"
                    title="Cancelar"
                  >
                    <FiX size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditandoStatus(true)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white tracking-wide shadow-sm transition-all hover:shadow-md hover:scale-[1.03] active:scale-[0.98] ${getStatusColor(cotacao.status)}`}
                >
                  <span>{getStatusLabel(cotacao.status)}</span>
                  <FiEdit2 size={11} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* métricas da cotação */}
            <div className="flex items-center gap-4 text-blue-100 text-sm">
              <span>{cotacao.itens?.length ?? 0} {cotacao.itens?.length === 1 ? 'item' : 'itens'}</span>
              <span className="opacity-40">·</span>
              <span>
                {cotacao.itens?.reduce((acc, it) => acc + (it.opcoes?.length ?? 0), 0) ?? 0} opções cotadas
              </span>
              <span className="opacity-40">·</span>
              <span>Criado por {cotacao.criadoPor?.name ?? '—'}</span>
            </div>
          </div>

          {/* link para o chamado de origem — colapsado, pq ele nao é destaque */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setModalImpressao(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 hover:scale-105 text-white text-sm font-medium transition-all border border-white/20"
              title="Imprimir cotação"
            >
              <FiPrinter size={14} />
              <span className="hidden sm:block">Imprimir</span>
            </button>
            <button
              onClick={() => router.push(`/chamado/${cotacao.chamado.id}`)}
              className="shrink-0 text-right text-blue-200 hover:text-white transition-colors group"
            >
              <p className="text-[10px] uppercase tracking-wide opacity-60 mb-0.5">Chamado de origem</p>
              <p className="text-sm font-medium group-hover:underline">
                #{cotacao.chamado.numeroChamado} — {cotacao.chamado.resumoChamado}
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* breadcrumbs*/}
      <div className="px-8 pt-3 pb-2">
        <div className="flex items-center gap-2 text-xs" style={{ color: text }}>
          <button onClick={() => router.push('/compras/solicitacoes')} className="opacity-50 hover:opacity-100 hover:underline">Solicitações</button>
          <span className="opacity-30">/</span>
          <button onClick={() => router.push('/compras/cotacoes')} className="opacity-50 hover:opacity-100 hover:underline">Cotações</button>
          <span className="opacity-30">/</span>
          <span className="opacity-70">Cotação #{cotacao.id}</span>
        </div>
      </div>

      {/* ── itens da cotação — layout vertical por produto ── */}
      <div className="px-6 pb-10 space-y-5 mt-4 ">
        {cotacao.itens?.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          return (
            <div key={item.id} style={{
              backgroundColor: card, borderRadius: '12px', border: `1px solid ${border}`,
              boxShadow: mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              {/* cabeçalho do produto */}
              <div className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none font-segoe"
                onClick={() => toggleItem(item.id)}>
                <span className="inline-block transition-transform duration-200 shrink-0"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', color: isExpanded ? '#3b82f6' : text, opacity: isExpanded ? 1 : 0.4 }}>
                  <FiChevronRight size={15} />
                </span>
                <FiPackage size={14} className="text-blue-500 shrink-0" />

                {/* descrição + observação em coluna */}
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-lg block truncate" style={{ color: text }}>{item.descricao}</span>
                  {item.observacao && (
                    <span className="text-xs opacity-50 block" style={{ color: text }}>{item.observacao}</span>
                  )}
                </div>

                {/* ── resumo de valores ── */}
                {item.opcoes && item.opcoes.length > 0 && (() => {
                  const precos = item.opcoes.map(o => Number(o.valor_unitario));
                  const menor  = Math.min(...precos);
                  const maior  = Math.max(...precos);
                  const soma   = precos.reduce((a, b) => a + b, 0);
                  return (
                    <div className="flex items-center gap-3 mr-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 text-xs" title="Soma de todas as opções">
                        <span className="opacity-40" style={{ color: text }}>Total</span>
                        <span className="font-semibold tabular-nums" style={{ color: text }}>{formatarMoeda(soma)}</span>
                      </div>
                  
                      <div className="flex items-center gap-1.5 text-xs" title="Menor preço">
                        <span className="opacity-40" style={{ color: text }}>↓</span>
                        <span className="font-semibold tabular-nums" style={{ color: mode === 'dark' ? '#4ade80' : '#16a34a' }}>{formatarMoeda(menor)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs" title="Maior preço">
                        <span className="opacity-40" style={{ color: text }}>↑</span>
                        <span className="font-semibold tabular-nums" style={{ color: mode === 'dark' ? '#f87171' : '#dc2626' }}>{formatarMoeda(maior)}</span>
                      </div>
                    </div>
                  );
                })()}
                <span className="text-xs opacity-40 italic mr-2" style={{ color: text }}>
                  {item.quantidade} un.
                </span>
                <span className="text-xs opacity-35 tabular-nums" style={{ color: text }}>
                  {item.opcoes?.length ?? 0} {(item.opcoes?.length ?? 0) === 1 ? 'opção' : 'opções'}
                </span>
                <button onClick={(e) => { e.stopPropagation(); excluirItem(item.id); }}
                  className="ml-3 p-1.5 opacity-20 hover:opacity-100 hover:text-red-500 hover:scale-120 transition-all rounded">
                  <FiTrash2 size={13} />
                </button>
              </div>

              {/* opções expandíveis */}
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${border}` }}>
                  {/* header colunas */}
                  <div className="grid text-sm font-segoe  tracking-wider px-5 py-2 opacity-50"
                    style={{ color: text, backgroundColor: mode === 'dark' ? '#0c1525' : '#f8fafc',
                      gridTemplateColumns: '2fr 1.2fr 0.8fr 0.6fr 0.6fr 0.8fr 1.2fr auto', columnGap: '12px' }}>
                    <span>Descrição</span><span>Loja</span>
                    <span className="text-right">Preço</span><span className="text-right">Frete</span>
                    <span className="text-center">Prazo</span><span className="text-center">Link</span>
                    <span>Obs.</span><span className="text-center" style={{ width: '6rem' }}>Ações</span>
                  </div>
                  {/* linhas de opções */}
                  {item.opcoes?.map((opcao, idx) => (
                    <div key={opcao.id} className="grid items-center px-5 py-2.5 text-sm"
                      style={{ gridTemplateColumns: '2fr 1.2fr 0.8fr 0.6fr 0.6fr 0.8fr 1.2fr auto', columnGap: '12px',
                        backgroundColor: opcao.selecionado ? rowSel : idx % 2 === 0 ? card : rowAlt,
                         }}>
                      <span className="truncate" style={{ color: text }} title={opcao.descricao_produto}>{opcao.descricao_produto}</span>
                      <span className="font-medium truncate" style={{ color: text }}>{opcao.fornecedor}</span>
                      <span className="text-right font-semibold tabular-nums" style={{ color: text }}>{formatarMoeda(opcao.valor_unitario)}</span>
                      <span className="text-right opacity-40 tabular-nums" style={{ color: text }}>{formatarMoeda(0)}</span>
                      <span className="text-center text-xs" style={{ color: text }}>{opcao.prazo_entrega || '—'}</span>
                      <span className="text-center">
                        {opcao.link_produto
                          ? <a href={opcao.link_produto} target="_blank" rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-1 justify-center text-xs">
                              <FiExternalLink size={11} /> link</a>
                          : <span className="opacity-30 text-xs" style={{ color: text }}>—</span>}
                      </span>
                      <span className="text-xs opacity-50 line-clamp-2 leading-snug" style={{ color: text }}>{opcao.observacao || '—'}</span>
                      <div className="flex items-center justify-end gap-1.5" style={{ width: '6rem' }}>
                        {CLASSIFICACOES.map((c) => {
                          const has = opcao.classificacoes?.some((cl) => cl.tipo === c.tipo);
                          return (
                            <button key={c.tipo} title={c.title} onClick={() => toggleClassificacao(opcao, c.tipo)}
                              className={`text-sm leading-none transition-all hover:scale-120 ${has ? 'opacity-100' : 'opacity-20 hover:scale-120 hover:opacity-60'}`}>
                              {c.emoji}
                            </button>
                          );
                        })}
                        <button onClick={() => excluirOpcao(opcao.id)}
                          className="opacity-20 hover:opacity-100 hover:scale-120 hover:text-red-500 transition-all ml-1"
                          title="Excluir"><FiX size={13} /></button>
                      </div>
                    </div>
                  ))}
                    {/* ── edição inline de opção ── */}

                  {adicionandoOpcaoParaItem === item.id && (
                    <div className="grid items-center px-5 py-2.5 text-sm"
                      style={{ gridTemplateColumns: '2fr 1.2fr 0.8fr 0.6fr 0.6fr 0.8fr 1.2fr auto', columnGap: '12px',
                        borderTop: `1px solid #3b82f6`, backgroundColor: card }}>
                      <input 
                        ref={refDescricao} 
                        autoFocus 
                        autoComplete="off"
                        type="text" 
                        value={novaOpcao.descricao_produto}
                        onChange={(e) => setNovaOpcao((p) => ({ ...p, descricao_produto: e.target.value }))}
                        onKeyDown={(e) => { 
                          if (e.key === 'Escape') { setAdicionandoOpcaoParaItem(null); return; }
                          if (e.key === 'Enter') { e.preventDefault(); refLoja.current?.focus(); }
                        }}
                        placeholder="Descrição" 
                        className={inputCls} 
                        style={{ ...inputStyle, color: text }} />
                      <input 
                        ref={refLoja} 
                        type="text" 
                        autoComplete="off"
                        value={novaOpcao.fornecedor}
                        onChange={(e) => setNovaOpcao((p) => ({ ...p, fornecedor: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setAdicionandoOpcaoParaItem(null); return; }
                          if (e.key === 'Enter') { e.preventDefault(); refPreco.current?.focus(); }
                        }}
                        placeholder="Loja" 
                        className={inputCls} 
                        style={{ ...inputStyle, color: text }} />
                      <input 
                        ref={refPreco} 
                        type="number" 
                        autoComplete="off"
                        min="0" 
                        step="0.01" 
                        value={novaOpcao.valor_unitario || ''}
                        onChange={(e) => setNovaOpcao((p) => ({ ...p, valor_unitario: Number(e.target.value) }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setAdicionandoOpcaoParaItem(null); return; }
                          if (e.key === 'Enter') { e.preventDefault(); refPrazo.current?.focus(); }
                        }}
                        placeholder="0,00" 
                        className={inputCls + ' text-right'} 
                        style={{ ...inputStyle, color: text }} />
                      <span className="text-center opacity-30 text-sm" style={{ color: text }}>—</span>
                      <input 
                        ref={refPrazo} 
                        type="text" 
                        autoComplete="off"
                        value={novaOpcao.prazo_entrega}
                        onChange={(e) => setNovaOpcao((p) => ({ ...p, prazo_entrega: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setAdicionandoOpcaoParaItem(null); return; }
                          if (e.key === 'Enter') { e.preventDefault(); refLink.current?.focus(); }
                        }}
                        placeholder="dias" 
                        className={inputCls + ' text-center'} 
                        style={{ ...inputStyle, color: text }} />
                      <input 
                        ref={refLink} 
                        type="url" 
                        autoComplete="off"
                        value={novaOpcao.link_produto}
                        onChange={(e) => setNovaOpcao((p) => ({ ...p, link_produto: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setAdicionandoOpcaoParaItem(null); return; }
                          if (e.key === 'Enter') { e.preventDefault(); refObs.current?.focus(); }
                        }}
                        placeholder="URL" 
                        className={inputCls} 
                        style={{ ...inputStyle, color: text }} />
                      <input 
                        ref={refObs} 
                        type="text" 
                        autoComplete="off"
                        value={novaOpcao.observacao}
                        onChange={(e) => setNovaOpcao((p) => ({ ...p, observacao: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setAdicionandoOpcaoParaItem(null); return; }
                          if (e.key === 'Enter') { e.preventDefault(); adicionarOpcaoEContinuar(item.id); }
                        }}
                        placeholder="Obs. ↵ salva" 
                        className={inputCls} 
                        style={{ ...inputStyle, color: text }} />
                      <div className="flex items-center justify-end gap-1.5" style={{ width: '6rem' }}>
                        <button onClick={() => adicionarOpcaoEContinuar(item.id)}
                          className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"><FiCheck size={12} /></button>
                        <button onClick={() => setAdicionandoOpcaoParaItem(null)}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"><FiX size={12} /></button>
                      </div>
                    </div>
                  )}
                  {/* botão adicionar opção */}
                  {adicionandoOpcaoParaItem !== item.id && (
                    <div className="px-5 py-3" style={{ borderTop: `1px solid ${border}` }}>
                      <button onClick={() => setAdicionandoOpcaoParaItem(item.id)}
                        className="text-blue-500 hover:text-blue-700 text-sm font-medium flex items-center gap-1.5 transition-colors">
                        <FiPlus size={13} /> Adicionar opção
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── novo produto ── */}
        <div>
          {adicionandoItem ? (
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl"
              style={{ backgroundColor: card, border: `1px solid #3b82f6` }}>
              <FiPackage size={14} className="text-blue-500 shrink-0" />
              <input 
                autoFocus 
                data-novo-item-descricao 
                type="text" 
                autoComplete="off"
                value={novoItemDescricao}
                onChange={(e) => setNovoItemDescricao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setAdicionandoItem(false); return; }
                  if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLInputElement)?.focus(); }
                }}
                placeholder="Nome do produto"
                className="flex-1 font-bold outline-none !bg-transparent text-sm border-none shadow-none ring-0 focus:ring-0 custom-input" 
                style={{ ...inputStyle, color: text }} />
              <input 
                type="number" 
                autoComplete="off"
                min="1" 
                value={novoItemQuantidade}
                onChange={(e) => setNovoItemQuantidade(Number(e.target.value))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLInputElement)?.focus(); } }}
                placeholder="Qtd" 
                className="w-14 text-center outline-none !bg-transparent text-sm border-none shadow-none ring-0 focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none custom-input" 
                style={{ ...inputStyle, color: text }} />
              <input 
                type="text" 
                autoComplete="off"
                value={novoItemObservacao}
                onChange={(e) => setNovoItemObservacao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setAdicionandoItem(false); return; }
                  if (e.key === 'Enter') { e.preventDefault(); adicionarItemEContinuar(); }
                }}
                placeholder="Observação · ↵ salva"
                className="w-48 outline-none !bg-transparent text-sm border-none shadow-none ring-0 focus:ring-0 custom-input" 
                style={{ ...inputStyle, color: text }} />
              <button onClick={adicionarItemEContinuar}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors shrink-0">Salvar</button>
              <button onClick={() => setAdicionandoItem(false)}
                className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shrink-0"><FiX size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setAdicionandoItem(true)}
              className="flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-700 transition-colors py-1">
              <FiPlus size={14} /> Novo produto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
