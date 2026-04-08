"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { QualificationResult } from "@/types/qualification";
import ScoreGauge from "./ScoreGauge";
import PriorityBadge from "./PriorityBadge";
import SignalCard from "./SignalCard";
import MessageBlock from "./MessageBlock";

interface ResultDashboardProps {
  result: QualificationResult;
  onReset: () => void;
}

type Tab = "icp" | "signals";

const icpLabels: Record<string, string> = {
  persona: "Persona",
  industry: "Industrie",
  location: "Localisation",
  employeeCount: "Taille entreprise",
};

export default function ResultDashboard({ result, onReset }: ResultDashboardProps) {
  const [tab, setTab] = useState<Tab>("icp");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="font-display text-2xl font-bold text-text-primary">
          {result.profileName}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {result.profileTitle}
          {result.profileCompany && ` chez ${result.profileCompany}`}
        </p>
      </motion.div>

      {/* Score cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-6 rounded-xl border border-white/5 bg-bg-elevated p-8 sm:flex-row sm:justify-center sm:gap-12"
      >
        <ScoreGauge score={result.icpScore} label="ICP Fit Score" />
        <ScoreGauge score={result.intentScore} label="AI Intent Score" />
        <div className="flex items-center">
          <PriorityBadge priority={result.priority} />
        </div>
      </motion.div>

      {/* Tabs: ICP Details / Signals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-white/5 bg-bg-elevated p-6"
      >
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab("icp")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === "icp"
                ? "bg-violet/20 text-violet-light"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            ICP Match
          </button>
          <button
            onClick={() => setTab("signals")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === "signals"
                ? "bg-violet/20 text-violet-light"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Signaux detectes ({result.detectedSignals.length})
          </button>
        </div>

        {tab === "icp" ? (
          <div className="space-y-4">
            {(
              Object.entries(result.icpDetails) as [
                string,
                { score: number; max: number; reason: string },
              ][]
            ).map(([key, detail]) => (
              <div key={key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">
                    {icpLabels[key] || key}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {detail.score}/{detail.max}
                  </span>
                </div>
                <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor:
                        detail.score / detail.max >= 0.7
                          ? "#4ade80"
                          : detail.score / detail.max >= 0.4
                            ? "#feb06a"
                            : "#ef4444",
                    }}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(detail.score / detail.max) * 100}%`,
                    }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
                <p className="text-xs text-text-secondary">{detail.reason}</p>
              </div>
            ))}
          </div>
        ) : result.detectedSignals.length > 0 ? (
          <div className="space-y-3">
            {result.detectedSignals.map((signal, i) => (
              <SignalCard key={i} signal={signal} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-text-secondary">
            Aucun signal d&apos;intention detecte pour ce profil.
          </p>
        )}
      </motion.div>

      {/* Message block */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <MessageBlock
          primaryMessage={result.primaryMessage}
          alternativeMessage={result.alternativeMessage}
          signalUsed={result.signalUsed}
        />
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <a
          href="https://www.acceleria.co"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg bg-gradient-to-r from-orange to-orange-light px-6 py-3.5 text-center font-medium text-bg-primary transition-opacity hover:opacity-90"
        >
          Qualifie tous tes prospects
        </a>
        <button
          onClick={onReset}
          className="flex-1 rounded-lg border border-white/10 px-6 py-3.5 font-medium text-text-secondary transition-colors hover:border-white/20 hover:text-text-primary"
        >
          Nouvelle analyse
        </button>
      </motion.div>
    </div>
  );
}
