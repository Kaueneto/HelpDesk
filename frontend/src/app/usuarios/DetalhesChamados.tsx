'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/services/api';
import SocketManager from '@/services/socketManager';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ModalEditarChamadoUsuario from './ModalEditarChamadoUsuario';
import ModalConfirmarReabertura from './ModalConfirmarReabertura';
import { HiTrash } from "react-icons/hi";
import { BsPaperclip } from "react-icons/bs";

interface DetalhesChamadosProps {
  chamado: any;
  onVoltar: () => void;
}

export default function DetalhesChamados({ chamado, onVoltar }: DetalhesChamadosProps) {
  const { user } = useAuth();
  const { mode } = useTheme();
  const dark = mode === 'dark';

  // paleta
  const bg        = dark ? '#0F172A'  : '#f8fafc';
  const cardBg    = dark ? '#1E293B'  : '#f8fafc';
  const borderClr = dark ? '#334155'  : '#e5e7eb';
  const textPrim  = dark ? '#F1F5F9'  : '#111827';
  const textSec   = dark ? '#94a3b8'  : '#6b7280';
  const inputBg   = dark ? '#0F172A'  : '#ffffff';
  const msgSelf   = dark ? '#1e3a5f'  : '#eff6ff';  // balão do usuário logado
  const msgOther  = dark ? '#1e293b'  : '#f3f4f6';  // balão do suporte
  const borderSelf  = dark ? '#3b82f6' : '#3b82f6';
  const borderOther = dark ? '#475569' : '#6b7280';
  const histBg    = dark ? '#1e293b6b'  : '#ffffff28';
  const histBorder= dark ? '#33415542'  : '#e5e7eb4c';
  const textHist = dark ? '#ffffff7e'  : '#0000006a';

  const [mensagens, setMensagens] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [anexosResposta, setAnexosResposta] = useState<File[]>([]);
  const [isDraggingResposta, setIsDraggingResposta] = useState(false);
  const [submittingResposta, setSubmittingResposta] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [chamadoAtualizado, setChamadoAtualizado] = useState(chamado);
  const [modalConfirmarReaberturaAberto, setModalConfirmarReaberturaAberto] = useState(false);
  const [anexosCarregados, setAnexosCarregados] = useState(false);

  const listenersRegistradosRef = useRef(false);

  // fazer scroll automático SEMPRE que mensagens mudam
  useEffect(() => {
    console.log(`[MENSAGENS ATUALIZADAS] Total: ${mensagens.length} mensagens`);
    // usar requestAnimationFrame para garantir que a DOM foi atualizada
    const scrollTimer = requestAnimationFrame(() => {
      const chatContainer = document.getElementById('chat-messages-container');
      if (chatContainer) {
        console.log(`[SCROLL AUTO] Scrollando para o fim. ScrollHeight: ${chatContainer.scrollHeight}, ScrollTop: ${chatContainer.scrollTop}`);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        console.log(`[SCROLL AUTO] ✅ Após scroll - ScrollTop: ${chatContainer.scrollTop}`);
      }
    });
    return () => cancelAnimationFrame(scrollTimer);
  }, [mensagens]); // ✅ Reage SEMPRE que mensagens mudam

  useEffect(() => {
    buscarMensagens(chamado.id);
    buscarHistorico(chamado.id);
    setChamadoAtualizado(chamado);
    carregarAnexosDescricao(chamado.id);
  }, [chamado.id]);

  // merge inteligente - adiciona apenas mensagens novas (sem refetch total)
  const adicionarMensagemDoWebSocket = useCallback((novaMensagem: any) => {
    setMensagens(prev => {
      // verificar se já existe por ID (evita duplicatas do POST response)
      const jaExiste = prev.some(m => m.id === novaMensagem.id);
      if (jaExiste) {
        return prev;
      }
      
      return [...prev, novaMensagem];
    });
  }, []);

  // atualiza os dados do chamado (status, responsável etc.) sem recarregar a página
  const buscarChamadoAtualizado = useCallback(async (chamadoId: number) => {
    try {
      const response = await api.get(`/chamados/${chamadoId}`);
      if (response.data) {
        setChamadoAtualizado((prev: any) => ({
          ...prev,
          ...response.data,
          // preservar anexos já carregados com signed URLs para não piscar
          anexos: prev.anexos?.length ? prev.anexos : response.data.anexos,
        }));
      }
    } catch (error) {
      console.error('[CHAMADO ATUALIZADO] Erro ao buscar dados atualizados:', error);
    }
  }, []);

  // auto-atualização do chat via WebSocket (sem polling)
  useEffect(() => {
    if (!chamado?.id) {
      return;
    }

    const socketManager = SocketManager.getInstance();
    
    // usar Promise para garantir que entrou na sala ANTES de registrar listeners
    socketManager.joinChamado(Number(chamado.id))
      .then(() => {
        
        // registrar listeners via manager (não direto no socket)
        const unsubMsg = socketManager.on('msg-new', (data: any) => {
          const mensagemDoEvento = data.mensagem || data;
          adicionarMensagemDoWebSocket(mensagemDoEvento);
          
          // usar apenas refetch se houver anexos (para garantir signed URLs)
          if (mensagemDoEvento.anexos && mensagemDoEvento.anexos.length > 0) {
            buscarMensagens(chamado.id, true);
          }
        });

        const unsubHistorico = socketManager.on('history-new', (data: any) => {
          buscarHistorico(chamado.id);
          // atualizar dados do chamado (status, responsável etc.) em tempo real
          buscarChamadoAtualizado(chamado.id);
        });

        // Listener de teste para diagnosticar
        const unsubTest = socketManager.on('test-event', (data: any) => {
          // evento de teste ignorado silenciosamente
        });

        // Cleanup
        return () => {
          console.log('[CLEANUP] Saindo da sala e removendo listeners:', chamado.id);
          unsubMsg();
          unsubHistorico();
          unsubTest();
          socketManager.leaveChamado(Number(chamado.id));
        };
      })
      .catch((error) => {
        console.error('[WEBSOCKET] Erro ao entrar na sala:', error);
      });

    // retornar cleanup vazio aqui (listeners já cuidam da limpeza)
    return () => {};
  }, [chamado?.id, adicionarMensagemDoWebSocket, buscarChamadoAtualizado]);
  const buscarMensagens = async (chamadoId: number, silent = false) => {
    if (!silent) setLoadingMensagens(true);
    try {
      console.log(`[BUSCAR MENSAGENS] Carregando mensagens do chamado ${chamadoId}...`);
      const response = await api.get(`/chamados/${chamadoId}/mensagens`);
      console.log(`[BUSCAR MENSAGENS] ✅✅✅ recebidas ${response.data.length} mensagens`);
      setMensagens(response.data);
    } catch (error) {
      console.error(`❌❌❌erro:`, error);
    } finally {
      if (!silent) setLoadingMensagens(false);
    }
  };

  const buscarHistorico = async (chamadoId: number) => {
    try {
      const response = await api.get(`/chamados/${chamadoId}/historico`);
      setHistorico(response.data);
    } catch (error) {
      console.error(`❌❌❌erro:`, error);
    }
  };

  const carregarAnexosDescricao = async (chamadoId: number) => {
    if (anexosCarregados) return; // evita recarregamento desnecessário
    
    try {
      const response = await api.get(`/chamados/${chamadoId}`);
      
      // atualiza especificamente os anexos com signedUrl atualizadas
      setChamadoAtualizado((prev: any) => ({
        ...prev,
        anexos: response.data.anexos || []
      }));
      setAnexosCarregados(true);
    } catch (error) {
   
    }
  };

  const handlePublicarResposta = async () => {
    if (!novaMensagem.trim()) {
      setErrorMessage('Por favor, escreva uma mensagem.');
      return;
    }

    // se o chamado está encerrado (status.id === 3), mostrar modal de confirmação
    if (chamadoAtualizado.status?.id === 3) {
      setModalConfirmarReaberturaAberto(true);
      return;
    }

    // se não está encerrado, enviar normalmente
    await enviarMensagem();
  };

  const enviarMensagem = async () => {
    setSubmittingResposta(true);
    setErrorMessage('');

    try {
      console.log(`\n[ENVIAR MENSAGEM] Iniciando envio para chamado ${chamado.id}`);

      const response = await api.post(`/chamados/${chamado.id}/mensagens`, {
        mensagem: novaMensagem,
      });

      console.log(`✅ [ENVIAR MENSAGEM] Resposta recebida do API:`, response.data);
   
      const mensagemId = response.data?.mensagem?.id ?? response.data?.id ?? response.data?.mensagemId;
      console.log(`✅ [ENVIAR MENSAGEM] ID da mensagem: ${mensagemId}`);
      
      // Adiciona a mensagem imediatamente após o servidor confirmar (mesmo que websocket falhe para o dono)
      if (response.data) {
        // usar o objeto completo da resposta, não apenas a string de texto
        const novaMsg = response.data;
        setMensagens(prev => {
          if (prev.some(m => m.id === novaMsg.id)) return prev;
          return [...prev, novaMsg];
        });
        
        setTimeout(() => {
          const chatContainer = document.getElementById('chat-messages-container');
          if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
      }

      if (anexosResposta.length > 0 && mensagemId) {
      
        
        const formData = new FormData();
        anexosResposta.forEach((file, index) => {
          formData.append('arquivos', file);
          
        });

        try {
          const responseAnexos = await api.post(`/mensagem/${mensagemId}/anexo`, formData);
        } catch (anexoError: any) {
          const detalheErro = anexoError?.response?.data?.mensagem || anexoError?.response?.data?.erro || anexoError?.message || 'Erro desconhecido';
          console.error('[ANEXO] Erro ao enviar anexos:', anexoError?.response?.data || anexoError);
          setErrorMessage(`Mensagem enviada, mas houve erro no envio dos anexos. ${detalheErro}`);
        }
      } else if (anexosResposta.length > 0 && !mensagemId) {
        setErrorMessage('Mensagem enviada, mas não foi possível processar os anexos.');
      }

      setNovaMensagem('');
      setAnexosResposta([]);

      // removido o recarregamento total (buscarMensagens) com loading para evitar piscar a tela.
      // o frontend é atualizado via array setMensagens!
      // se houverem anexos (e mensagemId), recarrega silenciosamente
      if (anexosResposta.length > 0) {
        buscarMensagens(chamado.id, true);
      }
        
    } catch (error: any) {
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao publicar resposta.';
      setErrorMessage(mensagemErro);
    } finally {
      setSubmittingResposta(false);
    }
  };

  const handleDragOverResposta = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingResposta(true);
  };

  const handleDragLeaveResposta = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingResposta(false);
  };

  const handleDropResposta = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingResposta(false);
    
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      if (filesArray.length > 5) {
        setErrorMessage('Máximo de 5 arquivos permitidos.');
        return;
      }
      setAnexosResposta(filesArray);
      setErrorMessage('');
    }
  };

  const handleFileChangeResposta = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length > 5) {
        setErrorMessage('Máximo de 5 arquivos permitidos.');
        return;
      }
      setAnexosResposta(filesArray);
      setErrorMessage('');
    }
  };

  const removeFileResposta = (index: number) => {
    setAnexosResposta((prev) => prev.filter((_, i) => i !== index));
  };

  const formatarDataBrasilia = (data: string) => {
  return new Date(data).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

  const handleSucessoEdicao = () => {
    // Recarregar informações do chamado
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: cardBg }}>
      {/* ── Cabeçalho ── */}
      <div className="border-b pb-2 sm:pb-3 md:pb-4 mb-2 sm:mb-3 md:mb-4" style={{ borderColor: borderClr }}>
        <div className="flex flex-col md:flex-row justify-between items-start gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3 md:mb-4">
          <div className="flex-1 w-full">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-500 mb-1 sm:mb-2">
              {chamadoAtualizado.resumoChamado}{' '}
              <span className="text-sm sm:text-base md:text-lg" style={{ color: textSec }}>
                #{chamadoAtualizado.numeroChamado || chamadoAtualizado.id}
              </span>
            </h2>
            <p className="text-xs sm:text-sm mb-2 sm:mb-3 md:mb-4 border-b pb-1" style={{ color: textSec, borderColor: borderClr }}>
              Informações sobre o chamado
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              <div>
                <p className="text-sm sm:text-base font-segoe font-semibold mb-1" style={{ color: textPrim }}>Status</p>
                <p className="text-sm sm:text-base  font-bold" style={{
                  color:
                    chamadoAtualizado.status?.id === 1 ? '#f59e0b' :
                    chamadoAtualizado.status?.id === 2 ? '#2563eb' :
                    chamadoAtualizado.status?.id === 3 ? '#059669' :
                    chamadoAtualizado.status?.id === 4 ? '#dc2626' :
                    chamadoAtualizado.status?.id === 5 ? '#8b5cf6' : textPrim
                }}>
                  {chamadoAtualizado.status?.nome}
                </p>
              </div>
              <div>
                <p className="text-sm sm:text-base font-segoe font-semibold mb-1" style={{ color: textPrim }}>Departamento</p>
                <p className="text-sm sm:text-base font-segoe font-bold text-blue-500">{chamadoAtualizado.departamento?.name}</p>
              </div>
              <div>
                <p className="text-sm sm:text-base font-segoe font-semibold mb-1" style={{ color: textPrim }}>Criado em</p>
                <p className="text-xs sm:text-sm md:text-base font-bold text-blue-500">
                  {formatarDataBrasilia(chamadoAtualizado.dataAbertura)}
                </p>
              </div>
              <div>
                <p className="text-sm sm:text-base font-segoe font-semibold mb-1" style={{ color: textPrim }}>Prioridade</p>
                <span className="inline-block px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full border"
                  style={{
                    backgroundColor: `${chamadoAtualizado.tipoPrioridade?.cor}20`,
                    color: chamadoAtualizado.tipoPrioridade?.cor,
                    borderColor: chamadoAtualizado.tipoPrioridade?.cor,
                  }}>
                  {chamadoAtualizado.tipoPrioridade?.nome}
                </span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-segoe font-semibold mb-1" style={{ color: textPrim }}>Tópico de ajuda</p>
                <p className="text-sm sm:text-base" style={{ color: textPrim }}>{chamadoAtualizado.topicoAjuda?.nome}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-row gap-2 w-full md:w-auto">
            <button onClick={onVoltar}
              className="flex-1 md:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm md:text-base font-medium border transition"
              style={{ borderColor: borderClr, color: textPrim, backgroundColor: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = dark ? '#334155' : '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Voltar
            </button>
            <button onClick={() => setModalEditarAberto(true)}
              className="flex-1 md:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm md:text-base font-medium transition"
              style={{ backgroundColor: dark ? '#334155' : '#e5e7eb', color: textPrim }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = dark ? '#475569' : '#d1d5db')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = dark ? '#334155' : '#e5e7eb')}
            >
              Editar
            </button>
          </div>
        </div>
      </div>

      {/* ── Chat ── */}
      <div className="flex-1 overflow-hidden flex flex-col h-full">
        {loadingMensagens ? (
          <div className="text-center py-8" style={{ color: textSec }}>Carregando mensagens...</div>
        ) : (
          <>
            {/* mensagens */}
            <div id="chat-messages-container"
              className="flex-[1_0_200px] overflow-y-auto px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 space-y-3 sm:space-y-4 rounded-2xl"
              style={{ backgroundColor: bg }}
            >
              {/* 1ª mensagem — descrição inicial */}
              <div className="flex justify-end">
                <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-lg p-2 sm:p-3 md:p-4 shadow-sm border-r-4"
                  style={{ backgroundColor: msgSelf, borderColor: borderSelf }}
                >
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <span className="font-semibold text-xs sm:text-sm md:text-base" style={{ color: textPrim }}>
                      {chamado.usuario?.name || 'Usuário'}
                    </span>
                    <span className="text-[10px] sm:text-xs" style={{ color: textSec }}>
                      {formatarDataBrasilia(chamado.dataAbertura)}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium" style={{ color: textSec }}>Descrição:</span>
                  <p className="whitespace-pre-wrap text-xs sm:text-sm md:text-base" style={{ color: textPrim }}>
                    {chamado.descricaoChamado}
                  </p>

                  {/* Anexos da descrição */}
                  {chamadoAtualizado.anexos && chamadoAtualizado.anexos.length > 0 && (
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t" style={{ borderColor: dark ? '#1e40af40' : '#bfdbfe' }}>
                      <p className="text-xs sm:text-sm font-medium mb-1.5" style={{ color: textSec }}>Anexos:</p>
                      {(() => {
                        const images = chamadoAtualizado.anexos.filter((a: any) => /\.(jpg|jpeg|png|gif|webp)$/i.test(a.filename));
                        const files  = chamadoAtualizado.anexos.filter((a: any) => !/\.(jpg|jpeg|png|gif|webp)$/i.test(a.filename));
                        return (
                          <>
                            {images.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {images.map((anexo: any) => (
                                  <a key={anexo.id} href={anexo.signedUrl || '#'} target="_blank" rel="noopener noreferrer"
                                    className="group relative overflow-hidden rounded-lg border transition-all hover:shadow-lg hover:scale-105"
                                    style={{ width: '64px', height: '64px', borderColor: borderClr }} title={anexo.filename}>
                                    <img src={anexo.signedUrl || '#'} alt={anexo.filename} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            )}
                            {files.length > 0 && (
                              <div className="space-y-1">
                                {files.map((anexo: any) => (
                                  <a key={anexo.id} href={anexo.signedUrl || '#'} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2 py-1.5 border rounded transition text-xs"
                                    style={{ backgroundColor: dark ? '#1e3a5f30' : '#eff6ff', borderColor: dark ? '#3b82f640' : '#bfdbfe', color: '#3b82f6' }}>
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="truncate flex-1">{anexo.filename}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* mensagens + histórico misturados */}
              {(() => {
                const itens = [
                  ...mensagens.map(msg => ({ tipo: 'mensagem', data: msg.dataEnvio, conteudo: msg })),
                  ...historico.map(evt => ({ tipo: 'historico', data: evt.dataMov, conteudo: evt })),
                ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

                return itens.map((item, idx) => {
                  if (item.tipo === 'mensagem') {
                    const msg = item.conteudo;
                    const isSelf = msg.usuario?.id === user?.id;
                    const key = msg.id ? `msg-${msg.id}` : `msg-tmp-${idx}`;
                    return (
                      <div key={key} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-lg p-2 sm:p-3 md:p-4 shadow-sm ${isSelf ? 'border-r-4' : 'border-l-4'}`}
                          style={{
                            backgroundColor: isSelf ? msgSelf : msgOther,
                            borderColor: isSelf ? borderSelf : borderOther,
                          }}
                        >
                          <div className="flex items-center gap-1 sm:gap-2 mb-1">
                            <span className="font-semibold text-xs sm:text-sm" style={{ color: textPrim }}>
                              {msg.usuario?.name || 'Desconhecido'}
                            </span>
                            <span className="text-[10px] sm:text-xs" style={{ color: textSec }}>
                              {formatarDataBrasilia(msg.dataEnvio)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-xs sm:text-sm" style={{ color: textPrim }}>{msg.mensagem}</p>

                          {/* Anexos da mensagem */}
                          {msg.anexos && msg.anexos.length > 0 && (
                            <div className="mt-2 sm:mt-3 space-y-2">
                              {(() => {
                                const images = msg.anexos.filter((a: any) => /\.(jpg|jpeg|png|gif|webp)$/i.test(a.filename));
                                const files  = msg.anexos.filter((a: any) => !/\.(jpg|jpeg|png|gif|webp)$/i.test(a.filename));
                                return (
                                  <>
                                    {images.length > 0 && (
                                      <div className="flex flex-wrap gap-2">
                                        {images.map((anexo: any) => (
                                          <a key={anexo.id} href={anexo.signedUrl || '#'} target="_blank" rel="noopener noreferrer"
                                            className="group relative overflow-hidden rounded-lg transition-all hover:shadow-lg hover:scale-105"
                                            style={{ width: '100px', height: '70px' }} title={anexo.filename}>
                                            <img src={anexo.signedUrl || '#'} alt={anexo.filename} className="w-full h-full object-cover" />
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                    {files.length > 0 && (
                                      <div className="space-y-1">
                                        {files.map((anexo: any) => (
                                          <a key={anexo.id} href={anexo.signedUrl || '#'} target="_blank" rel="noopener noreferrer"
                                            className="group flex items-center justify-between rounded-lg border px-3 py-2 transition-all hover:scale-[1.01]"
                                            style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderColor: borderClr }}>
                                            <div className="flex items-center gap-2 min-w-0">
                                              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: dark ? '#1e40af30' : '#dbeafe', color: '#3b82f6' }}>
                                                <BsPaperclip className="h-4 w-4" />
                                              </div>
                                              <p className="truncate text-sm font-medium" style={{ color: textPrim }}>{anexo.filename}</p>
                                            </div>
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    const evento = item.conteudo;
                    return (
                      <div key={`hist-${evento.id}`} className="flex justify-center py-2 sm:py-3">
                        <div className="relative w-full max-w-[96%] sm:max-w-[92%] md:max-w-[860px] overflow-hidden rounded-2xl border px-4 py-4 sm:px-5 shadow-sm"
                          style={{ backgroundColor: histBg, borderColor: histBorder }}>
                            <div className="pl-2">
                            <p className="font-segoe text-sm font-semibold text-center" style={{ color: textHist }}>{evento.acao}</p>
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs" style={{ color: textSec }}>
                              <span className="rounded-full border px-2.5 py-1" style={{ borderColor: borderClr, backgroundColor: dark ? '#1e293b' : '#f9fafb', color: textPrim }}>
                                {evento.usuario?.name || 'Sistema'}
                              </span>
                              <span>{formatarDataBrasilia(evento.dataMov).replace(',', ' às ')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                });
              })()}
            </div>

            {/* ── Área de resposta ── */}
            <div className="shrink-0 border-t p-2 sm:p-3 md:p-4 lg:p-6" style={{ borderColor: borderClr, backgroundColor: dark ? '#1E293B' : '#f8fafc' }}>
              <h3 className="font-semibold text-xs sm:text-sm md:text-base mb-1 sm:mb-2" style={{ color: textPrim }}>Postar uma resposta</h3>
              <p className="text-xs sm:text-sm mb-2 sm:mb-3 md:mb-4" style={{ color: textSec }}>Para melhor ajudá-lo, seja específico e detalhado.</p>

              <textarea
                value={novaMensagem}
                onChange={e => setNovaMensagem(e.target.value)}
                rows={2}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md text-xs sm:text-sm md:text-base focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none mb-2 sm:mb-3"
                style={{ borderColor: borderClr, backgroundColor: inputBg, color: textPrim }}
                placeholder="Digite sua resposta aqui..."
                disabled={submittingResposta}
              />

              {/* Drop area */}
              <div
                onDragOver={handleDragOverResposta} onDragLeave={handleDragLeaveResposta} onDrop={handleDropResposta}
                className={`border-2 border-dashed rounded-lg p-2 sm:p-3 md:p-4 text-center transition-colors mb-2 sm:mb-3 ${isDraggingResposta ? 'border-blue-500 bg-blue-50' : ''}`}
                style={!isDraggingResposta ? { borderColor: borderClr, backgroundColor: dark ? '#0F172A' : '#fefce8' } : {}}
              >
                <label htmlFor="file-upload-resposta" className="cursor-pointer flex items-center justify-center gap-1 sm:gap-2">
                  <svg className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: textSec }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-xs sm:text-sm" style={{ color: textPrim }}>
                    Arraste os arquivos ou{' '}
                    <span className="text-blue-500 underline">selecione-os</span>
                  </span>
                </label>
                <input id="file-upload-resposta" type="file" multiple
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  onChange={handleFileChangeResposta} className="hidden" disabled={submittingResposta} />
              </div>

              {/* Preview de arquivos a enviar */}
              {anexosResposta.length > 0 && (
                <div className="mb-2 sm:mb-3 space-y-2">
                  {(() => {
                    const imgFiles = anexosResposta.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name));
                    const otherFiles = anexosResposta.filter(f => !/\.(jpg|jpeg|png|gif|webp)$/i.test(f.name));
                    return (
                      <>
                        {imgFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {imgFiles.map((file, index) => (
                              <div key={index} className="group relative overflow-hidden rounded-lg border transition-all hover:shadow-lg"
                                style={{ width: '72px', height: '72px', borderColor: borderClr }}>
                                <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                                <button onClick={() => removeFileResposta(anexosResposta.indexOf(file))}
                                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <HiTrash className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-0.5 truncate">
                                  {(file.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {otherFiles.length > 0 && (
                          <div className="space-y-1">
                            {otherFiles.map((file, index) => {
                              const actualIndex = anexosResposta.indexOf(file);
                              return (
                                <div key={index} className="group flex items-center justify-between rounded-lg border px-3 py-2"
                                  style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderColor: borderClr }}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: dark ? '#1e40af30' : '#dbeafe', color: '#3b82f6' }}>
                                      <BsPaperclip className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium" style={{ color: textPrim }}>{file.name}</p>
                                      <p className="text-xs" style={{ color: textSec }}>{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                  </div>
                                  <button type="button" onClick={() => removeFileResposta(actualIndex)}
                                    className="ml-2 text-xs font-medium px-2 py-1 rounded transition-colors text-red-500 hover:bg-red-500/10">
                                    Remover
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm mb-2 sm:mb-3">
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 justify-start">
                <button onClick={handlePublicarResposta} disabled={submittingResposta || !novaMensagem.trim()}
                  className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {submittingResposta ? 'Enviando...' : 'Enviar'}
                </button>
                <button
                  onClick={() => { setNovaMensagem(''); setAnexosResposta([]); setErrorMessage(''); }}
                  disabled={submittingResposta}
                  className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 border rounded-md text-xs sm:text-sm font-medium transition disabled:opacity-50"
                  style={{ borderColor: borderClr, color: textPrim, backgroundColor: 'transparent' }}>
                  cancelar
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* modais */}
      <ModalEditarChamadoUsuario
        isOpen={modalEditarAberto}
        onClose={() => setModalEditarAberto(false)}
        onSuccess={handleSucessoEdicao}
        chamadoId={chamadoAtualizado.id}
        dadosIniciais={{
          resumoChamado: chamadoAtualizado.resumoChamado,
          descricaoChamado: chamadoAtualizado.descricaoChamado,
          ramal: chamadoAtualizado.ramal,
          departamentoId: chamadoAtualizado.departamento?.id || 0,
          topicoAjudaId: chamadoAtualizado.topicoAjuda?.id || 0,
          prioridadeId: chamadoAtualizado.tipoPrioridade?.id || 0,
          statusId: chamadoAtualizado.status?.id || 0,
          anexos: chamadoAtualizado.anexos || [],
        }}
      />
      <ModalConfirmarReabertura
        isOpen={modalConfirmarReaberturaAberto}
        onConfirm={enviarMensagem}
        onClose={() => setModalConfirmarReaberturaAberto(false)}
      />
    </div>
  );
}
