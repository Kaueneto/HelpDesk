'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface TopicosAjuda {
  id: number;
  nome: string;
  ativo: boolean;
  codigo: number;
}

interface AcompanharChamadoProps {
  onChamadoClick: (chamado: any) => void;
}

// badges de status — cores fixas, funcionam em ambos os temas
function getStatusClass(statusId: number): string {
  switch (statusId) {
    case 1:  return 'bg-yellow-100 text-yellow-700 border-yellow-500';
    case 2:  return 'bg-blue-100 text-blue-600 border-blue-500';
    case 3:  return 'bg-green-100 text-green-800 border-green-700';
    case 4:  return 'bg-gray-100 text-red-800 border-red-700';
    case 5:  return 'bg-purple-100 text-purple-700 border-purple-500';
    case 6:  return 'bg-gray-100 text-gray-800 border-gray-700';
    case 7:  return 'bg-orange-100 text-orange-800 border-orange-700';
    default: return 'bg-red-100 text-red-800 border-red-700';
  }
}

export default function AcompanharChamado({ onChamadoClick }: AcompanharChamadoProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { mode } = useTheme();
  const dark = mode === 'dark';

  // paleta dinâmica
  const textPrim  = dark ? '#F1F5F9' : '#111827';
  const textSec   = dark ? '#94a3b8' : '#6b7280';
  const borderClr = dark ? '#334155' : '#d1d5db';
  const inputBg   = dark ? '#1E293B' : '#ffffff';
  const cardBg    = dark ? '#1E293B' : '#ffffff';
  const theadBg   = dark ? '#0F172A' : '#f3f4f6';
  const rowHover  = dark ? '#334155' : '#f9fafb';
  const divBg     = dark ? '#334155' : '#e5e7eb';

  const [chamados, setChamados]         = useState<any[]>([]);
  const [loadingChamados, setLoadingChamados] = useState(false);
  const [statusList, setStatusList]     = useState<any[]>([]);
  const [topicos, setTopicos]           = useState<TopicosAjuda[]>([]);
  const [filtroAssunto, setFiltroAssunto] = useState('');
  const [filtroTopicoId, setFiltroTopicoId] = useState<number>(0);
  const [filtroStatusId, setFiltroStatusId] = useState<number>(0);
  const [paginaAtual, setPaginaAtual]   = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const fetchData = async () => {
      try {
        const [statusRes, topicosRes] = await Promise.all([
          api.get('/status'),
          api.get('/topicos_ajuda'),
        ]);
        setStatusList(statusRes.data);
        setTopicos(topicosRes.data.filter((t: TopicosAjuda) => t.ativo));
      } catch {}
    };
    fetchData();
    buscarChamados();
  }, [isAuthenticated, authLoading]);

  const buscarChamados = async (pagina = 1) => {
    if (!isAuthenticated) return;
    setLoadingChamados(true);
    try {
      const params: any = { page: pagina, pageSize: 10 };
      if (filtroAssunto)   params.assunto      = filtroAssunto;
      if (filtroTopicoId > 0) params.topicoAjudaId = filtroTopicoId;
      if (filtroStatusId > 0) params.statusId  = filtroStatusId;
      const response = await api.get('/chamados', { params });
      if (response.data.chamados) {
        setChamados(response.data.chamados);
        setTotalPaginas(response.data.totalPages || 1);
        setPaginaAtual(response.data.currentPage || pagina);
      } else {
        setChamados(response.data);
        setTotalPaginas(Math.ceil(response.data.length / 10) || 1);
        setPaginaAtual(pagina);
      }
    } catch {
      setErrorMessage('Erro ao carregar chamados.');
    } finally {
      setLoadingChamados(false);
    }
  };

  const formatarDataBrasilia = (data: string) =>
    new Date(data).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

  return (
    <>
      {/* ── Filtros ── */}
      <div className="rounded-lg border p-3 sm:p-4 md:p-6 mb-4 sm:mb-6" style={{ borderColor: borderClr }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 items-end">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{ color: textPrim }}>Assunto</label>
            <input
              type="text"
              value={filtroAssunto}
              onChange={e => setFiltroAssunto(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ borderColor: borderClr, backgroundColor: inputBg, color: textPrim }}
              placeholder="Buscar por assunto..."
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{ color: textPrim }}>Tópico de ajuda</label>
            <select
              value={filtroTopicoId}
              onChange={e => setFiltroTopicoId(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ borderColor: borderClr, backgroundColor: inputBg, color: textPrim }}
            >
              <option value={0}>Todos</option>
              {topicos.sort((a, b) => Number(a.codigo) - Number(b.codigo)).map(t => (
                <option key={t.id} value={t.id}>{t.codigo} - {t.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{ color: textPrim }}>Status</label>
            <select
              value={filtroStatusId}
              onChange={e => setFiltroStatusId(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ borderColor: borderClr, backgroundColor: inputBg, color: textPrim }}
            >
              <option value={0}>Todos</option>
              {statusList.map(s => (
                <option key={s.id} value={s.id}>{s.descricaoStatus}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => buscarChamados(1)}
            className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition"
          >
            Pesquisar
          </button>
        </div>
      </div>

      <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4" style={{ color: textPrim }}>Seus chamados</h2>

      {loadingChamados ? (
        <div className="text-center py-8" style={{ color: textSec }}>Carregando...</div>
      ) : chamados.length === 0 ? (
        <div className="text-center py-8" style={{ color: textSec }}>Nenhum chamado encontrado.</div>
      ) : (
        <>
          {/* ── Cards mobile ── */}
          <div className="md:hidden space-y-3 mb-6">
            {chamados.map(chamado => (
              <div
                key={chamado.id}
                onClick={() => onChamadoClick(chamado)}
                className="rounded-lg p-4 shadow-sm cursor-pointer border transition-shadow hover:shadow-md"
                style={{ backgroundColor: cardBg, borderColor: borderClr }}
              >
                <div className="flex items-start justify-between mb-3 pb-3 border-b" style={{ borderColor: borderClr }}>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate mb-1" style={{ color: textPrim }}>{chamado.resumoChamado}</h3>
                    <p className="text-xs text-blue-500 font-medium">#{chamado.numeroChamado || chamado.id}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="flex gap-2">
                    <span className="text-xs font-medium min-w-[75px]" style={{ color: textSec }}>Tópico:</span>
                    <span className="text-xs flex-1" style={{ color: textPrim }}>{chamado.topicoAjuda?.nome}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-medium min-w-[75px]" style={{ color: textSec }}>Depto:</span>
                    <span className="text-xs flex-1" style={{ color: textPrim }}>{chamado.departamento?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium min-w-[75px]" style={{ color: textSec }}>Prioridade:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chamado.tipoPrioridade?.cor || '#999' }} />
                      <span className="text-xs" style={{ color: textPrim }}>{chamado.tipoPrioridade?.nome}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium min-w-[75px]" style={{ color: textSec }}>Status:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border uppercase ${getStatusClass(chamado.status.id)}`}>
                      {chamado.status?.nome}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: borderClr }}>
                  <span className="text-xs" style={{ color: textSec }}>Criado em:</span>
                  <span className="text-xs font-medium" style={{ color: textPrim }}>{formatarDataBrasilia(chamado.dataAbertura)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Tabela desktop ── */}
          <div className="hidden md:block overflow-x-auto rounded-lg border" style={{ borderColor: borderClr }}>
            <table className="min-w-full">
              <thead style={{ backgroundColor: theadBg }}>
                <tr>
                  {['Núm.Ticket','Prioridade','Data Criação','Última Interação','Tópico','Departamento','Status','Assunto'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: textSec }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chamados.map((chamado, idx) => (
                  <tr
                    key={chamado.id}
                    className="cursor-pointer transition-colors border-t"
                    style={{ backgroundColor: cardBg, borderColor: divBg }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = cardBg)}
                    onClick={() => onChamadoClick(chamado)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-500 font-medium">
                      {chamado.numeroChamado || chamado.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chamado.tipoPrioridade?.cor || '#999' }} />
                        <span style={{ color: textPrim }}>{chamado.tipoPrioridade?.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: textPrim }}>
                      <div className="flex flex-col">
                        <span>{new Date(chamado.dataAbertura).toLocaleDateString('pt-BR')}</span>
                        <span className="text-xs" style={{ color: textSec }}>
                          {new Date(chamado.dataAbertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: textPrim }}>
                      {chamado.ultimaInteracao ? (
                        <div className="flex flex-col">
                          <span>{new Date(chamado.ultimaInteracao.data).toLocaleDateString('pt-BR')}</span>
                          <span className="text-xs" style={{ color: textSec }}>
                            {new Date(chamado.ultimaInteracao.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="italic opacity-50" style={{ color: textSec }}>Sem interação</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: textPrim }}>{chamado.topicoAjuda?.nome}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: textPrim }}>{chamado.departamento?.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusClass(chamado.status.id)}`}>
                        {chamado.status?.nome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm truncate max-w-xs" title={chamado.resumoChamado} style={{ color: textPrim }}>
                      {chamado.resumoChamado}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Paginação ── */}
          {totalPaginas > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 mt-4 sm:mt-6">
              <button
                onClick={() => buscarChamados(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className="w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium border transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: borderClr, color: textPrim, backgroundColor: 'transparent' }}
              >
                Anterior
              </button>
              <span className="text-xs sm:text-sm" style={{ color: textSec }}>
                Página {paginaAtual} de {totalPaginas}
              </span>
              <button
                onClick={() => buscarChamados(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
                className="w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium border transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: borderClr, color: textPrim, backgroundColor: 'transparent' }}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
