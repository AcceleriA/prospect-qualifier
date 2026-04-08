"use client";

import { useState, useCallback } from "react";
import type {
  IcpDefinition,
  WizardStep,
  QualificationResult,
  QualifyEvent,
} from "@/types/qualification";
import StepIcpForm from "./StepIcpForm";
import StepLinkedinInput from "./StepLinkedinInput";
import StepLoading from "./StepLoading";
import ResultDashboard from "./ResultDashboard";

const INITIAL_ICP: IcpDefinition = {
  persona: "",
  industry: "",
  location: "",
  employeeCount: "",
};

export default function ProspectQualifier() {
  const [step, setStep] = useState<WizardStep>("icp");
  const [icp, setIcp] = useState<IcpDefinition>(INITIAL_ICP);
  const [result, setResult] = useState<QualificationResult | null>(null);
  const [loadingStep, setLoadingStep] = useState("scraping");
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = useCallback(
    async (body: { icp: IcpDefinition; linkedinUrl?: string; profileText?: string }) => {
      setStep("loading");
      setLoadingStep("scraping");
      setError(null);

      try {
        const response = await fetch("/api/qualify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok || !response.body) {
          setError("Erreur serveur. Reessaye.");
          setStep("linkedin");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6);

            try {
              const event: QualifyEvent = JSON.parse(json);

              if (event.type === "status") {
                setLoadingStep(event.step);
              } else if (event.type === "result") {
                setResult(event.data);
                setStep("result");
              } else if (event.type === "error") {
                setError(event.message);
                setStep("linkedin");
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch {
        setError("Erreur de connexion. Verifie ta connexion internet.");
        setStep("linkedin");
      }
    },
    []
  );

  const handleReset = useCallback(() => {
    setIcp(INITIAL_ICP);
    setResult(null);
    setError(null);
    setStep("icp");
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Step indicator */}
      {step !== "result" && (
        <div className="mb-8 flex items-center justify-center gap-2">
          {(["icp", "linkedin", "loading"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  step === s
                    ? "bg-violet text-white"
                    : (["icp", "linkedin", "loading"] as const).indexOf(step) > i
                      ? "bg-violet/20 text-violet-light"
                      : "bg-white/5 text-text-secondary"
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div className="h-px w-8 bg-white/10 sm:w-16" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && step !== "loading" && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Steps */}
      {step === "icp" && (
        <StepIcpForm
          icp={icp}
          onUpdate={setIcp}
          onNext={() => {
            setStep("linkedin");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {step === "linkedin" && (
        <StepLinkedinInput
          onSubmitUrl={(url) => startAnalysis({ icp, linkedinUrl: url })}
          onSubmitText={(text) => startAnalysis({ icp, profileText: text })}
          onBack={() => {
            setStep("icp");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {step === "loading" && <StepLoading currentStep={loadingStep} />}

      {step === "result" && result && (
        <ResultDashboard result={result} onReset={handleReset} />
      )}
    </div>
  );
}
