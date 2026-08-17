import Link from "next/link";
import { ArrowRight, Brain, Briefcase, Check, RefreshCcw, ShieldCheck, Sparkles, Target, WandSparkles } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";

const steps = [
  { icon: Brain, title: "Build your Career Memory", text: "Drop in an old resume, notes, projects, achievements, or experience. CareerOS turns the mess into reusable career evidence." },
  { icon: Target, title: "Know what is worth applying to", text: "Compare a role against your evidence and see an Apply, Consider, or Skip recommendation before you spend time tailoring." },
  { icon: WandSparkles, title: "Create the strongest truthful application", text: "Generate role-specific resumes and outreach while keeping unsupported claims out of the application." },
  { icon: RefreshCcw, title: "Learn from outcomes", text: "Track interviews, rejections, and offers so CareerLoop can improve the next decision instead of repeating the same playbook." },
];

const questions = [
  "Should I apply to this role?",
  "What evidence should I emphasize?",
  "Which resume version is performing best?",
  "Where is my job-search funnel actually failing?",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f8f9fc] text-slate-950">
      <MarketingNav />
      <main>
        <section className="relative isolate border-b border-slate-200/70 bg-white">
          <div className="career-grid pointer-events-none absolute inset-0 opacity-80" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-indigo-200/30 blur-[110px]" />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:py-28">
            <div>
              <Badge variant="secondary" className="mb-6 border-indigo-100 bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Free beta · built around interview outcomes
              </Badge>
              <h1 className="max-w-4xl text-5xl font-bold tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[72px] lg:leading-[0.98]">
                Stop sending applications into a <span className="career-text-gradient">black hole.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                CareerOS helps you decide where to apply, builds evidence-backed applications, tracks what happens, and learns what gets you closer to interviews.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/app">Try CareerOS free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild><Link href="/dashboard">View your career hub</Link></Button>
              </div>
              <div className="mt-6 flex max-w-2xl items-start gap-2.5 text-sm leading-6 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>CareerOS optimizes the evidence you already have. It does not invent skills, experience, achievements, or credentials.</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[620px]">
              <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-indigo-200/40 via-violet-100/30 to-transparent blur-2xl" />
              <div className="career-surface relative overflow-hidden rounded-[30px] p-3 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
                <div className="rounded-[24px] border border-slate-200/80 bg-[#0f1220] p-5 text-white sm:p-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Briefcase className="h-5 w-5 text-indigo-300" /></div>
                      <div><p className="text-sm font-semibold">Senior Product Engineer</p><p className="mt-0.5 text-xs text-slate-400">Example opportunity</p></div>
                    </div>
                    <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300">APPLY</Badge>
                  </div>
                  <div className="grid gap-3 py-5 sm:grid-cols-3">
                    {[['Fit','86%'],['Evidence','Strong'],['Risk','Low']].map(([label,value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p></div>)}
                  </div>
                  <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/[0.08] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-300">Why CareerOS recommends applying</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-300">
                      {["Your product work matches the role's core evidence requirements.","The largest gap is explicit scale ownership, not a missing hard skill.","Use Resume v4 and emphasize the dashboard + automation projects."].map(item => <div key={item} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /><span>{item}</span></div>)}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm">
                    <div><p className="font-medium text-white">Next best action</p><p className="mt-1 text-xs text-slate-400">Tailor the evidence, then track the outcome.</p></div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500"><ArrowRight className="h-4 w-4" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">One operating system</p>
              <h2 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-slate-950 sm:text-5xl">The complexity stays underneath.</h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">You should not need a resume builder, ATS checker, spreadsheet, tracker, writing assistant, and career coach open in six tabs. CareerOS connects the loop.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Card key={step.title} className="group border-slate-200/80 bg-white/90 transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_20px_50px_rgba(79,70,229,0.08)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white"><step.icon className="h-5 w-5" /></div>
                    <span className="text-xs font-semibold tracking-[0.16em] text-slate-300">0{index + 1}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold tracking-[-0.02em] text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{step.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-800 bg-[#0b0e18] text-white">
          <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8 lg:py-28">
            <div>
              <Badge className="border-white/10 bg-white/[0.06] text-indigo-300">CareerLoop intelligence</Badge>
              <h2 className="mt-5 max-w-3xl text-4xl font-bold tracking-[-0.045em] sm:text-5xl">A resume score is a guess. Outcomes are evidence.</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">CareerOS connects each job, fit decision, resume version, source, and eventual outcome so your strategy can improve from reality—not another arbitrary 83/100 badge.</p>
            </div>
            <div className="grid gap-3">
              {questions.map((question, index) => <div key={question} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-xs font-bold text-indigo-300">0{index+1}</span><span className="text-sm font-medium text-slate-200">{question}</span></div>)}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-white">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-50/70 to-transparent" />
          <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:py-32">
            <Badge variant="secondary">Free beta</Badge>
            <h2 className="mt-5 text-4xl font-bold tracking-[-0.045em] text-slate-950 sm:text-5xl">Bring one real job. See what CareerOS changes.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">No feature tour required. Add your career evidence, paste a role you are considering, and use the system on a decision that actually matters.</p>
            <Button size="lg" asChild className="mt-8"><Link href="/app">Open CareerOS <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-[#f8f9fc] px-4 py-10 text-sm text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="font-semibold text-slate-950">CareerOS</div><div className="mt-1 text-xs">An Amaura Labs product.</div></div>
          <div className="flex flex-wrap gap-6"><Link href="/app" className="hover:text-slate-950">Workspace</Link><Link href="/dashboard" className="hover:text-slate-950">My career</Link><Link href="/privacy" className="hover:text-slate-950">Privacy</Link><Link href="/terms" className="hover:text-slate-950">Terms</Link></div>
        </div>
      </footer>
    </div>
  );
}
