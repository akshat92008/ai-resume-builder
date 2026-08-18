"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Loader2, Save, Plus, Trash2, Brain, Sparkles } from "lucide-react";
import { Alert, Button, Card, CardContent, Textarea, Badge, LoadingState } from "@/components/ui";
import type { CareerProfile } from "@/lib/careerpath/types";

export default function MemoryPage() {
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/app-state")
      .then(async (res) => { if (!res.ok) throw new Error("Could not load your Career Memory."); return res.json(); })
      .then((data) => { if (!cancelled) setProfile(data.workspace?.careerProfile || { skills: [], experience: [], projects: [], achievements: [], gaps: [] }); })
      .catch(() => { if (!cancelled) setMessage({ type: "error", text: "We could not load your Career Memory. Refresh the page and try again." }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true); setMessage(null);
    try {
      const response = await fetch("/api/memory", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      if (!response.ok) throw new Error("Save failed");
      setMessage({ type: "success", text: "Career Memory saved." });
    } catch {
      setMessage({ type: "error", text: "Your changes were not saved. Please try again." });
    } finally { setSaving(false); }
  }

  function handleAddAchievement() { setProfile((prev) => prev ? { ...prev, achievements: [{ id: crypto.randomUUID(), text: "", proofLevel: "weak" }, ...(prev.achievements || [])] } : null); }
  function handleUpdateAchievement(index: number, text: string) { setProfile((prev) => { if (!prev || !prev.achievements) return prev; const achievements = [...prev.achievements]; achievements[index] = { ...achievements[index], text }; return { ...prev, achievements }; }); }
  function handleRemoveAchievement(index: number) { setProfile((prev) => { if (!prev || !prev.achievements) return prev; const achievements = [...prev.achievements]; achievements.splice(index, 1); return { ...prev, achievements }; }); }

  if (loading) return <LoadingState label="Loading your Career Memory..." />;

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Your evidence layer</p><h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Brain className="h-5 w-5" /></span>My Career</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Keep the facts CareerOS can safely use: achievements, projects, experience and skills. Stronger evidence produces stronger applications.</p></div>
        <Button onClick={handleSave} disabled={saving || !profile}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save changes</Button>
      </header>

      {message && <Alert variant={message.type === "success" ? "success" : "error"}>{message.type === "success" ? <Check className="mr-2 inline h-4 w-4" /> : <AlertCircle className="mr-2 inline h-4 w-4" />}{message.text}</Alert>}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <Card><CardContent className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-950">Achievements</h2><p className="mt-1 text-sm text-slate-500">Use specific outcomes, metrics, awards or concrete wins.</p></div><Button size="sm" variant="outline" onClick={handleAddAchievement}><Plus className="mr-1.5 h-4 w-4" />Add win</Button></div><div className="space-y-3">{profile?.achievements?.map((achievement, index) => <div key={achievement.id || index} className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-2"><Textarea value={achievement.text} onChange={(event) => handleUpdateAchievement(index, event.target.value)} placeholder="Example: Reduced onboarding time 35% by automating..." className="min-h-[88px] border-0 bg-transparent shadow-none focus-visible:ring-0" /><Button type="button" variant="ghost" size="icon" aria-label="Remove achievement" className="mt-1 shrink-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleRemoveAchievement(index)}><Trash2 className="h-4 w-4" /></Button></div>)}{(!profile?.achievements || profile.achievements.length === 0) && <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center"><p className="text-sm font-semibold text-slate-700">No achievements yet</p><p className="mt-1 text-sm text-slate-400">Add one strong result CareerOS can use as proof.</p></div>}</div></CardContent></Card>

        <div className="space-y-5">
          <Card><CardContent className="p-5"><h2 className="font-semibold text-slate-950">Memory coverage</h2><p className="mt-1 text-sm leading-6 text-slate-500">These facts are already structured in your profile.</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="secondary">Experience · {profile?.experience?.length || 0}</Badge><Badge variant="secondary">Projects · {profile?.projects?.length || 0}</Badge><Badge variant="secondary">Skills · {profile?.skills?.length || 0}</Badge><Badge variant="secondary">Wins · {profile?.achievements?.length || 0}</Badge></div></CardContent></Card>
          <div className="rounded-3xl bg-slate-950 p-5 text-white"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><Sparkles className="h-4 w-4 text-indigo-300" /></div><h2 className="mt-4 font-semibold">Need a bigger update?</h2><p className="mt-2 text-sm leading-6 text-slate-300">Tell CareerOS about a project, job, skill, or achievement in plain English. The agent can structure it for you.</p><Button asChild variant="secondary" size="sm" className="mt-4"><Link href="/app">Open CareerOS</Link></Button></div>
        </div>
      </div>
    </div>
  );
}
