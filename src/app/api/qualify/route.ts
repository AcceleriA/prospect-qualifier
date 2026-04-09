import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;
import { SCORING_SYSTEM_PROMPT, MESSAGE_SYSTEM_PROMPT } from "@/lib/scoring";
import { scrapeLinkedInProfile } from "@/lib/apify";
import { isValidLinkedInUrl, isValidProfileContent } from "@/lib/validation";
import { createServiceClient } from "@/lib/supabase";
import { hashIp, checkRateLimit } from "@/lib/rate-limit";
import type {
  IcpDefinition,
  LinkedInProfile,
  QualificationResult,
} from "@/types/qualification";

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

function stripMarkdownJson(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

function parseProfileFromText(text: string): LinkedInProfile {
  const lines = text.split("\n").filter((l) => l.trim());
  const name = lines[0]?.trim() || "Inconnu";
  const title = lines[1]?.trim() || "";

  return {
    name,
    title,
    company: "",
    location: "",
    about: text.slice(0, 500),
    experience: [],
    skills: [],
    recentActivity: [],
  };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        const body = await request.json();
        const icp: IcpDefinition = body.icp;
        const linkedinUrl: string | undefined = body.linkedinUrl;
        const profileText: string | undefined = body.profileText;

        if (!icp?.persona || !icp?.industry || !icp?.location || !icp?.employeeCount) {
          send({ type: "error", message: "Tous les champs ICP sont requis." });
          controller.close();
          return;
        }

        if (!linkedinUrl && !profileText) {
          send({ type: "error", message: "URL LinkedIn ou texte de profil requis." });
          controller.close();
          return;
        }

        // Rate limiting
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
        const ipHash = hashIp(ip);
        const { allowed, remaining } = await checkRateLimit(ipHash);

        if (!allowed) {
          send({
            type: "error",
            message: `Limite atteinte (${remaining} analyses restantes). Reessaye dans 1 heure.`,
          });
          controller.close();
          return;
        }

        // Step 1: Profile extraction
        send({ type: "status", step: "scraping", message: "Analyse du profil LinkedIn..." });

        let profile: LinkedInProfile;

        if (linkedinUrl) {
          if (!isValidLinkedInUrl(linkedinUrl)) {
            send({ type: "error", message: "URL LinkedIn invalide." });
            controller.close();
            return;
          }

          try {
            profile = await scrapeLinkedInProfile(linkedinUrl);
          } catch (scrapeErr: unknown) {
            const errMsg = scrapeErr instanceof Error ? scrapeErr.message : "";
            const userMessage = errMsg.includes("APIFY_API_TOKEN")
              ? "Le scraping LinkedIn n'est pas encore configure. Utilise le mode PDF pour analyser un profil."
              : "Impossible de scraper ce profil. Essaye le mode PDF.";
            send({ type: "error", message: userMessage });
            controller.close();
            return;
          }
        } else if (profileText) {
          if (!isValidProfileContent(profileText)) {
            send({
              type: "error",
              message: "Le texte du profil semble trop court ou invalide.",
            });
            controller.close();
            return;
          }
          profile = parseProfileFromText(profileText);
        } else {
          send({ type: "error", message: "Aucun profil fourni." });
          controller.close();
          return;
        }

        // Step 2: Signal detection
        send({ type: "status", step: "signals", message: "Detection des signaux d'intention..." });

        const profileSummary = [
          `Nom: ${profile.name}`,
          `Titre: ${profile.title}`,
          `Entreprise: ${profile.company}`,
          `Localisation: ${profile.location}`,
          `A propos: ${profile.about}`,
          `Experience: ${profile.experience.map((e) => `${e.title} chez ${e.company} (${e.duration})`).join("; ")}`,
          `Competences: ${profile.skills.join(", ")}`,
          profile.recentActivity.length > 0
            ? `Activite recente: ${profile.recentActivity.map((a) => `[${a.type}] ${a.text.slice(0, 100)}`).join("; ")}`
            : "Activite recente: aucune donnee",
        ].join("\n");

        // Step 3: Scoring with Claude
        send({ type: "status", step: "scoring", message: "Calcul du score de qualification..." });

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

        const scoringResponse = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 4000,
          system: SCORING_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `ICP CIBLE:\n${JSON.stringify(icp)}\n\nPROFIL LINKEDIN:\n${profileSummary}\n\nSIGNAUX DETECTES:\nAucun signal externe disponible (mode MVP).`,
            },
          ],
        });

        const scoringText =
          scoringResponse.content[0].type === "text"
            ? scoringResponse.content[0].text
            : "";

        let scoringJson;
        try {
          scoringJson = JSON.parse(stripMarkdownJson(scoringText));
        } catch {
          // Retry once
          const retryResponse = await anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 4000,
            system:
              SCORING_SYSTEM_PROMPT +
              "\n\nATTENTION: Ta derniere reponse n'etait pas du JSON valide. Reponds UNIQUEMENT en JSON, sans backticks, sans markdown.",
            messages: [
              {
                role: "user",
                content: `ICP CIBLE:\n${JSON.stringify(icp)}\n\nPROFIL LINKEDIN:\n${profileSummary}`,
              },
            ],
          });
          const retryText =
            retryResponse.content[0].type === "text"
              ? retryResponse.content[0].text
              : "";
          scoringJson = JSON.parse(stripMarkdownJson(retryText));
        }

        // Step 4: Message generation
        send({ type: "status", step: "message", message: "Generation du message d'accroche..." });

        const messageResponse = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 1000,
          system: MESSAGE_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `ICP CIBLE:\n${JSON.stringify(icp)}\n\nPROFIL:\nNom: ${profile.name}\nTitre: ${profile.title}\nEntreprise: ${profile.company}\n\nSIGNAUX:\n${JSON.stringify(scoringJson.detectedSignals || [])}`,
            },
          ],
        });

        const messageText =
          messageResponse.content[0].type === "text"
            ? messageResponse.content[0].text
            : "";
        const messageJson = JSON.parse(stripMarkdownJson(messageText));

        // Build result
        const result: QualificationResult = {
          profileName: profile.name,
          profileTitle: profile.title,
          profileCompany: profile.company,
          icpScore: scoringJson.icpScore,
          intentScore: scoringJson.intentScore,
          priority: scoringJson.priority,
          icpDetails: scoringJson.icpDetails,
          intentDetails: scoringJson.intentDetails,
          detectedSignals: scoringJson.detectedSignals || [],
          primaryMessage: messageJson.primaryMessage,
          alternativeMessage: messageJson.alternativeMessage,
          signalUsed: messageJson.signalUsed,
        };

        // Save to Supabase (fire and forget)
        try {
          const supabase = createServiceClient();
          await supabase.from("prospect_qualifications").insert({
            icp_persona: icp.persona,
            icp_industry: icp.industry,
            icp_location: icp.location,
            icp_employee_count: icp.employeeCount,
            linkedin_url: linkedinUrl || null,
            profile_name: profile.name,
            profile_title: profile.title,
            profile_company: profile.company,
            profile_location: profile.location,
            input_method: linkedinUrl ? "url" : "pdf",
            icp_score: result.icpScore,
            intent_score: result.intentScore,
            priority: result.priority,
            icp_details: result.icpDetails,
            intent_details: result.intentDetails,
            detected_signals: result.detectedSignals,
            primary_message: result.primaryMessage,
            alternative_message: result.alternativeMessage,
            ip_hash: ipHash,
          });
        } catch {
          // Non-critical, don't fail the request
        }

        send({ type: "result", data: result });
        send({ type: "done" });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        send({ type: "error", message });
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
}
