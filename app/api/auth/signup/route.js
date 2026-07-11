import { NextResponse } from "next/server";
import { createUser } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const { name, email, password, accountType } = await req.json();
    if (!name || !email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Name, email and a password of at least 6 characters are required." },
        { status: 400 }
      );
    }
    const user = createUser({
      name,
      email,
      password,
      accountType: accountType === "employer" ? "employer" : "seeker",
    });
    await createSession(user);
    return NextResponse.json({ status: user.status, role: user.role });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
