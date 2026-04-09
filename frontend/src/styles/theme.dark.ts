import { Theme } from './theme.types';

export const darkTheme: Theme = {
  // Cores primárias da marca
  brand: {
    primary: '#0084FF',      // Azul claro
    secondary: '#E5E7EB',    // Cinza muito claro
    subHeader: '#1A68CF',   
  },

  // Backgrounds
  background: {
    pagina: '#0F172A',       // Cinza muito escuro (quase preto)
    surface: '#1E293B',      // Cinza escuro
    modal: '#1E293B',        // Cinza escuro para modais
    card: '#334155',         // Cinza médio para cards
    hover: '#475569',        // Cinza médio no hover
  },

  // Cores de texto
  text: {
    primary: '#F1F5F9',      // Quase branco
    secondary: '#CBD5E1',    // Cinza claro
    tertiary: '#94A3B8',     // Cinza médio
    invertido: '#0F172A',    // Preto/quase preto
  },

  // Cores de borda
  border: {
    primary: '#475569',      // Cinza médio
    secondary: '#334155',    // Cinza escuro
    light: '#1E293B',        // Cinza muito escuro
  },

  // Status dos chamados
  status: {
    aberto: {
      bg: '#B38F00',         // Amarelo escuro (status 1)
      text: '#FEF08A',       // Amarelo claro
      border: '#FBBF24',     // Amarelo
    },
    emAtendimento: {
      bg: '#0C4A6E',         // Azul escuro (status 2)
      text: '#BAE6FD',       // Azul claro
      border: '#38BDF8',     // Azul
    },
    encerrado: {
      bg: '#164E63',         // Verde escuro (status 3)
      text: '#DCFCE7',       // Verde claro
      border: '#34D399',     // Verde
    },
    cancelado: {
      bg: '#7F1D1D',         // Vermelho escuro (status 4)
      text: '#FEE2E2',       // Vermelho claro
      border: '#F87171',     // Vermelho
    },
    aguardando: {
      bg: '#4C1D95',         // Roxo escuro (status 5)
      text: '#E9D5FF',       // Roxo claro
      border: '#D8B4FE',     // Roxo
    },
    pendente: {
      bg: '#7C2D12',         // Laranja escuro (status 7)
      text: '#FFEDD5',       // Laranja claro
      border: '#FB923C',     // Laranja
    },
    pendenteUsuario: {
      bg: '#312E81',         // Índigo escuro (status 6)
      text: '#E0E7FF',       // Índigo claro
      border: '#A5B4FC',     // Índigo
    },
  },

  buttonsExclusivos: {
    btLight: '#475569',     // Cinza médio para botão claro
    btDark: '#002B57',      // Cinza muito escuro para botão escuro
  },

  // Prioridades
  priority: {
    baixa: {
      bg: '#164E63',         // Verde escuro
      text: '#DCFCE7',       // Verde claro
      border: '#34D399',     // Verde
    },
    media: {
      bg: '#0C4A6E',         // Azul escuro
      text: '#BAE6FD',       // Azul claro
      border: '#38BDF8',     // Azul
    },
    alta: {
      bg: '#713F12',         // Amarelo escuro
      text: '#FEF08A',       // Amarelo claro
      border: '#FBBF24',     // Amarelo
    },
    critica: {
      bg: '#7F1D1D',         // Vermelho escuro
      text: '#FEE2E2',       // Vermelho claro
      border: '#F87171',     // Vermelho
    },
    urgente: {
      bg: '#7F1D1D',         // Vermelho escuro
      text: '#FEE2E2',       // Vermelho claro
      border: '#F87171',     // Vermelho
    },
  },

  // Indicadores de estado
  indicators: {
    sucesso: '#34D399',      // Verde
    erro: '#F87171',         // Vermelho
    aviso: '#FBBF24',        // Amarelo
    info: '#38BDF8',         // Azul
  },

  // Componente Kanban
  kanban: {
    columnBg: '#1E293B',     // Cinza escuro
    columnBorder: '#334155', // Cinza médio
    textPrimary: '#F1F5F9',  // Quase branco
    textSecondary: '#CBD5E1', // Cinza claro
  },

  // Dashboard - Cores Específicas para o Painel
  dashboard: {
    totalGeral: {
      bg: '#1E293B',         // Cinza escuro para total geral
      text: '#F1F5F9',       // Texto claro
      border: '#334155',     // Borda cinza médio
      gradient: 'linear-gradient(135deg, #404040 0%, #0F172A 100%)', // Gradiente para preto
    },
    abertos: {
      bg: '#C9C200',        
      text: '#FFFFFF',      
      border: '#C9C200',     
    },
    atrasado: {
      bg: '#E74C3C',         // Vermelho vibrante
      text: '#FFFFFF',       // Texto branco
      border: '#E74C3C',     // Borda vermelho
    },
    emAndamento: {
      bg: '#155DFC',         // Azul vibrante
      text: '#FFFFFF',       // Texto branco
      border: '#155DFC',     // Borda azul
    },
    finalizado: {
      bg: '#1BE600',         // Verde brilhante (diferente do light que é cinza)
      text: '#FFFFFF',       // Texto branco
      border: '#1BE600',     // Borda verde
    },
    pendentesTerceiros: {
      bg: '#FE9A00',         // Laranja
      text: '#FFFFFF',       // Texto branco
      border: '#FE9A00',     // Borda laranja
    },
    pendenteUsuario: {
      bg: '#9400FF',         // Roxo
      text: '#FFFFFF',       // Texto branco
      border: '#9400FF',     // Borda roxo
    },

    grafInternoVsExternos: {
      interno: '#005BF0',    // Azul para interno
      externo: '#F5880B',    // Âmbar/laranja para externo
    },

      btquadrokanban: {
         bg: '#686868',         // Azul para o botão do quadro Kanban
         text: '#FFFFFF',       // Texto branco para o botão
         border: '#313131',     // Borda azul para o botão
    }
    
  },

    detalhesChamado: {
    label: '#F1F5F9',        // Quase branco para labels (invertido)
    labelActive: '#60A5FA',   // Azul claro para labels ativas (invertido)
    value: '#CBD5E1',        // Cinza claro para valores (invertido)
    border: '#475569',       // Cinza escuro para bordas (invertido)
    bgBranco: '#1E293B',           // Cinza escuro para fundo (invertido de branco)
    BalaoMsgInicial: '#064E3B', // Verde escuro para balão inicial (invertido)
    BalaoMsgusuario: '#334155', // Cinza escuro para balão do usuário (invertido)
    BalaoMsgSuporte: '#0C4A6E', // Azul escuro para balão do suporte (invertido)
    txtNomeUsuarios: '#F1F5F9', // Quase branco para nomes (invertido de preto)
    
    // Botões mantêm as mesmas cores conforme solicitado
    Marcarcomoresolvido:'#1BE600',  
    ReabrirChamado: '#FE9A00',
    redirecionar: '#155DFC',
    AtribuirAmim: '#9400FF',
    Editar: '#0028AA',
    imprimir: '#686868',
    

  },

  modalEnviarEmail: {
    background: '#1E293B',
    textPrimary: '#F1F5F9',
    textSecondary: '#CBD5E1',
    border: '#475569',
    input: {
      bg: '#0F172A',
      border: '#334155',
      text: '#F1F5F9',
      placeholder: '#64748B',
    },
    badge: {
      bg: '#0C4A6E',
      text: '#BAE6FD',
      border: '#38BDF8',
    },
    button: {
      primary: {
        bg: '#0084FF',
        text: '#FFFFFF',
        hover: '#0066CC',
      },
      secondary: {
        bg: 'transparent',
        text: '#0084FF',
        border: '#0084FF',
        hover: '#0084FF1A',
      },
    },
    descricaoStatus: {
      bg: '#0C4A6E',
      text: '#BAE6FD',
      border: '#38BDF8',
    },
  },

};
