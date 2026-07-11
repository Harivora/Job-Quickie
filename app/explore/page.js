"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Nav from "@/components/Nav";
import Loader from "@/components/Loader";
import Insights from "@/components/Insights";
import { useJobs } from "@/lib/useJobs";
import { CITIES } from "@/lib/geo";

const JobGlobe = dynamic(() => import("@/components/JobGlobe"), { ssr: false });

const QUICK = [
  { label: "AI & Machine Learning", re: /\b(ai|machine learning|ml engineer|artificial intelligence|deep learning|llm|nlp|computer vision|data scien)/i },
  { label: "Software Engineering", re: /\b(software|developer|engineer|frontend|backend|full.?stack|devops|programmer)\b/i },
  { label: "Healthcare & Nursing", re: /\b(nurse|nursing|healthcare|medical|clinical|physician|doctor|health)\b/i },
  { label: "Data & Analytics", re: /\b(data (analyst|engineer|scientist)|analytics|business intelligence)\b/i },
  { label: "Design", re: /\b(design|ux|ui\b|graphic|product design)\b/i },
  { label: "Marketing & Sales", re: /\b(marketing|sales|seo|growth)\b/i },
  { label: "Product Management", re: /\b(product (manager|owner|lead))\b/i },
  { label: "Customer Support", re: /\b(customer (support|success|service)|help ?desk)\b/i },
];

export default function ExplorePage() {
  const router = useRouter();
  const { jobs, loading, error } = useJobs();
  const [country, setCountry] = useState(null);
  const [city, setCity] = useState(null);

  const countryCounts = useMemo(() => {
    const counts = {};
    for (const j of jobs) for (const c of j._countries) counts[c] = (counts[c] || 0) + 1;
    return counts;
  }, [jobs]);

  const cityPoints = useMemo(() => {
    if (!country) return [];
    const cnt = {};
    for (const j of jobs) {
      if (!j._countries.includes(country)) continue;
      const loc = (j.location || "").toLowerCase();
      for (const [key, info] of Object.entries(CITIES)) {
        if (info.c !== country) continue;
        if (loc.includes(key)) { cnt[key] = (cnt[key] || 0) + 1; break; }
      }
    }
    return Object.entries(cnt)
      .map(([key, count]) => ({ name: key, label: key.replace(/(^|\s)\S/g, (c) => c.toUpperCase()), lat: CITIES[key].lat, lng: CITIES[key].lon, count }))
      .sort((a, b) => b.count - a.count);
  }, [jobs, country]);

  const scoped = useMemo(
    () => (country ? jobs.filter((j) => j._countries.includes(country)) : jobs),
    [jobs, country]
  );
  const roleCounts = useMemo(
    () => QUICK.map((c) => ({ label: c.label, count: scoped.filter((j) => c.re.test(j.hay + " " + j.title)).length })),
    [scoped]
  );

  function browse() {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (city) params.set("city", city);
    router.push("/dashboard" + (params.size ? "?" + params.toString() : ""));
  }

  return (
    <div>
      <Nav />
      <main className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <h1 className="pagetitle">Explore the market</h1>
        <p className="pagesub">Roam the globe, drill into a country, and see live market insights for that slice of the world.</p>
        {error && <div className="banner">{error}</div>}
        {loading && !jobs.length ? (
          <Loader full label="Loading the world's openings…" />
        ) : (
          <>
            <div className="globepanel">
              <div className="globepanel-head">
                <div>
                  <div className="globepanel-title">
                    {country ? `${country}${city ? ` — ${city.replace(/(^|\s)\S/g, (c) => c.toUpperCase())}` : ""} · ${scoped.length.toLocaleString()} jobs` : `Worldwide · ${jobs.length.toLocaleString()} jobs`}
                  </div>
                  <div className="globepanel-sub">Scroll to zoom · click a country, then a city marker</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {country && <button className="btn" onClick={() => { setCountry(null); setCity(null); }}>Clear</button>}
                  <button className="btn primary" onClick={browse}>Browse these jobs →</button>
                </div>
              </div>
              <div className="globepanel-canvas" style={{ height: 520 }}>
                <JobGlobe
                  counts={countryCounts}
                  selected={country}
                  onSelect={(c) => { setCountry(c); setCity(null); }}
                  cityPoints={cityPoints}
                  selectedCity={city}
                  onSelectCity={setCity}
                />
              </div>
            </div>
            <Insights jobs={scoped} roles={roleCounts} />
          </>
        )}
      </main>
    </div>
  );
}
