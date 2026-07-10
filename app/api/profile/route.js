import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserById, updateProfile, changePassword } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = getUserById(session.sub);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user: { ...user, skills: user.skills || [] } });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { body = {}; }
  try {
    if (body.currentPassword || body.newPassword) {
      changePassword(session.sub, body.currentPassword || "", body.newPassword || "");
    }
    const user = updateProfile(session.sub, { name: body.name, skills: body.skills });
    return NextResponse.json({ user: { ...user, skills: user.skills || [] } });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Update failed" }, { status: 400 });
  }
}
