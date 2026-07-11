import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Free translation with two providers: Google's public gtx endpoint,
// falling back to MyMemory. No API keys required.

async function viaGoogle(text, tl) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`gtx ${res.status}`);
  const d = await res.json();
  const out = (d[0] || []).map((seg) => seg[0]).join("");
  if (!out) throw new Error("gtx empty");
  return out;
}

async function viaMyMemory(text, tl) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 490))}&langpair=autodetect|${encodeURIComponent(tl)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const d = await res.json();
  const out = d?.responseData?.translatedText;
  if (!out) throw new Error("mymemory empty");
  return out;
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const text = String(body.text || "").slice(0, 2500);
  const tl = String(body.tl || "en").slice(0, 8);
  if (!text.trim()) return NextResponse.json({ error: "Nothing to translate" }, { status: 400 });
  try {
    const translated = await viaGoogle(text, tl);
    return NextResponse.json({ translated });
  } catch {
    try {
      const translated = await viaMyMemory(text, tl);
      return NextResponse.json({ translated });
    } catch {
      return NextResponse.json({ error: "Translation service unavailable right now — try again shortly." }, { status: 502 });
    }
  }
}
