import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listUsers, setUserStatus } from "@/lib/db";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin" || session.status !== "approved") {
    return null;
  }
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ users: listUsers() });
}

export async function POST(req) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, action } = await req.json();
    if (!["approved", "rejected", "pending"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const user = setUserStatus(id, action);
    const { passwordHash, ...safe } = user;
    return NextResponse.json({ user: safe });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
