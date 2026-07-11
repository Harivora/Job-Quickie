import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSettings, setSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: getSettings() });
}

export async function PUT(req) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const settings = setSettings({ autoApproveSeekers: !!body.autoApproveSeekers });
  return NextResponse.json({ settings });
}
