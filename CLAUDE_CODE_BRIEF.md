# Brief Claude Code - Prospect Qualifier

Tu travailles dans `/Users/hadriencolomer/Documents/Claude/Code/PLG Tools Code/prospect-qualifier/`.
Lis d'abord ce brief en entier avant de coder quoi que ce soit.

---

## Contexte

Tu dois creer un nouvel outil PLG (Product-Led Growth) pour AcceleriA : le "Prospect Qualifier".
C'est un outil web public qui permet a un utilisateur de definir son ICP (Ideal Customer Profile), de fournir un profil LinkedIn (URL ou PDF), et d'obtenir un score de qualification ICP /100, un score d'intention IA /100, un niveau de priorite (Hot/Warm/Cold), les signaux detectes, et un message d'accroche personnalise.

Cet outil s'integre dans la suite PLG d'acceleria.co (comme le Lead Magnet Generator et le LinkedIn Analyzer deja en production).

---

## Reference existante : Lead Magnet Generator

Le projet frere `lead-magnet-generator/` dans le meme dossier parent est ta reference pour le stack, les conventions et le style visuel. Voici ce qu'il faut reproduire :

### Stack exact
- Next.js 16 (App Router) avec TypeScript
- Tailwind CSS 4 (syntaxe `@import "tailwindcss"` + `@theme inline`)
- Anthropic SDK `@anthropic-ai/sdk` pour les appels Claude
- Supabase `@supabase/supabase-js` + `@supabase/ssr` pour la base de donnees
- Deploiement Vercel

### Conventions de code
- `src/app/` pour les pages et API routes
- `src/components/` pour les composants React
- `src/lib/` pour les utilitaires
- `src/types/` pour les types TypeScript
- Polices : Playfair Display (titres) + Inter (body) via next/font/google
- Variables CSS dans globals.css via `@theme inline`

### Design system AcceleriA (theme sombre)
```css
/* Couleurs de fond */
--color-bg-primary: #08080f;
--color-bg-elevated: #111118;
--color-bg-surface: #1a1a24;
--color-bg-hover: #222230;

/* Couleurs accent */
--color-violet: #6c40f3;
--color-violet-light: #8b6cf7;
--color-violet-dark: #5530c2;
--color-bleu: #4f9aea;
--color-bleu-light: #72b4f4;
--color-orange: #feb06a;
--color-orange-light: #ffc48a;

/* Texte */
--color-text-primary: #F0EDE6;
--color-text-secondary: #8E8EA0;
```

### next.config.ts (frame-ancestors pour embed)
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://www.acceleria.co https://acceleria.co",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## Ce que tu dois construire

### Phase 1 : Scaffolding du projet

1. Initialise un projet Next.js dans le dossier courant `prospect-qualifier/` :
   ```bash
   npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias
   ```

2. Installe les dependances :
   ```bash
   npm install @anthropic-ai/sdk @supabase/supabase-js @supabase/ssr framer-motion apify-client
   npm install -D @types/node
   ```

3. Initialise un repo git local :
   ```bash
   git init
   git add .
   git commit -m "chore: initial Next.js scaffold for prospect-qualifier"
   ```

### Phase 2 : Configuration

1. Remplace `src/app/globals.css` par le theme AcceleriA (copie depuis le LMG ci-dessus)
2. Configure `src/app/layout.tsx` avec les polices Playfair + Inter et les metadata SEO
3. Configure `next.config.ts` avec les frame-ancestors pour l'embed acceleria.co
4. Cree `.env.local` avec les variables (placeholder) :
   ```env
   ANTHROPIC_API_KEY=
   ANTHROPIC_MODEL=claude-sonnet-4-6
   APIFY_API_TOKEN=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
5. Cree `.env.example` identique (sans valeurs) pour la doc

### Phase 3 : Types TypeScript

Cree `src/types/qualification.ts` :

```typescript
// ICP defini par l'utilisateur
export interface IcpDefinition {
  persona: string;
  industry: string;
  location: string;
  employeeCount: string;
}

// Profil LinkedIn extrait (scraping ou PDF)
export interface LinkedInProfile {
  name: string;
  title: string;
  company: string;
  location: string;
  about: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  skills: string[];
  recentActivity: Array<{
    type: "post" | "comment" | "share";
    text: string;
    date: string;
    engagement: number;
  }>;
}

// Detail d'un critere de scoring
export interface ScoreDetail {
  score: number;
  max: number;
  reason: string;
}

// Details scoring ICP
export interface IcpDetails {
  persona: ScoreDetail;
  industry: ScoreDetail;
  location: ScoreDetail;
  employeeCount: ScoreDetail;
}

// Details scoring Intent
export interface IntentDetails {
  linkedinActivity: ScoreDetail & { signals?: string[] };
  googleNews: ScoreDetail & { signals?: string[] };
  recruitment: ScoreDetail & { signals?: string[] };
  roleChange: ScoreDetail;
}

// Signal detecte
export interface DetectedSignal {
  type: "linkedin_activity" | "google_news" | "recruitment" | "role_change";
  label: string;
  detail: string;
  strength: "fort" | "moyen" | "faible";
}

// Priorite
export type Priority = "hot" | "warm" | "cold";

// Resultat complet de qualification
export interface QualificationResult {
  // Profil
  profileName: string;
  profileTitle: string;
  profileCompany: string;

  // Scores
  icpScore: number;
  intentScore: number;
  priority: Priority;

  // Details
  icpDetails: IcpDetails;
  intentDetails: IntentDetails;
  detectedSignals: DetectedSignal[];

  // Messages
  primaryMessage: string;
  alternativeMessage: string;
  signalUsed: string | null;
}

// Etape du wizard
export type WizardStep = "icp" | "linkedin" | "loading" | "result";

// Event SSE
export type QualifyEvent =
  | { type: "status"; step: string; message: string }
  | { type: "result"; data: QualificationResult }
  | { type: "error"; message: string }
  | { type: "done" };
```

### Phase 4 : Librairies utilitaires

#### `src/lib/supabase.ts`
```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Client server-side avec service role
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

#### `src/lib/validation.ts`
```typescript
export function isValidLinkedInUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/.test(url.trim());
}

export function isValidProfileContent(text: string): boolean {
  if (text.length < 100) return false;
  const keywords = ["experience", "skills", "education", "linkedin", "profil"];
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}
```

#### `src/lib/apify.ts`
Client Apify pour le scraping LinkedIn. Utilise le package `apify-client`.
```typescript
import { ApifyClient } from "apify-client";

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

export async function scrapeLinkedInProfile(linkedinUrl: string) {
  const run = await client.actor("apify/linkedin-profile-scraper").call({
    startUrls: [{ url: linkedinUrl }],
    proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  if (!items.length) throw new Error("Aucun profil trouve");

  const profile = items[0];
  return {
    name: profile.fullName || profile.firstName + " " + profile.lastName || "Inconnu",
    title: profile.title || profile.headline || "",
    company: profile.company || "",
    location: profile.location || profile.geo?.full || "",
    about: profile.summary || profile.about || "",
    experience: (profile.experience || []).map((exp: any) => ({
      title: exp.title || "",
      company: exp.companyName || exp.company || "",
      duration: exp.duration || exp.timePeriod || "",
      description: exp.description || "",
    })),
    skills: (profile.skills || []).map((s: any) => (typeof s === "string" ? s : s.name || "")),
    recentActivity: [], // Apify basic ne scrape pas l'activite
  };
}
```

#### `src/lib/scoring.ts`
Contient le prompt systeme pour le scoring Claude :
```typescript
export const SCORING_SYSTEM_PROMPT = `Tu es un expert en qualification de prospects B2B.
Tu recois un profil LinkedIn et un ICP cible.
Tu dois produire un scoring precis et justifie.

SCORING ICP (/100) :
- Persona match (46 pts) : le titre/role correspond-il au persona cible ?
  - Match exact = 46 pts
  - Match proche (meme famille de metier) = 23 pts
  - Pas de match = 0 pts
- Industry match (19 pts) : le secteur correspond-il ?
  - Match exact = 19 pts
  - Secteur adjacent = 10 pts
  - Pas de match = 0 pts
- Localisation (19 pts) : la zone geographique correspond-elle ?
  - Match exact = 19 pts
  - Meme pays mais autre region = 12 pts
  - Pas de match = 0 pts
- Employee count (16 pts) : la taille d'entreprise correspond-elle ?
  - Dans la fourchette = 16 pts
  - Proche (+/- 1 tranche) = 8 pts
  - Pas de match = 0 pts

SCORING INTENT (/100) :
- Activite LinkedIn (40 pts) : publications et commentaires recents lies au domaine
  - Tres actif et pertinent = 40 pts
  - Actif mais hors sujet = 15 pts
  - Inactif = 0 pts
- Google News entreprise (25 pts) : signaux business detectes
  - Signal fort (levee de fonds, croissance, expansion) = 25 pts
  - Signal moyen (recrutement, partenariat) = 15 pts
  - Rien = 0 pts
- Signaux recrutement (20 pts) : postes ouverts lies au domaine
  - Postes directement lies = 20 pts
  - Postes indirectement lies = 10 pts
  - Rien = 0 pts
- Changement de poste (15 pts) : nouveau role < 6 mois
  - Oui = 15 pts
  - Non = 0 pts

PRIORITY :
- Hot : ICP >= 70 ET Intent >= 60
- Warm : ICP >= 50 ET Intent >= 40
- Cold : tout le reste

IMPORTANT :
- Sois precis dans tes justifications (cite les elements du profil)
- Si tu n'as pas assez d'infos pour un critere, mets 0 et explique pourquoi
- Pour l'intent, si aucune donnee d'activite n'est fournie, mets 0 aux criteres concernes

Reponds UNIQUEMENT en JSON valide, sans markdown, sans commentaire.
Le JSON doit suivre exactement cette structure :
{
  "icpScore": number,
  "intentScore": number,
  "priority": "hot" | "warm" | "cold",
  "icpDetails": {
    "persona": { "score": number, "max": 46, "reason": string },
    "industry": { "score": number, "max": 19, "reason": string },
    "location": { "score": number, "max": 19, "reason": string },
    "employeeCount": { "score": number, "max": 16, "reason": string }
  },
  "intentDetails": {
    "linkedinActivity": { "score": number, "max": 40, "reason": string, "signals": string[] },
    "googleNews": { "score": number, "max": 25, "reason": string, "signals": string[] },
    "recruitment": { "score": number, "max": 20, "reason": string, "signals": string[] },
    "roleChange": { "score": number, "max": 15, "reason": string }
  },
  "detectedSignals": [
    {
      "type": "linkedin_activity" | "google_news" | "recruitment" | "role_change",
      "label": string,
      "detail": string,
      "strength": "fort" | "moyen" | "faible"
    }
  ]
}`;

export const MESSAGE_SYSTEM_PROMPT = `Tu es un expert en prospection LinkedIn B2B.
Tu recois un profil LinkedIn, un ICP cible, et les signaux detectes.
Tu dois generer 2 messages d'accroche personnalises pour un premier DM LinkedIn.

REGLES :
- Maximum 300 caracteres par message
- Ton professionnel mais humain, pas de spam
- Si un signal est detecte, utilise-le comme accroche (ex: "J'ai vu que...")
- Si aucun signal, base-toi sur le profil et le secteur
- Le message principal utilise le signal le plus fort
- Le message alternatif utilise un angle different
- Pas de pitch direct, juste une ouverture de conversation
- Tutoiement

Reponds UNIQUEMENT en JSON valide :
{
  "primaryMessage": string,
  "alternativeMessage": string,
  "signalUsed": string | null
}`;
```

#### `src/lib/rate-limit.ts`
```typescript
import { createServiceClient } from "./supabase";
import { createHash } from "crypto";

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function checkRateLimit(ipHash: string): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createServiceClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("prospect_qualifications")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", oneHourAgo);

  const used = count || 0;
  const limit = parseInt(process.env.RATE_LIMIT_PER_HOUR || "3");

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
  };
}
```

### Phase 5 : API Routes

#### `src/app/api/qualify/route.ts` (orchestrateur SSE)

C'est la route principale. Elle :
1. Recoit l'ICP + le profil (URL ou texte PDF)
2. Si URL : appelle Apify pour scraper le profil LinkedIn
3. Si PDF text : parse directement
4. Lance la detection de signaux en parallele (si on a des donnees entreprise)
5. Envoie le tout a Claude pour scoring ICP + Intent
6. Envoie a Claude pour generation de message
7. Sauvegarde en Supabase
8. Retourne le resultat en SSE

Pattern SSE identique au LMG :
```typescript
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    function send(event: object) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    }

    try {
      // Step 1: Scraping ou parsing
      send({ type: "status", step: "scraping", message: "Analyse du profil LinkedIn..." });
      // ... logique scraping/parsing

      // Step 2: Signaux
      send({ type: "status", step: "signals", message: "Detection des signaux d'intention..." });
      // ... logique signaux

      // Step 3: Scoring
      send({ type: "status", step: "scoring", message: "Calcul du score de qualification..." });
      // ... appel Claude scoring

      // Step 4: Message
      send({ type: "status", step: "message", message: "Generation du message d'accroche..." });
      // ... appel Claude message

      // Step 5: Save + result
      send({ type: "result", data: qualificationResult });
      send({ type: "done" });
    } catch (err) {
      send({ type: "error", message: err instanceof Error ? err.message : "Erreur inconnue" });
    }

    controller.close();
  },
});

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});
```

Les appels Claude utilisent le SDK Anthropic (pas de streaming pour le scoring, on veut le JSON complet) :
```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// Scoring
const scoringResponse = await anthropic.messages.create({
  model,
  max_tokens: 4000,
  system: SCORING_SYSTEM_PROMPT,
  messages: [{ role: "user", content: `ICP CIBLE:\n${JSON.stringify(icp)}\n\nPROFIL LINKEDIN:\n${profileSummary}\n\nSIGNAUX DETECTES:\n${JSON.stringify(signals)}` }],
});
const scoringJson = JSON.parse(scoringResponse.content[0].text);

// Message
const messageResponse = await anthropic.messages.create({
  model,
  max_tokens: 1000,
  system: MESSAGE_SYSTEM_PROMPT,
  messages: [{ role: "user", content: `ICP CIBLE:\n${JSON.stringify(icp)}\n\nPROFIL:\nNom: ${profile.name}\nTitre: ${profile.title}\nEntreprise: ${profile.company}\n\nSIGNAUX:\n${JSON.stringify(scoringJson.detectedSignals)}` }],
});
const messageJson = JSON.parse(messageResponse.content[0].text);
```

### Phase 6 : Composants UI

La page principale `src/app/page.tsx` est un wizard 4 steps (meme pattern que le LMG).

#### Composants a creer :

1. **`src/components/ProspectQualifier.tsx`** - Composant principal wizard
   - State : `step: WizardStep`, `icp: IcpDefinition`, `result: QualificationResult | null`
   - Gere la navigation entre steps
   - Appelle `/api/qualify` en SSE quand on lance l'analyse

2. **`src/components/StepIcpForm.tsx`** - Step 1 : Formulaire ICP
   - 4 champs : persona (input text), industry (combobox), location (combobox), employee count (select)
   - Suggestions predefinies pour chaque champ
   - Validation : tous les champs requis
   - Bouton "Suivant" qui passe au step 2
   - Style : cards sur fond `bg-elevated`, inputs avec bordures subtiles, accent violet au focus

3. **`src/components/StepLinkedinInput.tsx`** - Step 2 : Input LinkedIn
   - Zone principale : input URL LinkedIn avec validation regex en temps reel
   - Zone secondaire : toggle "Ou importe un PDF" avec dropzone
   - Extraction PDF cote client avec pdf.js (dynamique import)
   - Bouton "Analyser ce profil" qui lance l'analyse
   - Style : meme charte que step 1

4. **`src/components/StepLoading.tsx`** - Step 3 : Chargement
   - Liste de 4 etapes avec animation progressive
   - Chaque etape : icone spinner → icone check vert quand terminee
   - Animation Framer Motion pour les transitions
   - Recevoir les events SSE en props pour mettre a jour les etapes
   - Style : centre, fond sombre, texte secondaire qui s'illumine

5. **`src/components/ResultDashboard.tsx`** - Step 4 : Resultats
   - Zone haute : 2 ScoreGauges (ICP + Intent) + PriorityBadge
   - Zone milieu : 2 onglets (ICP Details + Signals)
   - Zone basse : MessageBlock avec copie
   - Bouton CTA : "Qualifie tous tes prospects" → acceleria.co
   - Bouton "Nouvelle analyse" pour recommencer

6. **`src/components/ScoreGauge.tsx`** - Jauge circulaire animee
   - SVG circle avec stroke-dasharray anime
   - Couleur selon le score : vert (70+), orange (40-69), rouge (0-39)
   - Chiffre au centre avec animation de comptage (0 → score)
   - Framer Motion pour l'animation

7. **`src/components/PriorityBadge.tsx`** - Badge priorite
   - "HOT" : fond rouge/orange gradient, pulse animation
   - "WARM" : fond orange
   - "COLD" : fond bleu-gris
   - Taille large, bien visible

8. **`src/components/SignalCard.tsx`** - Carte signal
   - Icone selon le type (activite, news, recrutement, poste)
   - Badge force (fort/moyen/faible) avec couleur
   - Label + detail
   - Style : card bg-surface avec bordure gauche coloree

9. **`src/components/MessageBlock.tsx`** - Bloc message
   - Texte du message dans un cadre stylise
   - Bouton "Copier" (meme pattern que CopyButton du LMG)
   - Toggle pour voir le message alternatif
   - Indication du signal utilise

10. **`src/components/EmailGate.tsx`** - Modal capture email
    - S'affiche apres la 1ere analyse gratuite
    - Input email + bouton "Continuer"
    - Texte : "Entre ton email pour continuer a qualifier tes prospects"
    - Stocke l'email en state + Supabase

---

## Design : regles visuelles strictes

- Fond : toujours `#08080f` (bg-primary)
- Cards/surfaces : `#111118` (bg-elevated) avec `border border-white/5`
- Texte principal : `#F0EDE6`
- Texte secondaire : `#8E8EA0`
- Accent principal : violet `#6c40f3` (boutons, focus, liens)
- Accent chaud : orange `#feb06a` (scores, badges, CTA)
- Pas de blanc pur, pas de gris trop clair
- Border radius : `rounded-xl` pour les cards, `rounded-lg` pour les inputs
- Espacement genereux : `p-6` minimum dans les cards
- Titres en Playfair Display, body en Inter

---

## Commandes a executer dans l'ordre

```bash
# 1. Se placer dans le dossier
cd /Users/hadriencolomer/Documents/Claude/Code/PLG\ Tools\ Code/prospect-qualifier

# 2. Supprimer le PLAN_TECHNIQUE.md et ce brief du dossier final (les garder a cote)
# Non, on les garde pour reference

# 3. Init Next.js
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias

# 4. Installer les deps
npm install @anthropic-ai/sdk @supabase/supabase-js @supabase/ssr framer-motion apify-client
npm install -D @types/node

# 5. Init git
git init
git add .
git commit -m "chore: initial Next.js scaffold for prospect-qualifier"

# 6. Coder dans cet ordre :
#    a. globals.css + layout.tsx + next.config.ts
#    b. types/qualification.ts
#    c. lib/ (supabase, validation, apify, scoring, rate-limit)
#    d. API route /api/qualify/route.ts
#    e. Composants UI (ProspectQualifier → StepIcpForm → StepLinkedinInput → StepLoading → ResultDashboard → sous-composants)
#    f. page.tsx (import ProspectQualifier)

# 7. Test local
npm run dev
# Verifier que ca tourne sur http://localhost:3000

# 8. Commit final
git add .
git commit -m "feat: prospect qualifier MVP with ICP scoring, intent detection and message generation"
```

---

## Points d'attention

1. Le `create-next-app` va demander des confirmations interactives. Accepte les valeurs par defaut sauf : utilise `src/` directory = Yes, App Router = Yes.

2. Pour pdf.js cote client : utilise un import dynamique `import('pdfjs-dist')` pour eviter les erreurs SSR. Installe `pdfjs-dist` si necessaire.

3. Les appels Apify sont asynchrones et peuvent prendre 5-10 secondes. Le SSE est la pour donner du feedback en temps reel a l'utilisateur.

4. Pour le MVP, si Apify n'est pas configure (pas de token), le mode PDF doit quand meme marcher. Gere le fallback proprement.

5. La validation JSON de la reponse Claude est critique. Parse avec try/catch et valide la structure avant de l'utiliser. Si le JSON est invalide, retry une fois.

6. Le rate limiting se fait cote serveur via l'IP hashee. L'IP est recuperee depuis les headers Vercel (`x-forwarded-for`).

7. N'oublie pas le `.gitignore` : `.env.local`, `node_modules/`, `.next/`

8. Chaque composant doit etre un fichier separe avec un export default.
