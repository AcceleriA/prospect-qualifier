"use client";

import { useState } from "react";

interface EmailGateProps {
  onSubmit: (email: string) => void;
  onClose: () => void;
}

export default function EmailGate({ onSubmit, onClose }: EmailGateProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email invalide");
      return;
    }
    onSubmit(email);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/5 bg-bg-elevated p-8">
        <h2 className="font-display mb-2 text-xl font-bold text-text-primary">
          Continue a qualifier tes prospects
        </h2>
        <p className="mb-6 text-sm text-text-secondary">
          Entre ton email pour continuer a utiliser l&apos;outil gratuitement.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="ton@email.com"
              className="w-full rounded-lg border border-white/15 bg-bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:border-violet focus:ring-1 focus:ring-violet"
            />
            {error && (
              <p className="mt-1 text-sm text-red-400">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-violet px-4 py-3 font-medium text-white transition-colors hover:bg-violet-dark"
          >
            Continuer
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-sm text-text-secondary hover:text-text-primary"
          >
            Plus tard
          </button>
        </form>
      </div>
    </div>
  );
}
