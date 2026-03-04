'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import ModalEditarChamadoUsuario from './ModalEditarChamadoUsuario';
import ModalConfirmarReabertura from './ModalConfirmarReabertura';

interface DetalhesChamadosProps {
  chamado: any;
  onVoltar: () => void;
}

export default function DetalhesChamados({ chamado, onVoltar }: DetalhesChamadosProps) {
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [detalheTab, setDetalheTab] = useState<'detalhes' | 'historico'>('detalhes');
  const [novaMensagem, setNovaMensagem] = useState('');
  const [anexosResposta, setAnexosResposta] = useState<File[]>([]);
  const [isDraggingResposta, setIsDraggingResposta] = useState(false);
  const [submittingResposta, setSubmittingResposta] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [chamadoAtualizado, setChamadoAtualizado] = useState(chamado);
  const [modalConfirmarReaberturaAberto, setModalConfirmarReaberturaAberto] = useState(false);
  const [anexosCarregados, setAnexosCarregados] = useState(false);

  useEffect(() => {
    buscarMensagens(chamado.id);
    buscarHistorico(chamado.id);
    setChamadoAtualizado(chamado);
    carregarAnexosDescricao(chamado.id);
  }, [chamado.id]);

  // auto-atualização do chat a cada 5 segundos
  useEffect(() => {
    // Só atualiza se estiver na aba de detalhes e não estiver enviando resposta
    if (detalheTab !== 'detalhes' || submittingResposta) return;

    const intervalo = setInterval(() => {
      carregarMensagensEHistorico();
    }, 5000); // 5 segundos

    // limpa o intervalo quando o componente é desmontado ou quando muda de aba
    return () => clearInterval(intervalo);
  }, [chamado.id, detalheTab, submittingResposta]);
  const buscarMensagens = async (chamadoId: number) => {
    setLoadingMensagens(true);
    try {
      const response = await api.get(`/chamados/${chamadoId}/mensagens`);
      setMensagens(response.data);
    } catch (error) {
    
    } finally {
      setLoadingMensagens(false);
    }
  };

  const buscarHistorico = async (chamadoId: number) => {
    try {
      const response = await api.get(`/chamados/${chamadoId}/historico`);
      setHistorico(response.data);
    } catch (error) {
      
    }
  };

 const carregarMensagensEHistorico = async () => {
    try {
      const [mensagensRes, historicoRes, chamadoRes] = await Promise.all([
        api.get(`/chamados/${chamado.id}/mensagens`),
        api.get(`/chamados/${chamado.id}/historico`),
        api.get(`/chamados/${chamado.id}`),
      ]);

      setMensagens(mensagensRes.data);
      setHistorico(historicoRes.data);
      setChamadoAtualizado(chamadoRes.data);
      
      // Anexos iniciais só carregam uma vez
    } catch (error) {
   
      // nao mostra alert para nao interromper o usuario
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

      
      const response = await api.post(`/chamados/${chamado.id}/mensagens`, {
        mensagem: novaMensagem,
      });

   
      const mensagemId = response.data.mensagem?.id || response.data.id;
  

      if (anexosResposta.length > 0 && mensagemId) {
      
        
        const formData = new FormData();
        anexosResposta.forEach((file, index) => {
          formData.append('arquivos', file);
          
        });

        try {
          const responseAnexos = await api.post(`/mensagem/${mensagemId}/anexo`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
         
        } catch (anexoError: any) {
        
          setErrorMessage('Mensagem enviada, mas houve erro no envio dos anexos. Tente novamente.');
        }
      } else if (anexosResposta.length > 0 && !mensagemId) {
        setErrorMessage('Mensagem enviada, mas não foi possível processar os anexos.');
      }

      setNovaMensagem('');
      setAnexosResposta([]);
      await carregarMensagensEHistorico();
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
        
        {/* Tabs Detalhes/Histórico */}
        <div className="flex gap-2 sm:gap-4 mt-2 sm:mt-4 md:mt-6 border-b border-gray-300">
          <button
            onClick={() => setDetalheTab('detalhes')}
            className={`px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-sm sm:text-base font-medium transition-all ${
              detalheTab === 'detalhes'
                ? 'border-b-2 border-gray-600 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setDetalheTab('historico')}
            className={`px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-sm sm:text-base font-medium transition-all ${
              detalheTab === 'historico'
                ? 'border-b-2 border-gray-600 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* Conteúdo das tabs */}
     <div className="flex-1 overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out h-full"
          style={{ transform: detalheTab === 'detalhes' ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          {/* Tab Detalhes */}
         <div className="w-full shrink-0 flex flex-col h-full min-h-[500px] sm:min-h-[600px]">
            {loadingMensagens ? (
              <div className="text-center py-8 text-gray-600">Carregando mensagens...</div>
            ) : (
              <>
                {/* container de mensagens com scroll */}
             <div className="flex-[1_0_200px] overflow-y-auto px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 space-y-3 sm:space-y-4 bg-gray-50">
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
                          <div className="space-y-1.5 sm:space-y-2">
                            {chamadoAtualizado.anexos.map((anexo: any) => {
                              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo.filename);
                              const fileUrl = anexo.signedUrl || '#';
                              
                              return (
                                <a
                                  key={anexo.id}
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-blue-300 rounded hover:bg-blue-100 transition text-xs sm:text-sm group"
                                >
                                  {isImage ? (
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
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
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mensagens subsequentes */}
                  {mensagens.map((msg) => {
                    const isUsuarioChamado = msg.usuario?.id === chamado.usuario?.id;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isUsuarioChamado ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${
                            isUsuarioChamado 
                              ? 'bg-green-50 border-r-4 border-green-500' 
                              : 'bg-gray-100 border-l-4 border-gray-500'
                          } rounded-lg p-2 sm:p-3 md:p-4 shadow-sm`}
                        >
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <span className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base">
                              {msg.usuario?.name}
                            </span>
                            <span className="text-[10px] sm:text-xs text-gray-500">
                              {formatarDataBrasilia(msg.dataEnvio)}
                            </span>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap text-xs sm:text-sm">{msg.mensagem}</p>
                          
                          {/* Anexos da mensagem */}
                          {msg.anexos && msg.anexos.length > 0 && (
                            <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
                              <p className="text-xs sm:text-sm font-medium text-gray-600">Anexos:</p>
                              {msg.anexos.map((anexo: any) => {
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo.filename);
                                const fileUrl = anexo.signedUrl || '#';
                                
                                return (
                                  <a
                                    key={anexo.id}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:border-gray-400 transition text-xs sm:text-sm group"
                                  >
                                    {isImage ? (
                                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    )}
                                    <span className="text-gray-700 group-hover:text-blue-700 truncate flex-1">
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
                        </div>
                      </div>
                    );
                  })}
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
                    <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
                      {anexosResposta.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-1.5 sm:p-2 bg-gray-50 border border-gray-200 rounded-md"
                        >
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                            <svg className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-xs sm:text-sm text-gray-700 truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFileResposta(index)}
                            className="text-red-500 hover:text-red-700 shrink-0 ml-2"
                            disabled={submittingResposta}
                          >
                            <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
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
                      {submittingResposta ? 'Publicando...' : 'Publicar resposta'}
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

          {/* Tab Histórico */}
          <div className="w-full shrink-0 h-full overflow-y-auto px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4">
            <div className="bg-[#f8fafc] rounded-lg border border-gray-300 p-3 sm:p-4 md:p-6">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-gray-400">
                Histórico do Chamado
              </h3>
              {historico.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  Nenhum histórico disponível para este chamado.
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {historico.map((evento) => (
                    <div key={evento.id} className="flex gap-2 sm:gap-3 md:gap-4 pb-3 sm:pb-4 border-b border-gray-200 last:border-0">
                      <div className="shrink-0 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-600 mt-1.5 sm:mt-2" />
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium text-xs sm:text-sm md:text-base">{evento.acao}</p>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                          <span className="text-xs sm:text-sm text-gray-600">{evento.usuario?.name || 'Sistema'}</span>
                          <span className="text-xs sm:text-sm text-gray-500">• {formatarDataBrasilia(evento.dataMov)}</span>
                        </div>
                        {evento.observacao && (
                          <p className="text-xs sm:text-sm text-gray-500 italic mt-1.5 sm:mt-2">
                            Observação: {evento.observacao}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
