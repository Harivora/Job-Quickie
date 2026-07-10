import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const user = verifyUser(email || "", password || "");
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    if (user.status === "rejected") {
      return NextResponse.json({ error: "Your access request was declined." }, { status: 403 });
    }
    await createSession(user);
    return NextResponse.json({ status: user.status, role: user.role });
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 400 });
  }
}
