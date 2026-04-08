"use client";

import { useState, useCallback } from "react";
import { isValidLinkedInUrl } from "@/lib/validation";

interface StepLinkedinInputProps {
  onSubmitUrl: (url: string) => void;
  onSubmitText: (text: string) => void;
  onBack: () => void;
}

export default function StepLinkedinInput({
  onSubmitUrl,
  onSubmitText,
  onBack,
}: StepLinkedinInputProps) {
  const [mode, setMode] = useState<"url" | "pdf">("url");
  const [url, setUrl] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  const urlValid = url && isValidLinkedInUrl(url);

  const handleUrlSubmit = useCallback(() => {
    if (!urlValid) {
      setError("URL LinkedIn invalide. Format attendu : linkedin.com/in/prenom-nom");
      return;
    }
    onSubmitUrl(url);
  }, [url, urlValid, onSubmitUrl]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("Seuls les fichiers PDF sont acceptes.");
        return;
      }

      setExtracting(true);
      setError("");

      try {
        const pdfjs = await import("pdfjs-dist");

        // Use the worker from the npm package via CDN with a known-good version
        // pdfjs-dist 5.6.x is not yet on cdnjs, so we use unpkg which mirrors npm exactly
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({
          data: new Uint8Array(arrayBuffer),
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
        }).promise;

        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => item.str || "")
            .join(" ") + "\n";
        }

        if (text.trim().length < 100) {
          setError("Le PDF ne contient pas assez de texte exploitable.");
          return;
        }

        setPdfText(text);
        onSubmitText(text);
      } catch (err) {
        console.error("PDF extraction error:", err);
        setError("Erreur lors de l'extraction du PDF. Verifie que le fichier est un vrai PDF.");
      } finally {
        setExtracting(false);
      }
    },
    [onSubmitText]
  );

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="font-display mb-2 text-2xl font-bold text-text-primary">
          Profil LinkedIn a analyser
        </h2>
        <p className="text-sm text-text-secondary">
          Colle l&apos;URL du profil ou importe un export PDF.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-white/10 bg-bg-surface p-1">
        <button
          onClick={() => { setMode("url"); setError(""); }}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === "url"
              ? "bg-violet/20 text-violet-light"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          URL LinkedIn
        </button>
        <button
          onClick={() => { setMode("pdf"); setError(""); }}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === "pdf"
              ? "bg-violet/20 text-violet-light"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Import PDF
        </button>
      </div>

      {mode === "url" ? (
        <div className="space-y-4">
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(""); }}
              placeholder="https://linkedin.com/in/prenom-nom"
              className={`w-full rounded-lg border bg-bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:ring-1 ${
                url && !urlValid
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-white/15 focus:border-violet focus:ring-violet"
              }`}
            />
            {url && !urlValid && (
              <p className="mt-1 text-sm text-red-400">
                Format attendu : linkedin.com/in/prenom-nom
              </p>
            )}
          </div>

          <button
            onClick={handleUrlSubmit}
            disabled={!urlValid}
            className="w-full rounded-lg bg-violet px-6 py-3.5 font-medium text-white transition-all hover:bg-violet-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Analyser ce profil
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <label
            htmlFor="pdf-upload"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-bg-surface p-8 transition-colors hover:border-white/20"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="mb-3 text-text-secondary"
              aria-hidden
            >
              <path
                d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-medium text-text-primary">
              {extracting ? "Extraction en cours..." : "Glisse ton PDF ici ou clique"}
            </span>
            <span className="mt-1 text-xs text-text-secondary">
              Export PDF depuis LinkedIn
            </span>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </label>

          {pdfText && (
            <p className="text-sm text-green-400">
              PDF extrait avec succes ({pdfText.length} caracteres)
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={onBack}
        className="w-full text-center text-sm text-text-secondary hover:text-text-primary"
      >
        Retour
      </button>
    </div>
  );
}
