import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getJobs();
  return NextResponse.json(data);
}
