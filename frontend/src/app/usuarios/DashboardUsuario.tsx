'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/services/api';

interface Prioridade { id: number; nome: string; cor: string; total: number; }
interface MesData    { mes: string; label: string; total: number; }
interface Stats {
  aberto: number; emAtendimento: number; encerrado: number; aguardando: number; total: number;
  prioridades: Prioridade[];
  linhaDoTempo: MesData[];
}

const STATUS_ITEMS = [
  { key: 'aberto'        as const, label: 'Em aberto',      cor: '#f59e0b' },
  { key: 'emAtendimento' as const, label: 'Em análise', cor: '#3b82f6' },
  { key: 'aguardando'    as const, label: 'Pendentes ',      cor: '#8b5cf6' },
  { key: 'encerrado'     as const, label: 'Resolvidos',     cor: '#10b981' },
];

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 shadow-md text-xs">
      {label && <p className="text-gray-400 mb-0.5">{label}</p>}
      <p className="font-semibold text-gray-800">
        {payload[0].name ? `${payload[0].name}: ` : ''}{payload[0].value}
      </p>
    </div>
  );
};

export default function DashboardUsuario() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Stats>('/chamados/meus/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats || stats.total === 0) return null;

  const dadosPrioridade = (stats.prioridades ?? []).map(p => ({
    name: p.nome, value: p.total, cor: p.cor,
  }));
  const barras = (stats.linhaDoTempo ?? []).filter(m => m.total > 0);
  const maxBar = Math.max(...barras.map(b => b.total), 1);

  return (
    // largura máxima contida, não estica até os botões
    <div className="flex flex-col gap-5 max-w-sm w-full py-13">

      {/* cards totalizadores */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {STATUS_ITEMS.map((s) => (
          <div
            key={s.key}
            className="rounded-lg px-3 py-2 cursor-default border border-transparent transition-all duration-200 hover:-translate-y-1 hover:border-gray-200 hover:bg-white/70 hover:shadow-xl"
          >
            <p
              className="text-xl font-bold leading-none"
              style={{ color: s.cor }}
            >
              {stats[s.key]}
            </p>

            <p className="mt-1 text-[10px] font-medium text-gray-600 whitespace-nowrap ">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── donut prioridade + barras mês ── */}
      <div className="flex gap-4 items-start ">

        {/* donut prioridade */}
        {dadosPrioridade.length > 0 && (
          <div className="shrink-0 rounded-lg px-3 py-2 cursor-default border border-transparent transition-all duration-200 hover:-translate-y-1 hover:border-gray-200 hover:bg-white/70 hover:shadow-xl">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Prioridade
            </p>
            <div className="w-[86px] h-[86px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosPrioridade}
                    cx="50%" cy="50%"
                    innerRadius={24} outerRadius={38}
                    paddingAngle={3}
                    dataKey="value" nameKey="name"
                  >
                    {dadosPrioridade.map((d, i) => (
                      <Cell key={i} fill={d.cor} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<TT />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* legenda abaixo do donut */}
            <div className="mt-1.5 space-y-1">
              {dadosPrioridade.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.cor }} />
                  <span className="text-gray-400 truncate flex-1">{d.name}</span>
                  <span className="font-bold" style={{ color: d.cor }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* barras horizontais por mês */}
        {barras.length > 0 && (
          <div className="flex-1 min-w-0 rounded-lg px-3 py-2 cursor-default border border-transparent transition-all duration-200 hover:-translate-y-1 hover:border-gray-200 hover:bg-white/70 hover:shadow-xl">
            <p className="text-[10px] font-semibold text-gray-400  tracking-wide mb-1.5 ">
              Por mês
            </p>
            <div className="space-y-2">
              {barras.map(b => {
                const pct = Math.round((b.total / maxBar) * 100);
                const isPeak = b.total === maxBar;
                return (
                  <div key={b.mes} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-11 shrink-0 text-right tabular-nums">
                      {b.label}
                    </span>
                    <div className="flex-1 h-[14px] bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-1.5"
                        style={{
                          width: `${Math.max(pct, 10)}%`,
                          backgroundColor: isPeak ? '#2563eb' : '#93c5fd',
                          transition: 'width 0.5s ease',
                        }}
                      >
                        <span className="text-[9px] font-bold text-white leading-none">
                          {b.total}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
     </div>
    </div>
  );
}
