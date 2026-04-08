"use client";

import { motion } from "framer-motion";

interface LoadingStep {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
}

interface StepLoadingProps {
  currentStep: string;
}

const STEPS: { key: string; label: string }[] = [
  { key: "scraping", label: "Analyse du profil LinkedIn" },
  { key: "signals", label: "Detection des signaux d'intention" },
  { key: "scoring", label: "Calcul du score de qualification" },
  { key: "message", label: "Generation du message d'accroche" },
];

const ORDER = STEPS.map((s) => s.key);

export default function StepLoading({ currentStep }: StepLoadingProps) {
  const currentIndex = ORDER.indexOf(currentStep);

  const steps: LoadingStep[] = STEPS.map((s, i) => ({
    key: s.key,
    label: s.label,
    done: i < currentIndex,
    active: i === currentIndex,
  }));

  return (
    <div className="mx-auto max-w-md py-12">
      <h2 className="font-display mb-8 text-center text-2xl font-bold text-text-primary">
        Analyse en cours...
      </h2>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center gap-4"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
              {step.done ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M3 8l3 3 7-7"
                      stroke="#4ade80"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              ) : step.active ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet border-t-transparent" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-white/10" />
              )}
            </div>

            <span
              className={`text-sm transition-colors ${
                step.done
                  ? "text-green-400"
                  : step.active
                    ? "text-text-primary font-medium"
                    : "text-text-secondary/40"
              }`}
            >
              {step.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
