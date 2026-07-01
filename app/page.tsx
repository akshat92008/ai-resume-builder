import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Brain, FileText, Settings, ShieldCheck, MessageSquare, Briefcase, FileBadge, Linkedin, Send, Compass, Award, Sparkles, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";

const steps = [
  ["Memory", "Paste messy notes, old resumes, or achievements. We build a structured Career Memory."],
  ["Resume", "Generate a proof-based, ATS-friendly resume from your Memory in seconds."],
  ["Tailor", "Drop in a job description to tailor your resume without keyword stuffing."],
  ["Audit", "Get a harsh but fair ATS audit flagging weak bullets and missing metrics."],
  ["Coach", "Receive proactive career advice, interview prep, and missing skill alerts."],
];

const modules = [
  { icon: Brain, title: "Career Memory", desc: "Your single source of truth for all career data." },
  { icon: FileText, title: "Resume Builder", desc: "Generate ATS-friendly resumes instantly." },
  { icon: Settings, title: "Job Tailoring", desc: "Align your resume to specific job descriptions." },
  { icon: ShieldCheck, title: "ATS Audit", desc: "Identify and fix weak bullets and timeline issues." },
  { icon: MessageSquare, title: "Cover Letters", desc: "Write tailored cover letters automatically." },
  { icon: Linkedin, title: "LinkedIn Optimizer", desc: "Generate optimized profile sections." },
  { icon: Briefcase, title: "Job Intelligence", desc: "Extract hidden expectations from JDs." },
  { icon: Send, title: "Application Tracker", desc: "Track jobs and follow-ups in one place." },
  { icon: Compass, title: "Career Coach", desc: "Get AI-driven insights and next steps." },
  { icon: Award, title: "Achievement Logger", desc: "Log wins periodically so you never forget them." },
  { icon: FileBadge, title: "Smart Versions", desc: "Save multiple versions for different roles." },
  { icon: Sparkles, title: "Auto-Improve", desc: "Let AI rewrite weak bullets with strong verbs." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main>
        <section className="border-b bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-24 text-center">
            <Badge className="bg-white text-blue-700 ring-1 ring-blue-100 hover:bg-white mb-6">CareerPath AI by Amaura Labs</Badge>
            <h1 className="mx-auto max-w-5xl text-5xl font-bold tracking-tight text-slate-950 sm:text-7xl">
              Your AI Career Memory.<br/>Store once. Generate forever.
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-600">
              Paste your career notes once. Get resumes, cover letters, ATS audits, LinkedIn copy, job tailoring, and career coaching — all from a single source of truth.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/app">
                  Build Your Memory <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">One system. Endless career documents.</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-5">
            {steps.map(([title, text]) => (
              <Card key={title} className="bg-slate-50 border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-slate-600">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">The Modules</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">Everything you need for your career loop.</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {modules.map((mod) => (
                <div key={mod.title} className="flex flex-col rounded-xl border bg-white p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <mod.icon className="h-5 w-5 text-blue-700" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{mod.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{mod.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Stop repeating yourself.</h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-slate-200">
              <CardHeader className="border-b bg-slate-50 pb-4">
                <CardTitle className="text-slate-500">Before: Messy Notes</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm leading-6 text-slate-600 italic">
                  "I know react next js supabase made ai resume builder and ai tutor did cs50p python made some websites learning python bca admission maybe no work experience. Also increased sales by 20% but I forget when."
                </p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 ring-1 ring-blue-50">
              <CardHeader className="border-b bg-blue-50 pb-4">
                <CardTitle className="text-blue-900">After: Structured Memory & Documents</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 text-sm leading-6 text-slate-700">
                <div className="flex gap-2 items-start"><CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> <p><strong>Memory Built:</strong> Extracted React, Next.js, Python, Supabase into Skills. Added AI Resume Builder to Projects.</p></div>
                <div className="flex gap-2 items-start"><CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> <p><strong>Resume Bullet:</strong> Built an AI resume builder using React and Supabase to turn rough user notes into structured resume content.</p></div>
                <div className="flex gap-2 items-start"><CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" /> <p><strong>Audit Flag:</strong> "Increased sales by 20%" lacks context. What project was this for? (Safety: Not added to resume yet).</p></div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y bg-slate-950 text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">Pro Tier</p>
              <h2 className="mt-3 text-4xl font-bold">Start building your Career Memory today.</h2>
              <p className="mt-4 text-lg text-slate-300">Free during launch. Paid plans will unlock unlimited resumes, advanced tailoring, and multiple persona versions.</p>
            </div>
            <Button size="lg" asChild className="bg-blue-600 text-white hover:bg-blue-500 whitespace-nowrap">
              <Link href="/app">
                Get Started for Free <Sparkles className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-white px-4 py-12 text-center text-sm text-slate-500 border-t">
        <div className="font-semibold text-slate-900">CareerPath AI by Amaura Labs.</div>
        <div className="mt-6 flex flex-wrap justify-center gap-6">
          <Link href="/app" className="hover:text-slate-900 transition-colors">Career Memory</Link>
          <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Dashboard</Link>
          <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
