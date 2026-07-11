"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { matchLocation } from "@/lib/geo";

// Shared client hook: fetches the aggregated jobs (server-cached), enriches
// with geography, auto-refreshes every 15 minutes.
export function useJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [sources, setSources] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);

  const load = useCallback(async () => {
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
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  return { jobs, sources, loading, error, updated, reload: load };
}
