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
} from 'react-icons/fi';

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

  const excluirItem = async (itemId: number) => {
    if (!confirm('Excluir este item?')) return;
    try {
      await api.delete(`/compras/itens/${itemId}`);
      carregarCotacao();
    } catch { alert('Erro ao excluir item'); }
  };

  const excluirOpcao = async (opcaoId: number) => {
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
  const card = mode === 'dark' ? '#1E293B' : '#FFFFFF';
  const text = mode === 'dark' ? '#F1F5F9' : '#1E293B';
  const border = mode === 'dark' ? '#334155' : '#E2E8F0';
  const rowAlt = mode === 'dark' ? '#0F172A' : '#F8FAFC';
  const rowSel = mode === 'dark' ? '#052e16' : '#dcfce7';
  const thead  = mode === 'dark' ? '#0f172a' : '#e2e8f0';
  const itemHd = mode === 'dark' ? '#1e293b' : '#f1f5f9';

  // Input transparente reutilizável
  const inputCls = "w-full bg-transparent outline-none border-b border-transparent focus:border-blue-500 transition-colors py-0.5 placeholder-gray-400";

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

      {/* ── Header azul ─────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 shadow-lg">
        <h1 className="text-2xl font-bold">Cotação #{cotacao.id}</h1>
        <p className="text-blue-100 mt-0.5">
          Chamado #{cotacao.chamado.numeroChamado} — {cotacao.chamado.resumoChamado}
        </p>
      </div>

      {/* ── Breadcrumb + badges ──────────────────────────────── */}
      <div className="px-8 pt-5 pb-4">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-4" style={{ color: text }}>
          <button onClick={() => router.push('/compras/solicitacoes')} className="opacity-60 hover:opacity-100 hover:underline">Solicitações</button>
          <span className="opacity-40">/</span>
          <button onClick={() => router.push('/compras/cotacoes')} className="opacity-60 hover:opacity-100 hover:underline">Cotações</button>
          <span className="opacity-40">/</span>
          <span className="font-medium">Cotação #{cotacao.id}</span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {editandoStatus ? (
            <div className="flex items-center gap-1.5">
              <select
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value)}
                className="px-3 py-1.5 rounded-full border text-sm font-semibold"
                style={{ backgroundColor: card, borderColor: border, color: text }}
              >
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={atualizarStatus} className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"><FiCheck /></button>
              <button onClick={() => setEditandoStatus(false)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"><FiX /></button>
            </div>
          ) : (
            <button
              onClick={() => setEditandoStatus(true)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 hover:opacity-90 transition-opacity ${getStatusColor(cotacao.status)}`}
            >
              {getStatusLabel(cotacao.status)} <FiEdit2 className="text-[10px]" />
            </button>
          )}
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: mode === 'dark' ? '#334155' : '#E2E8F0', color: text }}>
            🏢 {cotacao.chamado.departamento.name}
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
            ⚡ {cotacao.chamado.tipoPrioridade.nome}
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
            📋 {cotacao.chamado.status.nome}
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            👤 {cotacao.chamado.usuario.name}
          </span>
        </div>
      </div>

      <div className="pb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: '900px' }}>
            <colgroup>
              <col style={{ width: '26%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }}  />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }}  />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: thead, color: text }}>
                <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                <th className="px-4 py-3 text-left font-semibold">Loja</th>
                <th className="px-4 py-3 text-right font-semibold">Preço</th>
                <th className="px-4 py-3 text-right font-semibold">Frete</th>
                <th className="px-4 py-3 text-center font-semibold">Prazo (d)</th>
                <th className="px-4 py-3 text-center font-semibold">Link</th>
                <th className="px-4 py-3 text-left font-semibold">Obs.</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {cotacao.itens?.map((item) => {
                const isExpanded = expandedItems.has(item.id);
                return (
                  <React.Fragment key={item.id}>
                              <tr
                      className="cursor-pointer select-none"
                      style={{
                        backgroundColor: card,
                        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.07)',
                        borderBottom: `1px solid ${border}`,
                      }}
                      onClick={() => toggleItem(item.id)}
                    >
                      <td className="px-4 py-3" colSpan={8}>
                        <div className="flex items-center gap-3">
                          {isExpanded
                            ? <FiChevronDown  className="text-lg shrink-0 text-blue-400" />
                            : <FiChevronRight className="text-lg shrink-0 opacity-40" style={{ color: text }} />}
                          <FiPackage className="text-base shrink-0 text-blue-500" />
                          <span className="font-bold" style={{ color: text }}>{item.descricao}</span>
                          <span className="text-xs opacity-40 italic" style={{ color: text }}>
                            — {item.quantidade} un.{item.observacao && ` · ${item.observacao}`}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); excluirItem(item.id); }}
                            className="ml-auto p-1.5 opacity-20 hover:opacity-100 hover:text-red-500 transition-all"
                            style={{ color: text }}
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && item.opcoes?.map((opcao, idx) => (
                      <tr
                        key={opcao.id}
                        style={{
                          backgroundColor: opcao.selecionado ? rowSel : idx % 2 === 0 ? card : rowAlt,
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <td className="px-4 py-2.5 pl-12 overflow-hidden" style={{ color: text, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {opcao.descricao_produto}
                        </td>
                        <td className="px-4 py-2.5 font-medium overflow-hidden" style={{ color: text, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {opcao.fornecedor}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold" style={{ color: text, whiteSpace: 'nowrap' }}>
                          {formatarMoeda(opcao.valor_unitario)}
                        </td>
                        <td className="px-4 py-2.5 text-right opacity-40" style={{ color: text, whiteSpace: 'nowrap' }}>
                          {formatarMoeda(0)}
                        </td>
                        <td className="px-4 py-2.5 text-center" style={{ color: text, whiteSpace: 'nowrap' }}>
                          {opcao.prazo_entrega || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center" style={{ whiteSpace: 'nowrap' }}>
                          {opcao.link_produto
                            ? <a href={opcao.link_produto} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-1 justify-center">
                                <FiExternalLink className="text-xs" /><span className="text-xs">link</span>
                              </a>
                            : <span className="opacity-30" style={{ color: text }}>—</span>}
                        </td>
                        <td className="px-4 py-2.5 overflow-hidden text-xs opacity-60" style={{ color: text, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {opcao.observacao || <span className="opacity-30">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            {CLASSIFICACOES.map((c) => {
                              const has = opcao.classificacoes?.some((cl) => cl.tipo === c.tipo);
                              return (
                                <button key={c.tipo} title={c.title}
                                  onClick={() => toggleClassificacao(opcao, c.tipo)}
                                  className={`text-base leading-none transition-all ${has ? 'opacity-100' : 'opacity-20 hover:opacity-60'}`}
                                >
                                  {c.emoji}
                                </button>
                              );
                            })}
                            <button onClick={() => excluirOpcao(opcao.id)}
                              className="ml-1 opacity-20 hover:opacity-100 hover:text-red-500 transition-all"
                              style={{ color: text }} title="Excluir">
                              <FiX className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* ── edicao inline ── */}
                    {isExpanded && adicionandoOpcaoParaItem === item.id && (
                      <tr style={{ backgroundColor: card, borderBottom: `2px solid #3b82f6` }}>
                        <td className="px-4 py-2 pl-12">
                          <input ref={refDescricao} autoFocus type="text" value={novaOpcao.descricao_produto}
                            onChange={(e) => setNovaOpcao((p) => ({ ...p, descricao_produto: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Escape') setAdicionandoOpcaoParaItem(null); else handleKeyDown(e, refLoja); }}
                            placeholder="Descrição do produto" className={inputCls} style={{ color: text }} />
                        </td>
                        <td className="px-4 py-2">
                          <input ref={refLoja} type="text" value={novaOpcao.fornecedor}
                            onChange={(e) => setNovaOpcao((p) => ({ ...p, fornecedor: e.target.value }))}
                            onKeyDown={(e) => handleKeyDown(e, refPreco)}
                            placeholder="Loja" className={inputCls} style={{ color: text }} />
                        </td>
                        <td className="px-4 py-2">
                          <input ref={refPreco} type="number" min="0" step="0.01" value={novaOpcao.valor_unitario || ''}
                            onChange={(e) => setNovaOpcao((p) => ({ ...p, valor_unitario: Number(e.target.value) }))}
                            onKeyDown={(e) => handleKeyDown(e, refPrazo)}
                            placeholder="0,00" className={inputCls + ' text-right'} style={{ color: text }} />
                        </td>
                        <td className="px-4 py-2 text-center opacity-30 text-sm" style={{ color: text }}>—</td>
                        <td className="px-4 py-2">
                          <input ref={refPrazo} type="text" value={novaOpcao.prazo_entrega}
                            onChange={(e) => setNovaOpcao((p) => ({ ...p, prazo_entrega: e.target.value }))}
                            onKeyDown={(e) => handleKeyDown(e, refLink)}
                            placeholder="5" className={inputCls + ' text-center'} style={{ color: text }} />
                        </td>
                        <td className="px-4 py-2">
                          <input ref={refLink} type="url" value={novaOpcao.link_produto}
                            onChange={(e) => setNovaOpcao((p) => ({ ...p, link_produto: e.target.value }))}
                            onKeyDown={(e) => handleKeyDown(e, refObs)}
                            placeholder="URL" className={inputCls} style={{ color: text }} />
                        </td>
                        <td className="px-4 py-2">
                          <input ref={refObs} type="text" value={novaOpcao.observacao}
                            onChange={(e) => setNovaOpcao((p) => ({ ...p, observacao: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarOpcao(item.id); } if (e.key === 'Escape') setAdicionandoOpcaoParaItem(null); }}
                            placeholder="Obs. ↵ salva" className={inputCls} style={{ color: text }} />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => adicionarOpcao(item.id)} className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"><FiCheck className="text-xs" /></button>
                            <button onClick={() => setAdicionandoOpcaoParaItem(null)} className="p-1.5 opacity-40 hover:opacity-100 hover:text-red-500 transition-all" style={{ color: text }}><FiX className="text-xs" /></button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {isExpanded && adicionandoOpcaoParaItem !== item.id && (
                      <tr style={{ backgroundColor: rowAlt, borderBottom: `2px solid ${border}` }}>
                        <td className="px-4 py-2 pl-12" colSpan={8}>
                          <button onClick={() => setAdicionandoOpcaoParaItem(item.id)}
                            className="text-blue-500 hover:text-blue-700 text-sm font-medium flex items-center gap-1 hover:underline transition-colors">
                            <FiPlus className="text-xs" /> Nova cotação
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── + novvo item ── */}
        <div className="px-8 pt-3">
          {adicionandoItem ? (
            <div className="flex items-center gap-3 py-3" style={{ borderTop: `2px solid #3b82f6` }}>
              <FiPackage className="text-base text-blue-500 shrink-0" />
              <input autoFocus type="text" value={novoItemDescricao}
                onChange={(e) => setNovoItemDescricao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLInputElement)?.focus(); }
                  if (e.key === 'Escape') setAdicionandoItem(false);
                }}
                placeholder="Nome do item (ex: MEMÓRIA RAM — DDR4 16GB 4200MHZ)"
                className="flex-1 px-1 font-bold border-b border-transparent focus:border-blue-500 outline-none transition-colors bg-transparent"
                style={{ color: text }} />
              <input type="number" min="1" value={novoItemQuantidade}
                onChange={(e) => setNovoItemQuantidade(Number(e.target.value))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLInputElement)?.focus(); } }}
                placeholder="Qtd" className="w-16 text-center border-b border-transparent focus:border-blue-500 outline-none transition-colors bg-transparent"
                style={{ color: text }} />
              <input type="text" value={novoItemObservacao}
                onChange={(e) => setNovoItemObservacao(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarItem(); } }}
                placeholder="Observação (Enter salva)"
                className="w-44 px-1 border-b border-transparent focus:border-blue-500 outline-none transition-colors bg-transparent text-sm"
                style={{ color: text }} />
              <button onClick={adicionarItem} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors shrink-0">Salvar</button>
              <button onClick={() => setAdicionandoItem(false)} className="opacity-40 hover:opacity-100 transition-opacity shrink-0" style={{ color: text }}><FiX /></button>
            </div>
          ) : (
            <button onClick={() => setAdicionandoItem(true)}
              className="text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1.5 hover:underline transition-colors py-2">
              <FiPlus className="text-sm" /> Novo item
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
