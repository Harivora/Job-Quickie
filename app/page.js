"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });

export default function Landing() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Something went wrong."); return; }
    if (data.status === "pending") {
      if (mode === "signup") {
        setOk(body.accountType === "employer"
          ? "Account created. Employer accounts are reviewed by an administrator — check back soon."
          : "Account created. An administrator must approve your access — check back soon.");
      } else {
        router.push("/pending");
      }
      return;
    }
    router.push(data.role === "admin" ? "/admin" : data.onboarded ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/logo.svg" alt="JobQuickie" />
          Job<span style={{ color: "#2f7bff" }}>Quickie</span>
        </div>
      </nav>
      <div className="hero">
        <div className="hero-left">
          <h1>The job market,<br /><span>live</span> on one screen.</h1>
          <p>
            Remote, hybrid and on-site openings aggregated in real time from
            Remotive, RemoteOK, We Work Remotely, Himalayas, Jobicy, Arbeitnow,
            The Muse and more. Access is approval-based — sign up and an
            administrator will verify you.
          </p>
          <div className="authcard">
            <h2>{mode === "login" ? "Sign in" : "Create an account"}</h2>
            <div className="hint">
              {mode === "login"
                ? "Approved members only."
                : "New accounts require administrator approval."}
            </div>
            <form onSubmit={submit}>
              {mode === "signup" && (
                <>
                  <input name="name" type="text" placeholder="Full name" required minLength={2} />
                  <select name="accountType" defaultValue="seeker" aria-label="Account type">
                    <option value="seeker">I&apos;m looking for a job</option>
                    <option value="employer">I&apos;m an employer / recruiter</option>
                  </select>
                </>
              )}
              <input name="email" type="email" placeholder="Email address" required />
              <input name="password" type="password" placeholder="Password" required minLength={6} />
              {err && <div className="autherr">{err}</div>}
              {ok && <div className="authok">{ok}</div>}
              <button className="btn primary block" disabled={busy}>
                {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Request access"}
              </button>
            </form>
            <div className="switch">
              {mode === "login" ? "No account yet? " : "Already approved? "}
              <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); setOk(""); }}>
                {mode === "login" ? "Request access" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
        <div className="globe-wrap">
          <Globe />
          <div className="globe-tag">Scanning the globe for your next role…</div>
        </div>
      </div>
    </div>
  );
}
