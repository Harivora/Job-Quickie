"use client";
import { useEffect, useState } from "react";

// Icon-only theme switch: sun ↔ moon with a rotate/scale morph animation.
export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");
  const [spin, setSpin] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    setSpin(true);
    setTimeout(() => setSpin(false), 550);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("jq_theme", next); } catch {}
  }

  return (
    <button
      className={"themeicon" + (spin ? " spin" : "")}
      onClick={toggle}
      title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      aria-label="Toggle theme"
    >
      <svg className="ti-sun" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.4" />
        <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19" />
      </svg>
      <svg className="ti-moon" viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
        <path d="M20.6 14.6A8.7 8.7 0 0 1 9.4 3.4 8.7 8.7 0 1 0 20.6 14.6Z" />
      </svg>
    </button>
  );
}
