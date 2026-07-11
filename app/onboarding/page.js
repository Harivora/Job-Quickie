"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { extractFields } from "@/lib/resume";
import { CATALOG } from "@/components/SkillUnlock";

const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const FACEAPI = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.js";
const FACE_MODELS = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

const CONSENT_SCRIPT =
  "I am joining JobQuickie. I follow the terms and conditions of JobQuickie. My data will be used to train the AI, and I give my consent through this recording.";

const SUGGESTED = ["JavaScript", "Python", "React", "SQL", "AWS", "Data Analysis", "Marketing", "Sales", "Customer Support", "Nursing", "Teaching", "Accounting"];

function loadScript(src, check) {
  return new Promise((resolve, reject) => {
    if (check()) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}

async function pdfText(file) {
  await loadScript(PDFJS, () => window.pdfjsLib);
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const doc = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = "";
  for (let p = 1; p <= Math.min(doc.numPages, 10); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    text += content.items.map((i) => i.str).join(" ") + "\n";
  }
  return text;
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 loading, 1 profile, 2 interview, 3 id, 4 done
  const [err, setErr] = useState("");

  // step 1 — profile
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [imported, setImported] = useState(false);
  const [saving, setSaving] = useState(false);

  // step 2 — interview
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const frameRef = useRef(null); // captured jpeg blob
  const [camOn, setCamOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [clip, setClip] = useState(null); // Blob
  const [clipUrl, setClipUrl] = useState("");
  const [res, setRes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [secs, setSecs] = useState(0);

  // step 3 — id
  const [idFile, setIdFile] = useState(null);
  const [idUrl, setIdUrl] = useState("");
  const [matching, setMatching] = useState(false);
  const [matchScore, setMatchScore] = useState(null);
  const [matchNote, setMatchNote] = useState("");

  useEffect(() => {
    (async () => {
      const [p, o] = await Promise.all([
        fetch("/api/profile").then((r) => (r.status === 401 ? (router.replace("/"), null) : r.json())),
        fetch("/api/onboarding").then((r) => (r.ok ? r.json() : null)),
      ]);
      if (!p?.user) return;
      const u = p.user;
      setName(u.name || ""); setHeadline(u.headline || ""); setPhone(u.phone || "");
      setLocation(u.location || ""); setWebsite(u.website || ""); setGithub(u.github || "");
      setLinkedin(u.linkedin || ""); setSummary(u.summary || ""); setSkills(u.skills || []);
      if (o?.complete || o?.isAdmin) { router.replace("/dashboard"); return; }
      const ob = o?.onboarding || {};
      setStep(!ob.profileDone ? 1 : !ob.interviewAt ? 2 : 3);
    })();
    return () => stopCam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- step 1 ---------- */

  async function onResume(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParsing(true); setErr("");
    try {
      const text = /pdf/i.test(file.type + file.name) ? await pdfText(file) : await file.text();
      const f = extractFields(text);
      if (f.name && !name) setName(f.name);
      if (f.headline) setHeadline((v) => v || f.headline);
      if (f.phone) setPhone((v) => v || f.phone);
      if (f.location) setLocation((v) => v || f.location);
      if (f.website) setWebsite((v) => v || f.website);
      if (f.github) setGithub((v) => v || f.github);
      if (f.linkedin) setLinkedin((v) => v || f.linkedin);
      if (f.summary) setSummary((v) => v || f.summary);
      setSkills((prev) => [...new Set([...prev, ...f.skills])]);
      setImported(true);
    } catch (e2) { setErr(e2.message || "Could not read that file."); }
    setParsing(false);
  }

  const profileValid = name.trim() && phone.trim() && location.trim() && skills.length >= 3;

  async function saveProfile() {
    if (!profileValid) return;
    setSaving(true); setErr("");
    const res2 = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, headline, phone, location, website, github, linkedin, summary, skills }),
    });
    const d = await res2.json();
    setSaving(false);
    if (!res2.ok) { setErr(d.error || "Could not save."); return; }
    setStep(2);
  }

  /* ---------- step 2 ---------- */

  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startCam() {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920, min: 640 }, height: { ideal: 1080, min: 480 }, facingMode: "user" },
        audio: true,
      });
      const st = stream.getVideoTracks()[0].getSettings();
      if ((st.height || 0) < 480) {
        stream.getTracks().forEach((t) => t.stop());
        setErr("Your camera quality is too low (below 480p). Please use a device with a better camera — a clear video is required.");
        return;
      }
      setRes(`${st.width}×${st.height}${st.height < 720 ? " (below 720p — acceptable, but use your best camera if you have one)" : ""}`);
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; videoRef.current.play(); }
      setCamOn(true);
    } catch {
      setErr("Camera/microphone access was denied. Both are required for the joining interview.");
    }
  }

  function grabFrame() {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    c.toBlob((b) => { frameRef.current = b; }, "image/jpeg", 0.92);
  }

  function startRec() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setClip(blob);
      setClipUrl(URL.createObjectURL(blob));
    };
    rec.start();
    recRef.current = rec;
    setRecording(true);
    setSecs(0);
    const t0 = Date.now();
    const iv = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      setSecs(s);
      if (s === 2) grabFrame(); // face-match still
      if (s >= 30) { clearInterval(iv); stopRec(); }
      if (!recRef.current || recRef.current.state !== "recording") clearInterval(iv);
    }, 500);
  }

  function stopRec() {
    if (recRef.current?.state === "recording") recRef.current.stop();
    setRecording(false);
  }

  async function uploadClip() {
    if (!clip) return;
    if (secs < 5) { setErr("The recording is too short — read the full consent statement (at least 5 seconds)."); return; }
    setUploading(true); setErr("");
    const fd = new FormData();
    fd.append("step", "video");
    fd.append("file", clip, "interview.webm");
    if (frameRef.current) fd.append("frame", frameRef.current, "frame.jpg");
    fd.append("consent", CONSENT_SCRIPT);
    fd.append("res", res);
    const r = await fetch("/api/onboarding", { method: "POST", body: fd });
    const d = await r.json();
    setUploading(false);
    if (!r.ok) { setErr(d.error || "Upload failed."); return; }
    stopCam();
    setStep(3);
  }

  /* ---------- step 3 ---------- */

  async function faceMatch(idImgUrl) {
    // compare the ID photo with the frame captured during the interview
    try {
      setMatching(true);
      await loadScript(FACEAPI, () => window.faceapi);
      const fa = window.faceapi;
      await fa.nets.tinyFaceDetector.loadFromUri(FACE_MODELS);
      await fa.nets.faceLandmark68Net.loadFromUri(FACE_MODELS);
      await fa.nets.faceRecognitionNet.loadFromUri(FACE_MODELS);
      const imgId = await fa.fetchImage(idImgUrl);
      const frameUrl = frameRef.current ? URL.createObjectURL(frameRef.current) : null;
      if (!frameUrl) throw new Error("no frame");
      const imgFrame = await fa.fetchImage(frameUrl);
      const opt = new fa.TinyFaceDetectorOptions({ inputSize: 416 });
      const d1 = await fa.detectSingleFace(imgId, opt).withFaceLandmarks().withFaceDescriptor();
      const d2 = await fa.detectSingleFace(imgFrame, opt).withFaceLandmarks().withFaceDescriptor();
      if (!d1) throw new Error("No face found on the ID — upload a clearer photo of the card.");
      if (!d2) throw new Error("noframe-face");
      const dist = fa.euclideanDistance(d1.descriptor, d2.descriptor);
      const score = Math.max(0, Math.min(1, 1 - dist)); // 1 = identical
      setMatchScore(score);
      setMatchNote(dist < 0.5 ? "Strong match" : dist < 0.62 ? "Likely match" : "Weak match — admin will review manually");
      return { score, note: dist < 0.5 ? "strong" : dist < 0.62 ? "likely" : "weak" };
    } catch (e) {
      const note = e.message?.includes("ID") ? e.message : "Automatic face match unavailable — an administrator will compare manually.";
      setMatchScore(null);
      setMatchNote(note);
      if (e.message?.includes("ID")) throw e;
      return { score: null, note };
    } finally {
      setMatching(false);
    }
  }

  async function onIdFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/image\/(jpeg|png|webp)/.test(f.type)) { setErr("Upload a photo (JPG/PNG) of your government ID."); return; }
    setErr("");
    setIdFile(f);
    setIdUrl(URL.createObjectURL(f));
    setMatchScore(null); setMatchNote("");
  }

  async function submitId() {
    if (!idFile) return;
    setErr("");
    let m = { score: null, note: "" };
    try { m = await faceMatch(idUrl); } catch (e) { setErr(e.message); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("step", "id");
    fd.append("file", idFile, "id.jpg");
    if (m.score !== null) fd.append("matchScore", String(m.score));
    fd.append("matchNote", m.note || "");
    const r = await fetch("/api/onboarding", { method: "POST", body: fd });
    const d = await r.json();
    setUploading(false);
    if (!r.ok) { setErr(d.error || "Upload failed."); return; }
    setStep(4);
    setTimeout(() => router.replace("/dashboard"), 2200);
  }

  /* ---------- render ---------- */

  if (step === 0) return <Loader full label="Preparing your onboarding…" />;

  return (
    <div className="onb">
      <div className="onb-card">
        <div className="brand" style={{ justifyContent: "center", marginBottom: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/logo.svg" alt="" />
          Job<span style={{ color: "#2f7bff" }}>Quickie</span>
        </div>
        <div className="onb-steps">
          {["Profile", "Interview", "Identity"].map((s, i) => (
            <div key={s} className={"onb-step" + (step > i + 1 ? " done" : step === i + 1 ? " now" : "")}>
              <span>{step > i + 1 ? "✓" : i + 1}</span>{s}
            </div>
          ))}
        </div>

        {err && <div className="autherr" style={{ marginBottom: 14 }}>{err}</div>}

        {step === 1 && (
          <>
            <h1 className="pagetitle">Set up your profile</h1>
            <p className="pagesub">Required before you can search jobs. Upload your resume to fill it automatically, or type it in. Fields marked * are mandatory.</p>
            <label className={"btn primary" + (parsing ? " disabled" : "")} style={{ cursor: "pointer", marginBottom: 16 }}>
              {parsing ? "Reading resume…" : imported ? "⬆ Re-upload resume" : "⬆ Upload resume (PDF / TXT)"}
              <input type="file" accept=".pdf,.txt" onChange={onResume} disabled={parsing} style={{ display: "none" }} />
            </label>
            {imported && <div className="authok" style={{ marginBottom: 12 }}>Resume imported — review the fields below, fill anything missing, and continue.</div>}
            <div className="onb-grid">
              <label className="field"><span>Full name *</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="field"><span>Headline</span><input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. AI/ML Engineer" /></label>
              <label className="field"><span>Phone *</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" /></label>
              <label className="field"><span>Location *</span><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" /></label>
              <label className="field"><span>Website</span><input value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
              <label className="field"><span>GitHub</span><input value={github} onChange={(e) => setGithub(e.target.value)} /></label>
              <label className="field"><span>LinkedIn</span><input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} /></label>
            </div>
            <label className="field"><span>Professional summary</span>
              <textarea className="savednote" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </label>
            <div className="field"><span>Skills * — at least 3 ({skills.length}/3)</span>
              <div className="chips-edit">
                {skills.map((s) => (
                  <span key={s} className="chip on" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {s}
                    <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} style={{ background: "none", border: "none", color: "rgba(255,255,255,.85)", cursor: "pointer", padding: 0 }}>×</button>
                  </span>
                ))}
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = skillInput.trim();
                      if (v && !skills.some((x) => x.toLowerCase() === v.toLowerCase())) setSkills([...skills, v]);
                      setSkillInput("");
                    }
                  }}
                  placeholder="Type and press Enter…"
                />
              </div>
              <div className="suggested" style={{ marginTop: 8 }}>
                {SUGGESTED.filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())).slice(0, 8).map((s) => (
                  <button type="button" key={s} className="chip" onClick={() => setSkills([...skills, s])}>+ {s}</button>
                ))}
              </div>
            </div>
            <button className="btn primary block" disabled={!profileValid || saving} onClick={saveProfile} style={{ marginTop: 16 }}>
              {saving ? "Saving…" : profileValid ? "Continue to the joining interview →" : "Fill all * fields to continue"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="pagetitle">Joining interview</h1>
            <p className="pagesub">
              Record a short selfie video reading the statement below. This is your recorded consent and is mandatory to join.
              By recording you agree that the video is stored and reviewed by JobQuickie.
            </p>
            <div className="consent-box">“{CONSENT_SCRIPT}”</div>
            <div className="camwrap">
              {!clipUrl ? (
                <video ref={videoRef} playsInline muted className="campreview" />
              ) : (
                <video src={clipUrl} controls playsInline className="campreview" />
              )}
              {recording && <span className="rec-dot">● REC {secs}s / 30s</span>}
            </div>
            {res && !clipUrl && <div className="panel-hint" style={{ textAlign: "center" }}>Camera: {res}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
              {!camOn && !clipUrl && <button className="btn primary" onClick={startCam}>Enable camera &amp; microphone</button>}
              {camOn && !recording && !clipUrl && <button className="btn primary" onClick={startRec}>● Start recording</button>}
              {recording && <button className="btn danger" onClick={stopRec}>■ Stop</button>}
              {clipUrl && (
                <>
                  <button className="btn" onClick={() => { setClip(null); setClipUrl(""); setCamOn(false); setSecs(0); startCam(); }}>↺ Re-record</button>
                  <button className="btn primary" disabled={uploading} onClick={uploadClip}>{uploading ? "Uploading…" : "Looks good — submit →"}</button>
                </>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="pagetitle">Identity verification</h1>
            <p className="pagesub">
              Upload a clear photo of your government-issued ID card. Your browser compares the ID photo with your interview video on-device;
              the result and documents are reviewed by an administrator. This is the final mandatory step.
            </p>
            {idUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={idUrl} alt="ID preview" className="id-preview" />
            ) : (
              <label className="id-drop">
                <input type="file" accept="image/*" onChange={onIdFile} style={{ display: "none" }} />
                <span>🪪 Tap to upload your ID card photo</span>
              </label>
            )}
            {matchNote && <div className={matchScore !== null && matchScore > 0.38 ? "authok" : "autherr"} style={{ marginTop: 12 }}>{matchNote}{matchScore !== null ? ` (similarity ${(matchScore * 100).toFixed(0)}%)` : ""}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
              {idUrl && <label className="btn" style={{ cursor: "pointer" }}>Change photo<input type="file" accept="image/*" onChange={onIdFile} style={{ display: "none" }} /></label>}
              {idUrl && (
                <button className="btn primary" disabled={matching || uploading} onClick={submitId}>
                  {matching ? "Comparing faces…" : uploading ? "Uploading…" : "Verify & finish →"}
                </button>
              )}
            </div>
          </>
        )}

        {step === 4 && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ fontSize: 44 }}>🎉</div>
            <h1 className="pagetitle">You&apos;re all set!</h1>
            <p className="pagesub">Profile complete, interview recorded, identity submitted. Taking you to the jobs…</p>
            <Loader label="" size={56} />
          </div>
        )}
      </div>
    </div>
  );
}
