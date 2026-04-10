
'use client';

import { useState, useEffect } from 'react';

import { MdEmail } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import ModalRedirecionarChamado from '@/app/admin/Modal/RedirecionarChamado';
import ModalAssumirChamado from '@/app/admin/Modal/AssumirChamado';
import ModalMarcarResolvido from '@/app/admin/Modal/MarcarResolvido';
import ModalImprimirChamado from '@/app/admin/Modal/ModalImprimirChamado';
import ModalEnviarAttPorEmail from '@/app/admin/Modal/EnviarAttPorEmail';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

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
  vezesreaberto: number;
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
  enviadoPorEmail?: boolean;
  email_enviado?: string;
  email_copia?: string;
  email_copia_oculta?: string;
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();

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
  // Estado do modal de impressão
  const [modalImprimirAberto, setModalImprimirAberto] = useState(false);
  // Estado do modal de envio de email
  const [modalEmailAberto, setModalEmailAberto] = useState(false);
  // Estado para animação de saída
  const [animandoSaida, setAnimandoSaida] = useState(false);
  // Estado para animação de entrada (slide-in)
  const [animandoEntrada, setAnimandoEntrada] = useState(true);
  // origem do transform (ex: '30% 20%') para efeito de expandir a partir do clique
  const [transformOrigin, setTransformOrigin] = useState<string | undefined>(undefined);

  useEffect(() => {
    // só  carregar dados se estiver autenticado
    if (authLoading) return;
    if (!isAuthenticated) return;
    
    carregarDados();
    carregarUsuarioLogado();
  }, [chamadoId, isAuthenticated, authLoading]);

  // Auto-atualização do chat a cada 5 segundos
  useEffect(() => {
    // só atualiza se estiver autenticado, na aba de detalhes e não estiver carregando
    if (!isAuthenticated || abaAtiva !== 'detalhes' || loading) return;

    const intervalo = setInterval(() => {
      carregarMensagensEHistorico();
    }, 5000); // 5 segundos

    // Limpa o intervalo quando o componente é desmontado ou quando muda de aba
    return () => clearInterval(intervalo);
  }, [chamadoId, abaAtiva, loading, isAuthenticated]);

  const carregarMensagensEHistorico = async () => {
    if (!isAuthenticated) return; // Proteção adicional
    
    try {
      const [mensagensRes, historicoRes] = await Promise.all([
        api.get(`/chamados/${chamadoId}/mensagens`),
        api.get(`/chamados/${chamadoId}/historico`),
      ]);

      setMensagens(mensagensRes.data);
      setHistorico(historicoRes.data);
    } catch (error) {

      // nao mostra alert para nao interromper o usuario
    }
  };

  const carregarUsuarioLogado = () => {
    // obter id do usuário do contexto de autenticação
    if (user?.id) {
      setUsuarioLogadoId(user.id);
    }
  };

  const carregarDados = async () => {
    if (!isAuthenticated) return; // protecao adicional
    
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

  const abrirModalEmail = () => {
    setModalEmailAberto(true);
  };

  const fecharModalEmail = () => {
    setModalEmailAberto(false);
  };

  const handleEnviarEmail = async (dados: {
    destinatario: string;
    mensagem: string;
    statusId?: number;
    cc?: string;
    cco?: string;
    incluirTopico?: boolean;
  }) => {
    try {
      const payload: any = {
        destinatario: dados.destinatario,
        mensagem: dados.mensagem,
        cc: dados.cc,
        cco: dados.cco,
        statusId: dados.statusId,
        incluirTopico: dados.incluirTopico,
      };
      await api.post(`/chamados/${chamadoId}/enviar-atualizacao-email`, payload);
      toast.success('Email enviado com sucesso!', {
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
      // recarregar dados para atualizar status se foi alterado
      if (dados.statusId) {
        await carregarDados();
      }
    } catch (error: any) {
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao enviar email';
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
        anexosResposta.forEach((file, index) => {
          formData.append('arquivos', file);
        });

        try {
          const responseAnexos = await api.post(`/mensagem/${mensagemId}/anexo`, formData);
        } catch (anexoError: any) {
          // se o upload de anexos falhar, ainda mostra que a mensagem foi enviada
          toast.error('Mensagem enviada, mas houve erro no envio dos anexos. Tente novamente.', {
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
      } else if (anexosResposta.length > 0 && !mensagemId) {
        toast.error('Mensagem enviada, mas não foi possível processar os anexos.', {
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

      setNovaMensagem('');
      setAnexosResposta([]);
      await carregarMensagensEHistorico();
      
      toast.success('Resposta enviada com sucesso!', {
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
    } catch (error: any) {
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
 
      toast.error('Erro ao resolver chamado');
    } finally {
      setModalResolvidoAberto(false);
    }
  };

  const assumirChamado = async () => {
    try {
      await api.put(`/chamados/${chamadoId}/assumir`);
      toast.success('Chamado atribuido com sucesso!', {
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
    
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao assumir chamado';
      toast.error(mensagemErro);
    } finally {
      setModalAssumirAberto(false);
    }
  };

  const handleAssumirChamado = () => {
    //verificar se o usuario logado ja é o responsavel pelo chamado
    if (chamado?.userResponsavel?.id === usuarioLogadoId) {
      toast('Você já é o responsável por este chamado.', {
        style: {
          background: '#fff',
          color: '#3b82f6',
          fontWeight: 'bold',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      });
      return;
    }

    // se nao for o responsável abrir modal de confirmação
    setModalAssumirAberto(true);
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

  const handleImprimirChamado = (incluirConversa: boolean, incluirHistorico: boolean) => {
    if (!chamado) return;

    const formatarData = (data: string) => {
      const date = new Date(data);
      return date.toLocaleDateString('pt-BR');
    };

    const formatarDataHora = (data: string) => {
      const date = new Date(data);
      const dataFormatada = date.toLocaleDateString('pt-BR');
      const horaFormatada = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${dataFormatada} às ${horaFormatada}`;
    };

      const htmlImpressao = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Impressão - Chamado #${chamado.numeroChamado}</title>
          <style>
            @media print {
              @page { size: A4; margin: 6cm; }
              body { -webkit-print-color-adjust: exact; }
            }
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
              font-family: "Arial";
              color: #000;
              line-height: 1.4;
              padding: 50px 50px;
              background: white;
            }
            
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 15px;
            }

            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            
            .numero-chamado {
              color: #333;
              font-size: 18px;
              margin-bottom: 10px;
            }

            .logo-box {
     
              padding: 12px 20px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .logo-img {
              max-width: 150px;
              max-height: 60px;
              height: auto;
              object-fit: contain;
            }

            .divider {
              border: 0;
              border-top: 1px solid #666;
              margin-bottom: 20px;
            }

            .main-info-container {
              display: flex;
              justify-content: space-between;
              position: relative;
              margin-bottom: 40px;
            }

            .info-grid {
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 8px 15px;
              flex: 1;
            }

            .info-label {
              font-size: 14px;
              color: #444;
            }
            
            .info-value {
              font-weight: bold;
              font-size: 14px;
            }

            .status-side {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-left: 20px;
            }

            .status-box {
              border: 1px solid #000;
              border-radius: 10px;
              padding: 15px;
              width: 200px;
              text-align: center;
              margin-bottom: 10px;
            }
            
            .prioridade-label {
              font-size: 12px;
              margin-bottom: 5px;
            }
            
            .prioridade-valor {
              font-size: 20px;
              font-weight: bold;
            }
            
            .status-texto {
              font-size: 14px;
              text-align: center;
              width: 100%;
            }

            .section-title {
              font-weight: bold;
              font-size: 17px;
              margin-bottom: 15px;
              margin-top: 30px;
            }
            
            .descricao-texto {
              font-size: 14px;
              text-align: justify;
              line-height: 1.6;
            }

            /* estilos da conversa e historico */
            .mensagem {
              border-left: 3px solid #ccc;
              padding-left: 10px;
              margin-bottom: 15px;
              font-size: 13px;
            }
            .msg-meta { font-weight: bold; color: #555; margin-bottom: 3px; }
          </style>
        </head>
        <body>
          
          <div class="header-container">
            <div>
              <div class="title">${chamado.resumoChamado}</div>
              <div class="numero-chamado">#${chamado.numeroChamado}</div>
            </div>
            <div class="logo-box">
              <img src="${window.location.origin}/logo.png" alt="Logo da Empresa" class="logo-img" onerror="this.parentElement.innerHTML='logo da empresa'" />
            </div>
          </div>

          <hr class="divider" />

          <div class="main-info-container">
            <div class="info-grid">
              <span class="info-label">Tópico:</span>
              <span class="info-value">${chamado.topicoAjuda.nome}</span>

              <span class="info-label">Usuário:</span>
              <span class="info-value">${chamado.usuario.name}</span>

              <span class="info-label">Departamento:</span>
              <span class="info-value">${chamado.departamento.name}</span>

              <span class="info-label">Data de Solicitação:</span>
              <span class="info-value">${formatarDataHora(chamado.dataAbertura)}</span>

              <span class="info-label">Data de Conclusão:</span>
              <span class="info-value">${chamado.dataFechamento ? formatarDataHora(chamado.dataFechamento) : '-'}</span>
            </div>

            <div class="status-side">
              <div class="status-box">
                <div class="prioridade-label">Prioridade de solicitação</div>
                <div class="prioridade-valor">${chamado.tipoPrioridade.nome}</div>
              </div>
              <div class="status-texto">Status: ${chamado.status.nome}</div>
            </div>
          </div>

          <div class="section-title">Descrição:</div>
          <div class="descricao-texto">${chamado.descricaoChamado}</div>

          ${incluirConversa && mensagens.length > 0 ? `
            <div class="section-title">Interações:</div>
            ${mensagens.map(msg => `
              <div class="mensagem">
                <div class="msg-meta">${msg.usuario.name} - ${formatarDataHora(msg.dataEnvio)}</div>
                <div>${msg.mensagem}</div>
              </div>
            `).join('')}
          ` : ''}

          ${incluirHistorico && historico.length > 0 ? `
            <div class="section-title">Histórico do Chamado:</div>
            ${historico.map(hist => `
              <div class="mensagem">
                <div class="msg-meta">${hist.usuario.name} - ${formatarDataHora(hist.dataMov)}</div>
                <div>${hist.acao}</div>
              </div>
            `).join('')}
          ` : ''}

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    // abrir em uma nova guia 
    const janelaImpressao = window.open('', '_blank');
    if (janelaImpressao) {
      janelaImpressao.document.write(htmlImpressao);
      janelaImpressao.document.close();
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
      timeZone: 'America/Sao_Paulo',
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
        className={`${animandoEntrada ? 'slideInRight' : ''} ${animandoSaida ? 'slideOutRight' : ''}`}
        style={{
          backgroundColor: theme.background.pagina,
          color: theme.text.primary,
          transformOrigin
        }}
      >
      <Toaster position="top-right" />
      {/* Header */}
      <div className="bg-[#1A68CF] px-4 md:px-6 py-4">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={handleVoltar}
             className="flex items-center justify-center w-8 h-15 rounded-2xl hover:bg-white/20 transition-colors duration-100 focus:outline-none  active:bg-gray-300/50 hover:scale-103shrink-0"

          >
            <img 
              src="/icons/arrowpointGerencial.svg" 
              alt="Voltar" 
              className="arrowIcon"
            />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-white text-lg md:text-2xl font-semibold  transition-transform duration-150 truncate">
              {chamado.resumoChamado}
            </h2>
            <p className="text-blue-100 text-xs md:text-sm">#{chamado.numeroChamado}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-b px-4 md:px-6 py-3" style={{ backgroundColor: theme.detalhesChamado.bgBranco, borderColor: theme.border.primary }}>
        <div className="flex gap-2 md:gap-3 overflow-x-auto action-buttons-scroll pb-1 md:pb-0 -mb-1 md:mb-0">
          <button
            onClick={() => setModalResolvidoAberto(true)}
            disabled={chamado.status.id === 3}
            className="px-3 md:px-5 py-2 bg-transparent border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all duration-200 transform hover:scale-104 font-medium text-xs md:text-sm whitespace-nowrap disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-1 focus:ring-green-500/50 shrink-0"
          >
            Marcar como Resolvido
          </button>
          <button
            onClick={abrirModalRedirecionar}
            disabled={chamado.status.id === 3}
            className="px-3 md:px-5 py-2 bg-transparent border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-200 transform hover:scale-104 font-medium text-xs md:text-sm whitespace-nowrap disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-1 focus:ring-blue-500/50 shrink-0"
          >
            Redirecionar
          </button>
          <button
            className="px-3 md:px-5 py-2 bg-transparent border border-gray-600 text-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-200 transform hover:scale-104  font-medium text-xs md:text-sm whitespace-nowrap active:scale-95 focus:outline-none focus:ring-1 focus:ring-gray-500/50 shrink-0"
          >
            Editar
          </button>
          <button
            onClick={() => setModalImprimirAberto(true)}
            className="px-3 md:px-5 py-2 bg-transparent border border-gray-600 text-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-200 transform hover:scale-104 font-medium text-xs md:text-sm whitespace-nowrap active:scale-95 focus:outline-none focus:ring-1 focus:ring-gray-500/50 shrink-0"
          >
            Imprimir
          </button>
          <button

             onClick={handleAssumirChamado}
            disabled={chamado.status.id === 3}
            className="px-3 md:px-5 py-2 bg-transparent border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all duration-200 transform hover:scale-104 font-medium text-xs md:text-sm whitespace-nowrap disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-1 focus:ring-purple-500/50 shrink-0"
          >
            Atribuir a mim
          </button>
          <button
            onClick={reabrirChamado}
            disabled={chamado.status.id !== 3}
            className="px-3 md:px-5 py-2 bg-transparent border border-orange-600 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all duration-200 transform hover:scale-104 font-medium text-xs md:text-sm whitespace-nowrap disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-1 focus:ring-orange-500/50 shrink-0"
          >
            Reabrir Chamado
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ backgroundColor: theme.detalhesChamado.bgBranco, borderColor: theme.border.primary }}>
        <div className="px-4 md:px-6 flex gap-1">
          <button
            onClick={() => setAbaAtiva('detalhes')}
            className="px-6 py-3 font-medium text-sm transition-all relative"
            style={{
              color: abaAtiva === 'detalhes' ? theme.detalhesChamado.redirecionar : theme.text.secondary,
              borderBottomColor: abaAtiva === 'detalhes' ? theme.detalhesChamado.redirecionar : 'transparent',
              borderBottomWidth: abaAtiva === 'detalhes' ? '2px' : '0px'
            }}
          >
            Detalhes
          </button>
          <button
            onClick={() => setAbaAtiva('historico')}
            className="px-6 py-3 font-medium text-sm transition-all relative"
            style={{
              color: abaAtiva === 'historico' ? theme.detalhesChamado.redirecionar : theme.text.secondary,
              borderBottomColor: abaAtiva === 'historico' ? theme.detalhesChamado.redirecionar : 'transparent',
              borderBottomWidth: abaAtiva === 'historico' ? '2px' : '0px'
            }}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {abaAtiva === 'detalhes' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
            {/* Left Column - Dados */}
            <div className="col-span-1 md:col-span-4 space-y-4 md:space-y-6">
              {/* Dados do Chamado */}
              <div className="rounded-lg p-5" style={{ backgroundColor: theme.detalhesChamado.bgBranco, borderColor: theme.border.primary, borderWidth: '1px' }}>
                <h3 className="font-segoe text-lg font-semibold mb-4 pb-3" style={{ color: theme.text.primary, borderColor: theme.border.primary, borderBottomWidth: '1px' }}>
                  Dados do chamado
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-5 text-sm">
                    <span className="font-medium" style={{ color: theme.text.secondary }}>Status</span>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        border: '1px solid',
                        fontSize: '12px',
                        fontWeight: '500',
                        width: 'fit-content',
                        ...(chamado.status.id === 1 && {
                          backgroundColor: theme.status.aberto.bg,
                          color: theme.status.aberto.text,
                          borderColor: theme.status.aberto.border
                        })
                        || (chamado.status.id === 2 && {
                          backgroundColor: theme.status.emAtendimento.bg,
                          color: theme.status.emAtendimento.text,
                          borderColor: theme.status.emAtendimento.border
                        })
                        || (chamado.status.id === 3 && {
                          backgroundColor: theme.status.encerrado.bg,
                          color: theme.status.encerrado.text,
                          borderColor: theme.status.encerrado.border
                        })
                        || (chamado.status.id === 4 && {
                          backgroundColor: theme.status.cancelado.bg,
                          color: theme.status.cancelado.text,
                          borderColor: theme.status.cancelado.border
                        })
                        || (chamado.status.id === 5 && {
                          backgroundColor: theme.status.aguardando.bg,
                          color: theme.status.aguardando.text,
                          borderColor: theme.status.aguardando.border
                        })
                        || (chamado.status.id === 6 && {
                          backgroundColor: theme.status.pendenteUsuario.bg,
                          color: theme.status.pendenteUsuario.text,
                          borderColor: theme.status.pendenteUsuario.border
                        })
                        || (chamado.status.id === 7 && {
                          backgroundColor: theme.status.pendente.bg,
                          color: theme.status.pendente.text,
                          borderColor: theme.status.pendente.border
                        })
                        || {
                          backgroundColor: theme.status.cancelado.bg,
                          color: theme.status.cancelado.text,
                          borderColor: theme.status.cancelado.border
                        }
                      }}
                    >
                      {chamado.status.nome}
                    </span>

                    <span className="font-medium" style={{ color: theme.text.secondary }}>Responsável</span>
                    <span style={{ color: theme.detalhesChamado.label }}>
                      {chamado.userResponsavel?.name || 'Não atribuído'}
                      {chamado.userResponsavel?.id === usuarioLogadoId && (
                        <span style={{ color: theme.detalhesChamado.Marcarcomoresolvido }}> (Você)</span>
                      )}
                    </span>

                    <span className="font-medium" style={{ color: theme.text.secondary }}>Departamento</span>
                    <span style={{ color: theme.detalhesChamado.label }}>{chamado.departamento.name}</span>

                    <span className="font-medium" style={{ color: theme.text.secondary }}>Criado em</span>
                    <span style={{ color: theme.detalhesChamado.label }}>{formatarData(chamado.dataAbertura)}</span>

                    <span className="font-medium" style={{ color: theme.text.secondary }}>Prioridade</span>
                    <span 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border w-fit"
                      style={{ 
                        backgroundColor: `${chamado.tipoPrioridade.cor}25`, 
                        color: chamado.tipoPrioridade.cor,
                        borderColor: chamado.tipoPrioridade.cor
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: chamado.tipoPrioridade.cor }}
                      />
                      <span className="uppercase tracking-wider">
                        {chamado.tipoPrioridade.nome}
                      </span>
                    </span>

                    <span className="font-medium" style={{ color: theme.text.secondary }}>Tópico</span>
                    <span style={{ color: theme.detalhesChamado.label }}>{chamado.topicoAjuda.nome}</span>

                    <span className="font-medium" style={{ color: theme.text.secondary }}>Reaberto</span>
                    <span style={{ color: theme.detalhesChamado.label }}>{chamado.vezesreaberto}</span>
                  </div>
                </div>
                
              </div>

                  {/* dados do Usuario */}
                <div className="rounded-lg p-5 shadow-sm" style={{ backgroundColor: theme.detalhesChamado.bgBranco, borderColor: theme.border.primary, borderWidth: '1px' }}>
                  <h3 className="font-segoe text-lg font-semibold mb-4 pb-2" style={{ color: theme.text.primary, borderColor: theme.border.primary, borderBottomWidth: '1px' }}>
                    Dados do usuário
                  </h3>

                  <div className="grid grid-cols-[90px_1fr] gap-y-2 text-sm">

                    <span className="font-medium" style={{ color: theme.text.secondary }}>Nome</span>
                    <span className="font-medium" style={{ color: theme.text.primary }}>{chamado.usuario.name}</span>

                    <span className="font-medium" style={{ color: theme.text.secondary }}>E-mail</span>
                    <span className="hover:underline" style={{ color: theme.detalhesChamado.redirecionar }}>
                      {chamado.usuario.email}
                    </span>

                    <span className="font-medium" style={{ color: theme.text.secondary }}>Ramal</span>
                    <span style={{ color: theme.text.primary }}>{chamado.ramal}</span>

                  </div>
                </div>

              {/* Outros Dados */}
              <div className="rounded-lg p-5" style={{ backgroundColor: theme.detalhesChamado.bgBranco, borderColor: theme.border.primary, borderWidth: '1px' }}>
                <h3 className="font-segoe text-lg font-semibold mb-4 pb-3" style={{ color: theme.text.primary, borderColor: theme.border.primary, borderBottomWidth: '1px' }}>
                  Outros Dados
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium" style={{ color: theme.text.secondary }}>Responsável pelo chamado</label>
                    <p className="mt-1" style={{ color: theme.text.primary }}>
                      {chamado.userResponsavel?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: theme.text.secondary }}>Data atribuição</label>
                    <p className="mt-1" style={{ color: theme.text.primary }}>
                      {chamado.dataAtribuicao ? formatarData(chamado.dataAtribuicao) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: theme.text.secondary }}>Data conclusão</label>
                    <p className="mt-1" style={{ color: theme.text.primary }}>
                      {chamado.dataFechamento ? formatarData(chamado.dataFechamento) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: theme.text.secondary }}>Usuário que concluiu</label>
                    <p className="mt-1" style={{ color: theme.text.primary }}>
                      {chamado.userFechamento?.name || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Mensagens */}
            <div className="col-span-1 md:col-span-8">
              <div className="rounded-lg" style={{ backgroundColor: theme.background.surface, borderColor: theme.border.primary, borderWidth: '1px' }}>
                {/* Mensagem inicial do usuário */}
                <div className="p-5" style={{ backgroundColor: theme.detalhesChamado.BalaoMsgInicial, borderColor: theme.border.primary, borderBottomWidth: '1px' }}>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                      <span className="text-green-700 font-semibold text-sm">
                        {chamado.usuario.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold" style={{ color: theme.detalhesChamado.txtNomeUsuarios }}>{chamado.usuario.name}</span>
                        <span className="text-base" style={{ color: theme.text.secondary }}>{formatarData(chamado.dataAbertura)}</span>
                      </div>
                      <div className="whitespace-pre-wrap" style={{ color: theme.text.primary }}>{chamado.descricaoChamado}</div>
                      
                      {/* Anexos da descrição inicial */}
                      {chamado.anexos && chamado.anexos.length > 0 && (
                        <div className="mt-3 pt-3" style={{ borderColor: theme.detalhesChamado.BalaoMsgInicial, borderTopWidth: '1px' }}>
                          <p className="text-base font-medium mb-2" style={{ color: theme.text.secondary }}>Anexos:</p>
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
                                  className="flex items-center gap-2 px-3 py-2 border rounded transition text-sm group hover:opacity-80"
                                  style={{
                                    backgroundColor: theme.detalhesChamado.bgBranco,
                                    borderColor: theme.border.primary
                                  }}
                                >
                                  {isImage ? (
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.detalhesChamado.redirecionar }}>
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.text.secondary }}>
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                  <span className="max-w-50 truncate flex-1" style={{ color: theme.text.primary }}>
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
                <div className="p-5 space-y-4 max-h-125 overflow-y-auto" style={{ backgroundColor: theme.background.pagina }}>
                  {mensagens.map((msg) => {
                    const isUsuarioChamado = msg.usuario.id === chamado.usuario.id;
                    const enviadoPorEmail = msg.enviadoPorEmail === true;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isUsuarioChamado ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className="max-w-[70%] rounded-lg p-4"
                          style={{
                            backgroundColor: isUsuarioChamado ? theme.detalhesChamado.BalaoMsgusuario : theme.detalhesChamado.BalaoMsgSuporte
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-base" style={{ color: theme.detalhesChamado.txtNomeUsuarios }}>
                              {msg.usuario.name}
                            </span>
                            <span className="text-xs" style={{ color: theme.text.secondary }}>{formatarData(msg.dataEnvio)}</span>

                            {enviadoPorEmail && (
                              <span
                                title="Mensagem enviada por email"
                                className="ml-1 align-middle cursor-pointer"
                              >
                                <MdEmail className="inline" style={{ color: theme.detalhesChamado.redirecionar }} size={18} />
                              </span>
                            )}
                          </div>
                          {/* exibição de emails enviados na mensagem */}
                          {enviadoPorEmail && (
                            <div className="mb-2 text-xs space-y-0.5 pb-2" style={{ color: theme.text.secondary, borderColor: theme.border.primary, borderBottomWidth: '1px' }}>
                              <div><span className="font-semibold">Enviado para:</span> {msg.email_enviado}</div>
                              {msg.email_copia && (
                                <div><span className="font-semibold">Cópia (CC):</span> {msg.email_copia}</div>
                              )}
                              {msg.email_copia_oculta && (
                                <div><span className="font-semibold">Cópia Oculta (CCO):</span> {msg.email_copia_oculta}</div>
                              )}
                            </div>
                          )}
                          <p className="text-base whitespace-pre-wrap" style={{ color: theme.text.primary }}>{msg.mensagem}</p>
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
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:transition text-xs group"
                                    style={{
                                      backgroundColor: theme.detalhesChamado.bgBranco,
                                      borderColor: theme.border.primary,
                                      borderWidth: '1px'
                                    }}
                                  >
                                    {isImage ? (
                                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.detalhesChamado.redirecionar }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.text.secondary }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    )}
                                    <span className="truncate flex-1" style={{ color: theme.text.primary }}>
                                      {anexo.filename}
                                    </span>
                                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.text.secondary }}>
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
                <div className="p-5" style={{ borderColor: theme.border.primary, borderTopWidth: '1px' }}>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                    Postar uma resposta
                  </label>
                  <textarea
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    rows={4}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 resize-none"
                    style={{
                      backgroundColor: theme.detalhesChamado.bgBranco,
                      borderColor: theme.border.primary,
                      color: theme.text.primary
                    }}
                  />
                  
                  {/* Área de Upload de Arquivos */}
                  <div
                    className="mt-3 border-2 border-dashed rounded-lg p-4 text-center transition"
                    style={{
                      borderColor: isDraggingResposta ? theme.detalhesChamado.redirecionar : theme.border.primary,
                      backgroundColor: isDraggingResposta ? `${theme.detalhesChamado.BalaoMsgSuporte}40` : `${theme.background.surface}80`
                    }}
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
                      className="cursor-pointer text-sm"
                      style={{ color: theme.text.secondary }}
                    >
                      Arraste os arquivos aqui ou{' '}
                      <span className="hover:opacity-80 font-medium" style={{ color: theme.detalhesChamado.redirecionar }}>
                        clique para selecionar
                      </span>
                      <p className="text-xs mt-1" style={{ color: theme.text.secondary }}>
                        Máximo 5 arquivos, 10MB cada
                      </p>
                    </label>
                  </div>

                  {/* Lista de Arquivos Selecionados */}
                  {anexosResposta.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium" style={{ color: theme.text.primary }}>
                        Arquivos selecionados ({anexosResposta.length}/5):
                      </p>
                      {anexosResposta.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-3 py-2 rounded"
                          style={{ backgroundColor: theme.detalhesChamado.bgBranco }}
                        >
                          <span className="text-sm truncate flex-1" style={{ color: theme.text.primary }}>
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

                <div className="flex justify-between mt-3">
                 <button
                      onClick={abrirModalEmail}
                      className="px-6 py-2 border rounded transition font-medium text-sm disabled:border-gray-400 disabled:text-gray-400 disabled:cursor-not-allowed"
                      style={{
                        borderColor: theme.detalhesChamado.redirecionar,
                        color: theme.detalhesChamado.redirecionar
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = theme.detalhesChamado.redirecionar;
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = theme.detalhesChamado.redirecionar;
                      }}>
                      {enviandoMensagem ? 'Enviando...' : 'Atualização por Email'}
                    </button>
  
                    <button
                      onClick={enviarMensagem}
                      disabled={enviandoMensagem || !novaMensagem.trim()}
                      className="px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {enviandoMensagem ? 'Enviando...' : 'Enviar'}
                    </button>
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className=" rounded-lg p-6" style={{ backgroundColor: theme.detalhesChamado.bgBranco, borderColor: theme.border.primary, borderWidth: '1px' }}>
            <h3 className="text-lg font-semibold mb-4 pb-3 font-segoe" style={{ color: theme.text.primary, borderColor: theme.border.primary, borderBottomWidth: '1px' }}>
              Histórico do Chamado
            </h3>
            <div className="space-y-4">
              {historico.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 last:border-0" style={{ borderColor: theme.border.primary, borderBottomWidth: '1px' }}>
                  <div className="shrink-0 w-2 h-2 rounded-full mt-2" style={{ backgroundColor: theme.detalhesChamado.redirecionar }} />
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: theme.text.primary }}>{item.acao}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm" style={{ color: theme.text.secondary }}>{item.usuario.name}</span>
                      <span className="text-sm" style={{ color: theme.text.secondary }}>• {formatarData(item.dataMov)}</span>
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
      {/* Modal de Impressão */}
      <ModalImprimirChamado
        isOpen={modalImprimirAberto}
        onClose={() => setModalImprimirAberto(false)}
        onConfirm={handleImprimirChamado}
      />
      {/* Modal de Enviar Email */}
      <ModalEnviarAttPorEmail
        isOpen={modalEmailAberto}
        onClose={fecharModalEmail}
        onConfirm={handleEnviarEmail}
        usuarioEmail={chamado?.usuario.email || ''}
        chamadoId={chamadoId}
      />
    </div>
  );
}
