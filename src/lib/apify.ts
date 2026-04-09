import { ApifyClient } from "apify-client";

function getApifyClient() {
  if (!process.env.APIFY_API_TOKEN) {
    throw new Error("APIFY_API_TOKEN is not configured");
  }
  return new ApifyClient({ token: process.env.APIFY_API_TOKEN });
}

function normalizeLinkedInUrl(url: string): string {
  // Ensure URL has www. prefix (required by most LinkedIn scrapers)
  let normalized = url.trim();
  normalized = normalized.replace(/^https?:\/\/(www\.)?linkedin\.com/, "https://www.linkedin.com");
  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

export async function scrapeLinkedInProfile(linkedinUrl: string) {
  const client = getApifyClient();
  const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);

  console.log("[APIFY] Scraping profile:", normalizedUrl);

  const run = await client
    .actor("dev_fusion/Linkedin-Profile-Scraper")
    .call(
      { profileUrls: [normalizedUrl] },
      { timeout: 120 }  // 120 seconds max
    );

  console.log("[APIFY] Run status:", run.status, "Dataset:", run.defaultDatasetId);

  if (run.status !== "SUCCEEDED") {
    throw new Error(`Apify run failed with status: ${run.status}`);
  }

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log("[APIFY] Items returned:", items.length);
  if (!items.length) throw new Error("Aucun profil trouve - le scraper n'a retourne aucune donnee");

  const p = items[0] as Record<string, unknown>;

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
  // dev_fusion uses topSkillsByEndorsements (string) or skills (array)
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
