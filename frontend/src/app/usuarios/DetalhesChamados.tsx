'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/services/api';
import SocketManager from '@/services/socketManager';
import { useAuth } from '@/contexts/AuthContext';
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
    <div className="min-h-screen flex flex-col overflow-y-auto">
      {/* Cabeçalho com informações do chamado */}
      <div className="bg-[#f8fafc] border-b border-gray-200 pb-2 sm:pb-3 md:pb-4 mb-2 sm:mb-3 md:mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3 md:mb-4">
          <div className="flex-1 w-full">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 mb-1 sm:mb-2">
              {chamadoAtualizado.resumoChamado} <span className="text-gray-500 text-sm sm:text-base md:text-lg">#{chamadoAtualizado.numeroChamado || chamadoAtualizado.id}</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 md:mb-4 border-b border-gray-300 pb-1">Informações sobre o chamado</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              <div>
                <p className="text-sm sm:text-base font-semibold text-gray-700 mb-1">Status</p>
              <p
                className="text-sm sm:text-base font-bold"
                style={{
                  color:
                    chamadoAtualizado.status?.id === 1 ? '#f59e0b' : // amarelo
                    chamadoAtualizado.status?.id === 2 ? '#2563eb' : // azul
                    chamadoAtualizado.status?.id === 3 ? '#059669' : // verde
                    chamadoAtualizado.status?.id === 4 ? '#dc2626' : // vermelho
                    chamadoAtualizado.status?.id === 5 ? '#8b5cf6' : // roxor
                    '#000000'
                }}
              >                  {chamadoAtualizado.status?.nome}
                </p>
              </div>
              
              <div>
                <p className="text-sm sm:text-base font-semibold text-gray-700 mb-1">Departamento</p>
                <p className="text-sm sm:text-base font-bold text-blue-600">
                  {chamadoAtualizado.departamento?.name}
                </p>
              </div>
              
              <div>
                <p className="text-sm sm:text-base font-semibold text-gray-700 mb-1">Criado em</p>
                <p className="text-xs sm:text-sm md:text-base font-bold text-blue-600">
                  {formatarDataBrasilia(chamadoAtualizado.dataAbertura)}
                </p>
              </div>
                          
               <div>
                <p className="text-sm sm:text-base font-semibold text-gray-700 mb-1">Prioridade</p>

                <span
                  className="inline-block px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full border"
                  style={{
                    backgroundColor: `${chamadoAtualizado.tipoPrioridade?.cor}20`, 
                    color: chamadoAtualizado.tipoPrioridade?.cor,
                    borderColor: chamadoAtualizado.tipoPrioridade?.cor,
                  }}
                >
                  {chamadoAtualizado.tipoPrioridade?.nome}
                </span>
              </div>

              
              <div>
                <p className="text-sm sm:text-base font-semibold text-gray-700 mb-1">Tópico de ajuda</p>
                <p className="text-sm sm:text-base text-gray-900">
                  {chamadoAtualizado.topicoAjuda?.nome}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-row md:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={onVoltar}
              className="flex-1 md:flex-none px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm md:text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              Voltar
            </button>
            <button 
              onClick={() => setModalEditarAberto(true)}
              className="flex-1 md:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 rounded-md text-xs sm:text-sm md:text-base font-medium text-gray-700 hover:bg-gray-300"
            >
              Editar
            </button>

           {/*} <button className="px-4 py-2 bg-gray-200 rounded-md text-base font-medium text-gray-700 hover:bg-gray-300">
              imprimir
            </button> */}

          </div>
        </div>
        
        {/* Sem mais abas - tudo integrado */}
      </div>

      {/* Conteúdo - Chat integrado com histórico */}
     <div className="flex-1 overflow-hidden flex flex-col h-full">
        {loadingMensagens ? (
          <div className="text-center py-8 text-gray-600">Carregando mensagens...</div>
        ) : (
          <>
            {/* container de mensagens + histórico com scroll */}
            <div id="chat-messages-container" className="flex-[1_0_200px] overflow-y-auto px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 space-y-3 sm:space-y-4 bg-gray-50">
                  {/* 1° mensagem do usuário */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[65%] bg-blue-50 border-r-4 border-blue-500 rounded-lg p-2 sm:p-3 md:p-4 shadow-sm">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">

                        <span className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base">
                          {chamado.usuario?.name || 'Usuário'}
                        </span>
                        <span className="text-[10px] sm:text-xs md:text-sm text-gray-500">
                          {formatarDataBrasilia(chamado.dataAbertura)}
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-xs md:text-sm text-gray-700 font-medium">
                        Descrição:
                      </span>
                      <p className="text-gray-800 whitespace-pre-wrap text-xs sm:text-sm md:text-base">
                        {chamado.descricaoChamado}
                      </p>
                      
                      {/* Anexos da descrição inicial */}
                      {chamadoAtualizado.anexos && chamadoAtualizado.anexos.length > 0 && (
                        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-blue-200">
                          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1.5 sm:mb-2">Anexos:</p>
                          {(() => {
                            const images = chamadoAtualizado.anexos.filter((a: any) => /\.(jpg|jpeg|png|gif|webp)$/i.test(a.filename));
                            const files = chamadoAtualizado.anexos.filter((a: any) => !/\.(jpg|jpeg|png|gif|webp)$/i.test(a.filename));

                            return (
                              <>
                                {/* thumbnails de imagens para exibicao nas mensagens dos chamados */}
                                {images.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {images.map((anexo: any) => {
                                      const fileUrl = anexo.signedUrl || '#';
                                      return (
                                        <a
                                          key={anexo.id}
                                          href={fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="group relative overflow-hidden rounded-lg border  transition-all hover:shadow-lg hover:scale-105"
                                          style={{ width: '64px', height: '64px' }}
                                          title={anexo.filename}
                                        >
                                          <img
                                            src={fileUrl}
                                            alt={anexo.filename}
                                            className="w-full h-full object-cover"
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="none" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4m14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                          </div>
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Arquivos não-imagem */}
                                {files.length > 0 && (
                                  <div className="space-y-1">
                                    {files.map((anexo: any) => {
                                      const fileUrl = anexo.signedUrl || '#';
                                      return (
                                        <a
                                          key={anexo.id}
                                          href={fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-blue-300 rounded hover:bg-blue-100 transition text-xs sm:text-sm group"
                                        >
                                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <span className="text-blue-700 group-hover:text-blue-800 truncate flex-1">
                                            {anexo.filename}
                                          </span>
                                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 group-hover:text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mensagens + Eventos de Histórico Integrados */}
                  {(() => {
                    // mesclar mensagens e histórico cronologicamente
                    const itensIntegrados = [
                      ...mensagens.map(msg => ({ tipo: 'mensagem', data: msg.dataEnvio, conteudo: msg })),
                      ...historico.map(evt => ({ tipo: 'historico', data: evt.dataMov, conteudo: evt }))
                    ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

                    return itensIntegrados.map((item, idx) => {
                      if (item.tipo === 'mensagem') {
                        const msg = item.conteudo;
                        const isUsuarioLogado = msg.usuario?.id === user?.id;
                        const uniqueKey = msg.id ? `msg-${msg.id}` : `msg-temp-${idx}-${Date.now()}`;
                        
                        return (
                          <div
                            key={uniqueKey}
                            className={`flex ${isUsuarioLogado ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${
                                isUsuarioLogado 
                                  ? 'bg-blue-50 border-r-4 border-blue-500' 
                                  : 'bg-gray-100 border-l-4 border-gray-500'
                              } rounded-lg p-2 sm:p-3 md:p-4 shadow-sm`}
                            >
                              <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                                <span className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base">
                                  {msg.usuario?.name || 'Usuário Desconhecido'}
                                </span>
                                <span className="text-[10px] sm:text-xs text-gray-500">
                                  {formatarDataBrasilia(msg.dataEnvio)}
                                </span>
                              </div>
                              <p className="text-gray-800 whitespace-pre-wrap text-xs sm:text-sm">{msg.mensagem}</p>
                              
                              {/* Anexos da mensagem */}
                              {msg.anexos && msg.anexos.length > 0 && (
                                <div className="mt-2 sm:mt-3 space-y-2">
                                  {(() => {
                                    const images = msg.anexos.filter((a: any) => /\.(jpg|jpeg|png|gif|webp)$/i.test(a.filename));
                                    const files = msg.anexos.filter((a: any) => !/\.(jpg|jpeg|png|gif|webp)$/i.test(a.filename));

                                    return (
                                      <>
                                        {/* Thumbnails de imagens */}
                                        {images.length > 0 && (
                                          <div className="flex flex-wrap gap-2">
                                            {images.map((anexo: any) => {
                                              const fileUrl = anexo.signedUrl || '#';
                                              return (
                                                <a
                                                  key={anexo.id}
                                                  href={fileUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="group relative overflow-hidden rounded-lg  transition-all hover:shadow-lg hover:scale-105"
                                                  style={{ width: '100px', height: '70px' }}
                                                  title={anexo.filename}
                                                >
                                                  <img
                                                    src={fileUrl}
                                                    alt={anexo.filename}
                                                    className="w-full h-full object-cover"
                                                  />
                                                  
                                                </a>
                                              );
                                            })}
                                          </div>
                                        )}

                                  {/* Arquivos não-imagem */}
                                  {files.length > 0 && (
                                    <div className="space-y-2">
                                      {files.map((anexo: any) => {
                                        const fileUrl = anexo.signedUrl || "#";

                                        return (
                                          <a
                                            key={anexo.id}
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 transition-all hover:border-blue-300 hover:bg-blue-50 hover:scale-103"
                                          >
                                            <div className="flex min-w-0 items-center gap-3">
                                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                                <BsPaperclip className="h-4 w-4" />
                                              </div>

                                              <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-gray-800 group-hover:text-blue-700">
                                                  {anexo.filename}
                                                </p>
                                              </div>
                                            </div>

                                          </a>
                                        );
                                      })}
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
                        // renderizar evento de histórico centralizado
                        const evento = item.conteudo;
                   return (
                    <div key={`hist-${evento.id}`} className="flex justify-center py-2 sm:py-3">
                      <div className="relative w-full max-w-[96%] sm:max-w-[92%] md:max-w-[860px] overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 py-4 sm:px-5 shadow-sm">
                        <div className="absolute left-0 top-0 h-full w-1 bg-gray-300" />

                        <div className="pl-2">
                          <p className="font-segoe text-sm font-semibold text-gray-800 text-center">
                            {evento.acao}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs text-gray-500">
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                              {evento.usuario?.name || 'Sistema'}
                            </span>
                            <span>{formatarDataBrasilia(evento.dataMov).replace(',', ' às ')}</span>
                          </div>

                          {evento.observacao && (
                            <p className="mt-3 text-center text-xs sm:text-sm italic text-gray-500">
                              {evento.observacao}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                      }
                    });
                  })()}
                </div>

                {/* campo pra poder escrever resposta - fixo na parte inferior */}
               <div className="shrink-0 border-t border-gray-300 bg-[#f8fafc] p-2 sm:p-3 md:p-4 lg:p-6">
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base mb-1 sm:mb-2">Postar uma resposta</h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-2 sm:mb-3 md:mb-4">Para melhor ajudá-lo, seja específico e detalhado.</p>
                  
                  <textarea
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    rows={2}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border bg-white border-gray-300 rounded-md text-xs sm:text-sm md:text-base text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none mb-2 sm:mb-3"
                    placeholder="Digite sua resposta aqui..."
                    disabled={submittingResposta}
                  />

                  {/* Área de anexos */}
                  <div
                    onDragOver={handleDragOverResposta}
                    onDragLeave={handleDragLeaveResposta}
                    onDrop={handleDropResposta}
                    className={`border-2 border-dashed rounded-lg p-2 sm:p-3 md:p-4 text-center transition-colors mb-2 sm:mb-3 ${
                      isDraggingResposta
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-yellow-50'
                    }`}
                  >
                    <label
                      htmlFor="file-upload-resposta"
                      className="cursor-pointer flex items-center justify-center gap-1 sm:gap-2"
                    >
                      <svg className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="text-xs sm:text-sm md:text-base text-gray-700">
                        Arraste os arquivos ou <span className="text-blue-600 underline">selecione-os</span>
                      </span>
                    </label>
                    <input
                      id="file-upload-resposta"
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      onChange={handleFileChangeResposta}
                      className="hidden"
                      disabled={submittingResposta}
                    />
                  </div>

                  {/* Lista de arquivos anexados */}
                  {anexosResposta.length > 0 && (
                    <div className="mb-2 sm:mb-3 space-y-2">
                      {/* Thumbnails de imagens */}
                      {(() => {
                        const images = anexosResposta.filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name));
                        return images.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {images.map((file, index) => (
                              <div
                                key={index}
                                className="group relative overflow-hidden rounded-lg  transition-all hover:shadow-lg"
                                style={{ width: '82px', height: '72px' }}
                              >
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                            <button
                                onClick={() => removeFileResposta(anexosResposta.indexOf(file))}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-105"
                                title="Remover"
                              >
                                <HiTrash className="w-3 h-3 hover:scale-110" />
                              </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-0.5 truncate">
                                  {(file.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null;
                      })()}

                      {/* Arquivos não-imagem */}
                      {(() => {
                        const files = anexosResposta.filter((f) => !/\.(jpg|jpeg|png|gif|webp)$/i.test(f.name));
                        return files.length > 0 ? (
                          <div className="space-y-1">
                            {files.map((file, index) => {
                              const actualIndex = anexosResposta.indexOf(file);
                              return (
                              <div
                                  key={index}
                                  className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-blue-300 hover:bg-blue-50"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                      <BsPaperclip className="h-4 w-4" />
                                    </div>

                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-gray-800">
                                        {file.name}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {(file.size / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeFileResposta(actualIndex)}
                                    className="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                                  >
                                    Remover
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm md:text-base mb-2 sm:mb-3">
                      {errorMessage}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 justify-start">
                    <button
                      onClick={handlePublicarResposta}
                      disabled={submittingResposta || !novaMensagem.trim()}
                      className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm md:text-base font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingResposta ? 'Enviando...' : 'Enviar'}
                    </button>
                    <button
                      onClick={() => {
                        setNovaMensagem('');
                        setAnexosResposta([]);
                        setErrorMessage('');
                      }}
                      disabled={submittingResposta}
                      className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 border border-gray-300 rounded-md text-gray-700 text-xs sm:text-sm md:text-base font-medium hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      cancelar
                    </button>
                  </div>
                </div>
              </>
            )}
      </div>

      {/* Modal de Edição */}
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

      {/* modal confirmacao de reabertura */}
      <ModalConfirmarReabertura
        isOpen={modalConfirmarReaberturaAberto}
        onConfirm={enviarMensagem}
        onClose={() => setModalConfirmarReaberturaAberto(false)}
      />
    </div>
  );
}
