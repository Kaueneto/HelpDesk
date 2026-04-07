'use client';

import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';

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
    <div className="pb-10 min-h-screen" style={{ backgroundColor: `rgb(var(--bg-primary))` }}>
      <div className="px-4 md:px-6 py-4" style={{ backgroundColor: `rgb(var(--cor-header-fundo))` }}>
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
            className="px-4 py-2 border border-gray-300 rounded --text-primary w-full sm:w-auto"
            isClearable
          />
          <button
            onClick={carregarDados}
            disabled={loading}
            className="px-6 py-2 text-white rounded disabled:opacity-50 w-full sm:w-auto"
            style={{ backgroundColor: `rgb(var(--cor-botao-pesquisar))` }}
          >
            {loading ? 'Pesquisando...' : 'Pesquisar'}
          </button>
        </div>

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">

  {/* esquerda */}
  <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">

    <Card titulo="ABERTOS" valor={chamadosAbertos} cor="--cor-card-abertos" />
    <Card titulo="ATRASADOS" valor={chamadosAtrasados} cor="--cor-card-atrasados" />
    <Card titulo="EM ANDAMENTO" valor={chamadosEmAndamento} cor="--cor-card-em-andamento" />
    <Card titulo="FINALIZADOS" valor={chamadosFinalizados} cor="--cor-card-finalizados" />
    <Card titulo="PENDENTES TERCEIROS" valor={chamadosPendentes} cor="--cor-card-pendentes" />
    <Card titulo="PENDENTE USUARIO" valor={chamadosPendentesUsuario} cor="--cor-card-pendente-usuario" />

  </div>

  {/* direita - destaque */}
  <div className="lg:col-span-1">
    <div className="h-full text-white rounded-2xl p-6 shadow-lg flex flex-col justify-between"
      style={{
        background: `linear-gradient(135deg, rgb(var(--cor-card-total-inicio)), rgb(var(--cor-card-total-fim)))`
      }}
    >
      
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
          <div className="rounded-xl shadow-sm p-4 md:p-8" style={{
            backgroundColor: `rgb(var(--cor-grafico-fundo))`,
            borderColor: `rgb(var(--cor-grafico-borda))`,
            borderWidth: '1px'
          }}>
            <h3 className="font-bold mb-3 md:mb-4 font-segoe text-base md:text-lg" style={{ color: `rgb(var(--cor-grafico-titulo))` }}>Distribuição por Prioridade</h3>
            
            <div className="mb-4 md:mb-6 flex flex-wrap gap-2 p-2 md:p-3 rounded-lg overflow-x-auto" style={{
              backgroundColor: `rgb(var(--cor-grafico-fundo))`
            }}>
              <label className="flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-colors" style={{
                backgroundColor: `rgb(var(--cor-grafico-fundo))`,
                borderColor: `rgb(var(--cor-grafico-borda))`,
                borderWidth: '1px'
              }}>
                <input type="checkbox" checked={prioridadeSelecionadas.size === dadosPrioridade.length} onChange={toggleTodos} className="w-4 h-4 rounded" />
                <span className="text-xs font-semibold" style={{ color: `rgb(var(--cor-grafico-subtitulo))` }}>Todos</span>
              </label>
              {dadosPrioridade.map((p) => (
                <label key={p.name} className="flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer" style={{
                  backgroundColor: `rgb(var(--cor-grafico-fundo))`,
                  borderColor: `rgb(var(--cor-grafico-borda))`,
                  borderWidth: '1px'
                }}>
                  <input type="checkbox" checked={prioridadeSelecionadas.has(p.name)} onChange={() => togglePrioridade(p.name)} className="w-4 h-4 rounded" style={{ accentColor: p.cor }} />
                  <span className="text-xs" style={{ color: `rgb(var(--cor-grafico-subtitulo))` }}>{p.name}</span>
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
                <div className="p-3 rounded-lg shadow-lg" style={{
                  backgroundColor: `rgb(var(--cor-tooltip-fundo))`,
                  color: `rgb(var(--cor-tooltip-texto))`,
                  borderColor: `rgb(var(--cor-tooltip-borda))`,
                  borderWidth: '1px'
                }}>
                  <p className="font-semibold text-sm mb-1">
                    {data.name}
                  </p>

                  <p className="text-xs">
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
          <div className="rounded-xl shadow-sm p-4 md:p-8" style={{
            backgroundColor: `rgb(var(--cor-grafico-fundo))`,
            borderColor: `rgb(var(--cor-grafico-borda))`,
            borderWidth: '1px'
          }}>
            <h3 className="font-bold mb-4 md:mb-6 text-base md:text-lg font-segoe" style={{ color: `rgb(var(--cor-grafico-titulo))` }}>Chamados por Departamento</h3>
            <div className="space-y-3 md:space-y-5">
              {dadosDepartamento.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1 gap-2">
                    <span className="text-xs md:text-sm font-normal truncate" style={{ color: `rgb(var(--cor-grafico-subtitulo))` }}>{d.nome}</span>
                    <span className="text-xs md:text-sm font-light whitespace-nowrap" style={{ color: `rgb(var(--cor-grafico-titulo))` }}>{d.valor} ({d.percentual}%)</span>
                  </div>
                  <div className="h-6 md:h-8 rounded-lg overflow-hidden" style={{
                    backgroundColor: `rgb(var(--cor-grafico-fundo))`,
                    borderColor: `rgb(var(--cor-grafico-borda))`,
                    borderWidth: '1px'
                  }}>
                    <div className="h-full flex items-center justify-end pr-2 md:pr-4 transition-all duration-700" style={{
                      width: `${d.percentual}%`,
                      backgroundColor: `rgb(var(--cor-header-fundo))`
                    }}>
                     
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
   {/* grafico de linhas Interno x Externo */}
<div className="mt-6 md:mt-8 rounded-2xl shadow-md p-5 md:p-8 transition-all hover:shadow-lg" style={{
  backgroundColor: `rgb(var(--cor-grafico-fundo))`,
  borderColor: `rgb(var(--cor-grafico-borda))`,
  borderWidth: '1px'
}}>
  
  {/* Header */}
  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
    <div>
      <h3 className="text-lg md:text-xl font-bold font-segoe" style={{ color: `rgb(var(--cor-grafico-titulo))` }}>
        Chamados Internos vs Externos
      </h3>
      <p className="text-xs md:text-sm mt-1" style={{ color: `rgb(var(--cor-grafico-subtitulo))` }}>
        Volume diário de chamados no período selecionado
      </p>
    </div>

    {/* Total destacado */}
    <div className="mt-3 md:mt-0 px-4 py-2 rounded-lg" style={{
      backgroundColor: `rgb(var(--cor-grafico-fundo))`,
      borderColor: `rgb(var(--cor-grafico-borda))`,
      borderWidth: '1px'
    }}>
      <span className="text-xs" style={{ color: `rgb(var(--cor-grafico-subtitulo))` }}>Total</span>
      <p className="text-sm font-semibold" style={{ color: `rgb(var(--cor-grafico-titulo))` }}>
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
      <CartesianGrid strokeDasharray="2 4" stroke={`rgb(var(--cor-grid))`} vertical={false} />

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
        tick={{ fontSize: 12, fill: `rgb(var(--cor-eixo))` }}
        axisLine={false}
        tickLine={false}
        angle={-25}
        textAnchor="end"
        interval={0}
      />

      <YAxis
        tick={{ fontSize: 12, fill: `rgb(var(--cor-eixo))` }}
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
          background: `rgb(var(--cor-tooltip-fundo))`,
          border: `1px solid rgb(var(--cor-tooltip-borda))`,
          borderRadius: "5px",
          color: `rgb(var(--cor-tooltip-texto))`,
          fontSize: "14px"
        }}
        labelStyle={{ color: `rgb(var(--cor-eixo))` }}
      />
      <Legend
        verticalAlign="top"
        height={36}
        iconType="circle"
        formatter={(value) =>
          value === "Interno" ? (
            <span className="font-medium" style={{ color: `rgb(var(--cor-linha-interno))` }}>Interno</span>
          ) : (
            <span className="font-medium" style={{ color: `rgb(var(--cor-linha-externo))` }}>Externo</span>
          )
        }
      />

      {/* linha interno */}
      <Line
        type="monotone"
        dataKey="Interno"
        stroke={`rgb(var(--cor-linha-interno))`}
        strokeWidth={2.5}
        dot={false}
        activeDot={{ r: 6 }}
      />

      {/* linha externo */}
      <Line
        type="monotone"
        dataKey="Externo"
        stroke={`rgb(var(--cor-linha-externo))`}
        strokeWidth={2.5}
        dot={false}
        activeDot={{ r: 6 }}
      />
    </LineChart>
  </ResponsiveContainer>
</div>

        {/* grafico top5 */}
        <div className="mt-6 md:mt-8 rounded-xl shadow-sm p-4 md:p-8 overflow-x-auto" style={{
          backgroundColor: `rgb(var(--cor-grafico-fundo))`,
          borderColor: `rgb(var(--cor-grafico-borda))`,
          borderWidth: '1px'
        }}>
            <h3 className="text-base md:text-xl font-bold font-segoe mb-3 md:mb-6" style={{ color: `rgb(var(--cor-grafico-titulo))` }}>Top 5 Tópicos de Ajuda</h3>
            <p className="text-xs md:text-sm mb-4" style={{ color: `rgb(var(--cor-grafico-subtitulo))` }}>Chamados abertos com mais frequencia + usuario mais ativo no tópico</p>
            <div className="min-w-125">
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dadosTopicos} margin={{ top: 40, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={`rgb(var(--cor-grid))`} />
                    <XAxis dataKey="nome" angle={-30} textAnchor="end" interval={0} tick={{fontSize: 11, fill: `rgb(var(--cor-eixo))`}} />
                    <YAxis tick={{fontSize: 11, fill: `rgb(var(--cor-eixo))`}} />
                    <Tooltip
                        cursor={{ fill: `rgb(var(--cor-cursor-hover))`, opacity: 0.3 }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];

                            const valor = Number(data.value ?? 0);
                            const usuario = data.payload?.usuarioTop ?? "N/A";

                            return (
                              <div className="p-3 rounded-lg shadow-lg" style={{
                                backgroundColor: `rgb(var(--cor-tooltip-fundo))`,
                                color: `rgb(var(--cor-tooltip-texto))`,
                                borderColor: `rgb(var(--cor-tooltip-borda))`,
                                borderWidth: '1px'
                              }}>
                                
                                {/* nome do tópico */}
                                <p className="text-sm font-semibold mb-1">
                                  {label}
                                </p>

                                {/* quantidade */}
                                <p className="text-xs">
                                  {valor} chamados
                                </p>

                                {/* usuário */}
                                <p className="text-xs mt-1">
                                  Usuario que mais solicita: {typeof usuario === "string" ? usuario.split(" ")[0] : usuario}
                                </p>

                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    <Bar dataKey="valor" fill={`rgb(var(--cor-barra-topicos))`} radius={[10, 10, 0, 0]}>
                        <LabelList 
                          dataKey="usuarioTop" 
                          position="top" 
                          offset={10} 
                          formatter={(label) => typeof label === 'string' ? label.split(' ')[0] : label}
                          style={{fill: `rgb(var(--cor-barra-topicos-label))`, fontWeight: 'bold', fontSize: '11px'}} 
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>

       {/* graficos por usuario */}
<div className="mt-6 md:mt-8 rounded-xl shadow-sm p-4 md:p-8 overflow-x-auto" style={{
  backgroundColor: `rgb(var(--cor-grafico-fundo))`,
  borderColor: `rgb(var(--cor-grafico-borda))`,
  borderWidth: '1px'
}}>
  <div className="mb-4 md:mb-6">
    <h3 className="text-base md:text-xl font-bold" style={{ color: `rgb(var(--cor-grafico-titulo))` }}>Total de Chamados Abertos por Usuário</h3>
    <p className="text-xs md:text-sm" style={{ color: `rgb(var(--cor-grafico-subtitulo))` }}>Quantidade total de chamados abertos por cada usuário no período selecionado</p>
  </div>

  {dadosUsuarios.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="italic text-sm" style={{ color: `rgb(var(--cor-grafico-subtitulo))` }}>Nenhum dado disponível no período selecionado</p>
    </div>
  ) : (
    <div className="min-w-125">
    <ResponsiveContainer width="100%" height={500}>
      <BarChart 
        data={dadosUsuarios} 
        margin={{ top: 40, right: 20, left: 5, bottom: 100 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={`rgb(var(--cor-grid))`} />
        
        <XAxis 
          dataKey="nome" 
          angle={-45} 
          textAnchor="end" 
          height={110}
          interval={0}
          tick={{ fill: `rgb(var(--cor-eixo))`, fontSize: 12, fontWeight: 500 }} 
          tickLine={false}
          axisLine={{ stroke: `rgb(var(--cor-grafico-borda))` }}
        />
        
        <YAxis 
          tick={{ fill: `rgb(var(--cor-eixo))`, fontSize: 12 }} 
          tickLine={false}
          axisLine={false}
          label={{ 
            value: 'Chamados', 
            angle: -90, 
            position: 'insideLeft', 
            style: { fill: `rgb(var(--cor-eixo))`, fontSize: 12, fontWeight: 600 } 
          }}
        />
      <Tooltip 
          cursor={{ fill: `rgb(var(--cor-cursor-hover))`, opacity: 0.3 }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="border-none rounded-lg p-4" style={{
                  backgroundColor: `rgb(var(--cor-tooltip-fundo))`,
                  borderColor: `rgb(var(--cor-tooltip-borda))`,
                  borderWidth: '1px'
                }}>
                  <h4 className="font-bold mb-2 pb-2" style={{
                    color: `rgb(var(--cor-tooltip-texto))`,
                    borderBottomColor: `rgb(var(--cor-tooltip-borda))`,
                    borderBottomWidth: '1px'
                  }}>{data.nomeCompleto}</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(var(--cor-barra-usuarios))` }}></div>
                    <p className="text-sm" style={{ color: `rgb(var(--cor-tooltip-texto))` }}>
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
          fill={`rgb(var(--cor-barra-usuarios))`}
          radius={[6, 6, 0, 0]}
          maxBarSize={50}
        >
          <LabelList 
            dataKey="valor"
            position="top"
            offset={12}
            style={{ 
              fill: `rgb(var(--cor-barra-usuarios-label))`, 
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
    <div className="text-white rounded-xl p-4 md:p-6 shadow-md transition-transform hover:scale-105" style={{
      backgroundColor: `rgb(var(${cor}))`
    }}>
      <div className="text-2xl md:text-4xl font-bold">{valor}</div>
      <div className="text-xs md:text-sm font-medium opacity-80 uppercase tracking-wider mt-1">{titulo}</div>
    </div>
  );
}