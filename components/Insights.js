"use client";
import { useMemo } from "react";

// Live market-insight charts, drawn with pure SVG/CSS (no chart library).
// Everything reacts to the currently filtered job set.

const PALETTE = ["#2f7bff", "#22c58b", "#f5a623", "#a78bfa", "#f472b6", "#38bdf8", "#fb7185", "#4ade80", "#facc15", "#818cf8"];

function HBars({ rows, total }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="hbars">
      {rows.map((r, i) => (
        <div className="hbar" key={r.label} title={`${r.label}: ${r.count}`}>
          <span className="hbar-label">{r.label}</span>
          <span className="hbar-track">
            <span
              className="hbar-fill"
              style={{ width: `${(r.count / max) * 100}%`, background: PALETTE[i % PALETTE.length] }}
            />
          </span>
          <span className="hbar-val">{r.count.toLocaleString()}{total ? ` · ${Math.round((r.count / total) * 100)}%` : ""}</span>
        </div>
      ))}
      {!rows.length && <div className="ins-empty">No data for the current filters.</div>}
    </div>
  );
}

function DayBars({ jobs }) {
  const days = useMemo(() => {
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      out.push({ t: d.getTime(), label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), count: 0 });
    }
    for (const j of jobs) {
      const t = new Date(j.date); t.setHours(0, 0, 0, 0);
      const hit = out.find((x) => x.t === t.getTime());
      if (hit) hit.count++;
    }
    return out;
  }, [jobs]);
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="vbars">
      {days.map((d) => (
        <div className="vbar" key={d.t} title={`${d.label}: ${d.count} new`}>
          <div className="vbar-col">
            <div className="vbar-fill" style={{ height: `${Math.max(3, (d.count / max) * 100)}%` }} />
          </div>
          <span className="vbar-label">{d.label.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ jobs }) {
  const modes = [
    { id: "remote", label: "Remote", color: "#22c58b" },
    { id: "hybrid", label: "Hybrid", color: "#f5a623" },
    { id: "onsite", label: "On-site", color: "#2f7bff" },
  ].map((m) => ({ ...m, count: jobs.filter((j) => j.mode === m.id).length }));
  const total = Math.max(1, modes.reduce((s, m) => s + m.count, 0));
  const R = 40, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 100 100" className="donut">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="14" />
        {modes.map((m) => {
          const frac = m.count / total;
          const el = (
            <circle
              key={m.id} cx="50" cy="50" r={R} fill="none"
              stroke={m.color} strokeWidth="14"
              strokeDasharray={`${frac * C} ${C}`}
              strokeDashoffset={-offset * C}
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dasharray .6s ease" }}
            />
          );
          offset += frac;
          return el;
        })}
        <text x="50" y="47" textAnchor="middle" className="donut-num">{jobs.length.toLocaleString()}</text>
        <text x="50" y="60" textAnchor="middle" className="donut-cap">jobs</text>
      </svg>
      <div className="donut-legend">
        {modes.map((m) => (
          <div key={m.id}><span className="lg-dot" style={{ background: m.color }} />{m.label} <b>{m.count.toLocaleString()}</b> · {Math.round((m.count / total) * 100)}%</div>
        ))}
      </div>
    </div>
  );
}

export default function Insights({ jobs, roles }) {
  const bySource = useMemo(() => {
    const c = {};
    for (const j of jobs) c[j.source] = (c[j.source] || 0) + 1;
    return Object.entries(c).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [jobs]);

  const topRoles = useMemo(
    () => [...roles].sort((a, b) => b.count - a.count).filter((r) => r.count > 0).slice(0, 8),
    [roles]
  );

  return (
    <div className="insights-grid">
      <div className="ins-card">
        <div className="ins-title">Jobs by source</div>
        <HBars rows={bySource} total={jobs.length} />
      </div>
      <div className="ins-card">
        <div className="ins-title">Hottest role categories</div>
        <HBars rows={topRoles} total={jobs.length} />
      </div>
      <div className="ins-card">
        <div className="ins-title">New postings — last 14 days</div>
        <DayBars jobs={jobs} />
      </div>
      <div className="ins-card">
        <div className="ins-title">Work mode split</div>
        <Donut jobs={jobs} />
      </div>
    </div>
  );
}
