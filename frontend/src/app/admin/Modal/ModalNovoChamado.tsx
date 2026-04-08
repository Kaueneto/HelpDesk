'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import CustomSelect from '@/components/admin/CustomSelect';
import { MdAttachFile } from 'react-icons/md';

interface TopicosAjuda {
  id: number;
  codigo: string;
  nome: string;
  ativo: boolean;
}

interface Departamento {
  id: number;
  codigo: string;
  name: string;
  ativo: boolean;
}

interface TipoPrioridade {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  roleId: number;
}

interface ModalNovoChamadoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalNovoChamado({ isOpen, onClose, onSuccess }: ModalNovoChamadoProps) {
  const MAX_FILES = 5;
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  const { user } = useAuth();
  const { theme } = useTheme();
  const assuntoRef = useRef<HTMLInputElement>(null);
  const descricaoRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados do formulário
  const [assunto, setAssunto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [topicoAjudaId, setTopicoAjudaId] = useState<number>(0);
  const [departamentoId, setDepartamentoId] = useState<number>(15); // Pré-selecionado
  const [prioridadeId, setPrioridadeId] = useState<number>(0);
  const [responsavelId, setResponsavelId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Dados dos selects
  const [topicos, setTopicos] = useState<TopicosAjuda[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [prioridades, setPrioridades] = useState<TipoPrioridade[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  
  // Estados de controle
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingData(true);
      carregarDados();
      // foca o campo assunto assim que o modal abre
      setTimeout(() => assuntoRef.current?.focus(), 50);
    }
  }, [isOpen, user]);

  const carregarDados = async () => {
    try {
      const [topicosRes, departamentosRes, prioridadesRes, usersRes] = await Promise.all([
        api.get('/topicos_ajuda'),
        api.get('/departamentos'),
        api.get('/tipo_prioridade'),
        api.get('/users'),
      ]);

      setTopicos(topicosRes.data.filter((t: TopicosAjuda) => t.ativo));
      const departamentosAtivos = departamentosRes.data.filter((d: Departamento) => d.ativo);
      setDepartamentos(departamentosAtivos);

      const prioridadesLista = Array.isArray(prioridadesRes.data) ? prioridadesRes.data : [];
      setPrioridades(prioridadesLista);
      
      // Filtrar apenas administradores
      const todosUsuarios = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.usuarios || []);
      const admins = todosUsuarios.filter((u: User) => u.roleId === 1);
      const usuarioLogadoCompleto = todosUsuarios.find((u: User) => u.id === user?.id);

      //garante que o usuario logado vai esta selecionado por padrao
      const usuariosDisponiveis = [...admins];
      if (user && !usuariosDisponiveis.some((u) => u.id === user.id)) {
        usuariosDisponiveis.unshift(
          usuarioLogadoCompleto || {
            id: user.id,
            name: user.name,
            email: user.email,
            roleId: user.roleId,
          }
        );
      }

      setUsuarios(usuariosDisponiveis);

      //departamento marcado por padrao quando existir
      const departamentoPadrao = departamentosAtivos.find((d: Departamento) => d.id === 15) || departamentosAtivos[0];
      if (departamentoPadrao) {
        setDepartamentoId(departamentoPadrao.id);
      }
      
      // Definir prioridade padrão (ordem 4 = Média/Baixa)
      const prioridadePadrao = prioridadesLista.find((p: TipoPrioridade) => p.ordem === 4) ||
        [...prioridadesLista].sort((a: TipoPrioridade, b: TipoPrioridade) => a.ordem - b.ordem)[0];
      if (prioridadePadrao) {
        setPrioridadeId(prioridadePadrao.id);
      }

      if (user) {
        setResponsavelId(user.id);
      } else if (usuariosDisponiveis.length > 0) {
        setResponsavelId(usuariosDisponiveis[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const limparCampos = () => {
    setAssunto('');
    setDescricao('');
    setTopicoAjudaId(0);
    setSelectedFiles([]);
    setErrorMessage('');

    const departamentoPadrao = departamentos.find((d) => d.id === 15) || departamentos[0];
    setDepartamentoId(departamentoPadrao ? departamentoPadrao.id : 0);
    
    // Resetar prioridade padrão
    const prioridadePadrao = prioridades.find((p) => p.ordem === 4);
    if (prioridadePadrao) {
      setPrioridadeId(prioridadePadrao.id);
    }
    
    // Resetar responsável para usuário logado (padrão, não limitado)
    if (user) {
      setResponsavelId(user.id);
    } else if (usuarios.length > 0) {
      setResponsavelId(usuarios[0].id);
    } else {
      setResponsavelId(null);
    }
  };

  const adicionarArquivos = (files: File[]) => {
    const arquivoMaiorQuePermitido = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (arquivoMaiorQuePermitido) {
      setErrorMessage(`O arquivo ${arquivoMaiorQuePermitido.name} ultrapassa o limite de 10MB.`);
      return;
    }

    const arquivosUnicos = [...selectedFiles, ...files].filter(
      (file, index, arr) =>
        index === arr.findIndex((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)
    );

    if (arquivosUnicos.length > MAX_FILES) {
      setErrorMessage('Máximo de 5 arquivos permitidos.');
      return;
    }

    setSelectedFiles(arquivosUnicos);
    setErrorMessage('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      adicionarArquivos(filesArray);
      e.target.value = '';
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
      adicionarArquivos(filesArray);
    }
  };

  const handleAssuntoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      descricaoRef.current?.focus();
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validação com mensagens específicas
    if (!assunto.trim()) {
      setErrorMessage('Por favor, preencha o assunto.');
      return;
    }
    if (!descricao.trim()) {
      setErrorMessage('Por favor, preencha a descrição.');
      return;
    }
    if (!topicoAjudaId) {
      setErrorMessage('Por favor, selecione um tópico.');
      return;
    }
    if (!departamentoId) {
      setErrorMessage('Por favor, selecione um departamento.');
      return;
    }
    if (!prioridadeId) {
      setErrorMessage('Por favor, selecione uma prioridade.');
      return;
    }
    if (!responsavelId) {
      setErrorMessage('Por favor, selecione um responsável.');
      return;
    }

    setSubmitting(true);

    try {
      // Criar chamado
      const chamadoResponse = await api.post('/chamados/admin/criar', {
        resumoChamado: assunto,
        descricaoChamado: descricao,
        topicoAjudaId,
        departamentoId,
        prioridadeId,
        userResponsavelId: responsavelId,
      });

      const chamadoId = chamadoResponse.data.chamado?.id;

      // Upload de anexos (se houver)
      if (selectedFiles.length > 0 && chamadoId) {
        try {
          const formData = new FormData();
          selectedFiles.forEach((file) => {
            formData.append('arquivos', file);
          });

          await api.post(`/chamado/${chamadoId}/anexo`, formData);
        } catch (anexoError) {
          const erro = anexoError as any;
          const mensagemErroAnexo = erro?.response?.data?.erro
            ? `${erro.response.data.mensagem || 'Erro ao enviar anexos'}: ${erro.response.data.erro}`
            : (erro?.response?.data?.mensagem || 'Chamado criado, mas houve erro ao enviar anexos.');

          setErrorMessage(mensagemErroAnexo);
        }
      }

      // Limpar e fechar
      limparCampos();
      onSuccess();
      onClose();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.mensagem || 'Erro ao abrir chamado. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (assunto || descricao || selectedFiles.length > 0) {
      if (confirm('Deseja cancelar? Os dados preenchidos serão perdidos.')) {
        limparCampos();
        onClose();
      }
    } else {
      limparCampos();
      onClose();
    }
  };

  if (!isOpen) return null;

  const topicosOrdenados = [...topicos].sort((a, b) => Number(a.codigo) - Number(b.codigo));
  const departamentosOrdenados = [...departamentos].sort((a, b) => Number(a.codigo) - Number(b.codigo));
  const usuariosOrdenados = [...usuarios].sort((a, b) => a.name.localeCompare(b.name));
  const prioridadesOrdenadas = [...prioridades].sort((a, b) => a.ordem - b.ordem);

    const responsavelOptions = usuarios.map((u) => ({
      id: u.id,
      label: u.name,
    }));

    const topicoOptions = topicos.map((t) => ({
      id: t.id,
      label: `${t.codigo} - ${t.nome}`,
    }));

    const departamentoOptions = departamentos.map((d) => ({
      id: d.id,
      label: `${d.codigo} - ${d.name}`,
    }));





  return (
    <div
      className="fixed inset-0 modal-overlay flex items-start sm:items-center justify-center z-50 px-3 sm:px-4 py-4 sm:py-6"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="modal-container rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.background.modal,
          color: theme.text.primary,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        }}
      >
        <form
          onSubmit={handleSubmit}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="p-5 sm:p-6 md:p-7 overflow-y-auto flex-1"
        >
          <div className="flex justify-between items-start gap-3">
            <div className="w-full max-w-3xl">
              <label htmlFor="assunto" className="sr-only">
                Assunto
              </label>
              <input
                ref={assuntoRef}
                id="assunto"
                type="text"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                onKeyDown={handleAssuntoKeyDown}
                required
                maxLength={200}
                className="w-full text-2xl md:text-3xl leading-tight font-semibold outline-none"
                placeholder="Assunto/resumo"
                style={{
                  backgroundColor: 'transparent',
                  color: theme.text.primary,
                }}
              />
            </div>

            <button
              onClick={handleCancel}
              className="transition-colors hover:opacity-70"
              type="button"
              tabIndex={-1}
              aria-label="Fechar modal"
              style={{ color: theme.text.secondary }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-3">
            <label htmlFor="descricao" className="sr-only">
              Descrição
            </label>
            <textarea
              id="descricao"
              ref={descricaoRef}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              rows={3}
              className="w-full text-lg md:text-xl outline-none resize-none overflow-y-auto max-h-48 pr-2"
              placeholder="Descrição"
              style={{
                backgroundColor: 'transparent',
                color: theme.text.primary,
              }}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1fr_140px] gap-5 md:gap-6 items-start">
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-2.5">
                <label htmlFor="responsavel" className="text-base md:text-lg leading-none" style={{ color: theme.text.secondary }}>
                  Responsável
                </label>
                <CustomSelect
                  value={responsavelId}
                  onChange={setResponsavelId}
                  options={responsavelOptions}
                  placeholder="Selecione..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-2.5">
                <label htmlFor="topico" className="text-base md:text-lg leading-none" style={{ color: theme.text.secondary }}>
                  Tópico
                </label>
                <CustomSelect
                  value={topicoAjudaId}
                  onChange={(val) => setTopicoAjudaId(val)}
                  options={topicosOrdenados.map((t) => ({
                    id: t.id,
                    label: `${t.codigo} - ${t.nome}`,
                  }))}
                  placeholder="Selecione..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-2.5">
                 <label htmlFor="departamento" className="text-base md:text-lg leading-none" style={{ color: theme.text.secondary }}>
                    Departamento
                </label>
                <CustomSelect
                  value={departamentoId}
                  onChange={(val) => setDepartamentoId(val)}
                  options={departamentosOrdenados.map((d) => ({
                    id: d.id,
                    label: `${d.codigo} - ${d.name}`,
                  }))}
                  placeholder="Selecione..."
                />
              </div>
            </div>

          <div className="flex flex-col gap-2 pl-6 xl:pl-5 pt-0 -mt-1 items-end">
              {prioridadesOrdenadas.map((prioridade) => {
                const isActive = prioridadeId === prioridade.id;
                
                // Mapear nomes de prioridade a cores do tema
                const getPriorityColors = () => {
                  const normalizedName = prioridade.nome.toLowerCase();
                  switch (normalizedName) {
                    case 'baixa':
                    case 'baixo':
                      return isActive ? theme.priority.baixa : { bg: theme.priority.baixa.bg, text: theme.text.secondary };
                    case 'média':
                    case 'media':
                    case 'médio':
                    case 'medio':
                      return isActive ? theme.priority.media : { bg: theme.priority.media.bg, text: theme.text.secondary };
                    case 'alta':
                    case 'alto':
                      return isActive ? theme.priority.alta : { bg: theme.priority.alta.bg, text: theme.text.secondary };
                    case 'crítica':
                    case 'critica':
                      return isActive ? theme.priority.critica : { bg: theme.priority.critica.bg, text: theme.text.secondary };
                    case 'urgente':
                      return isActive ? theme.priority.urgente : { bg: theme.priority.urgente.bg, text: theme.text.secondary };
                    default:
                      return isActive ? theme.priority.media : { bg: theme.priority.media.bg, text: theme.text.secondary };
                  }
                };
                
                const colors = getPriorityColors();
                
                return (
                  <button
                    key={prioridade.id}
                    type="button"
                    onClick={() => setPrioridadeId(prioridade.id)}
                    className="w-full h-9 rounded-lg text-sm font-mono transition-all duration-150 shadow-sm"
                    style={{
                      backgroundColor: isActive ? (colors as any).border : colors.bg,
                      color: isActive ? '#ffffff' : colors.text,
                    }}
                  >
                    {prioridade.nome}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Área de anexos */}
          <div className={`mt-5 transition-colors rounded-xl`}
            style={{
              backgroundColor: isDragging ? `${theme.brand.primary}1a` : 'transparent',
              border: isDragging ? `1px solid ${theme.brand.primary}` : '',
            }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border"
                style={{
                  backgroundColor: `${theme.brand.primary}15`,
                  color: theme.brand.primary,
                  borderColor: theme.brand.primary,
                }}
              >
                <MdAttachFile className="h-4 w-4" />
                Arquivos
              </button>

              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
                  style={{
                    backgroundColor: `${theme.brand.primary}15`,
                    borderColor: theme.brand.primary,
                  }}
                >
                   <span className="text-xs max-w-40 truncate" style={{ color: theme.brand.primary }}>{file.name}</span>
                    <span className="text-xs shrink-0" style={{ color: theme.text.secondary }}>{(file.size / 1024).toFixed(0)} KB</span>
                   <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="transition-colors"
                    aria-label={`Remover ${file.name}`}
                    style={{ color: theme.indicators.erro }}
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
              id="file-upload"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              onChange={handleFileChange}
              className="hidden"
              disabled={submitting}
            />
          </div>

          {errorMessage && (
            <div className="mt-4 px-4 py-3 rounded-lg text-sm border"
              style={{
                backgroundColor: `${theme.indicators.erro}15`,
                borderColor: theme.indicators.erro,
                color: theme.indicators.erro,
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Rodapé */}
          <div className="mt-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'transparent',
                  color: theme.brand.primary,
                  borderColor: theme.brand.primary,
                }}
              >
                 Cancelar
              </button>
              <button
                type="button"
                onClick={limparCampos}
                disabled={submitting}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'transparent',
                  color: theme.brand.primary,
                  borderColor: theme.brand.primary,
                }}
              >
                Limpar Campos
              </button>
            </div>

          <button
            type="submit"
            disabled={submitting || isLoadingData}
            className="px-8 py-2.5 text-white rounded-lg transition-all transform hover:scale-105 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            style={{
              backgroundColor: theme.brand.primary,
            }}
          >
            {isLoadingData ? 'Carregando...' : submitting ? 'Abrindo chamado...' : 'Criar'}
          </button>
          </div>
        </form>
      </div>
    </div>
  );
}

