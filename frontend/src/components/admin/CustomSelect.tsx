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
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const selected = options.find((opt) => opt.id === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
    // Reset highlighted index quando abre
    setHighlightedIndex(0);
  }, [open]);

  useEffect(() => {
    // Reset quando filtro muda
    setHighlightedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filteredOptions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].id);
          setOpen(false);
          setSearch("");
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearch("");
        break;
    }
  };

  // Auto-scroll quando o highlight muda
  useEffect(() => {
    if (listContainerRef.current) {
      const highlightedElement = listContainerRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      {/* BOTÃO */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="
          w-full px-3 py-2.5
          hover:bg-gray-100
          border border-gray-200
          rounded-xl
          text-sm
          flex items-center justify-between
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500/30
        "
      >
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>

        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* DROPDOWN */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            zIndex: 9999,
          }}
          className="
            bg-white
            border border-gray-200
            rounded-xl
            shadow-xl
            overflow-hidden
            animate-in fade-in zoom-in-95
          "
        >
          {/* opcao de busca na lista */}
          <div className="p-2 border-b border-gray-200">
            <input
              ref={searchInputRef}
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar..."
              className="
                w-full px-2 py-1.5
                text-sm
                bg-transparent
                outline-none
              "
            />
          </div>

          {/* LISTA */}
          <div ref={listContainerRef} className="max-h-60 overflow-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.id === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      px-3 py-2.5 text-sm cursor-pointer
                      flex items-center justify-between
                      transition-all
                      ${
                        isHighlighted
                          ? "bg-blue-100 text-blue-600"
                          : isSelected
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700"
                      }
                      ${!isHighlighted && "hover:bg-gray-100"}
                    `}
                  >
                    {opt.label}

                    {isSelected && (
                      <span className="text-blue-500">✔</span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-gray-400">
                Nenhum resultado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}