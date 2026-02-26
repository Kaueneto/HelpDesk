'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';

export default function Parametros() {
  const [horasParaAtraso, setHorasParaAtraso] = useState(24);
  const [horasParaAtrasoEdit, setHorasParaAtrasoEdit] = useState(24);
  const [salvandoParametros, setSalvandoParametros] = useState(false);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [paginaLogs, setPaginaLogs] = useState(1);
  const [totalPaginasLogs, setTotalPaginasLogs] = useState(1);
  const [filtroTipoOperacao, setFiltroTipoOperacao] = useState('');
  const [filtroDataInicioLogs, setFiltroDataInicioLogs] = useState('');
  const [filtroDataFimLogs, setFiltroDataFimLogs] = useState('');

  useEffect(() => {
    carregarParametros();
    carregarLogs();
  }, []);

  useEffect(() => {
    carregarLogs();
  }, [paginaLogs]);

  const carregarParametros = async () => {
    try {
      const response = await api.get('/parametros');
      setHorasParaAtraso(response.data.horasParaAtraso);
      setHorasParaAtrasoEdit(response.data.horasParaAtraso);
    } catch (error) {
      console.error('Erro ao carregar parâmetros:', error);
    }
  };

  const salvarParametros = async () => {
    if (horasParaAtrasoEdit < 1) {
      alert('O valor deve ser maior ou igual a 1 hora');
      return;
    }

    setSalvandoParametros(true);
    try {
      await api.put('/parametros', {
        horasParaAtraso: horasParaAtrasoEdit,
      });
      setHorasParaAtraso(horasParaAtrasoEdit);
      alert('Parâmetros atualizados com sucesso!');
      carregarLogs();
    } catch (error: any) {
      console.error('Erro ao salvar parâmetros:', error);
      alert(error.response?.data?.mensagem || 'Erro ao salvar parâmetros');
    } finally {
      setSalvandoParametros(false);
    }
  };

  const carregarLogs = async () => {
    setLoadingLogs(true);
    try {
      const params: any = {
        page: paginaLogs,
        limit: 20,
      };

      if (filtroTipoOperacao) params.tipoOperacao = filtroTipoOperacao;
      if (filtroDataInicioLogs) params.dataInicio = filtroDataInicioLogs;
      if (filtroDataFimLogs) params.dataFim = filtroDataFimLogs;

      const response = await api.get('/logs-sistema', { params });
      setLogs(response.data.logs);
      setTotalPaginasLogs(response.data.totalPages);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const formatarDataLog = (data: string) => {
    const date = new Date(data);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="bg-[#1A68CF] px-6 py-4">
        <h2 className="text-white text-2xl font-semibold">Parâmetros</h2>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-300 p-8 max-w-3xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Configurações do Sistema</h3>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-3 text-base">
              Definir como atrasados os chamados que estiverem sem ler há
              <input
                type="number"
                min="1"
                value={horasParaAtrasoEdit}
                onChange={(e) => setHorasParaAtrasoEdit(Number(e.target.value))}
                className="mx-3 px-3 py-2 w-24 border border-gray-300 rounded text-gray-900 text-center"
              />
              horas
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Chamados abertos sem responsável atribuído por mais de {horasParaAtrasoEdit} horas serão marcados como atrasados.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={salvarParametros}
              disabled={salvandoParametros}
             className="px-6 py-2 bg-[#001960] text-white rounded-lg hover:bg-[#001960]/80 transition-all transform hover:scale-105 font-medium disabled:bg-blue-400 disabled:cursor-not-allowed disabled:transform-none"

            >
              {salvandoParametros ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button
              onClick={() => setHorasParaAtrasoEdit(horasParaAtraso)}
              className="px-6 py-2 bg-transparent border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 transform hover:scale-105 font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed"

            >
              Cancelar
            </button>
          </div>
        </div>

        {/* Histórico de Logs */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 max-w-full mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Histórico de Alterações</h3>
          
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <select
              value={filtroTipoOperacao}
              onChange={(e) => {
                setFiltroTipoOperacao(e.target.value);
                setPaginaLogs(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded text-gray-900"
            >
              <option value="">Todos os tipos</option>
              <option value="PARAMETRO_ALTERADO">Parâmetro Alterado</option>
              <option value="USUARIO_CRIADO">Usuário Criado</option>
              <option value="USUARIO_EDITADO">Usuário Editado</option>
              <option value="USUARIO_DESATIVADO">Usuário Desativado</option>
            </select>

            <input
              type="date"
              value={filtroDataInicioLogs}
              onChange={(e) => {
                setFiltroDataInicioLogs(e.target.value);
                setPaginaLogs(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded text-gray-900"
              placeholder="Data inicial"
            />

            <input
              type="date"
              value={filtroDataFimLogs}
              onChange={(e) => {
                setFiltroDataFimLogs(e.target.value);
                setPaginaLogs(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded text-gray-900"
              placeholder="Data final"
            />

            <button
              onClick={() => carregarLogs()}
              disabled={loadingLogs}
                 className="px-6 py-2 bg-[#001960] text-white rounded-lg hover:bg-[#001960]/80 transition-all transform hover:scale-105 font-medium disabled:bg-blue-400 disabled:cursor-not-allowed disabled:transform-none"

            >
              {loadingLogs ? 'Buscando...' : 'Buscar'}
            </button>

            <button
              onClick={() => {
                setFiltroTipoOperacao('');
                setFiltroDataInicioLogs('');
                setFiltroDataFimLogs('');
                setPaginaLogs(1);
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
            >
              Limpar Filtros
            </button>
          </div>

          {/* Tabela de Logs */}
          {loadingLogs ? (
            <div className="text-center py-8 text-gray-500">Carregando logs...</div>
          ) : logs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Anterior</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Novo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatarDataLog(log.dataAlteracao)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {log.tipoOperacao}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {log.descricao}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.usuarioNome || 'Sistema'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {log.valorAnterior || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {log.valorNovo || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginasLogs > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPaginaLogs(p => Math.max(1, p - 1))}
                    disabled={paginaLogs === 1}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    Página {paginaLogs} de {totalPaginasLogs}
                  </span>
                  <button
                    onClick={() => setPaginaLogs(p => Math.min(totalPaginasLogs, p + 1))}
                    disabled={paginaLogs === totalPaginasLogs}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">Nenhum log encontrado</div>
          )}
        </div>
      </div>
    </>
  );
}
