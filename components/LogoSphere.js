"use client";
import { useMemo, useState } from "react";

// Rotating 3D sphere of company logo cards (pure CSS 3D — no libraries).
// Logos load from the simple-icons CDN; any that fail fall back to a
// branded monogram tile so the sphere never has holes.

const COMPANIES = [
  { name: "Google", slug: "google", color: "#4285F4" },
  { name: "Apple", slug: "apple", color: "#A2AAAD", invert: true },
  { name: "Microsoft", slug: null, color: "#00A4EF" }, // custom 4-square tile
  { name: "Amazon", slug: null, color: "#FF9900" },
  { name: "Meta", slug: "meta", color: "#0866FF" },
  { name: "NVIDIA", slug: "nvidia", color: "#76B900" },
  { name: "Netflix", slug: "netflix", color: "#E50914" },
  { name: "Tesla", slug: "tesla", color: "#CC0000" },
  { name: "OpenAI", slug: "openai", color: "#74AA9C", invert: true },
  { name: "Samsung", slug: "samsung", color: "#1428A0" },
  { name: "Oracle", slug: "oracle", color: "#C74634" },
  { name: "IBM", slug: "ibm", color: "#0530AD" },
  { name: "Intel", slug: "intel", color: "#0068B5" },
  { name: "Adobe", slug: "adobe", color: "#FF0000" },
  { name: "Spotify", slug: "spotify", color: "#1ED760" },
];

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 23 23" width="30" height="30" aria-hidden>
      <rect x="0" y="0" width="11" height="11" fill="#F25022" />
      <rect x="12" y="0" width="11" height="11" fill="#7FBA00" />
      <rect x="0" y="12" width="11" height="11" fill="#00A4EF" />
      <rect x="12" y="12" width="11" height="11" fill="#FFB900" />
    </svg>
  );
}

function Tile({ c }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="ls-tile" style={{ "--brand": c.color }} title={c.name}>
      {c.name === "Microsoft" ? (
        <MicrosoftMark />
      ) : c.slug && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://cdn.simpleicons.org/${c.slug}/${c.invert ? "ffffff" : c.color.replace("#", "")}`}
          alt={c.name}
          width={30}
          height={30}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="ls-mono" style={{ color: c.color }}>{c.name[0]}</span>
      )}
      <span className="ls-name">{c.name}</span>
    </div>
  );
}

export default function LogoSphere() {
  // two tiles per company → 30 points, evenly placed on a Fibonacci sphere
  const points = useMemo(() => {
    const items = [...COMPANIES, ...COMPANIES];
    const n = items.length;
    const golden = Math.PI * (3 - Math.sqrt(5));
    return items.map((c, i) => {
      const y = 1 - (i / (n - 1)) * 2;
      const rY = Math.acos(y);                 // polar angle
      const theta = golden * i;                // azimuth
      return {
        c,
        ry: (theta * 180) / Math.PI,
        rx: 90 - (rY * 180) / Math.PI,
      };
    });
  }, []);

  return (
    <div className="ls-scene" aria-hidden>
      <div className="ls-sphere">
        {points.map((p, i) => (
          <div
            key={i}
            className="ls-slot"
            style={{ transform: `rotateY(${p.ry}deg) rotateX(${p.rx}deg) translateZ(var(--ls-r))` }}
          >
            <Tile c={p.c} />
          </div>
        ))}
      </div>
    </div>
  );
}
