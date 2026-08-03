'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiThumbsUp, FiMessageCircle, FiClock, FiChevronRight,
  FiX, FiPlus, FiArrowRight, FiGlobe, FiLock, FiCheck, FiUser,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';

interface Sugestao {
  id: number; titulo: string; descricao: string;
  status: 'aberta' | 'em_analise' | 'planejada' | 'em_desenvolvimento' | 'concluida' | 'recusada';
  escopo: 'departamento' | 'global'; privado: boolean;
  criadoEm: string; atualizadoEm: string;
  usuarioCriacao: { id: number; name: string };
  votos: any[]; interacoes: any[];
}

type CriacaoEtapa = 'repouso' | 'tipo' | 'detalhes';
type Guia = 'minhas' | 'departamento';

interface Props {
  onVerDetalhe: (id: number) => void;
  hideHeader?: boolean;
}

export default function SugestoesList({ onVerDetalhe, hideHeader = false }: Props) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [guiaAtiva, setGuiaAtiva] = useState<Guia>('minhas');
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<'recente' | 'votos'>('recente');
  const [etapaCriacao, setEtapaCriacao] = useState<CriacaoEtapa>('repouso');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [privado, setPrivado] = useState(false);
  const [submiting, setSubmiting] = useState(false);
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [novoStatus, setNovoStatus] = useState('');
  const [novoEscopo, setNovoEscopo] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const isAdmin = user?.roleId === 1;

  useEffect(() => { carregarSugestoes(); }, [filtroStatus, ordenarPor]);

  const carregarSugestoes = async () => {
    setLoading(true);
    try {
      const params: any = { ordenarPor };
      if (filtroStatus) params.status = filtroStatus;
      const response = await api.get('/sugestoes', { params });
      setSugestoes(response.data.sugestoes);
    } catch { toast.error('Erro ao carregar sugestões'); }
    finally { setLoading(false); }
  };

  const handleSelecionarTipo = (ehPrivado: boolean) => { setPrivado(ehPrivado); setEtapaCriacao('detalhes'); };
  const handleCancelarCriacao = () => { setEtapaCriacao('repouso'); setTitulo(''); setDescricao(''); setPrivado(false); };

  const handleSubmitSugestao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim()) { toast.error('Preencha todos os campos obrigatórios'); return; }
    setSubmiting(true);
    try {
      await api.post('/sugestoes', { titulo, descricao, escopo: 'departamento', privado });
      toast.success('Sugestão criada com sucesso!');
      handleCancelarCriacao(); carregarSugestoes();
    } catch (error: any) { toast.error(error.response?.data?.mensagem || 'Erro ao criar sugestão'); }
    finally { setSubmiting(false); }
  };

  const handleVotar = async (sugestaoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try { await api.post(`/sugestoes/${sugestaoId}/votar`); carregarSugestoes(); toast.success('Voto registrado!'); }
    catch (error: any) { toast.error(error.response?.data?.mensagem || 'Erro ao votar'); }
  };

  const handleSelectSugestao = (id: number, checked: boolean) =>
    setSelecionadas(prev => checked ? [...prev, id] : prev.filter(i => i !== id));

  const handleBulkStatusChange = async () => {
    if (!novoStatus) { toast.error('Selecione um novo status'); return; }
    setSubmittingBulk(true); let count = 0;
    try {
      for (const id of selecionadas) {
        await api.patch(`/sugestoes/${id}/status`, { novoStatus, motivo: 'Atualizado em lote' }); count++;
      }
      toast.success(`${count} sugestão(ões) atualizada(s)!`);
      setSelecionadas([]); setNovoStatus(''); carregarSugestoes();
    } catch (error: any) { toast.error(error.response?.data?.mensagem || 'Erro ao atualizar status'); }
    finally { setSubmittingBulk(false); }
  };

  const handleBulkEscopoChange = async () => {
    if (!novoEscopo) { toast.error('Selecione um novo escopo'); return; }
    setSubmittingBulk(true); let count = 0;
    try {
      for (const id of selecionadas) {
        await api.patch(`/sugestoes/${id}/escopo`, { escopo: novoEscopo }); count++;
      }
      toast.success(`${count} sugestão(ões) com escopo atualizado!`);
      setSelecionadas([]); setNovoEscopo(''); carregarSugestoes();
    } catch (error: any) { toast.error(error.response?.data?.mensagem || 'Erro ao atualizar escopo'); }
    finally { setSubmittingBulk(false); }
  };

  const getStatusColor = (status: string) => {
    const map: any = {
      aberta:             { bg: '#e3f2fd', text: '#1976d2', label: 'Aberta' },
      em_analise:         { bg: '#fff3e0', text: '#f57c00', label: 'Em análise' },
      planejada:          { bg: '#e8f5e9', text: '#388e3c', label: 'Planejada' },
      em_desenvolvimento: { bg: '#f3e5f5', text: '#7b1fa2', label: 'Em desenvolvimento' },
      concluida:          { bg: '#c8e6c9', text: '#2e7d32', label: 'Concluída' },
      recusada:           { bg: '#ffebee', text: '#c62828', label: 'Recusada' },
    };
    return map[status] || map.aberta;
  };

  const handleStatusChange = (val: string | number | (string | number)[]) => {
    if (typeof val === 'string') setFiltroStatus(val);
  };

  const handleOrdenacaoChange = (val: string | number | (string | number)[]) => {
    if (typeof val === 'string') setOrdenarPor(val as 'recente' | 'votos');
  };

  const formatarData = (data: string) =>
    new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  if (!theme) return null;

  return (
    <div style={{ backgroundColor: theme.background.pagina }}>
      {!hideHeader && (
        <div className="
          px-8 py-3 
          bg-gradient-to-r 
          from-blue-600 
          to-blue-700
          bg-[length:200%_100%]
          hover:bg-[position:100%_0]
          text-white
          shadow-lg
          transition-[background-position] 
          duration-500
          flex items-center justify-between
        ">
          <h2 className="text-white text-2xl font-semibold font-segoe hover:scale-103 transition-transform duration-300">Queremos ouvir você</h2>
        </div>
      )}

      <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: theme.background.pagina }}>
        <p className="text-sm mb-8" style={{ color: theme.text.secondary }}>
          Buscamos priorizar sua produtividade e garantir uma boa experiência. Caso queira sugerir uma melhoria, nos avise!
        </p>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-4 mb-8 items-center">
          <button
            onClick={() => setEtapaCriacao('tipo')}
            className="px-6 py-2.5 rounded-lg font-semibold border-2 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
            style={{ borderColor: theme.brand.primary, color: theme.brand.primary, backgroundColor: `${theme.brand.primary}08` }}
          >
            <FiPlus size={18} /> Nova sugestão
          </button>
          <AnimatePresence>
            {etapaCriacao !== 'repouso' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleCancelarCriacao}
                className="px-4 py-2.5 rounded-lg font-semibold border-2 flex items-center gap-2 hover:scale-105 active:scale-95"
                style={{ borderColor: '#ff0000', backgroundColor: '#ff0000', color: 'white' }}
              >
                <FiX size={18} /> Cancelar
              </motion.button>
            )}
          </AnimatePresence>
          <div className="flex gap-2 flex-wrap ml-auto items-center">
            <SearchableSelect
              value={filtroStatus}
              onChange={handleStatusChange}
              options={[
                { value: '', label: 'Todos os status' },
                { value: 'aberta', label: 'Aberta' },
                { value: 'em_analise', label: 'Em análise' },
                { value: 'planejada', label: 'Planejada' },
                { value: 'em_desenvolvimento', label: 'Em desenvolvimento' },
                { value: 'concluida', label: 'Concluída' },
                { value: 'recusada', label: 'Recusada' },
              ]}
              placeholder="Filtrar status"
              width={200}
            />
            <SearchableSelect
              value={ordenarPor}
              onChange={handleOrdenacaoChange}
              options={[
                { value: 'recente', label: 'Mais recentes' },
                { value: 'votos', label: 'Mais votadas' },
              ]}
              placeholder="Ordenar por"
              width={180}
            />
          </div>
        </div>

        {/* Formulário de criação */}
        <AnimatePresence mode="wait">
          {etapaCriacao !== 'repouso' && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }} className="mb-8 p-6 rounded-xl border"
              style={{ backgroundColor: theme.background.card, borderColor: theme.border.secondary }}>
              <AnimatePresence mode="wait">
                {etapaCriacao === 'tipo' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text.primary }}>Qual será sua sugestão?</h3>
                    <p className="text-sm mb-6" style={{ color: theme.text.secondary }}>Selecione para prosseguir:</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <motion.button whileHover={{ scale: 1.01 }} onClick={() => handleSelecionarTipo(false)}
                        className="p-6 rounded-lg border text-left cursor-pointer"
                        style={{ backgroundColor: `${theme.brand.primary}15`, borderColor: theme.brand.primary }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <FiGlobe size={24} style={{ color: theme.brand.primary }} />
                              <p className="text-lg font-semibold" style={{ color: theme.text.primary }}>Pública</p>
                            </div>
                            <p className="text-sm" style={{ color: theme.text.secondary }}>
                              Visível para você, seu departamento e administradores.<br />
                              Pode receber comentários e votos.<br />
                              Sugestões relevantes podem ser promovidas para visibilidade global.
                            </p>
                          </div>
                          <FiArrowRight size={24} style={{ color: theme.brand.primary }} />
                        </div>
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.01 }} onClick={() => handleSelecionarTipo(true)}
                        className="p-6 rounded-lg border text-left cursor-pointer"
                        style={{ backgroundColor: '#ff000015', borderColor: '#ff0000' }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <FiLock size={24} style={{ color: '#ff0000' }} />
                              <p className="text-lg font-semibold" style={{ color: theme.text.primary }}>Privada</p>
                            </div>
                            <p className="text-sm" style={{ color: theme.text.secondary }}>
                              Apenas você e administradores veem. Sem votos, apenas comentários dos administradores.
                            </p>
                          </div>
                          <FiArrowRight size={24} style={{ color: '#ff0000' }} />
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence mode="wait">
                {etapaCriacao === 'detalhes' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    <div className="mb-6 flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
                        style={{ backgroundColor: privado ? '#ff000015' : `${theme.brand.primary}15`,
                          color: privado ? '#ff0000' : theme.brand.primary,
                          border: `1px solid ${privado ? '#ff0000' : theme.brand.primary}` }}>
                        {privado ? <FiLock size={14} /> : <FiGlobe size={14} />}
                        {privado ? 'Privada' : 'Pública'}
                      </div>
                      <button onClick={() => setEtapaCriacao('tipo')}
                        className="text-xs px-2 py-1 rounded-full hover:opacity-70 transition-all"
                        style={{ backgroundColor: theme.background.surface, color: theme.text.secondary }}>
                        Alterar
                      </button>
                    </div>
                    <form onSubmit={handleSubmitSugestao} className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>Título da Sugestão *</label>
                        <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={255}
                          placeholder="Resuma em poucas palavras"
                          className="w-full px-4 py-2.5 rounded-lg outline-none border"
                          style={{ backgroundColor: theme.background.surface, borderColor: theme.border.secondary, color: theme.text.primary }} />
                        <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>{titulo.length}/255</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>Descrição Detalhada *</label>
                        <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                          placeholder="Descreva sua ideia e como ela ajudaria no seu dia a dia..."
                          rows={6} className="w-full px-4 py-2.5 rounded-lg outline-none border resize-none"
                          style={{ backgroundColor: theme.background.surface, borderColor: theme.border.secondary, color: theme.text.primary }} />
                      </div>
                      {!privado && (
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-sm text-blue-700">
                            Esta sugestão será visível para usuários do seu departamento. Administradores podem promovê-la para visibilidade global.
                          </p>
                        </div>
                      )}
                      <div className="flex gap-3 justify-end pt-4 border-t" style={{ borderColor: theme.border.secondary }}>
                        <button type="submit" disabled={submiting}
                          className="px-6 py-2.5 rounded-lg font-semibold text-white transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                          style={{ backgroundColor: theme.brand.primary }}>
                          {submiting ? 'Criando...' : 'Criar Sugestão'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* guias que so mostram no painel do usuario comum */}
        {hideHeader && etapaCriacao === 'repouso' && (
          <div className="flex gap-1 mb-5 p-1 rounded-lg w-fit" style={{ backgroundColor: theme.background.hover }}>
            {([
              { key: 'minhas' as const, label: 'Minhas sugestões' },
              { key: 'departamento' as const, label: 'Do meu departamento' },
            ]).map(g => (
              <button key={g.key} onClick={() => setGuiaAtiva(g.key)}
                className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                style={guiaAtiva === g.key
                  ? { backgroundColor: theme.background.modal, color: theme.brand.primary, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { color: theme.text.secondary }}>
                {g.label}
              </button>
            ))}
          </div>
        )}

        {/* Lista */}
        <AnimatePresence>
          {etapaCriacao === 'repouso' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {loading ? (
                <div className="text-center py-12" style={{ color: theme.text.secondary }}>Carregando sugestões...</div>
              ) : (() => {
                const lista = hideHeader
                  ? (guiaAtiva === 'minhas'
                    ? sugestoes.filter(s => s.usuarioCriacao?.id === user?.id)
                    : sugestoes.filter(s => s.usuarioCriacao?.id !== user?.id))
                  : sugestoes;

                if (lista.length === 0) return (
                  <div className="text-center py-16" style={{ color: theme.text.tertiary }}>
                    <p className="text-lg mb-2">Nenhuma sugestão encontrada</p>
                    <p className="text-sm">
                      {guiaAtiva === 'minhas' && hideHeader
                        ? 'Você ainda não criou nenhuma sugestão.'
                        : 'Nenhuma sugestão do departamento ainda.'}
                    </p>
                  </div>
                );

                return (
                  <div className="space-y-3">
                    {lista.map(sugestao => {
                      const statusStyle = getStatusColor(sugestao.status);
                      const comentarios = sugestao.interacoes?.filter(
                        (i: any) => i.tipo === 'comentario' || i.tipo === 'resposta_admin'
                      ).length || 0;
                      const isMinhaS = sugestao.usuarioCriacao?.id === user?.id;
                      return (
                        <motion.div key={sugestao.id} onClick={() => onVerDetalhe(sugestao.id)}
                          className="group cursor-pointer rounded-xl border transition-all hover:shadow-md"
                          style={{ backgroundColor: theme.background.tabelaClaro, borderColor: theme.border.secondary }}
                          whileHover={{ y: -2 }}>
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              {isAdmin && (
                                <div
                                  className={`mt-1 transition-opacity shrink-0 ${selecionadas.includes(sugestao.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                  onClick={e => { e.stopPropagation(); handleSelectSugestao(sugestao.id, !selecionadas.includes(sugestao.id)); }}>
                                  <div className="w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer"
                                    style={{ backgroundColor: selecionadas.includes(sugestao.id) ? theme.brand.primary : 'transparent',
                                      borderColor: selecionadas.includes(sugestao.id) ? theme.brand.primary : theme.text.secondary }}>
                                    {selecionadas.includes(sugestao.id) && <FiCheck size={12} color="#fff" />}
                                  </div>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                  <h3 className="text-base font-semibold truncate" style={{ color: theme.text.primary }}>{sugestao.titulo}</h3>
                                  {sugestao.privado && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700 flex items-center gap-1 shrink-0">
                                      <FiLock size={10} /> Privada
                                    </span>
                                  )}
                                  {sugestao.escopo === 'global' && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700 flex items-center gap-1 shrink-0">
                                      <FiGlobe size={10} /> Global
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm line-clamp-2 mb-3" style={{ color: theme.text.secondary }}>{sugestao.descricao}</p>
                                <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: theme.text.tertiary }}>
                                  <span className="px-2.5 py-1 rounded-full font-semibold"
                                    style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>{statusStyle.label}</span>
                                  {(!hideHeader || guiaAtiva === 'departamento' || isAdmin) && sugestao.usuarioCriacao && (
                                    <div className="flex items-center gap-1">
                                      <FiUser size={12} />
                                      <span>{isMinhaS ? 'Você' : sugestao.usuarioCriacao.name}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <FiClock size={12} />
                                    <span>{formatarData(sugestao.criadoEm)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <button onClick={e => handleVotar(sugestao.id, e)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                                  style={{ backgroundColor: `${theme.brand.primary}18`, color: theme.brand.primary }}>
                                  <FiThumbsUp size={14} /><span>{sugestao.votos?.length || 0}</span>
                                </button>
                                <div className="flex items-center gap-1 text-xs" style={{ color: theme.text.tertiary }}>
                                  <FiMessageCircle size={13} /><span>{comentarios}</span>
                                </div>
                                <FiChevronRight size={18} style={{ color: theme.text.tertiary }} />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk toolbar — admin only */}
        <AnimatePresence>
          {isAdmin && selecionadas.length > 0 && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 border"
              style={{ backgroundColor: theme.background.card, borderColor: theme.border.secondary }}>
              <div className="flex flex-col">
                <span className="text-sm font-semibold" style={{ color: theme.text.primary }}>{selecionadas.length} selecionada(s)</span>
                <button onClick={() => setSelecionadas([])} className="text-xs text-left hover:underline opacity-80"
                  style={{ color: theme.text.secondary }}>Limpar seleção</button>
              </div>
              <div className="h-8 w-px opacity-30" style={{ backgroundColor: theme.border.secondary }} />
              <div className="flex items-center gap-3">
                <select value={novoStatus} onChange={e => setNovoStatus(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm border outline-none min-w-[180px]"
                  style={{ backgroundColor: theme.background.surface, borderColor: theme.border.secondary, color: theme.text.primary }}>
                  <option value="">Alterar status para...</option>
                  <option value="aberta">Aberta</option>
                  <option value="em_analise">Em análise</option>
                  <option value="planejada">Planejada</option>
                  <option value="em_desenvolvimento">Em desenvolvimento</option>
                  <option value="concluida">Concluída</option>
                  <option value="recusada">Recusada</option>
                </select>
                <button onClick={handleBulkStatusChange} disabled={!novoStatus || submittingBulk}
                  className="px-4 py-2 rounded-lg font-semibold text-white text-sm disabled:opacity-50 hover:scale-105"
                  style={{ backgroundColor: theme.brand.primary }}>
                  {submittingBulk ? '...' : 'Aplicar'}
                </button>
              </div>
              <div className="h-8 w-px opacity-30" style={{ backgroundColor: theme.border.secondary }} />
              <div className="flex items-center gap-3">
                <select value={novoEscopo} onChange={e => setNovoEscopo(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm border outline-none min-w-[180px]"
                  style={{ backgroundColor: theme.background.surface, borderColor: theme.border.secondary, color: theme.text.primary }}>
                  <option value="">Alterar escopo para...</option>
                  <option value="departamento">Departamento</option>
                  <option value="global">Global</option>
                </select>
                <button onClick={handleBulkEscopoChange} disabled={!novoEscopo || submittingBulk}
                  className="px-4 py-2 rounded-lg font-semibold text-white text-sm disabled:opacity-50 hover:scale-105"
                  style={{ backgroundColor: theme.brand.primary }}>
                  {submittingBulk ? '...' : 'Aplicar'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
