'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';

interface TopicosAjuda {
  id: number;
  nome: string;
  ativo: boolean;
}

interface Departamento {
  id: number;
  name: string;
  ativo: boolean;
}

interface TipoPrioridade {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
}

interface AbrirChamadoProps {
  userEmail: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AbrirChamado({ userEmail, onSuccess, onCancel }: AbrirChamadoProps) {
  const [ramal, setRamal] = useState('');
  const [prioridadeId, setPrioridadeId] = useState<number>(0);
  const [topicoAjudaId, setTopicoAjudaId] = useState<number>(0);
  const [departamentoId, setDepartamentoId] = useState<number>(0);
  const [resumoChamado, setResumoChamado] = useState('');
  const [descricaoChamado, setDescricaoChamado] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [topicos, setTopicos] = useState<TopicosAjuda[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [prioridades, setPrioridades] = useState<TipoPrioridade[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // controle de etapas
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [mostrarDescricao, setMostrarDescricao] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topicosRes, departamentosRes, prioridadesRes] = await Promise.all([
          api.get('/topicos_ajuda'),
          api.get('/departamentos'),
          api.get('/tipo_prioridade'),
        ]);
        setTopicos(topicosRes.data.filter((t: TopicosAjuda) => t.ativo));
        setDepartamentos(departamentosRes.data.filter((d: Departamento) => d.ativo));
        setPrioridades(prioridadesRes.data);
        
        const prioridadePadrao = prioridadesRes.data.find((p: TipoPrioridade) => p.ordem === 4);
        if (prioridadePadrao) {
          setPrioridadeId(prioridadePadrao.id);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    fetchData();
  }, []);

  //mostrar o campo de detalhes quando o usuario digitar 3 ou + caracteres
  useEffect(() => {
    if (resumoChamado.length >= 3) {
      setMostrarDescricao(true);
    } else {
      setMostrarDescricao(false);
    }
  }, [resumoChamado]);

  const handleProximo = () => {
    setErrorMessage('');
    
    if (!resumoChamado.trim()) {
      setErrorMessage('Por favor, preencha o assunto do chamado.');
      return;
    }
    
    if (!topicoAjudaId) {
      setErrorMessage('Por favor, selecione um tópico de ajuda.');
      return;
    }
    
    if (!descricaoChamado.trim()) {
      setErrorMessage('Por favor, descreva seu problema com mais detalhes.');
      return;
    }
    
    setSlideDirection('right');
    setTimeout(() => setEtapaAtual(2), 50);
  };

  const handleVoltar = () => {
    setErrorMessage('');
    setSlideDirection('left');
    setTimeout(() => setEtapaAtual(1), 50);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length > 5) {
        setErrorMessage('Máximo de 5 arquivos permitidos.');
        return;
      }
      setSelectedFiles(filesArray);
      setErrorMessage('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      if (filesArray.length > 5) {
        setErrorMessage('Máximo de 5 arquivos permitidos.');
        return;
      }
      setSelectedFiles(filesArray);
      setErrorMessage('');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitChamado = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!departamentoId || !prioridadeId || !ramal.trim()) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);

    try {
      const chamadoResponse = await api.post('/chamados', {
        ramal,
        prioridadeId,
        topicoAjudaId,
        departamentoId,
        resumoChamado,
        descricaoChamado,
      });

      const chamadoId = chamadoResponse.data.chamado?.id;

      if (selectedFiles.length > 0 && chamadoId) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('arquivos', file);
        });

        await api.post(`/chamado/${chamadoId}/anexo`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setRamal('');
      const prioridadePadrao = prioridades.find((p) => p.ordem === 4);
      setPrioridadeId(prioridadePadrao?.id || 0);
      setTopicoAjudaId(0);
      setDepartamentoId(0);
      setResumoChamado('');
      setDescricaoChamado('');
      setSelectedFiles([]);
      setEtapaAtual(1);
      setMostrarDescricao(false);
      
      // mostrar tela de sucesso
      setSlideDirection('right');
      setTimeout(() => {
        setEtapaAtual(3);
      }, 50);
      
      // redirecionar apos 3 segundos
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.mensagem || 'Erro ao abrir chamado. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelar = () => {
    if (confirm('Deseja cancelar? Os dados preenchidos serão perdidos.')) {
      setRamal('');
      const prioridadePadrao = prioridades.find((p) => p.ordem === 4);
      setPrioridadeId(prioridadePadrao?.id || 0);
      setTopicoAjudaId(0);
      setDepartamentoId(0);
      setResumoChamado('');
      setDescricaoChamado('');
      setSelectedFiles([]);
      setErrorMessage('');
      setEtapaAtual(1);
      setMostrarDescricao(false);
      onCancel();
    }
  };


  return (
    <div className="max-w-5xl mx-auto px-10 py-8">

      {etapaAtual !== 3 && (
        <h2 className="text-3xl font-semibold text-blue-500 mb-8 animate-fade-in">
          Abrindo um novo Chamado
        </h2>
      )}

    <form onSubmit={handleSubmitChamado} className="relative overflow-hidden min-h-150 px-1">
      {/* Etapa 1: Descrição do Problema */}
      <div
        className={`transition-all duration-700 ease-in-out w-full ${
          etapaAtual === 1
            ? 'translate-x-0 opacity-100 relative'
            : slideDirection === 'right'
            ? '-translate-x-full opacity-0 absolute top-0 left-0'
            : 'translate-x-full opacity-0 absolute top-0 left-0'
        }`}
      >
        <div className="space-y-6 animate-fade-in">
          {/* Linha 1: Assunto e Tópico de Ajuda */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <label htmlFor="assunto" className="block text-base font-medium text-gray-800 mb-3">
                Assunto <span className="text-red-500">*</span>
              </label>
              <input
                id="assunto"
                type="text"
                value={resumoChamado}
                onChange={(e) => setResumoChamado(e.target.value)}
                required
                maxLength={200}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                placeholder="Resume seu problema em poucas palavras"
              />
            </div>

            <div>
              <label htmlFor="topico" className="block text-base font-medium text-gray-800 mb-3">
                Tópico de ajuda <span className="text-red-500">*</span>
              </label>
              <select
                id="topico"
                value={topicoAjudaId}
                onChange={(e) => setTopicoAjudaId(Number(e.target.value))}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              >
                <option value={0}>Selecione...</option>
                {topicos.map((topico) => (
                  <option key={topico.id} value={topico.id}>
                    {topico.id} - {topico.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>


          {mostrarDescricao && (
            <div className="animate-slide-up-fade-in origin-top">
              <div className="space-y-6 pt-2">
                <div>
                  <label htmlFor="descricao" className="block text-base font-medium text-gray-800 mb-3">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="descricao"
                    value={descricaoChamado}
                    onChange={(e) => setDescricaoChamado(e.target.value)}
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-y transition-all shadow-sm"
                    placeholder="Descreva seu problema com o maior número de detalhes..."
                  />
                </div>

                {/* anexos */}
                <div>
                  <label className="block text-base font-medium text-gray-800 mb-3">
                    Anexos (Opcional)
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <svg className="h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Clique para selecionar ou arraste arquivos aqui
                      </p>
                      <p className="text-xs text-gray-500">Máximo de 5 arquivos (10MB cada)</p>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={submitting}
                    />
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg animate-fadeIn"
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
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* bt proximo */}
                <div className="flex justify-end pt-6">
                  <button
                    type="button"
                    onClick={handleProximo}
                    className="px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* etapa dois */}
        <div
          className={`transition-all duration-500 ease-in-out w-full ${
            etapaAtual === 2
              ? 'translate-x-0 opacity-100 relative'
              : slideDirection === 'left'
              ? '-translate-x-full opacity-0 absolute top-0 left-0'
              : 'translate-x-full opacity-0 absolute top-0 left-0'
          }`}
        >
          <div className="space-y-6">
            <p className="text-gray-600 mb-6">Agora confirme alguns dados</p>

 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="departamento" className="block text-base font-medium text-gray-800 mb-3">
                  Departamento <span className="text-red-500">*</span>
                </label>
                <select
                  id="departamento"
                  value={departamentoId}
                  onChange={(e) => setDepartamentoId(Number(e.target.value))}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-shadow"
                >
                  <option value={0}>Selecione...</option>
                  {departamentos.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.id} - {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-800 mb-3">
                  Nível de prioridade <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 h-12 rounded-lg overflow-hidden border border-gray-300">
                  {prioridades.map((prioridade) => (
                    <button
                      key={prioridade.id}
                      type="button"
                      onClick={() => setPrioridadeId(prioridade.id)}
                      className={`flex items-center justify-center text-sm font-medium transition-all ${
                        prioridadeId === prioridade.id
                          ? 'text-gray-900'
                          : 'bg-[#DFDFDF] text-gray-700 hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: prioridadeId === prioridade.id ? prioridade.cor : undefined,
                      }}
                    >
                      {prioridade.nome}
                    </button>
                  ))}
                </div>
              </div>
            </div>

              <div>
            <label htmlFor="ramal" className="block text-base font-medium text-gray-800 mb-3">
              Número do Ramal <span className="text-red-500">*</span>
            </label>

            <div className="relative max-w-xs">
              <img
                src="/icons/iconphone.svg"
                
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60 pointer-events-none"
              />

              <input
                id="ramal"
                type="text"
                value={ramal}
                onChange={(e) => setRamal(e.target.value)}
                required
                placeholder="Digite o ramal"
                className="w-full pl-5 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 
                          focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent 
                          transition-shadow shadow-sm"
              />
            </div>
          </div>

 
            <div className="flex gap-4 justify-between pt-8">
              <button
                type="button"
                onClick={handleVoltar}
                disabled={submitting}
                className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 shadow-sm"
              >
                Voltar
              </button>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleCancelar}
                  disabled={submitting}
                  className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  {submitting ? 'Abrindo chamado...' : 'Abrir chamado'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* msg de erro */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mt-6 animate-fade-in">
            {errorMessage}
          </div>
        )}

        {/* etapa 3 mensagem de sucesso */}
        <div
          className={`w-full ${
            etapaAtual === 3
              ? 'relative'
              : 'hidden'
          }`}
        >
          <div className="flex items-center justify-center min-h-96 py-12 animate-fade-in">
            <div className="text-center">
          
              <div className="relative inline-block mb-6">
  
                <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
                  <svg className="w-16 h-16 text-white animate-check-draw" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <div className="absolute inset-0 animate-shine-lines">
                  <div className="absolute top-0 left-1/2 w-1 h-6 bg-green-500 -translate-x-1/2 -translate-y-8"></div>
                  <div className="absolute bottom-0 left-1/2 w-1 h-6 bg-green-500 -translate-x-1/2 translate-y-8"></div>
                  <div className="absolute left-0 top-1/2 w-6 h-1 bg-green-500 -translate-x-8 -translate-y-1/2"></div>
                  <div className="absolute right-0 top-1/2 w-6 h-1 bg-green-500 translate-x-8 -translate-y-1/2"></div>
                  <div className="absolute top-3 left-3 w-4 h-1 bg-green-500 -translate-x-8 -translate-y-8 rotate-45"></div>
                  <div className="absolute top-3 right-3 w-4 h-1 bg-green-500 translate-x-8 -translate-y-8 -rotate-45"></div>
                  <div className="absolute bottom-3 left-3 w-4 h-1 bg-green-500 -translate-x-8 translate-y-8 -rotate-45"></div>
                  <div className="absolute bottom-3 right-3 w-4 h-1 bg-green-500 translate-x-8 translate-y-8 rotate-45"></div>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-green-600 mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                Chamado aberto com sucesso!
              </h2>
              <p className="text-lg text-gray-600 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                Verifique as informações na aba "Acompanhar Chamado"
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
