'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';

interface DetalhesChamadosProps {
  chamado: any;
  onVoltar: () => void;
}

export default function DetalhesChamados({ chamado, onVoltar }: DetalhesChamadosProps) {
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [detalheTab, setDetalheTab] = useState<'detalhes' | 'historico'>('detalhes');
  const [novaMensagem, setNovaMensagem] = useState('');
  const [anexosResposta, setAnexosResposta] = useState<File[]>([]);
  const [isDraggingResposta, setIsDraggingResposta] = useState(false);
  const [submittingResposta, setSubmittingResposta] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    buscarMensagens(chamado.id);
  }, [chamado.id]);

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

  const handlePublicarResposta = async () => {
    if (!novaMensagem.trim()) {
      setErrorMessage('Por favor, escreva uma mensagem.');
      return;
    }

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
      await buscarMensagens(chamado.id);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.mensagem || 'Erro ao publicar resposta.');
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
    const date = new Date(data);
    
    if (data.includes('Z')) {
      date.setHours(date.getHours() + 3);
    }
    
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    const hora = String(date.getHours()).padStart(2, '0');
    const minuto = String(date.getMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  };

  return (
    <div>
      {/* Cabeçalho com informações do chamado */}
      <div className="bg-white border-b border-gray-200 pb-4 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-blue-600 mb-2">
              {chamado.resumoChamado} <span className="text-gray-500 text-lg">#{chamado.numeroChamado || chamado.id}</span>
            </h2>
            <p className="text-sm text-gray-600 mb-4">Informações sobre o ticket</p>
            
            <div className="grid grid-cols-5 gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Status</p>
                <p className="text-sm font-bold" style={{ color: chamado.status?.id === 1 ? '#2563eb' : '#059669' }}>
                  {chamado.status?.descricaoStatus || chamado.status?.nome}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Departamento</p>
                <p className="text-sm font-bold text-blue-600">
                  {chamado.departamento?.name}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Criado em</p>
                <p className="text-sm font-bold text-blue-600">
                  {formatarDataBrasilia(chamado.dataAbertura)}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Prioridade</p>
                <p className="text-sm font-bold" style={{ color: chamado.tipoPrioridade?.cor }}>
                  {chamado.tipoPrioridade?.nome}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Tópico de ajuda</p>
                <p className="text-sm text-gray-900">
                  {chamado.topicoAjuda?.nome}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onVoltar}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Voltar
            </button>
            <button className="px-4 py-2 bg-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-300">
              Editar
            </button>
            <button className="px-4 py-2 bg-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-300">
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
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: detalheTab === 'detalhes' ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          {/* Tab Detalhes */}
          <div className="w-full flex-shrink-0">
            {loadingMensagens ? (
              <div className="text-center py-8 text-gray-600">Carregando mensagens...</div>
            ) : (
              <>
                {/* Mensagens */}
                <div className="space-y-4 mb-6">
                  {/* Primeira mensagem */}
                  <div className="bg-green-100 border-l-4 border-green-500 p-4 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-gray-900">
                        {chamado.usuario?.name || 'Nome de perfil do usuario'}
                      </p>
                      <span className="text-sm text-gray-600">
                        {formatarDataBrasilia(chamado.dataAbertura)}
                      </span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {chamado.descricaoChamado}
                    </p>
                  </div>

                  {/* Mensagens subsequentes */}
                  {mensagens.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${
                        msg.usuario?.roleId === 1
                          ? 'bg-gray-200 border-l-4 border-gray-500'
                          : 'bg-green-100 border-l-4 border-green-500'
                      } p-4 rounded-md`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-gray-900">
                          {msg.usuario?.roleId === 1 ? 'nome de perfil do administrador' : msg.usuario?.name}
                        </p>
                        <span className="text-sm text-gray-600">
                          {formatarDataBrasilia(msg.dataEnvio)}
                        </span>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap">{msg.mensagem}</p>
                    </div>
                  ))}
                </div>

                {/* Campo para postar resposta */}
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-2">Postar uma resposta</h3>
                  <p className="text-sm text-gray-600 mb-4">Para melhor ajudá-lo, seja específico e detalhado.</p>
                  
                  <textarea
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y mb-4"
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
                      <span className="text-sm text-gray-700">
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
                            <span className="text-sm text-gray-700">{file.name}</span>
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
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm mb-4">
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
          <div className="w-full flex-shrink-0 pl-4">
            <div className="text-center py-8 text-gray-600">
              Histórico do chamado será implementado aqui
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
