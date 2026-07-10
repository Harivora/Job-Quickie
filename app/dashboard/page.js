"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const QUICK = [
  { label: "AI & Machine Learning", re: /\b(ai|a\.i\.|machine learning|ml engineer|artificial intelligence|deep learning|llm|nlp|computer vision|data scien)/i },
  { label: "Software Engineering", re: /\b(software|developer|engineer|frontend|backend|full.?stack|devops|programmer)\b/i },
  { label: "Healthcare & Nursing", re: /\b(nurse|nursing|bhn|rn\b|healthcare|medical|clinical|physician|doctor|health)\b/i },
  { label: "PhD & Research", re: /\b(phd|ph\.d|doctorate|doctoral|postdoc|research scientist)\b/i },
  { label: "Internships", re: /\b(intern|internship|trainee|werkstudent|working student)\b/i },
  { label: "Data & Analytics", re: /\b(data (analyst|engineer|scientist)|analytics|business intelligence|bi\b)/i },
  { label: "Design", re: /\b(design|ux|ui\b|graphic|product design)\b/i },
  { label: "Marketing & Sales", re: /\b(marketing|sales|seo|growth|account (executive|manager))\b/i },
  { label: "Finance & Legal", re: /\b(finance|financial|account(ant|ing)|legal|lawyer|tax|audit)\b/i },
];
const TABS = [
  { id: "all", label: "All positions" },
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
];
const PER = 50;

const ago = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 86400 * 30) return Math.floor(s / 86400) + "d ago";
  return d.toLocaleDateString();
};

export default function Dashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [sources, setSources] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [quick, setQuick] = useState(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("date");
  const [page, setPage] = useState(1);
  const [updated, setUpdated] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/jobs");
      if (res.status === 401) { router.push("/"); return; }
      const data = await res.json();
      setJobs(data.jobs || []);
      setSources(data.sources || {});
      setUpdated(new Date());
    } catch {
      setError("Could not load jobs. Please try again.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const base = useMemo(() => {
    let f = jobs;
    if (quick !== null) f = f.filter((j) => QUICK[quick].re.test(j.hay + " " + j.title));
    const s = q.trim().toLowerCase();
    if (s) f = f.filter((j) => j.hay.includes(s));
    return f;
  }, [jobs, quick, q]);

  const filtered = useMemo(() => {
    let f = tab === "all" ? base : base.filter((j) => j.mode === tab);
    return [...f].sort((a, b) =>
      sort === "title" ? a.title.localeCompare(b.title)
      : sort === "company" ? a.company.localeCompare(b.company)
      : new Date(b.date) - new Date(a.date)
    );
  }, [base, tab, sort]);

  const slice = filtered.slice(0, page * PER);
  const count = (m) => base.filter((j) => j.mode === m).length;

  return (
    <div>
      <div className="topbar">
        <div className="wrap topbar-inner">
          <div className="brand"><span className="brand-mark">JQ</span>Job Quickie</div>
          <div className="top-right">
            {updated && <span className="updated">Updated {updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            <button className="btn primary" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
            <button className="btn" onClick={logout}>Sign out</button>
          </div>
        </div>
      </div>

      <main className="wrap" style={{ paddingBottom: 40 }}>
        <div className="statrow">
          <div className="statcard"><div className="lbl">Open positions</div><div className="val">{base.length.toLocaleString()}</div></div>
          <div className="statcard"><div className="lbl">Remote</div><div className="val">{count("remote").toLocaleString()}</div></div>
          <div className="statcard"><div className="lbl">Hybrid</div><div className="val">{count("hybrid").toLocaleString()}</div></div>
          <div className="statcard"><div className="lbl">On-site</div><div className="val">{count("onsite").toLocaleString()}</div></div>
        </div>

        {error && <div className="banner">{error}</div>}

        <div className="filterbar">
          <div className="frow">
            <input
              type="search"
              placeholder="Search title, company, skill or location — e.g. AI engineer, nurse, PhD, Berlin"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date">Sort: Newest</option>
              <option value="title">Sort: Title A–Z</option>
              <option value="company">Sort: Company A–Z</option>
            </select>
          </div>
          <div className="chiprow">
            {QUICK.map((c, i) => (
              <span
                key={c.label}
                className={"chip" + (quick === i ? " on" : "")}
                onClick={() => { setQuick(quick === i ? null : i); setPage(1); }}
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>

        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={"tab" + (tab === t.id ? " active" : "")}
              onClick={() => { setTab(t.id); setPage(1); }}
            >
              {t.label}
              <span className="n">{t.id === "all" ? base.length : count(t.id)}</span>
            </button>
          ))}
        </div>

        <div className="listmeta">
          <span>{filtered.length ? `Showing ${slice.length} of ${filtered.length} positions` : ""}</span>
          <span className="srcbadges">
            {Object.entries(sources).map(([n, v]) => (
              <span key={n}>
                <span className={"dot " + (v === -1 ? "err" : "ok")} />
                {n} · {v === -1 ? "offline" : `${v} jobs`}
              </span>
            ))}
          </span>
        </div>

        {loading && !jobs.length ? (
          <div className="state"><div className="spinner" />Loading live listings…</div>
        ) : !filtered.length ? (
          <div className="state"><h3>No matching positions</h3>Try a broader search term or clear the category filter.</div>
        ) : (
          <>
            <div className="joblist">
              {slice.map((j, i) => (
                <div className="job" key={i}>
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
                      {j.location && <><span className="sep">·</span><span>{j.location.slice(0, 42)}</span></>}
                      {j.type && <><span className="sep">·</span><span>{j.type.slice(0, 30)}</span></>}
                      {j.salary && <><span className="sep">·</span><span>{j.salary.slice(0, 30)}</span></>}
                    </div>
                  </div>
                  <div className="jright">
                    <span className={"pill " + j.mode}>{j.mode === "onsite" ? "On-site" : j.mode[0].toUpperCase() + j.mode.slice(1)}</span>
                    <span className="jdate">{ago(j.date)}</span>
                  </div>
                </div>
              ))}
            </div>
            {slice.length < filtered.length && (
              <button className="btn loadmore" onClick={() => setPage(page + 1)}>Show more</button>
            )}
          </>
        )}
        <div className="footer">Data refreshes automatically every 15 minutes from Remotive, Jobicy, Arbeitnow and The Muse.</div>
      </main>
    </div>
  );
}
