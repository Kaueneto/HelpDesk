'use client';

import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';

type ActionType = 'novo' | 'editar' | 'ativar' | 'desativar' | 'resetarSenha' | 'excluir';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  type: ActionType;
  icon?: React.ReactNode;
  className?: string;
}

export default function ActionButton({
  label,
  onClick,
  disabled = false,
  type,
  icon,
  className = '',
}: ActionButtonProps) {
  const { theme } = useTheme();
  
  // Verificar se theme.actionButtons existe
  if (!theme?.actionButtons) {
    console.warn('Theme actionButtons não disponível');
    return null;
  }
  
  const buttonColors = theme.actionButtons[type];
  
  if (!buttonColors) {
    console.warn(`ActionButton type "${type}" não encontrado no tema`);
    return null;
  }

  const borderColor = disabled ? buttonColors.disabled.border : buttonColors.border;
  const textColor = disabled ? buttonColors.disabled.text : buttonColors.text;
  const hoverBg = disabled ? 'transparent' : buttonColors.hover;
  const hoverText = '#FFFFFF';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-0.5 
        border rounded-lg 
        transition-all duration-200 
        transform hover:scale-105 
        font-medium text-sm 
        flex items-center gap-2 
        disabled:cursor-not-allowed 
        active:scale-95 
        focus:outline-none focus:ring-1 
        ${className}
      `}
      style={{
        borderColor: borderColor,
        color: textColor,
        backgroundColor: 'transparent',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = hoverBg;
          (e.currentTarget as HTMLButtonElement).style.color = hoverText;
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = textColor;
      }}
    >
      {type === 'novo' && !icon && <span className="text-lg font-bold">+</span>}
      {icon}
      {label}
    </button>
  );
}
