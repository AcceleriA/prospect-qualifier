"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";

interface MessageBlockProps {
  primaryMessage: string;
  alternativeMessage: string;
  signalUsed: string | null;
}

export default function MessageBlock({
  primaryMessage,
  alternativeMessage,
  signalUsed,
}: MessageBlockProps) {
  const [showAlt, setShowAlt] = useState(false);
  const currentMessage = showAlt ? alternativeMessage : primaryMessage;

  return (
    <div className="rounded-xl border border-white/5 bg-bg-elevated p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-text-primary">
          Message d&apos;accroche
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAlt(false)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !showAlt
                ? "bg-violet/20 text-violet-light"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Principal
          </button>
          <button
            onClick={() => setShowAlt(true)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              showAlt
                ? "bg-violet/20 text-violet-light"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Alternatif
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-white/5 bg-bg-surface p-4">
        <p className="text-[15px] leading-relaxed text-text-primary">{currentMessage}</p>
      </div>

      <div className="flex items-center justify-between">
        <CopyButton text={currentMessage} />
        {signalUsed && (
          <span className="text-xs text-text-secondary">
            Signal utilise : {signalUsed}
          </span>
        )}
      </div>
    </div>
  );
}
