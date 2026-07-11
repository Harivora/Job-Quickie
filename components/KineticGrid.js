"use client";
import { useEffect, useMemo, useRef, useState } from "react";

// Kinetic spatial grid — a field of company tiles where the tile nearest the
// cursor comes into sharp focus, lifts, and is magnetically pulled toward it,
// while distant tiles blur and dim. When the cursor is idle the spotlight
// roams on its own. Real logos via Google's favicon service (works for every
// company), with a monogram fallback so no tile is ever empty.

const COMPANIES = [
  { name: "Google", domain: "google.com", color: "#4285F4" },
  { name: "Microsoft", domain: "microsoft.com", color: "#00A4EF" },
  { name: "Apple", domain: "apple.com", color: "#555555" },
  { name: "Amazon", domain: "amazon.com", color: "#FF9900" },
  { name: "Meta", domain: "meta.com", color: "#0866FF" },
  { name: "NVIDIA", domain: "nvidia.com", color: "#76B900" },
  { name: "Netflix", domain: "netflix.com", color: "#E50914" },
  { name: "Tesla", domain: "tesla.com", color: "#CC0000" },
  { name: "OpenAI", domain: "openai.com", color: "#10A37F" },
  { name: "LinkedIn", domain: "linkedin.com", color: "#0A66C2" },
  { name: "Samsung", domain: "samsung.com", color: "#1428A0" },
  { name: "Oracle", domain: "oracle.com", color: "#C74634" },
  { name: "IBM", domain: "ibm.com", color: "#0530AD" },
  { name: "Intel", domain: "intel.com", color: "#0068B5" },
  { name: "Adobe", domain: "adobe.com", color: "#FF0000" },
  { name: "Spotify", domain: "spotify.com", color: "#1ED760" },
  { name: "Uber", domain: "uber.com", color: "#111111" },
  { name: "Stripe", domain: "stripe.com", color: "#635BFF" },
  { name: "Airbnb", domain: "airbnb.com", color: "#FF5A5F" },
  { name: "Salesforce", domain: "salesforce.com", color: "#00A1E0" },
  { name: "PayPal", domain: "paypal.com", color: "#003087" },
  { name: "Shopify", domain: "shopify.com", color: "#95BF47" },
  { name: "Slack", domain: "slack.com", color: "#4A154B" },
  { name: "Zoom", domain: "zoom.us", color: "#0B5CFF" },
];

const COLS = 5;
const ROWS = 8;

function Tile({ c }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="kg-tile" data-name={c.name}>
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${c.domain}&sz=64`}
          alt={c.name}
          width={30}
          height={30}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="kg-mono" style={{ color: c.color }}>{c.name[0]}</span>
      )}
    </div>
  );
}

export default function KineticGrid() {
  const fieldRef = useRef(null);

  const cells = useMemo(() => {
    const out = [];
    for (let i = 0; i < COLS * ROWS; i++) out.push(COMPANIES[i % COMPANIES.length]);
    return out;
  }, []);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    let mx = null, my = null, lastMove = 0, raf, t = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onMove = (e) => { mx = e.clientX; my = e.clientY; lastMove = Date.now(); };
    window.addEventListener("mousemove", onMove, { passive: true });

    const tiles = () => [...field.querySelectorAll(".kg-tile")];

    const tick = () => {
      t += 0.008;
      const r = field.getBoundingClientRect();
      let cx, cy;
      const idle = mx === null || Date.now() - lastMove > 2600;
      if (idle) {
        // roaming spotlight when the cursor is away
        cx = r.left + r.width * (0.5 + 0.38 * Math.sin(t));
        cy = r.top + r.height * (0.5 + 0.38 * Math.sin(t * 0.7 + 1.4));
      } else { cx = mx; cy = my; }

      for (const el of tiles()) {
        const b = el.getBoundingClientRect();
        const ex = b.left + b.width / 2, ey = b.top + b.height / 2;
        const dx = cx - ex, dy = cy - ey;
        const dist = Math.hypot(dx, dy);
        const f = Math.max(0, 1 - dist / 420); // 1 = under cursor
        const pull = idle ? 0 : Math.max(0, f - 0.55) * 0.5; // magnetic flow toward cursor
        el.style.transform = `translate(${dx * pull}px, ${dy * pull}px) scale(${0.9 + f * 0.22}) translateZ(0)`;
        el.style.opacity = String(0.28 + f * 0.72);
        el.style.filter = `blur(${((1 - f) * 4).toFixed(1)}px)`;
        el.style.zIndex = String(Math.round(f * 100));
        el.style.boxShadow = f > 0.75
          ? `0 ${10 + f * 14}px ${28 + f * 22}px rgba(0,0,0,.5), 0 0 ${f * 34}px rgba(88,120,255,.35)`
          : "0 4px 14px rgba(0,0,0,.35)";
      }
      raf = requestAnimationFrame(tick);
    };
    if (!reduced) raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("mousemove", onMove); };
  }, []);

  return (
    <div className="kg-field" ref={fieldRef} aria-hidden>
      {cells.map((c, i) => <Tile key={i} c={c} />)}
    </div>
  );
}
