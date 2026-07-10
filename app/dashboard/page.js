"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { matchLocation, CITIES } from "@/lib/geo";

const JobGlobe = dynamic(() => import("@/components/JobGlobe"), { ssr: false });

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
  const [country, setCountry] = useState(null);
  const [city, setCity] = useState(null);
  const [includeWorldwide, setIncludeWorldwide] = useState(true);
  const [showGlobe, setShowGlobe] = useState(true);

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
    return [...f].sort((a, b) =>
      sort === "title" ? a.title.localeCompare(b.title)
      : sort === "company" ? a.company.localeCompare(b.company)
      : new Date(b.date) - new Date(a.date)
    );
  }, [base, tab, sort]);

  const slice = filtered.slice(0, page * PER);
  const count = (m) => base.filter((j) => j.mode === m).length;

  function selectCountry(c) {
    setCountry(c);
    setCity(null);
    setPage(1);
  }

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

        <div className="globepanel">
          <div className="globepanel-head">
            <div>
              <div className="globepanel-title">Explore by location</div>
              <div className="globepanel-sub">Drag to roam the globe · click a marker to filter by country</div>
            </div>
            <button className="btn" onClick={() => setShowGlobe(!showGlobe)}>
              {showGlobe ? "Hide globe" : "Show globe"}
            </button>
          </div>
          {showGlobe && (
            <div className="globepanel-body">
              <div className="globepanel-canvas">
                <JobGlobe
                  counts={countryCounts}
                  selected={country}
                  onSelect={selectCountry}
                  cityPoints={cityPoints}
                  selectedCity={city}
                  onSelectCity={(c) => { setCity(c); setPage(1); }}
                />
              </div>
              <div className="globepanel-side">
                {country ? (
                  <>
                    <div className="geosel">
                      <span className="pill approved">{country}</span>
                      <button className="btn" onClick={() => selectCountry(null)}>Clear</button>
                    </div>
                    <label className="geotoggle">
                      <input
                        type="checkbox"
                        checked={includeWorldwide}
                        onChange={(e) => { setIncludeWorldwide(e.target.checked); setPage(1); }}
                      />
                      Include worldwide-remote roles
                    </label>
                    {cityPoints.length > 0 && (
                      <>
                        <div className="geolabel">Cities — click a marker on the globe or a chip</div>
                        <div className="chiprow" style={{ marginTop: 6 }}>
                          {cityPoints.slice(0, 10).map((cp) => (
                            <span
                              key={cp.name}
                              className={"chip" + (city === cp.name ? " on" : "")}
                              onClick={() => { setCity(city === cp.name ? null : cp.name); setPage(1); }}
                            >
                              {cp.label} · {cp.count}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="geolabel">Top countries</div>
                    <div className="chiprow" style={{ marginTop: 6 }}>
                      {Object.entries(countryCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([c, n]) => (
                          <span key={c} className="chip" onClick={() => selectCountry(c)}>
                            {c} · {n}
                          </span>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

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
          <span>
            {filtered.length ? `Showing ${slice.length} of ${filtered.length} positions` : ""}
            {country ? ` in ${city ? (cityPoints.find((c) => c.name === city)?.label || city) + ", " : ""}${country}` : ""}
          </span>
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
          <div className="state"><h3>No matching positions</h3>Try a broader search, another country, or clear the filters.</div>
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
