"use client";

import { useState, useCallback } from "react";

interface CopyButtonProps {
  text: string;
  className?: string;
  onCopy?: () => void;
}

export default function CopyButton({ text, className = "", onCopy }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  }, [text, onCopy]);

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 rounded-lg border border-white/10 bg-bg-surface px-3 py-2 text-sm text-text-secondary transition-all hover:border-white/20 hover:text-text-primary ${className}`}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 8l3 3 7-7" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copie
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Copier
        </>
      )}
    </button>
  );
}
