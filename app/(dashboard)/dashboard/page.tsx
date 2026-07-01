"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, FileText, Loader2, Plus, Printer, Trash2, TrendingUp, Brain, Target, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState } from "@/components/ui";
import type { CareerPathResume, CareerWorkspaceState } from "@/lib/careerpath/types";

type LoadState = "loading" | "loaded" | "error";

export default function DashboardPage() {
  const [resumes, setResumes] = useState<CareerPathResume[]>([]);
  const [workspace, setWorkspace] = useState<CareerWorkspaceState | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setState("loading");
    try {
      const [resumesRes, stateRes] = await Promise.all([
        fetch("/api/resumes"),
        fetch("/api/app-state")
      ]);
      
      if (resumesRes.ok) {
        const data = await resumesRes.json();
        setResumes(data.resumes || []);
      }
      
      if (stateRes.ok) {
        const data = await stateRes.json();
        setWorkspace(data.workspace || null);
      }
    } catch {
      // Server unavailable
    }
    setState("loaded");
  }

  async function removeResume(id: string) {
    try {
      await fetch(`/api/resume/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    setResumes((current) => current.filter((r) => r.id !== id));
  }

  async function duplicateResume(id: string) {
    try {
      const res = await fetch(`/api/resume/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        await loadData();
        return;
      }
    } catch {
      // ignore
    }
  }

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <DashboardHeader />
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading Career Health...
        </div>
      </div>
    );
  }

  const health = workspace?.careerHealth;
  const profile = workspace?.careerProfile;
  const applications = workspace?.applications ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <DashboardHeader />

      {!workspace ? (
        <EmptyState
          icon={<Brain className="h-10 w-10" />}
          title="No Career Memory built yet"
          description="Open CareerPath AI to paste your messy notes and generate your Career Memory."
          action={<Button asChild><Link href="/app">Open CareerPath AI</Link></Button>}
        />
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Career Health" value={`${health?.overall ?? 0}/100`} icon={TrendingUp} />
            <MetricCard title="Memory Completeness" value={`${health?.memoryCompleteness ?? 0}%`} icon={Brain} />
            <MetricCard title="Latest Resume Score" value={`${health?.resumeScore ?? 0}/100`} icon={CheckCircle2} />
            <MetricCard title="Active Applications" value={health?.applicationCount ?? 0} icon={Target} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Memory Status</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Experience</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{profile?.experience?.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Skills</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{profile?.skills?.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Projects</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{profile?.projects?.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Achievements</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{profile?.achievements?.length ?? 0}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Recent Achievements</h2>
                  <Link href="/app" className="text-sm font-medium text-blue-600 hover:underline">Log new</Link>
                </div>
                {profile?.achievements?.length ? (
                  <ul className="space-y-3">
                    {profile.achievements.slice(0, 3).map((ach, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <span>{ach.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No achievements logged yet.</p>
                )}
              </section>

              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Saved Resumes</h2>
                {resumes.length === 0 ? (
                  <p className="text-sm text-slate-500">No resumes saved yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {resumes.map((resume) => (
                      <div key={resume.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                        <div>
                          <p className="font-semibold text-slate-900">{resume.title}</p>
                          <p className="text-sm text-slate-500">{resume.targetRole} • Score: {resume.score?.overall ?? 0}/100</p>
                        </div>
                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm"><Link href={`/resume/${resume.id}`}>Open</Link></Button>
                          <Button variant="ghost" size="sm" onClick={() => removeResume(resume.id)} className="text-slate-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-slate-900">Skill Gaps</h2>
                </div>
                {profile?.gaps?.length ? (
                  <ul className="space-y-3">
                    {profile.gaps.slice(0, 3).map((gap, i) => (
                      <li key={i} className="text-sm text-slate-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <p className="font-medium text-amber-900">{gap.area.replace("_", " ")}</p>
                        <p className="mt-1 text-amber-700">{gap.question}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No critical skill gaps identified.</p>
                )}
              </section>

              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
                <div className="space-y-2 flex flex-col">
                  <Button asChild variant="outline" className="justify-start"><Link href="/app">Log an achievement</Link></Button>
                  <Button asChild variant="outline" className="justify-start"><Link href="/app">Tailor to a new job</Link></Button>
                  <Button asChild variant="outline" className="justify-start"><Link href="/app">Run ATS Audit</Link></Button>
                </div>
              </section>

              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Active Applications</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Interviewing</span>
                    <Badge variant="secondary">{applications.filter(a => a.status === 'interview').length}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Follow-up Needed</span>
                    <Badge variant="secondary">{applications.filter(a => a.status === 'follow_up_needed').length}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Applied</span>
                    <Badge variant="secondary">{applications.filter(a => a.status === 'applied').length}</Badge>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardHeader() {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Career Health Center</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Track your career health, memory completeness, and resume readiness.</p>
      </div>
      <Button asChild>
        <Link href="/app">
          <Plus className="mr-2 h-4 w-4" />
          New Memory
        </Link>
      </Button>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: any }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm flex flex-col">
      <div className="flex items-center gap-2 text-slate-500 mb-2">
        <Icon className="h-4 w-4" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
