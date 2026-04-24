
import type { Theme } from './kanbanTypes';


export function getStatusColor(statusId: number, theme: Theme): string {
  switch (statusId) {
    case 1:
      return theme.status.aberto.border;
    case 2:
      return theme.status.emAtendimento.border;
    case 3:
      return theme.status.encerrado.border;
    case 4:
      return theme.status.cancelado.border;
    case 5:
      return theme.status.aguardando.border;
    case 6:
      return theme.status.pendenteUsuario.border;
    case 7:
      return theme.status.pendente.border;
    default:
      return theme.border.primary;
  }
}


export function getPriorityColor(prioridadeName: string, theme: Theme): string {
  const normalized = prioridadeName.toLowerCase();
  switch (normalized) {
    case 'baixa':
    case 'baixo':
      return theme.priority.baixa.border;
    case 'média':
    case 'media':
    case 'médio':
    case 'medio':
      return theme.priority.media.border;
    case 'alta':
    case 'alto':
      return theme.priority.alta.border;
    case 'crítica':
    case 'critica':
      return theme.priority.critica.border;
    case 'urgente':
      return theme.priority.urgente.border;
    default:
      return theme.brand.secondary;
  }
}

export function getSelectStyles(theme: Theme): Record<string, any> {
  return {
    control: (base: any) => ({
      ...base,
      minHeight: '32px',
      height: '32px',
      backgroundColor: theme.background.surface,
      borderColor: theme.border.secondary,
      boxShadow: 'none',
      padding: '0 4px',
      '&:hover': {
        borderColor: theme.brand.primary,
      },
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: theme.background.surface,
      borderColor: theme.border.secondary,
    }),
    menuList: (base: any) => ({
      ...base,
      backgroundColor: theme.background.surface,
      color: theme.text.primary,
      padding: '4px 0',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? theme.brand.primary
        : state.isFocused
        ? theme.background.hover
        : 'transparent',
      color: state.isSelected ? 'white' : theme.text.primary,
      cursor: 'pointer',
      padding: '8px 12px',
    }),
    singleValue: (base: any) => ({
      ...base,
      color: theme.text.primary,
    }),
    input: (base: any) => ({
      ...base,
      color: theme.text.primary,
    }),
    placeholder: (base: any) => ({
      ...base,
      color: theme.text.tertiary,
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (base: any) => ({
      ...base,
      color: theme.text.primary,
      '&:hover': {
        color: theme.text.primary,
      },
    }),
  };
}


export function getColumnColor(
  columnType: 'status' | 'priority' | 'department' | 'topic' | 'custom',
  theme: Theme
): string {
  switch (columnType) {
    case 'status':
      return theme.status.aberto.border;
    case 'priority':
      return theme.priority.media.border;
    case 'department':
      return theme.brand.primary;
    case 'topic':
      return theme.indicators.info;
    case 'custom':
      return theme.brand.primary;
    default:
      return theme.border.primary;
  }
}
