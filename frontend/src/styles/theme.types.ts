/**
 * Tipagem completa do sistema de temas
 * Define a estrutura de cores para light/dark modes
 */

export interface StatusColors {
  aberto: {
    bg: string;
    text: string;
    border: string;
  };
  emAtendimento: {
    bg: string;
    text: string;
    border: string;
  };
  encerrado: {
    bg: string;
    text: string;
    border: string;
  };
  cancelado: {
    bg: string;
    text: string;
    border: string;
  };
  aguardando: {
    bg: string;
    text: string;
    border: string;
  };
  pendente: {
    bg: string;
    text: string;
    border: string;
  };
  pendenteUsuario: {
    bg: string;
    text: string;
    border: string;
  };
}

export interface PriorityColors {
  baixa: {
    bg: string;
    text: string;
    border: string;
  };
  media: {
    bg: string;
    text: string;
    border: string;
  };
  alta: {
    bg: string;
    text: string;
    border: string;
  };
  critica: {
    bg: string;
    text: string;
    border: string;
  };
  urgente: {
    bg: string;
    text: string;
    border: string;
  };
}

export interface KanbanColors {
  columnBg: string;
  columnBorder: string;
  textPrimary: string;
  textSecondary: string;
}

export interface DashboardColors {
  totalGeral: {
    bg: string;
    text: string;
    border: string;
    gradient: string;
  };
  abertos: {
    bg: string;
    text: string;
    border: string;
  };
  atrasado: {
    bg: string;
    text: string;
    border: string;
  };
  emAndamento: {
    bg: string;
    text: string;
    border: string;
  };
  finalizado: {
    bg: string;
    text: string;
    border: string;
  };
  pendentesTerceiros: {
    bg: string;
    text: string;
    border: string;
  };
  pendenteUsuario: {
    bg: string;
    text: string;
    border: string;
  };

  grafInternoVsExternos: {
    interno: string;
    externo: string;
  };

  btquadrokanban: {
    bg: string;
    text: string;
    border: string;
  };
}

export interface TextColors {
  primary: string;
  secondary: string;
  tertiary: string;
  invertido: string;
}

export interface BackgroundColors {
  pagina: string;
  surface: string;
  modal: string;
  card: string;
  hover: string;
}

export interface BorderColors {
  primary: string;
  secondary: string;
  light: string;
}

export interface StatusIndicators {
  sucesso: string;
  erro: string;
  aviso: string;
  info: string;
}

export type Theme = {
  // Cor primária da marca
  brand: {
    primary: string;
    secondary: string;
    subHeader: string;
  };


  // Texturas de fundo
  background: BackgroundColors;

  // Cores de texto
  text: TextColors;

  // Cores de borda
  border: BorderColors;

  // Status dos chamados (1-7)
  status: StatusColors;

  // Prioridades
  priority: PriorityColors;

  // Indicadores de estado
  indicators: StatusIndicators;

  // Componente Kanban
  kanban: KanbanColors;

  // Dashboard - Cores específicas para o painel
  dashboard: DashboardColors;

  detalhesChamado: {
    label: string;
    labelActive: string;
    value: string;
    border: string;
    bgBranco: string;
    BalaoMsgInicial: string;
    BalaoMsgusuario: string;
    BalaoMsgSuporte: string;
    txtNomeUsuarios: string;
    Marcarcomoresolvido: string;
    ReabrirChamado: string;
    redirecionar: string;
    AtribuirAmim: string;
    Editar: string;
    imprimir: string;
  };

  buttonsExclusivos: {
    btLight: string;
    btDark: string;
  };

  modalEnviarEmail: {
    background: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    input: {
      bg: string;
      border: string;
      text: string;
      placeholder: string;
    };
    badge: {
      bg: string;
      text: string;
      border: string;
    };
    button: {
      primary: {
        bg: string;
        text: string;
        hover: string;
      };
      secondary: {
        bg: string;
        text: string;
        border: string;
        hover: string;
      };
    };
    descricaoStatus: {
      bg: string;
      text: string;
      border: string;
    };
  };

};
