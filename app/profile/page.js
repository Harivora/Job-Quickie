"use client";
import Icon from "@/components/Icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import ThemeToggle from "@/components/ThemeToggle";
import { extractFields } from "@/lib/resume";

const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const s = document.createElement("script");
    s.src = PDFJS;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };
    s.onerror = () => reject(new Error("Could not load the PDF reader."));
    document.head.appendChild(s);
  });
}

async function extractText(file) {
  if (file.type === "text/plain" || /\.txt$/i.test(file.name)) return file.text();
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = "";
    for (let p = 1; p <= Math.min(doc.numPages, 10); p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map((i) => i.str).join(" ") + "\n";
    }
    return text;
  }
  throw new Error("Please upload a PDF or plain-text resume.");
}

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
  const [headline, setHeadline] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [msg, setMsg] = useState(null); // {ok, text}
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [needInfo, setNeedInfo] = useState(false); // mandatory completion popup
  const [popupSkill, setPopupSkill] = useState("");

  async function onResume(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParsing(true);
    setMsg(null);
    try {
      const text = await extractText(file);
      const f = extractFields(text);
      const found = f.skills.filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase()));
      const nextSkills = [...skills, ...found];
      const nextName = name.trim() || f.name || "";
      const nextPhone = phone.trim() || f.phone || "";
      const nextLocation = location.trim() || f.location || "";
      setSkills(nextSkills);
      if (!name.trim() && f.name) setName(f.name);
      if (!headline && f.headline) setHeadline(f.headline);
      if (!phone.trim() && f.phone) setPhone(f.phone);
      if (!location.trim() && f.location) setLocation(f.location);
      if (!website && f.website) setWebsite(f.website);
      if (!github && f.github) setGithub(f.github);
      if (!linkedin && f.linkedin) setLinkedin(f.linkedin);
      if (!summary && f.summary) setSummary(f.summary);
      // save what we extracted immediately
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextName || undefined, skills: nextSkills,
          headline: headline || f.headline || "", phone: nextPhone, location: nextLocation,
          website: website || f.website || "", github: github || f.github || "",
          linkedin: linkedin || f.linkedin || "", summary: summary || f.summary || "",
        }),
      });
      setMsg({ ok: true, text: `Resume imported — found ${found.length} skill${found.length === 1 ? "" : "s"}${found.length ? `: ${found.slice(0, 6).join(", ")}${found.length > 6 ? "…" : ""}` : ""}${f.phone || f.location ? " plus contact details" : ""}.` });
      // anything mandatory still missing? force the popup
      if (!nextName.trim() || !nextPhone.trim() || !nextLocation.trim() || nextSkills.length < 3) setNeedInfo(true);
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Could not read that file." });
    }
    setParsing(false);
  }

  const mandatoryOk = name.trim() && phone.trim() && location.trim() && skills.length >= 3;

  async function completeMandatory() {
    if (!mandatoryOk) return;
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, skills, phone, location }),
    });
    setNeedInfo(false);
    setMsg({ ok: true, text: "Profile completed — you're all set." });
  }

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
        setHeadline(d.user.headline || "");
        setPhone(d.user.phone || "");
        setLocation(d.user.location || "");
        setWebsite(d.user.website || "");
        setGithub(d.user.github || "");
        setLinkedin(d.user.linkedin || "");
        setSummary(d.user.summary || "");
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
    if (!phone.trim() || !location.trim()) { setMsg({ ok: false, text: "Phone and location are mandatory." }); return; }
    setBusy(true);
    const body = { name, skills, headline, phone, location, website, github, linkedin, summary };
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
            <ThemeToggle />
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

        <div className="panel resume-panel">
          <div>
            <h2 className="panel-title" style={{ marginBottom: 2 }}>Import from resume</h2>
            <p className="panel-hint" style={{ margin: 0 }}>
              Upload your resume (PDF or TXT) and we&apos;ll fill your profile automatically —
              skills are detected and your name is picked up if missing. Parsed in your browser; the file never leaves your device.
            </p>
          </div>
          <label className={"btn primary" + (parsing ? " disabled" : "")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
            {parsing ? "Reading…" : <><Icon name="upload" size={14} /> Upload resume</>}
            <input type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={onResume} disabled={parsing} style={{ display: "none" }} />
          </label>
        </div>

        <form onSubmit={saveAll}>
          <div className="panel">
            <h2 className="panel-title">Account</h2>
            <label className="field">
              <span>Full name *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
            </label>
            <label className="field">
              <span>Headline</span>
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. AI/ML Engineer · LLM Applications" />
            </label>
            <div className="pw-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <label className="field">
                <span>Phone *</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 88497 …" required />
              </label>
              <label className="field">
                <span>Location *</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Rajkot, Gujarat, India" required />
              </label>
            </div>
            <div className="pw-grid">
              <label className="field"><span>Website</span><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" /></label>
              <label className="field"><span>GitHub</span><input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/…" /></label>
              <label className="field"><span>LinkedIn</span><input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" /></label>
            </div>
            <label className="field">
              <span>Professional summary</span>
              <textarea className="savednote" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A few lines about what you do best…" />
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

      {needInfo && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="panel-title">Almost there — a couple of required details</h2>
            <p className="panel-hint">Your resume didn&apos;t cover everything. These are needed so JobQuickie can match jobs to you.</p>
            {!name.trim() && (
              <label className="field">
                <span>Full name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />
              </label>
            )}
            {!phone.trim() && (
              <label className="field">
                <span>Phone *</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
              </label>
            )}
            {!location.trim() && (
              <label className="field">
                <span>Location *</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
              </label>
            )}
            {skills.length < 3 && (
              <>
                <label className="field" style={{ marginBottom: 6 }}>
                  <span>Skills * — at least 3 ({skills.length}/3 so far)</span>
                  <input
                    value={popupSkill}
                    onChange={(e) => setPopupSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = popupSkill.trim();
                        if (v && !skills.some((x) => x.toLowerCase() === v.toLowerCase())) setSkills([...skills, v]);
                        setPopupSkill("");
                      }
                    }}
                    placeholder="Type a skill and press Enter"
                  />
                </label>
                <div className="suggested" style={{ marginBottom: 10 }}>
                  {SUGGESTED.filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())).slice(0, 8).map((s) => (
                    <button type="button" key={s} className="chip" onClick={() => setSkills([...skills, s])}>+ {s}</button>
                  ))}
                </div>
                {skills.length > 0 && (
                  <div className="chiprow" style={{ marginTop: 0, marginBottom: 12 }}>
                    {skills.map((s) => (
                      <span key={s} className="chip on" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {s}
                        <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} style={{ background: "none", border: "none", color: "rgba(255,255,255,.85)", cursor: "pointer", padding: 0 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
            <button
              className="btn primary block"
              disabled={!mandatoryOk}
              onClick={completeMandatory}
            >
              {!mandatoryOk ? "Fill the required fields to continue" : "Complete my profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
