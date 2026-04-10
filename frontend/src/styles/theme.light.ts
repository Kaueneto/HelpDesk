import { bg } from 'date-fns/locale';
import { Theme } from './theme.types';

export const lightTheme: Theme = {
  // Cores primárias da marca
  brand: {
    primary: '#3B82F6',      // Azul
    secondary: '#1F2937',    // Cinza escuro
    subHeader: '#1A68CF',   
  },

  // Backgrounds
  background: {
    pagina: '#FFFFFF',       // Branco puro
    surface: '#F9FAFB',      // Cinza muito claro
    modal: '#FFFFFF',        // Branco para modais
    card: '#FFFFFF',         // Branco para cards
    hover: '#F3F4F6',        // Cinza claro no hover
  },

  // Cores de texto
  text: {
    primary: '#1F2937',      // Cinza escuro (texto principal)
    secondary: '#6B7280',    // Cinza médio (texto secundário)
    tertiary: '#9CA3AF',     // Cinza claro (texto terciário)
    invertido: '#FFFFFF',    // Branco (para contraste)
  },

  // Cores de borda
  border: {
    primary: '#D1D5DB',      // Cinza
    secondary: '#E5E7EB',    // Cinza mais claro
    light: '#F3F4F6',        // Cinza muito claro
  },

  // Status dos chamados
  status: {
    aberto: {
      bg: '#FEF08A',         // Amarelo claro (status 1)
      text: '#854D0E',       // Amarelo escuro
      border: '#EAB308',     // Amarelo
    },
    emAtendimento: {
      bg: '#DBEAFE',         // Azul claro (status 2)
      text: '#0C4A6E',       // Azul escuro
      border: '#0EA5E9',     // Azul
    },
    encerrado: {
      bg: '#DCFCE7',         // Verde claro (status 3)
      text: '#15803D',       // Verde escuro
      border: '#22C55E',     // Verde
    },
    cancelado: {
      bg: '#FEE2E2',         // Vermelho claro (status 4)
      text: '#7F1D1D',       // Vermelho escuro
      border: '#EF4444',     // Vermelho
    },
    aguardando: {
      bg: '#F3E8FF',         // Roxo claro (status 5)
      text: '#4C1D95',       // Roxo escuro
      border: '#A855F7',     // Roxo
    },
    pendente: {
      bg: '#FED7AA',         // Laranja claro (status 7)
      text: '#92400E',       // Laranja escuro
      border: '#FB923C',     // Laranja
    },
    pendenteUsuario: {
      bg: '#E0E7FF',         // Índigo claro (status 6)
      text: '#312E81',       // Índigo escuro
      border: '#6366F1',     // Índigo
    },
  },

  // Prioridades
  priority: {
    baixa: {
      bg: '#DCFCE7',         // Verde claro
      text: '#15803D',       // Verde escuro
      border: '#22C55E',     // Verde
    },
    media: {
      bg: '#DBEAFE',         // Azul claro
      text: '#0C4A6E',       // Azul escuro
      border: '#0EA5E9',     // Azul
    },
    alta: {
      bg: '#FEF08A',         // Amarelo claro
      text: '#854D0E',       // Amarelo escuro
      border: '#EAB308',     // Amarelo
    },
    critica: {
      bg: '#FEE2E2',         // Vermelho claro
      text: '#7F1D1D',       // Vermelho escuro
      border: '#EF4444',     // Vermelho
    },
    urgente: {
      bg: '#FEE2E2',         // Vermelho claro
      text: '#7F1D1D',       // Vermelho escuro
      border: '#EF4444',     // Vermelho
    },
  },

  // Indicadores de estado
  indicators: {
    sucesso: '#22C55E',      // Verde
    erro: '#EF4444',         // Vermelho
    aviso: '#EAB308',        // Amarelo
    info: '#3B82F6',         // Azul
  },

  // Componente Kanban
  kanban: {
    columnBg: '#F9FAFB',     // Cinza muito claro
    columnBorder: '#E5E7EB', // Cinza
    textPrimary: '#1F2937',  // Cinza escuro
    textSecondary: '#6B7280', // Cinza médio
  },


  buttonsExclusivos: {
    btLight: '#475569',     // Cinza médio para botão claro
    btDark: '#002B57',      // Cinza muito escuro para botão escuro
  },

  // Dashboard - Cores Específicas para o Painel
  dashboard: {
    totalGeral: {
      bg: '#F3F4F6',         // Cinza claro para total geral
      text: '#1F2937',       // Texto escuro
      border: '#D1D5DB',     // Borda cinza
      gradient: 'linear-gradient(135deg, #404040 0%, #0F172A 100%)',
    },
    abertos: {
      bg: '#26C281',         // Verde brilhante
      text: '#FFFFFF',       // Texto branco
      border: '#26C281',     // Borda verde
    },
    atrasado: {
      bg: '#EF5350',         // Vermelho vibrante
      text: '#FFFFFF',       // Texto branco
      border: '#EF5350',     // Borda vermelho
    },
    emAndamento: {
      bg: '#2196F3',         // Azul vibrante
      text: '#FFFFFF',       // Texto branco
      border: '#2196F3',     // Borda azul
    },
    finalizado: {
      bg: '#2C3E50',         // Cinza/preto escuro
      text: '#FFFFFF',       // Texto branco
      border: '#2C3E50',     // Borda cinza escuro
    },
    pendentesTerceiros: {
      bg: '#FFA500',         // Laranja
      text: '#FFFFFF',       // Texto branco
      border: '#FFA500',     // Borda laranja
    },
    pendenteUsuario: {
      bg: '#9C27B0',         // Roxo
      text: '#FFFFFF',       // Texto branco
      border: '#9C27B0',     // Borda roxo
    },
    grafInternoVsExternos: {
      interno: '#3B82F6',      // Azul para interno
      externo: '#F59E0B',      // Âmbar/laranja para externo
    },

    btquadrokanban: {
         bg: '#686868',         // Azul para o botão do quadro Kanban
         text: '#FFFFFF',       // Texto branco para o botão
         border: '#313131',     // Borda azul para o botão
    }










  },

  detalhesChamado: {
    label: '#1F2937',        // Cinza escuro para labels
    labelActive: '#3B82F6',   // Azul para labels ativas
    value: '#6B7280',        // Cinza médio para valores
    border: '#E5E7EB',       // Cinza para bordas
    bgBranco: '#FFFFFF',           // Branco para fundo
    BalaoMsgInicial: '#F0FDF4', // Cinza muito claro para balão de mensagem do usuário
    BalaoMsgusuario: '#F3F4F6', // Cinza muito claro para balão de mensagem do usuário
    BalaoMsgSuporte: '#EFF6FF', // Índigo claro para balão de mensagem do suporte
    txtNomeUsuarios: '#000000',
    
    //botoes
    Marcarcomoresolvido:'#1BE600',  
    ReabrirChamado: '#FE9A00',
     redirecionar: '#155DFC',
     AtribuirAmim: '#9400FF',
     Editar: '#0028AA',
     imprimir: '#686868',
    

  },

  modalEnviarEmail: {
    background: '#FFFFFF',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    border: '#D1D5DB',
    input: {
      bg: '#F9FAFB',
      border: '#E5E7EB',
      text: '#1F2937',
      placeholder: '#9CA3AF',
    },
    badge: {
      bg: '#DBEAFE',
      text: '#0C4A6E',
      border: '#0EA5E9',
    },
    button: {
      primary: {
        bg: '#3B82F6',
        text: '#FFFFFF',
        hover: '#2563EB',
      },
      secondary: {
        bg: '#FFFFFF',
        text: '#3B82F6',
        border: '#3B82F6',
        hover: '#EFF6FF',
      },
    },
    descricaoStatus: {
      bg: '#EFF6FF',
      text: '#0C4A6E',
      border: '#DBEAFE',
    },
  },

  // botoes de ação em telas de gerenciamento
  actionButtons: {
    novo: {
      border: '#16A34A',      // Verde
      text: '#16A34A',
      hover: '#15803D',
      disabled: {
        border: '#BBCCDD',    // Cinza desabilitado
        text: '#BBCCDD',
      },
    },
    editar: {
      border: '#7C3AED',      // Roxo
      text: '#7C3AED',
      hover: '#6D28D9',
      disabled: {
        border: '#BBCCDD',
        text: '#BBCCDD',
      },
    },
    ativar: {
      border: '#059669',      // Esmeralda
      text: '#059669',
      hover: '#047857',
      disabled: {
        border: '#BBCCDD',
        text: '#BBCCDD',
      },
    },
    desativar: {
      border: '#D97706',      // Laranja
      text: '#D97706',
      hover: '#B45309',
      disabled: {
        border: '#BBCCDD',
        text: '#BBCCDD',
      },
    },
    resetarSenha: {
      border: '#2563EB',      // Azul
      text: '#2563EB',
      hover: '#1D4ED8',
      disabled: {
        border: '#BBCCDD',
        text: '#BBCCDD',
      },
    },
    excluir: {
      border: '#DC2626',      // vermei
      text: '#DC2626',
      hover: '#B91C1C',
      disabled: {
        border: '#BBCCDD',
        text: '#BBCCDD',
      },
    },
  },
};
