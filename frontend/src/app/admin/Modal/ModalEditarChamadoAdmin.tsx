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
  ordem?: number;
}

interface ModalEditarChamadoAdminProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chamadoId: number;
}

export default function ModalEditarChamadoAdmin({
  isOpen,
  onClose,
  onSuccess,
  chamadoId,
}: ModalEditarChamadoAdminProps) {
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [numeroChamado, setNumeroChamado] = useState<number | null>(null);
  
  useEffect(() => {
    if (isOpen && chamadoId) {
      carregarDadosChamado();
      carregarListasSelecao();
    }
  }, [isOpen, chamadoId]);

  const carregarDadosChamado = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/chamados/${chamadoId}`);
      const chamado = response.data;
      
      setResumoChamado(chamado.resumoChamado || '');
      setDescricaoChamado(chamado.descricaoChamado || '');
      setRamal(chamado.ramal ? String(chamado.ramal) : '');
      setDepartamentoId(chamado.departamento?.id || 0);
      setTopicoAjudaId(chamado.topicoAjuda?.id || 0);
      setPrioridadeId(chamado.tipoPrioridade?.id || 0);
      setAnexosExistentes(chamado.anexos || []);
      setNumeroChamado(chamado.numeroChamado || chamado.id);
    } catch (error) {
      console.error('Erro ao carregar dados do chamado:', error);
      alert('Erro ao carregar dados do chamado');
    } finally {
      setLoading(false);
    }
  };

  const carregarListasSelecao = async () => {
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
      console.error('Erro ao carregar listas:', error);
    }
  };

  const handleRemoverAnexoExistente = async (anexoId: number) => {
    if (!confirm('Deseja remover este anexo? Esta ação não pode ser desfeita.')) return;

    try {
      setAnexosExistentes(prev => prev.filter(a => a.id !== anexoId));
      await api.delete(`/chamados/${chamadoId}/anexo/${anexoId}`);
      alert('Anexo removido com sucesso!');
    } catch (error: any) {
      const mensagem = error.response?.data?.mensagem || 'Erro ao remover anexo';
      alert(mensagem);
      await carregarDadosChamado();
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

    // ramal é opcional
    if (ramal && ramal.trim() !== '' && isNaN(Number(ramal))) {
      alert('O ramal deve ser um número válido');
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

    setSubmitting(true);
    try {
      
      await api.put(`/chamados/${chamadoId}/editar-admin`, {
        resumoChamado,
        descricaoChamado,
        ramal: ramal && ramal.trim() !== '' ? Number(ramal) : null,
        departamentoId,
        topicoAjudaId,
        prioridadeId,
      });

    
      if (novosAnexos.length > 0) {
        const formData = new FormData();
        novosAnexos.forEach(file => {
          formData.append('arquivos', file);
        });

        await api.post(`/chamado/${chamadoId}/anexo`, formData);
      }

      alert('Chamado editado com sucesso!');
      onSuccess();
      handleClose();
    } catch (error: any) {
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

  const prioridadesOrdenadas = [...prioridades].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const buttonGhostClass =
    'px-6 py-2 bg-transparent border border-primary text-primary rounded-lg hover:bg-primary/10 hover:shadow-md active:bg-primary/20 transition-all duration-200 transform hover:scale-105 font-medium disabled:border-secondary disabled:text-secondary disabled:bg-transparent disabled:cursor-not-allowed';

  return (
    <div
      className="fixed inset-0 modal-overlay flex items-start sm:items-center justify-center z-50 px-3 sm:px-4 py-4 sm:py-6"
      onClick={handleClose}
    >
      <div
        className="modal-container rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderBottomColor: `rgb(var(--btn-criar))` }} />
            <p className="mt-4 text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>Carregando dados...</p>
          </div>
        ) : (
            <div
              className="p-5 sm:p-6 md:p-7"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
            {/* Título + número + fechar */}
            <div className="flex justify-between items-start gap-3">
              <div className="w-full">
                <p className="text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: 'rgb(var(--text-secondary))' }}>
                  Chamado #{numeroChamado || chamadoId}
                </p>
                <input
                  type="text"
                  value={resumoChamado}
                  onChange={(e) => setResumoChamado(e.target.value)}
                  className="w-full bg-transparent text-2xl md:text-3xl leading-tight font-semibold text-primary placeholder:text-secondary outline-none"
                  placeholder="Assunto do chamado"
                  disabled={submitting}
                />
              </div>
              <button
                onClick={handleClose}
                className="hover:text-primary transition-colors shrink-0"
                style={{ color: 'rgb(var(--text-secondary))' }}
                type="button"
                tabIndex={-1}
                aria-label="Fechar modal"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Descrição */}
            <div className="mt-3">
              <textarea
                value={descricaoChamado}
                onChange={(e) => setDescricaoChamado(e.target.value)}
                rows={3}
                className="w-full bg-transparent text-lg md:text-xl outline-none resize-none overflow-y-auto max-h-48 pr-2"
                style={{ color: 'rgb(var(--text-secondary))' }}
                placeholder="Descrição do problema"
                disabled={submitting}
              />
            </div>

            {/* Campos + Prioridade */}
            <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1fr_140px] gap-5 md:gap-6 items-start">
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-2.5">
                  <label className="text-base md:text-lg leading-none text-primary">
                    Ramal
                  </label>
                  <input
                    type="number"
                    value={ramal}
                    onChange={(e) => setRamal(e.target.value)}
                    placeholder="(opcional)"
                    className="h-10 px-3 border border-primary bg-elevated text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary rounded-lg"
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-2.5">
                  <label className="text-base md:text-lg leading-none text-primary">
                    Departamento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={departamentoId}
                    onChange={(e) => setDepartamentoId(Number(e.target.value))}
                    className="h-10 px-3 border border-primary bg-elevated text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary rounded-lg"
                    disabled={submitting}
                  >
                    <option value={0}>Selecione</option>
                    {departamentos.map(dep => (
                      <option key={dep.id} value={dep.id}>{dep.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-2.5">
                  <label className="text-base md:text-lg leading-none text-primary">
                    Tópico <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={topicoAjudaId}
                    onChange={(e) => setTopicoAjudaId(Number(e.target.value))}
                    className="h-10 px-3 border border-primary bg-elevated text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary rounded-lg"
                    disabled={submitting}
                  >
                    <option value={0}>Selecione</option>
                    {topicosAjuda.map(top => (
                      <option key={top.id} value={top.id}>{top.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botões de prioridade */}
              <div className="flex flex-col gap-2 pl-4 xl:pl-2 pt-1">
                {prioridadesOrdenadas.map(prioridade => {
                  const isActive = prioridadeId === prioridade.id;
                  return (
                    <button
                      key={prioridade.id}
                      type="button"
                      onClick={() => setPrioridadeId(prioridade.id)}
                      disabled={submitting}
                      className="w-full h-9 rounded-lg text-sm font-semibold tracking-wide transition-all duration-150 hover:brightness-90 shadow-sm disabled:opacity-60"
                      style={{
                        backgroundColor: isActive ? prioridade.cor : '#c8c8c8',
                        color: isActive ? '#ffffff' : '#5a5a5a',
                      }}
                    >
                      {prioridade.nome}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Área de anexos */}
            <div className={`mt-5 rounded-xl transition-colors ${isDragging ? 'ring-2 ring-brand-primary bg-brand-primary/5' : ''}`}>
              {/* Anexos existentes como pills */}
              {anexosExistentes.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {anexosExistentes.map(anexo => (
                    <div
                      key={anexo.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-elevated border border-primary rounded-full"
                    >
                      <svg className="h-3.5 w-3.5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="text-xs text-primary max-w-[160px] truncate">{anexo.filename}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoverAnexoExistente(anexo.id)}
                        disabled={submitting}
                        className="hover:text-error transition-colors disabled:opacity-50"
                        style={{ color: 'rgb(var(--text-secondary))' }}
                        aria-label={`Remover ${anexo.filename}`}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* botao de adicionar +nvos anexos */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-1.5 border border-primary rounded-lg text-sm text-primary bg-primary/5 hover:bg-primary/15 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Arquivos
                </button>

                {novosAnexos.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-elevated border border-primary rounded-full"
                  >
                    <span className="text-xs text-primary max-w-[160px] truncate">{file.name}</span>
                    <span className="text-xs shrink-0" style={{ color: 'rgb(var(--text-secondary))' }}>{(file.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      onClick={() => removeNovoAnexo(index)}
                      className="hover:text-error transition-colors"
                      style={{ color: 'rgb(var(--text-secondary))' }}
                      aria-label={`Remover ${file.name}`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                id="file-upload-edit-admin"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                onChange={handleFileChange}
                className="hidden"
                disabled={submitting}
              />
            </div>

            {/* rodapé */}
            <div className="mt-7 flex justify-between items-center gap-3">
              <button
                onClick={handleClose}
                disabled={submitting}
                className={buttonGhostClass}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || loading}
                style={{ backgroundColor: 'rgb(var(--btn-criar))' }}
                className="px-6 py-2 text-white rounded-lg hover:brightness-90 active:brightness-75 transition-all transform hover:scale-105 font-semibold disabled:bg-secondary disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitting ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}