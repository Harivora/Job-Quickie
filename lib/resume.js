"use client";
import { CATALOG } from "@/components/SkillUnlock";

// Heuristic resume-field extraction. Runs fully in the browser.
export function extractFields(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const head = lines.slice(0, 10);
  const lower = text.toLowerCase();
  const out = {};

  // name: first short all-letters line
  out.name = head.find((l) => l.length > 2 && l.length < 50 && /^[A-Za-z][A-Za-z .'-]+$/.test(l)) || "";

  // headline: a role-ish line near the top that isn't the name
  out.headline = head.find(
    (l) => l !== out.name && l.length < 90 &&
      /engineer|developer|designer|manager|analyst|scientist|consultant|architect|marketer|writer|nurse|teacher|accountant|specialist|lead|·/i.test(l) &&
      !/@|http|\d{5}/.test(l)
  ) || "";

  const phoneM = text.match(/(\+?\d[\d\s().-]{8,}\d)/);
  out.phone = phoneM ? phoneM[1].replace(/\s+/g, " ").trim() : "";

  const gh = text.match(/github\.com\/[\w.-]+/i);
  out.github = gh ? "https://" + gh[0] : "";
  const li = text.match(/linkedin\.com\/in\/[\w.-]+/i);
  out.linkedin = li ? "https://" + li[0] : "";
  const site = text.match(/\b(?!github\.com|linkedin\.com|gmail\.com|yahoo\.com|outlook\.com)([a-z0-9-]+\.(?:com|io|dev|me|in|org|net|ai))(\/[\w./-]*)?\b/i);
  out.website = site ? "https://" + site[0] : "";

  // location: a comma line near the top that isn't phone/email/url
  out.location = "";
  for (const l of head) {
    const parts = l.split("|").map((p) => p.trim());
    for (const p of parts) {
      if (p.includes(",") && p.length < 60 && /^[A-Za-z][A-Za-z ,.-]+$/.test(p) && !/engineer|developer|summary/i.test(p)) {
        out.location = p;
        break;
      }
    }
    if (out.location) break;
  }

  // summary: text under a SUMMARY/PROFILE/OBJECTIVE/ABOUT heading
  const m = text.match(/\b(SUMMARY|PROFILE|OBJECTIVE|ABOUT ME?)\b\s*\n?([\s\S]{40,900}?)(?=\n\s*[A-Z][A-Z &/]{4,}\s*\n|$)/);
  out.summary = m ? m[2].replace(/\s+/g, " ").trim().slice(0, 600) : "";

  // word-boundary matching so "Java" doesn't fire on "JavaScript",
  // "Go" needs a list context, etc.
  const esc = (s) => s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  out.skills = CATALOG.filter((s) => {
    if (s === "Go") return /\bgolang\b|\bgo\s*[,;|)]/.test(lower);
    return new RegExp(`(^|[^a-z])${esc(s)}([^a-z]|$)`).test(lower);
  });
  return out;
}
