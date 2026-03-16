'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

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
  const assuntoRef = useRef<HTMLInputElement>(null);
  const descricaoRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados do formulário
  const [assunto, setAssunto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [topicoAjudaId, setTopicoAjudaId] = useState<number>(0);
  const [departamentoId, setDepartamentoId] = useState<number>(15); // Pré-selecionado
  const [prioridadeId, setPrioridadeId] = useState<number>(0);
  const [responsavelId, setResponsavelId] = useState<number>(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
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
      carregarDados();
      if (user) {
        setResponsavelId(user.id);
      }
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
    
    // Resetar responsável para usuário logado
    if (user) {
      setResponsavelId(user.id);
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

    if (!assunto.trim() || !descricao.trim() || !topicoAjudaId || !departamentoId || !prioridadeId || !responsavelId) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
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

  const buttonGhostClass =
    'px-6 py-2 bg-transparent border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 transform hover:scale-105 font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 px-3 sm:px-4 py-4 sm:py-6"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div
        className="bg-[#f4f4f4] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="p-5 sm:p-6 md:p-7"
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
                className="w-full bg-transparent text-2xl md:text-3xl leading-tight font-semibold text-black placeholder:text-gray-400 outline-none"
                placeholder="Assunto/resumo"
              />
            </div>

            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              type="button"
              tabIndex={-1}
              aria-label="Fechar modal"
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
              className="w-full bg-transparent text-lg md:text-xl text-gray-800 placeholder:text-gray-400 outline-none resize-none overflow-y-auto max-h-48 pr-2"
              placeholder="Descrição"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1fr_140px] gap-5 md:gap-6 items-start">
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-2.5">
                <label htmlFor="responsavel" className="text-base md:text-lg leading-none text-gray-600">
                  Responsável
                </label>
                <select
                  id="responsavel"
                  value={responsavelId}
                  onChange={(e) => setResponsavelId(Number(e.target.value))}
                  required
                  className="h-10 px-3 border border-gray-400 rounded-lg bg-[#f4f4f4] text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={0}>Selecione...</option>
                  {usuariosOrdenados.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-2.5">
                <label htmlFor="topico" className="text-base md:text-lg leading-none text-gray-600">
                  Tópico
                </label>
                <select
                  id="topico"
                  value={topicoAjudaId}
                  onChange={(e) => setTopicoAjudaId(Number(e.target.value))}
                  required
                  className="h-10 px-3 border border-gray-400 rounded-lg bg-[#f4f4f4] text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={0}>Selecione...</option>
                  {topicosOrdenados.map((topico) => (
                    <option key={topico.id} value={topico.id}>
                      {topico.codigo} - {topico.nome}
                    </option>
                  ))}
                </select> 
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-2.5">
                 <label htmlFor="departamento" className="text-base md:text-lg leading-none text-gray-600">
                    Departamento
                </label>
                <select
                  id="departamento"
                  value={departamentoId}
                  onChange={(e) => setDepartamentoId(Number(e.target.value))}
                  required
                  className="h-10 px-3 border border-gray-400 rounded-lg bg-[#f4f4f4] text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={0}>Selecione...</option>
                  {departamentosOrdenados.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.codigo} - {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          <div className="flex flex-col gap-2 pl-6 xl:pl-5 pt-0 -mt-1 items-end">
              {prioridadesOrdenadas.map((prioridade) => {
                const isActive = prioridadeId === prioridade.id;
                return (
                  <button
                    key={prioridade.id}
                    type="button"
                    onClick={() => setPrioridadeId(prioridade.id)}
                    className="w-full h-9 rounded-lg text-sm font-mono transition-all duration-150 hover:brightness-90 shadow-sm"
                    style={{
                      backgroundColor: isActive ? prioridade.cor : '#e7e7e7',
                      color: isActive ? '#ffffff' : '#464646',
                    }}
                  >
                    {prioridade.nome}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Área de anexos */}
          <div className={`mt-5 transition-colors rounded-xl ${isDragging ? 'ring-2 ring-blue-400 bg-blue-50/40' : ''}`}>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                   Arquivos
              </button>

              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-300 rounded-full"
                >
                   <span className="text-xs text-gray-700 max-w-[160px] truncate">{file.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                   <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
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
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
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
                className={buttonGhostClass}
              >
                 Cancelar
              </button>
              <button
                type="button"
                onClick={limparCampos}
                disabled={submitting}
                className={buttonGhostClass}
              >
                Limpar Campos
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-[#001960] text-white rounded-lg hover:bg-[#001960]/80 transition-all transform hover:scale-105 font-medium disabled:bg-blue-400 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? 'Abrindo chamado...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

