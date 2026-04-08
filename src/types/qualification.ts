export interface IcpDefinition {
  persona: string;
  industry: string;
  location: string;
  employeeCount: string;
}

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

export interface ScoreDetail {
  score: number;
  max: number;
  reason: string;
}

export interface IcpDetails {
  persona: ScoreDetail;
  industry: ScoreDetail;
  location: ScoreDetail;
  employeeCount: ScoreDetail;
}

export interface IntentDetails {
  linkedinActivity: ScoreDetail & { signals?: string[] };
  googleNews: ScoreDetail & { signals?: string[] };
  recruitment: ScoreDetail & { signals?: string[] };
  roleChange: ScoreDetail;
}

export interface DetectedSignal {
  type: "linkedin_activity" | "google_news" | "recruitment" | "role_change";
  label: string;
  detail: string;
  strength: "fort" | "moyen" | "faible";
}

export type Priority = "hot" | "warm" | "cold";

export interface QualificationResult {
  profileName: string;
  profileTitle: string;
  profileCompany: string;

  icpScore: number;
  intentScore: number;
  priority: Priority;

  icpDetails: IcpDetails;
  intentDetails: IntentDetails;
  detectedSignals: DetectedSignal[];

  primaryMessage: string;
  alternativeMessage: string;
  signalUsed: string | null;
}

export type WizardStep = "icp" | "linkedin" | "loading" | "result";

export type QualifyEvent =
  | { type: "status"; step: string; message: string }
  | { type: "result"; data: QualificationResult }
  | { type: "error"; message: string }
  | { type: "done" };
