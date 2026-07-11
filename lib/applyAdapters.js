"use client";

// Application-submission adapters.
//
// Today every job board application happens on the employer's own form, so the
// only universally reliable adapter is "assisted manual": we prepare every
// field + a cover letter and the user submits on the employer page.
//
// The interface below is designed so that true programmatic submission can be
// added per-provider WITHOUT touching the Autopilot UI:
//   - implement { id, canSubmit(job), submit(job, profile) } and register it.
//   - submit() must resolve { ok, reference } or throw with a clear reason.
// Realistic future providers: LinkedIn Apply Connect / Indeed Apply Sync
// (both are partner APIs — they require an approved partnership contract),
// Greenhouse/Lever/Workable public application endpoints for jobs hosted there.

export const adapters = [
  {
    id: "manual-assist",
    label: "Assisted apply (opens the employer form with your kit ready)",
    canSubmit: () => true,
    async submit(job) {
      window.open(job.url, "_blank", "noopener");
      return { ok: true, reference: "manual" };
    },
  },
];

export function pickAdapter(job) {
  return adapters.find((a) => a.canSubmit(job)) || adapters[adapters.length - 1];
}

// Template cover letter (pluggable: swap for a Claude API call later).
export function coverLetter(job, p) {
  const skills = (p.skills || []).filter((s) => job.hay?.includes(s.toLowerCase()));
  const skillLine = skills.length
    ? `My hands-on experience with ${skills.slice(0, 4).join(", ")} maps directly onto what this role needs.`
    : `My background matches the requirements of this role closely.`;
  return `Dear ${job.company || "Hiring"} team,

I'm ${p.name || "a candidate"}${p.headline ? `, ${p.headline}` : ""}, and I'd like to apply for the ${job.title} position${job.location ? ` (${job.location.split(",")[0]})` : ""}.

${skillLine}${p.summary ? ` ${p.summary.split(". ").slice(0, 2).join(". ")}.` : ""}

I'd welcome the chance to talk about how I can contribute from day one. You can reach me at ${p.phone || ""}${p.email ? ` or ${p.email}` : ""}${p.linkedin ? `, or see my profile at ${p.linkedin}` : p.website ? `, or my work at ${p.website}` : ""}.

Best regards,
${p.name || ""}`;
}
