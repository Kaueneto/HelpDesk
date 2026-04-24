
import React from 'react';
import Select from 'react-select';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiPlus } from 'react-icons/fi';
import { getSelectStyles } from '../utils/kanbanThemeHelpers';
import type { KanbanHeaderProps } from '../utils/kanbanTypes';

export function KanbanHeader({
  tickets,
  groupBy,
  allGroupByOptions,
  selectedBoard,
  somenteAbertos,
  isRefreshing,
  onGroupByChange,
  onToggleSomenteAbertos,
  onRefresh,
  onCreateBoard,
  theme,
}: KanbanHeaderProps) {
  const currentSelectValue =
    groupBy === 'personalizada' && selectedBoard
      ? allGroupByOptions.find((opt) => opt.value === `board_${selectedBoard.id}`)
      : allGroupByOptions.find((opt) => opt.value === groupBy);

  return (
    <div
      className="mb-6 flex justify-between items-center gap-6"
      style={{
        paddingBottom: '12px',
        borderBottomColor: theme.border.secondary,
        borderBottomWidth: '1px',
      }}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>
            Exibir por
          </span>
          <div className="flex items-center gap-2">
            <div className="w-56">
              <Select
                value={currentSelectValue}
                onChange={onGroupByChange}
                options={allGroupByOptions}
                placeholder="Selecionar..."
                isSearchable={false}
                styles={getSelectStyles(theme)}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCreateBoard}
              className="p-1.5 rounded-md transition-all duration-200 hover:opacity-80 flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: theme.background.hover,
                color: theme.brand.primary,
              }}
              title="Criar novo quadro"
            >
              <FiPlus className="w-4.5 h-4.5" strokeWidth={3} />
            </motion.button>
          </div>
        </div>

        <div
          className="flex items-center gap-3 pl-6"
          style={{
            borderLeftColor: theme.border.secondary,
            borderLeftWidth: '1px',
          }}
        >
          <span className="text-sm" style={{ color: theme.text.secondary }}>
            Não mostrar concluídos
          </span>

          <button
            type="button"
            onClick={onToggleSomenteAbertos}
            className="relative w-11 h-6 rounded-full transition-all duration-200"
            style={{
              backgroundColor: somenteAbertos
                ? theme.brand.primary
                : theme.border.secondary,
            }}
          >
            <span
              className="absolute top-1 left-1 w-4 h-4 rounded-full shadow-sm transition-transform duration-200"
              style={{
                backgroundColor: 'white',
                transform: somenteAbertos ? 'translateX(20px)' : 'translateX(0)',
              }}
            />
          </button>

          <div
            className="border-l"
            style={{
              borderLeftColor: theme.border.secondary,
              height: '24px',
              margin: '0 8px',
            }}
          />

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg transition-all duration-200 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isRefreshing ? theme.brand.primary : 'transparent',
              color: isRefreshing ? 'white' : theme.text.secondary,
            }}
            title="Recarregar chamados"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              strokeWidth={2.5}
            />
          </button>
        </div>
      </div>

      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: theme.text.secondary }}
      >
        <span>{tickets.length}</span>
        <span>Registros</span>
      </div>
    </div>
  );
}

export default KanbanHeader;
