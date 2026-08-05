'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import UserSelect from '@/components/admin/UserSelect';
import { MdAttachFile } from 'react-icons/md';
import { FiShoppingCart } from 'react-icons/fi';

// ID fixo do tópico "Solicitação de Compra"
const TOPICO_COMPRAS_ID = 26;

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
  departamento?: string;
  avatar_url?: string | null;
}

interface ModalNovaSolicitacaoCompraProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado após criação bem-sucedida — recebe o id do chamado criado */
  onSuccess: (chamadoId?: number) => void;
}

export default function ModalNovaSolicitacaoCompra({
  isOpen,
  onClose,
  onSuccess,
}: ModalNovaSolicitacaoCompraProps) {
  const MAX_FILES = 5;
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

  const { user } = useAuth();
  const { theme } = useTheme();

  const assuntoRef   = useRef<HTMLInputElement>(null);
  const descricaoRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // form
  const [assunto,       setAssunto]       = useState('');
  const [descricao,     setDescricao]     = useState('');
  const [prioridadeId,  setPrioridadeId]  = useState<number>(0);
  const [responsavelId, setResponsavelId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // dados
  const [prioridades,    setPrioridades]    = useState<TipoPrioridade[]>([]);
  const [usuarios,       setUsuarios]       = useState<User[]>([]);
  const [isLoadingData,  setIsLoadingData]  = useState(true);

  // controle
  const [submitting,    setSubmitting]    = useState(false);
  const [errorMessage,  setErrorMessage]  = useState('');
  const [isDragging,    setIsDragging]    = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingData(true);
      carregarDados();
      setTimeout(() => assuntoRef.current?.focus(), 60);
    }
  }, [isOpen]);

  async function carregarDados() {
    try {
      const [prioridadesRes, usersRes, deptosRes] = await Promise.all([
        api.get('/tipo_prioridade'),
        api.get('/users'),
        api.get('/departamentos'),
      ]);

      const prioridadesLista: TipoPrioridade[] = Array.isArray(prioridadesRes.data)
        ? prioridadesRes.data
        : [];
      setPrioridades(prioridadesLista);

      const departamentosLista = Array.isArray(deptosRes.data) ? deptosRes.data : [];
      const todosUsuarios: User[] = Array.isArray(usersRes.data)
        ? usersRes.data
        : usersRes.data.usuarios || [];

      const admins = todosUsuarios
        .filter((u) => u.roleId === 1 || u.roleId === 4)
        .map((u: any) => ({
          ...u,
          departamento:
            departamentosLista.find((d: any) => String(d.id) === String(u.id_departament))
              ?.name || '',
        }));

      const usuariosDisponiveis = [...admins];
      if (user && !usuariosDisponiveis.some((u) => u.id === user.id)) {
        const logado = todosUsuarios.find((u) => u.id === user.id);
        usuariosDisponiveis.unshift(
          logado
            ? {
                ...logado,
                departamento:
                  departamentosLista.find((d: any) => String(d.id) === String((logado as any).id_departament))
                    ?.name || '',
              }
            : { id: user.id, name: user.name, email: user.email, roleId: user.roleId }
        );
      }

      setUsuarios(usuariosDisponiveis);

      // prioridade padrão = ordem 4 (médio/baixo)
      const pdrPadrao =
        prioridadesLista.find((p) => p.ordem === 4) ||
        [...prioridadesLista].sort((a, b) => a.ordem - b.ordem)[0];
      if (pdrPadrao) setPrioridadeId(pdrPadrao.id);

      if (user) setResponsavelId(user.id);
      else if (usuariosDisponiveis.length > 0) setResponsavelId(usuariosDisponiveis[0].id);
    } catch {
      setErrorMessage('Erro ao carregar dados. Tente novamente.');
    } finally {
      setIsLoadingData(false);
    }
  }

  function limparCampos() {
    setAssunto('');
    setDescricao('');
    setSelectedFiles([]);
    setErrorMessage('');
    const pdrPadrao = prioridades.find((p) => p.ordem === 4);
    if (pdrPadrao) setPrioridadeId(pdrPadrao.id);
    if (user) setResponsavelId(user.id);
    else if (usuarios.length > 0) setResponsavelId(usuarios[0].id);
  }

  function adicionarArquivos(files: File[]) {
    const grande = files.find((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (grande) {
      setErrorMessage(`O arquivo "${grande.name}" ultrapassa o limite de 10 MB.`);
      return;
    }
    const juntos = [...selectedFiles, ...files].filter(
      (f, i, arr) =>
        i === arr.findIndex((x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified)
    );
    if (juntos.length > MAX_FILES) {
      setErrorMessage('Máximo de 5 arquivos permitidos.');
      return;
    }
    setSelectedFiles(juntos);
    setErrorMessage('');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      adicionarArquivos(Array.from(e.target.files));
      e.target.value = '';
    }
  }

  function handleDragOver(e: React.DragEvent)  { e.preventDefault(); setIsDragging(true);  }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); setIsDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) adicionarArquivos(Array.from(e.dataTransfer.files));
  }

  function handleCancel() {
    if (assunto || descricao || selectedFiles.length > 0) {
      if (confirm('Deseja cancelar? Os dados preenchidos serão perdidos.')) {
        limparCampos();
        onClose();
      }
    } else {
      limparCampos();
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    if (!assunto.trim())   { setErrorMessage('Por favor, preencha o assunto.');       return; }
    if (!descricao.trim()) { setErrorMessage('Por favor, preencha a descrição.');     return; }
    if (!prioridadeId)     { setErrorMessage('Por favor, selecione uma prioridade.'); return; }
    if (!responsavelId)    { setErrorMessage('Por favor, selecione um responsável.');  return; }

    setSubmitting(true);
    try {
      const chamadoRes = await api.post('/chamados/admin/criar', {
        resumoChamado:    assunto.trim(),
        descricaoChamado: descricao.trim(),
        topicoAjudaId:    TOPICO_COMPRAS_ID,
        prioridadeId,
        userResponsavelId: responsavelId,
      });

      const chamadoId: number | undefined = chamadoRes.data.chamado?.id;

      if (selectedFiles.length > 0 && chamadoId) {
        try {
          const formData = new FormData();
          selectedFiles.forEach((f) => formData.append('arquivos', f));
          await api.post(`/chamado/${chamadoId}/anexo`, formData);
        } catch {
          // chamado criado — só falhou o upload de anexos
          setErrorMessage('Solicitação criada, mas houve erro ao enviar os anexos.');
        }
      }

      limparCampos();
      onSuccess(chamadoId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.mensagem || 'Erro ao criar solicitação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const prioridadesOrdenadas = [...prioridades].sort((a, b) => a.ordem - b.ordem);
  const usuariosOrdenados    = [...usuarios].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div
        className="modal-solicitacao-compra rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: theme.DarkTotal.bgDarkTotal, color: theme.text.primary }}
      >
        <form
          onSubmit={handleSubmit}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="p-5 sm:p-6 md:p-7 overflow-y-auto flex-1"
        >
          <style>{`
            .modal-solicitacao-compra ::placeholder { color: ${theme.text.secondary}; opacity: 0.5; }
          `}</style>
          {/* ── cabeçalho ── */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-xl"
                style={{ backgroundColor: `${theme.DarkTotal.bgDarkTotal}18` }}
              >
                <FiShoppingCart size={18} style={{ color: theme.brand.primary }} />
              </div>
              <div>
             
                <p
                  className="text-sm font-medium"
                  style={{ color: theme.brand.primary }}
                >
                  Solicitação de Compra
                  <span
                    className="ml-2 text-xs px-2 py-0.5 rounded-full font-normal"
                    style={{
                      backgroundColor: `${theme.brand.primary}18`,
                      color: theme.brand.primary,
                    }}
                  >
                 
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="transition-colors hover:opacity-70"
              style={{ color: theme.text.secondary }}
              aria-label="Fechar"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── assunto ── */}
          <input
            ref={assuntoRef}
            type="text"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                descricaoRef.current?.focus();
              }
            }}
            required
            maxLength={200}
            placeholder="Assunto / resumo da solicitação"
            className="w-full text-2xl md:text-3xl leading-tight font-semibold outline-none border-none ring-0 focus:ring-0"
            style={{
              color: theme.text.primary,
              backgroundColor: theme.DarkTotal.bgDarkTotal,
              WebkitBoxShadow: `0 0 0 1000px ${theme.DarkTotal.bgDarkTotal} inset`,
              WebkitTextFillColor: theme.text.primary,
              caretColor: theme.text.primary,
            } as React.CSSProperties}
          />

          {/* ── descrição do chamado/solicitacao ── */}
          <textarea
            ref={descricaoRef}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            rows={3}
            placeholder="Descreva aqui o que precisa ser comprado, quantidades, especificações..."
            className="mt-3 w-full text-lg md:text-xl outline-none border-none ring-0 focus:ring-0 resize-none overflow-y-auto max-h-48 pr-2"
            style={{
              color: theme.text.primary,
              backgroundColor: theme.DarkTotal.bgDarkTotal,
              WebkitBoxShadow: `0 0 0 1000px ${theme.DarkTotal.bgDarkTotal} inset`,
              WebkitTextFillColor: theme.text.primary,
              caretColor: theme.text.primary,
            } as React.CSSProperties}
          />

          <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1fr_140px] gap-5 md:gap-6 items-start">
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-2.5">
                <label className="text-base md:text-lg leading-none" style={{ color: theme.text.secondary }}>
                  Responsável
                </label>
                <UserSelect
                  value={responsavelId}
                  onChange={setResponsavelId}
                  options={usuariosOrdenados}
                />
              </div>

              {/* tópico — bloqueado, apenas visual */}
              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-2.5">
                <label className="text-base md:text-lg leading-none" style={{ color: theme.text.secondary }}>
                  Tópico
                </label>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium select-none"
                  style={{
                    backgroundColor: `${theme.brand.primary}12`,
                    border: `1px solid ${theme.brand.primary}30`,
                    color: theme.brand.primary,
                  }}
                >
                  <FiShoppingCart size={14} />
                  <span>Solicitação de Compra</span>
                  <span
                    className="ml-auto text-xs opacity-60 font-normal"
                    style={{ color: theme.text.secondary }}
                  >
                
                  </span>
                </div>
              </div>
            </div>

            {/* botões de prioridade */}
            <div className="flex flex-col gap-2 pl-6 xl:pl-5 pt-0 -mt-1 items-end">
              {prioridadesOrdenadas.map((prioridade) => {
                const isActive = prioridadeId === prioridade.id;
                const normalizedName = prioridade.nome.toLowerCase();

                const getPriorityColors = () => {
                  switch (normalizedName) {
                    case 'baixa':
                    case 'baixo':
                      return isActive ? theme.priority.baixa   : { bg: '#f0f0f0', text: '#666' };
                    case 'média':
                    case 'media':
                    case 'médio':
                    case 'medio':
                      return isActive ? theme.priority.media   : { bg: '#f0f0f0', text: '#666' };
                    case 'alta':
                    case 'alto':
                      return isActive ? theme.priority.alta    : { bg: '#f0f0f0', text: '#666' };
                    case 'crítica':
                    case 'critica':
                      return isActive ? theme.priority.critica : { bg: '#f0f0f0', text: '#666' };
                    case 'urgente':
                      return isActive ? theme.priority.urgente : { bg: '#f0f0f0', text: '#666' };
                    default:
                      return isActive ? theme.priority.media   : { bg: '#f0f0f0', text: '#666' };
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

          {/* ── anexos ── */}
          <div
            className="mt-5 transition-colors rounded-xl"
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all border hover:scale-105 hover:shadow-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: `${theme.brand.buttonSecondary}15`,
                  color: theme.brand.buttonSecondary,
                  borderColor: theme.brand.buttonSecondary,
                }}
              >
                <MdAttachFile className="h-3.5 w-3.5" />
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
                  <span className="text-xs max-w-40 truncate" style={{ color: theme.brand.primary }}>
                    {file.name}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: theme.text.secondary }}>
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
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
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              onChange={handleFileChange}
              className="hidden"
              disabled={submitting}
            />
          </div>

          {/* ── erro ── */}
          {errorMessage && (
            <div
              className="mt-4 px-4 py-3 rounded-lg text-sm border"
              style={{
                backgroundColor: `${theme.indicators.erro}15`,
                borderColor: theme.indicators.erro,
                color: theme.indicators.erro,
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* ── rodapé ── */}
          <div className="mt-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 border disabled:opacity-50"
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
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 border disabled:opacity-50"
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
              className="px-8 py-2.5 text-white rounded-lg transition-all hover:scale-105 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              style={{ backgroundColor: theme.brand.primary }}
            >
              {isLoadingData
                ? 'Carregando...'
                : submitting
                ? 'Criando solicitação...'
                : 'Criar Solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
