import Link from "next/link";
import { ArrowRight, Brain, Briefcase, CheckCircle2, FileText, LineChart, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";

const journey = [
  [Briefcase, "Import the job", "Paste the job description or save the role you are considering."],
  [ShieldCheck, "Decide whether to apply", "CareerLoop compares the role with evidence in your Career Memory and explains apply, consider, or skip."],
  [FileText, "Prepare the application", "Generate and audit a truthful, role-specific resume plus outreach from the same source of career facts."],
  [LineChart, "Track the outcome", "Record replies, interviews, offers, rejections, source, fit score, and resume version."],
  [Brain, "Learn what converts", "CareerLoop turns enough real outcomes into cautious experiments for your next applications."],
] as const;

const trustPoints = [
  "Resume scores come from an actual audit of the generated content — never a fabricated starter score.",
  "Missing job keywords are not added unless your Career Memory contains supporting evidence.",
  "CareerLoop labels conversion findings as correlation and waits for meaningful sample sizes before stronger recommendations.",
  "Production access uses authenticated persistence, row-level data isolation, rate limits, and monitored background jobs.",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main>
        <section className="border-b bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:py-28">
            <Badge className="mb-6 bg-white text-blue-700 ring-1 ring-blue-100 hover:bg-white">CareerOS by Amaura Labs</Badge>
            <h1 className="mx-auto max-w-5xl text-5xl font-bold tracking-tight text-slate-950 sm:text-7xl">
              Apply where you fit.<br />Learn what gets interviews.
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-600">
              CareerOS stores your evidence once, helps decide which jobs are worth your time, prepares truthful applications, tracks outcomes, and improves your strategy from real results.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/app">Start with Career Memory <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild><Link href="/login">Login</Link></Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">The CareerLoop</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">One job-search journey, not thirteen disconnected tools.</h2>
            <p className="mt-4 text-slate-600">The resume builder is a capability inside the loop. The product goal is the interview outcome.</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-5">
            {journey.map(([Icon, title, description], index) => (
              <Card key={title} className="border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step {index + 1}</p>
                  <CardTitle className="text-lg text-slate-950">{title}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm leading-6 text-slate-600">{description}</p></CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y bg-slate-950 text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">Evidence first</p>
              <h2 className="mt-3 text-4xl font-bold">Career data is treated as evidence, not permission to invent.</h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">CareerOS keeps generation anchored to the facts you store and makes uncertainty visible instead of manufacturing completeness.</p>
            </div>
            <div className="space-y-4">
              {trustPoints.map((point) => (
                <div key={point} className="flex gap-3 text-sm leading-6 text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <p>{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Plans</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">Start free. Upgrade when the workflow earns its place.</h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Free</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-bold text-slate-950">$0</p>
                <p className="text-sm text-slate-600">Core CareerOS access with up to 3 AI actions per day, 1 tailoring action per day, and 1 outreach action per day.</p>
                <Button asChild variant="outline" className="w-full"><Link href="/app">Get started</Link></Button>
              </CardContent>
            </Card>
            <Card className="border-blue-200 ring-1 ring-blue-100">
              <CardHeader><Badge className="mb-2 w-fit">Pro</Badge><CardTitle>$15 / month</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">Up to 100 AI actions per day, 30 tailoring actions per day, 20 outreach actions per day, advanced interview preparation, and higher CareerLoop usage limits.</p>
                <Button asChild className="w-full"><Link href="/settings">View subscription</Link></Button>
              </CardContent>
            </Card>
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-5 text-slate-500">Limits are abuse and cost controls, not promises that every user should consume the maximum allowance. Billing availability depends on the production payment configuration.</p>
        </section>

        <section className="border-t bg-slate-50">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-14 text-center sm:px-6 md:flex-row md:text-left">
            <div><h2 className="text-2xl font-bold text-slate-950">Build your Career Memory once.</h2><p className="mt-2 text-slate-600">Then use it as the evidence layer behind every application.</p></div>
            <Button size="lg" asChild><Link href="/app">Open CareerOS <Sparkles className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white px-4 py-12 text-center text-sm text-slate-500">
        <div className="font-semibold text-slate-900">CareerOS by Amaura Labs.</div>
        <div className="mt-6 flex flex-wrap justify-center gap-6">
          <Link href="/app" className="hover:text-slate-900">Career Memory</Link>
          <Link href="/dashboard" className="hover:text-slate-900">Dashboard</Link>
          <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-900">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
