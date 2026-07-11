"use client";
import Icon from "@/components/Icons";
import { useEffect, useRef, useState } from "react";

// QuickieBot — an assistant that understands plain-language job requests,
// applies the matching dashboard filters, and shows the best openings.
// Runs fully client-side against the live job data.

const STOP = new Set("i,a,an,the,and,or,to,in,at,of,for,with,me,my,any,some,please,find,show,get,want,need,looking,look,search,job,jobs,position,positions,role,roles,opening,openings,opportunity,opportunities,work,working,that,pay,paying,paid,good,best,new,list".split(","));

function parse(text, countryNames) {
  const t = " " + text.toLowerCase().replace(/[^\w\s-]/g, " ") + " ";
  const out = { q: "", tab: "all", jtype: "all", when: "any", forYou: false, country: null };
  if (/\bremote\b/.test(t)) out.tab = "remote";
  else if (/\bhybrid\b/.test(t)) out.tab = "hybrid";
  else if (/on.?site|office/.test(t)) out.tab = "onsite";
  if (/intern(ship)?s?\b|trainee|fresher/.test(t)) out.jtype = "intern";
  else if (/part.?time/.test(t)) out.jtype = "part";
  else if (/contract|freelance/.test(t)) out.jtype = "contract";
  else if (/full.?time/.test(t)) out.jtype = "full";
  if (/today|24 ?h|last day/.test(t)) out.when = "d1";
  else if (/this week|7 ?days?|recent/.test(t)) out.when = "d7";
  else if (/this month|30 ?days?/.test(t)) out.when = "d30";
  if (/my skills?|for me|match(ing|es)? me/.test(t)) out.forYou = true;
  const byLen = [...countryNames].sort((a, b) => b.length - a.length);
  for (const c of byLen) {
    if (t.includes(" " + c.toLowerCase() + " ")) { out.country = c; break; }
  }
  const drop = new Set(["remote", "hybrid", "onsite", "site", "on", "internship", "internships", "intern", "trainee", "fresher", "part", "full", "time", "contract", "freelance", "today", "week", "month", "days", "day", "recent", "skills", "skill", "matching", "match", ...((out.country || "").toLowerCase().split(" "))]);
  out.q = t.split(/\s+/).filter((w) => w && !STOP.has(w) && !drop.has(w) && w.length > 1).join(" ").trim();
  return out;
}

const SUGGESTIONS = [
  "Remote AI engineer jobs",
  "Internships posted this week",
  "Jobs matching my skills",
  "Part-time design jobs",
];

export default function JobBot({ jobs, countryNames, mySkills, onApply }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { who: "bot", text: "Hi! I'm QuickieBot. Tell me what you're looking for — e.g. “remote react jobs in Germany” or “internships posted this week” — and I'll set the filters and pull the best matches." },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);
  const bodyRef = useRef(null);
  const recogRef = useRef(null);

  useEffect(() => {
    setVoiceOk(typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  function voice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recogRef.current?.stop(); return; }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.onresult = (e) => {
      const t = [...e.results].map((x) => x[0].transcript).join("");
      setInput(t);
      if (e.results[e.results.length - 1].isFinal) { setListening(false); ask(t); }
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  }

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  function localMatches(p) {
    let f = jobs;
    if (p.tab !== "all") f = f.filter((j) => j.mode === p.tab);
    if (p.country) f = f.filter((j) => j._countries?.includes(p.country) || (j._worldwide && j.mode === "remote"));
    if (p.jtype === "intern") f = f.filter((j) => /intern|trainee|working student/i.test(j.type + " " + j.title));
    else if (p.jtype === "part") f = f.filter((j) => /part.?time/i.test(j.type + " " + j.title));
    else if (p.jtype === "contract") f = f.filter((j) => /contract|freelance/i.test(j.type + " " + j.title));
    else if (p.jtype === "full") f = f.filter((j) => /full.?time/i.test(j.type + " " + j.title) || !j.type);
    if (p.when !== "any") {
      const ms = { d1: 864e5, d7: 7 * 864e5, d30: 30 * 864e5 }[p.when];
      f = f.filter((j) => Date.now() - new Date(j.date).getTime() < ms);
    }
    if (p.forYou && mySkills.length) f = f.filter((j) => mySkills.some((s) => j.hay.includes(s.toLowerCase())));
    if (p.q) {
      const terms = p.q.split(" ");
      f = f.filter((j) => terms.every((w) => j.hay.includes(w)));
      if (!f.length) f = jobs.filter((j) => terms.some((w) => j.hay.includes(w)));
    }
    return f.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function describe(p, n) {
    const bits = [];
    if (p.jtype !== "all") bits.push({ intern: "internship", part: "part-time", contract: "contract", full: "full-time" }[p.jtype]);
    if (p.tab !== "all") bits.push(p.tab === "onsite" ? "on-site" : p.tab);
    if (p.q) bits.push(`“${p.q}”`);
    const where = p.country ? ` in ${p.country}` : "";
    const whenTxt = { d1: " from the last 24h", d7: " from this week", d30: " from this month", any: "" }[p.when];
    const skillTxt = p.forYou ? " matching your skills" : "";
    return `Found ${n.toLocaleString()} ${bits.join(" ")} job${n === 1 ? "" : "s"}${skillTxt}${where}${whenTxt}.`;
  }

  function ask(text) {
    if (!text.trim()) return;
    const p = parse(text, countryNames);
    if (p.forYou && !mySkills.length) {
      setMsgs((m) => [...m, { who: "user", text }, { who: "bot", text: "You haven't added any skills to your profile yet — open Profile, add a few (React, Sales, Nursing…), and I can match jobs to you personally." }]);
      setInput("");
      return;
    }
    const matches = localMatches(p);
    onApply(p);
    const reply = matches.length
      ? { who: "bot", text: describe(p, matches.length) + " I've applied those filters below. Top picks:", jobs: matches.slice(0, 5) }
      : { who: "bot", text: "Hmm, nothing matches that exactly. I've applied the closest filters — try broadening the search (fewer keywords, or drop the location)." };
    setMsgs((m) => [...m, { who: "user", text }, reply]);
    setInput("");
  }

  return (
    <>
      <button className={"botfab" + (open ? " open" : "")} onClick={() => setOpen(!open)} aria-label="Job assistant">
        {open ? (
          "✕"
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.svg" alt="QuickieBot" className="botfab-logo" />
        )}
      </button>
      {open && (
        <div className="botpanel">
          <div className="bot-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="bot-head-logo" />
            <span className="bot-dot" /> QuickieBot
            <span className="bot-sub">your job-search copilot</span>
          </div>
          <div className="bot-body" ref={bodyRef}>
            {msgs.map((m, i) => (
              <div key={i} className={"bmsg " + m.who}>
                <div className="bmsg-text">{m.text}</div>
                {m.jobs && (
                  <div className="bmsg-jobs">
                    {m.jobs.map((j, k) => (
                      <a key={k} href={j.url} target="_blank" rel="noopener noreferrer" className="bjob">
                        <b>{j.title.slice(0, 55)}</b>
                        <span>{j.company}{j.location ? ` · ${j.location.slice(0, 30)}` : ""}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {msgs.length === 1 && (
              <div className="bot-sugg">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>
          <form className="bot-input" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Listening… speak now" : "e.g. remote python jobs in India…"}
            />
            {voiceOk && (
              <button
                type="button"
                className={"btn micbtn" + (listening ? " live" : "")}
                onClick={voice}
                title={listening ? "Stop listening" : "Search by voice"}
              >
                <Icon name="mic" size={16} />
              </button>
            )}
            <button className="btn primary" type="submit">Send</button>
          </form>
        </div>
      )}
    </>
  );
}
