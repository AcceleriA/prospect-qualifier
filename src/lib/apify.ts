import { ApifyClient } from "apify-client";

function getApifyClient() {
  if (!process.env.APIFY_API_TOKEN) {
    throw new Error("APIFY_API_TOKEN is not configured");
  }
  return new ApifyClient({ token: process.env.APIFY_API_TOKEN });
}

export async function scrapeLinkedInProfile(linkedinUrl: string) {
  const client = getApifyClient();

  const run = await client.actor("apify/linkedin-profile-scraper").call({
    startUrls: [{ url: linkedinUrl }],
    proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  if (!items.length) throw new Error("Aucun profil trouve");

  const profile = items[0] as Record<string, unknown>;
  return {
    name:
      (profile.fullName as string) ||
      `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
      "Inconnu",
    title: (profile.title as string) || (profile.headline as string) || "",
    company: (profile.company as string) || "",
    location:
      (profile.location as string) ||
      ((profile.geo as Record<string, string>)?.full as string) ||
      "",
    about: (profile.summary as string) || (profile.about as string) || "",
    experience: (
      (profile.experience as Array<Record<string, string>>) || []
    ).map((exp) => ({
      title: exp.title || "",
      company: exp.companyName || exp.company || "",
      duration: exp.duration || exp.timePeriod || "",
      description: exp.description || "",
    })),
    skills: (
      (profile.skills as Array<string | Record<string, string>>) || []
    ).map((s) => (typeof s === "string" ? s : s.name || "")),
    recentActivity: [] as Array<{
      type: "post" | "comment" | "share";
      text: string;
      date: string;
      engagement: number;
    }>,
  };
}
