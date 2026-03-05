'use client';

import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import api from '@/services/api';

// ids de status
const STATUS_ABERTO = 1;
const STATUS_EM_ANDAMENTO = 2;
const STATUS_FINALIZADO = 3;

export default function Dashboard() {
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
  const [dadosUsuarios, setDadosUsuarios] = useState<any[]>([]);

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
      console.error('Erro ao carregar parâmetros');
    }
  }

  async function carregarDados() {
    if (!dataInicio || !dataFim) return;
    setLoading(true);
    try {
      const response = await api.get('/chamados', { params: { pageSize: 10000 } });
      const todosChamados = response.data.chamados ?? response.data;
      const chamadosFiltrados = filtrarChamadosPorPeriodo(todosChamados);

      processarIndicadores(chamadosFiltrados);
      processarPrioridades(chamadosFiltrados);
      processarDepartamentos(chamadosFiltrados);
      processarTopicos(chamadosFiltrados);
      processarUsuarios(chamadosFiltrados);
    } catch (err) {
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function filtrarChamadosPorPeriodo(chamados: any[]) {
    const inicio = new Date(dataInicio!);
    const fim = new Date(dataFim!);
    fim.setHours(23, 59, 59, 999);

    return chamados.filter(chamado => {
      const dataAbertura = new Date(chamado.dataAbertura);
      const dataFechamento = chamado.dataFechamento ? new Date(chamado.dataFechamento) : null;

      if (chamado.status?.id === STATUS_FINALIZADO) {
        return dataFechamento && dataFechamento >= inicio && dataFechamento <= fim;
      }
      return dataAbertura >= inicio && dataAbertura <= fim;
    });
  }

  function processarIndicadores(chamados: any[]) {
    setChamadosAbertos(chamados.filter(c => c.status?.id === STATUS_ABERTO).length);
    setChamadosEmAndamento(chamados.filter(c => c.status?.id === STATUS_EM_ANDAMENTO).length);
    setChamadosFinalizados(chamados.filter(c => c.status?.id === STATUS_FINALIZADO).length);
    const limite = new Date(Date.now() - horasParaAtraso * 60 * 60 * 1000);
    setChamadosAtrasados(chamados.filter(c => c.status?.id === STATUS_ABERTO && new Date(c.dataAbertura) < limite).length);
  }

  function processarPrioridades(chamados: any[]) {
    const map = new Map<string, { valor: number; cor: string }>();
    chamados.forEach(c => {
      const nome = c.tipoPrioridade?.nome ?? 'Sem prioridade';
      const cor = c.tipoPrioridade?.cor ?? '#999';
      map.set(nome, { valor: (map.get(nome)?.valor ?? 0) + 1, cor });
    });
    const dadosFormatados = Array.from(map.entries()).map(([nome, v]) => ({ name: nome, ...v }));
    setDadosPrioridade(dadosFormatados);
    if (prioridadeSelecionadas.size === 0) {
      setPrioridadeSelecionadas(new Set(dadosFormatados.map(d => d.name)));
    }
  }

  const togglePrioridade = (nome: string) => {
    const novaselecionadas = new Set(prioridadeSelecionadas);
    novaselecionadas.has(nome) ? novaselecionadas.delete(nome) : novaselecionadas.add(nome);
    setPrioridadeSelecionadas(novaselecionadas);
  };

  const toggleTodos = () => {
    if (prioridadeSelecionadas.size === dadosPrioridade.length) {
      setPrioridadeSelecionadas(new Set());
    } else {
      setPrioridadeSelecionadas(new Set(dadosPrioridade.map(d => d.name)));
    }
  };

  const dadosPrioridadeFiltrados = dadosPrioridade.filter(d => prioridadeSelecionadas.has(d.name));

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
          percentual: total ? parseFloat(((valor / total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.valor - a.valor)
    );
  }

  function processarTopicos(chamados: any[]) {
    const map = new Map<string, { valor: number; usuarios: Map<string, number> }>();
    chamados.forEach(c => {
      const nomeTopico = c.topicoAjuda?.nome ?? 'Sem tópico';
      const nomeUsuario = c.usuario?.name ?? 'Usuário desconhecido';
      if (!map.has(nomeTopico)) map.set(nomeTopico, { valor: 0, usuarios: new Map() });
      const topico = map.get(nomeTopico)!;
      topico.valor += 1;
      topico.usuarios.set(nomeUsuario, (topico.usuarios.get(nomeUsuario) ?? 0) + 1);
    });
    const topicos = Array.from(map.entries())
      .map(([nome, data]) => {
        const usuarioMaisAtivo = Array.from(data.usuarios.entries()).sort((a, b) => b[1] - a[1])[0];
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

  function processarUsuarios(chamados: any[]) {
    const map = new Map<string, number>();
    chamados.forEach(c => {
      const nomeUsuario = c.usuario?.name ?? 'Usuário desconhecido';
      map.set(nomeUsuario, (map.get(nomeUsuario) ?? 0) + 1);
    });
    setDadosUsuarios(
      Array.from(map.entries())
        .map(([nome, valor]) => ({
          nome: nome.length > 20 ? nome.substring(0, 20) + '...' : nome,
          nomeCompleto: nome,
          valor,
        }))
        .sort((a, b) => b.valor - a.valor)
    );
  }

  return (
    <div className="pb-10 bg-gray-100 min-h-screen">
      <div className="bg-[#1A68CF] px-6 py-4">
        <h2 className="text-white text-2xl font-semibold">Dashboard</h2>
      </div>

      <div className="p-6">
        {/* filtro de periodo */}
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
            className="px-4 py-2 border border-gray-300 rounded text-gray-900"
            isClearable
          />
          <button
            onClick={carregarDados}
            disabled={loading}
            className="px-6 py-2 bg-[#002f61] text-white rounded disabled:opacity-50"
          >
            {loading ? 'Pesquisando...' : 'Pesquisar'}
          </button>
        </div>

        {/* cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card titulo="ABERTOS" valor={chamadosAbertos} cor="bg-[#2ECC71]" />
          <Card titulo="EM ANDAMENTO" valor={chamadosEmAndamento} cor="bg-purple-700" />
          <Card titulo="FINALIZADOS" valor={chamadosFinalizados} cor="bg-gray-800" />
          <Card titulo="ATRASADOS" valor={chamadosAtrasados} cor="bg-[#E74C3C]" />
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* priority */}
          <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl shadow-sm p-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Distribuição por Prioridade</h3>
            
            <div className="mb-6 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full cursor-pointer hover:bg-gray-100 transition-colors">
                <input type="checkbox" checked={prioridadeSelecionadas.size === dadosPrioridade.length} onChange={toggleTodos} className="w-4 h-4 rounded text-blue-600" />
                <span className="text-xs font-semibold text-gray-600">Todos</span>
              </label>
              {dadosPrioridade.map((p) => (
                <label key={p.name} className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full cursor-pointer">
                  <input type="checkbox" checked={prioridadeSelecionadas.has(p.name)} onChange={() => togglePrioridade(p.name)} className="w-4 h-4 rounded" style={{ accentColor: p.cor }} />
                  <span className="text-xs text-gray-600">{p.name}</span>
                </label>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={dadosPrioridadeFiltrados} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="valor">
                  {dadosPrioridadeFiltrados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* grafico por departamento */}
          <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl shadow-sm p-8">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Chamados por Departamento</h3>
            <div className="space-y-5">
              {dadosDepartamento.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-normal text-gray-700">{d.nome}</span>
                    <span className="text-sm font-light text-gray-900">{d.valor} ({d.percentual}%)</span>
                  </div>
                  <div className="h-8 bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
                    <div className="h-full bg-[#1A68CF] flex items-center justify-end pr-4 transition-all duration-700" style={{ width: `${d.percentual}%` }}>
                     
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* grafico top5 */}
        <div className="mt-8 bg-[#F8FAFC] border border-gray-200 rounded-xl shadow-sm p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Top 5 Tópicos de Ajuda</h3>
            <p className="text-sm text-gray-500">Chamados abertos com mais frequencia + usuario mais ativo no tópico</p>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dadosTopicos} margin={{ top: 40, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" angle={-30} textAnchor="end" interval={0} tick={{fontSize: 12}} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#4C1D95" radius={[10, 10, 0, 0]}>
                        <LabelList 
                          dataKey="usuarioTop" 
                          position="top" 
                          offset={10} 
                          formatter={(label) => typeof label === 'string' ? label.split(' ')[0] : label}
                          style={{fill: '#6D28D9', fontWeight: 'bold', fontSize: '12px'}} 
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>

       {/* graficos por usuario */}
<div className="mt-8 bg-[#F8FAFC] border border-gray-200 rounded-xl shadow-sm p-8">
  <div className="mb-6">
    <h3 className="text-xl font-bold text-gray-800">Total de Chamados Abertos por Usuário</h3>
    <p className="text-sm text-gray-500">Quantidade total de chamados abertos por cada usuário no período selecionado</p>
  </div>

  {dadosUsuarios.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-gray-400 italic">Nenhum dado disponível no período selecionado</p>
    </div>
  ) : (
    <ResponsiveContainer width="100%" height={600}>
      <BarChart 
        data={dadosUsuarios} 
        margin={{ top: 40, right: 30, left: 10, bottom: 100 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
        
        <XAxis 
          dataKey="nome" 
          angle={-45} 
          textAnchor="end" 
          height={120}
          interval={0}
          tick={{ fill: '#4B5563', fontSize: 12, fontWeight: 500 }} 
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        
        <YAxis 
          tick={{ fill: '#9CA3AF', fontSize: 12 }} 
          tickLine={false}
          axisLine={false}
          label={{ 
            value: 'Chamados', 
            angle: -90, 
            position: 'insideLeft', 
            style: { fill: '#9CA3AF', fontSize: 12, fontWeight: 600 } 
          }}
        />
        
        <Tooltip 
          cursor={{ fill: '#F9FAFB' }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-[#F8FAFC] border-none shadow-2xl rounded-lg p-4 ">
                  <h4 className="font-bold text-gray-900 mb-2 border-b border-gray-300 pb-2 ">{data.nomeCompleto}</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <p className="text-sm text-gray-600">
                      <strong>{data.valor}</strong> chamados
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        
        <Bar 
          dataKey="valor" 
          fill="#3B82F6" 
          radius={[6, 6, 0, 0]}
          maxBarSize={50}
        >
          <LabelList 
            dataKey="valor"
            position="top"
            offset={15}
            style={{ 
              fill: '#1E40AF', 
              fontWeight: '700', 
              fontSize: '13px'
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )}
</div>
      </div>
    </div>
  );
}

function Card({ titulo, valor, cor }: any) {
  return (
    <div className={`${cor} text-white rounded-xl p-6 shadow-md transition-transform hover:scale-105`}>
      <div className="text-4xl font-bold">{valor}</div>
      <div className="text-sm font-medium opacity-80 uppercase tracking-wider">{titulo}</div>
    </div>
  );
}