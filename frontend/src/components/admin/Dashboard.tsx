'use client';

import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import api from '@/services/api';

import { LineChart, Line } from 'recharts';

// ids de status
const STATUS_ABERTO = 1;
const STATUS_EM_ANDAMENTO = 2;
const STATUS_FINALIZADO = 3;
const STATUS_PENDENTE = 7;
const STATUS_PENDENTE_USUARIO = 6;

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
  const [chamadosPendentes, setChamadosPendentes] = useState(0);
  const [totalChamados, setTotalChamados] = useState(0);
  const [chamadosPendentesUsuario, setChamadosPendentesUsuario] = useState(0);

  const [dadosPrioridade, setDadosPrioridade] = useState<any[]>([]);
  const [prioridadeSelecionadas, setPrioridadeSelecionadas] = useState<Set<string>>(new Set());
  const [dadosDepartamento, setDadosDepartamento] = useState<any[]>([]);
  const [dadosTopicos, setDadosTopicos] = useState<any[]>([]);
  const [dadosUsuarios, setDadosUsuarios] = useState<any[]>([]);

  const [dadosInternoExterno, setDadosInternoExterno] = useState<any[]>([]);

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
      // formatar datas para yyyy-MM-dd e garantir que dataAberturaFim inclua o final do dia
      const dataAberturaInicio = dataInicio.toISOString().slice(0, 10);
      // dataFim ajustado para 23:59:59
      const dataFimAjustada = new Date(dataFim);
      dataFimAjustada.setHours(23, 59, 59, 999);
      const dataAberturaFim = dataFimAjustada.toISOString().slice(0, 19).replace('T', ' ');
      const response = await api.get('/chamados', {
        params: {
          pageSize: 999999,
          dataAberturaInicio,
          dataAberturaFim
        }
      });
      const todosChamados = response.data.chamados ?? response.data;
      // agora o filtro de período já é feito no backend, não precisa filtrar novamente aqui
      processarIndicadores(todosChamados);
      processarPrioridades(todosChamados);
      processarDepartamentos(todosChamados);
      processarTopicos(todosChamados);
      processarUsuarios(todosChamados);
      processarInternoExterno(todosChamados);
    } catch (err) {
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }
 
  //funcao pra gerar dados do grafico de linhas de chamados internos x externos 
  function processarInternoExterno(chamados: any[]) {
    // agrupar por dia apenas se houver chamados
    const map: Record<string, { interno: number; externo: number }> = {};
    chamados.forEach(c => {
      const data = new Date(c.dataAbertura);
      // Corrigir para data local (yyyy-mm-dd no fuso do navegador)
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const diaNum = String(data.getDate()).padStart(2, '0');
      const dia = `${ano}-${mes}-${diaNum}`;
      // se o chamado foi criado por admin (roleId === 1), é interno
      const isInterno = c.usuario?.roleId === 1 || c.usuario?.role_id === 1 || c.usuario?.role === 1;
      if (!map[dia]) map[dia] = { interno: 0, externo: 0 };
      if (isInterno) map[dia].interno++;
      else map[dia].externo++;
    });
    // ordenar por data
    const datas = Object.keys(map).sort();
    // DEBUG: logar datas encontradas e range selecionado
    if (datas.length > 0) {
      console.log('Dias com chamados:', datas);
      console.log('Range selecionado:', dataInicio, dataFim);
    }
    // Montar apenas dias com chamados
    const dados = datas.map(dia => ({
      dia,
      Interno: map[dia].interno,
      Externo: map[dia].externo,
    }));
    setDadosInternoExterno(dados);
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
    setChamadosPendentes(
      chamados.filter(c => c.status?.id === STATUS_PENDENTE || c.status?.id === STATUS_PENDENTE_USUARIO).length
    );
    setTotalChamados(chamados.length);
    setChamadosPendentesUsuario(chamados.filter(c => c.status?.id === STATUS_PENDENTE_USUARIO).length);
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
      <div className="bg-[#1A68CF] px-4 md:px-6 py-4">
        <h2 className="text-white text-xl md:text-2xl font-semibold">Dashboard</h2>
      </div>

      <div className="p-4 md:p-6">
        {/* filtro de periodo */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4 mb-6">
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
            className="px-4 py-2 border border-gray-300 rounded text-gray-900 w-full sm:w-auto"
            isClearable
          />
          <button
            onClick={carregarDados}
            disabled={loading}
            className="px-6 py-2 bg-[#002f61] text-white rounded disabled:opacity-50 w-full sm:w-auto"
          >
            {loading ? 'Pesquisando...' : 'Pesquisar'}
          </button>
        </div>

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">

  {/* esquerda */}
  <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">

    <Card titulo="ABERTOS" valor={chamadosAbertos} cor="bg-[#2ECC71]" />
    <Card titulo="ATRASADOS" valor={chamadosAtrasados} cor="bg-[#E74C3C]" />
    <Card titulo="EM ANDAMENTO" valor={chamadosEmAndamento} cor="bg-blue-600" />
    <Card titulo="FINALIZADOS" valor={chamadosFinalizados} cor="bg-slate-800" />
    <Card titulo="PENDENTES TERCEIROS" valor={chamadosPendentes} cor="bg-amber-500" />
    <Card titulo="PENDENTE USUARIO" valor={chamadosPendentesUsuario} cor="bg-purple-600" />

  </div>

  {/* direita - destaque */}
  <div className="lg:col-span-1">
    <div className="h-full bg-linear-to-br from-slate-700 to-slate-900 text-white rounded-2xl p-6 shadow-lg flex flex-col justify-between">
      
      <div>
        <p className="text-sm opacity-70">Total Geral</p>
        <h2 className="text-4xl font-bold mt-2">
          {totalChamados}
        </h2>
      </div>

      <div className="text-sm opacity-70">
        Total de chamados no período
      </div>
    </div>
  </div>

</div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
               
          {/* priority */}
          <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl shadow-sm p-4 md:p-8">
            <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4">Distribuição por Prioridade</h3>
            
            <div className="mb-4 md:mb-6 flex flex-wrap gap-2 p-2 md:p-3 bg-gray-50 rounded-lg overflow-x-auto">
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
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={dadosPrioridadeFiltrados} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="valor">
                  {dadosPrioridadeFiltrados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} stroke="none" />
                  ))}
                </Pie>
         <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0];

              const valor = Number(data.value ?? 0); 

              const total = dadosPrioridadeFiltrados.reduce(
                (acc, d) => acc + Number(d.valor ?? 0),
                0
              );

              const percentual = total > 0 
                ? ((valor / total) * 100).toFixed(1)
                : "0";

              return (
                <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700">
                  <p className="font-semibold text-sm mb-1">
                    {data.name}
                  </p>

                  <p className="text-xs text-gray-300">
                    {valor} chamados ({percentual}%)
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* grafico por departamento */}
          <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl shadow-sm p-4 md:p-8">
            <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 md:mb-6">Chamados por Departamento</h3>
            <div className="space-y-3 md:space-y-5">
              {dadosDepartamento.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1 gap-2">
                    <span className="text-xs md:text-sm font-normal text-gray-700 truncate">{d.nome}</span>
                    <span className="text-xs md:text-sm font-light text-gray-900 whitespace-nowrap">{d.valor} ({d.percentual}%)</span>
                  </div>
                  <div className="h-6 md:h-8 bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
                    <div className="h-full bg-[#1A68CF] flex items-center justify-end pr-2 md:pr-4 transition-all duration-700" style={{ width: `${d.percentual}%` }}>
                     
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
   {/* grafico de linhas Interno x Externo */}
<div className="mt-6 md:mt-8 bg-white border border-gray-100 rounded-2xl shadow-md p-5 md:p-8 transition-all hover:shadow-lg">
  
  {/* Header */}
  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
    <div>
      <h3 className="text-lg md:text-xl font-semibold text-gray-800">
        Chamados Internos vs Externos
      </h3>
      <p className="text-xs md:text-sm text-gray-400 mt-1">
        Volume diário de chamados no período selecionado
      </p>
    </div>

    {/* Total destacado */}
    <div className="mt-3 md:mt-0 bg-gray-50 border border-gray-100 px-4 py-2 rounded-lg">
      <span className="text-xs text-gray-500">Total</span>
      <p className="text-sm font-semibold text-gray-800">
        {dadosInternoExterno.reduce((acc, d) => acc + d.Interno + d.Externo, 0)} chamados
      </p>
    </div>
  </div>

  {/* Chart */}
  <ResponsiveContainer width="100%" height={320}>
    <LineChart
      data={dadosInternoExterno}
      margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
    >
      <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" vertical={false} />

          <XAxis
        dataKey="dia"
        tickFormatter={(value) => {
          // value é yyyy-mm-dd, montar data local corretamente
          if (typeof value === 'string' && value.length === 10) {
            const [ano, mes, dia] = value.split('-');
            return `${dia}/${mes}`;
          }
          return value;
        }}
        tick={{ fontSize: 12, fill: "#6B7280" }}
        axisLine={false}
        tickLine={false}
        angle={-25}
        textAnchor="end"
        interval={0}
      />

      <YAxis
        tick={{ fontSize: 12, fill: "#6B7280" }}
        axisLine={false}
        tickLine={false}
        allowDecimals={false}
      />

        <Tooltip
        labelFormatter={(value) => {

          if (typeof value === 'string' && value.length === 10) {
            const [ano, mes, dia] = value.split('-');
            return `${dia}/${mes}/${ano}`;
          }
          return value;
        }}
        contentStyle={{
          background: "#111827",
          border: "none",
          borderRadius: "5px",
          color: "#fff",
          fontSize: "14px"
        }}
        labelStyle={{ color: "#9CA3AF" }}
      />
      <Legend
        verticalAlign="top"
        height={36}
        iconType="circle"
        formatter={(value) =>
          value === "Interno" ? (
            <span className="text-blue-600 font-medium">Interno</span>
          ) : (
            <span className="text-amber-500 font-medium">Externo</span>
          )
        }
      />

      {/* linha interno */}
      <Line
        type="monotone"
        dataKey="Interno"

        stroke="#3B82F6"
        strokeWidth={2.5}
        dot={false}
        activeDot={{ r: 6 }}
      />

      {/* linha externo */}
      <Line
        type="monotone"
        dataKey="Externo"
        stroke="#F59E0B"
        strokeWidth={2.5}
        dot={false}
        activeDot={{ r: 6 }}
      />
    </LineChart>
  </ResponsiveContainer>
</div>

        {/* grafico top5 */}
        <div className="mt-6 md:mt-8 bg-[#F8FAFC] border border-gray-200 rounded-xl shadow-sm p-4 md:p-8 overflow-x-auto">
            <h3 className="text-base md:text-xl font-bold text-gray-800 mb-3 md:mb-6">Top 5 Tópicos de Ajuda</h3>
            <p className="text-xs md:text-sm text-gray-500 mb-4">Chamados abertos com mais frequencia + usuario mais ativo no tópico</p>
            <div className="min-w-125">
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dadosTopicos} margin={{ top: 40, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" angle={-30} textAnchor="end" interval={0} tick={{fontSize: 11}} />
                    <YAxis tick={{fontSize: 11}} />
                    <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];

                            const valor = Number(data.value ?? 0);
                            const usuario = data.payload?.usuarioTop ?? "N/A";

                            return (
                              <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700">
                                
                                {/* nome do tópico */}
                                <p className="text-sm font-semibold mb-1">
                                  {label}
                                </p>

                                {/* quantidade */}
                                <p className="text-xs text-gray-300">
                                  {valor} chamados
                                </p>

                                {/* usuário */}
                                <p className="text-xs text-gray-400 mt-1">
                                  Usuario que mais solicita: {typeof usuario === "string" ? usuario.split(" ")[0] : usuario}
                                </p>

                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    <Bar dataKey="valor" fill="#4C1D95" radius={[10, 10, 0, 0]}>
                        <LabelList 
                          dataKey="usuarioTop" 
                          position="top" 
                          offset={10} 
                          formatter={(label) => typeof label === 'string' ? label.split(' ')[0] : label}
                          style={{fill: '#6D28D9', fontWeight: 'bold', fontSize: '11px'}} 
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>

       {/* graficos por usuario */}
<div className="mt-6 md:mt-8 bg-[#F8FAFC] border border-gray-200 rounded-xl shadow-sm p-4 md:p-8 overflow-x-auto">
  <div className="mb-4 md:mb-6">
    <h3 className="text-base md:text-xl font-bold text-gray-800">Total de Chamados Abertos por Usuário</h3>
    <p className="text-xs md:text-sm text-gray-500">Quantidade total de chamados abertos por cada usuário no período selecionado</p>
  </div>

  {dadosUsuarios.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-gray-400 italic text-sm">Nenhum dado disponível no período selecionado</p>
    </div>
  ) : (
    <div className="min-w-125">
    <ResponsiveContainer width="100%" height={500}>
      <BarChart 
        data={dadosUsuarios} 
        margin={{ top: 40, right: 20, left: 5, bottom: 100 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
        
        <XAxis 
          dataKey="nome" 
          angle={-45} 
          textAnchor="end" 
          height={110}
          interval={0}
          tick={{ fill: '#4B5563', fontSize: 10, fontWeight: 500 }} 
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        
        <YAxis 
          tick={{ fill: '#9CA3AF', fontSize: 10 }} 
          tickLine={false}
          axisLine={false}
          label={{ 
            value: 'Chamados', 
            angle: -90, 
            position: 'insideLeft', 
            style: { fill: '#9CA3AF', fontSize: 11, fontWeight: 600 } 
          }}
        />
      <Tooltip 
          cursor={{ fill: '#F9FAFB' }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-gray-900 border-none rounded-lg p-4 ">
                  <h4 className="font-bold text-white mb-2 border-b border-gray-300 pb-2 ">{data.nomeCompleto}</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <p className="text-sm text-white">
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
            offset={12}
            style={{ 
              fill: '#1E40AF', 
              fontWeight: '700', 
              fontSize: '11px'
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  )}
</div>
      </div>
    </div>
  );
}

function Card({ titulo, valor, cor }: any) {
  return (
    <div className={`${cor} text-white rounded-xl p-4 md:p-6 shadow-md transition-transform hover:scale-105`}>
      <div className="text-2xl md:text-4xl font-bold">{valor}</div>
      <div className="text-xs md:text-sm font-medium opacity-80 uppercase tracking-wider mt-1">{titulo}</div>
    </div>
  );
}