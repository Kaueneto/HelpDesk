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
  isRefreshing,
  onGroupByChange,
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
      className="mb-6 flex items-center justify-between gap-6"
      style={{
        paddingBottom: '12px',
        borderBottom: `1px solid ${theme.border.secondary}`,
      }}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span
            className="text-[11px] font-medium uppercase tracking-[0.08em]"
            style={{ color: theme.text.secondary }}
          >
            Quadro
          </span>

          <div className="flex items-center gap-2">
            <div className="w-56">
              <Select
                value={currentSelectValue}
                onChange={onGroupByChange}
                options={allGroupByOptions}
                placeholder="Selecionar quadro..."
                isSearchable={false}
                styles={getSelectStyles(theme)}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                menuPosition="fixed"
                menuShouldScrollIntoView={true}
              />
            </div>

            <motion.button
              type="button"
              onClick={onCreateBoard}
              initial={false}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${theme.brand.primary}12`,
                border: `1px solid ${theme.brand.primary}35`,
                color: theme.brand.primary,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
              title="Criar novo quadro"
            >
              <FiPlus className="h-4 w-4" strokeWidth={2.8} />
            </motion.button>
          </div>
        </div>

        <div
          className="flex items-center gap-4 pl-6"
          style={{
            borderLeft: `1px solid ${theme.border.secondary}`,
          }}
        >
          <motion.button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            initial={false}
            whileHover={isRefreshing ? undefined : { scale: 1.03 }}
            whileTap={isRefreshing ? undefined : { scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: isRefreshing
                ? theme.brand.primary
                : theme.background.surface,
              border: `1px solid ${
                isRefreshing ? theme.brand.primary : theme.border.secondary
              }`,
              color: isRefreshing ? '#ffffff' : theme.text.secondary,
              boxShadow: isRefreshing
                ? '0 4px 12px rgba(0,0,0,0.12)'
                : '0 1px 3px rgba(0,0,0,0.08)',
            }}
            title="Recarregar chamados"
          >
            <motion.div
              initial={false}
              animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={
                isRefreshing
                  ? { repeat: Infinity, duration: 0.8, ease: 'linear' }
                  : { duration: 0.2 }
              }
              style={{ willChange: 'transform' }}
            >
              <FiRefreshCw className="h-4 w-4" strokeWidth={2.2} />
            </motion.div>
          </motion.button>
        </div>
      </div>

      <div
        className="flex items-center gap-2 rounded-xl px-3 py-1.5"
        style={{
          backgroundColor: theme.background.surface,
          border: `1px solid ${theme.border.secondary}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: theme.brand.primary }}
        >
          {tickets.length}
        </span>
        <span
          className="text-xs font-medium"
          style={{ color: theme.text.secondary }}
        >
          Registros
        </span>
      </div>
    </div>
  );
}

export default KanbanHeader;