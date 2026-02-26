'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';

interface Anexo {
  id: number;
  filename: string;
  url: string;
  signedUrl?: string | null;
}

interface Departamento {
  id: number;
  name: string;
}

interface TopicoAjuda {
  id: number;
  nome: string;
  ativo: boolean;
}

interface TipoPrioridade {
  id: number;
  nome: string;
  cor: string;
}

interface ModalEditarChamadoUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chamadoId: number;
  dadosIniciais: {
    resumoChamado: string;
    descricaoChamado: string;
    ramal: number;
    departamentoId: number;
    topicoAjudaId: number;
    prioridadeId: number;
    statusId: number;
    anexos?: Anexo[];
  };
}

export default function ModalEditarChamadoUsuario({
  isOpen,
  onClose,
  onSuccess,
  chamadoId,
  dadosIniciais,
}: ModalEditarChamadoUsuarioProps) {
  const [resumoChamado, setResumoChamado] = useState('');
  const [descricaoChamado, setDescricaoChamado] = useState('');
  const [ramal, setRamal] = useState('');
  const [departamentoId, setDepartamentoId] = useState(0);
  const [topicoAjudaId, setTopicoAjudaId] = useState(0);
  const [prioridadeId, setPrioridadeId] = useState(0);
  const [anexosExistentes, setAnexosExistentes] = useState<Anexo[]>([]);
  const [novosAnexos, setNovosAnexos] = useState<File[]>([]);
  
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [topicosAjuda, setTopicosAjuda] = useState<TopicoAjuda[]>([]);
  const [prioridades, setPrioridades] = useState<TipoPrioridade[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Ref para controlar se já carregou os dados iniciais
  const dadosCarregados = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Só carrega os dados iniciais se o modal acabou de abrir
      if (!dadosCarregados.current) {
        carregarDados();
        setResumoChamado(dadosIniciais.resumoChamado);
        setDescricaoChamado(dadosIniciais.descricaoChamado);
        setRamal(String(dadosIniciais.ramal));
        setDepartamentoId(dadosIniciais.departamentoId);
        setTopicoAjudaId(dadosIniciais.topicoAjudaId);
        setPrioridadeId(dadosIniciais.prioridadeId);
        setAnexosExistentes(dadosIniciais.anexos || []);
        dadosCarregados.current = true;
      }
    } else {
      // Reset quando o modal fecha
      dadosCarregados.current = false;
    }
  }, [isOpen]);

  const carregarDados = async () => {
    try {
      const [depRes, topRes, prioRes] = await Promise.all([
        api.get('/departamentos'),
        api.get('/topicos_ajuda'),
        api.get('/tipo_prioridade'),
      ]);
      setDepartamentos(depRes.data);
      setTopicosAjuda(topRes.data.filter((t: any) => t.ativo === true));
      setPrioridades(prioRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleRemoverAnexoExistente = async (anexoId: number) => {
    if (!confirm('Deseja remover este anexo? Esta ação não pode ser desfeita.')) return;

    try {
      // Remover imediatamente do estado local para feedback instantâneo
      setAnexosExistentes(prev => prev.filter(a => a.id !== anexoId));
      
      // Fazer a requisição ao backend
      await api.delete(`/chamados/${chamadoId}/anexo/${anexoId}`);
      
      alert('Anexo removido com sucesso!');
    } catch (error: any) {
      console.error('Erro ao remover anexo:', error);
      const mensagem = error.response?.data?.mensagem || 'Erro ao remover anexo';
      alert(mensagem);
      
      // Em caso de erro, recarregar os anexos do estado inicial
      setAnexosExistentes(dadosIniciais.anexos || []);
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
      if (novosAnexos.length + filesArray.length > 5) {
        alert('Máximo de 5 novos arquivos permitidos.');
        return;
      }
      setNovosAnexos(prev => [...prev, ...filesArray].slice(0, 5));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (novosAnexos.length + filesArray.length > 5) {
        alert('Máximo de 5 novos arquivos permitidos.');
        return;
      }
      setNovosAnexos(prev => [...prev, ...filesArray].slice(0, 5));
    }
  };

  const removeNovoAnexo = (index: number) => {
    setNovosAnexos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!resumoChamado.trim()) {
      alert('O assunto é obrigatório');
      return;
    }

    if (!descricaoChamado.trim()) {
      alert('A descrição do problema é obrigatória');
      return;
    }

    if (!ramal || isNaN(Number(ramal))) {
      alert('O ramal é obrigatório e deve ser um número');
      return;
    }

    if (!departamentoId || departamentoId === 0) {
      alert('Selecione um departamento');
      return;
    }

    if (!topicoAjudaId || topicoAjudaId === 0) {
      alert('Selecione um tópico de ajuda');
      return;
    }

    if (!prioridadeId || prioridadeId === 0) {
      alert('Selecione uma prioridade');
      return;
    }

    // Verificar se pode editar
    if (dadosIniciais.statusId !== 1) {
      alert('Você não pode editar este chamado agora pois um usuário já está te ajudando com a resolução');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Atualizar campos do chamado
      await api.put(`/chamados/${chamadoId}/editar`, {
        resumoChamado,
        descricaoChamado,
        ramal: Number(ramal),
        departamentoId,
        topicoAjudaId,
        prioridadeId,
      });

      // 2. Se houver novos anexos, fazer upload
      if (novosAnexos.length > 0) {
        const formData = new FormData();
        novosAnexos.forEach(file => {
          formData.append('arquivos', file);
        });

        await api.post(`/chamado/${chamadoId}/anexo`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      alert('Chamado editado com sucesso!');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Erro ao editar chamado:', error);
      console.error('Detalhes do erro:', error.response?.data);
      const mensagem = error.response?.data?.mensagem || error.message || 'Erro ao editar chamado';
      alert(`Erro: ${mensagem}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setResumoChamado('');
    setDescricaoChamado('');
    setRamal('');
    setAnexosExistentes([]);
    setNovosAnexos([]);
    onClose();
  };

  if (!isOpen) return null;

  // Verificar se pode editar
  const podeEditar = dadosIniciais.statusId === 1;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 overflow-y-auto py-8"
      onClick={handleClose}
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 rounded-t-2xl">
          <h3 className="text-xl font-bold text-white">
            Editando o chamado
          </h3>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {!podeEditar ? (
          <div className="p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <svg className="w-12 h-12 text-yellow-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-yellow-800 font-medium">
                Você não pode editar este chamado agora pois um usuário já está te ajudando com a resolução
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Assunto e Ramal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assunto
                </label>
                <input
                  type="text"
                  value={resumoChamado}
                  onChange={(e) => setResumoChamado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ramal
                </label>
                <input
                  type="number"
                  value={ramal}
                  onChange={(e) => setRamal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descricao do problema
              </label>
              <textarea
                value={descricaoChamado}
                onChange={(e) => setDescricaoChamado(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 resize-none"
                disabled={submitting}
              />
            </div>

            {/* Departamento e Tópico */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={departamentoId}
                  onChange={(e) => setDepartamentoId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  disabled={submitting}
                >
                  <option value={0}>Selecione</option>
                  {departamentos.map(dep => (
                    <option key={dep.id} value={dep.id}>{dep.id} - {dep.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  topico de ajuda
                </label>
                <select
                  value={topicoAjudaId}
                  onChange={(e) => setTopicoAjudaId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  disabled={submitting}
                >
                  <option value={0}>Selecione</option>
                  {topicosAjuda.map(top => (
                    <option key={top.id} value={top.id}>{top.id} - {top.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nível de Prioridade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nível de prioridade
              </label>
              <div className="flex gap-2">
                {prioridades.map(prioridade => (
                  <button
                    key={prioridade.id}
                    onClick={() => setPrioridadeId(prioridade.id)}
                    disabled={submitting}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                      prioridadeId === prioridade.id
                        ? 'shadow-lg scale-105 border-2'
                        : 'border-2 border-gray-300 hover:border-gray-400 hover:scale-102'
                    }`}
                    style={{
                      backgroundColor: prioridadeId === prioridade.id ? prioridade.cor : 'transparent',
                      color: prioridadeId === prioridade.id ? '#fff' : '#6b7280',
                      borderColor: prioridadeId === prioridade.id ? prioridade.cor : undefined,
                    }}
                  >
                    {prioridade.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Anexos Existentes */}
            {anexosExistentes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anexos atuais
                </label>
                <div className="space-y-2">
                  {anexosExistentes.map(anexo => (
                    <div
                      key={anexo.id}
                      className="flex items-center justify-between bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-sm text-gray-700 truncate">{anexo.filename}</span>
                      </div>
                      <button
                        onClick={() => handleRemoverAnexoExistente(anexo.id)}
                        disabled={submitting}
                        className="ml-2 text-red-500 hover:text-red-700 font-bold text-lg disabled:opacity-50"
                        title="Remover anexo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Novos Anexos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {anexosExistentes.length > 0 ? 'Adicionar novos anexos' : '1 Anexo'}
              </label>
              
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload-edit"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={submitting}
                />
                <label
                  htmlFor="file-upload-edit"
                  className="cursor-pointer text-sm text-gray-600"
                >
                  Arraste os arquivos aqui ou{' '}
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    clique para selecionar
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo 5 novos arquivos, 10MB cada
                  </p>
                </label>
              </div>

              {novosAnexos.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Novos arquivos ({novosAnexos.length}/5):
                  </p>
                  {novosAnexos.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2 rounded-lg"
                    >
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        onClick={() => removeNovoAnexo(index)}
                        disabled={submitting}
                        className="ml-2 text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {podeEditar && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end rounded-b-2xl">
            <button
              onClick={handleClose}
              disabled={submitting}
              className="px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fechar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {submitting ? 'Salvando...' : 'confirmar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
