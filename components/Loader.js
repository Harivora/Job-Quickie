"use client";

// Branded loader: the JobQuickie logo pulsing inside a spinning orbit ring.
export default function Loader({ label = "Loading…", size = 72, full = false }) {
  return (
    <div className={full ? "loader loader-full" : "loader"} role="status" aria-live="polite">
      <div className="loader-badge" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" style={{ width: size * 0.55 }} />
      </div>
      {label && <div className="loader-label">{label}</div>}
    </div>
  );
}
