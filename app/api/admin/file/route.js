import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UP_DIR = path.join(process.cwd(), "data", "uploads");
const KINDS = {
  video: { suffix: "-interview.webm", type: "video/webm" },
  id: { suffix: "-id.jpg", type: "image/jpeg" },
  frame: { suffix: "-frame.jpg", type: "image/jpeg" },
};

export async function GET(req) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const uid = (searchParams.get("uid") || "").replace(/[^\w-]/g, "");
  const kind = KINDS[searchParams.get("kind")];
  if (!uid || !kind) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const file = path.join(UP_DIR, uid + kind.suffix);
  if (!fs.existsSync(file)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(fs.readFileSync(file), { headers: { "Content-Type": kind.type } });
}
