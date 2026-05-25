"use client";

import { memo, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import TicketCard from "./TicketCard";
import DropIndicator from "./DropIndicator";

interface Chamado {
  id: number;
  numeroChamado: number;
  dataAbertura: string;
  dataFechamento: string | null;
  resumoChamado: string;
  usuario: { id: number; name: string };
  userResponsavel: { id: number; name: string } | null;
  tipoPrioridade: { id: number; nome: string; cor: string };
  topicoAjuda: { id: number; nome: string };
  departamento: { id: number; nome: string; name?: string };
  status: { id: number; nome: string };
  historico?: Array<{ id: number; descricao: string; dataHistorico: string; usuario?: { name: string } }>;
  kanbanPositions?:
    | Array<{ groupBy: string; columnValue: string | null; position: number }>
    | { groupBy: string; columnValue: string | null; position: number }
    | null;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  color?: string;
  tickets: Chamado[];
  onTicketClick?: (ticket: Chamado) => void;
  groupBy: string;
  columnValue: string | null;
  selectedTickets?: Set<number>;
  onTicketSelect?: (ticketId: number, selected: boolean) => void;
  onSelectAll?: (ticketIds: number[]) => void;
  onDeleteColumn?: () => void;
  onRenameColumn?: (newName: string) => void;
  onMoveAllCards?: (targetColumnId: string) => void | Promise<void>;
  availableColumns?: Array<{ id: string; nome: string }>;
  isSpecialColumn?: boolean;
  dragOverInfo?: any;
}

const KanbanColumn = memo(function KanbanColumn({
  id,
  title,
  color = "#3B82F6",
  tickets,
  onTicketClick,
  groupBy,
  columnValue,
  selectedTickets = new Set(),
  onTicketSelect,
  onSelectAll,
  onDeleteColumn,
  onRenameColumn,
  onMoveAllCards,
  availableColumns = [],
  isSpecialColumn = false,
  dragOverInfo,
}: KanbanColumnProps) {
  const { theme } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(title);
  const [isMoveSubmenuOpen, setIsMoveSubmenuOpen] = useState(false);
  const [submenuDirection, setSubmenuDirection] = useState<"right" | "bottom">("right");
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineEditValue, setInlineEditValue] = useState(title);

  const menuRef = useRef<HTMLDivElement>(null);
  const submenuTriggerRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { type: "column", groupBy, columnValue },
  });

  useEffect(() => {
    setNewName(title);
    setInlineEditValue(title);
  }, [title]);

  useEffect(() => {
    if (isInlineEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isInlineEditing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsMoveSubmenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMoveSubmenuOpen || !submenuTriggerRef.current) return;

    const rect = submenuTriggerRef.current.getBoundingClientRect();
    const submenuWidth = 220;
    const spaceRight = window.innerWidth - rect.right;
    const spaceBottom = window.innerHeight - rect.top;

    if (spaceRight >= submenuWidth + 16) {
      setSubmenuDirection("right");
    } else if (spaceBottom >= 220) {
      setSubmenuDirection("bottom");
    } else {
      setSubmenuDirection("right");
    }
  }, [isMoveSubmenuOpen]);

  const ticketIds = useMemo(() => tickets.map((t) => t.id.toString()), [tickets]);
  const selectedCount = useMemo(
    () => tickets.filter((ticket) => selectedTickets.has(ticket.id)).length,
    [tickets, selectedTickets]
  );
  const hasSelectedInColumn = selectedCount > 0;

  const handleSelectAll = useCallback(() => {
    onSelectAll?.(tickets.map((t) => t.id));
    setIsMenuOpen(false);
    setIsMoveSubmenuOpen(false);
  }, [onSelectAll, tickets]);

  const handleClearAll = useCallback(() => {
    tickets.forEach((ticket) => onTicketSelect?.(ticket.id, false));
    setIsMenuOpen(false);
    setIsMoveSubmenuOpen(false);
  }, [tickets, onTicketSelect]);

  const handleRename = useCallback(() => {
    if (newName.trim() && newName.trim() !== title) {
      onRenameColumn?.(newName.trim());
    }
    setIsRenaming(false);
  }, [newName, title, onRenameColumn]);

  const handleInlineEditStart = useCallback(() => {
    setIsInlineEditing(true);
    setInlineEditValue(title);
    setIsMenuOpen(false);
    setIsMoveSubmenuOpen(false);
  }, [title]);

  const handleInlineEditSave = useCallback(() => {
    if (inlineEditValue.trim() && inlineEditValue.trim() !== title) {
      onRenameColumn?.(inlineEditValue.trim());
    }
    setIsInlineEditing(false);
    setInlineEditValue(title);
  }, [inlineEditValue, title, onRenameColumn]);

  const handleInlineEditCancel = useCallback(() => {
    setIsInlineEditing(false);
    setInlineEditValue(title);
  }, [title]);

  const handleMoveToColumn = useCallback(
    (targetColumnId: string) => {
      onMoveAllCards?.(targetColumnId);
      setIsMoveSubmenuOpen(false);
      setIsMenuOpen(false);
    },
    [onMoveAllCards]
  );

  const menuPanelStyle = {
    backgroundColor: theme.background.surface,
    border: `1px solid ${theme.border.secondary}`,
    boxShadow: `0 8px 24px rgba(0,0,0,0.08)`,
  } as const;

  const columnSurfaceStyle = {
    backgroundColor: theme.kanban.columnBg,
    border: `1px solid ${theme.kanban.columnBorder}`,
  } as const;

  const menuItemBaseStyle = {
    color: theme.text.primary,
    border: `1px solid transparent`,
  } as const;

  const menuHoverStyle = {
    backgroundColor: `${theme.brand.primary}14`,
    borderColor: `${theme.brand.primary}22`,
  } as const;

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? "auto" : undefined }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex ${isCollapsed ? "flex-row" : "flex-col"} h-full ${
        isCollapsed ? "min-w-14" : "min-w-80 max-w-80"
      }`}
    >
        {isCollapsed ? (
        <div
          className="flex flex-col items-center justify-start p-2 rounded-lg transition-all duration-200 cursor-pointer"
          style={{
            backgroundColor: theme.kanban.columnBg,
            borderTop: `1px solid ${theme.kanban.columnBorder}`,
            borderRight: `1px solid ${theme.kanban.columnBorder}`,
            borderBottom: `1px solid ${theme.kanban.columnBorder}`,
            borderLeft: `3px solid ${color}`,
          }}
          onClick={() => setIsCollapsed(false)}
        >
          <button
            className="transition-colors mb-2"
            title="Expandir coluna"
            style={{ color: theme.kanban.textSecondary }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <span
            className="text-xs font-medium px-2 py-1 rounded-full mb-2"
            style={{
              backgroundColor: theme.kanban.columnBorder,
              color: theme.kanban.textSecondary,
            }}
          >
            {tickets.length}
          </span>

          <div className="flex-1 flex items-center justify-center">
            <h3
              className="text-sm font-semibold whitespace-nowrap"
              style={{
                color: theme.kanban.textPrimary,
                writingMode: "vertical-rl",
                textOrientation: "mixed",
              }}
            >
              {title}
            </h3>
          </div>

          <div className="w-3 h-3 rounded-full mt-2" style={{ backgroundColor: color }} />
        </div>
      ) : (
        <>
          <div
            className="flex items-center justify-between p-4 rounded-t-lg transition-all duration-200 gap-2"
            style={{
              backgroundColor: theme.kanban.columnBg,
              borderTop: `4px solid ${color}`,
              borderRight: `1px solid ${theme.kanban.columnBorder}`,
              borderBottom: "0px",
              borderLeft: `1px solid ${theme.kanban.columnBorder}`,
            }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />

              {isInlineEditing ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={inlineEditValue}
                  onChange={(e) => setInlineEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleInlineEditSave();
                    else if (e.key === "Escape") handleInlineEditCancel();
                  }}
                  onBlur={handleInlineEditSave}
                  className="font-segoe text-sm font-semibold outline-none bg-transparent px-2 py-1 w-full min-w-0 border border-transparent rounded focus:border-blue-500" 
                  style={{ color: theme.kanban.textPrimary }}
                  autoComplete="off"
                />
              ) : (
                
                <h3
                  onDoubleClick={handleInlineEditStart}
                  title={title}
                  className="font-segoe text-sm font-semibold truncate cursor-text hover:opacity-80 transition-opacity flex-1 border border-transparent hover:border-white/30 rounded"
                  style={{ color: theme.kanban.textPrimary }}
                >
                  {title}
                </h3>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsCollapsed(true)}
                className="transition-colors p-1 shrink-0"
                style={{ color: theme.kanban.textSecondary }}
                title="Recolher coluna"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              <div className="relative shrink-0" ref={menuRef}>
                <button
                  onClick={() => {
                    setIsMenuOpen((prev) => !prev);
                    if (isMenuOpen) setIsMoveSubmenuOpen(false);
                  }}
                  className="transition-colors p-1 rounded hover:opacity-70 focus:ring-1 shrink-0"
                  style={{ color: theme.kanban.textSecondary }}
                  title="Opções da coluna"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg p-2"
                      style={menuPanelStyle}
                    >
                      <motion.button
                        type="button"
                        onClick={handleSelectAll}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ duration: 0.12 }}
                        className="mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
                        style={menuItemBaseStyle}
                        onMouseEnter={(e) => {
                          Object.assign(e.currentTarget.style, menuHoverStyle);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.borderColor = "transparent";
                        }}
                      >
                        Selecionar todos
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={handleClearAll}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ duration: 0.12 }}
                        className="mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
                        style={{
                          ...menuItemBaseStyle,
                          opacity: hasSelectedInColumn ? 1 : 0.55,
                        }}
                        disabled={!hasSelectedInColumn}
                        onMouseEnter={(e) => {
                          if (!hasSelectedInColumn) return;
                          Object.assign(e.currentTarget.style, menuHoverStyle);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.borderColor = "transparent";
                        }}
                      >
                        Desmarcar todos
                      </motion.button>

                      {!isSpecialColumn && (
                        <motion.button
                          type="button"
                          onClick={() => {
                            handleInlineEditStart();
                          }}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ duration: 0.12 }}
                          className="mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
                          style={menuItemBaseStyle}
                          onMouseEnter={(e) => {
                            Object.assign(e.currentTarget.style, menuHoverStyle);
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.borderColor = "transparent";
                          }}
                        >
                          Alterar nome
                        </motion.button>
                      )}

                      {availableColumns.length > 0 && (
                        <div
                          className="relative mt-1 pt-2"
                          style={{ borderTop: `1px solid ${theme.border.secondary}33` }}
                        >
                          <motion.button
                            ref={submenuTriggerRef}
                            type="button"
                            onClick={() => setIsMoveSubmenuOpen((prev) => !prev)}
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ duration: 0.12 }}
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors flex items-center justify-between"
                            style={{
                              ...menuItemBaseStyle,
                              backgroundColor: isMoveSubmenuOpen ? `${theme.brand.primary}14` : "transparent",
                              borderColor: isMoveSubmenuOpen ? `${theme.brand.primary}22` : "transparent",
                            }}
                            aria-expanded={isMoveSubmenuOpen}
                            onMouseEnter={(e) => {
                              if (!isMoveSubmenuOpen) Object.assign(e.currentTarget.style, menuHoverStyle);
                            }}
                            onMouseLeave={(e) => {
                              if (!isMoveSubmenuOpen) {
                                e.currentTarget.style.backgroundColor = "transparent";
                                e.currentTarget.style.borderColor = "transparent";
                              }
                            }}
                          >
                            <span>Mover cards para</span>

                            <motion.svg
                              animate={{ rotate: isMoveSubmenuOpen ? 90 : 0 }}
                              transition={{ duration: 0.14 }}
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </motion.svg>
                          </motion.button>

                          <AnimatePresence>
                            {isMoveSubmenuOpen && (
                              <motion.div
                                initial={
                                  submenuDirection === "right"
                                    ? { opacity: 0, x: -8, scale: 0.98 }
                                    : { opacity: 0, y: -8, scale: 0.98 }
                                }
                                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                                exit={
                                  submenuDirection === "right"
                                    ? { opacity: 0, x: -8, scale: 0.98 }
                                    : { opacity: 0, y: -8, scale: 0.98 }
                                }
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                className="absolute z-60 w-56 rounded-lg p-2"
                                style={{
                                  ...menuPanelStyle,
                                  left: submenuDirection === "right" ? "calc(100% + 10px)" : 0,
                                  top: submenuDirection === "right" ? -8 : "calc(100% + 10px)",
                                }}
                              >
                                {availableColumns.map((col) => (
                                  <motion.button
                                    key={col.id}
                                    type="button"
                                    onClick={() => handleMoveToColumn(col.id)}
                                    whileHover={{ x: 2 }}
                                    whileTap={{ scale: 0.99 }}
                                    transition={{ duration: 0.12 }}
                                    className="mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors last:mb-0 truncate"
                                    style={menuItemBaseStyle}
                                    title={col.nome}
                                    onMouseEnter={(e) => {
                                      Object.assign(e.currentTarget.style, menuHoverStyle);
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                      e.currentTarget.style.borderColor = "transparent";
                                    }}
                                  >
                                    {col.nome}
                                  </motion.button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {!isSpecialColumn && (
                        <div
                          className="mt-1 pt-2"
                          style={{ borderTop: `1px solid ${theme.border.secondary}33` }}
                        >
                          <motion.button
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsMoveSubmenuOpen(false);
                              onDeleteColumn?.();
                            }}
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ duration: 0.12 }}
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
                            style={{
                              color: "#EF4444",
                              border: "1px solid transparent",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.10)";
                              e.currentTarget.style.borderColor = "rgba(239,68,68,0.18)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.borderColor = "transparent";
                            }}
                          >
                            Excluir coluna
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <span
                className="rounded-full px-2 py-1 text-xs font-medium transition-all shrink-0"
                style={{
                  backgroundColor: isOver ? theme.brand.primary : `${color}16`,
                  color: isOver ? "#FFFFFF" : color,
                  border: `1px solid ${isOver ? theme.brand.primary : `${color}20`}`,
                }}
              >
                {tickets.length}
              </span>
            </div>
          </div>

          <div
            ref={setNodeRef}
            className="custom-scrollbar flex-1 min-h-32 overflow-y-auto rounded-b-2xl p-2 transition-all duration-150"
            style={{
              maxHeight: "calc(100vh - 220px)",
              background: `${theme.kanban.columnBg}`,
              borderRight: `5px solid ${theme.kanban.columnBorder}`,
              borderBottom: `1px solid ${theme.kanban.columnBorder}`,
              borderLeft: `1px solid ${theme.kanban.columnBorder}`,
              boxShadow: "0 10px 24px rgba(0,0,0,0.04)",
            }}
          >
         <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
  {tickets.length > 0 ? (
    <>
      <DropIndicator
        isVisible={
          dragOverInfo?.targetColumn === id &&
          dragOverInfo?.overIndex === 0 &&
          dragOverInfo?.insertPosition === "above"
        }
      />

      {tickets.map((ticket, index) => {
        const showAbove =
          dragOverInfo?.targetColumn === id &&
          dragOverInfo?.overIndex === index &&
          dragOverInfo?.insertPosition === "above";

        const showBelow =
          dragOverInfo?.targetColumn === id &&
          dragOverInfo?.overIndex === index &&
          dragOverInfo?.insertPosition === "below";

        return (
          <div key={ticket.id} className="relative">
            {index > 0 && <DropIndicator isVisible={showAbove} />}

            <TicketCard
              chamado={ticket}
              onClick={() => onTicketClick?.(ticket)}
              isSelected={selectedTickets.has(ticket.id)}
              onSelect={onTicketSelect}
            />

            <DropIndicator isVisible={showBelow} />
          </div>
        );
      })}

      <DropIndicator
        isVisible={
          isOver &&
          dragOverInfo?.targetColumn === id &&
          dragOverInfo?.overIndex === tickets.length - 1 &&
          dragOverInfo?.insertPosition === "below"
        }
      />
    </>
  ) : (
    <div
      className="rounded-xl border-2 border-dashed p-4 text-center text-sm"
      style={{
        borderColor: isOver ? theme.brand.primary : theme.border.secondary,
        backgroundColor: isOver ? `${theme.brand.primary}14` : "transparent",
        color: theme.text.secondary,
        transition: "all 0.15s ease",
      }}
    >
      <DropIndicator isVisible={isOver} />
      Arraste tickets aqui
    </div>
  )}
</SortableContext>
          </div>
        </>
      )}
    </motion.div>
  );
});

KanbanColumn.displayName = "KanbanColumn";
export default KanbanColumn;
