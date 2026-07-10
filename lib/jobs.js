// Server-side job aggregation. Runs on the backend, so there is no CORS problem.
// Sources: Remotive, Jobicy, Arbeitnow, The Muse — all free public APIs.

let cache = { at: 0, jobs: [] };
const TTL = 10 * 60 * 1000; // 10 minutes

const strip = (h) => (h || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

function classify(remoteFlag, text) {
  const t = (text || "").toLowerCase();
  if (/\bhybrid\b|flexible \/ remote/.test(t)) return "hybrid";
  if (remoteFlag) return "remote";
  return "onsite";
}

async function get(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "job-quickie/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function srcRemotive() {
  const d = await get("https://remotive.com/api/remote-jobs?limit=600");
  return (d.jobs || []).map((j) => ({
    title: j.title,
    company: j.company_name,
    logo: j.company_logo || "",
    location: j.candidate_required_location || "Worldwide",
    category: j.category || "",
    type: j.job_type || "",
    salary: j.salary || "",
    mode: classify(true, `${j.title} ${j.candidate_required_location || ""}`),
    url: j.url,
    date: j.publication_date,
    source: "Remotive",
    hay: `${j.title} ${j.company_name} ${j.category || ""} ${(j.tags || []).join(" ")} ${strip(j.description).slice(0, 600)}`.toLowerCase(),
  }));
}

async function srcJobicy() {
  const d = await get("https://jobicy.com/api/v2/remote-jobs?count=100");
  return (d.jobs || []).map((j) => ({
    title: j.jobTitle,
    company: j.companyName,
    logo: j.companyLogo || "",
    location: j.jobGeo || "Anywhere",
    category: (j.jobIndustry || []).join(", "),
    type: (j.jobType || []).join(", "),
    salary: "",
    mode: classify(true, `${j.jobTitle} ${j.jobExcerpt || ""}`),
    url: j.url,
    date: j.pubDate,
    source: "Jobicy",
    hay: `${j.jobTitle} ${j.companyName} ${(j.jobIndustry || []).join(" ")} ${j.jobLevel || ""} ${j.jobExcerpt || ""}`.toLowerCase(),
  }));
}

async function srcArbeitnow() {
  const pages = await Promise.allSettled(
    [1, 2, 3, 4].map((p) =>
      get(`https://www.arbeitnow.com/api/job-board-api?page=${p}`)
    )
  );
  const out = [];
  for (const r of pages) {
    if (r.status !== "fulfilled") continue;
    for (const j of r.value.data || []) {
      out.push({
        title: j.title,
        company: j.company_name,
        logo: "",
        location: j.location || "",
        category: (j.tags || []).join(", "),
        type: (j.job_types || []).join(", "),
        salary: "",
        mode: classify(
          j.remote,
          `${j.title} ${(j.job_types || []).join(" ")} ${strip(j.description).slice(0, 400)}`
        ),
        url: j.url,
        date: new Date(j.created_at * 1000).toISOString(),
        source: "Arbeitnow",
        hay: `${j.title} ${j.company_name} ${(j.tags || []).join(" ")} ${j.location || ""} ${strip(j.description).slice(0, 600)}`.toLowerCase(),
      });
    }
  }
  return out;
}

async function srcTheMuse() {
  const pages = await Promise.allSettled(
    [1, 2, 3].map((p) =>
      get(`https://www.themuse.com/api/public/jobs?page=${p}`)
    )
  );
  const out = [];
  for (const r of pages) {
    if (r.status !== "fulfilled") continue;
    for (const j of r.value.results || []) {
      const locs = (j.locations || []).map((l) => l.name).join(", ");
      const remote = /remote|flexible/i.test(locs);
      out.push({
        title: j.name,
        company: j.company?.name || "",
        logo: "",
        location: locs,
        category: (j.categories || []).map((c) => c.name).join(", "),
        type: (j.levels || []).map((l) => l.name).join(", "),
        salary: "",
        mode: classify(remote, `${j.name} ${locs}`),
        url: j.refs?.landing_page || "",
        date: j.publication_date,
        source: "The Muse",
        hay: `${j.name} ${j.company?.name || ""} ${(j.categories || []).map((c) => c.name).join(" ")} ${locs} ${strip(j.contents).slice(0, 600)}`.toLowerCase(),
      });
    }
  }
  return out;
}

export async function getJobs() {
  if (Date.now() - cache.at < TTL && cache.jobs.length) {
    return { jobs: cache.jobs, sources: cache.sources, cachedAt: cache.at };
  }
  const sources = {};
  const results = await Promise.allSettled([
    srcRemotive(),
    srcJobicy(),
    srcArbeitnow(),
    srcTheMuse(),
  ]);
  const names = ["Remotive", "Jobicy", "Arbeitnow", "The Muse"];
  let jobs = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      sources[names[i]] = r.value.length;
      jobs = jobs.concat(r.value);
    } else {
      sources[names[i]] = -1;
    }
  });
  // de-duplicate by title+company
  const seen = new Set();
  jobs = jobs.filter((j) => {
    const k = `${j.title}|${j.company}`.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  jobs.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (jobs.length) cache = { at: Date.now(), jobs, sources };
  return { jobs, sources, cachedAt: Date.now() };
}
