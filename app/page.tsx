"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
type Doc = { id: string; title: string; path: string; status: string; page_count: number | null; error: string | null; created_at: string };
type Msg = { role: string; content: string };
const NAV = ["Dashboard", "My Library", "AI Teacher"];
const btn = "rounded-lg bg-violet-600 px-4 py-2.5 font-medium hover:bg-violet-500 disabled:opacity-50";
const box = "rounded-xl border border-white/10 bg-white/5 p-4";
const inp = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5";

async function api(path: string, body: any) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Request failed");
  return j;
}

export default function App() {
  const [session, setSession] = useState<any>(undefined);
  const [view, setView] = useState("Dashboard");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [open, setOpen] = useState("");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  const load = async () => { const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false }); setDocs(data || []); };
  useEffect(() => { if (session) load(); }, [session]);
  const study = (id: string) => { setOpen(id); setView("AI Teacher"); };
  if (session === undefined) return <p className="p-6">Loading…</p>;
  if (!session) return <Auth />;
  return (
    <div className="min-h-screen md:flex">
      <nav className="fixed bottom-0 left-0 right-0 z-10 flex justify-around border-t border-white/10 bg-[#0B0B14] p-2 md:static md:w-56 md:flex-col md:justify-start md:gap-1 md:border-r md:border-t-0 md:p-4">
        <p className="mb-4 hidden text-lg font-bold text-violet-400 md:block">AI University</p>
        {NAV.map((n) => (<button key={n} onClick={() => setView(n)} className={`rounded-lg px-3 py-2 text-left text-sm ${view === n ? "bg-violet-600/30 text-violet-200" : "text-white/70"}`}>{n}</button>))}
        <button onClick={() => supabase.auth.signOut()} className="rounded-lg px-3 py-2 text-left text-sm text-white/50 md:mt-auto">Sign out</button>
      </nav>
      <main className="mx-auto w-full max-w-3xl p-4 pb-24 md:p-8">
        {view === "Dashboard" && <Dashboard docs={docs} go={study} />}
        {view === "My Library" && <Library docs={docs} reload={load} go={study} />}
        {view === "AI Teacher" && <Teacher docs={docs.filter((d) => d.status === "ready")} initial={open} />}
      </main>
    </div>
  );
}

function Auth() {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [up, setUp] = useState(false);
  const go = async () => {
    setErr("");
    const { error, data } = up ? await supabase.auth.signUp({ email, password: pw }) : await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setErr(error.message); else if (up && !data.session) setErr("Check your email to confirm your account, then sign in.");
  };
  return (
    <div className="mx-auto mt-24 max-w-sm space-y-3 p-4">
      <h1 className="text-2xl font-bold text-violet-400">AI University</h1>
      <input className={inp} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={inp} type="password" placeholder="Password (min 6)" value={pw} onChange={(e) => setPw(e.target.value)} />
      {err && <p className="text-sm text-amber-300">{err}</p>}
      <button className={btn + " w-full"} onClick={go}>{up ? "Create account" : "Sign in"}</button>
      <button className="w-full text-sm text-white/60" onClick={() => setUp(!up)}>{up ? "I have an account" : "New here? Create an account"}</button>
    </div>
  );
}

function Dashboard({ docs, go }: { docs: Doc[]; go: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <div className="grid grid-cols-2 gap-3"><div className={box}><p className="text-3xl font-bold">{docs.length}</p><p className="text-sm text-white/60">Documents</p></div><div className={box}><p className="text-3xl font-bold">{docs.filter((d) => d.status === "ready").length}</p><p className="text-sm text-white/60">Ready to study</p></div></div>
      <h2 className="font-semibold">Recent documents</h2>
      {docs.slice(0, 5).map((d) => (<button key={d.id} onClick={() => d.status === "ready" && go(d.id)} className={box + " w-full text-left"}>{d.title}<span className="ml-2 text-xs text-white/50">{d.status}</span></button>))}
      {!docs.length && <p className="text-white/60">Upload your first book in My Library.</p>}
    </div>
  );
}

function Library({ docs, reload, go }: { docs: Doc[]; reload: () => void; go: (id: string) => void }) {
  const [busy, setBusy] = useState(""); const [err, setErr] = useState(""); const [q, setQ] = useState("");
  const upload = async (f: File) => {
    setErr(""); setBusy("Uploading…");
    try {
      const { data: u } = await supabase.auth.getUser(); const id = crypto.randomUUID();
      const path = `${u.user!.id}/${id}.${f.name.toLowerCase().endsWith(".txt") ? "txt" : "pdf"}`;
      const up = await supabase.storage.from("documents").upload(path, f); if (up.error) throw up.error;
      const ins = await supabase.from("documents").insert({ id, title: f.name, path }); if (ins.error) throw ins.error;
      reload(); setBusy("Reading the book…"); await api("/api/ingest", { id });
    } catch (e: any) { setErr(e.message); }
    setBusy(""); reload();
  };
  const del = async (d: Doc) => { if (!confirm(`Delete “${d.title}”?`)) return; await supabase.storage.from("documents").remove([d.path]); await supabase.from("documents").delete().eq("id", d.id); reload(); };
  const rename = async (d: Doc) => { const t = prompt("New name", d.title); if (t) { await supabase.from("documents").update({ title: t }).eq("id", d.id); reload(); } };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Library</h1>
      <input type="file" accept=".pdf,.txt" disabled={!!busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="block w-full text-sm" />
      {busy && <p className="text-violet-300">{busy}</p>}{err && <p className="text-amber-300">{err}</p>}
      <input className={inp} placeholder="Search documents" value={q} onChange={(e) => setQ(e.target.value)} />
      {docs.filter((d) => d.title.toLowerCase().includes(q.toLowerCase())).map((d) => (
        <div key={d.id} className={box}>
          <p className="font-medium">{d.title}</p>
          <p className="text-xs text-white/50">{d.status}{d.page_count ? ` · ${d.page_count} pages` : ""}{d.error ? ` · ${d.error}` : ""}</p>
          <div className="mt-3 flex gap-3 text-sm">{d.status === "ready" && <button className="text-violet-300" onClick={() => go(d.id)}>Study</button>}<button onClick={() => rename(d)}>Rename</button><button className="text-red-300" onClick={() => del(d)}>Delete</button></div>
        </div>))}
    </div>
  );
}

function Teacher({ docs, initial }: { docs: Doc[]; initial: string }) {
  const [doc, setDoc] = useState(initial || docs[0]?.id || ""); const [mode, setMode] = useState("chat"); const [lang, setLang] = useState("Hinglish");
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { if (doc) supabase.from("messages").select("role,content").eq("document_id", doc).order("id").then(({ data }) => setMsgs(data || [])); }, [doc]);
  const send = async () => {
    if (!text.trim() || !doc) return; const m = text; setText(""); setErr(""); setBusy(true); setMsgs((x) => [...x, { role: "user", content: m }]);
    try { const r = await api("/api/chat", { documentId: doc, message: m, mode, language: lang }); setMsgs((x) => [...x, { role: "assistant", content: r.answer }]); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  if (!docs.length) return <p className="text-white/60">Upload a PDF or TXT in My Library first.</p>;
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">AI Teacher</h1>
      <select className={inp} value={doc} onChange={(e) => setDoc(e.target.value)}>{docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select>
      <div className="flex gap-2"><select className={inp} value={mode} onChange={(e) => setMode(e.target.value)}><option value="chat">Ask a question</option><option value="questions">Important questions</option><option value="teach">Teach a topic</option></select>
        <select className={inp} value={lang} onChange={(e) => setLang(e.target.value)}>{["Hinglish", "Hindi", "English", "Assamese"].map((l) => <option key={l}>{l}</option>)}</select></div>
      <div className="space-y-3">{msgs.map((m, i) => (<div key={i} className={`whitespace-pre-wrap rounded-xl p-3 ${m.role === "user" ? "ml-8 bg-violet-600/20" : "mr-4 bg-white/5"}`}>{m.content}</div>))}{busy && <p className="text-white/50">Thinking…</p>}</div>
      {err && <p className="text-amber-300">{err}</p>}
      <div className="flex gap-2"><input className={inp} placeholder={mode === "chat" ? "Ask about this book" : "Topic or chapter"} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} /><button className={btn} onClick={send} disabled={busy}>Send</button></div>
    </div>
  );
}
