'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

interface Chamado {
  id: number;
  numeroChamado: number;
  resumoChamado: string;
  descricaoChamado: string;
  ramal: number;
  dataAbertura: string;
  dataFechamento: string | null;
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
}

interface Mensagem {
  id: number;
  mensagem: string;
  dataEnvio: string;
  usuario: {
    id: number;
    name: string;
  };
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

  useEffect(() => {
    carregarDados();
    carregarUsuarioLogado();
  }, [chamadoId]);

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
      alert('Erro ao carregar chamado');
    } finally {
      setLoading(false);
    }
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim()) {
      alert('Digite uma mensagem');
      return;
    }

    setEnviandoMensagem(true);
    try {
      await api.post(`/chamados/${chamadoId}/mensagens`, {
        mensagem: novaMensagem,
      });

      setNovaMensagem('');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setEnviandoMensagem(false);
    }
  };

  const marcarComoResolvido = async () => {
    if (!confirm('Deseja marcar este chamado como resolvido?')) return;

    try {
      await api.put(`/chamados/${chamadoId}/encerrar`);
      alert('Chamado marcado como resolvido!');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao resolver chamado:', error);
      alert('Erro ao resolver chamado');
    }
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
    router.back();
  };

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
    <div className="bg-gray-100">
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
              className="w-5 h-5 transform rotate-180"
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
            onClick={marcarComoResolvido}
            disabled={chamado.status.id === 3}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Marcar como Resolvido
          </button>
          <button
            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium text-sm"
          >
            Redirecionar
          </button>
          <button
            className="px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition font-medium text-sm"
          >
            Editar
          </button>
          <button
            className="px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition font-medium text-sm"
          >
            Imprimir
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
                        className="w-3 h-3 rounded-full"
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

              {/* Dados de Conclusão */}
              {chamado.dataFechamento && (
                <div className="bg-white rounded-lg border border-gray-300 p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">
                    Dados de conclusão
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Data conclusão</label>
                      <p className="text-gray-900 mt-1">{formatarData(chamado.dataFechamento)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Usuário Fechou</label>
                      <p className="text-gray-900 mt-1">
                        {chamado.userFechamento?.name || 'Não informado'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                  <div className="flex justify-between items-center mt-3">
                    <div className="text-sm text-gray-500">
                      Arraste os arquivos ou <span className="text-blue-600 cursor-pointer">selecione-os</span>
                    </div>
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
    </div>
  );
}
