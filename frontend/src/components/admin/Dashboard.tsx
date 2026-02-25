'use client';

import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import api from '@/services/api';

// IDs de status (ajuste se necessário)
const STATUS_ABERTO = 1;
const STATUS_EM_ANDAMENTO = 2;
const STATUS_FINALIZADO = 3;

export default function Dashboard() {
  // período (igual ao seu bloco de filtros)
  const [dataInicio, setDataInicio] = useState<Date | null>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [dataFim, setDataFim] = useState<Date | null>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  );

  const [chamadosAbertos, setChamadosAbertos] = useState(0);
  const [chamadosEmAndamento, setChamadosEmAndamento] = useState(0);
  const [chamadosFinalizados, setChamadosFinalizados] = useState(0);
  const [chamadosAtrasados, setChamadosAtrasados] = useState(0);

  const [dadosPrioridade, setDadosPrioridade] = useState<any[]>([]);
  const [prioridadeSelecionadas, setPrioridadeSelecionadas] = useState<Set<string>>(new Set());
  const [dadosDepartamento, setDadosDepartamento] = useState<any[]>([]);
  const [dadosTopicos, setDadosTopicos] = useState<any[]>([]);

  const [horasParaAtraso, setHorasParaAtraso] = useState(24);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarParametros();
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarDados();
    }
  }, [dataInicio, dataFim, horasParaAtraso]);

  async function carregarParametros() {
    try {
      const response = await api.get('/parametros');
      setHorasParaAtraso(response.data.horasParaAtraso ?? 24);
    } catch (err) {
      console.error('Erro ao carregar parâmetros', err);
    }
  }

  async function carregarDados() {
    if (!dataInicio || !dataFim) return;

    setLoading(true);

    try {
      const response = await api.get('/chamados', {
        params: {
          pageSize: 10000, // Para buscar todos os chamados
        },
      });

      const todosChamados = response.data.chamados ?? response.data;

      // Filtrar chamados por período baseado no status
      const chamadosFiltrados = filtrarChamadosPorPeriodo(todosChamados);

      processarIndicadores(chamadosFiltrados);
      processarPrioridades(chamadosFiltrados);
      processarDepartamentos(chamadosFiltrados);
      processarTopicos(chamadosFiltrados);
    } catch (err) {
      console.error('Erro ao carregar dados', err);
    } finally {
      setLoading(false);
    }
  }

  function filtrarChamadosPorPeriodo(chamados: any[]) {
    const inicio = new Date(dataInicio!);
    const fim = new Date(dataFim!);
    fim.setHours(23, 59, 59, 999); // Fim do dia

    return chamados.filter(chamado => {
      const dataAbertura = new Date(chamado.dataAbertura);
      const dataFechamento = chamado.dataFechamento ? new Date(chamado.dataFechamento) : null;

      if (chamado.status?.id === STATUS_FINALIZADO) {
        // Para finalizados, usar dataFechamento
        return dataFechamento && dataFechamento >= inicio && dataFechamento <= fim;
      } else {
        // Para outros, usar dataAbertura
        return dataAbertura >= inicio && dataAbertura <= fim;
      }
    });
  }

  function processarIndicadores(chamados: any[]) {
    setChamadosAbertos(
      chamados.filter(c => c.status?.id === STATUS_ABERTO).length
    );

    setChamadosEmAndamento(
      chamados.filter(c => c.status?.id === STATUS_EM_ANDAMENTO).length
    );

    setChamadosFinalizados(
      chamados.filter(c => c.status?.id === STATUS_FINALIZADO).length
    );

    const limite = new Date(
      Date.now() - horasParaAtraso * 60 * 60 * 1000
    );

    setChamadosAtrasados(
      chamados.filter(c => {
        if (c.status?.id !== STATUS_ABERTO) return false;
        return new Date(c.dataAbertura) < limite;
      }).length
    );
  }

  function processarPrioridades(chamados: any[]) {
    const map = new Map<string, { valor: number; cor: string }>();

    // Contar TODOS os chamados, independente do status
    chamados.forEach(c => {
      const nome = c.tipoPrioridade?.nome ?? 'Sem prioridade';
      const cor = c.tipoPrioridade?.cor ?? '#999';

      map.set(nome, {
        valor: (map.get(nome)?.valor ?? 0) + 1,
        cor,
      });
    });

    const dadosFormatados = Array.from(map.entries()).map(([nome, v]) => ({
      name: nome,
      ...v,
    }));

    setDadosPrioridade(dadosFormatados);

    // Inicializar com todas selecionadas na primeira vez
    if (prioridadeSelecionadas.size === 0) {
      const todasAsNomes = new Set(dadosFormatados.map(d => d.name));
      setPrioridadeSelecionadas(todasAsNomes);
    }
  }

  const togglePrioridade = (nome: string) => {
    const novaselecionadas = new Set(prioridadeSelecionadas);
    if (novaselecionadas.has(nome)) {
      novaselecionadas.delete(nome);
    } else {
      novaselecionadas.add(nome);
    }
    setPrioridadeSelecionadas(novaselecionadas);
  };

  const toggleTodos = () => {
    if (prioridadeSelecionadas.size === dadosPrioridade.length) {
      // Se todos estão selecionados, deseleciona todos
      setPrioridadeSelecionadas(new Set());
    } else {
      // Caso contrário, seleciona todos
      const todasAsNomes = new Set(dadosPrioridade.map(d => d.name));
      setPrioridadeSelecionadas(todasAsNomes);
    }
  };

  // Dados filtrados para o gráfico
  const dadosPrioridadeFiltrados = dadosPrioridade.filter(d =>
    prioridadeSelecionadas.has(d.name)
  );

  function processarDepartamentos(chamados: any[]) {
    const map = new Map<string, number>();

    chamados.forEach(c => {
      const nome = c.departamento?.name ?? 'Sem departamento';
      map.set(nome, (map.get(nome) ?? 0) + 1);
    });

    const total = chamados.length;

    setDadosDepartamento(
      Array.from(map.entries())
        .map(([nome, valor]) => ({
          nome,
          valor,
          percentual: total
            ? ((valor / total) * 100).toFixed(1)
            : '0',
        }))
        .sort((a, b) => b.valor - a.valor)
    );
  }

  function processarTopicos(chamados: any[]) {
    const map = new Map<string, { valor: number; usuarios: Map<string, number> }>();

    chamados.forEach(c => {
      const nomeTopico = c.topicoAjuda?.nome ?? 'Sem tópico';
      const nomeUsuario = c.usuario?.name ?? 'Usuário desconhecido';

      if (!map.has(nomeTopico)) {
        map.set(nomeTopico, { valor: 0, usuarios: new Map<string, number>() });
      }

      const topico = map.get(nomeTopico)!;
      topico.valor += 1;
      
      // Contar chamados por usuário neste tópico
      const countUsuario = topico.usuarios.get(nomeUsuario) ?? 0;
      topico.usuarios.set(nomeUsuario, countUsuario + 1);
    });

    // ordenar por valor (decrescente) e pegar apenas os top 5
    const topicos = Array.from(map.entries())
      .map(([nome, data]) => {
        // obter o usuário que mais abriu chamados neste tópico
        const usuarioMaisAtivo = Array.from(data.usuarios.entries())
          .sort((a, b) => b[1] - a[1])[0];

        return {
          nome,
          valor: data.valor,
          usuarioTop: usuarioMaisAtivo ? usuarioMaisAtivo[0] : 'N/A',
          quantidadeUsuarioTop: usuarioMaisAtivo ? usuarioMaisAtivo[1] : 0,
        };
      })
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    setDadosTopicos(topicos);
  }

  return (
    <>
      <div className="bg-blue-500 px-6 py-4">
        <h2 className="text-white text-2xl font-semibold">Dashboard</h2>
      </div>

      <div className="p-6">
        {/* Filtro de período */}
        <div className="flex justify-end gap-4 mb-6">
          <DatePicker
            selectsRange
            startDate={dataInicio}
            endDate={dataFim}
            onChange={(update: [Date | null, Date | null]) => {
              const [start, end] = update;
              setDataInicio(start);
              setDataFim(end);
            }}
            dateFormat="dd/MM/yyyy"
            placeholderText="Selecione o período"
            className="px-4 py-2 border border-gray-300 rounded text-gray-900"
            isClearable
          />

          <button
            onClick={carregarDados}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Pesquisando...' : 'Pesquisar'}
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card titulo="ABERTOS" valor={chamadosAbertos} cor="bg-[#2ECC71]" />
          <Card titulo="EM ANDAMENTO" valor={chamadosEmAndamento} cor="bg-purple-700" />
          <Card titulo="FINALIZADOS" valor={chamadosFinalizados} cor="bg-gray-800" />
          <Card titulo="ATRASADOS" valor={chamadosAtrasados} cor="bg-[#E74C3C]" />
        </div>

        {/* gráficos */}
        <div className="grid grid-cols-2 gap-6 text-gray-400">
          <div className="bg-white border border-gray-400 rounded p-6">
            <h3 className="font-semibold mb-4 text-gray-900">Por prioridade</h3>
            
            {/* Checkboxes de filtro */}
            <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Filtrar por prioridade:</p>
              <div className="space-y-2">
                {/* Checkbox "Todos" */}
                <label className="flex items-center gap-2 cursor-pointer pb-2 border-b border-gray-300 mb-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={prioridadeSelecionadas.size === dadosPrioridade.length && dadosPrioridade.length > 0}
                    onChange={toggleTodos}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-900">Todos</span>
                </label>

                {/* Checkboxes individuais */}
                {dadosPrioridade.map((prioridade) => (
                  <label key={prioridade.name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prioridadeSelecionadas.has(prioridade.name)}
                      onChange={() => togglePrioridade(prioridade.name)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: prioridade.cor }} />
                      <span>{prioridade.name} ({prioridade.valor})</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Gráfico */}
            {dadosPrioridadeFiltrados.length === 0 ? (
              <p className="text-gray-500 text-center">Selecione pelo menos uma prioridade</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={dadosPrioridadeFiltrados} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`} outerRadius={80} fill="#8884d8" dataKey="valor">
                    {dadosPrioridadeFiltrados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor || '#333'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white border border-gray-400 rounded p-6 text-gray-500">
            <h3 className="font-semibold mb-4 text-gray-700">Por departamento</h3>
            {dadosDepartamento.map((d, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>{d.nome}</span>
                  <span>{d.percentual}%</span>
                </div>
                <div className="h-6 bg-gray-200 rounded">
                  <div className="h-full bg-blue-600 rounded text-white text-xs flex items-center justify-end pr-2" style={{ width: `${d.percentual}%` }}>
                    {d.valor}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* gráfico de Top 5 Tópicos */}
        <div className="mt-6 bg-white border border-gray-400 rounded p-6">
          <h3 className="font-semibold mb-4 text-gray-900">Top 5 Tópicos de Ajuda Mais Relatados</h3>
          <p className="text-sm text-gray-600 mb-4">O nome acima de cada barra indica o usuário que mais abre chamados desse tipo</p>
          {dadosTopicos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum dado disponível no período selecionado</p>
          ) : (
            <ResponsiveContainer width="100%" height={600}>
              <BarChart data={dadosTopicos} margin={{ top: 80, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="nome" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval={0}
                  tick={{ fill: '#374151', fontSize: 12, fontWeight: 'bold' }}
                />
                <YAxis 
                  tick={{ fill: '#374151' }} 
                  label={{ value: 'Quantidade de Chamados', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length && payload[0].payload) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-lg">
                          <h4 className="font-semibold text-gray-900 mb-2">{label}</h4>
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Total de chamados:</strong> {data.valor}
                          </p>
                          <div className="border-t border-gray-200 pt-2">
                            <p className="text-xs font-semibold text-gray-700 mb-1">
                              Usuário mais ativo neste tópico:
                            </p>
                            <div className="text-xs text-gray-600">
                              <strong>{data.usuarioTop}</strong> - {data.quantidadeUsuarioTop} chamados
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                
                <Bar 
                  dataKey="valor" 
                  fill="#430372" 
                  radius={[8, 8, 0, 0]}
                >
                  <LabelList 
                    dataKey="usuarioTop"
                    position="top"
                    offset={10}
                    style={{ 
                      fill: '#6A5ACD', 
                      fontWeight: 'bold', 
                      fontSize: '15px',
                      textTransform: 'uppercase'
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>      </div>
    </>
  );
}

function Card({ titulo, valor, cor }: any) {
  return (
    <div className={`${cor} text-white rounded p-6`}>
      <div className="text-4xl font-bold">{valor}</div>
      <div className="text-lg">{titulo}</div>
    </div>
  );
}
