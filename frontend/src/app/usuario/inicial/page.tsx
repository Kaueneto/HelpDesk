





'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import ModalEditarChamadoUsuario from '@/components/usuario/ModalEditarChamadoUsuario';

interface AnexoMensagem {
  id: number;
  filename: string;
  url: string;
  signedUrl?: string | null;
  criadoEm: string;
}

interface MensagemUsuario {
  id: number;
  mensagem: string;
  dataEnvio: string;
  usuario?: {
    id: number;
    name: string;
    roleId?: number;
  };
  anexos?: AnexoMensagem[];
}

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

export default function DashboardPage() {
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

  // Estados para acompanhar chamados
  const [chamados, setChamados] = useState<any[]>([]);
  const [loadingChamados, setLoadingChamados] = useState(false);
  const [statusList, setStatusList] = useState<any[]>([]);
  const [filtroAssunto, setFiltroAssunto] = useState('');
  const [filtroTopicoId, setFiltroTopicoId] = useState<number>(0);
  const [filtroStatusId, setFiltroStatusId] = useState<number>(0);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  // Estados para detalhes do chamado
  const [chamadoSelecionado, setChamadoSelecionado] = useState<any>(null);
  const [mensagens, setMensagens] = useState<MensagemUsuario[]>([]);
  const [anexosChamado, setAnexosChamado] = useState<any[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [detalheTab, setDetalheTab] = useState<'detalhes' | 'historico'>('detalhes');
  const [novaMensagem, setNovaMensagem] = useState('');
  const [anexosResposta, setAnexosResposta] = useState<File[]>([]);
  const [isDraggingResposta, setIsDraggingResposta] = useState(false);
  const [submittingResposta, setSubmittingResposta] = useState(false);
  
  // Estado do modal de edição
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  
  // Estado do dropdown do usuário
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  // Estado da tela de configurações
  const [mostrarConfiguracoes, setMostrarConfiguracoes] = useState(false);
  const [alterarSenhaAberto, setAlterarSenhaAberto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [submittingSenha, setSubmittingSenha] = useState(false);
  const [errorSenha, setErrorSenha] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (userDropdownOpen && !target.closest('.relative')) {
        setUserDropdownOpen(false);
      }
    };

    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

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
    fetchData();
  }, []);

  // Carregar status quando entrar na aba acompanhar
  useEffect(() => {
    if (activeTab === 'acompanhar' && isAuthenticated) {
      const fetchStatus = async () => {
        try {
          const statusRes = await api.get('/status');
          setStatusList(statusRes.data);
        } catch (error) {
          console.error('Erro ao carregar status:', error);
        }
      };
      fetchStatus();
      buscarChamados();
    }
  }, [activeTab, isAuthenticated]);

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

  const buscarChamados = async (pagina: number = 1) => {
    setLoadingChamados(true);
    try {
      const params: any = {
        page: pagina,
        pageSize: 10,
      };
      
      if (filtroAssunto) params.assunto = filtroAssunto;
      if (filtroTopicoId > 0) params.topicoAjudaId = filtroTopicoId;
      if (filtroStatusId > 0) params.statusId = filtroStatusId;

      const response = await api.get('/chamados', { params });
      
      if (response.data.chamados) {
        setChamados(response.data.chamados);
        setTotalPaginas(response.data.totalPages || 1);
        setPaginaAtual(pagina);
      } else {
        setChamados(response.data);
        const total = Math.ceil(response.data.length / 10);
        setTotalPaginas(total || 1);
        setPaginaAtual(pagina);
      }
    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
      setErrorMessage('Erro ao carregar chamados.');
    } finally {
      setLoadingChamados(false);
    }
  };

  const handlePesquisar = () => {
    buscarChamados(1);
  };

  const handleChamadoClick = async (chamado: any) => {
    setChamadoSelecionado(chamado);
    setDetalheTab('detalhes');
    await buscarDetalhesChamado(chamado.id);
    await buscarMensagens(chamado.id);
  };

  const buscarDetalhesChamado = async (chamadoId: number) => {
    try {
      const response = await api.get(`/chamados/${chamadoId}`);
      setChamadoSelecionado(response.data);
      setAnexosChamado(response.data.anexos || []);
    } catch (error) {
      console.error('Erro ao buscar detalhes do chamado:', error);
    }
  };

  const buscarMensagens = async (chamadoId: number) => {
    setLoadingMensagens(true);
    try {
      const response = await api.get(`/chamados/${chamadoId}/mensagens`);
      console.log('📨 Mensagens recebidas:', response.data);
      response.data.forEach((msg: any, idx: number) => {
        console.log(`  Mensagem ${idx + 1}: ID=${msg.id}, Anexos=${msg.anexos?.length || 0}`);
        if (msg.anexos && msg.anexos.length > 0) {
          msg.anexos.forEach((anexo: any) => {
            console.log(`    - Anexo: ${anexo.filename} (ID=${anexo.id})`);
          });
        }
      });
      setMensagens(response.data);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setLoadingMensagens(false);
    }
  };

  // Função leve para atualizar apenas as mensagens (sem loading state)
  const atualizarMensagensSilencioso = async (chamadoId: number) => {
    try {
      const response = await api.get(`/chamados/${chamadoId}/mensagens`);
      setMensagens(response.data);
    } catch (error) {
      console.error('Erro ao atualizar mensagens:', error);
    }
  };

  // Auto-atualização das mensagens a cada 5 segundos
  useEffect(() => {
    // Só atualiza se há um chamado selecionado, está na aba detalhes e não está carregando
    if (!chamadoSelecionado || detalheTab !== 'detalhes' || loadingMensagens) return;

    const intervalo = setInterval(() => {
      atualizarMensagensSilencioso(chamadoSelecionado.id);
    }, 5000); // 5 segundos

    // Limpa o intervalo quando o componente desmonta ou muda de aba
    return () => clearInterval(intervalo);
  }, [chamadoSelecionado, detalheTab, loadingMensagens]);

  const handleVoltarLista = () => {
    setChamadoSelecionado(null);
    setMensagens([]);
    setAnexosChamado([]);
    setNovaMensagem('');
    setAnexosResposta([]);
  };

  const handlePublicarResposta = async () => {
    if (!novaMensagem.trim()) {
      setErrorMessage('Por favor, escreva uma mensagem.');
      return;
    }

    setSubmittingResposta(true);
    setErrorMessage('');

    try {
      console.log('📤 Enviando mensagem...');
      // Primeiro, criar a mensagem
      const response = await api.post(`/chamados/${chamadoSelecionado.id}/mensagens`, {
        mensagem: novaMensagem,
      });

      const mensagemId = response.data.id;
      console.log('✅ Mensagem criada com ID:', mensagemId);

      // Se houver anexos, fazer upload vinculado à mensagem
      if (anexosResposta.length > 0 && mensagemId) {
        console.log(`📎 Enviando ${anexosResposta.length} anexo(s) para mensagem ${mensagemId}...`);
        const formData = new FormData();
        anexosResposta.forEach((file) => {
          formData.append('arquivos', file);
          console.log(`  - Arquivo: ${file.name}`);
        });

        const uploadResponse = await api.post(`/mensagem/${mensagemId}/anexo`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('✅ Anexos enviados:', uploadResponse.data);
      }

      // Limpar formulário e recarregar mensagens
      setNovaMensagem('');
      setAnexosResposta([]);
      console.log('🔄 Recarregando mensagens...');
      await buscarMensagens(chamadoSelecionado.id);
    } catch (error: any) {
      console.error('❌ Erro ao publicar resposta:', error);
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
    // Converter para horário de Brasília (UTC-3)
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

      // Se houver arquivos, fazer upload direto no chamado (SEM criar mensagem)
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
      setPrioridadeId(3);
      setTopicoAjudaId(0);
      setDepartamentoId(0);
      setResumoChamado('');
      setDescricaoChamado('');
      setErrorMessage('');
      setActiveTab('home');
    }
  };

  const handleAlterarSenha = async () => {
    setErrorSenha('');

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErrorSenha('Todos os campos são obrigatórios');
      return;
    }

    if (novaSenha.length < 6) {
      setErrorSenha('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErrorSenha('A nova senha e a confirmação não coincidem');
      return;
    }

    setSubmittingSenha(true);

    try {
      await api.put('/users/alterar-minha-senha', {
        senhaAtual,
        novaSenha,
      });

      alert('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setAlterarSenhaAberto(false);
    } catch (error: any) {
      const mensagem = error.response?.data?.mensagem || 'Erro ao alterar senha';
      setErrorSenha(mensagem);
    } finally {
      setSubmittingSenha(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Se for admin (roleId = 1), mostra tela de admin
  if (user.roleId === 1) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
                <p className="text-gray-600 mt-2">Bem-vindo, {user.name}</p>
              </div>
              <button
                onClick={logout}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Sair
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6 text-center border-2 border-blue-200">
                <div className="text-4xl font-bold text-blue-600 mb-2">0</div>
                <div className="text-sm font-medium text-gray-700">Chamados Abertos</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-6 text-center border-2 border-yellow-200">
                <div className="text-4xl font-bold text-yellow-600 mb-2">0</div>
                <div className="text-sm font-medium text-gray-700">Em Atendimento</div>
              </div>
              <div className="bg-green-50 rounded-lg p-6 text-center border-2 border-green-200">
                <div className="text-4xl font-bold text-green-600 mb-2">0</div>
                <div className="text-sm font-medium text-gray-700">Encerrados</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Gerenciar Usuários</h3>
                <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                  Ver Usuários
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Todos os Chamados</h3>
                <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                  Ver Chamados
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela de usuário comum
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Container principal */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Central de chamados</h1>
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-700 font-medium">{user.name}</span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">Usuário Comum</p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Email:</span> {user.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">ID:</span> {user.id}
                      </p>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setMostrarConfiguracoes(true);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configurações
                    </button>
                  </div>
                  <div className="border-t border-gray-200">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tela de Configurações com transição (drawer lateral) */}
          <div className={`fixed inset-0 z-40 ${mostrarConfiguracoes ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            {/* Overlay escuro clicável */}
            <div
              className={`absolute inset-0 bg-black transition-opacity duration-300 ${mostrarConfiguracoes ? 'opacity-30' : 'opacity-0'}`}
              onClick={() => setMostrarConfiguracoes(false)}
            />

            {/* Painel lateral */}
            <div className={`absolute top-0 right-0 h-full w-full md:w-[900px] bg-white shadow-xl transition-transform duration-300 ease-in-out ${
              mostrarConfiguracoes ? 'translate-x-0' : 'translate-x-full'
            }`}>
              <div className="h-full flex flex-col">
                {/* Header da tela de configurações */}
                <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4">
                  <button
                    onClick={() => {
                      setMostrarConfiguracoes(false);
                      setAlterarSenhaAberto(false);
                      setSenhaAtual('');
                      setNovaSenha('');
                      setConfirmarSenha('');
                      setErrorSenha('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
                </div>

                {/* Conteúdo das configurações */}
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex flex-row gap-8 items-start">
                      {/* Dados do Usuário */}
                      <div className="bg-white border border-gray-300 rounded-lg p-6 flex-1 min-w-[320px]">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Seus Dados</h2>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                            <input
                              type="text"
                              value={user.id}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                            <input
                              type="text"
                              value={user.name}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                              type="email"
                              value={user.email}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Botão de alterar senha */}
                      <div className="flex flex-col flex-shrink-0 min-w-[340px] max-w-[400px] w-full">
                        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setAlterarSenhaAberto(!alterarSenhaAberto)}
                            className="w-full px-6 py-4 flex items-center justify-between bg-blue-500 hover:bg-blue-600 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              <span className="text-white font-medium text-lg">Alterar sua Senha</span>
                            </div>
                            <svg className={`w-5 h-5 text-white transition-transform ${alterarSenhaAberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Formulário de alteração de senha (expansível) */}
                          <div className={`transition-all duration-300 ease-in-out ${
                            alterarSenhaAberto ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                          }`}>
                            <div className="p-6 space-y-4 bg-gray-50">
                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Senha atual</label>
                                <input
                                  type="password"
                                  value={senhaAtual}
                                  onChange={(e) => setSenhaAtual(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Digite sua senha atual"
                                  disabled={submittingSenha}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Nova senha</label>
                                <input
                                  type="password"
                                  value={novaSenha}
                                  onChange={(e) => setNovaSenha(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Digite a nova senha"
                                  disabled={submittingSenha}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Confirmar Nova Senha</label>
                                <input
                                  type="password"
                                  value={confirmarSenha}
                                  onChange={(e) => setConfirmarSenha(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Confirme a nova senha"
                                  disabled={submittingSenha}
                                />
                              </div>

                              {errorSenha && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                                  {errorSenha}
                                </div>
                              )}

                              <button
                                onClick={handleAlterarSenha}
                                disabled={submittingSenha}
                                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {submittingSenha ? 'Alterando...' : 'Confirmar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs de Navegação */}
          <div className="px-8 py-4">
            <div className="inline-flex items-center justify-center rounded-lg bg-gray-200 p-1 text-gray-500 w-full" role="tablist">
              <button
                type="button"
                role="tab"
                onClick={() => setActiveTab('home')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2.5 text-base font-medium transition-all duration-200 flex-1 ${
                  activeTab === 'home'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <img src="/icons/iconhome.svg" alt="Home" className="w-4 h-4 mr-2" />
                Pagina Inicial
              </button>
              <button
                type="button"
                role="tab"
                onClick={() => setActiveTab('novo')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2.5 text-base font-medium transition-all duration-200 flex-1 ${
                  activeTab === 'novo'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <img src="/icons/iconabrirnovochamado.svg" alt="Abrir Chamado" className="w-4 h-4 mr-2" />
                Abrir novo Chamado
              </button>
              <button
                type="button"
                role="tab"
                onClick={() => setActiveTab('acompanhar')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2.5 text-base font-medium transition-all duration-200 flex-1 ${
                  activeTab === 'acompanhar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <img src="/icons/iconacompanhar.svg" alt="Acompanhar" className="w-4 h-4 mr-2" />
                Acompanhar Chamado
              </button>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1 px-20 py-1 flex-col overflow-y-auto">
            {activeTab === 'home' && (
              <div className="flex flex-col h-full">
                <div className="mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-5">Bem vindo!</h2>
                  <p className="text-xl text-gray-700">Escolha uma opção</p>
                </div>

                <div className="flex-1 flex flex-col justify-start items-center gap-6 max-w-md mx-auto w-full mr-2 pb-15">
              


                  <button
                    onClick={() => setActiveTab('novo')}
                    className="w-full px-12 py-7 bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-md transition flex items-center justify-center gap-3"
                  >
                    <span className="text-2xl">+</span>
                    <span>Abrir novo chamado</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('acompanhar')}
                    className="w-full px-12 py-7 bg-green-800 hover:bg-green-900 text-white text-lg font-semibold rounded-lg shadow-md transition"
                  >
                    <div>Verificar andamento</div>
                    <div>do chamado</div>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'novo' && (
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
                        value={user?.email || ''}
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
                      <label className="block text-sm font-bold text-gray-900 mb-1">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-[#DFDFDF] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
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
                                                               {/* altura do botao diante as bordas */}
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
            )}

            {activeTab === 'acompanhar' && (
              <div>
                {!chamadoSelecionado ? (
                  <>
                    {/* Filtros */}
                    <div className="bg-gray-200 p-6 rounded-lg mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Assunto
                          </label>
                          <input
                            type="text"
                            value={filtroAssunto}
                            onChange={(e) => setFiltroAssunto(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Buscar por assunto..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Tópico de ajuda
                          </label>
                          <select
                            value={filtroTopicoId}
                            onChange={(e) => setFiltroTopicoId(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={0}>Todos</option>
                            {topicos.map((topico) => (
                              <option key={topico.id} value={topico.id}>
                                {topico.nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Status
                          </label>
                          <select
                            value={filtroStatusId}
                            onChange={(e) => setFiltroStatusId(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={0}>Todos</option>
                            {statusList.map((status) => (
                              <option key={status.id} value={status.id}>
                                {status.descricaoStatus}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={handlePesquisar}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition"
                        >
                          Pesquisar
                        </button>
                      </div>
                    </div>

                    {/* Seus chamados */}
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Seus chamados</h2>

                    {loadingChamados ? (
                      <div className="text-center py-8 text-gray-600">Carregando...</div>
                    ) : chamados.length === 0 ? (
                      <div className="text-center py-8 text-gray-600">Nenhum chamado encontrado.</div>
                    ) : (
                      <>
                        {/* Tabela */}
                        <div className="overflow-x-auto border border-gray-300 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Núm.Ticket
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Prioridade
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Data Criação
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Tópico ajuda
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Departamento
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Assunto
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {chamados.slice((paginaAtual - 1) * 10, paginaAtual * 10).map((chamado) => (
                                <tr 
                                  key={chamado.id} 
                                  className="hover:bg-gray-50 cursor-pointer"
                                  onClick={() => handleChamadoClick(chamado)}
                                >
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                                    {chamado.numeroChamado || chamado.id}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: chamado.tipoPrioridade?.cor || '#999' }}
                                        title={chamado.tipoPrioridade?.nome}
                                      />
                                      <span className="text-gray-900">{chamado.tipoPrioridade?.nome}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {formatarDataBrasilia(chamado.dataAbertura)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {chamado.topicoAjuda?.nome}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {chamado.departamento?.name}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {chamado.status?.nome}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={chamado.resumoChamado}>
                                    {chamado.resumoChamado}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Paginação */}
                        {totalPaginas > 1 && (
                          <div className="flex justify-center items-center gap-2 mt-6">
                            <button
                              onClick={() => buscarChamados(paginaAtual - 1)}
                              disabled={paginaAtual === 1}
                              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Anterior
                            </button>
                            
                            <span className="text-sm text-gray-700">
                              Página {paginaAtual} de {totalPaginas}
                            </span>
                            
                            <button
                              onClick={() => buscarChamados(paginaAtual + 1)}
                              disabled={paginaAtual === totalPaginas}
                              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Próxima
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  /* Detalhes do Chamado */
                  <div>
                    {/* Cabeçalho com informações do chamado */}
                    <div className="bg-white border-b border-gray-200 pb-4 mb-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-blue-600 mb-2">
                            {chamadoSelecionado.resumoChamado} <span className="text-gray-500 text-lg">#{chamadoSelecionado.numeroChamado || chamadoSelecionado.id}</span>
                          </h2>
                          <p className="text-sm text-gray-600 mb-4">Informações sobre o ticket</p>
                          
                          <div className="grid grid-cols-5 gap-6">
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">Status</p>
                              <p className="text-sm font-bold" style={{ color: chamadoSelecionado.status?.id === 1 ? '#2563eb' : '#059669' }}>
                                {chamadoSelecionado.status?.descricaoStatus || chamadoSelecionado.status?.nome}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">Departamento</p>
                              <p className="text-sm font-bold text-blue-600">
                                {chamadoSelecionado.departamento?.name}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">Criado em</p>
                              <p className="text-sm font-bold text-blue-600">
                                {formatarDataBrasilia(chamadoSelecionado.dataAbertura)}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">Prioridade</p>
                              <p className="text-sm font-bold" style={{ color: chamadoSelecionado.tipoPrioridade?.cor }}>
                                {chamadoSelecionado.tipoPrioridade?.nome}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">Tópico de ajuda</p>
                              <p className="text-sm text-gray-900">
                                {chamadoSelecionado.topicoAjuda?.nome}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={handleVoltarLista}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Voltar
                          </button>
                          <button 
                            onClick={() => setModalEditarAberto(true)}
                            className="px-4 py-2 bg-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-300"
                          >
                            Editar
                          </button>
                          <button className="px-4 py-2 bg-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-300">
                            imprimir
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Descrição do Problema (separada das mensagens) */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Descrição do Problema</h3>
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {chamadoSelecionado.descricaoChamado}
                        </p>
                        
                        {/* Anexos do chamado inicial */}
                        {anexosChamado.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-blue-300">
                            <p className="text-sm font-medium text-gray-700 mb-2">Anexos:</p>
                            <div className="flex flex-wrap gap-2">
                              {anexosChamado.map((anexo: any) => {
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo.filename);
                                const fileUrl = anexo.signedUrl || '#';
                                
                                return (
                                  <a
                                    key={anexo.id}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-400 rounded hover:bg-blue-100 transition text-sm"
                                  >
                                    {isImage ? (
                                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    )}
                                    <span className="text-blue-800 max-w-[200px] truncate">
                                      {anexo.filename}
                                    </span>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                      
                    {/* Tabs Detalhes/Histórico */}
                    <div className="bg-white border-b border-gray-200">
                      <div className="flex gap-4 border-b border-gray-300">
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

                    {/* Conteúdo das tabs com animação */}
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
                              {/* Mensagens do chat */}
                              <div className="space-y-4 mb-6 mt-6">
                                {mensagens.length === 0 ? (
                                  <div className="text-center py-8 text-gray-500">
                                    Nenhuma mensagem ainda.
                                  </div>
                                ) : (
                                  mensagens.map((msg) => {
                                    // Debug: verificar anexos da mensagem
                                    if (msg.anexos && msg.anexos.length > 0) {
                                      console.log(`💬 Renderizando mensagem ${msg.id} com ${msg.anexos.length} anexo(s)`);
                                    }
                                    
                                    return (
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
                                          {msg.usuario?.name}
                                        </p>
                                        <span className="text-sm text-gray-600">
                                          {formatarDataBrasilia(msg.dataEnvio)}
                                        </span>
                                      </div>
                                      <p className="text-gray-800 whitespace-pre-wrap">{msg.mensagem}</p>
                                      
                                      {/* Anexos da mensagem */}
                                      {msg.anexos && msg.anexos.length > 0 && (
                                        <div className="mt-3 space-y-1">
                                          <p className="text-xs font-medium text-gray-600 mb-1">
                                            📎 {msg.anexos.length} anexo(s):
                                          </p>
                                          {msg.anexos.map((anexo: any) => {
                                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo.filename);
                                            const fileUrl = anexo.signedUrl || '#';
                                            
                                            return (
                                              <a
                                                key={anexo.id}
                                                href={fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-300 rounded hover:bg-green-50 hover:border-green-400 transition text-xs group"
                                              >
                                                {isImage ? (
                                                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                  </svg>
                                                ) : (
                                                  <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                  </svg>
                                                )}
                                                <span className="text-gray-700 group-hover:text-green-700 truncate flex-1">
                                                  {anexo.filename}
                                                </span>
                                                <svg className="w-3 h-3 text-gray-400 group-hover:text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                              </a>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )})
                                )}
                              </div>

                              {/* Campo para postar resposta */}
                              <div className="border border-gray-300 rounded-lg p-4 bg-white mt-4">
                                <h3 className="font-semibold text-gray-900 mb-2">Postar uma resposta</h3>
                                <p className="text-sm text-gray-600 mb-4">Para melhor ajudá-lo, seja específico e detalhado.</p>
                                
                                <textarea
                                  value={novaMensagem}
                                  onChange={(e) => setNovaMensagem(e.target.value)}
                                  rows={6}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y mb-4 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé fixo */}
      <div className="bg-gray-100 py-4 text-center">
        <button
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="text-red-600 hover:text-red-700 font-bold text-sm"
        >
          Sair | Deslogar
        </button>
      </div>

      {/* Modal de Edição */}
      {chamadoSelecionado && (
        <ModalEditarChamadoUsuario
          isOpen={modalEditarAberto}
          onClose={() => setModalEditarAberto(false)}
          onSuccess={async () => {
            await buscarDetalhesChamado(chamadoSelecionado.id);
            await buscarChamados();
          }}
          chamadoId={chamadoSelecionado.id}
          dadosIniciais={{
            resumoChamado: chamadoSelecionado.resumoChamado,
            descricaoChamado: chamadoSelecionado.descricaoChamado,
            ramal: chamadoSelecionado.ramal,
            departamentoId: chamadoSelecionado.departamento?.id || 0,
            topicoAjudaId: chamadoSelecionado.topicoAjuda?.id || 0,
            prioridadeId: chamadoSelecionado.tipoPrioridade?.id || 0,
            statusId: chamadoSelecionado.status?.id || 0,
            anexos: chamadoSelecionado.anexos || [],
          }}
        />
      )}
    </div>
  );
}
