"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "Jobs" },
  { href: "/autopilot", label: "⚡ Autopilot" },
  { href: "/explore", label: "Explore" },
  { href: "/skills", label: "Skills" },
  { href: "/companies", label: "Companies" },
  { href: "/saved", label: "Saved" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.user?.role === "admin") setIsAdmin(true);
    }).catch(() => {});
    // onboarding gate: profile + interview + ID are mandatory before browsing
    fetch("/api/onboarding").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d && !d.complete && !d.isAdmin) router.replace("/onboarding");
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="topbar">
      <div className="wrap topbar-inner">
        <div className="brand" onClick={() => router.push("/dashboard")} style={{ cursor: "pointer" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/logo.svg" alt="JobQuickie" />
          Job<span style={{ color: "#2f7bff" }}>Quickie</span>
        </div>
        <nav className="mainnav">
          {LINKS.map((l) => (
            <button
              key={l.href}
              className={"navlink" + (pathname === l.href ? " active" : "")}
              onClick={() => router.push(l.href)}
            >
              {l.label}
            </button>
          ))}
          {isAdmin && (
            <button className={"navlink" + (pathname === "/admin" ? " active" : "")} onClick={() => router.push("/admin")}>
              Admin
            </button>
          )}
        </nav>
        <div className="top-right">
          <ThemeToggle />
          <button className="btn" onClick={() => router.push("/profile")}>Profile</button>
          <button className="btn" onClick={logout}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
