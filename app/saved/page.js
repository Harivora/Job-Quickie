"use client";
import Icon from "@/components/Icons";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import Loader from "@/components/Loader";
import { useJobs } from "@/lib/useJobs";

const ago = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 86400 * 30) return Math.floor(s / 86400) + "d ago";
  return d.toLocaleDateString();
};

const jkey = (j) => `${j.title}|${j.company}`.toLowerCase();

export default function SavedPage() {
  const { jobs, loading } = useJobs();
  const [saved, setSaved] = useState({});
  const [notes, setNotes] = useState({});
  const [status, setStatus] = useState({}); // key -> saved|applied|interview|closed

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("jq_saved") || "{}")); } catch {}
    try { setNotes(JSON.parse(localStorage.getItem("jq_notes") || "{}")); } catch {}
    try { setStatus(JSON.parse(localStorage.getItem("jq_status") || "{}")); } catch {}
  }, []);

  const savedJobs = useMemo(() => jobs.filter((j) => saved[jkey(j)]), [jobs, saved]);

  function unsave(j) {
    setSaved((prev) => {
      const next = { ...prev };
      delete next[jkey(j)];
      try { localStorage.setItem("jq_saved", JSON.stringify(next)); } catch {}
      return next;
    });
  }
  function setNote(j, text) {
    setNotes((prev) => {
      const next = { ...prev, [jkey(j)]: text };
      if (!text) delete next[jkey(j)];
      try { localStorage.setItem("jq_notes", JSON.stringify(next)); } catch {}
      return next;
    });
  }
  function setSt(j, st) {
    setStatus((prev) => {
      const next = { ...prev, [jkey(j)]: st };
      try { localStorage.setItem("jq_status", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function exportCsv() {
    if (!savedJobs.length) return;
    const esc = (s) => `"${String(s || "").replace(/"/g, '""')}"`;
    const csv = ["Title,Company,Location,Status,Notes,Salary,Source,Posted,Link"]
      .concat(savedJobs.map((j) => [j.title, j.company, j.location, status[jkey(j)] || "saved", notes[jkey(j)] || "", j.salary, j.source, j.date, j.url].map(esc).join(",")))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "jobquickie-saved-jobs.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const ST = ["saved", "applied", "interview", "closed"];

  return (
    <div>
      <Nav />
      <main className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 className="pagetitle">Saved jobs</h1>
            <p className="pagesub">Your shortlist — track applications and keep notes. Stored privately in your browser.</p>
          </div>
          {savedJobs.length > 0 && <button className="btn" onClick={exportCsv}><Icon name="download" size={13} /> Export CSV</button>}
        </div>
        {loading && !jobs.length ? (
          <Loader full label="Fetching your shortlist…" />
        ) : !savedJobs.length ? (
          <div className="state">
            <h3>Nothing saved yet</h3>
            Tap the ☆ on any job in the <a href="/dashboard">Jobs</a> tab and it will appear here.
          </div>
        ) : (
          <div className="savedlist">
            {savedJobs.map((j) => (
              <div className="savedcard" key={jkey(j)}>
                <div className="savedtop">
                  {j.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="avatar" src={j.logo} alt="" loading="lazy" />
                  ) : (
                    <div className="avatar ph">{(j.company || "?")[0].toUpperCase()}</div>
                  )}
                  <div className="jmain">
                    <a className="jtitle" href={j.url} target="_blank" rel="noopener noreferrer">{j.title}</a>
                    <div className="jsub">
                      <span>{j.company}</span>
                      {j.location && <><span className="sep">·</span><span>{j.location.slice(0, 40)}</span></>}
                      {j.salary && <><span className="sep">·</span><span className="jsalary">{j.salary}</span></>}
                      <span className="sep">·</span><span>{ago(j.date)}</span>
                    </div>
                  </div>
                  <div className="jright">
                    <select className="stsel" value={status[jkey(j)] || "saved"} onChange={(e) => setSt(j, e.target.value)}>
                      {ST.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <a className="btn primary" href={j.url} target="_blank" rel="noopener noreferrer">Apply ↗</a>
                    <button className="savebtn on" title="Remove from saved" onClick={() => unsave(j)}><Icon name="star" size={16} filled /></button>
                  </div>
                </div>
                <textarea
                  className="savednote"
                  placeholder="Notes — contact, referral, interview date…"
                  value={notes[jkey(j)] || ""}
                  onChange={(e) => setNote(j, e.target.value)}
                  rows={notes[jkey(j)] ? 2 : 1}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
