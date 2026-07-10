"use client";
import { useRouter } from "next/navigation";

export default function Pending() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }
  return (
    <div className="landing" style={{ alignItems: "center", justifyContent: "center" }}>
      <div className="authcard" style={{ textAlign: "center", maxWidth: 440 }}>
        <h2>Awaiting approval</h2>
        <div className="hint" style={{ marginTop: 8 }}>
          Your account has been created but an administrator has not approved
          it yet. You will be able to access the dashboard once approved —
          try signing in again later.
        </div>
        <button className="btn primary block" style={{ marginTop: 14 }} onClick={logout}>
          Back to sign in
        </button>
      </div>
    </div>
  );
}
