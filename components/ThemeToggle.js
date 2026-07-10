"use client";
import { useEffect, useState } from "react";

// Cycles: system → light → dark. Persists to localStorage.
const ORDER = ["system", "light", "dark"];
const ICON = { system: "🖥", light: "☀️", dark: "🌙" };
const LABEL = { system: "Auto", light: "Light", dark: "Dark" };

function apply(mode) {
  const t = mode === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : mode;
  document.documentElement.dataset.theme = t;
}

export default function ThemeToggle() {
  const [mode, setMode] = useState("system");

  useEffect(() => {
    const saved = localStorage.getItem("jq_theme");
    setMode(saved === "light" || saved === "dark" ? saved : "system");
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => { if (!localStorage.getItem("jq_theme")) apply("system"); };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    setMode(next);
    if (next === "system") localStorage.removeItem("jq_theme");
    else localStorage.setItem("jq_theme", next);
    apply(next);
  }

  return (
    <button className="btn themebtn" onClick={cycle} title={`Theme: ${LABEL[mode]} — click to change`}>
      <span aria-hidden>{ICON[mode]}</span> {LABEL[mode]}
    </button>
  );
}
