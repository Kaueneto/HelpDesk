'use client';

import { useMemo } from 'react';
import { FiUser } from 'react-icons/fi';

interface AvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Avatar({ 
  name = 'Usuário', 
  avatarUrl, 
  size = 'md',
  className = ''
}: AvatarProps) {
  // Gerar iniciais do nome
  const initials = useMemo(() => {
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, [name]);

  // Determinar tamanho
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  // Gerar cor consistente baseado no nome
  const getBackgroundColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-green-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-cyan-500'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (avatarUrl) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full overflow-hidden shrink-0 ${className}`}
      >
        <img 
          src={avatarUrl} 
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // se a imagem falhar em carregar, mostrar iniciais
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const parent = img.parentElement;
            if (parent) {
              const fallback = document.createElement('div');
              fallback.className = `w-full h-full flex items-center justify-center font-bold text-white ${getBackgroundColor(name)}`;
              fallback.textContent = initials;
              parent.appendChild(fallback);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        ${getBackgroundColor(name)}
        rounded-full 
        flex items-center justify-center 
        font-bold text-white shrink-0
        ${className}
      `}
      title={name}
    >
      {initials}
    </div>
  );
}
