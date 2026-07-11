import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";
import { getUserById, setOnboarding, onboardingComplete } from "@/lib/db";

export const dynamic = "force-dynamic";

const UP_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_VIDEO = 25 * 1024 * 1024;
const MAX_IMAGE = 8 * 1024 * 1024;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = getUserById(session.sub);
  const o = user?.onboarding || {};
  return NextResponse.json({
    onboarding: o,
    complete: onboardingComplete(user || { role: session.role, onboarding: o }),
    isAdmin: session.role === "admin",
  });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let form;
  try { form = await req.formData(); } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  const step = form.get("step");
  const file = form.get("file");

  try {
    fs.mkdirSync(UP_DIR, { recursive: true });
    if (step === "video") {
      if (!file || typeof file === "string") throw new Error("Missing video");
      if (file.size > MAX_VIDEO) throw new Error("Video too large (max 25 MB) — record a shorter clip.");
      const buf = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(UP_DIR, `${session.sub}-interview.webm`), buf);
      // an optional still frame captured during recording (for face match)
      const frame = form.get("frame");
      if (frame && typeof frame !== "string" && frame.size <= MAX_IMAGE) {
        fs.writeFileSync(path.join(UP_DIR, `${session.sub}-frame.jpg`), Buffer.from(await frame.arrayBuffer()));
      }
      const onboarding = setOnboarding(session.sub, {
        interviewAt: new Date().toISOString(),
        consentText: String(form.get("consent") || "").slice(0, 500),
        videoRes: String(form.get("res") || ""),
      });
      return NextResponse.json({ ok: true, onboarding });
    }
    if (step === "id") {
      if (!file || typeof file === "string") throw new Error("Missing ID image");
      if (file.size > MAX_IMAGE) throw new Error("Image too large (max 8 MB).");
      const buf = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(UP_DIR, `${session.sub}-id.jpg`), buf);
      const score = parseFloat(form.get("matchScore"));
      const onboarding = setOnboarding(session.sub, {
        idAt: new Date().toISOString(),
        faceMatch: Number.isFinite(score) ? score : null,
        faceMatchNote: String(form.get("matchNote") || "").slice(0, 200),
      });
      const user = getUserById(session.sub);
      return NextResponse.json({ ok: true, onboarding, complete: onboardingComplete(user) });
    }
    throw new Error("Unknown step");
  } catch (e) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 400 });
  }
}
