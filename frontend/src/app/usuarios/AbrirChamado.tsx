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
        
        const prioridadePadrao = prioridadesRes.data.find((p: TipoPrioridade) => p.ordem === 3);
        if (prioridadePadrao) {
          setPrioridadeId(prioridadePadrao.id);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    fetchData();
  }, []);

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

    if (!topicoAjudaId || !departamentoId || !prioridadeId) {
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
      const prioridadePadrao = prioridades.find((p) => p.ordem === 3);
      setPrioridadeId(prioridadePadrao?.id || 0);
      setTopicoAjudaId(0);
      setDepartamentoId(0);
      setResumoChamado('');
      setDescricaoChamado('');
      setSelectedFiles([]);
      
      alert('Chamado aberto com sucesso!');
      onSuccess();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.mensagem || 'Erro ao abrir chamado. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelar = () => {
    if (confirm('Deseja cancelar? Os dados preenchidos serão perdidos.')) {
      setRamal('');
      setPrioridadeId(3);
      setTopicoAjudaId(0);
      setDepartamentoId(0);
      setResumoChamado('');
      setDescricaoChamado('');
      setErrorMessage('');
      onCancel();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-8">
      <h2 className="text-3xl font-semibold text-blue-500 mb-2">Abrindo um novo Ticket</h2>
      <p className="text-gray-600 mb-4">Preencha os dados abaixo</p>

      <form onSubmit={handleSubmitChamado} className="space-y-6">
        {/* Linha 1: Email, Ramal, Tópico de Ajuda */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={userEmail}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
            />
          </div>

          <div>
            <label htmlFor="ramal" className="block text-sm font-medium text-gray-900 mb-2">
              Núm. Ramal
            </label>
            <input
              id="ramal"
              type="text"
              value={ramal}
              onChange={(e) => setRamal(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ramal"
            />
          </div>

          <div>
            <label htmlFor="topico" className="block text-sm font-medium text-gray-900 mb-2">
              Tópico de ajuda
            </label>
            <select
              id="topico"
              value={topicoAjudaId}
              onChange={(e) => setTopicoAjudaId(Number(e.target.value))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-[#DFDFDF] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Linha 2: Nível de Prioridade e Departamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Nível de prioridade
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
                      : 'bg-[#DFDFDF] text-gray-700'
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

          <div>
            <label htmlFor="departamento" className="block text-sm font-medium text-gray-900 mb-2">
              Departamento
            </label>
            <select
              id="departamento"
              value={departamentoId}
              onChange={(e) => setDepartamentoId(Number(e.target.value))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-[#DFDFDF] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 h-12"
            >
              <option value={0}>Selecione...</option>
              {departamentos.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.id} - {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assunto */}
        <div>
          <label htmlFor="assunto" className="block text-sm font-medium text-gray-900 mb-2">
            Assunto
          </label>
          <input
            id="assunto"
            type="text"
            value={resumoChamado}
            onChange={(e) => setResumoChamado(e.target.value)}
            required
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Resumo sobre o que você quer falar"
          />
        </div>

        {/* Descrição */}
        <div>
          <label htmlFor="descricao" className="block text-sm font-medium text-gray-900 mb-1">
            Descrição
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Por favor descreva seu problema com o maior número de informações possíveis
          </p>
          <textarea
            id="descricao"
            value={descricaoChamado}
            onChange={(e) => setDescricaoChamado(e.target.value)}
            required
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Descreva seu problema com o maior numeros de detalhes..."
          />
        </div>

        {/* Anexos */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Anexos (Opcional)
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
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
            <div className="mt-3 space-y-2">
              {selectedFiles.map((file, index) => (
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
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
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

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {errorMessage}
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-4 justify-end pt-4 pb-8">
          <button
            type="button"
            onClick={handleCancelar}
            disabled={submitting}
            className="px-12 py-4 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition disabled:opacity-50"
          >
            {submitting ? 'Abrindo chamado...' : 'Abrir chamado'}
          </button>
        </div>
      </form>
    </div>
  );
}
