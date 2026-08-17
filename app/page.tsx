import Link from "next/link";
import { ArrowRight, Brain, Briefcase, CheckCircle2, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";

const steps = [
  {
    icon: Brain,
    title: "Tell us about you once",
    text: "Paste an old resume, messy notes, projects, achievements, or experience. CareerOS turns them into a reusable Career Memory.",
  },
  {
    icon: Briefcase,
    title: "Give us a job",
    text: "Paste a job description and see whether it is worth your time: Apply, Consider, or Skip — with the evidence behind the recommendation.",
  },
  {
    icon: Sparkles,
    title: "Build the application",
    text: "CareerOS creates the strongest truthful version of your resume and application material for that opportunity without inventing experience.",
  },
  {
    icon: RefreshCcw,
    title: "Track what happens",
    text: "Record interviews, rejections, and offers. CareerLoop learns from your outcomes so the next decision can be better than the last.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main>
        <section className="border-b bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:py-28">
            <Badge className="mb-6 bg-white text-blue-700 ring-1 ring-blue-100 hover:bg-white">
              CareerOS by Amaura Labs · Free beta
            </Badge>
            <h1 className="mx-auto max-w-5xl text-5xl font-bold tracking-tight text-slate-950 sm:text-7xl">
              Stop guessing which jobs are worth your time.
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-600">
              Tell CareerOS about yourself once. Give it a job. It helps you decide whether to apply, builds a truthful tailored application, tracks the result, and learns what actually works for you.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/app">
                  Try the free beta <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Login</Link>
              </Button>
            </div>
            <div className="mx-auto mt-6 flex max-w-xl items-start justify-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Free during beta with fair-use AI limits. CareerOS optimizes your evidence — it does not invent skills, experience, or achievements.</span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Four simple steps</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">The complexity stays underneath.</h2>
            <p className="mt-4 text-slate-600">You should not have to learn a dozen AI tools just to apply for a job.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Card key={step.title} className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-slate-300">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y bg-slate-950 text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">Built around outcomes</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight">Your resume is only one part of the job search.</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                CareerOS keeps the job, the exact resume version, your fit analysis, and the eventual outcome connected. Over time, CareerLoop can show you what is actually producing interviews instead of giving you another arbitrary score.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="space-y-4 text-sm text-slate-200">
                {["Should I apply to this job?", "What evidence should my application emphasize?", "Which resume version is performing best?", "Where is my job-search funnel failing?"].map((question) => (
                  <div key={question} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <span>{question}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Bring one real job. See what CareerOS does with it.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">The beta is free. We are using early-user feedback and real job-search outcomes to make the system more reliable before paid plans are introduced.</p>
          <Button size="lg" asChild className="mt-8">
            <Link href="/app">Open CareerOS <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </section>
      </main>

      <footer className="border-t bg-white px-4 py-12 text-center text-sm text-slate-500">
        <div className="font-semibold text-slate-900">CareerOS by Amaura Labs</div>
        <div className="mt-6 flex flex-wrap justify-center gap-6">
          <Link href="/app" className="transition-colors hover:text-slate-900">Workspace</Link>
          <Link href="/dashboard" className="transition-colors hover:text-slate-900">My work</Link>
          <Link href="/privacy" className="transition-colors hover:text-slate-900">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-slate-900">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
