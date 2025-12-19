'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import api from '@/services/api';

interface TopicosAjuda {
  id: number;
  nome: string;
  ativo: boolean;
}

interface Departamento {
  id: number;
  name: string;
}

interface TipoPrioridade {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
}

export default function PainelInicialUsuario() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'novo' | 'acompanhar'>('home');

  // Estados do formulário
  const [ramal, setRamal] = useState('');
  const [prioridadeId, setPrioridadeId] = useState<number>(0);
  const [topicoAjudaId, setTopicoAjudaId] = useState<number>(0);
  const [departamentoId, setDepartamentoId] = useState<number>(0);
  const [resumoChamado, setResumoChamado] = useState('');
  const [descricaoChamado, setDescricaoChamado] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Listas para os comboboxes
  const [topicos, setTopicos] = useState<TopicosAjuda[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [prioridades, setPrioridades] = useState<TipoPrioridade[]>([]);
  
  // Estados de loading/erro
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!isLoading && user && user.roleId === 1) {
      // Se for admin, redireciona para painel admin
      router.push('/admin/painel');
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Carregar tópicos de ajuda, departamentos e prioridades
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topicosRes, departamentosRes, prioridadesRes] = await Promise.all([
          api.get('/topicos_ajuda'),
          api.get('/departamentos'),
          api.get('/tipo_prioridade'),
        ]);
        setTopicos(topicosRes.data.filter((t: TopicosAjuda) => t.ativo));
        setDepartamentos(departamentosRes.data);
        setPrioridades(prioridadesRes.data);
        
        // Definir prioridade padrão (Média - geralmente ordem 3)
        const prioridadePadrao = prioridadesRes.data.find((p: TipoPrioridade) => p.ordem === 3);
        if (prioridadePadrao) {
          setPrioridadeId(prioridadePadrao.id);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

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
      // Primeiro, criar o chamado
      const chamadoResponse = await api.post('/chamados', {
        ramal,
        prioridadeId,
        topicoAjudaId,
        departamentoId,
        resumoChamado,
        descricaoChamado,
      });

      const chamadoId = chamadoResponse.data.chamado?.id;

      // Se houver arquivos, fazer upload
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

      // Limpar formulário
      setRamal('');
      const prioridadePadrao = prioridades.find((p) => p.ordem === 3);
      setPrioridadeId(prioridadePadrao?.id || 0);
      setTopicoAjudaId(0);
      setDepartamentoId(0);
      setResumoChamado('');
      setDescricaoChamado('');
      setSelectedFiles([]);
      
      alert('Chamado aberto com sucesso!');
      setActiveTab('home');
    } catch (error: any) {
      setErrorMessage(error.response?.data?.mensagem || 'Erro ao abrir chamado. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelar = () => {
    if (confirm('Deseja cancelar? Os dados preenchidos serão perdidos.')) {
      setRamal('');
      const prioridadePadrao = prioridades.find((p) => p.ordem === 3);
      setPrioridadeId(prioridadePadrao?.id || 0);
      setTopicoAjudaId(0);
      setDepartamentoId(0);
      setResumoChamado('');
      setDescricaoChamado('');
      setSelectedFiles([]);
      setErrorMessage('');
      setActiveTab('home');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.roleId !== 2) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Container principal */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Central de chamados</h1>
            <div className="text-gray-700">
              Usuário: <span className="font-medium">{user.name}</span>
            </div>
          </div>

          {/* Tabs de Navegação - Fixas */}
          <div className="px-8 py-4 sticky top-0 bg-white z-10">
            <div className="h-12 items-center justify-center rounded-lg bg-gray-200/60 p-1 grid grid-cols-3 gap-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 gap-2 ${
                  activeTab === 'home'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Image src="/icons/iconhome.svg" alt="" width={20} height={20} /> Pagina Inicial
              </button>
              <button
                onClick={() => setActiveTab('novo')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 gap-2 ${
                  activeTab === 'novo'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Image src="/icons/iconabrirnovochamado.svg" alt="" width={20} height={20} /> Abrir novo Chamado
              </button>
              <button
                onClick={() => setActiveTab('acompanhar')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 gap-2 ${
                  activeTab === 'acompanhar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Image src="/icons/iconacompanhar.svg" alt="" width={20} height={20} /> Acompanhar Chamado
              </button>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1 px-8 py-12 flex flex-col overflow-y-auto">
            {activeTab === 'home' && (
              <div className="flex items-center justify-between h-full gap-16">
                {/* Texto à esquerda */}
                <div className="flex-shrink-0">
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">Bem vindo!</h2>
                  <p className="text-2xl text-gray-900">Escolha uma opção</p>
                </div>

                {/* Botões à direita */}
                <div className="flex flex-col gap-8 max-w-sm w-full">
                  <button
                    onClick={() => setActiveTab('novo')}
                    className="w-full px-8 py-8 bg-cyan-400 hover:bg-cyan-500 text-white text-xl font-semibold rounded-lg shadow-md transition flex items-center justify-center gap-3"
                  >
                    <span className="text-2xl font-bold">+</span>
                    <span>Abrir novo chamado</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('acompanhar')}
                    className="w-full px-8 py-8 bg-green-800 hover:bg-green-900 text-white text-xl font-semibold rounded-lg shadow-md transition leading-tight"
                  >
                    <div>Verificar andamento</div>
                    <div>do chamado</div>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'novo' && (
              <div className="max-w-4xl">
                <h2 className="text-3xl font-semibold text-blue-600 mb-2">Abrindo um novo Ticket</h2>
                <p className="text-gray-600 mb-8">Preencha os dados abaixo</p>

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
                        value={user?.email || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-black"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                : 'bg-gray-400 text-gray-700'
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-12"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      placeholder="Descreva seu problema com o maior numeros de detalhes..."
                    />
                  </div>

                  {/* Anexos */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Anexos (Opcional)
                    </label>
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                      >
                        <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Anexar arquivos
                      </label>
                      <span className="text-xs text-gray-500">Máximo de 5 arquivos</span>
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

                    {/* Lista de arquivos selecionados */}
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

                        {/* Mensagem de erro */}
                        {errorMessage && (
                          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                            {errorMessage}
                          </div>
                        )}

                        {/* Botões */}
                        <div className="flex gap-4 justify-end pt-4">
                          <button
                            type="button"
                            onClick={handleCancelar}
                            disabled={submitting}
                            className="px-8 py-3 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
                          >

                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition disabled:opacity-50"
                    >
                      {submitting ? 'Abrindo chamado...' : 'Abrir chamado'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'acompanhar' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Acompanhar Chamados</h2>
                <p className="text-gray-600">Lista de chamados será implementada aqui.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé fixo */}
      <div className="bg-gray-200 py-4 px-8 flex justify-end">
        <button
          onClick={logout}
          className="text-red-600 hover:text-red-700 font-semibold text-base"
        >
          Sair | Deslogar
        </button>
      </div>
    </div>
  );
}
