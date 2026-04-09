// Apify REST API client (no SDK - avoids bundling issues with Turbopack/Vercel)
const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID = "dev_fusion~Linkedin-Profile-Scraper";

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not configured");
  return token;
}

function normalizeLinkedInUrl(url: string): string {
  let normalized = url.trim();
  normalized = normalized.replace(
    /^https?:\/\/(www\.)?linkedin\.com/,
    "https://www.linkedin.com"
  );
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

async function apifyFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const url = `${APIFY_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apify API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
  };
}

interface ApifyDatasetResponse {
  data: {
    items: Array<Record<string, unknown>>;
  };
}

export async function scrapeLinkedInProfile(linkedinUrl: string) {
  const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
  console.log("[APIFY] Scraping profile:", normalizedUrl);

  // Start the actor run synchronously (waits for completion, up to 120s)
  const runResponse = await apifyFetch<ApifyRunResponse>(
    `/acts/${ACTOR_ID}/run-sync-get-dataset-items?timeout=120`,
    {
      method: "POST",
      body: JSON.stringify({ profileUrls: [normalizedUrl] }),
    }
  );

  // run-sync-get-dataset-items returns dataset items directly
  // But the response shape depends on the endpoint variant
  // Let's handle both cases
  let items: Array<Record<string, unknown>>;

  if (Array.isArray(runResponse)) {
    // run-sync-get-dataset-items returns items array directly
    items = runResponse as unknown as Array<Record<string, unknown>>;
  } else if (runResponse?.data?.defaultDatasetId) {
    // Fallback: got a run response, fetch dataset separately
    const datasetId = runResponse.data.defaultDatasetId;
    console.log("[APIFY] Run completed, dataset:", datasetId);

    const datasetRes = await apifyFetch<ApifyDatasetResponse>(
      `/datasets/${datasetId}/items?format=json`
    );
    items = Array.isArray(datasetRes)
      ? (datasetRes as unknown as Array<Record<string, unknown>>)
      : (datasetRes?.data?.items || []);
  } else {
    throw new Error("Unexpected Apify response format");
  }

  console.log("[APIFY] Items returned:", items.length);
  if (!items.length) {
    throw new Error("Aucun profil trouve - le scraper n'a retourne aucune donnee");
  }

  const p = items[0];

  const str = (...keys: string[]): string => {
    for (const k of keys) {
      const v = p[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  return {
    name:
      str("fullName", "full_name") ||
      `${str("firstName")} ${str("lastName")}`.trim() ||
      "Inconnu",
    title: str("headline", "jobTitle", "title"),
    company: str("companyName", "company"),
    location: str("addressWithCountry", "addressCountryOnly", "location", "jobLocation"),
    about: str("about", "summary", "description"),
    experience: extractExperience(p),
    skills: extractSkills(p),
    recentActivity: [] as Array<{
      type: "post" | "comment" | "share";
      text: string;
      date: string;
      engagement: number;
    }>,
  };
}

function extractExperience(
  p: Record<string, unknown>
): Array<{
  title: string;
  company: string;
  duration: string;
  description: string;
}> {
  const raw = (p.experiences || p.experience || p.positions || []) as Array<
    Record<string, unknown>
  >;
  if (!Array.isArray(raw)) return [];

  return raw.slice(0, 10).map((exp) => ({
    title: String(exp.title || exp.position || exp.jobTitle || ""),
    company: String(exp.companyName || exp.company || ""),
    duration: String(exp.duration || exp.timePeriod || exp.dateRange || ""),
    description: String(exp.description || ""),
  }));
}

function extractSkills(p: Record<string, unknown>): string[] {
  const topSkills = p.topSkillsByEndorsements;
  if (typeof topSkills === "string" && topSkills.trim()) {
    return topSkills.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const raw = (p.skills || p.skill || []) as Array<string | Record<string, unknown>>;
  if (!Array.isArray(raw)) return [];

  return raw
    .slice(0, 20)
    .map((s) => (typeof s === "string" ? s : String(s.name || s.skill || "")))
    .filter(Boolean);
}
