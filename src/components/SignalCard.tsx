"use client";

import type { DetectedSignal } from "@/types/qualification";

interface SignalCardProps {
  signal: DetectedSignal;
}

const typeIcons: Record<DetectedSignal["type"], string> = {
  linkedin_activity: "💬",
  google_news: "📰",
  recruitment: "👥",
  role_change: "🔄",
};

const strengthColors: Record<DetectedSignal["strength"], { bg: string; text: string }> = {
  fort: { bg: "bg-green-500/20", text: "text-green-400" },
  moyen: { bg: "bg-orange/20", text: "text-orange" },
  faible: { bg: "bg-text-secondary/20", text: "text-text-secondary" },
};

const strengthBorderColors: Record<DetectedSignal["strength"], string> = {
  fort: "border-l-green-500",
  moyen: "border-l-orange",
  faible: "border-l-text-secondary",
};

export default function SignalCard({ signal }: SignalCardProps) {
  const colors = strengthColors[signal.strength];
  const borderColor = strengthBorderColors[signal.strength];

  return (
    <div
      className={`rounded-xl border border-white/5 border-l-4 ${borderColor} bg-bg-surface p-4`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg" aria-hidden>
          {typeIcons[signal.type]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-text-primary">{signal.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}
            >
              {signal.strength}
            </span>
          </div>
          <p className="text-sm text-text-secondary">{signal.detail}</p>
        </div>
      </div>
    </div>
  );
}
