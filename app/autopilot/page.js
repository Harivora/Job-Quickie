"use client";
import Icon from "@/components/Icons";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import Loader from "@/components/Loader";
import { useJobs } from "@/lib/useJobs";
import { pickAdapter, coverLetter } from "@/lib/applyAdapters";

const jkey = (j) => `${j.title}|${j.company}`.toLowerCase();
const QUEUE_SIZE = 10;

export default function Autopilot() {
  const { jobs, loading } = useJobs();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState({});
  const [skipped, setSkipped] = useState({});
  const [cur, setCur] = useState(0);
  const [letter, setLetter] = useState("");
  const [copied, setCopied] = useState("");
  const [justApplied, setJustApplied] = useState("");

  useEffect(() => {
    fetch("/api/profile").then((r) => (r.ok ? r.json() : null)).then((d) => d?.user && setProfile(d.user)).catch(() => {});
    try { setStatus(JSON.parse(localStorage.getItem("jq_status") || "{}")); } catch {}
    try { setSkipped(JSON.parse(localStorage.getItem("jq_skipped") || "{}")); } catch {}
  }, []);

  // fully automatic queue: best skill matches first, newest first, nothing already applied/skipped
  const queue = useMemo(() => {
    if (!profile?.skills?.length || !jobs.length) return [];
    const score = (j) => {
      const m = profile.skills.filter((s) => j.hay.includes(s.toLowerCase())).length;
      const days = Math.max(0, (Date.now() - new Date(j.date)) / 864e5);
      return m * 10 - days * 0.15;
    };
    return jobs
      .filter((j) => !["applied", "interview", "closed"].includes(status[jkey(j)]) && !skipped[jkey(j)])
      .map((j) => ({ j, s: score(j), m: profile.skills.filter((s) => j.hay.includes(s.toLowerCase())) }))
      .filter((x) => x.m.length > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, QUEUE_SIZE);
  }, [jobs, profile, status, skipped]);

  const item = queue[Math.min(cur, Math.max(0, queue.length - 1))];

  useEffect(() => {
    if (item && profile) setLetter(coverLetter(item.j, { ...profile }));
  }, [item?.j && jkey(item.j), profile]); // eslint-disable-line react-hooks/exhaustive-deps

  function persist(key, obj, setter) {
    setter(obj);
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch {}
  }

  async function applyNow() {
    if (!item) return;
    const adapter = pickAdapter(item.j);
    await adapter.submit(item.j, profile);
    // auto-track: mark saved + applied
    try {
      const saved = JSON.parse(localStorage.getItem("jq_saved") || "{}");
      saved[jkey(item.j)] = true;
      localStorage.setItem("jq_saved", JSON.stringify(saved));
    } catch {}
    persist("jq_status", { ...status, [jkey(item.j)]: "applied" }, setStatus);
    setJustApplied(`Applied to ${item.j.title} at ${item.j.company} ✓ — tracked in Saved. Here's your next match.`);
    setTimeout(() => setJustApplied(""), 5000);
  }

  function skip() {
    if (!item) return;
    persist("jq_skipped", { ...skipped, [jkey(item.j)]: true }, setSkipped);
  }

  async function copy(label, text) {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 1200); } catch {}
  }

  const appliedCount = Object.values(status).filter((s) => s === "applied" || s === "interview").length;

  const fields = profile ? [
    ["Full name", profile.name],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["Location", profile.location],
    ["Headline", profile.headline],
    ["LinkedIn", profile.linkedin],
    ["GitHub", profile.github],
    ["Website", profile.website],
    ["Skills", (profile.skills || []).join(", ")],
    ["Summary", profile.summary],
  ].filter(([, v]) => v) : [];

  return (
    <div>
      <Nav />
      <main className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <h1 className="pagetitle"><Icon name="zap" size={19} filled style={{ color: "var(--accent)" }} /> Auto-Apply Autopilot</h1>
        <p className="pagesub">
          Your resume did the work: Autopilot picks the {QUEUE_SIZE} best matches for your skills, writes the cover letter,
          and preps every answer. Review, hit apply, done — each application is tracked automatically in Saved.
        </p>

        {loading && !jobs.length ? (
          <Loader full label="Scanning the market for your matches…" />
        ) : !profile ? (
          <Loader full label="Loading your profile…" />
        ) : !profile.skills?.length ? (
          <div className="state"><h3>Autopilot needs your skills</h3>Upload your resume on the <a href="/profile">profile page</a> and come back — everything else is automatic.</div>
        ) : !queue.length ? (
          <div className="state"><h3><Icon name="check" size={16} style={{ color: "var(--green)" }} /> Queue clear</h3>You&apos;ve worked through every current match. New jobs arrive all day — check back soon.</div>
        ) : (
          <>
            {justApplied && <div className="authok" style={{ marginBottom: 12 }}>{justApplied}</div>}
            <div className="ap-head">
              <div className="ap-progress">
                <b>{queue.length}</b> in queue · <b>{appliedCount}</b> applied so far
              </div>
              <div className="ap-nav">
                <button className="btn" disabled={cur <= 0} onClick={() => setCur(cur - 1)}>← Prev match</button>
                <span className="ap-count">{Math.min(cur + 1, queue.length)} / {queue.length}</span>
                <button className="btn" disabled={cur >= queue.length - 1} onClick={() => setCur(cur + 1)}>Next match →</button>
              </div>
            </div>

            <div className="ap-grid">
              <div className="panel">
                <div className="ap-jobhead">
                  {item.j.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="avatar" src={item.j.logo} alt="" />
                  ) : (
                    <div className="avatar ph">{(item.j.company || "?")[0].toUpperCase()}</div>
                  )}
                  <div>
                    <h2 className="jd-title">{item.j.title}</h2>
                    <div className="jd-company">{item.j.company}{item.j.location ? ` · ${item.j.location.slice(0, 50)}` : ""}</div>
                  </div>
                </div>
                <div className="jd-pills" style={{ marginTop: 10 }}>
                  <span className={"pill " + item.j.mode}>{item.j.mode === "onsite" ? "On-site" : item.j.mode[0].toUpperCase() + item.j.mode.slice(1)}</span>
                  {item.j.salary && <span className="pill salary">{item.j.salary}</span>}
                  <span className="pill">{item.j.source}</span>
                </div>
                <div className="jd-match" style={{ marginTop: 12 }}>
                  Picked because it matches <b>{item.m.length} of your skills</b>
                  <div className="chips">{item.m.slice(0, 8).map((s) => <span key={s} className="mchip">{s}</span>)}</div>
                </div>
                {item.j.desc && <p className="jd-desc">{item.j.desc.slice(0, 300)}…</p>}
                <div className="jd-actions" style={{ marginTop: 14 }}>
                  <button className="btn primary" onClick={applyNow}><Icon name="zap" size={14} filled /> Apply now — opens the form ↗</button>
                  <button className="btn" onClick={skip}>Skip</button>
                </div>
                {status[jkey(item.j)] === "applied" && <div className="authok" style={{ marginTop: 10 }}>Marked as applied and added to your Saved tracker ✓</div>}
              </div>

              <div>
                <div className="panel">
                  <h2 className="panel-title">Cover letter — auto-written, edit freely</h2>
                  <textarea className="savednote" rows={9} value={letter} onChange={(e) => setLetter(e.target.value)} />
                  <button className="btn" style={{ marginTop: 8 }} onClick={() => copy("letter", letter)}>
                    {copied === "letter" ? "Copied ✓" : <><Icon name="copy" size={13} /> Copy letter</>}
                  </button>
                </div>
                <div className="panel">
                  <h2 className="panel-title">Your answers — click to copy into the form</h2>
                  <div className="ap-fields">
                    {fields.map(([label, val]) => (
                      <button key={label} className="ap-field" onClick={() => copy(label, val)} title="Copy">
                        <span>{label}</span>
                        <b>{String(val).slice(0, 46)}{String(val).length > 46 ? "…" : ""}</b>
                        <em><Icon name={copied === label ? "check" : "copy"} size={13} /></em>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
