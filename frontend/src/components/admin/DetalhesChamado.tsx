
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import ModalRedirecionarChamado from '@/app/admin/Modal/RedirecionarChamado';
import ModalAssumirChamado from '@/app/admin/Modal/AssumirChamado';
import ModalMarcarResolvido from '@/app/admin/Modal/MarcarResolvido';
import { Toaster, toast } from 'react-hot-toast';

interface Anexo {
  id: number;
  filename: string;
  url: string;
  signedUrl?: string | null;
  criadoEm: string;
}

interface Chamado {
  id: number;
  numeroChamado: number;
  resumoChamado: string;
  descricaoChamado: string;
  ramal: number;
  dataAbertura: string;
  dataFechamento: string | null;
  dataAtribuicao: string | null;
  usuario: {
    id: number;
    name: string;
    email: string;
  };
  userResponsavel: {
    id: number;
    name: string;
  } | null;
  userFechamento: {
    id: number;
    name: string;
  } | null;
  tipoPrioridade: {
    id: number;
    nome: string;
    cor: string;
  };
  departamento: {
    id: number;
    name: string;
  };
  topicoAjuda: {
    id: number;
    nome: string;
  };
  status: {
    id: number;
    nome: string;
  };
  anexos?: Anexo[];
}

interface Mensagem {
  id: number;
  mensagem: string;
  dataEnvio: string;
  usuario: {
    id: number;
    name: string;
  };
  anexos?: Anexo[];
}

interface Historico {
  id: number;
  acao: string;
  dataMov: string;
  usuario: {
    id: number;
    name: string;
  };
}

interface Usuario {
  id: number;
  name: string;
  email: string;
  roleId: number;
}

interface DetalhesChamadoProps {
  chamadoId: string;
}

export default function DetalhesChamado({ chamadoId }: DetalhesChamadoProps) {
  const router = useRouter();

  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'detalhes' | 'historico'>('detalhes');
  const [loading, setLoading] = useState(true);
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [usuarioLogadoId, setUsuarioLogadoId] = useState<number | null>(null);
  const [anexosResposta, setAnexosResposta] = useState<File[]>([]);
  const [isDraggingResposta, setIsDraggingResposta] = useState(false);
  // Estado do modal de redirecionamento
  const [modalRedirecionarAberto, setModalRedirecionarAberto] = useState(false);
  // Estado do modal de assumir chamado
  const [modalAssumirAberto, setModalAssumirAberto] = useState(false);
  // Estado do modal de marcar como resolvido
  const [modalResolvidoAberto, setModalResolvidoAberto] = useState(false);
  // Estado para animação de saída
  const [animandoSaida, setAnimandoSaida] = useState(false);
  // Estado para animação de entrada (slide-in)
  const [animandoEntrada, setAnimandoEntrada] = useState(true);
  // origem do transform (ex: '30% 20%') para efeito de expandir a partir do clique
  const [transformOrigin, setTransformOrigin] = useState<string | undefined>(undefined);

  useEffect(() => {
    carregarDados();
    carregarUsuarioLogado();
  }, [chamadoId]);

  // Auto-atualização do chat a cada 5 segundos
  useEffect(() => {
    // Só atualiza se estiver na aba de detalhes e nao estiver carregando
    if (abaAtiva !== 'detalhes' || loading) return;

    const intervalo = setInterval(() => {
      carregarMensagensEHistorico();
    }, 5000); // 5 segundos

    // Limpa o intervalo quando o componente é desmontado ou quando muda de aba
    return () => clearInterval(intervalo);
  }, [chamadoId, abaAtiva, loading]);

  const carregarMensagensEHistorico = async () => {
    try {
      const [mensagensRes, historicoRes] = await Promise.all([
        api.get(`/chamados/${chamadoId}/mensagens`),
        api.get(`/chamados/${chamadoId}/historico`),
      ]);

      setMensagens(mensagensRes.data);
      setHistorico(historicoRes.data);
    } catch (error) {
      console.error('Erro ao atualizar mensagens:', error);
      // nao mostra alert para nao interromper o usuario
    }
  };

  const carregarUsuarioLogado = () => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUsuarioLogadoId(payload.id);
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [chamadoRes, mensagensRes, historicoRes] = await Promise.all([
        api.get(`/chamados/${chamadoId}`),
        api.get(`/chamados/${chamadoId}/mensagens`),
        api.get(`/chamados/${chamadoId}/historico`),
      ]);

      setChamado(chamadoRes.data);
      setMensagens(mensagensRes.data);
      setHistorico(historicoRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar chamado', {
        style: {
          background: '#fff',
          color: '#dc2626',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#dc2626',
          secondary: '#fff',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const enviarMensagem = async () => {

    if (!chamado?.userResponsavel) {
      toast.error('Não é possível enviar resposta: o chamado ainda não possui um responsável.', {
        style: {
          background: '#fff',
          color: '#dc2626',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#dc2626',
          secondary: '#fff',
        },
      });
      return;
    }
    if (chamado.status.id === 3) {
      toast('Como esse chamado foi encerrado, se você responder agora ele será reaberto. Deseja continuar?', {
        duration: 5000,
        icon: '⚠️',
        style: {
          background: '#fff',
          color: '#f59e0b',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      });
      // Continua com o envio mesmo assim
    }
    if (!novaMensagem.trim()) {
      toast.error('Digite uma mensagem', {
        style: {
          background: '#fff',
          color: '#dc2626',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#dc2626',
          secondary: '#fff',
        },
      });
      return;
    }

    setEnviandoMensagem(true);
    try {
      // Primeiro, criar a mensagem
      const responseMensagem = await api.post(`/chamados/${chamadoId}/mensagens`, {
        mensagem: novaMensagem,
      });

      // Atualiza o chamado com o objeto atualizado retornado pelo backend
      if (responseMensagem.data.chamado) {
        setChamado(responseMensagem.data.chamado);
      }

      const mensagemId = responseMensagem.data.mensagem?.id || responseMensagem.data.id;

      // Se houver anexos, fazer upload vinculado à mensagem
      if (anexosResposta.length > 0 && mensagemId) {
        const formData = new FormData();
        anexosResposta.forEach((file) => {
          formData.append('arquivos', file);
        });

        await api.post(`/mensagem/${mensagemId}/anexo`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setNovaMensagem('');
      setAnexosResposta([]);
      await carregarMensagensEHistorico();
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao enviar mensagem';
      toast.error(mensagemErro, {
        style: {
          background: '#fff',
          color: '#dc2626',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#dc2626',
          secondary: '#fff',
        },
      });
    } finally {
      setEnviandoMensagem(false);
    }
  };

  const marcarComoResolvido = async () => {
    try {
      await api.put(`/chamados/${chamadoId}/encerrar`);
      toast.success('Chamado marcado como resolvido!', {
        style: {
          background: '#fff',
          color: '#16a34a',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#16a34a',
          secondary: '#fff',
        },
      });
      await carregarDados();
    } catch (error) {
      console.error('Erro ao resolver chamado:', error);
      toast.error('Erro ao resolver chamado');
    } finally {
      setModalResolvidoAberto(false);
    }
  };

  const assumirChamado = async () => {
    try {
      await api.put(`/chamados/${chamadoId}/assumir`);
      toast.success('Chamado assumido com sucesso!', {
        style: {
          background: '#fff',
          color: '#2563eb',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#2563eb',
          secondary: '#fff',
        },
      });
      await carregarDados();
    } catch (error: any) {
      console.error('Erro ao assumir chamado:', error);
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao assumir chamado';
      toast.error(mensagemErro);
    } finally {
      setModalAssumirAberto(false);
    }
  };

  const reabrirChamado = async () => {
    const confirmacao = window.confirm('Deseja reabrir este chamado? Você se tornará o responsável por ele.');
    if (!confirmacao) return;

    try {
      await api.put(`/chamados/${chamadoId}/reabrir`);
      toast.success('Chamado reaberto com sucesso!', {
        style: {
          background: '#fff',
          color: '#f97316',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#f97316',
          secondary: '#fff',
        },
      });
      await carregarDados();
    } catch (error: any) {
      console.error('Erro ao reabrir chamado:', error);
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao reabrir chamado';
      toast.error(mensagemErro, {
        style: {
          background: '#fff',
          color: '#dc2626',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#dc2626',
          secondary: '#fff',
        },
      });
    }
  };

  const abrirModalRedirecionar = () => {
    setModalRedirecionarAberto(true);
  };

  const fecharModalRedirecionar = () => {
    setModalRedirecionarAberto(false);
  };

  const handleRedirecionarChamado = async (usuarioSelecionado: number) => {
    try {
      await api.put(`/chamados/${chamadoId}/atribuir`, {
        userResponsavelId: usuarioSelecionado,
      });
      
      toast.success('Chamado redirecionado com sucesso!', {
        style: {
          background: '#fff',
          color: '#2563eb',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#2563eb',
          secondary: '#fff',
        },
      });
      await carregarDados();
    } catch (error: any) {
      console.error('Erro ao redirecionar chamado:', error);
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao redirecionar chamado';
      toast.error(mensagemErro, {
        style: {
          background: '#fff',
          color: '#dc2626',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#dc2626',
          secondary: '#fff',
        },
      });
      throw error;
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
        toast.error('Máximo de 5 arquivos permitidos.', {
          style: {
            background: '#fff',
            color: '#dc2626',
            fontWeight: 'bold',
            fontSize: '1rem',
            borderRadius: '0.75rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          },
          iconTheme: {
            primary: '#dc2626',
            secondary: '#fff',
          },
        });
        return;
      }
      setAnexosResposta(filesArray);
    }
  };

  const handleFileChangeResposta = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length > 5) {
        toast.error('Máximo de 5 arquivos permitidos.', {
          style: {
            background: '#fff',
            color: '#dc2626',
            fontWeight: 'bold',
            fontSize: '1rem',
            borderRadius: '0.75rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          },
          iconTheme: {
            primary: '#dc2626',
            secondary: '#fff',
          },
        });
        return;
      }
      setAnexosResposta(filesArray);
    }
  };

  const removeFileResposta = (index: number) => {
    setAnexosResposta((prev) => prev.filter((_, i) => i !== index));
  };

  const formatarData = (data: string) => {
    const date = new Date(data);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleVoltar = () => {
    // usar slideOutRight visual
    setAnimandoSaida(true);
    setTimeout(() => {
      router.back();
    }, 260); // aguarda slideOutRight (220ms) + folga
  };

  useEffect(() => {
    // lê origem (se foi definida ao clicar na lista) e remove flag de entrada após animação
    // lê origem (se foi definida ao clicar na lista)
    try {
      const raw = sessionStorage.getItem('detailOrigin');
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.x && obj.y) setTransformOrigin(`${obj.x} ${obj.y}`);
        sessionStorage.removeItem('detailOrigin');
      }
    } catch (err) {
      // ignore
    }

    const t = setTimeout(() => setAnimandoEntrada(false), 240);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (!chamado) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Chamado não encontrado</p>
      </div>
    );
  }

    return (
      <div
        className={`bg-gray-100 ${animandoEntrada ? 'slideInRight' : ''} ${animandoSaida ? 'slideOutRight' : ''}`}
        style={transformOrigin ? { transformOrigin } : undefined}
      >
      <Toaster position="top-right" />
      {/* Header */}
      <div className="bg-[#51A2FF] px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleVoltar}
            className="text-white hover:text-gray-200 transition flex items-center justify-center"
          >
            <img 
              src="/icons/arrowPointGerencial.svg" 
              alt="Voltar" 
              className="arrowIcon"
            />
          </button>
          <div>
            <h2 className="text-white text-2xl font-semibold">
              {chamado.resumoChamado}
            </h2>
            <p className="text-blue-100 text-sm">#{chamado.numeroChamado}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white border-b border-gray-300 px-6 py-3">
        <div className="flex gap-3">
          <button
            onClick={() => setModalResolvidoAberto(true)}
            disabled={chamado.status.id === 3}
            className="px-5 py-2 bg-transparent border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          >
            Marcar como Resolvido
          </button>
          <button
            onClick={abrirModalRedirecionar}
            disabled={chamado.status.id === 3}
            className="px-5 py-2 bg-transparent border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            Redirecionar
          </button>
          <button
            className="px-5 py-2 bg-transparent border border-gray-600 text-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
          >
            Editar
          </button>
          <button
            className="px-5 py-2 bg-transparent border border-gray-600 text-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
          >
            Imprimir
          </button>
          <button
            onClick={() => setModalAssumirAberto(true)}
            disabled={chamado.status.id === 3}
            className="px-5 py-2 bg-transparent border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            Assumir Chamado
          </button>
          <button
            onClick={reabrirChamado}
            disabled={chamado.status.id !== 3}
            className="px-5 py-2 bg-transparent border border-orange-600 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            Reabrir Chamado
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-300">
        <div className="px-6 flex gap-1">
          <button
            onClick={() => setAbaAtiva('detalhes')}
            className={`px-6 py-3 font-medium text-sm transition-all relative ${
              abaAtiva === 'detalhes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setAbaAtiva('historico')}
            className={`px-6 py-3 font-medium text-sm transition-all relative ${
              abaAtiva === 'historico'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {abaAtiva === 'detalhes' ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Dados */}
            <div className="col-span-4 space-y-6">
              {/* Dados do Chamado */}
              <div className="bg-white rounded-lg border border-gray-300 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">
                  Dados do chamado
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          chamado.status.id === 1
                            ? 'bg-yellow-100 text-yellow-800'
                            : chamado.status.id === 2
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {chamado.status.nome}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Usuario responsável</label>
                    <p className="text-gray-900 mt-1">
                      {chamado.userResponsavel?.name || 'Não atribuído'}
                      {chamado.userResponsavel?.id === usuarioLogadoId && (
                        <span className="ml-2 text-blue-600 font-medium">(Você)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Departamento</label>
                    <p className="text-gray-900 mt-1">{chamado.departamento.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Criado em</label>
                    <p className="text-gray-900 mt-1">{formatarData(chamado.dataAbertura)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Prioridade</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="prioridadeDot"
                        style={{ backgroundColor: chamado.tipoPrioridade.cor }}
                      />
                      <span className="text-gray-900">{chamado.tipoPrioridade.nome}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tópico de ajuda</label>
                    <p className="text-gray-900 mt-1">{chamado.topicoAjuda.nome}</p>
                  </div>
                </div>
              </div>

              {/* Dados do Usuario */}
              <div className="bg-white rounded-lg border border-gray-300 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">
                  Dados do usuário
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nome usuário</label>
                    <p className="text-gray-900 mt-1">{chamado.usuario.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">E-mail</label>
                    <p className="text-blue-600 mt-1">{chamado.usuario.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Ramal</label>
                    <p className="text-gray-900 mt-1">{chamado.ramal}</p>
                  </div>
                </div>
              </div>

              {/* Outros Dados */}
              <div className="bg-white rounded-lg border border-gray-300 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">
                  Outros Dados
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Responsável pelo chamado</label>
                    <p className="text-gray-900 mt-1">
                      {chamado.userResponsavel?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Data atribuição</label>
                    <p className="text-gray-900 mt-1">
                      {chamado.dataAtribuicao ? formatarData(chamado.dataAtribuicao) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Data conclusão</label>
                    <p className="text-gray-900 mt-1">
                      {chamado.dataFechamento ? formatarData(chamado.dataFechamento) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Usuário que concluiu</label>
                    <p className="text-gray-900 mt-1">
                      {chamado.userFechamento?.name || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Mensagens */}
            <div className="col-span-8">
              <div className="bg-white rounded-lg border border-gray-300">
                {/* Mensagem inicial do usuário */}
                <div className="p-5 border-b border-gray-200 bg-green-50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                      <span className="text-green-700 font-semibold text-sm">
                        {chamado.usuario.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{chamado.usuario.name}</span>
                        <span className="text-sm text-gray-500">{formatarData(chamado.dataAbertura)}</span>
                      </div>
                      <div className="text-gray-700 whitespace-pre-wrap">{chamado.descricaoChamado}</div>
                      
                      {/* Anexos da descrição inicial */}
                      {chamado.anexos && chamado.anexos.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-sm font-medium text-gray-600 mb-2">Anexos:</p>
                          <div className="flex flex-wrap gap-2">
                            {chamado.anexos.map((anexo) => {
                              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo.filename);
                              const fileUrl = anexo.signedUrl || '#';
                              
                              return (
                                <a
                                  key={anexo.id}
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-white border border-green-300 rounded hover:bg-green-100 transition text-sm"
                                >
                                  {isImage ? (
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                  <span className="text-green-700 max-w-[200px] truncate">
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
                </div>

                {/* Lista de Mensagens */}
                <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
                  {mensagens.map((msg) => {
                    const isUsuarioChamado = msg.usuario.id === chamado.usuario.id;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isUsuarioChamado ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            isUsuarioChamado ? 'bg-gray-100' : 'bg-blue-50'
                          } rounded-lg p-4`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 text-sm">
                              {msg.usuario.name}
                            </span>
                            <span className="text-xs text-gray-500">{formatarData(msg.dataEnvio)}</span>
                          </div>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{msg.mensagem}</p>
                          
                          {/* Anexos da mensagem */}
                          {msg.anexos && msg.anexos.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {msg.anexos.map((anexo) => {
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo.filename);
                                const fileUrl = anexo.signedUrl || '#';
                                
                                return (
                                  <a
                                    key={anexo.id}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-400 transition text-xs group"
                                  >
                                    {isImage ? (
                                      <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    )}
                                    <span className="text-gray-700 group-hover:text-blue-700 truncate flex-1">
                                      {anexo.filename}
                                    </span>
                                    <svg className="w-3 h-3 text-gray-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Campo de Resposta */}
                <div className="p-5 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postar uma resposta
                  </label>
                  <textarea
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
                  />
                  
                  {/* Área de Upload de Arquivos */}
                  <div
                    className={`mt-3 border-2 border-dashed rounded-lg p-4 text-center transition ${
                      isDraggingResposta
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                    onDragOver={handleDragOverResposta}
                    onDragLeave={handleDragLeaveResposta}
                    onDrop={handleDropResposta}
                  >
                    <input
                      type="file"
                      id="file-upload-resposta"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      onChange={handleFileChangeResposta}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload-resposta"
                      className="cursor-pointer text-sm text-gray-600"
                    >
                      Arraste os arquivos aqui ou{' '}
                      <span className="text-blue-600 hover:text-blue-700 font-medium">
                        clique para selecionar
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Máximo 5 arquivos, 10MB cada
                      </p>
                    </label>
                  </div>

                  {/* Lista de Arquivos Selecionados */}
                  {anexosResposta.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Arquivos selecionados ({anexosResposta.length}/5):
                      </p>
                      {anexosResposta.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded"
                        >
                          <span className="text-sm text-gray-700 truncate flex-1">
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                          <button
                            onClick={() => removeFileResposta(index)}
                            className="ml-2 text-red-500 hover:text-red-700 font-medium text-sm"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end mt-3">
                    <button
                      onClick={enviarMensagem}
                      disabled={enviandoMensagem || !novaMensagem.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {enviandoMensagem ? 'Enviando...' : 'Publicar resposta'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">
              Histórico do Chamado
            </h3>
            <div className="space-y-4">
              {historico.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-2" />
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{item.acao}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">{item.usuario.name}</span>
                      <span className="text-sm text-gray-500">• {formatarData(item.dataMov)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Redirecionamento */}
      <ModalRedirecionarChamado
        isOpen={modalRedirecionarAberto}
        onClose={fecharModalRedirecionar}
        onConfirm={handleRedirecionarChamado}
        chamadoId={chamadoId}
      />
      {/* Modal de Assumir Chamado */}
      <ModalAssumirChamado
        isOpen={modalAssumirAberto}
        onConfirm={assumirChamado}
        onClose={() => setModalAssumirAberto(false)}
      />
      {/* Modal de Marcar como Resolvido */}
      <ModalMarcarResolvido
        isOpen={modalResolvidoAberto}
        onConfirm={marcarComoResolvido}
        onClose={() => setModalResolvidoAberto(false)}
      />
    </div>
  );
}
