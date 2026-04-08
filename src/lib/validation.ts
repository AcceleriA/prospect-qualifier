export function isValidLinkedInUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/.test(url.trim());
}

export function isValidProfileContent(text: string): boolean {
  if (text.length < 100) return false;
  const keywords = ["experience", "skills", "education", "linkedin", "profil"];
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}
