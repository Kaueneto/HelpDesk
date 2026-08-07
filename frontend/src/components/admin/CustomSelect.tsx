"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
  id: number;
  label: string;
}

interface Props {
  value: number | null;
  onChange: (value: number) => void;
  options: Option[];
  placeholder?: string;
  textPrim?: string;
  inputBg?: string;
  borderClr?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  textPrim = "#1f2937",
  inputBg = "#ffffff",
  borderClr = "#d1d5db",
}: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false); // controla animação separado do mount
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((opt) => opt.id === value);
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  // abrir: monta primeiro, depois dispara animação de entrada no próximo frame
  const handleOpen = () => {
    setOpen(true);
    setSearch("");
    setHighlightedIndex(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  };

  // fechar: anima saída, depois desmonta
  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 200);
  };

  const handleToggle = () => (open ? handleClose() : handleOpen());

  // Click fora fecha
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Auto-scroll no item em destaque
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((p) => Math.min(p + 1, filteredOptions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((p) => Math.max(p - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].id);
          handleClose();
        }
        break;
      case "Escape":
        handleClose();
        break;
    }
  };

  const handleSelect = (id: number) => {
    onChange(id);
    handleClose();
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={handleToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "10px 12px",
          borderRadius: "10px",
          border: `1px solid ${open ? "#3b82f6" : borderClr}`,
          backgroundColor: inputBg,
          color: selected ? textPrim : `${textPrim}70`,
          fontSize: "14px",
          cursor: "pointer",
          boxShadow: open
            ? "0 0 0 3px rgba(59,130,246,0.15)"
            : "0 1px 2px rgba(0,0,0,0.06)",
          transition: "border-color 0.15s, box-shadow 0.15s",
          outline: "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>

        {/* Chevron com rotação */}
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke={`${textPrim}80`} strokeWidth="2"
          style={{
            flexShrink: 0,
            transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Dropdown com animação spring estilo Apple ── */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: inputBg,
            border: `1px solid ${borderClr}`,
            borderRadius: "12px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)",
            overflow: "hidden",

            // Animação spring: scale + opacity + translateY
            transformOrigin: "top center",
            transform: visible
              ? "scale(1) translateY(0px)"
              : "scale(0.92) translateY(-8px)",
            opacity: visible ? 1 : 0,
            transition: visible
              ? "transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.18s ease"
              : "transform 0.18s ease, opacity 0.15s ease",
          }}
        >
          {/* Campo de busca */}
          <div style={{ padding: "8px 8px 0" }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => { setSearch(e.target.value); setHighlightedIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar..."
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: "8px",
                border: `1px solid ${borderClr}`,
                backgroundColor: `${borderClr}40`,
                color: textPrim,
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Separador */}
          <div style={{ height: "1px", backgroundColor: borderClr, margin: "8px 0 0" }} />

          {/* Lista */}
          <div
            ref={listRef}
            style={{ maxHeight: "220px", overflowY: "auto", padding: "4px" }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.id === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={opt.id}
                    onMouseDown={(e) => e.preventDefault()} // evita blur no input de busca
                    onClick={() => handleSelect(opt.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "13.5px",
                      fontWeight: isSelected ? 500 : 400,
                      color: isSelected ? "#3b82f6" : textPrim,
                      backgroundColor: isHighlighted
                        ? "rgba(59,130,246,0.10)"
                        : isSelected
                        ? "rgba(59,130,246,0.06)"
                        : "transparent",
                      transition: "background-color 0.1s",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {opt.label}
                    </span>

                    {/* Checkmark no item selecionado */}
                    {isSelected && (
                      <svg
                        width="15" height="15" viewBox="0 0 24 24"
                        fill="none" stroke="#3b82f6" strokeWidth="2.5"
                        style={{ flexShrink: 0, marginLeft: "8px" }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: `${textPrim}60` }}>
                Nenhum resultado encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}