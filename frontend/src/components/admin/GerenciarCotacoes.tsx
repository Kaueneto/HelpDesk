'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { FiFileText, FiEye, FiPlus, FiEdit, FiTrash2, FiCheck, FiX } from 'react-icons/fi';

interface Usuario {
  id: number;
  name: string;
  email: string;
}

interface Chamado {
  id: number;
  numeroChamado: number;
  resumoChamado: string;
  usuario: Usuario;
}

interface Cotacao {
  id: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  criadoPor: Usuario;
  chamado: Chamado;
  itens?: CotacaoItem[];
}

interface CotacaoItem {
  id: number;
  descricao: string;
  quantidade: number;
  observacao: string | null;
  opcoes?: CotacaoItemOpcao[];
}

interface CotacaoItemOpcao {
  id: number;
  fornecedor: string;
  descricao_produto: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  selecionado: boolean;
}

export default function GerenciarCotacoes() {
  const { theme, mode } = useTheme();
  const router = useRouter();
  
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarCotacoes();
  }, []);

  const carregarCotacoes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/compras/cotacoes');
      setCotacoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar cotações:', error);
      alert('Erro ao carregar cotações');
    } finally {
      setLoading(false);
    }
  };

  const excluirCotacao = async (id: number) => {
    if (!confirm('Deseja realmente excluir esta cotação?')) {
      return;
    }

    try {
      await api.delete(`/compras/cotacoes/${id}`);
      alert('Cotação excluída com sucesso!');
      carregarCotacoes();
    } catch (error) {
      console.error('Erro ao excluir cotação:', error);
      alert('Erro ao excluir cotação');
    }
  };

  const cotacoesFiltradas = cotacoes.filter((cot) => {
    const matchStatus = filtroStatus === 'todos' || cot.status === filtroStatus;
    const matchBusca = 
      cot.chamado.numeroChamado.toString().includes(busca) ||
      cot.chamado.resumoChamado.toLowerCase().includes(busca.toLowerCase()) ||
      cot.criadoPor.name.toLowerCase().includes(busca.toLowerCase());
    
    return matchStatus && matchBusca;
  });

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const cores: { [key: string]: string } = {
      EM_ANDAMENTO: 'bg-blue-500',
      AGUARDANDO_APROVACAO: 'bg-yellow-500',
      APROVADA: 'bg-green-500',
      EM_COMPRA: 'bg-purple-500',
      FINALIZADA: 'bg-gray-500',
      CANCELADA: 'bg-red-500',
    };
    return cores[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      EM_ANDAMENTO: 'Em Andamento',
      AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
      APROVADA: 'Aprovada',
      EM_COMPRA: 'Em Compra',
      FINALIZADA: 'Finalizada',
      CANCELADA: 'Cancelada',
    };
    return labels[status] || status;
  };

  const bgColor = mode === 'dark' ? '#0F172A' : '#EDEDED';
  const cardBg = mode === 'dark' ? '#1E293B' : '#FFFFFF';
  const textColor = mode === 'dark' ? '#F1F5F9' : '#1E293B';
  const borderColor = mode === 'dark' ? '#334155' : '#E2E8F0';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: bgColor }}>
        <div className="text-lg" style={{ color: textColor }}>Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FiFileText className="text-3xl" style={{ color: textColor }} />
            <h1 className="text-3xl font-bold" style={{ color: textColor }}>
              Cotações
            </h1>
          </div>
        </div>

               <div
          className="rounded-lg p-4 mb-6 shadow-md"
          style={{ backgroundColor: cardBg, borderColor: borderColor }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
                Buscar
              </label>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Número do chamado, assunto ou responsável..."
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: mode === 'dark' ? '#334155' : '#FFFFFF',
                  borderColor: borderColor,
                  color: textColor,
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
                Status
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: mode === 'dark' ? '#334155' : '#FFFFFF',
                  borderColor: borderColor,
                  color: textColor,
                }}
              >
                <option value="todos">Todos</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
                <option value="APROVADA">Aprovada</option>
                <option value="EM_COMPRA">Em Compra</option>
                <option value="FINALIZADA">Finalizada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {cotacoesFiltradas.length === 0 ? (
            <div
              className="text-center py-12 rounded-lg"
              style={{ backgroundColor: cardBg, color: textColor }}
            >
              <FiFileText className="mx-auto text-5xl mb-4 opacity-50" />
              <p className="text-lg">Nenhuma cotação encontrada</p>
            </div>
          ) : (
            cotacoesFiltradas.map((cotacao) => (
              <div
                key={cotacao.id}
                className="rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
                style={{ backgroundColor: cardBg, borderColor: borderColor, borderWidth: '1px' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: '#3B82F6' }}
                      >
                        Cotação #{cotacao.id}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(
                          cotacao.status
                        )}`}
                      >
                        {getStatusLabel(cotacao.status)}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold mb-2" style={{ color: textColor }}>
                      Chamado #{cotacao.chamado.numeroChamado} - {cotacao.chamado.resumoChamado}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="opacity-70">Solicitante:</span>{' '}
                        <span className="font-medium">{cotacao.chamado.usuario.name}</span>
                      </div>
                      <div>
                        <span className="opacity-70">Criado por:</span>{' '}
                        <span className="font-medium">{cotacao.criadoPor.name}</span>
                      </div>
                      <div>
                        <span className="opacity-70">Data:</span>{' '}
                        <span className="font-medium">{formatarData(cotacao.createdAt)}</span>
                      </div>
                    </div>

                    {cotacao.itens && cotacao.itens.length > 0 && (
                      <div className="mt-3 text-sm">
                        <span className="opacity-70">Itens na cotação:</span>{' '}
                        <span className="font-medium">{cotacao.itens.length}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/compras/cotacoes/${cotacao.id}`)}
                      className="p-2 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                      style={{
                        backgroundColor: mode === 'dark' ? '#334155' : '#E2E8F0',
                        color: textColor,
                      }}
                      title="Ver detalhes"
                    >
                      <FiEye className="text-lg" />
                    </button>
                    <button
                      onClick={() => excluirCotacao(cotacao.id)}
                      className="p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                      style={{
                        backgroundColor: mode === 'dark' ? '#334155' : '#E2E8F0',
                        color: textColor,
                      }}
                      title="Excluir"
                    >
                      <FiTrash2 className="text-lg" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
