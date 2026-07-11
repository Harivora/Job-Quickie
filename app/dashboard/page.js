"use client";
import Icon from "@/components/Icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { matchLocation, CITIES } from "@/lib/geo";
import JobBot from "@/components/JobBot";
import Nav from "@/components/Nav";

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
  { label: "Product Management", re: /\b(product (manager|owner|lead)|product management)\b/i },
  { label: "DevOps & Cloud", re: /\b(devops|sre\b|site reliability|cloud (engineer|architect|ops)|kubernetes|aws|azure|gcp)\b/i },
  { label: "Cybersecurity", re: /\b(security|cyber|infosec|penetration test|soc analyst|appsec)\b/i },
  { label: "Customer Support", re: /\b(customer (support|success|service|experience)|help ?desk|support (engineer|specialist|agent))\b/i },
  { label: "HR & Recruiting", re: /\b(recruit(er|ing|ment)|talent acquisition|human resources|hr (manager|generalist|business)|people ops)\b/i },
  { label: "Writing & Content", re: /\b(writer|copywrit|content (writer|manager|creator|strategist)|editor|journalis|technical writ)\b/i },
  { label: "Education & Teaching", re: /\b(teacher|teaching|tutor|instructor|professor|curriculum|education specialist)\b/i },
  { label: "Operations & Admin", re: /\b(operations (manager|analyst|coordinator)|office manager|executive assistant|virtual assistant|admin(istrative)? assistant)\b/i },
  { label: "Project Management", re: /\b(project manager|program manager|scrum master|agile coach|delivery manager)\b/i },
];
const TABS = [
  { id: "all", label: "All positions" },
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
];
const PAGE_SIZES = [20, 50, 100];
const WHEN = [
  { id: "any", label: "Any time" },
  { id: "d1", label: "Last 24 hours", ms: 864e5 },
  { id: "d7", label: "Last 7 days", ms: 7 * 864e5 },
  { id: "d30", label: "Last 30 days", ms: 30 * 864e5 },
];
const EXPS = [
  { id: "all", label: "Any experience" },
  { id: "entry", label: "Entry / Fresher", re: /\b(intern|junior|entry.?level|graduate|trainee|fresher|associate)\b/i },
  { id: "mid", label: "Mid level" },
  { id: "senior", label: "Senior / Lead", re: /\b(senior|staff|principal|lead|head of|director|vp|chief)\b/i },
];
const JTYPES = [
  { id: "all", label: "All job types" },
  { id: "full", label: "Full-time", re: /full.?time/i },
  { id: "part", label: "Part-time", re: /part.?time/i },
  { id: "contract", label: "Contract / Freelance", re: /contract|freelance|temporary/i },
  { id: "intern", label: "Internship", re: /intern(ship)?|trainee|working student/i },
];

const LANGS = [
  ["en", "English"], ["hi", "Hindi"], ["es", "Spanish"], ["fr", "French"],
  ["de", "German"], ["pt", "Portuguese"], ["it", "Italian"], ["nl", "Dutch"],
  ["ar", "Arabic"], ["zh-CN", "Chinese"], ["ja", "Japanese"], ["ko", "Korean"],
  ["ru", "Russian"], ["tr", "Turkish"], ["pl", "Polish"], ["uk", "Ukrainian"],
];

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
  const [country, setCountry] = useState(null);
  const [city, setCity] = useState(null);
  const [includeWorldwide, setIncludeWorldwide] = useState(true);
  const [per, setPer] = useState(50);
  const [src, setSrc] = useState("all");
  const [when, setWhen] = useState("any");
  const [jtype, setJtype] = useState("all");
  const [sel, setSel] = useState(null);
  const [selOpen, setSelOpen] = useState(false);
  const [saved, setSaved] = useState({});
  const [showSaved, setShowSaved] = useState(false);
  const [forYou, setForYou] = useState(false);
  const [mySkills, setMySkills] = useState([]);
  const [viewed, setViewed] = useState({});
  const [copied, setCopied] = useState(false);
  const [trans, setTrans] = useState(null);      // { title, desc } or null = original
  const [transBusy, setTransBusy] = useState(false);
  const [transErr, setTransErr] = useState("");

  async function translateSel(tl) {
    if (!sel) return;
    setTransErr("");
    if (!tl) { setTrans(null); return; }
    setTransBusy(true);
    try {
      const parts = [sel.title, sel.desc || ""].join("\n@@@\n");
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: parts, tl }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Translation failed");
      const [t, ...rest] = d.translated.split(/\n?@@@\n?/);
      setTrans({ title: t || sel.title, desc: rest.join(" ").trim() });
    } catch (e) {
      setTransErr(e.message);
      setTrans(null);
    }
    setTransBusy(false);
  }
  const [hasSal, setHasSal] = useState(false);
  const [exp, setExp] = useState("all");
  const [showTop, setShowTop] = useState(false);
  const searchRef = useRef(null);

  // "/" focuses search (like GitHub/LinkedIn); track scroll for back-to-top
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName || "")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    const onScroll = () => setShowTop(window.scrollY > 700);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll); };
  }, []);

  function exportSaved() {
    const rows = jobs.filter((j) => saved[jkey(j)]);
    if (!rows.length) return;
    const esc = (s) => `"${String(s || "").replace(/"/g, '""')}"`;
    const csv = ["Title,Company,Location,Mode,Type,Salary,Source,Posted,Link"]
      .concat(rows.map((j) => [j.title, j.company, j.location, j.mode, j.type, j.salary, j.source, j.date, j.url].map(esc).join(",")))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "jobquickie-saved-jobs.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const jkey = (j) => `${j.title}|${j.company}`.toLowerCase();

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("jq_saved") || "{}")); } catch {}
    try { setViewed(JSON.parse(localStorage.getItem("jq_viewed") || "{}")); } catch {}
    // deep-link filters: /dashboard?q=…&country=…&city=…
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("q")) setQ(sp.get("q"));
    if (sp.get("country")) setCountry(sp.get("country"));
    if (sp.get("city")) setCity(sp.get("city"));
    // profile skills power the "For you" tab + match badges
    fetch("/api/profile").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.user?.skills) setMySkills(d.user.skills);
    }).catch(() => {});
  }, []);

  const matchSkills = (j) => mySkills.filter((s) => j.hay.includes(s.toLowerCase()));

  function markViewed(j) {
    setViewed((prev) => {
      if (prev[jkey(j)]) return prev;
      const next = { ...prev, [jkey(j)]: true };
      const keys = Object.keys(next);
      if (keys.length > 500) delete next[keys[0]];
      try { localStorage.setItem("jq_viewed", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function toggleSave(j) {
    setSaved((prev) => {
      const next = { ...prev };
      const k = jkey(j);
      if (next[k]) delete next[k]; else next[k] = true;
      try { localStorage.setItem("jq_saved", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/jobs");
      if (res.status === 401) { router.push("/"); return; }
      const data = await res.json();
      const enriched = (data.jobs || []).map((j) => {
        const geo = matchLocation(j.location, j.source);
        return { ...j, _countries: geo.countries, _worldwide: geo.worldwide };
      });
      setJobs(enriched);
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

  // text/category filter (before geography)
  const textFiltered = useMemo(() => {
    let f = jobs;
    if (quick !== null) f = f.filter((j) => QUICK[quick].re.test(j.hay + " " + j.title));
    const s = q.trim().toLowerCase();
    if (s) f = f.filter((j) => j.hay.includes(s));
    return f;
  }, [jobs, quick, q]);

  // per-country counts drive the globe markers
  const countryCounts = useMemo(() => {
    const counts = {};
    for (const j of textFiltered) {
      for (const c of j._countries) counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [textFiltered]);

  // geography filter
  const base = useMemo(() => {
    if (!country) return textFiltered;
    let f = textFiltered.filter(
      (j) =>
        j._countries.includes(country) ||
        (includeWorldwide && j._worldwide && j.mode === "remote")
    );
    if (city) {
      const cl = city.toLowerCase();
      f = f.filter(
        (j) =>
          (j.location || "").toLowerCase().includes(cl) ||
          (includeWorldwide && j._worldwide && j.mode === "remote")
      );
    }
    return f;
  }, [textFiltered, country, city, includeWorldwide]);

  // cities (with coordinates) within the selected country → globe markers + chips
  const cityPoints = useMemo(() => {
    if (!country) return [];
    const cnt = {};
    for (const j of textFiltered) {
      if (!j._countries.includes(country)) continue;
      const loc = (j.location || "").toLowerCase();
      for (const [key, info] of Object.entries(CITIES)) {
        if (info.c !== country) continue;
        if (loc.includes(key)) { cnt[key] = (cnt[key] || 0) + 1; break; }
      }
    }
    return Object.entries(cnt)
      .map(([key, count]) => ({
        name: key,
        label: key.replace(/(^|\s)\S/g, (c) => c.toUpperCase()),
        lat: CITIES[key].lat,
        lng: CITIES[key].lon,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [textFiltered, country]);

  const filtered = useMemo(() => {
    let f = tab === "all" ? base : base.filter((j) => j.mode === tab);
    if (src !== "all") f = f.filter((j) => j.source === src);
    const w = WHEN.find((x) => x.id === when);
    if (w?.ms) f = f.filter((j) => Date.now() - new Date(j.date).getTime() < w.ms);
    const t = JTYPES.find((x) => x.id === jtype);
    if (t?.re) f = f.filter((j) => t.re.test(`${j.type} ${j.title} ${j.hay.slice(0, 300)}`));
    if (showSaved) f = f.filter((j) => saved[jkey(j)]);
    if (hasSal) f = f.filter((j) => j.salary);
    if (exp === "entry") f = f.filter((j) => EXPS[1].re.test(j.title + " " + j.type));
    else if (exp === "senior") f = f.filter((j) => EXPS[3].re.test(j.title + " " + j.type));
    else if (exp === "mid") f = f.filter((j) => !EXPS[1].re.test(j.title + " " + j.type) && !EXPS[3].re.test(j.title + " " + j.type));
    if (forYou && mySkills.length) {
      f = f.filter((j) => matchSkills(j).length > 0);
      return [...f].sort((a, b) =>
        matchSkills(b).length - matchSkills(a).length || new Date(b.date) - new Date(a.date)
      );
    }
    return [...f].sort((a, b) =>
      sort === "title" ? a.title.localeCompare(b.title)
      : sort === "titleZ" ? b.title.localeCompare(a.title)
      : sort === "company" ? (a.company || "").localeCompare(b.company || "")
      : sort === "source" ? a.source.localeCompare(b.source) || new Date(b.date) - new Date(a.date)
      : sort === "salary" ? (b.salary ? 1 : 0) - (a.salary ? 1 : 0) || new Date(b.date) - new Date(a.date)
      : sort === "old" ? new Date(a.date) - new Date(b.date)
      : new Date(b.date) - new Date(a.date)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, tab, sort, src, when, jtype, showSaved, saved, hasSal, forYou, mySkills, exp]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / per));
  const cur = Math.min(page, totalPages);
  const slice = filtered.slice((cur - 1) * per, cur * per);
  const count = (m) => base.filter((j) => j.mode === m).length;

  // page numbers with ellipsis
  const pageNums = useMemo(() => {
    const out = new Set([1, totalPages, cur - 1, cur, cur + 1]);
    return [...out].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  }, [cur, totalPages]);

  // chip counts stay stable (computed on the full set) so they show what you'd get
  const quickCounts = useMemo(
    () => QUICK.map((c) => jobs.filter((j) => c.re.test(j.hay + " " + j.title)).length),
    [jobs]
  );

  function botApply(p) {
    setQ(p.q || "");
    setTab(p.tab);
    setJtype(p.jtype);
    setWhen(p.when);
    setForYou(p.forYou);
    setQuick(null); setSrc("all"); setExp("all"); setHasSal(false); setShowSaved(false);
    setCountry(p.country || null); setCity(null);
    setPage(1);
  }

  const srcNames = useMemo(() => [...new Set(jobs.map((j) => j.source))].sort(), [jobs]);

  // keep the detail pane pointing at a visible job (LinkedIn-style)
  useEffect(() => {
    if (!slice.length) { setSel(null); return; }
    if (!sel || !slice.some((j) => jkey(j) === jkey(sel))) setSel(slice[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, cur, per]);

  const savedCount = useMemo(() => jobs.filter((j) => saved[jkey(j)]).length, [jobs, saved]);

  function goPage(n) {
    setPage(Math.min(Math.max(1, n), totalPages));
    document.querySelector(".listmeta")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectCountry(c) {
    setCountry(c);
    setCity(null);
    setPage(1);
  }

  return (
    <div>
      <Nav />
      <main className="wrap" style={{ paddingBottom: 40 }}>
        <div className="toolrow">
          <div>
            <h1 className="pagetitle">Live openings</h1>
            <p className="pagesub">Aggregated in real time from nine sources. Deep-dive by map on the Explore tab.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {updated && <span className="updated">Updated {updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            <button className="btn primary" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
          </div>
        </div>
        <div className="statrow">
          {[["all", "Open positions", base.length], ["remote", "Remote", count("remote")], ["hybrid", "Hybrid", count("hybrid")], ["onsite", "On-site", count("onsite")]].map(([id, lbl, n]) => (
            <div
              key={id}
              className={"statcard clickable" + (tab === id ? " active" : "")}
              onClick={() => { setTab(id); setPage(1); }}
              title={`Show ${lbl.toLowerCase()}`}
            >
              <div className="lbl">{lbl}</div><div className="val">{n.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {error && <div className="banner">{error}</div>}

        {country && (
          <div className="foryou-hint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span><Icon name="globe" size={13} /> Filtering by <b>{city ? `${city.replace(/(^|\s)\S/g, (c) => c.toUpperCase())}, ` : ""}{country}</b> — set on the Explore globe.</span>
            <button className="btn" onClick={() => { selectCountry(null); }}>Clear</button>
          </div>
        )}

        <div className="filterbar">
          <div className="frow">
            <input
              ref={searchRef}
              type="search"
              placeholder="Search title, company, skill or location — press / to focus"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date">Sort: Newest first</option>
              <option value="old">Sort: Oldest first</option>
              <option value="title">Sort: Title A–Z</option>
              <option value="titleZ">Sort: Title Z–A</option>
              <option value="company">Sort: Company A–Z</option>
              <option value="source">Sort: Source</option>
              <option value="salary">Sort: Salary listed first</option>
            </select>
          </div>
          <div className="frow" style={{ marginTop: 10 }}>
            <select value={src} onChange={(e) => { setSrc(e.target.value); setPage(1); }}>
              <option value="all">All sources</option>
              {srcNames.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={when} onChange={(e) => { setWhen(e.target.value); setPage(1); }}>
              {WHEN.map((w) => <option key={w.id} value={w.id}>Posted: {w.label}</option>)}
            </select>
            <select value={jtype} onChange={(e) => { setJtype(e.target.value); setPage(1); }}>
              {JTYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <select value={exp} onChange={(e) => { setExp(e.target.value); setPage(1); }}>
              {EXPS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
            <select value={hasSal ? "yes" : "all"} onChange={(e) => { setHasSal(e.target.value === "yes"); setPage(1); }}>
              <option value="all">Salary: all jobs</option>
              <option value="yes">Salary listed only</option>
            </select>
            <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} per page</option>)}
            </select>
            {(src !== "all" || when !== "any" || jtype !== "all" || exp !== "all" || hasSal || quick !== null || q) && (
              <button
                className="btn clearbtn"
                onClick={() => { setSrc("all"); setWhen("any"); setJtype("all"); setExp("all"); setHasSal(false); setQuick(null); setQ(""); setPage(1); }}
              >
                ✕ Clear filters
              </button>
            )}
          </div>
          <div className="fsection">Browse by role</div>
          <div className="chiprow rolechips">
            {QUICK.map((c, i) => (
              <span
                key={c.label}
                className={"chip" + (quick === i ? " on" : "")}
                onClick={() => { setQuick(quick === i ? null : i); setPage(1); }}
              >
                {c.label}
                {quickCounts[i] > 0 && <span className="chip-n">{quickCounts[i]}</span>}
              </span>
            ))}
          </div>
          {quickCounts.some((n) => n > 0) && (
            <div className="trending">
              <Icon name="flame" size={14} filled style={{ color: "#f5a623" }} /> Trending now:
              {QUICK.map((c, i) => ({ label: c.label, i, n: quickCounts[i] }))
                .sort((a, b) => b.n - a.n)
                .slice(0, 4)
                .map((r) => (
                  <button key={r.label} onClick={() => { setQuick(quick === r.i ? null : r.i); setPage(1); }}>
                    {r.label}
                  </button>
                ))}
            </div>
          )}
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
          <button
            className={"tab" + (forYou ? " active" : "")}
            onClick={() => { setForYou(!forYou); setPage(1); }}
            title={mySkills.length ? `Matching your skills: ${mySkills.join(", ")}` : "Add skills in your profile to unlock"}
          >
            <Icon name="sparkle" size={13} /> For you
          </button>
          <button
            className={"tab saved-tab" + (showSaved ? " active" : "")}
            onClick={() => { setShowSaved(!showSaved); setPage(1); }}
          >
            <Icon name="star" size={13} /> Saved<span className="n">{savedCount}</span>
          </button>
        </div>

        {forYou && !mySkills.length && (
          <div className="foryou-hint">
            <b><Icon name="sparkle" size={13} /> For you</b> ranks jobs against your skills — but your profile has none yet.{" "}
            <a href="/profile">Add skills to your profile</a> and this tab becomes your personal shortlist.
          </div>
        )}

        <div className="listmeta">
          <span>
            {filtered.length ? `Showing ${(cur - 1) * per + 1}–${Math.min(cur * per, filtered.length)} of ${filtered.length.toLocaleString()} positions` : ""}
            {country ? ` in ${city ? (cityPoints.find((c) => c.name === city)?.label || city) + ", " : ""}${country}` : ""}
          </span>
          {showSaved && savedCount > 0 && (
            <button className="btn" onClick={exportSaved}><Icon name="download" size={13} /> Export saved ({savedCount}) as CSV</button>
          )}
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
          <div className="state"><Loader label="Fetching live listings from all sources…" /></div>
        ) : !filtered.length ? (
          <div className="state"><h3>No matching positions</h3>Try a broader search, another country, or clear the filters.</div>
        ) : (
          <>
            <div className="browse">
              <div className="joblist">
                {slice.map((j, i) => (
                  <div
                    className={"job" + (sel && jkey(sel) === jkey(j) ? " active" : "")}
                    key={i}
                    onClick={() => { setSel(j); setSelOpen(true); markViewed(j); setTrans(null); setTransErr(""); }}
                  >
                    {j.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="avatar" src={j.logo} alt="" loading="lazy" />
                    ) : (
                      <div className="avatar ph">{(j.company || "?")[0].toUpperCase()}</div>
                    )}
                    <div className="jmain">
                      <span className="jtitle">
                        {j.title}
                        {Date.now() - new Date(j.date).getTime() < 864e5 && <span className="newtag">NEW</span>}
                        {mySkills.length > 0 && matchSkills(j).length > 0 && (
                          <span className="matchtag">✦ {matchSkills(j).length} skill match</span>
                        )}
                        {viewed[jkey(j)] && <span className="viewedtag">· viewed</span>}
                      </span>
                      <div className="jsub">
                        <span
                          className="jcompany"
                          title={`See all jobs at ${j.company}`}
                          onClick={(e) => { e.stopPropagation(); setQ(j.company); setPage(1); }}
                        >
                          {j.company}
                        </span>
                        {j.location && <><span className="sep">·</span><span>{j.location.slice(0, 42)}</span></>}
                        {j.salary && <><span className="sep">·</span><span className="jsalary">{j.salary.slice(0, 30)}</span></>}
                      </div>
                    </div>
                    <div className="jright">
                      <span className={"pill " + j.mode}>{j.mode === "onsite" ? "On-site" : j.mode[0].toUpperCase() + j.mode.slice(1)}</span>
                      <span className="jdate">{ago(j.date)}</span>
                      <button
                        className={"savebtn" + (saved[jkey(j)] ? " on" : "")}
                        title={saved[jkey(j)] ? "Remove from saved" : "Save job"}
                        onClick={(e) => { e.stopPropagation(); toggleSave(j); }}
                      >
                        <Icon name="star" size={16} filled={!!saved[jkey(j)]} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <aside className={"jobdetail" + (selOpen ? " open" : "")}>
                {sel ? (
                  <>
                    <button className="btn jd-close" onClick={() => setSelOpen(false)}>✕ Close</button>
                    <div className="jd-head">
                      {sel.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="avatar" src={sel.logo} alt="" />
                      ) : (
                        <div className="avatar ph">{(sel.company || "?")[0].toUpperCase()}</div>
                      )}
                      <div>
                        <h2 className="jd-title">{trans ? trans.title : sel.title}</h2>
                        <div className="jd-company">{sel.company}{sel.location ? ` · ${sel.location.slice(0, 60)}` : ""}</div>
                      </div>
                    </div>
                    <div className="jd-pills">
                      <span className={"pill " + sel.mode}>{sel.mode === "onsite" ? "On-site" : sel.mode[0].toUpperCase() + sel.mode.slice(1)}</span>
                      {sel.type && <span className="pill">{sel.type.slice(0, 28)}</span>}
                      {sel.salary && <span className="pill salary">{sel.salary.slice(0, 30)}</span>}
                      <span className="pill">{sel.source}</span>
                      <span className="pill">{ago(sel.date)}</span>
                    </div>
                    <div className="jd-actions">
                      <a className="btn primary" href={sel.url} target="_blank" rel="noopener noreferrer">Apply now ↗</a>
                      <button className="btn" onClick={() => toggleSave(sel)}>
                        <Icon name="star" size={14} filled={!!saved[jkey(sel)]} /> {saved[jkey(sel)] ? "Saved" : "Save"}
                      </button>
                      <button
                        className="btn"
                        title="Copy job link"
                        onClick={async () => {
                          try { await navigator.clipboard.writeText(sel.url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
                        }}
                      >
                        {copied ? "Copied ✓" : "Share"}
                      </button>
                    </div>
                    {mySkills.length > 0 && matchSkills(sel).length > 0 && (
                      <div className="jd-match">
                        This role matches <b>{matchSkills(sel).length} of your {mySkills.length} skills</b>
                        <div className="chips">
                          {matchSkills(sel).map((s) => <span key={s} className="mchip">{s}</span>)}
                        </div>
                      </div>
                    )}
                    <div className="jd-translate">
                      <Icon name="translate" size={15} style={{ color: "var(--muted)" }} />
                      <select
                        defaultValue=""
                        onChange={(e) => translateSel(e.target.value)}
                        disabled={transBusy}
                        aria-label="Translate this job"
                      >
                        <option value="">{transBusy ? "Translating…" : "Original language"}</option>
                        {LANGS.map(([code, name]) => <option key={code} value={code}>Translate to {name}</option>)}
                      </select>
                      {trans && <button className="btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setTrans(null)}>Show original</button>}
                    </div>
                    {transErr && <div className="autherr" style={{ marginBottom: 12 }}>{transErr}</div>}
                    {(trans?.desc || sel.desc) && (
                      <>
                        <div className="jd-sect">About this role</div>
                        <p className="jd-desc">{trans ? trans.desc : sel.desc}{!trans && sel.desc.length >= 490 ? "…" : ""}</p>
                      </>
                    )}
                    <div className="jd-sect">Details</div>
                    <div className="jd-meta">
                      <div><span>Company</span><b>{sel.company || "—"}</b></div>
                      <div><span>Location</span><b>{sel.location || "—"}</b></div>
                      <div><span>Work mode</span><b>{sel.mode === "onsite" ? "On-site" : sel.mode[0].toUpperCase() + sel.mode.slice(1)}</b></div>
                      {sel.type && <div><span>Job type</span><b>{sel.type}</b></div>}
                      {sel.salary && <div><span>Salary</span><b>{sel.salary}</b></div>}
                      {sel.category && <div><span>Category</span><b>{sel.category.slice(0, 60)}</b></div>}
                      <div><span>Source</span><b>{sel.source}</b></div>
                      <div><span>Posted</span><b>{new Date(sel.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</b></div>
                    </div>
                    <div className="jd-note">You&apos;ll complete the application on {sel.source} or the company&apos;s site.</div>
                  </>
                ) : (
                  <div className="jd-empty">Select a job to see the details.</div>
                )}
              </aside>
            </div>
            {totalPages > 1 && (
              <div className="pager">
                <button className="btn" disabled={cur <= 1} onClick={() => goPage(cur - 1)}>← Prev</button>
                {pageNums.map((n, i) => (
                  <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {i > 0 && n - pageNums[i - 1] > 1 && <span className="pager-dots">…</span>}
                    <button className={"btn pagenum" + (n === cur ? " on" : "")} onClick={() => goPage(n)}>{n}</button>
                  </span>
                ))}
                <button className="btn" disabled={cur >= totalPages} onClick={() => goPage(cur + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
        <div className="footer">Data refreshes automatically every 15 minutes from Remotive, RemoteOK, We Work Remotely, Himalayas, Jobicy, Arbeitnow, The Muse and more.</div>
        <JobBot
          jobs={jobs}
          countryNames={Object.keys(countryCounts)}
          mySkills={mySkills}
          onApply={botApply}
        />
        {showTop && (
          <button className="toplink" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} title="Back to top">↑</button>
        )}
      </main>
    </div>
  );
}
