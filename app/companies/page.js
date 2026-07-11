"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Loader from "@/components/Loader";
import { useJobs } from "@/lib/useJobs";

export default function CompaniesPage() {
  const router = useRouter();
  const { jobs, loading } = useJobs();
  const [q, setQ] = useState("");

  const companies = useMemo(() => {
    const map = {};
    for (const j of jobs) {
      if (!j.company) continue;
      const key = j.company;
      if (!map[key]) map[key] = { name: key, logo: j.logo || "", count: 0, remote: 0, locations: new Set(), latest: 0 };
      const c = map[key];
      c.count++;
      if (j.mode === "remote") c.remote++;
      if (!c.logo && j.logo) c.logo = j.logo;
      if (j.location) c.locations.add(j.location.split(",")[0].trim());
      c.latest = Math.max(c.latest, new Date(j.date).getTime() || 0);
    }
    return Object.values(map).sort((a, b) => b.count - a.count || b.latest - a.latest);
  }, [jobs]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = s ? companies.filter((c) => c.name.toLowerCase().includes(s)) : companies;
    return f.slice(0, 120);
  }, [companies, q]);

  return (
    <div>
      <Nav />
      <main className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <h1 className="pagetitle">Companies hiring now</h1>
        <p className="pagesub">{companies.length.toLocaleString()} companies with live openings across all sources.</p>
        <div className="filterbar">
          <div className="frow">
            <input
              type="search"
              placeholder="Search companies…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        {loading && !jobs.length ? (
          <Loader full label="Collecting companies…" />
        ) : (
          <div className="companygrid">
            {shown.map((c) => (
              <div
                key={c.name}
                className="companycard"
                onClick={() => router.push("/dashboard?q=" + encodeURIComponent(c.name))}
                title={`See all ${c.count} jobs at ${c.name}`}
              >
                {c.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="avatar" src={c.logo} alt="" loading="lazy" />
                ) : (
                  <div className="avatar ph">{c.name[0].toUpperCase()}</div>
                )}
                <div className="cc-main">
                  <div className="cc-name">{c.name}</div>
                  <div className="cc-sub">
                    {c.count} opening{c.count === 1 ? "" : "s"}
                    {c.remote > 0 && ` · ${c.remote} remote`}
                    {c.locations.size > 0 && ` · ${[...c.locations].slice(0, 2).join(", ")}`}
                  </div>
                </div>
                <span className="cc-count">{c.count}</span>
              </div>
            ))}
            {!shown.length && <div className="state">No companies match that search.</div>}
          </div>
        )}
      </main>
    </div>
  );
}
