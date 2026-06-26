import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Printer, MessageSquareText, Sparkles, Wand2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";

const steps = [
  ["Chat", "Tell CareerPath AI your target role and paste messy career notes."],
  ["Resume", "The agent extracts education, skills, projects, links, and proof."],
  ["Score", "It audits ATS strength, role fit, clarity, proof, and truthfulness."],
  ["Improve", "Weak bullets and sections are rewritten without fake claims."],
  ["Print or Save", "Preview a clean one-column resume and print it as a PDF."],
];

const features = [
  "Build resume from messy data",
  "Improve an existing resume",
  "Tailor to a job description",
  "Ask only high-impact missing questions",
  "Mine achievements without inventing metrics",
  "Save resume versions",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main>
        <section className="border-b bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-18">
            <div className="max-w-4xl">
              <Badge className="bg-white text-blue-700 ring-1 ring-blue-100 hover:bg-white">CareerPath AI by Amaura Labs</Badge>
              <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                Build a job-ready resume from messy notes in minutes.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
                Paste your skills, projects, certificates, or old resume. CareerPath AI interviews you, fixes weak sections, tailors your resume to your target role, and opens a print-ready resume you can save as PDF.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/app">
                    Open AI Agent <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Login</Link>
                </Button>
              </div>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_360px]">
              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <MessageSquareText className="h-4 w-4" />
                  Agentic builder
                </div>
                <div className="mt-4 space-y-3">
                  <ChatBubble role="user">Build me a resume for a frontend internship. I know react next js supabase made ai resume builder and ai tutor did cs50p python.</ChatBubble>
                  <ChatBubble role="assistant">I found your skills, 2 projects, and 1 certificate. I only need your education details, links, and strongest project context.</ChatBubble>
                </div>
              </div>
              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Resume Score</div>
                <div className="mt-2 text-4xl font-bold text-slate-950">82<span className="text-base font-normal text-slate-400">/100</span></div>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  {["ATS: 90", "Role Match: 78", "Clarity: 88", "Proof: 65"].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                      <span>{item.split(":")[0]}</span>
                      <strong>{item.split(":")[1]}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Chat to resume, without a form marathon.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-5">
            {steps.map(([title, text]) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-slate-600">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y bg-slate-50">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Main features</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">Simple on the surface, agentic behind the scenes.</h2>
              <p className="mt-4 leading-7 text-slate-600">
                CareerPath AI extracts your real material, detects gaps, asks only the useful questions, writes a truthful ATS resume, scores it, and improves weak sections.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded-md border bg-white p-4 text-sm font-medium text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Before</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  I know react next js supabase made ai resume builder and ai tutor did cs50p python made some websites learning python bca admission maybe no work experience.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>After</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
                <p><strong>Summary:</strong> Student/fresher targeting Frontend Internship roles with practical React, Next.js, Supabase, and Python project work.</p>
                <p><strong>Project bullet:</strong> Built an AI resume builder using supported web technologies to turn rough user notes into structured resume content.</p>
                <p><strong>Safety:</strong> No fake internships, metrics, colleges, or certificates added.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y bg-slate-950 text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">Launch pricing</p>
              <h2 className="mt-2 text-3xl font-bold">Free during launch.</h2>
              <p className="mt-2 max-w-2xl text-slate-300">Paid plans can later unlock unlimited resumes, advanced tailoring, and more versions.</p>
            </div>
            <Button size="lg" asChild className="bg-white text-slate-950 hover:bg-slate-100">
              <Link href="/app">
                Open Agent <Sparkles className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-white px-4 py-10 text-center text-sm text-slate-500">
        <div>CareerPath AI by Amaura Labs.</div>
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          <Link href="/app" className="hover:text-slate-950">Resume Agent</Link>
          <Link href="/dashboard" className="hover:text-slate-950">Saved resumes</Link>
          <Link href="/privacy" className="hover:text-slate-950">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-950">Terms</Link>
        </div>
      </footer>
    </div>
  );
}

function ChatBubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  const Icon = role === "assistant" ? Wand2 : Printer;
  return (
    <div className={`flex gap-3 rounded-md p-4 ${role === "assistant" ? "bg-blue-50 text-blue-950" : "bg-slate-50 text-slate-700"}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-sm leading-6">{children}</p>
    </div>
  );
}
