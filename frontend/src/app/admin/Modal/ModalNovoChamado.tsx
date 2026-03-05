'use client';

import { useState, useEffect } from 'react';
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
  const { user } = useAuth();
  
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
      // Definir responsável como usuário logado
      if (user) {
        setResponsavelId(user.id);
      }
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
      setDepartamentos(departamentosRes.data.filter((d: Departamento) => d.ativo));
      setPrioridades(prioridadesRes.data);
      
      // Filtrar apenas administradores
      const todosUsuarios = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.usuarios || []);
      const admins = todosUsuarios.filter((u: User) => u.roleId === 1);
      setUsuarios(admins);
      
      // Definir prioridade padrão (ordem 4 = Média/Baixa)
      const prioridadePadrao = prioridadesRes.data.find((p: TipoPrioridade) => p.ordem === 4);
      if (prioridadePadrao) {
        setPrioridadeId(prioridadePadrao.id);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const limparCampos = () => {
    setAssunto('');
    setDescricao('');
    setTopicoAjudaId(0);
    setDepartamentoId(15);
    setSelectedFiles([]);
    setErrorMessage('');
    
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

          await api.post(`/chamado/${chamadoId}/anexo`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        } catch (anexoError) {
          console.error('Erro ao enviar anexos:', anexoError);
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

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 rounded-lg"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div 
        className="bg-[#f4f4f4] rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#002851] px-6 py-4 flex justify-between items-center  sticky top-0 z-10">
          <h2 className="text-white text-2xl font-semibold">Abrir novo chamado</h2>
          <button
            onClick={handleCancel}
            className="text-white hover:text-gray-200 transition-colors"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* formulario */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* coluna esuqerda */}
            <div className="lg:col-span-2 space-y-4">

              <div>
                <label htmlFor="assunto" className="block text-base font-medium text-gray-700 mb-2">
                  Assunto <span className="text-red-500">*</span>
                </label>
                <input
                  id="assunto"
                  type="text"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  required
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Digite o assunto do chamado"
                />
              </div>

              <div>
                <label htmlFor="descricao" className="block text-base font-medium text-gray-700 mb-2">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  required
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-y transition-all"
                  placeholder="Descreva o problema ou solicitação com detalhes"
                />
              </div>

              <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
                Anexos (Opcional)
            </label>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-2 text-center transition-colors ${
                isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-gray-50"
                }`} >

                <label
                htmlFor="file-upload"
                className="cursor-pointer flex items-center justify-center gap-2">
                <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                </svg>

                <div className="text-left">
                    <p className="text-base font-medium text-gray-700">
                    Clique para selecionar ou arraste arquivos aqui
                    </p>
                    <p className="text-xs text-gray-500">
                    Máximo de 5 arquivos (10MB cada)
                    </p>
                </div>
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
                        className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="h-5 w-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-base text-gray-700 truncate">{file.name}</span>
                          <span className="text-xs text-gray-500 shrink-0">
                            ({(file.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 transition-colors shrink-0 ml-2"
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
            </div>

            {/* coluna direita */}
            <div className="space-y-4">
                 <div>
                <label htmlFor="topico" className="block text-base font-medium text-gray-700 mb-2">
                  Tópico de ajuda <span className="text-red-500">*</span>
                </label>
                <select
                  id="topico"
                  value={topicoAjudaId}
                  onChange={(e) => setTopicoAjudaId(Number(e.target.value))}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value={0}>Selecione...</option>
                  {topicos
                    .sort((a, b) => Number(a.codigo) - Number(b.codigo))
                    .map((topico) => (
                      <option key={topico.id} value={topico.id}>
                        {topico.codigo} - {topico.nome}
                      </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="departamento" className="block text-base font-medium text-gray-700 mb-2">
                  Departamento <span className="text-red-500">*</span>
                </label>
                <select
                  id="departamento"
                  value={departamentoId}
                  onChange={(e) => setDepartamentoId(Number(e.target.value))}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value={0}>Selecione...</option>
                  {departamentos
                    .sort((a, b) => Number(a.codigo) - Number(b.codigo))
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.codigo} - {dept.name}
                      </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Nível de prioridade <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 h-10 rounded-lg overflow-hidden border border-gray-300">
                  {prioridades.map((prioridade) => (
                    <button
                      key={prioridade.id}
                      type="button"
                      onClick={() => setPrioridadeId(prioridade.id)}
                      className={`flex items-center justify-center text-xs font-medium transition-all ${
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

              <div>
                <label htmlFor="responsavel" className="block text-base font-medium text-gray-700 mb-2">
                  Responsável <span className="text-red-500">*</span>
                </label>
                <select
                  id="responsavel"
                  value={responsavelId}
                  onChange={(e) => setResponsavelId(Number(e.target.value))}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-[#f4f4f4] text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value={0}>Selecione...</option>
                  {usuarios
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.name}
                      </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

  
          {errorMessage && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-base">
              {errorMessage}
            </div>
          )}

        
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="px-6 py-2 bg-transparent border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 transform hover:scale-105 font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={limparCampos}
                disabled={submitting}
                className="px-6 py-2 bg-transparent border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 transform hover:scale-105 font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed"
              >
                Limpar Campos
              </button>
            </div>
            <button
              type="submit"
              disabled={submitting}
                className="px-6 py-2 bg-[#001960] text-white rounded-lg hover:bg-[#001960]/80 transition-all transform hover:scale-105 font-medium disabled:bg-blue-400 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? 'Abrindo chamado...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

