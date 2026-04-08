"use client";

import { motion } from "framer-motion";
import type { Priority } from "@/types/qualification";

interface PriorityBadgeProps {
  priority: Priority;
}

const config: Record<Priority, { label: string; bg: string; text: string; pulse: boolean }> = {
  hot: {
    label: "HOT LEAD",
    bg: "bg-gradient-to-r from-red-500 to-orange-500",
    text: "text-white",
    pulse: true,
  },
  warm: {
    label: "WARM",
    bg: "bg-orange/20",
    text: "text-orange",
    pulse: false,
  },
  cold: {
    label: "COLD",
    bg: "bg-bleu/20",
    text: "text-bleu",
    pulse: false,
  },
};

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { label, bg, text, pulse } = config[priority];

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold tracking-wider ${bg} ${text}`}
    >
      {pulse && (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
        </span>
      )}
      {label}
    </motion.div>
  );
}
