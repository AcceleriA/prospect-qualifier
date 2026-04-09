"use client";

import { useState } from "react";
import type { IcpDefinition } from "@/types/qualification";

interface StepIcpFormProps {
  icp: IcpDefinition;
  onUpdate: (icp: IcpDefinition) => void;
  onNext: () => void;
}

const PERSONA_SUGGESTIONS = [
  "CEO / Fondateur",
  "Directeur Marketing",
  "Head of Sales",
  "CTO / VP Engineering",
  "Directeur Commercial",
  "Head of Growth",
  "DRH / Head of People",
  "COO / Directeur Operations",
];

const INDUSTRY_OPTIONS = [
  "SaaS B2B",
  "E-commerce",
  "Conseil / Consulting",
  "Agence Marketing",
  "Fintech",
  "Healthtech",
  "Edtech",
  "Immobilier",
  "Industrie / Manufacturing",
  "Retail",
  "Autre",
];

const LOCATION_GROUPS = [
  {
    label: "France — Régions",
    options: [
      "France entière",
      "Paris / Île-de-France",
      "Lyon / Auvergne-Rhône-Alpes",
      "Marseille / Provence-Alpes-Côte d'Azur",
      "Toulouse / Occitanie",
      "Bordeaux / Nouvelle-Aquitaine",
      "Nantes / Pays de la Loire",
      "Lille / Hauts-de-France",
      "Strasbourg / Grand Est",
      "Rennes / Bretagne",
      "Montpellier / Occitanie",
      "Nice / Provence-Alpes-Côte d'Azur",
      "Normandie",
      "Bourgogne-Franche-Comté",
      "Centre-Val de Loire",
      "Corse",
      "DOM-TOM",
    ],
  },
  {
    label: "International",
    options: [
      "Europe (hors France)",
      "Suisse",
      "Belgique",
      "Luxembourg",
      "USA",
      "Canada",
      "Autre international",
    ],
  },
];

const EMPLOYEE_OPTIONS = [
  { value: "1-10", label: "1-10 employes" },
  { value: "11-50", label: "11-50 employes" },
  { value: "51-200", label: "51-200 employes" },
  { value: "201-500", label: "201-500 employes" },
  { value: "500+", label: "500+ employes" },
];

export default function StepIcpForm({ icp, onUpdate, onNext }: StepIcpFormProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isValid = icp.persona && icp.industry && icp.location && icp.employeeCount;

  function handlePersonaChange(value: string) {
    onUpdate({ ...icp, persona: value });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="font-display mb-2 text-2xl font-bold text-text-primary">
          Definis ton ICP
        </h2>
        <p className="text-sm text-text-secondary">
          Decris ton prospect ideal pour que l&apos;IA puisse scorer avec precision.
        </p>
      </div>

      <div className="space-y-5">
        {/* Persona */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Persona cible
          </label>
          <div className="relative">
            <input
              type="text"
              value={icp.persona}
              onChange={(e) => handlePersonaChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Ex: Directeur Marketing"
              className="w-full rounded-lg border border-white/15 bg-bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:border-violet focus:ring-1 focus:ring-violet"
            />
            {showSuggestions && !icp.persona && (
              <div className="absolute top-full z-10 mt-1 w-full rounded-lg border border-white/10 bg-bg-elevated shadow-xl">
                {PERSONA_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => handlePersonaChange(s)}
                    className="block w-full px-4 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Industry */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Industrie
          </label>
          <select
            value={icp.industry}
            onChange={(e) => onUpdate({ ...icp, industry: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-bg-surface px-4 py-3 text-text-primary focus:border-violet focus:ring-1 focus:ring-violet"
          >
            <option value="">Selectionne une industrie</option>
            {INDUSTRY_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Localisation
          </label>
          <select
            value={icp.location}
            onChange={(e) => onUpdate({ ...icp, location: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-bg-surface px-4 py-3 text-text-primary focus:border-violet focus:ring-1 focus:ring-violet"
          >
            <option value="">Sélectionne une zone</option>
            {LOCATION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Employee count */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Taille d&apos;entreprise
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {EMPLOYEE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => onUpdate({ ...icp, employeeCount: o.value })}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                  icp.employeeCount === o.value
                    ? "border-violet bg-violet/15 text-violet-light"
                    : "border-white/10 bg-bg-surface text-text-secondary hover:border-white/20 hover:text-text-primary"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!isValid}
        className="mt-4 w-full rounded-lg bg-violet px-6 py-3.5 font-medium text-white transition-all hover:bg-violet-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        Suivant
      </button>
    </div>
  );
}
