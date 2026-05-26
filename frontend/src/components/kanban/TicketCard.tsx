"use client";
import { useState, memo, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiFileText, FiCheck, FiEdit } from "react-icons/fi";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "../../contexts/ThemeContext";

// fonte global no layout.tsx
const WORKSANS_CLASS = "font-worksans";

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
  kanbanPositions?:
    | Array<{ groupBy: string; columnValue: string | null; position: number }>
    | { groupBy: string; columnValue: string | null; position: number }
    | null;
}

interface TicketCardProps {
  chamado: Chamado;
  onClick?: () => void;
  isDragging?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  isSelected?: boolean;
}

function formatDateSafe(dateString: string) {
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
}

function getPriorityColorFactory(theme: any) {
  return (prioridadeNome: string) => {
    const n = prioridadeNome.toLowerCase();
    switch (n) {
      case "baixa":
      case "baixo":
        return theme.priority.baixa;
      case "média":
      case "media":
      case "médio":
      case "medio":
        return theme.priority.media;
      case "alta":
      case "alto":
        return theme.priority.alta;
      case "crítica":
      case "critica":
        return theme.priority.critica;
      case "urgente":
        return theme.priority.urgente;
      default:
        return theme.priority.media;
    }
  };
}

function getStatusColorFactory(theme: any) {
  return (statusId: number) => {
    switch (statusId) {
      case 1:
        return theme.status.aberto;
      case 2:
        return theme.status.emAtendimento;
      case 3:
        return theme.status.encerrado;
      case 4:
        return theme.status.cancelado;
      case 5:
        return theme.status.aguardando;
      case 6:
        return theme.status.pendenteUsuario;
      case 7:
        return theme.status.pendente;
      default:
        return theme.status.aberto;
    }
  };
}

const TicketCard = memo(
  function TicketCard({
    chamado,
    onClick,
    isDragging = false,
    onSelect,
    isSelected = false,
  }: TicketCardProps) {
    const { theme } = useTheme();
    const [showMoveAnimation, setShowMoveAnimation] = useState(false);
    const prevPositions = useRef(JSON.stringify(chamado.kanbanPositions ?? null));

    useEffect(() => {
      const current = JSON.stringify(chamado.kanbanPositions ?? null);
      if (prevPositions.current !== current && !isDragging) {
        setShowMoveAnimation(true);
        const t = setTimeout(() => setShowMoveAnimation(false), 200);
        prevPositions.current = current;
        return () => clearTimeout(t);
      }
    }, [chamado.kanbanPositions, isDragging]);

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: sortableIsDragging,
    } = useSortable({
      id: chamado.id.toString(),
      data: { type: "ticket", ticket: chamado },
    });

    const style = useMemo(
      () => ({
        transform: CSS.Transform.toString(transform),
        transition: sortableIsDragging ? undefined : transition,
        opacity: sortableIsDragging ? 0.4 : 1,
        zIndex: sortableIsDragging ? 50 : undefined,
      }),
      [transform, transition, sortableIsDragging]
    );

    const formatDate = formatDateSafe;
    const getPriorityColor = getPriorityColorFactory(theme);
    const getStatusColor = getStatusColorFactory(theme);

    const handleCardClick = (e: React.MouseEvent) => {
      if (sortableIsDragging || isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      onClick?.();
    };

    const handleCheckboxClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect?.(chamado.id, !isSelected);
    };

    return (
      <div ref={setNodeRef} {...attributes} style={style} className="w-full touch-none mb-1">
        <motion.div
          layout={false} //animacao do card
          animate={{
            scale: showMoveAnimation ? 1.01 : 1,
            y: showMoveAnimation ? -2 : 0,
          }}
          transition={{
            scale: showMoveAnimation ? { type: "spring", stiffness: 100, damping: 10 } : { duration: 0.1 },
            y: showMoveAnimation ? { type: "spring", stiffness: 100, damping: 10 } : { duration: 0.1 },
          }}

          className="rounded-lg shadow-sm border relative overflow-hidden group select-none"
          style={{
            backgroundColor: sortableIsDragging ? `${theme.brand.primary}1a` : theme.kanban.cardBg,
            borderColor: isSelected ? theme.brand.primary : theme.kanban.cardBg,
            borderWidth: "1px",
            borderStyle: sortableIsDragging ? "dashed" : "solid",
            cursor: sortableIsDragging || isDragging ? "grabbing" : "grab",
            boxShadow: isSelected
              ? `0 0 0 1px ${theme.brand.primary}`
              : sortableIsDragging
              ? `0 8px 16px ${theme.brand.primary}33`
              : "0 1px 3px rgba(0,0,0,0.05)",
            transition: sortableIsDragging ? "none" : "all 0.12s ease-out",
          }}
        >
          <AnimatePresence>
            {showMoveAnimation && (
              <motion.div
                initial={{ opacity: 1, scale: 0.96 }}
                animate={{ opacity: 0, scale: 1.04 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.36 }}
                className="absolute inset-0 rounded-lg pointer-events-none"
               /*style={{ borderColor: theme.indicators.sucesso }} */
              />
            )}
          </AnimatePresence>

          {sortableIsDragging && <div className="absolute inset-0" style={{ backgroundColor: `${theme.brand.primary}05` }} />}

          <div {...listeners} className="p-3" style={{ opacity: sortableIsDragging ? 0 : 1 }} onClick={handleCardClick}>
            <div className="flex items-start gap-2 mb-2">
             <div className="mt-0.5 shrink-0 w-5 flex items-center justify-center">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckboxClick(e);
                }}
                
                className={`w-5 h-5 rounded-lg border-3 flex items-center justify-center cursor-pointer
                  transition-all duration-100
                  ${isSelected ? "opacity-100 scale-100" : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"}`}
                style={{
                  backgroundColor: isSelected ? theme.brand.primary : "transparent",
                  borderColor: isSelected ? theme.brand.primary : theme.border.secondary,
                }}
              >
                {isSelected && <FiCheck className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
            </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-segoe text-base font-semibold line-clamp-2 leading-tight" style={{ color: theme.text.primary }}>
                  {chamado.resumoChamado}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: theme.text.secondary }}>
                  #{chamado.numeroChamado} · {chamado.id}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              {/* Prioridade */}
              <div>
                {(() => {
                  const colors = getPriorityColor(chamado.tipoPrioridade.nome);
                  // if your theme returns an object with bg/text/border, use accordingly
                  return (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: colors.bg ?? colors,
                        color: colors.text ?? theme.text.primary,
                        borderColor: colors.border ?? "transparent",
                      }}
                    >
                      {chamado.tipoPrioridade.nome}
                    </span>
                  );
                })()}
              </div>

              {/* Tópico */}
              <div className={`${WORKSANS_CLASS} flex items-center text-sm gap-1.5`} style={{ color: theme.text.secondary }}>
                <FiFileText className="w-3 h-3 shrink-0" />
                <span className="truncate">{chamado.topicoAjuda.nome}</span>
              </div>

              {/* Status */}
              <div>
                {(() => {
                  const colors = getStatusColorFactory(theme)(chamado.status.id);
                  return (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border"
                      style={{
                        backgroundColor: colors.bg ?? colors,
                        color: colors.text ?? theme.text.primary,
                        borderColor: colors.border ?? "transparent",
                      }}
                    >
                      {chamado.status.nome}
                    </span>
                  );
                })()}
              </div>

              {/* Datas */}
              <div className="space-y-1">
                <div className="flex items-center text-xs gap-1" style={{ color: theme.text.secondary }}>
                  <FiEdit className="w-3 h-3" />
                  <span>{formatDate(chamado.dataAbertura)}</span>
                </div>
                {chamado.dataFechamento && (
                  <div className="flex items-center text-xs gap-1" style={{ color: theme.text.secondary }}>
                    <FiCheck className="w-3 h-3" />
                    <span>{formatDate(chamado.dataFechamento)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  },

  (prev, next) => {

    return (
      prev.chamado === next.chamado &&
      prev.isSelected === next.isSelected &&
      prev.isDragging === next.isDragging &&
      prev.onClick === next.onClick &&
      prev.onSelect === next.onSelect
    );
  }
);

TicketCard.displayName = "TicketCard";
export default TicketCard;