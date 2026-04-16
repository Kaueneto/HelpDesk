'use client';

import { useState, useRef, useEffect } from 'react';
import Avatar from '@/components/Avatar';
import { useTheme } from '@/contexts/ThemeContext';

interface User {
  id: number;
  name: string;
  email: string;
  roleId: number;
  departamento?: string;
  avatar_url?: string | null;
}

interface UserSelectProps {
  value: number | null;
  onChange: (userId: number) => void;
  options: User[];
}

export default function UserSelect({ value, onChange, options }: UserSelectProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const selectedUser = options.find(u => u.id === value);
  const filteredOptions = options.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    setShowTooltip(true);
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltipVisible(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
    setTooltipVisible(false);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
  };

  const handleSelect = (userId: number) => {
    onChange(userId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* bt com Avatar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 border"
        style={{
          backgroundColor: theme.background.surface,
          borderColor: isOpen ? theme.brand.primary : theme.border.primary,
          color: theme.text.primary,
        }}
      >
        <Avatar
          name={selectedUser?.name || 'Usuário'}
          avatarUrl={selectedUser?.avatar_url}
          size="sm"
        />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium truncate" style={{ color: theme.text.primary }}>
            {selectedUser?.name || 'Selecionar responsável'}
          </div>
        </div>
        <svg
          className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: theme.text.secondary }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7" />
        </svg>
      </button>

      {/* tooltip ao passar mouse */}
      {showTooltip && selectedUser && !isOpen && tooltipVisible && (
        <div
          className="absolute top-full left-0 mt-2 z-40 p-3 rounded-xl shadow-lg border"
          style={{
            backgroundColor: theme.background.modal,
            borderColor: theme.border.primary,
            color: theme.text.primary,
          }}
        >
          <div className="flex items-start gap-3 min-w-max">
            <Avatar
              name={selectedUser.name}
              avatarUrl={selectedUser.avatar_url}
              size="md"
            />
            <div className="flex flex-col gap-1">
              <div className="font-medium text-sm">{selectedUser.name}</div>
              <div className="text-xs" style={{ color: theme.text.secondary }}>
                {selectedUser.email}
              </div>
              {selectedUser.departamento && (
                <div className="text-xs" style={{ color: theme.text.secondary }}>
                  {selectedUser.departamento}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* dropdown de seleção */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-lg border z-40 max-h-80 flex flex-col overflow-hidden"
          style={{
            backgroundColor: theme.background.modal,
            borderColor: theme.border.primary,
          }}
        >
          {/* campo de busca */}
          <div className="p-2 border-b sticky top-0" style={{ borderColor: theme.border.primary }}>
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-sm outline-none border"
              style={{
                backgroundColor: '#000000',
                color: theme.text.primary,
                borderColor: theme.border.primary,
              }}
              autoFocus
            />
          </div>

          {/* lsita de users */}
          <div className="overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all hover:opacity-80 border-b last:border-b-0"
                  style={{
                    backgroundColor: value === user.id ? `${theme.brand.primary}20` : 'transparent',
                    borderColor: theme.border.primary,
                    color: theme.text.primary,
                  }}
                >
                  <Avatar
                    name={user.name}
                    avatarUrl={user.avatar_url}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{user.name}</div>
                    {user.departamento && (
                      <div className="text-xs truncate" style={{ color: theme.text.secondary }}>
                        {user.departamento}
                      </div>
                    )}
                  </div>
                  {value === user.id && (
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{ color: theme.brand.primary }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <div className="w-full text-center py-4 text-sm" style={{ color: theme.text.secondary }}>
                Nenhum usuário encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
