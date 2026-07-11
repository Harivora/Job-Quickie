"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import Nav from "@/components/Nav";

export default function Admin() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoApprove, setAutoApprove] = useState(null); // null until loaded
  const [savingSetting, setSavingSetting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.settings) setAutoApprove(!!d.settings.autoApproveSeekers);
    }).catch(() => {});
  }, []);

  async function toggleAutoApprove() {
    const next = !autoApprove;
    setSavingSetting(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoApproveSeekers: next }),
    });
    if (res.ok) setAutoApprove(next);
    else setError("Could not save the setting.");
    setSavingSetting(false);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.status === 401) { router.push("/"); return; }
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function act(id, action) {
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (!res.ok) { setError("Action failed."); return; }
    load();
  }

  const pending = users.filter((u) => u.status === "pending");
  const others = users.filter((u) => u.status !== "pending");

  const Row = ({ u }) => (
    <tr>
      <td>{u.name}</td>
      <td>{u.email}</td>
      <td><span className={"pill " + u.status}>{u.status}</span></td>
      <td>{u.accountType === "employer" ? "Employer" : u.role === "admin" ? "Admin" : "Job seeker"}</td>
      <td>
        {u.onboarding?.idAt ? (
          <span className="idcell">
            {u.onboarding.faceMatch != null
              ? <span className={"pill " + (u.onboarding.faceMatch > 0.5 ? "approved" : u.onboarding.faceMatch > 0.38 ? "pending" : "rejected")}>
                  face {(u.onboarding.faceMatch * 100).toFixed(0)}%
                </span>
              : <span className="pill pending">manual check</span>}
            <a href={`/api/admin/file?uid=${u.id}&kind=video`} target="_blank" rel="noreferrer">video</a>
            <a href={`/api/admin/file?uid=${u.id}&kind=id`} target="_blank" rel="noreferrer">ID</a>
          </span>
        ) : u.onboarding?.interviewAt ? (
          <span className="pill pending">interview only</span>
        ) : u.role === "admin" ? "—" : (
          <span className="pill rejected">not verified</span>
        )}
      </td>
      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
      <td>
        <div className="actions">
          {u.status !== "approved" && (
            <button className="btn success" onClick={() => act(u.id, "approved")}>Approve</button>
          )}
          {u.status !== "rejected" && u.role !== "admin" && (
            <button className="btn danger" onClick={() => act(u.id, "rejected")}>Reject</button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <Nav />

      <main className="wrap" style={{ paddingBottom: 40 }}>
        <h1 className="pagetitle" style={{ paddingTop: 20 }}>Member management</h1>
        <p className="pagesub">Approve access requests and manage existing members.</p>
        {error && <div className="banner">{error}</div>}

        <div className="panel setting-panel">
          <div>
            <div className="panel-title" style={{ marginBottom: 2 }}>Auto-approve job seekers</div>
            <div className="panel-hint" style={{ margin: 0 }}>
              When on, new registrations that choose “I&apos;m looking for a job” are approved instantly.
              Employer / recruiter accounts always wait for your manual review.
            </div>
          </div>
          <button
            className={"switch-toggle" + (autoApprove ? " on" : "")}
            onClick={toggleAutoApprove}
            disabled={autoApprove === null || savingSetting}
            aria-label="Toggle auto-approval of job seekers"
          >
            <span className="knob" />
          </button>
        </div>

        <h2 className="section-title">Pending approval ({pending.length})</h2>
        {loading ? (
          <div className="state"><Loader label="Loading requests…" size={56} /></div>
        ) : pending.length === 0 ? (
          <div className="state">No pending access requests.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Type</th><th>Identity</th><th>Requested</th><th>Actions</th></tr></thead>
            <tbody>{pending.map((u) => <Row key={u.id} u={u} />)}</tbody>
          </table>
        )}

        <h2 className="section-title">All members ({others.length})</h2>
        {!loading && others.length > 0 && (
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Type</th><th>Identity</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>{others.map((u) => <Row key={u.id} u={u} />)}</tbody>
          </table>
        )}
      </main>
    </div>
  );
}
