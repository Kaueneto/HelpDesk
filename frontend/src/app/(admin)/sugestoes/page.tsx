'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiThumbsUp, FiMessageCircle, FiClock, FiChevronRight, FiX, FiPlus, FiArrowRight, FiGlobe, FiLock, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Sugestao {
  id: number;
  titulo: string;
  descricao: string;
  status: 'aberta' | 'em_analise' | 'planejada' | 'em_desenvolvimento' | 'concluida' | 'recusada';
  escopo: 'departamento' | 'global';
  privado: boolean;
  criadoEm: string;
  atualizadoEm: string;
  usuarioCriacao: {
    id: number;
    name: string;
  };
  votos: any[];
  interacoes: any[];
}

type CriacaoEtapa = 'repouso' | 'tipo' | 'detalhes';

export default function NosAjudeAMelhorar() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  // Proteção contra theme null
  if (!theme) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white">Carregando...</p>
      </div>
    );
  }

  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [ordenarPor, setOrdenarPor] = useState<'recente' | 'votos'>('recente');
  
  // Estado do fluxo de criação progressivo
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

  useEffect(() => {
    carregarSugestoes();
  }, [filtroStatus, ordenarPor]);

  const carregarSugestoes = async () => {
    setLoading(true);
    try {
      const params: any = {
        ordenarPor,
      };

      if (filtroStatus) {
        params.status = filtroStatus;
      }

      const response = await api.get('/sugestoes', { params });
      setSugestoes(response.data.sugestoes);
    } catch (error: any) {
      toast.error('Erro ao carregar sugestões');
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarTipo = (eh_privado: boolean) => {
    setPrivado(eh_privado);
    setEtapaCriacao('detalhes');
  };

  const handleSelectSugestao = (id: number, checked: boolean) => {
    if (checked) {
      setSelecionadas((prev) => [...prev, id]);
    } else {
      setSelecionadas((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkStatusChange = async () => {
    if (!novoStatus) {
      toast.error('Selecione um novo status');
      return;
    }
    
    setSubmittingBulk(true);
    let successCount = 0;
    
    try {
      for (const id of selecionadas) {
        await api.patch(`/sugestoes/${id}/status`, {
          novoStatus,
          motivo: 'Status atualizado em lote pelos administradores',
        });
        successCount++;
      }
      
      toast.success(`${successCount} sugestão(ões) atualizada(s)!`);
      setSelecionadas([]);
      setNovoStatus('');
      carregarSugestoes();
    } catch (error: any) {
      toast.error(error.response?.data?.mensagem || 'Erro ao atualizar status');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleBulkEscopoChange = async () => {
    if (!novoEscopo) {
      toast.error('Selecione um novo escopo');
      return;
    }
    
    setSubmittingBulk(true);
    let successCount = 0;
    
    try {
      for (const id of selecionadas) {
        await api.patch(`/sugestoes/${id}/escopo`, {
          escopo: novoEscopo,
        });
        successCount++;
      }
      
      toast.success(`${successCount} sugestão(ões) com escopo atualizado!`);
      setSelecionadas([]);
      setNovoEscopo('');
      carregarSugestoes();
    } catch (error: any) {
      toast.error(error.response?.data?.mensagem || 'Erro ao atualizar escopo');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleCancelarCriacao = () => {
    setEtapaCriacao('repouso');
    setTitulo('');
    setDescricao('');
    setPrivado(false);
  };

  const handleSubmitSugestao = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() || !descricao.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmiting(true);

    try {
      await api.post('/sugestoes', {
        titulo,
        descricao,
        escopo: 'departamento',
        privado,
      });

      toast.success('Sugestão criada com sucesso!');
      handleCancelarCriacao();
      carregarSugestoes();
    } catch (error: any) {
      toast.error(error.response?.data?.mensagem || 'Erro ao criar sugestão');
    } finally {
      setSubmiting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusStyles: any = {
      aberta: { bg: '#e3f2fd', text: '#1976d2', label: 'Aberta' },
      em_analise: { bg: '#fff3e0', text: '#f57c00', label: 'Em análise' },
      planejada: { bg: '#e8f5e9', text: '#388e3c', label: 'Planejada' },
      em_desenvolvimento: { bg: '#f3e5f5', text: '#7b1fa2', label: 'Em desenvolvimento' },
      concluida: { bg: '#c8e6c9', text: '#2e7d32', label: 'Concluída' },
      recusada: { bg: '#ffebee', text: '#c62828', label: 'Recusada' },
    };
    return statusStyles[status] || statusStyles.aberta;
  };

  const formatarData = (data: string) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleVotar = async (sugestaoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/sugestoes/${sugestaoId}/votar`);
      carregarSugestoes();
      toast.success('Voto registrado!');
    } catch (error: any) {
      toast.error(error.response?.data?.mensagem || 'Erro ao votar');
    }
  };

  const statusStyle = getStatusColor(filtroStatus);

  return (
    <div style={{ backgroundColor: theme.background.pagina }}>
      {/* Header Azul */}
      <div className="px-6 py-4" style={{ backgroundColor: theme.brand.primary }}>
        <h2 className="text-white text-2xl font-semibold font-segoe">Nos ajude a melhorar</h2>
      </div>

      <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: theme.background.pagina }}>
        {/* Descrição */}
        <p className="text-sm mb-8" style={{ color: theme.text.secondary }}>
          Buscamos priorizar sua produtividade e garantir uma boa experiência, caso queira sugerir uma melhoria, nos avise!
        </p>

        {/* Botão e Filtros - SEMPRE VISÍVEL */}
        <div className="flex flex-wrap gap-4 mb-8 items-center">
          <button
            onClick={() => setEtapaCriacao('tipo')}
            className="font-segoe px-6 py-2.5 rounded-lg font-semibold 
                      border-2 transition-all duration-300 
                      flex items-center gap-2 
                      hover:scale-105 active:scale-95
                      hover:shadow-lg hover:bg-opacity-10"
            style={{
              borderColor: theme.brand.primary,
              color: theme.brand.primary,
              backgroundColor: `${theme.brand.primary}08`,
            }}
          >
            <FiPlus
              size={18}
              className="transition-transform duration-300 group-hover:rotate-90"
            />
            <span>Nova sugestão</span>
          </button>

          {/* botao cancelar que aparece so quando estamos fazendo nova sugestao */}
          <AnimatePresence>
            {etapaCriacao !== 'repouso' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleCancelarCriacao}
                className="px-4 py-2.5 rounded-lg font-semibold border-2 transition-all duration-300 
                          flex items-center gap-2 hover:scale-105 active:scale-95"
                style={{
                  borderColor: '#ff0000',
                  backgroundColor: '#ff0000',
                  color: 'white',
                }}
              >
                <FiX size={18} />
                Cancelar
              </motion.button>
            )}
          </AnimatePresence>

          <div className="flex gap-2 flex-wrap ml-auto">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-4 py-2 rounded-lg text-sm border outline-none"
              style={{
                backgroundColor: theme.background.surface,
                borderColor: theme.border.secondary,
                color: theme.text.primary,
              }}
            >
              <option value="">Todos os status</option>
              <option value="aberta">Aberta</option>
              <option value="em_analise">Em análise</option>
              <option value="planejada">Planejada</option>
              <option value="em_desenvolvimento">Em desenvolvimento</option>
              <option value="concluida">Concluída</option>
              <option value="recusada">Recusada</option>
            </select>

            <select
              value={ordenarPor}
              onChange={(e) => setOrdenarPor(e.target.value as any)}
              className="px-4 py-2 rounded-lg text-sm border outline-none"
              style={{
                backgroundColor: theme.background.surface,
                borderColor: theme.border.secondary,
                color: theme.text.primary,
              }}
            >
              <option value="recente">Mais recentes</option>
              <option value="votos">Mais votadas</option>
            </select>
          </div>
        </div>

        {/* Seção de Criação Progressiva - APARECE E OCULTA A LISTA */}
        <AnimatePresence mode="wait">
          {etapaCriacao !== 'repouso' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8 p-6 rounded-xl border"
              style={{ backgroundColor: theme.background.card, borderColor: theme.border.secondary }}
            >
              {/* Etapa 1: Seleção de Tipo */}
              <AnimatePresence mode="wait">
                {etapaCriacao === 'tipo' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
                      Qual será sua sugestão?
                    </h3>

                    <p className="text-sm mb-6" style={{ color: theme.text.secondary }}>
                      Selecione para prosseguir:
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Opção Pública */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleSelecionarTipo(false)}
                        className="p-6 rounded-lg border-2 transition-all text-left cursor-pointer"
                        style={{
                          backgroundColor: `${theme.brand.primary}15`,
                          borderColor: theme.brand.primary,
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <FiGlobe size={24} style={{ color: theme.brand.primary }} />
                              <p className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                                Pública
                              </p>
                            </div>
                                <p className="text-sm" style={{ color: theme.text.secondary }}>
                                  Visível para usuários do seu departamento. <br />
                                  Pode receber comentários e votos. <br />
                                  Sugestões relevantes podem ser promovidas para visibilidade global e serem vistas por todos os usuários do sistema.
                                </p>
                          </div>
                          <FiArrowRight size={24} style={{ color: theme.brand.primary }} />
                        </div>
                      </motion.button>

                      {/* Opção Privada */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleSelecionarTipo(true)}
                        className="p-6 rounded-lg border-2 transition-all text-left cursor-pointer"
                        style={{
                          backgroundColor: `#ff000015`,
                          borderColor: '#ff0000',
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <FiLock size={24} style={{ color: '#ff0000' }} />
                              <p className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                                Privada
                              </p>
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

              {/* Etapa 2: Detalhes */}
              <AnimatePresence mode="wait">
                {etapaCriacao === 'detalhes' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Badge do tipo selecionado - reduzido */}
                    <motion.div
                      className="mb-6 flex items-center gap-2"
                      layoutId="tipo-badge"
                    >
                      <div
                        className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
                        style={{
                          backgroundColor: privado ? `#ff000015` : `${theme.brand.primary}15`,
                          color: privado ? '#ff0000' : theme.brand.primary,
                          border: `1px solid ${privado ? '#ff0000' : theme.brand.primary}`,
                        }}
                      >
                        {privado ? <FiLock size={14} /> : <FiGlobe size={14} />}
                        {privado ? 'Privada' : 'Pública'}
                      </div>
                      <button
                        onClick={() => setEtapaCriacao('tipo')}
                        className="text-xs px-2 py-1 rounded hover:opacity-70 transition-all"
                        style={{ backgroundColor: theme.background.surface, color: theme.text.secondary }}
                      >
                        Alterar
                      </button>
                    </motion.div>

                    <form onSubmit={handleSubmitSugestao} className="space-y-6">
                      {/* Título */}
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>
                          Título da Sugestão *
                        </label>
                        <input
                          type="text"
                          value={titulo}
                          onChange={(e) => setTitulo(e.target.value)}
                          maxLength={255}
                          placeholder="Descreva sua ideia em poucas palavras"
                          className="w-full px-4 py-2.5 rounded-lg outline-none border"
                          style={{
                            backgroundColor: theme.background.surface,
                            borderColor: theme.border.secondary,
                            color: theme.text.primary,
                          }}
                        />
                        <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                          {titulo.length}/255 caracteres
                        </p>
                      </div>

                      {/* Descrição */}
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>
                          Descrição Detalhada *
                        </label>
                        <textarea
                          value={descricao}
                          onChange={(e) => setDescricao(e.target.value)}
                          placeholder="Descreva sua ideia e como ela ajudaria no seu dia a dia"
                          rows={6}
                          className="w-full px-4 py-2.5 rounded-lg outline-none border resize-none"
                          style={{
                            backgroundColor: theme.background.surface,
                            borderColor: theme.border.secondary,
                            color: theme.text.primary,
                          }}
                        />
                      </div>

                      {/* Info box para público */}
                      {!privado && (
                        <div className="p-4 rounded-lg bg-blue-100 border border-blue-300">
                          <p className="text-sm" style={{ color: '#1976d2' }}>
                            Esta sugestão será visível apenas para usuários do seu departamento.
                            Administradores podem promovê-la para visibilidade global se considerarem relevante.
                          </p>
                        </div>
                      )}

                  <div className="flex gap-3 justify-end pt-4 border-t" style={{ borderColor: theme.border.secondary }}>
                    <button
                      type="submit"
                      disabled={submiting}
                      className="font-segoe px-6 py-2.5 rounded-lg font-semibold text-white transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                      style={{ backgroundColor: theme.brand.primary }}
                    >
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

        {/* Lista de Sugestões - OCULTA DURANTE A CRIAÇÃO */}
        <AnimatePresence>
          {etapaCriacao === 'repouso' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {loading ? (
                <div className="text-center py-12" style={{ color: theme.text.secondary }}>
                  Carregando sugestões...
                </div>
              ) : sugestoes.length === 0 ? (
                <div className="text-center py-16" style={{ color: theme.text.tertiary }}>
                  <p className="text-lg mb-2">Nenhuma sugestão encontrada</p>
                  <p className="text-sm">Seja o primeiro a enviar uma sugestão!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sugestoes.map((sugestao) => {
                    const statusStyle = getStatusColor(sugestao.status);
                    return (
                      <motion.div
                        key={sugestao.id}
                        onClick={() => router.push(`/sugestoes/${sugestao.id}`)}
                        className="group p-5 rounded-xl cursor-pointer transition-all hover:shadow-md border"
                        style={{
                          backgroundColor: theme.background.card,
                          borderColor: theme.border.secondary,
                        }}
                        whileHover={{ y: -2 }}
                      >
                        <div className="flex items-start justify-between gap-4 w-full">
                          {isAdmin && (
                            <div 
                              className={`mt-1 transition-opacity ${selecionadas.includes(sugestao.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSugestao(sugestao.id, !selecionadas.includes(sugestao.id));
                              }}
                            >
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${!selecionadas.includes(sugestao.id) ? 'hover:bg-gray-500/20' : ''}`}
                                style={{
                                  backgroundColor: selecionadas.includes(sugestao.id) ? theme.brand.primary : 'transparent',
                                  borderColor: selecionadas.includes(sugestao.id) ? theme.brand.primary : theme.text.secondary,
                                }}
                              >
                                {selecionadas.includes(sugestao.id) && <FiCheck size={14} color="#fff" />}
                              </div>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold truncate" style={{ color: theme.text.primary }}>
                                {sugestao.titulo}
                              </h3>
                              {sugestao.privado && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Privada
                                </span>
                              )}
                            </div>

                            <p
                              className="text-sm line-clamp-2 mb-3"
                              style={{ color: theme.text.secondary }}
                            >
                              {sugestao.descricao}
                            </p>

                            <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: theme.text.tertiary }}>
                              <span
                                className="px-2.5 py-1 rounded-full font-medium"
                                style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                              >
                                {statusStyle.label}
                              </span>
                              <div className="flex items-center gap-1">
                                <FiClock size={14} />
                                {formatarData(sugestao.atualizadoEm)}
                              </div>
                              {sugestao.escopo === 'global' && (
                                <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
                                  Global
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 items-end">
                            <button
                              onClick={(e) => handleVotar(sugestao.id, e)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                              style={{
                                backgroundColor: `${theme.brand.primary}20`,
                                color: theme.brand.primary,
                              }}
                            >
                              <FiThumbsUp size={16} />
                              {sugestao.votos?.length || 0}
                            </button>

                            <div className="flex items-center gap-1 text-sm" style={{ color: theme.text.tertiary }}>
                              <FiMessageCircle size={16} />
                              {sugestao.interacoes?.length || 0}
                            </div>

                            <FiChevronRight size={20} style={{ color: theme.text.tertiary }} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAdmin && selecionadas.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 pointer-events-auto border"
              style={{
                backgroundColor: theme.background.card,
                borderColor: theme.border.secondary,
              }}
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                  {selecionadas.length} {selecionadas.length === 1 ? 'sugestão selecionada' : 'sugestões selecionadas'}
                </span>
                <button
                  onClick={() => setSelecionadas([])}
                  className="text-xs text-left hover:underline opacity-80"
                  style={{ color: theme.text.secondary }}
                >
                  Limpar seleção
                </button>
              </div>

              <div className="h-8 w-px opacity-30" style={{ backgroundColor: theme.border.secondary }}></div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <select
                    value={novoStatus}
                    onChange={(e) => setNovoStatus(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm border outline-none min-w-[180px] cursor-pointer"
                    style={{
                      backgroundColor: theme.background.surface,
                      borderColor: theme.border.secondary,
                      color: theme.text.primary,
                    }}
                  >
                    <option value="">Alterar status para...</option>
                    <option value="aberta">Aberta</option>
                    <option value="em_analise">Em análise</option>
                    <option value="planejada">Planejada</option>
                    <option value="em_desenvolvimento">Em desenvolvimento</option>
                    <option value="concluida">Concluída</option>
                    <option value="recusada">Recusada</option>
                  </select>

                  <button
                    onClick={handleBulkStatusChange}
                    disabled={!novoStatus || submittingBulk}
                    className="px-4 py-2 rounded-lg font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                    style={{ backgroundColor: theme.brand.primary }}
                  >
                    {submittingBulk ? '...' : 'Aplicar'}
                  </button>
                </div>

                <div className="h-8 w-px opacity-30" style={{ backgroundColor: theme.border.secondary }}></div>

                <div className="flex items-center gap-3">
                  <select
                    value={novoEscopo}
                    onChange={(e) => setNovoEscopo(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm border outline-none min-w-[180px] cursor-pointer"
                    style={{
                      backgroundColor: theme.background.surface,
                      borderColor: theme.border.secondary,
                      color: theme.text.primary,
                    }}
                  >
                    <option value="">Alterar escopo para...</option>
                    <option value="departamento">Departamento</option>
                    <option value="global">Global</option>
                  </select>

                  <button
                    onClick={handleBulkEscopoChange}
                    disabled={!novoEscopo || submittingBulk}
                    className="px-4 py-2 rounded-lg font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                    style={{ backgroundColor: theme.brand.primary }}
                  >
                    {submittingBulk ? '...' : 'Aplicar'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
