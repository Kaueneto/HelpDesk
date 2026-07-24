'use client';

import { useEffect, useState, memo } from 'react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import {
  FiArrowLeft, FiThumbsUp, FiMessageCircle, FiClock,
  FiCheck, FiLock, FiGlobe,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// tipor

interface Sugestao {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  escopo: 'departamento' | 'global';
  privado: boolean;
  criadoEm: string;
  atualizadoEm: string;
  usuarioCriacao: { id: number; name: string; email?: string };
  votos: any[];
  interacoes: any[];
}

interface TimelineItem {
  id: string;
  type: string;
  titulo: string;
  data: string;
  subtitulo?: string; // email do criador, ou outros dados secundários
}

type StatusStyle = { bg: string; text: string; label: string };
type ThemeType = any;

// ─── sub-componentes estáveis (fora do componente pai) ───────────────────────
// Declará-los fora evita que sejam recriados a cada render, o que causava
// desmontagem/remontagem do <textarea> e perda de foco a cada keystroke

interface TopBarProps {
  onVoltar: () => void;
  escopo: 'departamento' | 'global';
  privado: boolean;
  mode: string;
  theme: ThemeType;
}
const TopBar = memo(({ onVoltar, escopo, privado, mode, theme }: TopBarProps) => {
  // determina cor e mensagem com base nos três casos
  const info = (() => {
    if (escopo === 'global') {
      return {
        cor: '#1976d2',
        icon: <FiGlobe size={15} />,
        texto: 'Todos os usuários do sistema podem ver esta sugestão',
      };
    }
    if (privado) {
      return {
        cor: mode === 'light' ? '#b91c1c' : '#fca5a5',
        icon: <FiLock size={15} />,
        texto: 'Apenas você e os administradores podem ver esta sugestão',
      };
    }
    // pública + departamento
    return {
      cor: mode === 'light' ? '#0044cc' : '#f57c00',
      icon: <FiLock size={15} />,
      texto: 'Visível para você, seu departamento e os administradores',
    };
  })();

  return (
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={onVoltar}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg hover:opacity-80 transition-all border whitespace-nowrap flex-shrink-0"
        style={{ backgroundColor: theme.background.surface, color: theme.text.primary, borderColor: theme.border.secondary }}
      >
        <FiArrowLeft size={18} />
        <span className="font-medium">Voltar</span>
      </button>
      <div
        className="p-3 rounded-lg border flex-1"
        style={{ borderColor: info.cor }}
      >
        <p
          className="text-sm flex items-center gap-2 m-0"
          style={{ color: info.cor }}
        >
          {info.icon}<span>{info.texto}</span>
        </p>
      </div>
    </div>
  );
});
TopBar.displayName = 'TopBar';

interface MainContentProps {
  sugestao: Sugestao;
  statusStyle: StatusStyle;
  comentarios: any[];
  commentText: string;
  onCommentChange: (v: string) => void;
  onCommentSubmit: (e: React.FormEvent) => void;
  submittingComment: boolean;
  userId?: number;
  userRoleId?: number;
  theme: ThemeType;
  formatarData: (d: string) => string;
}
const MainContent = memo(({
  sugestao, statusStyle, comentarios,
  commentText, onCommentChange, onCommentSubmit, submittingComment,
  userId, userRoleId, theme, formatarData,
}: MainContentProps) => (
  <>
    <h1 className="text-xl lg:text-2xl font-bold mb-4 font-segoe" style={{ color: theme.text.primary }}>
      {sugestao.titulo}
    </h1>
    <p className="mb-10 leading-relaxed" style={{ color: theme.text.secondary, fontSize: '1.02rem' }}>
      {sugestao.descricao}
    </p>

    {/* badges */}
    <div className="flex items-center gap-3 flex-wrap mb-8">
      <span className="px-3 py-1 rounded-full text-sm font-medium"
        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
        {statusStyle.label}
      </span>
      {sugestao.privado && (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 flex items-center gap-1">
          <FiLock size={13} /> Privada
        </span>
      )}
      {sugestao.escopo === 'global' && (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
          <FiGlobe size={13} /> Global
        </span>
      )}
    </div>

    {/* comentários */}
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-5 font-segoe" style={{ color: theme.text.primary }}>
        Comentários ({comentarios.length})
      </h2>

      {sugestao.privado && userId !== sugestao.usuarioCriacao.id && userRoleId !== 1 && userRoleId !== 3 ? (
        <div className="p-4 rounded-lg border mb-6" style={{ backgroundColor: '#ff000010', borderColor: '#ff0000' }}>
          <p style={{ color: '#ff0000', fontWeight: 500 }}>
            🔒 Esta sugestão é privada. Apenas o criador pode adicionar comentários.
          </p>
        </div>
      ) : (
        <form onSubmit={onCommentSubmit} className="mb-6">
          <textarea
            value={commentText}
            onChange={e => onCommentChange(e.target.value)}
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

      <div className="space-y-4">
        {comentarios.length === 0 ? (
          <p style={{ color: theme.text.tertiary }}>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
        ) : (
          comentarios.map((c: any) => (
            <div key={c.id} className="p-4 rounded-lg border"
              style={{
                backgroundColor: c.tipo === 'resposta_admin' ? `${theme.brand.primary}10` : 'transparent',
                borderColor: theme.border.secondary,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{ backgroundColor: theme.brand.primary, color: 'white' }}
                >
                  {c.usuario.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold" style={{ color: theme.text.primary }}>{c.usuario.name}</p>
                    {c.tipo === 'resposta_admin' && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Admin</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: theme.text.tertiary }}>{formatarData(c.criadoEm)}</p>
                  <p className="mt-2" style={{ color: theme.text.secondary, wordBreak: 'break-word' }}>{c.mensagem}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </>
));
MainContent.displayName = 'MainContent';

interface SidePanelContentProps {
  sugestao: Sugestao;
  jaVotou: boolean;
  onVotar: () => void;
  timelineItems: TimelineItem[];
  theme: ThemeType;
  formatarData: (d: string) => string;
  getTimelineIcon: (tipo: string) => React.ReactNode;
}
const SidePanelContent = memo(({ sugestao, jaVotou, onVotar, timelineItems, theme, formatarData, getTimelineIcon }: SidePanelContentProps) => (
  <>
    {!sugestao.privado && (
      <div className="mb-8 pb-8 border-b" style={{ borderColor: theme.border.secondary }}>
        <div className="text-center mb-5">
          <p className="text-6xl font-bold" style={{ color: theme.brand.primary }}>
            {sugestao.votos?.length || 0}
          </p>
          <p className="text-sm mt-1 font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
            {sugestao.votos?.length === 1 ? 'apoio' : 'apoios'}
          </p>
        </div>
        <button
          onClick={onVotar}
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

    <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
      <FiClock size={20} style={{ color: theme.brand.primary }} /> Histórico
    </h3>

    <div
      className="flex-1 overflow-y-auto rounded-xl border p-5 relative"
      style={{ backgroundColor: theme.background.surface, borderColor: theme.border.secondary }}
    >
      <div className="relative space-y-6">
        <div className="absolute left-[15px] top-2 bottom-2 w-0.5" style={{ backgroundColor: theme.border.secondary }} />
        {timelineItems.map((item, idx) => {
          const dotColor =
            item.type === 'resposta_admin' ? '#1976d2'
            : item.type === 'mudanca_status' || item.type === 'mudanca_escopo' ? '#388e3c'
            : item.type === 'voto' ? '#f59e0b'
            : theme.border.secondary;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className="relative pl-12"
            >
              <div
                className="absolute left-0 top-1 w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: theme.background.surface, borderColor: dotColor }}
              >
                <div style={{ color: dotColor }}>{getTimelineIcon(item.type)}</div>
              </div>
              <div className="pb-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.tertiary }}>
                  {formatarData(item.data)}
                </p>
                <p className="text-sm mt-1 font-medium" style={{ color: theme.text.primary, lineHeight: '1.4' }}>
                  {item.titulo}
                </p>
                {item.subtitulo && (
                  <p className="text-[11px] mt-0.5" style={{ color: theme.text.tertiary }}>
                    {item.subtitulo}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </>
));
SidePanelContent.displayName = 'SidePanelContent';

interface MobilePanelProps {
  sugestao: Sugestao;
  jaVotou: boolean;
  onVotar: () => void;
  theme: ThemeType;
}
const MobilePanel = memo(({ sugestao, jaVotou, onVotar, theme }: MobilePanelProps) => (
  <div className="lg:hidden mt-8 space-y-6">
    {!sugestao.privado && (
      <div className="p-4 rounded-xl border space-y-4"
        style={{ backgroundColor: theme.background.card, borderColor: theme.border.secondary }}>
        <button
          onClick={onVotar}
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
          <p className="text-3xl font-bold" style={{ color: theme.brand.primary }}>{sugestao.votos?.length || 0}</p>
          <p className="text-sm" style={{ color: theme.text.secondary }}>
            {sugestao.votos?.length === 1 ? 'apoio' : 'apoios'}
          </p>
        </div>
      </div>
    )}
    {sugestao.privado && (
      <div className="p-4 rounded-xl border" style={{ backgroundColor: '#ff000015', borderColor: '#ff0000' }}>
        <p className="text-sm" style={{ color: '#ff0000' }}>Esta sugestão é privada e não pode receber apoios.</p>
      </div>
    )}
  </div>
));
MobilePanel.displayName = 'MobilePanel';


interface Props {
  sugestaoId: number;
  onVoltar: () => void;
  /** Quando true usa grid lado-a-lado em vez de painel fixed (para containers com overflow) */
  inlineLayout?: boolean;
}

export default function SugestaoDetalhe({ sugestaoId, onVoltar, inlineLayout = false }: Props) {
  const { user } = useAuth();
  const { theme, mode } = useTheme();

  const [sugestao, setSugestao] = useState<Sugestao | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [jaVotou, setJaVotou] = useState(false);

  useEffect(() => { carregarSugestao(); }, [sugestaoId]);

  const carregarSugestao = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/sugestoes/${sugestaoId}`);
      setSugestao(response.data);
      const temVoto = response.data.votos?.some((v: any) => v.usuarioId === user?.id);
      setJaVotou(!!temVoto);
    } catch {
      toast.error('Erro ao carregar sugestão');
      onVoltar();
    } finally {
      setLoading(false);
    }
  };

  const normalizarStatus = (status: string) => {
    const map: Record<string, string> = {
      aberta: 'Aberta', em_analise: 'Em análise', planejada: 'Planejada',
      em_desenvolvimento: 'Em desenvolvimento', concluida: 'Concluída', recusada: 'Recusada',
    };
    return map[status] || status;
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
    if (!commentText.trim()) { toast.error('Digite um comentário'); return; }
    setSubmittingComment(true);
    try {
      await api.post(`/sugestoes/${sugestaoId}/comentario`, { mensagem: commentText });
      setCommentText('');
      carregarSugestao();
      toast.success('Comentário adicionado!');
    } catch {
      toast.error('Erro ao adicionar comentário');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusColor = (status: string): StatusStyle => {
    const map: Record<string, StatusStyle> = {
      aberta:             { bg: '#e3f2fd', text: '#1976d2', label: 'Aberta' },
      em_analise:         { bg: '#fff3e0', text: '#f57c00', label: 'Em análise' },
      planejada:          { bg: '#e8f5e9', text: '#388e3c', label: 'Planejada' },
      em_desenvolvimento: { bg: '#f3e5f5', text: '#7b1fa2', label: 'Em desenvolvimento' },
      concluida:          { bg: '#c8e6c9', text: '#2e7d32', label: 'Concluída' },
      recusada:           { bg: '#ffebee', text: '#c62828', label: 'Recusada' },
    };
    return map[status] || map.aberta;
  };

  const formatarData = (data: string) =>
    new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getTimelineIcon = (tipo: string): React.ReactNode => {
    switch (tipo) {
      case 'comentario': case 'resposta_admin': return <FiMessageCircle size={16} />;
      case 'mudanca_status': case 'mudanca_escopo': return <FiCheck size={16} />;
      default: return <FiClock size={16} />;
    }
  };

  if (!theme) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background.pagina }}>
        <p style={{ color: theme.text.secondary }}>Carregando...</p>
      </div>
    );
  }

  if (!sugestao) return null;

  const statusStyle = getStatusColor(sugestao.status);
  const comentarios = sugestao.interacoes?.filter(
    (i: any) => i.tipo === 'comentario' || i.tipo === 'resposta_admin'
  ) || [];

  const timelineItems: TimelineItem[] = [
    {
      id: `created-${sugestao.id}`,
      type: 'created',
      titulo: `Sugestão criada por ${sugestao.usuarioCriacao.name}`,
      subtitulo: sugestao.usuarioCriacao.email,
      data: sugestao.criadoEm,
    },
    ...(sugestao.votos?.map((voto: any) => ({
      id: `vote-${voto.id}`,
      type: 'voto',
      titulo: `${voto.usuario.name} apoiou`,
      data: voto.criadoEm || sugestao.criadoEm,
    })) || []),
    ...(sugestao.interacoes?.map((i: any) => ({
      id: `interaction-${i.id}`,
      type: i.tipo,
      titulo: i.tipo === 'mudanca_status'
        ? `Status alterado para ${normalizarStatus(i.status_novo)}`
        : i.tipo === 'mudanca_escopo'
        ? `Escopo alterado para ${i.escopo_novo === 'global' ? 'Global' : 'Departamento'}`
        : `${i.usuario.name}: ${i.mensagem}`,
      data: i.criadoEm,
    })) || []),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // props compartilhadas pelos dois layouts
  const sidePanelProps: SidePanelContentProps = {
    sugestao, jaVotou, onVotar: handleVotar,
    timelineItems, theme, formatarData, getTimelineIcon,
  };
  const mainContentProps: MainContentProps = {
    sugestao, statusStyle, comentarios,
    commentText, onCommentChange: setCommentText,
    onCommentSubmit: handleComentario, submittingComment,
    userId: user?.id, userRoleId: user?.roleId,
    theme, formatarData,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: theme.background.pagina }}
    >
      {inlineLayout ? (
 
        <div className="max-w-5xl mx-auto">
          <TopBar onVoltar={onVoltar} escopo={sugestao.escopo} privado={sugestao.privado} mode={mode} theme={theme} />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-8">
            <div><MainContent {...mainContentProps} /></div>
            <div className="hidden lg:flex flex-col"><SidePanelContent {...sidePanelProps} /></div>
          </div>
          <MobilePanel sugestao={sugestao} jaVotou={jaVotou} onVotar={handleVotar} theme={theme} />
        </div>
      ) : (
       
        <div className="max-w-5xl mx-auto relative">
          <div className="mr-0 lg:mr-96 pr-0 lg:pr-8">
            <TopBar onVoltar={onVoltar} escopo={sugestao.escopo} privado={sugestao.privado} mode={mode} theme={theme} />
            <MainContent {...mainContentProps} />
          </div>
          <div
            className="hidden lg:flex fixed right-0 top-20 w-96 h-[calc(100vh-5rem)] border-l pt-6 px-8 pb-8 flex-col z-10"
            style={{ backgroundColor: theme.background.pagina, borderColor: theme.border.secondary }}
          >
            <SidePanelContent {...sidePanelProps} />
          </div>
          <MobilePanel sugestao={sugestao} jaVotou={jaVotou} onVotar={handleVotar} theme={theme} />
        </div>
      )}
    </motion.div>
  );
}
