import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, GraduationCap, Link2, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const workflows = [
  {
    icon: ShieldCheck,
    title: "Check proof gaps",
    text: "Paste your resume text and get a deterministic proof score with missing proof links and next actions.",
  },
  {
    icon: Link2,
    title: "Build your Career Vault",
    text: "Store projects, GitHub repos, certificates, live demos, screenshots, and achievements in one place.",
  },
  {
    icon: FileText,
    title: "Generate job-specific resumes",
    text: "Analyze a JD, match honest evidence, generate an ATS-friendly resume, edit it, and print to PDF.",
  },
  {
    icon: GraduationCap,
    title: "Share recruiter proof",
    text: "Publish a public proof portfolio with verified skills, featured projects, and a recruiter-friendly score.",
  },
];

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient();
  let testimonials: any[] = [];
  
  if (supabase) {
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .eq('public', true)
      .order('created_at', { ascending: false })
      .limit(4);
    
    if (data && data.length > 0) {
      testimonials = data;
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main>
        <section className="border-b bg-slate-50">
          <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <Badge className="mb-5 bg-blue-50 text-blue-700 hover:bg-blue-50">CareerProof AI by Amaura Labs</Badge>
              <h1 className="font-display text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                Build a resume recruiters can trust.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                CareerProof AI helps Indian freshers create ATS-friendly resumes, proof-backed portfolios, and job-specific applications using only real achievements.
              </p>
              <p className="mt-4 text-base font-semibold text-slate-900">Every resume claim should connect to proof.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/proof-score">
                    Get Free Proof Score <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/signup">Build Proof-Backed Resume</Link>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Supabase + NVIDIA NIM ready</span>
              </div>
            </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Free tool</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Does your resume look real or AI-generated?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Most AI resumes sound polished but fake. Recruiters see the same generic bullets again and again. CareerProof AI helps you turn real projects, GitHub links, certificates, and demos into a resume that feels credible.
              </p>
              <div className="mt-5 space-y-3 text-sm">
                {["Proof Score out of 100", "Missing GitHub/certificate/live-demo proof", "Weak bullet examples", "Next actions for fresher applications"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {item}
                  </div>
                ))}
              </div>
              <Button className="mt-6 w-full" asChild>
                <Link href="/proof-score">Check my resume proof score</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">SaaS core loop</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">From raw achievements to recruiter-ready proof.</h2>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {workflows.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title}>
                  <CardHeader>
                    <Icon className="h-8 w-8 text-blue-600" />
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-slate-600">{item.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="border-y bg-slate-50">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-slate-950">Built to earn from day one.</h2>
              <p className="mt-4 leading-7 text-slate-600">
                Launch with the free proof score lead magnet, Student Pro plan, manual CareerProof packs, referral loop, public portfolio footer, college pilot capture, and admin review screens.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild><Link href="/pricing">View pricing</Link></Button>
                <Button variant="outline" asChild><Link href="/college-pilot">College pilot</Link></Button>
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              {["₹199 Student Pro", "₹499 CareerProof Pack", "₹999 Lifetime Student", "₹10k-₹50k college pilots", "Manual UPI and WhatsApp payment fallback", "Admin approvals and lead management"].map((item) => (
                <div key={item} className="rounded-lg border bg-white p-4 font-medium text-slate-700">{item}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Testimonials</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">Success stories from early users.</h2>
            </div>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id}>
                <CardContent className="p-6">
                  <p className="leading-7 text-slate-700">&quot;{testimonial.quote}&quot;</p>
                  <div className="mt-4 text-sm font-semibold text-slate-950">{testimonial.name}</div>
                  <div className="text-sm text-slate-500">{testimonial.role}, {testimonial.college}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t bg-slate-950 px-4 py-10 text-center text-sm text-slate-300">
        <div>CareerProof AI by Amaura Labs. Built for Indian freshers, students, and early-career candidates.</div>
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/refund-policy" className="hover:text-white">Refund policy</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
