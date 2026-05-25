"use client";

import { motion, AnimatePresence } from "framer-motion";
import { memo } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface DropIndicatorProps {
  isVisible?: boolean;
  thickness?: number;
}

const DropIndicator = memo(function DropIndicator({
  isVisible = false,
  thickness = 14,
}: DropIndicatorProps) {
  const { theme } = useTheme();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          animate={{
            opacity: 1,
            height: thickness,
            marginTop: 6,
            marginBottom: 6,
          }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          className="w-full rounded-xl"
          style={{
            backgroundColor: theme.brand.primary,
            opacity: 0.22,
            border: `1px solid ${theme.brand.primary}66`,
            boxShadow: `0 0 0 1px ${theme.brand.primary}22`,
            pointerEvents: "none",
          }}
        />
      )}
    </AnimatePresence>
  );
});

export default DropIndicator;