import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserById, updateProfile, changePassword } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = getUserById(session.sub);
  if (!user) {
    // User record missing (e.g. datastore reset on redeploy) — fall back to
    // the signed session so the profile page still works.
    return NextResponse.json({
      user: {
        id: session.sub,
        name: session.name || "",
        email: session.email,
        role: session.role || "user",
        status: session.status || "approved",
        createdAt: null,
        skills: [],
        recordMissing: true,
      },
    });
  }
  return NextResponse.json({ user: { ...user, skills: user.skills || [] } });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { body = {}; }
  if (!getUserById(session.sub)) {
    return NextResponse.json(
      { error: "Your account record was reset on the server. Please sign out and register again to save changes." },
      { status: 409 }
    );
  }
  try {
    if (body.currentPassword || body.newPassword) {
      changePassword(session.sub, body.currentPassword || "", body.newPassword || "");
    }
    const user = updateProfile(session.sub, {
      name: body.name,
      skills: body.skills,
      headline: body.headline,
      phone: body.phone,
      location: body.location,
      website: body.website,
      github: body.github,
      linkedin: body.linkedin,
      summary: body.summary,
    });
    return NextResponse.json({ user: { ...user, skills: user.skills || [] } });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Update failed" }, { status: 400 });
  }
}
