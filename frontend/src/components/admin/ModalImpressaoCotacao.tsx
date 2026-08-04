'use client';

import React, { useState } from 'react';
import { FiX, FiPrinter, FiCheck } from 'react-icons/fi';

interface Classificacao { id: number; tipo: string; }

interface CotacaoItemOpcao {
  id: number;
  fornecedor: string;
  descricao_produto: string;
  link_produto: string | null;
  quantidade: number;
  valor_avista: number;
  valor_parcelado: number;
  valor_frete: number;
  valor_total: number;
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
  criadoPor: { id: number; name: string; email: string };
  chamado: {
    id: number;
    numeroChamado: number;
    resumoChamado: string;
    descricaoChamado?: string;
    usuario: { id: number; name: string; email: string };
    departamento: { id: number; name: string };
    tipoPrioridade: { id: number; nome: string };
    status: { id: number; nome: string };
  };
  itens: CotacaoItem[];
}

interface ModalImpressaoCotacaoProps {
  cotacao: Cotacao;
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  EM_ANDAMENTO: 'Em Andamento', AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  APROVADA: 'Aprovada', EM_COMPRA: 'Em Compra',
  FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada',
};

function fmtMoeda(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ModalImpressaoCotacao({ cotacao, onClose }: ModalImpressaoCotacaoProps) {
  const [incluirSolicitacao, setIncluirSolicitacao]     = useState(true);
  const [imprimirTodosItens, setImprimirTodosItens]     = useState(true);
  const [apenasItensSelecionados, setApenasItensSelecionados] = useState(false);
  const [itensSelecionados, setItensSelecionados]       = useState<number[]>([]);

  function toggleItem(id: number) {
    setItensSelecionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  function gerarHTML() {
    // Decide quais itens incluir no relatório
    let itensParaImprimir = cotacao.itens;
    if (apenasItensSelecionados && itensSelecionados.length > 0) {
      itensParaImprimir = cotacao.itens.filter(i => itensSelecionados.includes(i.id));
    }

    const CLASSIFICACAO_EMOJI: Record<string, string> = {
      ESCOLHIDO: '🏆', RECOMENDADO: '⭐', MELHOR_CUSTO_BENEFICIO: '💰', MENOR_PRECO: '🔥',
    };

    const itensHTML = itensParaImprimir.map(item => {
      const opcoesFiltradas = item.opcoes.filter(o =>
        o.selecionado || (o.classificacoes || []).some(c => c.tipo === 'ESCOLHIDO')
      );
      const opcoes = imprimirTodosItens ? item.opcoes : opcoesFiltradas;

      const somaAvista = opcoes.reduce((acc, o) => acc + Number(o.valor_avista || 0), 0);
      const somaParcelado = opcoes.reduce((acc, o) => acc + Number(o.valor_parcelado || 0), 0);
      const somaFrete = opcoes.reduce((acc, o) => acc + Number(o.valor_frete || 0), 0);

      const linhasOpcoes = opcoes.map((opcao, idx) => {
        const badges = (opcao.classificacoes || [])
          .map(c => `<span class="badge">${CLASSIFICACAO_EMOJI[c.tipo] ?? ''}</span>`)
          .join('');
        const link = opcao.link_produto
          ? `<a href="${opcao.link_produto}" target="_blank" class="link">${opcao.link_produto}</a>`
          : '—';

        return `
          <tr class="${opcao.selecionado ? 'row-sel' : idx % 2 === 0 ? '' : 'row-alt'}">
            <td>
              <div class="desc-stack">
                <div class="desc-text">${opcao.descricao_produto}</div>
                <div class="fornecedor-text">${opcao.fornecedor}</div>
              </div>
            </td>
            <td class="num">${fmtMoeda(opcao.valor_avista || 0)}</td>
            <td class="num">${fmtMoeda(opcao.valor_parcelado || 0)}</td>
            <td class="num">${fmtMoeda(opcao.valor_frete || 0)}</td>
            <td class="center link-cell">${link}</td>
            <td>${opcao.observacao || '—'}</td>
            <td class="center">${badges}</td>
          </tr>`;
      }).join('');

      return `
        <div class="item-block">
          <div class="item-header">
            <div class="item-header-left">
              <div class="cotacao-code">Cotação #${cotacao.id}</div>
              <span class="item-label">Itens para compra:</span>
              <div class="item-title-block">
                <div class="item-title-row">
                  <span class="item-name">${item.descricao}</span>
                  <span class="item-qty">${item.quantidade} un.</span>
                </div>
                ${item.observacao ? `<p class="item-obs-line">${item.observacao}</p>` : ''}
              </div>
            </div>
          </div>
          <table class="opcoes-table">
            <thead>
              <tr>
                <th>Descrição / Loja</th>
                <th class="num">À vista</th>
                <th class="num">Parcelado</th>
                <th class="num">Frete</th>
                <th class="center">Link</th>
                <th>Obs.</th>
                <th class="center">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${linhasOpcoes || `<tr><td colspan="7" class="empty">${imprimirTodosItens ? 'Nenhuma opção cotada' : 'Nenhuma opção escolhida (🏆)'}</td></tr>`}
            </tbody>
          </table>
          ${opcoes.length > 0 ? `
          <div class="resumo-item">
            <span class="resumo-label">Totais por coluna:</span>
            <div class="resumo-grid">
              <div class="resumo-col">
                <span class="resumo-subtitle">À vista</span>
                <strong class="resumo-value">${fmtMoeda(somaAvista)}</strong>
              </div>
              <div class="resumo-col">
                <span class="resumo-subtitle">Parcelado</span>
                <strong class="resumo-value">${fmtMoeda(somaParcelado)}</strong>
              </div>
              <div class="resumo-col">
                <span class="resumo-subtitle">Frete</span>
                <strong class="resumo-value">${fmtMoeda(somaFrete)}</strong>
              </div>
            </div>
          </div>` : ''}
        </div>`;
    }).join('');

    const solicitacaoHTML = incluirSolicitacao ? `
      <div class="solicitacao-block">
        <div class="sol-header">
          <div class="sol-left">
            <span class="sol-label">Solicitação de compra:</span>
            <h1 class="sol-title">#${cotacao.chamado.numeroChamado} — ${cotacao.chamado.resumoChamado}</h1>
            ${cotacao.chamado.descricaoChamado
              ? `<p class="sol-desc">${cotacao.chamado.descricaoChamado}</p>`
              : ''}
          </div>
          <div class="sol-right">
            <div class="sol-meta-item"><span class="meta-label">Prioridade:</span><span class="meta-val">${cotacao.chamado.tipoPrioridade.nome}</span></div>
            <div class="sol-meta-item"><span class="meta-label">Solicitante:</span><span class="meta-val">${cotacao.chamado.usuario.name}</span></div>
            <div class="sol-meta-item"><span class="meta-label">Departamento:</span><span class="meta-val">${cotacao.chamado.departamento.name}</span></div>
          </div>
        </div>
      </div>
      <div class="divider-dashed"></div>` : `
      <div class="cotacao-only-header">
        <span class="sol-label">Cotação de Compras</span>
        <h1 class="sol-title">Cotação #${cotacao.id}</h1>
      </div>
      <div class="divider-dashed"></div>`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cotação #${cotacao.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; background: #fff; }

    /* ── tela — barra de ações ── */
    .action-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: #1e3a5f; color: #fff;
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 24px; gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .action-bar h2 { font-size: 14px; font-weight: 600; }
    .action-bar-buttons { display: flex; gap: 10px; }
    .btn-print { background: #fff; color: #1e3a5f; border: none; padding: 7px 18px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn-print:hover { background: #e2e8f0; }
    .btn-back { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.4); padding: 7px 18px; border-radius: 6px; font-size: 13px; cursor: pointer; }
    .btn-back:hover { background: rgba(255,255,255,0.1); }

    /* ── página ── */
    .page { max-width: 900px; margin: 80px auto 40px; padding: 32px 40px; }

    /* ── solicitação ── */
    .solicitacao-block { margin-bottom: 0; }
    .sol-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .sol-left { flex: 1; }
    .sol-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; display: block; margin-bottom: 2px; }
    .sol-title { font-size: 22px; font-weight: 700; line-height: 1.2; margin: 2px 0 6px; }
    .sol-desc { font-size: 12px; color: #444; line-height: 1.5; }
    .sol-right { display: flex; flex-direction: column; gap: 6px; text-align: right; min-width: 160px; }
    .sol-meta-item { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
    .meta-label { font-size: 11px; color: #555; }
    .meta-sep { color: #aaa; font-size: 11px; }
    .meta-val { font-size: 12px; font-weight: 600; color: #222; }
    .cotacao-only-header { margin-bottom: 0; }

    /* ── divisor ── */
    .divider-dashed {
      border: none; border-top: 1px dashed #aaa;
      margin: 18px 0;
    }

    /* ── item bloco ── */
    .item-block { margin-bottom: 28px; }
    .item-header { margin-bottom: 6px; }
    .item-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; display: block; margin-bottom: 2px; }
    .cotacao-code { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .item-title-block { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .item-title-row { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
    .item-name { font-size: 17px; font-weight: 700; }
    .item-obs { font-size: 12px; color: #555; }
    .item-obs-line { font-size: 10px; color: #64748b; opacity: 0.75; margin-top: 3px; }
    .item-qty { font-size: 11px; color: #888; white-space: nowrap; }

    /* ── tabela de opções ── */
    .opcoes-table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 4px; }
    .opcoes-table thead tr { border-bottom: 0.5px solid #999; }
    .opcoes-table th { text-align: left; padding: 5px 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #444; font-weight: 700; }
    .opcoes-table td { padding: 5px 6px; border-bottom: 0.5px solid #e5e7eb; vertical-align: middle; }
    .opcoes-table .row-alt td { background: #f9fafb; }
    .opcoes-table .row-sel td { background: #dcfce7; }
    .opcoes-table .num { text-align: right; font-variant-numeric: tabular-nums; }
    .opcoes-table .center { text-align: center; }
    .opcoes-table .empty { text-align: center; color: #aaa; padding: 12px; }
    .opcoes-table .link-cell { font-size: 10px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .desc-stack { display: flex; flex-direction: column; gap: 3px; }
    .desc-text { font-weight: 600; }
    .fornecedor-text { font-size: 10px; color: #64748b; opacity: 0.9; }
    .link { color: #1d4ed8; }
    .badge { font-size: 14px; margin: 0 1px; }

    /* ── resumo do item ── */
    .resumo-item { margin-top: 8px; padding: 8px 10px; background: #f8fafc; border-left: 3px solid #334155; font-size: 11.5px; }
    .resumo-label { font-weight: 700; display: block; margin-bottom: 4px; }
    .resumo-grid { display: grid; grid-template-columns: repeat(3, minmax(110px, 1fr)); gap: 12px; }
    .resumo-col { display: flex; flex-direction: column; gap: 2px; }
    .resumo-subtitle { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
    .resumo-value { font-size: 13px; color: #111827; }

    /* ── rodapé ── */
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 10px; color: #aaa; }

    /* ── print ── */
    @media print {
      .action-bar { display: none !important; }
      .page { margin-top: 20px; padding: 20px; }
      .opcoes-table td, .opcoes-table th { padding: 4px 5px; }
      .link { color: #000; text-decoration: underline; }
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <h2>Cotação #${cotacao.id} — Pré-visualização de Impressão</h2>
    <div class="action-bar-buttons">
      <button class="btn-back" onclick="window.close()">← Voltar</button>
      <button class="btn-print" onclick="window.print()">Imprimir</button>
    </div>
  </div>

  <div class="page">
    ${solicitacaoHTML}
    ${itensHTML}

    <div class="footer">
      <span>Gerado em ${new Date().toLocaleString('pt-BR')}</span>
      <span>Cotação #${cotacao.id} · Criado por ${cotacao.criadoPor.name} · Status: ${STATUS_LABEL[cotacao.status] ?? cotacao.status}</span>
    </div>
  </div>
</body>
</html>`;
  }

  function handleImprimir() {
    if (apenasItensSelecionados && itensSelecionados.length === 0) {
      alert('Selecione ao menos um item para imprimir.');
      return;
    }
    const html = gerarHTML();
    const janela = window.open('', '_blank');
    if (!janela) { alert('Permita pop-ups para gerar o relatório.'); return; }
    janela.document.write(html);
    janela.document.close();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className=" text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Imprimir Cotação</h2>
            <p className="text-blue-100 text-xs mt-0.5">Configure o que será incluído no relatório</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <FiX size={16} />
          </button>
        </div>

     {/* opções */}
        <div className="px-6 py-5 space-y-4">

    {/* opção 1 */}
          <label className="flex items-start gap-3 cursor-pointer group hover:scale-103 transition-all">
            <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors 
              ${incluirSolicitacao ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-slate-600'}`}
              onClick={() => setIncluirSolicitacao(v => !v)}>
              {incluirSolicitacao && <FiCheck size={12} className="text-white " />}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-slate-200 ">Incluir solicitação de compra</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Imprime as informações do chamado de origem (número, título, descrição, prioridade, solicitante e departamento).
              </p>
            </div>
          </label>

          <div className="border-t border-gray-100 dark:border-slate-700" />
   {/* opção 2 */}
          <label className="flex items-start gap-3 cursor-pointer group hover:scale-103 transition-all">
            <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
              ${imprimirTodosItens ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-slate-600'}`}
              onClick={() => setImprimirTodosItens(v => !v)}>
              {imprimirTodosItens && <FiCheck size={12} className="text-white" />}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-slate-200">Imprimir todas as opções cotadas</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Exibe todas as opções de cada item. Se desmarcado, mostra somente as opções marcadas como selecionadas (🏆).
              </p>
            </div>
          </label>

          <div className="border-t border-gray-100 dark:border-slate-700" />

      {/* opção 3 */}
          <label className="flex items-start gap-3 cursor-pointer group hover:scale-103 transition-all">
            <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
              ${apenasItensSelecionados ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-slate-600'}`}
              onClick={() => {
                setApenasItensSelecionados(v => !v);
                if (!apenasItensSelecionados) setItensSelecionados([]);
              }}>
              {apenasItensSelecionados && <FiCheck size={12} className="text-white" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-800 dark:text-slate-200">Imprimir somente produtos selecionados</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Escolha quais produtos serão incluídos. Se desmarcado, todos os produtos são impressos.
              </p>

         {/* listbox de itens */}
              {apenasItensSelecionados && (
                <div className="mt-3 border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                  {cotacao.itens.map(item => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700 last:border-0"
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                          ${itensSelecionados.includes(item.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-slate-500'}`}
                        onClick={() => toggleItem(item.id)}
                      >
                        {itensSelecionados.includes(item.id) && <FiCheck size={10} className="text-white" />}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-slate-300">{item.descricao}</span>
                      <span className="text-xs text-gray-400 ml-auto">{item.quantidade} un.</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </label>
        </div>

    {/* footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3 bg-gray-50 dark:bg-slate-900">
          <p className="text-xs text-gray-400">
            {cotacao.itens.length} {cotacao.itens.length === 1 ? 'produto' : 'produtos'} na cotação
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImprimir}
              className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <FiPrinter size={14} />
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
