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

  useEffect(() => {
    buscarMensagens(chamado.id);
    buscarHistorico(chamado.id);
    setChamadoAtualizado(chamado);
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
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setLoadingMensagens(false);
    }
  };

  const buscarHistorico = async (chamadoId: number) => {
    try {
      const response = await api.get(`/chamados/${chamadoId}/historico`);
      setHistorico(response.data);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
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
    } catch (error) {
      console.error('Erro ao atualizar mensagens:', error);
      // nao mostra alert para nao interromper o usuario
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

      if (anexosResposta.length > 0) {
        const formData = new FormData();
        anexosResposta.forEach((file) => {
          formData.append('arquivos', file);
        });

        await api.post(`/chamado/${chamado.id}/anexo`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
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
    <div>
      {/* Cabeçalho com informações do chamado */}
      <div className="bg-[#f8fafc] border-b border-gray-200 pb-4 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-blue-600 mb-2">
              {chamadoAtualizado.resumoChamado} <span className="text-gray-500 text-lg">#{chamadoAtualizado.numeroChamado || chamadoAtualizado.id}</span>
            </h2>
            <p className="text-sm text-gray-600 mb-4 border-b border-gray-300">Informações sobre o chamado</p>
            
            <div className="grid grid-cols-5 gap-6">
              <div>
                <p className="text-base font-semibold text-gray-700 mb-1">Status</p>
                <p className="text-base font-bold" style={{ color: chamadoAtualizado.status?.id === 1 ? '#2563eb' : chamadoAtualizado.status?.id === 2 ? '#f59e0b' : '#059669' }}>
                  {chamadoAtualizado.status?.nome}
                </p>
              </div>
              
              <div>
                <p className="text-base font-semibold text-gray-700 mb-1">Departamento</p>
                <p className="text-base font-bold text-blue-600">
                  {chamadoAtualizado.departamento?.name}
                </p>
              </div>
              
              <div>
                <p className="text-base font-semibold text-gray-700 mb-1">Criado em</p>
                <p className="text-base font-bold text-blue-600">
                  {formatarDataBrasilia(chamadoAtualizado.dataAbertura)}
                </p>
              </div>
                          
               <div>
                <p className="text-base font-semibold text-gray-700 mb-1">Prioridade</p>

                <span
                  className="inline-block px-3 py-1 text-sm font-semibold rounded-full border"
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
                <p className="text-base font-semibold text-gray-700 mb-1">Tópico de ajuda</p>
                <p className="text-base text-gray-900">
                  {chamadoAtualizado.topicoAjuda?.nome}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onVoltar}
              className="px-4 py-2 border border-gray-300 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              Voltar
            </button>
            <button 
              onClick={() => setModalEditarAberto(true)}
              className="px-4 py-2 bg-gray-200 rounded-md text-base font-medium text-gray-700 hover:bg-gray-300"
            >
              Editar
            </button>
            <button className="px-4 py-2 bg-gray-200 rounded-md text-base font-medium text-gray-700 hover:bg-gray-300">
              imprimir
            </button>
          </div>
        </div>
        
        {/* Tabs Detalhes/Histórico */}
        <div className="flex gap-4 mt-6 border-b border-gray-300">
          <button
            onClick={() => setDetalheTab('detalhes')}
            className={`px-6 py-2 font-medium transition-all ${
              detalheTab === 'detalhes'
                ? 'border-b-2 border-gray-600 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setDetalheTab('historico')}
            className={`px-6 py-2 font-medium transition-all ${
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
      <div className="overflow-hidden h-[calc(100vh-240px)]">
        <div
          className="flex transition-transform duration-300 ease-in-out h-full"
          style={{ transform: detalheTab === 'detalhes' ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          {/* Tab Detalhes */}
          <div className="w-full shrink-0 flex flex-col h-full">
            {loadingMensagens ? (
              <div className="text-center py-8 text-gray-600">Carregando mensagens...</div>
            ) : (
              <>
                {/* container de mensagens com scroll */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
                  {/* 1° mensagem do usuário */}
                  <div className="flex justify-end">
                    <div className="max-w-[70%] bg-green-50 border-r-4 border-green-500 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          {chamado.usuario?.name || 'Usuário'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatarDataBrasilia(chamado.dataAbertura)}
                        </span>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap text-sm">
                        {chamado.descricaoChamado}
                      </p>
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
                          className={`max-w-[70%] ${
                            isUsuarioChamado 
                              ? 'bg-green-50 border-r-4 border-green-500' 
                              : 'bg-gray-100 border-l-4 border-gray-500'
                          } rounded-lg p-4 shadow-sm`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900 text-sm">
                              {msg.usuario?.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatarDataBrasilia(msg.dataEnvio)}
                            </span>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap text-sm">{msg.mensagem}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* campo pra poder escrever resposta - fixo na parte inferior */}
                <div className="border-t border-gray-300 bg-[#f8fafc] p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Postar uma resposta</h3>
                  <p className="text-base text-gray-600 mb-4">Para melhor ajudá-lo, seja específico e detalhado.</p>
                  
                  <textarea
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none mb-4"
                    placeholder="Digite sua resposta aqui..."
                    disabled={submittingResposta}
                  />

                  {/* Área de anexos */}
                  <div
                    onDragOver={handleDragOverResposta}
                    onDragLeave={handleDragLeaveResposta}
                    onDrop={handleDropResposta}
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors mb-4 ${
                      isDraggingResposta
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-yellow-50'
                    }`}
                  >
                    <label
                      htmlFor="file-upload-resposta"
                      className="cursor-pointer flex items-center justify-center gap-2"
                    >
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="text-base text-gray-700">
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
                    <div className="space-y-2 mb-4">
                      {anexosResposta.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-base text-gray-700">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024).toFixed(2)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFileResposta(index)}
                            className="text-red-500 hover:text-red-700"
                            disabled={submittingResposta}
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-base mb-4">
                      {errorMessage}
                    </div>
                  )}

                  <div className="flex gap-2 justify-start">
                    <button
                      onClick={handlePublicarResposta}
                      disabled={submittingResposta || !novaMensagem.trim()}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      cancelar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Tab Histórico */}
          <div className="w-full shrink-0 h-full overflow-y-auto px-6 py-4">
            <div className="bg-[#f8fafc] rounded-lg border border-gray-300 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-400">
                Histórico do Chamado
              </h3>
              {historico.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  Nenhum histórico disponível para este chamado.
                </div>
              ) : (
                <div className="space-y-4">
                  {historico.map((evento) => (
                    <div key={evento.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                      <div className="shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-2" />
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium">{evento.acao}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-600">{evento.usuario?.name || 'Sistema'}</span>
                          <span className="text-sm text-gray-500">• {formatarDataBrasilia(evento.dataMov)}</span>
                        </div>
                        {evento.observacao && (
                          <p className="text-sm text-gray-500 italic mt-2">
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
