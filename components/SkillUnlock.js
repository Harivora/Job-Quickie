"use client";
import { useMemo, useState } from "react";

// Skill Unlocks — unique to JobQuickie.
// Answers a question no other job board answers: "which ONE skill should I
// add next to unlock the most extra job matches?" Computed live against
// every open listing, personalised to the user's current skill set.

export const CATALOG = [
  "JavaScript", "TypeScript", "React", "Next.js", "Vue", "Angular", "Node.js",
  "Python", "Java", "Go", "Rust", "C++", "C#", ".NET", "PHP", "Ruby", "Swift",
  "Kotlin", "SQL", "PostgreSQL", "MongoDB", "GraphQL", "AWS", "Azure", "GCP",
  "Docker", "Kubernetes", "Terraform", "Linux", "DevOps", "CI/CD", "Git",
  "Machine Learning", "Data Analysis", "Data Engineering", "Pandas", "TensorFlow",
  "PyTorch", "LLM", "NLP", "Figma", "UI/UX", "Product Management", "Agile",
  "Scrum", "SEO", "Content Marketing", "Copywriting", "Salesforce", "HubSpot",
  "Excel", "Tableau", "Power BI", "Customer Success", "Recruiting", "Accounting",
  "Cybersecurity", "Penetration Testing", "Nursing", "Teaching", "Translation",
];

export default function SkillUnlock({ jobs, mySkills, onAddSkill, adding }) {
  const [expanded, setExpanded] = useState(true);

  const mine = useMemo(() => new Set(mySkills.map((s) => s.toLowerCase())), [mySkills]);

  const { baseCount, unlocks, inDemand } = useMemo(() => {
    if (!jobs.length) return { baseCount: 0, unlocks: [], inDemand: [] };
    const matchesMine = (j) => mySkills.some((s) => j.hay.includes(s.toLowerCase()));
    const matched = mySkills.length ? jobs.filter(matchesMine) : [];
    const matchedKeys = new Set(matched.map((j) => j.hay));
    const candidates = CATALOG.filter((s) => !mine.has(s.toLowerCase()));

    // how many jobs each candidate skill would ADD on top of current matches
    const unlocks = candidates
      .map((s) => {
        const sl = s.toLowerCase();
        let add = 0;
        for (const j of jobs) {
          if (j.hay.includes(sl) && (!mySkills.length || !matchedKeys.has(j.hay))) add++;
        }
        return { skill: s, add };
      })
      .filter((x) => x.add > 0)
      .sort((a, b) => b.add - a.add)
      .slice(0, 8);

    // among jobs you already match: which other skills appear most (pairs well)
    const inDemand = mySkills.length
      ? candidates
          .map((s) => {
            const sl = s.toLowerCase();
            return { skill: s, n: matched.filter((j) => j.hay.includes(sl)).length };
          })
          .filter((x) => x.n > 0)
          .sort((a, b) => b.n - a.n)
          .slice(0, 6)
      : [];

    return { baseCount: matched.length, unlocks, inDemand };
  }, [jobs, mySkills, mine]);

  if (!jobs.length) return null;

  return (
    <div className="globepanel">
      <div className="globepanel-head">
        <div>
          <div className="globepanel-title">🔓 Skill Unlocks <span className="unique-badge">only on JobQuickie</span></div>
          <div className="globepanel-sub">
            {mySkills.length
              ? `Your ${mySkills.length} skill${mySkills.length === 1 ? "" : "s"} match ${baseCount.toLocaleString()} live jobs — here's what adding one more would unlock`
              : "See which skills open the most doors right now — add one to start your personal match feed"}
          </div>
        </div>
        <button className="btn" onClick={() => setExpanded(!expanded)}>{expanded ? "Hide" : "Show"}</button>
      </div>
      {expanded && (
        <div className="unlock-body">
          <div className="unlock-grid">
            {unlocks.map((u, i) => (
              <div className="unlock-card" key={u.skill}>
                <div className="unlock-rank">#{i + 1}</div>
                <div className="unlock-skill">{u.skill}</div>
                <div className="unlock-gain">+{u.add.toLocaleString()} job{u.add === 1 ? "" : "s"}</div>
                <div className="unlock-bar">
                  <span style={{ width: `${(u.add / (unlocks[0]?.add || 1)) * 100}%` }} />
                </div>
                <button
                  className="btn unlock-add"
                  disabled={adding === u.skill}
                  onClick={() => onAddSkill(u.skill)}
                  title="Add to your profile skills"
                >
                  {adding === u.skill ? "Adding…" : "+ Add to my skills"}
                </button>
              </div>
            ))}
            {!unlocks.length && <div className="ins-empty">You already cover the whole catalog — impressive.</div>}
          </div>
          {inDemand.length > 0 && (
            <div className="unlock-pairs">
              <span>Pairs well with your profile — often requested alongside your skills:</span>
              {inDemand.map((d) => (
                <button key={d.skill} className="chip" onClick={() => onAddSkill(d.skill)} disabled={adding === d.skill}>
                  {d.skill} · {d.n}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
