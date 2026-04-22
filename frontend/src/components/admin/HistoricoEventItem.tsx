'use client';

import { useMemo } from 'react';

interface HistoricoEventItemProps {
  acao: string;
  usuario: {
    id: number;
    name: string;
  };
  dataMov: string;
  theme: any;
  prioridades?: Array<{ id: number; nome: string; cor: string }>;
}

// converter hex para RGB para cálculo de transparência
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export default function HistoricoEventItem({
  acao,
  usuario,
  dataMov,
  theme,
  prioridades = [],
}: HistoricoEventItemProps) {
  const formatarData = (data: string) => {
    const date = new Date(data);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  };

  // fetectar se é uma alteração de prioridade e extrair a cor
  const isAlteracaoPrioridade = acao.toLowerCase().includes('prioridade');
  
  let corPrioridade: string | null = null;
  if (isAlteracaoPrioridade) {
    // tentar extrair o nome da prioridade da ação (ex: "Prioridade alterada para Urgente")
    const prioridadeMatch = acao.match(/Urgente|Alta|Média|Baixa|Normal/i);
    if (prioridadeMatch) {
      const prioridade = prioridades.find(
        p => p.nome.toLowerCase() === prioridadeMatch[0].toLowerCase()
      );
      corPrioridade = prioridade?.cor || null;
    }
  }

  // determinar estilo baseado no tipo de evento
  const getEstilo = () => {
    if (corPrioridade) {
      const rgb = hexToRgb(corPrioridade);
      const isLightTheme = theme.background.pagina === '#ffffff';
      const bgColor = rgb
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isLightTheme ? 0.05 : 0.12})`
        : corPrioridade;

      const textColor = isLightTheme 
        ? `rgba(${rgb?.r || 0}, ${rgb?.g || 0}, ${rgb?.b || 0}, 0.55)` 
        : `rgba(${rgb?.r || 0}, ${rgb?.g || 0}, ${rgb?.b || 0}, 0.8)`;
      const borderColor = isLightTheme 
        ? `rgba(${rgb?.r || 0}, ${rgb?.g || 0}, ${rgb?.b || 0}, 0.15)` 
        : `rgba(${rgb?.r || 0}, ${rgb?.g || 0}, ${rgb?.b || 0}, 0.3)`;

      return {
        borderColor,
        backgroundColor: bgColor,
        textColor,
      };
    }

    // usar cores do tema para eventos padrão
    return {
      borderColor: theme.historicoEvento.default.border,
      backgroundColor: theme.historicoEvento.default.bg,
      textColor: theme.historicoEvento.default.text,
    };
  };

  const estilo = getEstilo();

  return (
    <div
      className="my-4 flex justify-center"
      style={{
        padding: '0.875rem 1.5rem',
        border: 'none',
        borderRadius: '1rem',
        backgroundColor: estilo.backgroundColor,
        color: estilo.textColor,
        textAlign: 'center',
        maxWidth: '65%',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <div className="flex flex-col items-center gap-0.5">
        <div
          style={{
            fontSize: '0.875rem',
            fontWeight: '500',
            color: estilo.textColor,
          }}
        >
          {acao}
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            color: estilo.textColor,
            opacity: 0.75,
          }}
        >
          {usuario.name} • {formatarData(dataMov)}
        </div>
      </div>
    </div>
  );
}
