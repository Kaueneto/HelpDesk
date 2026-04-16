'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiThumbsUp, FiMessageCircle, FiClock, FiUser, FiCheck, FiX, FiLock, FiGlobe } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Sugestao {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
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

export default function DetalhesSugestao() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { theme, mode } = useTheme();

  const sugestaoId = parseInt(params.id as string);
  const [sugestao, setSugestao] = useState<Sugestao | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [jaVotou, setJaVotou] = useState(false);

  useEffect(() => {
    carregarSugestao();
  }, [sugestaoId]);

  const carregarSugestao = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/sugestoes/${sugestaoId}`);
      setSugestao(response.data);
      
      // Verificar se usuário já votou
      const temVoto = response.data.votos?.some((v: any) => v.usuarioId === user?.id);
      setJaVotou(!!temVoto);
    } catch (error: any) {
      toast.error('Erro ao carregar sugestão');
      router.push('/sugestoes');
    } finally {
      setLoading(false);
    }
  };

  const handleVotar = async () => {
    try {
      await api.post(`/sugestoes/${sugestaoId}/votar`);
      carregarSugestao();
      toast.success('Voto registrado!');
    } catch (error: any) {
      toast.error(error.response?.data?.mensagem || 'Erro ao votar');
    }
  };

  const handleComentario = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentText.trim()) {
      toast.error('Digite um comentário');
      return;
    }

    setSubmittingComment(true);

    try {
      await api.post(`/sugestoes/${sugestaoId}/comentario`, {
        mensagem: commentText,
      });

      setCommentText('');
      carregarSugestao();
      toast.success('Comentário adicionado!');
    } catch (error: any) {
      toast.error('Erro ao adicionar comentário');
    } finally {
      setSubmittingComment(false);
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
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimelineItemIcon = (tipo: string) => {
    switch (tipo) {
      case 'comentario':
      case 'resposta_admin':
        return <FiMessageCircle size={16} />;
      case 'mudanca_status':
        return <FiCheck size={16} />;
      default:
        return <FiClock size={16} />;
    }
  };

  const getTimelineItemColor = (tipo: string) => {
    switch (tipo) {
      case 'resposta_admin':
        return '#1976d2';
      case 'mudanca_status':
        return '#388e3c';
      default:
        return theme.text.secondary;
    }
  };

  // Combinar votos iniciais e interações para timeline
  const timelineItems = [
    {
      id: `created-${sugestao?.id}`,
      type: 'created',
      titulo: `Sugestão criada por ${sugestao?.usuarioCriacao.name}`,
      data: sugestao?.criadoEm,
    },
    ...(sugestao?.votos?.map((voto: any, idx: number) => ({
      id: `vote-${voto.id}`,
      type: 'voto',
      titulo: `${voto.usuario.name} apoiou`,
      data: voto.criadoEm || sugestao?.criadoEm,
    })) || []),
    ...(sugestao?.interacoes?.map((interacao: any) => ({
      id: `interaction-${interacao.id}`,
      type: interacao.tipo,
      titulo: interacao.tipo === 'mudanca_status' ? `Status alterado para ${interacao.status_novo}` : `${interacao.usuario.name}: ${interacao.mensagem}`,
      data: interacao.criadoEm,
    })) || []),
  ].sort((a, b) => new Date(b.data || '').getTime() - new Date(a.data || '').getTime());

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background.pagina }}>
        <p style={{ color: theme.text.secondary }}>Carregando...</p>
      </div>
    );
  }

  if (!sugestao) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background.pagina }}>
        <p style={{ color: theme.text.secondary }}>Sugestão não encontrada</p>
      </div>
    );
  }

  const statusStyle = getStatusColor(sugestao.status);
  const comentarios = sugestao.interacoes?.filter((i: any) => i.tipo === 'comentario' || i.tipo === 'resposta_admin') || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: theme.background.pagina }}
    >
      {/* Container principal com layout lateral */}
      <div className="max-w-5xl mx-auto relative">
        {/* Conteúdo principal */}
        <div className="mr-0 lg:mr-96 pr-0 lg:pr-8">
          {/* Botão voltar - parte do fluxo normal */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg mb-6 hover:opacity-80 transition-all border"
            style={{
              backgroundColor: theme.background.surface,
              color: theme.text.primary,
              borderColor: theme.border.secondary,
            }}
          >
            <FiArrowLeft size={18} />
            <span className="text-sm font-medium">Voltar</span>
          </button>

          {/* TITULO E STATUYS DA SUGESTAO */}
          <div className="mt-0">
            <h1 className="text-1xl lg:text-2xl font-bold mb-4 font-segoe" style={{ color: theme.text.primary }}>
              {sugestao.titulo}
            </h1>

            {/* Badges de status */}
            <div className="flex items-center gap-3 flex-wrap mb-8">
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
              >
                {statusStyle.label}
              </span>
              {sugestao.privado && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 flex items-center gap-1">
                  <FiLock size={14} />
                  Privada
                </span>
              )}
              {sugestao.escopo === 'global' && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                  <FiGlobe size={14} />
                  Global
                </span>
              )}
            </div>
          </div>

          {/*  DESCRIÇÃO DA SUGESTAO */}
          <div className="mb-12">
            <p style={{ color: theme.text.secondary, lineHeight: '1.8', fontSize: '1.05rem', fontFamily: 'Segoe UI' }}>
              {sugestao.descricao}
            </p>
          </div>

          {/* SERÇÃO E VISIBILIDADE */}
          <div className="mb-8 p-4 rounded-lg border" style={{
            backgroundColor: 'transparent',
            borderColor: sugestao.escopo === 'global' ? '#1976d2' : (mode === 'light' ? '#0044cc' : '#ffb300'),
          }}>
            <p style={{
              color: sugestao.escopo === 'global' ? '#1976d2' : (mode === 'light' ? '#0044cc' : '#f57c00'),
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              {sugestao.escopo === 'global' ? (
                <>
                  <FiGlobe size={16} />
                  Todos os usuários do sistema podem ver esta sugestão
                </>
              ) : (
                <>
                  <FiLock size={16} />
                  Por enquanto, apenas você e seu departamento veem esta sugestão
                </>
              )}
            </p>
          </div>

          {/* Seção de comentários */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-6 font-segoe" style={{ color: theme.text.primary }}>
              Comentários ({comentarios.length})
            </h2>

            {/* VERIFICAR PERMISSAO PRA COMENTAR */}
            {sugestao.privado && user?.id !== sugestao.usuarioCriacao.id && user?.roleId !== 1 && user?.roleId !== 3 ? (
              // sugestão privada e usuário NÃO é o criador e NÃO é admin
              <div className="p-4 rounded-lg border mb-8" style={{
                backgroundColor: `#ff000010`,
                borderColor: '#ff0000',
              }}>
                <p style={{ color: '#ff0000', fontWeight: '500' }}>
                  🔒 Esta sugestão é privada. Apenas o criador pode adicionar comentários.
                </p>
              </div>
            ) : (
              // sugestão pública OU privada mas usuário é o criador OU é admin
              <form onSubmit={handleComentario} className="mb-8">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Adicione um comentário relevante ou uma sugestão para melhorar a ideia..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg outline-none border mb-3 resize-none"
                  style={{
                    backgroundColor: theme.background.surface,
                    borderColor: theme.border.secondary,
                    color: theme.text.primary,
                  }}
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="px-4 py-2 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: theme.brand.primary }}
                >
                  {submittingComment ? 'Enviando...' : 'Comentar'}
                </button>
              </form>
            )}

            {/* Lista de comentários */}
            <div className="space-y-4">
              {comentarios.length === 0 ? (
                <p style={{ color: theme.text.tertiary }}>
                  Nenhum comentário ainda. Seja o primeiro a comentar!
                </p>
              ) : (
                comentarios.map((comentario: any) => (
                  <div
                    key={comentario.id}
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: comentario.tipo === 'resposta_admin' ? `${theme.brand.primary}10` : 'transparent',
                      borderColor: theme.border.secondary,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                        style={{ backgroundColor: theme.brand.primary, color: 'white' }}
                      >
                        {comentario.usuario.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold" style={{ color: theme.text.primary }}>
                            {comentario.usuario.name}
                          </p>
                          {comentario.tipo === 'resposta_admin' && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: theme.text.tertiary }}>
                          {formatarData(comentario.criadoEm)}
                        </p>
                        <p className="mt-2" style={{ color: theme.text.secondary, wordBreak: 'break-word' }}>
                          {comentario.mensagem}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div 
          className="hidden lg:flex fixed right-0 top-20 w-96 h-[calc(100vh-5rem)] border-l pt-6 px-8 pb-8 flex-col z-0" 
          style={{ backgroundColor: theme.background.pagina, borderColor: theme.border.secondary }}
        >

          {!sugestao.privado && (
            <div className="mb-8 pb-8 border-b" style={{ borderColor: theme.border.secondary }}>
              <div className="text-center mb-6">
                <p className="text-6xl font-bold" style={{ color: theme.brand.primary }}>
                  {sugestao.votos?.length || 0}
                </p>
                <p className="text-sm mt-2 font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                  {sugestao.votos?.length === 1 ? 'apoio' : 'apoios'}
                </p>
              </div>

              <button
                onClick={handleVotar}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold transition-all text-lg shadow-sm hover:opacity-90"
                style={{
                  backgroundColor: jaVotou ? theme.brand.primary : 'transparent',
                  color: jaVotou ? 'white' : theme.brand.primary,
                  border: `2px solid ${theme.brand.primary}`,
                }}
              >
                <FiThumbsUp size={20} />
                {jaVotou ? 'Apoiado' : 'Apoiar Sugestão'}
              </button>
            </div>
          )}

          {/* tit do historico */}
     <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
           <FiClock size={20} style={{ color: theme.brand.primary }} /> Histórico
          </h3>

          <div 
            className="flex-1 overflow-y-auto rounded-xl border p-5 relative"
            style={{ 
              backgroundColor: theme.background.surface, 
              borderColor: theme.border.secondary 
            }}
          >
     <div className="relative space-y-6">
        <div
           className="absolute left-[15px] top-2 bottom-2 w-0.5"
             style={{ backgroundColor: theme.border.secondary }}
              />

              {timelineItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="relative pl-12"
                >
                  {/* ponto na taaimelaine */}
                  <div
                    className="absolute left-0 top-1 w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                    style={{
                      backgroundColor: theme.background.surface,
                      borderColor: item.type === 'resposta_admin' ? '#1976d2' : item.type === 'mudanca_status' ? '#388e3c' : item.type === 'voto' ? '#f59e0b' : theme.border.secondary,
                    }}
                  >
                    <div
                      className="text-xs"
                      style={{
                        color: item.type === 'resposta_admin' ? '#1976d2' : item.type === 'mudanca_status' ? '#388e3c' : item.type === 'voto' ? '#f59e0b' : theme.text.secondary,
                      }}
                    >
                      {getTimelineItemIcon(item.type)}
                    </div>
                  </div>

                  <div className="pb-3 border-b border-transparent">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.tertiary }}>
                      {formatarData(item.data || '')}
                    </p>
                    <p className="text-sm mt-1 font-medium" style={{ color: theme.text.primary, lineHeight: '1.4' }}>
                      {item.titulo}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:hidden mt-8 space-y-6">
          {!sugestao.privado && (
            <div className="p-4 rounded-xl border space-y-4" style={{ backgroundColor: theme.background.card, borderColor: theme.border.secondary }}>
              <button
                onClick={handleVotar}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all"
                style={{
                  backgroundColor: jaVotou ? theme.brand.primary : `${theme.brand.primary}20`,
                  color: jaVotou ? 'white' : theme.brand.primary,
                }}
              >
                <FiThumbsUp size={18} />
                {jaVotou ? 'Apoiado' : 'Apoiar sugestão'}
              </button>

              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: theme.brand.primary }}>
                  {sugestao.votos?.length || 0}
                </p>
                <p className="text-sm" style={{ color: theme.text.secondary }}>
                  {sugestao.votos?.length === 1 ? 'apoio' : 'apoios'}
                </p>
              </div>
            </div>
          )}

          {sugestao.privado && (
            <div className="p-4 rounded-xl border" style={{ backgroundColor: `#ff000015`, borderColor: '#ff0000' }}>
              <p className="text-sm" style={{ color: '#ff0000' }}>
                esta sugestão é privada e não pode receber apoios.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
