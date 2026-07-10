// Server-side job aggregation. Runs on the backend, so there is no CORS problem.
// Keyless sources: Remotive, Jobicy, Arbeitnow, The Muse, RemoteOK,
// We Work Remotely (RSS), Himalayas.
// Key-based sources (activate by setting env vars): Adzuna, Jooble — these
// license listings from thousands of boards incl. many that also appear on
// LinkedIn/Indeed.

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
    desc: strip(j.description).slice(0, 500),
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
    desc: strip(j.jobExcerpt).slice(0, 500),
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
        desc: strip(j.description).slice(0, 500),
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
        desc: strip(j.contents).slice(0, 500),
        url: j.refs?.landing_page || "",
        date: j.publication_date,
        source: "The Muse",
        hay: `${j.name} ${j.company?.name || ""} ${(j.categories || []).map((c) => c.name).join(" ")} ${locs} ${strip(j.contents).slice(0, 600)}`.toLowerCase(),
      });
    }
  }
  return out;
}

async function srcRemoteOK() {
  const d = await get("https://remoteok.com/api");
  return (Array.isArray(d) ? d : [])
    .filter((j) => j.position && j.company)
    .map((j) => ({
      title: j.position,
      company: j.company,
      logo: j.company_logo || "",
      location: j.location || "Worldwide",
      category: (j.tags || []).slice(0, 4).join(", "),
      type: "",
      salary: j.salary_min && j.salary_max ? `$${Math.round(j.salary_min / 1000)}k–$${Math.round(j.salary_max / 1000)}k` : "",
      mode: classify(true, `${j.position} ${j.location || ""}`),
    desc: strip(j.description).slice(0, 500),
      url: j.apply_url || j.url,
      date: j.date,
      source: "RemoteOK",
      hay: `${j.position} ${j.company} ${(j.tags || []).join(" ")} ${j.location || ""} ${strip(j.description).slice(0, 600)}`.toLowerCase(),
    }));
}

async function srcWeWorkRemotely() {
  const res = await fetch("https://weworkremotely.com/remote-jobs.rss", {
    headers: { "User-Agent": "job-quickie/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`wwr -> ${res.status}`);
  const xml = await res.text();
  const unc = (s) => (s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
  const tag = (item, t) => unc((item.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1]);
  const out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1];
    const rawTitle = tag(it, "title");
    const i = rawTitle.indexOf(":");
    const company = i > 0 ? rawTitle.slice(0, i).trim() : "";
    const title = i > 0 ? rawTitle.slice(i + 1).trim() : rawTitle;
    if (!title) continue;
    const region = tag(it, "region") || "Anywhere";
    const category = tag(it, "category");
    out.push({
      title,
      company,
      logo: "",
      location: region,
      category,
      type: tag(it, "type") || "",
      salary: "",
      mode: classify(true, `${title} ${region}`),
      desc: strip(tag(it, "description")).slice(0, 500),
      url: tag(it, "link") || tag(it, "guid"),
      date: new Date(tag(it, "pubDate") || Date.now()).toISOString(),
      source: "We Work Remotely",
      hay: `${title} ${company} ${category} ${region} ${strip(tag(it, "description")).slice(0, 600)}`.toLowerCase(),
    });
  }
  return out;
}

async function srcHimalayas() {
  const pages = await Promise.allSettled(
    [0, 100].map((off) => get(`https://himalayas.app/jobs/api?limit=100&offset=${off}`))
  );
  const out = [];
  for (const r of pages) {
    if (r.status !== "fulfilled") continue;
    for (const j of r.value.jobs || []) {
      const locs = (j.locationRestrictions || []).join(", ") || "Worldwide";
      out.push({
        title: j.title,
        company: j.companyName,
        logo: j.companyLogo || "",
        location: locs,
        category: (j.parentCategories?.length ? j.parentCategories : (j.categories || []).slice(0, 3)).join(", "),
        type: j.employmentType || "",
        salary: j.minSalary && j.maxSalary ? `${j.currency || "$"}${Math.round(j.minSalary / 1000)}k–${Math.round(j.maxSalary / 1000)}k` : "",
        mode: classify(true, `${j.title} ${locs}`),
        desc: (j.excerpt || "").slice(0, 500),
        url: j.applicationLink,
        date: new Date((j.pubDate || 0) * 1000).toISOString(),
        source: "Himalayas",
        hay: `${j.title} ${j.companyName} ${(j.categories || []).join(" ")} ${locs} ${j.excerpt || ""}`.toLowerCase(),
      });
    }
  }
  return out;
}

// ---- key-based aggregators (enabled when env vars are present) ----

async function srcAdzuna() {
  const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return [];
  const countries = (process.env.ADZUNA_COUNTRIES || "us,gb,in,ca,de,au").split(",");
  const pages = await Promise.allSettled(
    countries.map((c) =>
      get(`https://api.adzuna.com/v1/api/jobs/${c.trim()}/search/1?app_id=${id}&app_key=${key}&results_per_page=50&content-type=application/json`)
    )
  );
  const out = [];
  for (const r of pages) {
    if (r.status !== "fulfilled") continue;
    for (const j of r.value.results || []) {
      const loc = j.location?.display_name || "";
      out.push({
        title: j.title?.replace(/<[^>]*>/g, "") || "",
        company: j.company?.display_name || "",
        logo: "",
        location: loc,
        category: j.category?.label || "",
        type: j.contract_time || "",
        salary: j.salary_min ? `~${Math.round(j.salary_min / 1000)}k` : "",
        mode: classify(false, `${j.title} ${loc} ${strip(j.description).slice(0, 300)}`),
        desc: strip(j.description).slice(0, 500),
        url: j.redirect_url,
        date: j.created,
        source: "Adzuna",
        hay: `${j.title} ${j.company?.display_name || ""} ${j.category?.label || ""} ${loc} ${strip(j.description).slice(0, 600)}`.toLowerCase(),
      });
    }
  }
  return out;
}

async function srcJooble() {
  const key = process.env.JOOBLE_KEY;
  if (!key) return [];
  const res = await fetch(`https://jooble.org/api/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords: "", page: "1" }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`jooble -> ${res.status}`);
  const d = await res.json();
  return (d.jobs || []).map((j) => ({
    title: j.title?.replace(/<[^>]*>/g, "") || "",
    company: j.company || "",
    logo: "",
    location: j.location || "",
    category: "",
    type: j.type || "",
    salary: j.salary || "",
    mode: classify(false, `${j.title} ${j.location} ${strip(j.snippet).slice(0, 300)}`),
    desc: strip(j.snippet).slice(0, 500),
    url: j.link,
    date: j.updated,
    source: "Jooble",
    hay: `${j.title} ${j.company || ""} ${j.location || ""} ${strip(j.snippet).slice(0, 600)}`.toLowerCase(),
  }));
}

export async function getJobs() {
  if (Date.now() - cache.at < TTL && cache.jobs.length) {
    return { jobs: cache.jobs, sources: cache.sources, cachedAt: cache.at };
  }
  const sources = {};
  const fetchers = [
    ["Remotive", srcRemotive],
    ["Jobicy", srcJobicy],
    ["Arbeitnow", srcArbeitnow],
    ["The Muse", srcTheMuse],
    ["RemoteOK", srcRemoteOK],
    ["We Work Remotely", srcWeWorkRemotely],
    ["Himalayas", srcHimalayas],
    ["Adzuna", srcAdzuna],
    ["Jooble", srcJooble],
  ];
  const results = await Promise.allSettled(fetchers.map(([, f]) => f()));
  const names = fetchers.map(([n]) => n);
  let jobs = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      // hide key-based sources that are simply not configured
      if (!r.value.length && (names[i] === "Adzuna" || names[i] === "Jooble")) return;
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
