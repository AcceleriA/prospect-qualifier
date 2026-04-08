import { ApifyClient } from "apify-client";

function getApifyClient() {
  if (!process.env.APIFY_API_TOKEN) {
    throw new Error("APIFY_API_TOKEN is not configured");
  }
  return new ApifyClient({ token: process.env.APIFY_API_TOKEN });
}

export async function scrapeLinkedInProfile(linkedinUrl: string) {
  const client = getApifyClient();

  const run = await client
    .actor("dev_fusion/Linkedin-Profile-Scraper")
    .call({ urls: [linkedinUrl] });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  if (!items.length) throw new Error("Aucun profil trouve");

  const p = items[0] as Record<string, unknown>;

  // Robust field mapping — different scrapers use different field names
  const str = (
    ...keys: string[]
  ): string => {
    for (const k of keys) {
      const v = p[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  return {
    name:
      str("fullName", "full_name", "name") ||
      `${str("firstName", "first_name")} ${str("lastName", "last_name")}`.trim() ||
      "Inconnu",
    title: str("headline", "title", "position"),
    company: str("company", "companyName", "company_name", "currentCompany"),
    location: str("location", "addressLocality", "geo"),
    about: str("summary", "about", "description"),
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
  const raw = (p.experience || p.experiences || p.positions || []) as Array<
    Record<string, unknown>
  >;
  if (!Array.isArray(raw)) return [];

  return raw.slice(0, 10).map((exp) => ({
    title: String(exp.title || exp.position || ""),
    company: String(exp.companyName || exp.company || exp.company_name || ""),
    duration: String(exp.duration || exp.timePeriod || exp.dateRange || ""),
    description: String(exp.description || ""),
  }));
}

function extractSkills(p: Record<string, unknown>): string[] {
  const raw = (p.skills || p.skill || []) as Array<
    string | Record<string, unknown>
  >;
  if (!Array.isArray(raw)) return [];

  return raw
    .slice(0, 20)
    .map((s) => (typeof s === "string" ? s : String(s.name || s.skill || "")))
    .filter(Boolean);
}
