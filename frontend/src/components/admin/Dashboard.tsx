'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';

export default function Dashboard() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [chamadosAbertos, setChamadosAbertos] = useState(0);
  const [chamadosFinalizados, setChamadosFinalizados] = useState(0);
  const [chamadosEmAndamento, setChamadosEmAndamento] = useState(0);
  const [chamadosAtrasados, setChamadosAtrasados] = useState(0);
  const [dadosPrioridade, setDadosPrioridade] = useState<any[]>([]);
  const [dadosDepartamento, setDadosDepartamento] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [horasParaAtraso, setHorasParaAtraso] = useState(24);

  // colocar as datas do mes atual ao carregar
  useEffect(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    setDataInicio(primeiroDia.toISOString().split('T')[0]);
    setDataFim(ultimoDia.toISOString().split('T')[0]);
  }, []);

  // carregar parametros
  useEffect(() => {
    carregarParametros();
  }, []);

  // carregar dados quando as datas estiverem definidas
  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarDados();
    }
  }, [dataInicio, dataFim]);

  const carregarParametros = async () => {
    try {
      const response = await api.get('/parametros');
      setHorasParaAtraso(response.data.horasParaAtraso);
    } catch (error) {
      console.error('Erro ao carregar parâmetros:', error);
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const response = await api.get('/chamados', {
        params: { dataInicio, dataFim }
      });

      const chamados = response.data.chamados || response.data;

      // contar abertos e finalizados
      const abertos = chamados.filter((c: any) => c.status?.id === 1).length;
      const finalizados = chamados.filter((c: any) => c.status?.id !== 1).length;
      const emAndamento = chamados.filter((c: any) => c.status?.id === 2).length;
      
      // contar atrasados
      const dataLimite = new Date();
      dataLimite.setHours(dataLimite.getHours() - horasParaAtraso);
      const atrasados = chamados.filter((c: any) => {
        if (c.status?.id !== 1) return false;
        if (c.userResponsavel) return false;
        const dataAbertura = new Date(c.dataAbertura);
        return dataAbertura < dataLimite;
      }).length;
      
      setChamadosAbertos(abertos);
      setChamadosFinalizados(finalizados);
      setChamadosEmAndamento(emAndamento);
      setChamadosAtrasados(atrasados);

      // processar dados por prioridade
      const prioridadeMap = new Map();
      chamados.forEach((c: any) => {
        if (c.status?.id === 1) {
          const prioridadeNome = c.tipoPrioridade?.nome || 'Sem prioridade';
          const prioridadeCor = c.tipoPrioridade?.cor || '#999999';
          const count = prioridadeMap.get(prioridadeNome) || { count: 0, cor: prioridadeCor };
          prioridadeMap.set(prioridadeNome, { count: count.count + 1, cor: prioridadeCor });
        }
      });

      const prioridadeData = Array.from(prioridadeMap.entries()).map(([nome, data]: [string, any]) => ({
        nome,
        valor: data.count,
        cor: data.cor,
      }));
      setDadosPrioridade(prioridadeData);

      // processar dados por departamento
      const departamentoMap = new Map();
      chamados.forEach((c: any) => {
        const deptNome = c.departamento?.name || 'Sem departamento';
        departamentoMap.set(deptNome, (departamentoMap.get(deptNome) || 0) + 1);
      });

      const total = chamados.length;
      const departamentoData = Array.from(departamentoMap.entries()).map(([nome, count]) => ({
        nome,
        valor: count as number,
        percentual: total > 0 ? ((count as number / total) * 100).toFixed(1) : 0,
      })).sort((a, b) => b.valor - a.valor);
      
      setDadosDepartamento(departamentoData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* faixa Dashboard */}
      <div className="bg-blue-400 px-6 py-4">
        <h2 className="text-white text-2xl font-semibold">Dashboard</h2>
      </div>

      <div className="p-6">
        {/* filtros de data */}
        <div className="flex justify-end items-center gap-4 mb-6">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded text-gray-900"
          />
          <span className="text-gray-700">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded text-gray-900"
          />
          <button
            onClick={carregarDados}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
          >
            {loading ? 'Pesquisando...' : 'Pesquisar'}
          </button>
        </div>

        {/* cards de chamados */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-green-500 rounded-lg p-8 flex items-center gap-6 text-white">
            <img src="/icons/iconabertos.svg" alt="Abertos" className="w-16 h-16" />
            <div>
              <div className="text-5xl font-bold mb-1">{chamadosAbertos}</div>
              <div className="text-xl font-medium">ABERTOS</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-8 flex items-center gap-6 text-white">
            <img src="/icons/iconfechados.svg" alt="Finalizados" className="w-16 h-16" />
            <div>
              <div className="text-5xl font-bold mb-1">{chamadosFinalizados}</div>
              <div className="text-xl font-medium">FINALIZADOS</div>
            </div>
          </div>

          <div className="bg-purple-800 rounded-lg p-8 flex items-center gap-6 text-white">
            <img src="/icons/iconemandamento.svg" alt="Em Andamento" className="w-16 h-16" />
            <div>
              <div className="text-5xl font-bold mb-1">{chamadosEmAndamento}</div>
              <div className="text-xl font-medium">EM ANDAMENTO</div>
            </div>
          </div>

          <div className="bg-red-600 rounded-lg p-8 flex items-center gap-6 text-white">
            <img src="/icons/iconatrasado.svg" alt="Atrasados" className="w-16 h-16" />
            <div>
              <div className="text-5xl font-bold mb-1">{chamadosAtrasados}</div>
              <div className="text-xl font-medium">ATRASADOS</div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-2 gap-6">
          {/* Gráfico de Pizza - Prioridade */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">Por prioridade</h3>
            
            {dadosPrioridade.length > 0 ? (
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 200 200" className="w-64 h-64 mb-4">
                  {(() => {
                    const total = dadosPrioridade.reduce((sum, item) => sum + item.valor, 0);
                    let currentAngle = 0;
                    
                    return dadosPrioridade.map((item, index) => {
                      const percentage = (item.valor / total) * 100;
                      const angle = (percentage / 100) * 360;
                      const startAngle = currentAngle;
                      const endAngle = currentAngle + angle;
                      
                      const x1 = 100 + 90 * Math.cos((startAngle - 90) * Math.PI / 180);
                      const y1 = 100 + 90 * Math.sin((startAngle - 90) * Math.PI / 180);
                      const x2 = 100 + 90 * Math.cos((endAngle - 90) * Math.PI / 180);
                      const y2 = 100 + 90 * Math.sin((endAngle - 90) * Math.PI / 180);
                      
                      const largeArc = angle > 180 ? 1 : 0;
                      const pathData = `M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`;
                      
                      currentAngle += angle;
                      
                      return (
                        <g key={index}>
                          <path d={pathData} fill={item.cor} stroke="#fff" strokeWidth="2" />
                          <text
                            x={100 + 60 * Math.cos(((startAngle + endAngle) / 2 - 90) * Math.PI / 180)}
                            y={100 + 60 * Math.sin(((startAngle + endAngle) / 2 - 90) * Math.PI / 180)}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize="14"
                            fontWeight="bold"
                          >
                            {item.valor}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
                
                <div className="flex flex-wrap justify-center gap-4">
                  {dadosPrioridade.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.cor }}></div>
                      <span className="text-sm text-gray-700">{item.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">Nenhum chamado aberto no período</div>
            )}
          </div>

          {/* Gráfico de Barras - Departamento */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">Por Departamento</h3>
            
            {dadosDepartamento.length > 0 ? (
              <div className="space-y-4">
                {dadosDepartamento.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm text-gray-700 mb-1">
                      <span className="font-medium">{item.nome}</span>
                      <span>{item.percentual}%</span>
                    </div>
                    <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${item.percentual}%` }}
                      >
                        <span className="text-xs font-bold text-white">{item.valor}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">Nenhum dado disponível</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
