"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

const SUGGESTED = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python",
  "Java", "Go", "SQL", "AWS", "Docker", "Kubernetes", "DevOps",
  "Data Analysis", "Machine Learning", "Product Management", "UI/UX Design",
  "Marketing", "Sales", "Customer Support", "Project Management", "QA / Testing",
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [msg, setMsg] = useState(null); // {ok, text}
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.status === 401) { router.replace("/"); return; }
        const d = await res.json();
        if (!res.ok || !d.user) {
          setMsg({ ok: false, text: d.error || "Could not load your profile. Try signing in again." });
          setUser({ email: "", name: "", skills: [], loadFailed: true });
          return;
        }
        setUser(d.user);
        setName(d.user.name || "");
        setSkills(d.user.skills || []);
        if (d.user.recordMissing) {
          setMsg({ ok: false, text: "Your account record was reset on the server (this happens when the host redeploys without persistent storage). You can browse, but sign out and register again to save profile changes." });
        }
      } catch {
        setMsg({ ok: false, text: "Network error while loading your profile." });
        setUser({ email: "", name: "", skills: [], loadFailed: true });
      }
    })();
  }, [router]);

  function addSkill(s) {
    const v = s.trim().replace(/,+$/, "");
    if (!v) return;
    if (!skills.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setSkills([...skills, v]);
    }
    setSkillInput("");
  }

  async function saveAll(e) {
    e.preventDefault();
    setMsg(null);
    if (newPw || curPw || confPw) {
      if (newPw !== confPw) { setMsg({ ok: false, text: "New passwords do not match." }); return; }
      if (!curPw) { setMsg({ ok: false, text: "Enter your current password to change it." }); return; }
    }
    setBusy(true);
    const body = { name, skills };
    if (newPw) { body.currentPassword = curPw; body.newPassword = newPw; }
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: d.error || "Update failed" }); return; }
    setUser(d.user);
    setCurPw(""); setNewPw(""); setConfPw("");
    setMsg({ ok: true, text: newPw ? "Profile and password updated." : "Profile updated." });
  }

  if (!user) return <Loader full label="Loading your profile…" />;

  const initial = ((user.name || user.email || "?").trim()[0] || "?").toUpperCase();

  return (
    <div>
      <div className="topbar">
        <div className="wrap topbar-inner">
          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/logo.svg" alt="JobQuickie" />
            Job<span style={{ color: "#2f7bff" }}>Quickie</span>
          </div>
          <div className="top-right">
            <button className="btn" onClick={() => router.push("/dashboard")}>← Dashboard</button>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ maxWidth: 760, paddingTop: 28, paddingBottom: 60 }}>
        <div className="profile-head">
          <div className="pavatar">{initial}</div>
          <div>
            <h1 className="profile-name">{user.name || "Your profile"}</h1>
            <div className="profile-sub">
              {user.email} · {user.role === "admin" ? "Administrator" : "Member"} ·{" "}
              joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        <form onSubmit={saveAll}>
          <div className="panel">
            <h2 className="panel-title">Account</h2>
            <label className="field">
              <span>Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
            </label>
            <label className="field">
              <span>Email address</span>
              <input value={user.email} disabled title="Email is your sign-in ID and can't be changed" />
            </label>
            <label className="field">
              <span>Password</span>
              <input value="••••••••••" disabled title="Stored securely as a hash — change it below" />
            </label>
          </div>

          <div className="panel">
            <h2 className="panel-title">Job skills &amp; interests</h2>
            <p className="panel-hint">These describe the roles you want. Add anything — languages, tools, job titles.</p>
            <div className="chips-edit">
              {skills.map((s) => (
                <span key={s} className="chip on">
                  {s}
                  <button type="button" aria-label={`Remove ${s}`} onClick={() => setSkills(skills.filter((x) => x !== s))}>×</button>
                </span>
              ))}
              <input
                value={skillInput}
                onChange={(e) => e.target.value.endsWith(",") ? addSkill(e.target.value) : setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
                placeholder={skills.length ? "Add another…" : "e.g. React, Data Analysis…"}
              />
            </div>
            <div className="suggested">
              {SUGGESTED.filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())).slice(0, 12).map((s) => (
                <button type="button" key={s} className="chip" onClick={() => addSkill(s)}>+ {s}</button>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2 className="panel-title">Change password</h2>
            <p className="panel-hint">Leave blank to keep your current password.</p>
            <div className="pw-grid">
              <label className="field"><span>Current password</span>
                <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} autoComplete="current-password" />
              </label>
              <label className="field"><span>New password</span>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" minLength={8} />
              </label>
              <label className="field"><span>Confirm new password</span>
                <input type="password" value={confPw} onChange={(e) => setConfPw(e.target.value)} autoComplete="new-password" />
              </label>
            </div>
          </div>

          {msg && <div className={msg.ok ? "authok" : "autherr"} style={{ marginBottom: 14 }}>{msg.text}</div>}
          <button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
        </form>
      </div>
    </div>
  );
}
