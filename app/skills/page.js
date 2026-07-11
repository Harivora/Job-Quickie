"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Loader from "@/components/Loader";
import SkillUnlock from "@/components/SkillUnlock";
import { useJobs } from "@/lib/useJobs";

export default function SkillsPage() {
  const { jobs, loading } = useJobs();
  const [mySkills, setMySkills] = useState([]);
  const [adding, setAdding] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/profile").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.user?.skills) setMySkills(d.user.skills);
    }).catch(() => {});
  }, []);

  async function saveSkills(skills) {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Could not save");
    setMySkills(d.user.skills || []);
  }

  async function addSkill(skill) {
    if (mySkills.some((s) => s.toLowerCase() === skill.toLowerCase())) return;
    setAdding(skill);
    setMsg("");
    try {
      await saveSkills([...mySkills, skill]);
      setMsg(`✓ ${skill} added.`);
      setTimeout(() => setMsg(""), 3000);
    } catch (e) { setMsg(`Couldn't add ${skill}: ${e.message}`); }
    setAdding(null);
  }

  async function removeSkill(skill) {
    try { await saveSkills(mySkills.filter((s) => s !== skill)); }
    catch (e) { setMsg(`Couldn't remove ${skill}: ${e.message}`); }
  }

  const matched = mySkills.length
    ? jobs.filter((j) => mySkills.some((s) => j.hay.includes(s.toLowerCase()))).length
    : 0;

  return (
    <div>
      <Nav />
      <main className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <h1 className="pagetitle">Your skills</h1>
        <p className="pagesub">
          {mySkills.length
            ? `${mySkills.length} skill${mySkills.length === 1 ? "" : "s"} on your profile, matching ${matched.toLocaleString()} live jobs right now.`
            : "Add skills to unlock personal matches, the For-you feed, and the unlock analyzer."}
        </p>
        <div className="panel" style={{ marginBottom: 16 }}>
          <h2 className="panel-title">On your profile</h2>
          {mySkills.length ? (
            <div className="chiprow">
              {mySkills.map((s) => (
                <span key={s} className="chip on" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {s}
                  <button
                    onClick={() => removeSkill(s)}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,.85)", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}
                    aria-label={`Remove ${s}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="ins-empty">No skills yet — add them below or on your <a href="/profile">profile</a>.</div>
          )}
        </div>
        {msg && <div className={msg.startsWith("✓") ? "authok" : "autherr"} style={{ marginBottom: 14 }}>{msg}</div>}
        {loading && !jobs.length ? (
          <Loader full label="Analyzing the market…" />
        ) : (
          <SkillUnlock jobs={jobs} mySkills={mySkills} onAddSkill={addSkill} adding={adding} />
        )}
      </main>
    </div>
  );
}
