# LinkedIn Prospect Qualifier - Plan technique

Nom de code : prospect-qualifier
URL cible : acceleria.co/tools/prospect-qualifier
Date : 8 avril 2026

---

## 1. Vision produit

Outil PLG public qui permet a un utilisateur de definir son ICP, coller une URL LinkedIn (ou importer un PDF), et obtenir en retour un ICP Fit Score /100, un AI High Intent Score /100, un niveau de priorite (Hot/Warm/Cold), les signaux detectes, et un message d'accroche personnalise.

L'objectif est de montrer la puissance du scoring AcceleriA pour convertir les visiteurs en leads qualifies (transition vers l'offre complete).

---

## 2. Stack technique

### Frontend
- Framework : Next.js 15+ (App Router) - coherent avec le LMG
- UI : Tailwind CSS 4 + composants custom AcceleriA
- Animations : Framer Motion (loading states, score reveals)
- PDF parsing : pdf.js cote client (fallback si pas de scraping)

### Backend
- Runtime : Vercel Serverless Functions (Next.js API Routes)
- IA : Anthropic Claude Sonnet 4.6 (scoring + message generation)
- Scraping LinkedIn : Apify Actor "apify/linkedin-profile-scraper" via API REST
- Enrichissement entreprise : Apify Actor "apify/google-search-scraper" (news) + scraping Indeed/WTTJ (signaux recrutement)

### Base de donnees
- Supabase (meme projet que les autres PLG tools)
- Table principale : prospect_qualifications
- Table config : icp_templates (optionnel, pour pre-remplir des ICP types)

### Deploiement
- Vercel (sous-domaine ou meme projet que le LMG)
- Embed dans acceleria.co/tools/prospect-qualifier via iframe

---

## 3. Architecture des API Routes

```
src/app/api/
  qualify/
    route.ts          # Route principale - orchestrateur
  scrape/
    linkedin/
      route.ts        # Scraping profil LinkedIn via Apify
    signals/
      route.ts        # Detection signaux (Google News + recrutement)
  score/
    route.ts          # Scoring ICP + Intent via Claude
  message/
    route.ts          # Generation message d'accroche via Claude
  save/
    route.ts          # Sauvegarde resultat en base Supabase
```

### 3.1 POST /api/qualify (orchestrateur)

Point d'entree unique. Recoit l'ICP + l'input LinkedIn (URL ou PDF text).
Orchestre les etapes en parallele et renvoie le resultat complet en SSE.

```typescript
// Input
{
  icp: {
    persona: string,      // ex: "Directeur Marketing"
    industry: string,     // ex: "SaaS B2B"
    location: string,     // ex: "France"
    employeeCount: string // ex: "50-200"
  },
  linkedinUrl?: string,   // URL du profil LinkedIn
  profileText?: string    // Texte extrait du PDF (fallback)
}

// Output (SSE stream)
data: { type: "status", step: "scraping", message: "Analyse du profil LinkedIn..." }
data: { type: "status", step: "signals", message: "Detection des signaux d'intention..." }
data: { type: "status", step: "scoring", message: "Calcul du score ICP..." }
data: { type: "status", step: "message", message: "Generation du message..." }
data: { type: "result", data: QualificationResult }
data: { type: "done" }
```

### 3.2 POST /api/scrape/linkedin

Appelle l'Apify Actor pour extraire les donnees du profil LinkedIn.

```typescript
// Apify LinkedIn Profile Scraper
const run = await apifyClient.actor("apify/linkedin-profile-scraper").call({
  startUrls: [{ url: linkedinUrl }],
  proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] }
});

// Donnees extraites
{
  name: string,
  title: string,
  company: string,
  location: string,
  about: string,
  experience: Array<{
    title: string,
    company: string,
    duration: string,
    description: string
  }>,
  skills: string[],
  recentActivity: Array<{
    type: "post" | "comment" | "share",
    text: string,
    date: string,
    engagement: number
  }>
}
```

### 3.3 POST /api/scrape/signals

Lance en parallele 3 sources de signaux :

```typescript
// 1. Google News sur l'entreprise
const newsResults = await searchGoogleNews(companyName);
// Detecte : levee de fonds, croissance, restructuration, expansion

// 2. Signaux recrutement (Indeed + WTTJ)
const recruitmentSignals = await scrapeRecruitment(companyName, domain);
// Detecte : postes ouverts lies au domaine de l'ICP

// 3. Changement de poste (depuis le profil LinkedIn deja scrape)
const roleChange = detectRecentRoleChange(profileData.experience);
// Detecte : nouveau poste < 6 mois
```

### 3.4 POST /api/score

Envoie le profil + les signaux + l'ICP a Claude pour scoring.

```typescript
// Prompt systeme
const systemPrompt = `Tu es un expert en qualification de prospects B2B.
Tu recois un profil LinkedIn et un ICP cible.

SCORING ICP (/100) :
- Persona match (46 pts) : le titre/role correspond-il au persona cible ?
  - Match exact = 46 pts
  - Match proche (meme famille) = 23 pts
  - Pas de match = 0 pts
- Industry match (19 pts) : le secteur correspond-il ?
  - Match exact = 19 pts
  - Secteur adjacent = 10 pts
  - Pas de match = 0 pts
- Localisation (19 pts) : la zone geographique correspond-elle ?
  - Match exact = 19 pts
  - Meme pays = 12 pts
  - Pas de match = 0 pts
- Employee count (16 pts) : la taille d'entreprise correspond-elle ?
  - Dans la fourchette = 16 pts
  - Proche (+/- 1 tranche) = 8 pts
  - Pas de match = 0 pts

SCORING INTENT (/100) :
- Activite LinkedIn (40 pts) : publications et commentaires recents lies au domaine
  - Tres actif + pertinent = 40 pts
  - Actif mais hors sujet = 15 pts
  - Inactif = 0 pts
- Google News entreprise (25 pts) : signaux business detectes
  - Signal fort (levee, croissance) = 25 pts
  - Signal moyen (recrutement) = 15 pts
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

Reponds en JSON strict.`;

// Output attendu
{
  icpScore: number,        // /100
  intentScore: number,     // /100
  priority: "hot" | "warm" | "cold",
  icpDetails: {
    persona: { score: number, max: 46, reason: string },
    industry: { score: number, max: 19, reason: string },
    location: { score: number, max: 19, reason: string },
    employeeCount: { score: number, max: 16, reason: string }
  },
  intentDetails: {
    linkedinActivity: { score: number, max: 40, reason: string },
    googleNews: { score: number, max: 25, reason: string, signals: string[] },
    recruitment: { score: number, max: 20, reason: string, signals: string[] },
    roleChange: { score: number, max: 15, reason: string }
  },
  detectedSignals: Array<{
    type: "linkedin_activity" | "google_news" | "recruitment" | "role_change",
    label: string,
    detail: string,
    strength: "fort" | "moyen" | "faible"
  }>
}
```

### 3.5 POST /api/message

Genere un message d'accroche personnalise base sur le scoring.

```typescript
// Logique de generation
if (detectedSignals.length > 0) {
  // Message base sur le signal le plus fort
  // Ex: "J'ai vu que [entreprise] recrutait un Head of Marketing..."
} else {
  // Message base sur le profil ICP
  // Ex: "En tant que [titre] dans le [secteur], vous faites surement face a..."
}

// Output
{
  primaryMessage: string,     // Message principal (LinkedIn DM style)
  alternativeMessage: string, // Variante avec angle different
  signalUsed: string | null   // Quel signal a ete utilise
}
```

---

## 4. Schema de base de donnees (Supabase)

### Table : prospect_qualifications

```sql
CREATE TABLE prospect_qualifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- ICP defini par l'utilisateur
  icp_persona TEXT NOT NULL,
  icp_industry TEXT NOT NULL,
  icp_location TEXT NOT NULL,
  icp_employee_count TEXT NOT NULL,

  -- Profil LinkedIn analyse
  linkedin_url TEXT,
  profile_name TEXT,
  profile_title TEXT,
  profile_company TEXT,
  profile_location TEXT,
  input_method TEXT NOT NULL DEFAULT 'url', -- 'url' ou 'pdf'

  -- Scores
  icp_score INTEGER NOT NULL,         -- /100
  intent_score INTEGER NOT NULL,      -- /100
  priority TEXT NOT NULL,             -- 'hot', 'warm', 'cold'

  -- Details scoring (JSON)
  icp_details JSONB NOT NULL,
  intent_details JSONB NOT NULL,
  detected_signals JSONB DEFAULT '[]',

  -- Messages generes
  primary_message TEXT,
  alternative_message TEXT,

  -- Metadata
  user_email TEXT,                    -- email capture (optionnel, CTA)
  session_id TEXT,                    -- tracking anonymous
  ip_hash TEXT                        -- rate limiting
);

-- Index pour rate limiting
CREATE INDEX idx_pq_ip_hash_created ON prospect_qualifications(ip_hash, created_at DESC);

-- Index pour analytics
CREATE INDEX idx_pq_priority ON prospect_qualifications(priority);
CREATE INDEX idx_pq_created ON prospect_qualifications(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE prospect_qualifications ENABLE ROW LEVEL SECURITY;

-- Politique : insert uniquement (pas de read public)
CREATE POLICY "Allow anonymous insert"
  ON prospect_qualifications
  FOR INSERT
  WITH CHECK (true);

-- Politique : read uniquement par session_id (pour afficher le resultat)
CREATE POLICY "Allow read own results"
  ON prospect_qualifications
  FOR SELECT
  USING (session_id = current_setting('request.headers')::json->>'x-session-id');
```

---

## 5. Flow utilisateur (UI)

### Step 1 : Definir ton ICP
- 4 champs avec autocompletion/suggestions :
  - Persona cible (input text avec suggestions : "CEO", "Directeur Marketing", "CTO"...)
  - Industrie (select/combobox : "SaaS B2B", "E-commerce", "Conseil"...)
  - Localisation (select : "France", "Paris", "Europe"...)
  - Taille d'entreprise (select : "1-10", "11-50", "51-200", "201-500", "500+")
- Bouton "Suivant"

### Step 2 : Profil LinkedIn a analyser
- Input URL LinkedIn (champ principal, mise en avant)
  - Placeholder : "https://linkedin.com/in/prenom-nom"
  - Validation regex en temps reel
- OU section secondaire "Importer un PDF" (toggle/accordion)
  - Dropzone PDF avec instructions
  - Extraction texte cote client via pdf.js
- Bouton "Analyser ce profil"

### Step 3 : Ecran de chargement (3-8 secondes)
- Animation style "scanner" ou "radar" (reference Matrix)
- 4 etapes affichees progressivement :
  1. "Analyse du profil LinkedIn..." (check vert quand fini)
  2. "Detection des signaux d'intention..." (check vert)
  3. "Calcul du score de qualification..." (check vert)
  4. "Generation du message d'accroche..." (check vert)
- Barre de progression animee

### Step 4 : Resultat
Layout en 3 zones :

**Zone haute : Score cards**
- ICP Fit Score : gros chiffre /100 avec jauge circulaire (couleur selon tier)
- AI Intent Score : gros chiffre /100 avec jauge circulaire
- Badge priorite : "HOT LEAD" (rouge) / "WARM" (orange) / "COLD" (bleu)

**Zone milieu : Details**
- Onglet "ICP Match" : detail des 4 criteres avec barres de progression
  - Persona : 42/46 "Match quasi-exact : Directeur Marketing vs Head of Marketing"
  - Industry : 19/19 "Match exact : SaaS B2B"
  - Location : 19/19 "Match exact : Paris, France"
  - Employee count : 12/16 "Proche : 250 employes (cible 51-200)"
- Onglet "Signaux detectes" : liste des signaux avec badges
  - Signal fort : "Levee de fonds Serie B annoncee il y a 2 semaines"
  - Signal moyen : "3 postes marketing ouverts sur Welcome to the Jungle"
  - Signal faible : "Actif sur LinkedIn, 2 posts cette semaine"

**Zone basse : Message d'accroche**
- Message principal dans un cadre styled (copier en 1 clic)
- Message alternatif (toggle pour voir)
- Bouton CTA : "Qualifie tous tes prospects automatiquement" → lien vers acceleria.co

---

## 6. Integration dans acceleria.co

### 6.1 Ajout dans lib/tools.ts

```typescript
{
  slug: 'prospect-qualifier',
  name: 'Prospect Qualifier',
  headline: 'Qualifie tes prospects LinkedIn',
  description:
    'Colle une URL LinkedIn, definis ton ICP et obtiens un score de qualification /100, '
    + 'des signaux d\'intention detectes par IA et un message d\'accroche personnalise.',
  embedUrl: 'https://prospect-qualifier.vercel.app',
  color: '#ef9c55',    // Orange AcceleriA
  textColor: '#ffffff',
  icon: 'search',
  badge: 'Nouveau',
  available: true,
  previews: [
    { src: '/images/tools/pq-icp-form.png', alt: 'Formulaire ICP simple en 4 champs' },
    { src: '/images/tools/pq-scores.png', alt: 'Score ICP 87/100 et Intent 72/100' },
    { src: '/images/tools/pq-signals.png', alt: 'Signaux detectes et message personnalise' },
  ],
}
```

### 6.2 Page dediee sur acceleria.co

Route : /tools/prospect-qualifier
Embed en iframe du tool heberge sur Vercel (meme pattern que les autres outils).

---

## 7. Gestion des couts et rate limiting

### Couts par analyse
- Apify LinkedIn scrape : ~0.02$ par profil
- Apify Google News : ~0.005$ par recherche
- Scraping recrutement (Indeed/WTTJ) : ~0.005$ via Apify
- Claude Sonnet 4.6 (scoring) : ~0.01$ (2K input + 1K output tokens)
- Claude Sonnet 4.6 (message) : ~0.005$ (1K input + 0.5K output tokens)
- Total : ~0.045$ par analyse

### Rate limiting
- 3 analyses par IP par heure (sans email)
- 10 analyses par email verifie par jour
- Apres la 1ere analyse : email gate (obligatoire pour continuer)
- Stockage du ip_hash en base pour le rate limit

### Freemium gate
- Analyse 1 : gratuite, resultat complet
- Analyse 2-3 : email requis, resultat complet
- Analyse 4+ : bloque, CTA vers acceleria.co
  "Tu veux qualifier tous tes prospects en automatique ? Decouvre notre accompagnement."

---

## 8. Variables d'environnement

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

# Apify
APIFY_API_TOKEN=apify_api_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Rate limiting
RATE_LIMIT_PER_HOUR=3
RATE_LIMIT_PER_DAY_EMAIL=10
```

---

## 9. Pipeline d'execution (sequence)

```
User Input (ICP + URL/PDF)
        |
        v
[1] Validation input
        |
        +--> URL fournie ? --> [2a] Apify LinkedIn Scrape (3-5s)
        |                           |
        +--> PDF fourni ? ---> [2b] Extraction texte client (instant)
        |
        v
[3] En parallele :
    |-- Google News Search (1-2s)
    |-- Scraping recrutement Indeed/WTTJ (2-3s)
    |-- Detection changement poste (instant, depuis profil)
        |
        v
[4] Claude Scoring (ICP + Intent) - 2-3s
    Input : profil + signaux + ICP
    Output : scores + details + priority
        |
        v
[5] Claude Message Generation - 1-2s
    Input : profil + meilleur signal + ICP
    Output : message principal + alternative
        |
        v
[6] Save en Supabase + renvoyer le resultat
```

Temps total estime : 5-8 secondes (URL) ou 3-5 secondes (PDF)

---

## 10. Structure du projet

```
prospect-qualifier/
  src/
    app/
      page.tsx                    # Page principale (wizard 4 steps)
      layout.tsx                  # Layout avec metadata SEO
      globals.css                 # Styles globaux AcceleriA
      api/
        qualify/route.ts          # Orchestrateur SSE
        scrape/
          linkedin/route.ts       # Apify LinkedIn
          signals/route.ts        # Google News + recrutement
        score/route.ts            # Claude scoring
        message/route.ts          # Claude message generation
        save/route.ts             # Sauvegarde Supabase
    components/
      StepIcpForm.tsx             # Formulaire ICP (Step 1)
      StepLinkedinInput.tsx       # Input URL/PDF (Step 2)
      StepLoading.tsx             # Animation chargement (Step 3)
      ResultDashboard.tsx         # Resultat complet (Step 4)
      ScoreGauge.tsx              # Jauge circulaire animee
      PriorityBadge.tsx           # Badge Hot/Warm/Cold
      SignalCard.tsx              # Carte de signal detecte
      MessageBlock.tsx            # Bloc message avec copie
      CopyButton.tsx              # Bouton copier
      EmailGate.tsx               # Modal capture email
    lib/
      apify.ts                    # Client Apify + helpers
      supabase.ts                 # Client Supabase
      scoring.ts                  # Logique de scoring (prompts)
      signals.ts                  # Detection et parsing signaux
      validation.ts               # Validation inputs
      rate-limit.ts               # Rate limiting par IP/email
    types/
      qualification.ts            # Types TypeScript
  public/
    fonts/                        # Polices AcceleriA
  package.json
  next.config.ts
  tailwind.config.ts
  vercel.json
  .env.local
```

---

## 11. Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Apify rate limited ou bloque | Tool inutilisable en mode URL | Fallback PDF toujours dispo |
| Cout Apify explose (viral) | Perte financiere | Rate limit strict + email gate |
| LinkedIn change la structure | Scraping casse | Monitoring + fallback PDF |
| Claude hallucine les scores | Scores incoherents | Validation JSON strict + recalcul |
| Google News ne trouve rien | Intent score bas par defaut | Normal, on affiche "Aucun signal" |
| WTTJ/Indeed bloquent le scraping | Signaux recrutement manquants | Passer par Apify actors dedies |

---

## 12. MVP vs V2

### MVP (semaine 1-2)
- Step 1 : formulaire ICP (4 champs)
- Step 2 : input PDF uniquement (pas de scraping, zero cout)
- Step 3 : loading animation
- Step 4 : resultat avec ICP score + message (pas d'intent)
- Email gate apres la 1ere analyse
- Deploiement Vercel + embed acceleria.co

### V1 (semaine 3-4)
- Ajout scraping URL via Apify
- Ajout scoring Intent /100
- Detection Google News + recrutement
- Message personnalise base sur le signal
- Rate limiting complet

### V2 (mois 2+)
- Batch mode : analyser une liste de profils
- Export CSV des resultats
- Integration CRM (HubSpot, Pipedrive)
- Dashboard analytics pour AcceleriA
- A/B test sur les messages generes
