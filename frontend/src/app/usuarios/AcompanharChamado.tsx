'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';

interface TopicosAjuda {
  id: number;
  nome: string;
  ativo: boolean;
}

interface AcompanharChamadoProps {
  onChamadoClick: (chamado: any) => void;
}

export default function AcompanharChamado({ onChamadoClick }: AcompanharChamadoProps) {
  const [chamados, setChamados] = useState<any[]>([]);
  const [loadingChamados, setLoadingChamados] = useState(false);
  const [statusList, setStatusList] = useState<any[]>([]);
  const [topicos, setTopicos] = useState<TopicosAjuda[]>([]);
  const [filtroAssunto, setFiltroAssunto] = useState('');
  const [filtroTopicoId, setFiltroTopicoId] = useState<number>(0);
  const [filtroStatusId, setFiltroStatusId] = useState<number>(0);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, topicosRes] = await Promise.all([
          api.get('/status'),
          api.get('/topicos_ajuda'),
        ]);
        setStatusList(statusRes.data);
        setTopicos(topicosRes.data.filter((t: TopicosAjuda) => t.ativo));
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    fetchData();
    buscarChamados();
  }, []);

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
        setPaginaAtual(response.data.currentPage || pagina);
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

  const formatarDataBrasilia = (data: string) => {
    const date = new Date(data);
    
    if (data.includes('Z')) {
      date.setHours(date.getHours() + 3);
    }
    
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    const hora = String(date.getHours()).padStart(2, '0');
    const minuto = String(date.getMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  };

  return (
    <>
      {/* Filtros */}
      <div className=" border border-gray-200 p-6 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Assunto
            </label>
            <input
              type="text"
              value={filtroAssunto}
              onChange={(e) => setFiltroAssunto(e.target.value)}
              className="w-full px-3 py-1 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                {chamados.map((chamado) => (
                  <tr 
                    key={chamado.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onChamadoClick(chamado)}
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
                  <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                          chamado.status?.id === 1
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-500' 
                            : chamado.status?.id === 2
                            ? 'bg-blue-100 text-blue-700 border-blue-500'     
                            : 'bg-green-100 text-green-700 border-green-500' 
                        }`}
                      >
                        {chamado.status?.nome || 'Desconhecido'}
                      </span>
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
  );
}
