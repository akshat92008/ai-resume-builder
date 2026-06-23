import Link from "next/link";
import { Briefcase, FileText, Link2, Plus, ShieldAlert, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui";
import { ProofScoreCard } from "@/components/proof/ProofScoreCard";
import { mockVault } from "@/lib/mock-data";
import { calculateProofScore } from "@/lib/proof-score";
import { getPlanLimits } from "@/lib/plans";

export default function DashboardPage() {
  const score = calculateProofScore(mockVault);
  const plan = mockVault.profile.plan ?? "free";
  const limits = getPlanLimits(plan);
  const vaultCompletion = Math.min(
    100,
    Math.round(
      (Number(Boolean(mockVault.profile.full_name)) +
        Number(Boolean(mockVault.profile.linkedin_url)) +
        Number(mockVault.skills.length > 0) +
        Number(mockVault.projects.length > 0) +
        Number(mockVault.proof_links.length > 0) +
        Number(mockVault.education.length > 0)) *
        (100 / 6),
    ),
  );

  const metricCards = [
    { label: "Current plan", value: plan === "pro" ? "Student Pro" : plan, detail: `${limits.resumes === 9999 ? "Unlimited" : limits.resumes} resumes` },
    { label: "Vault completion", value: `${vaultCompletion}%`, detail: "Profile, skills, projects, proof" },
    { label: "Projects", value: mockVault.projects.length, detail: "Featured proof-backed work" },
    { label: "Proof links", value: mockVault.proof_links.length, detail: "Direct evidence links" },
    { label: "Resumes generated", value: 0, detail: "Local demo count" },
    { label: "Portfolio", value: mockVault.profile.portfolio_public ? "Public" : "Private", detail: `/portfolio/${mockVault.profile.public_slug}` },
  ];

  const actions = [
    { href: "/proof-score", label: "Get Free Proof Score", icon: ShieldCheck },
    { href: "/vault", label: "Update Career Vault", icon: Upload },
    { href: "/jobs/new", label: "Analyze Job Description", icon: Briefcase },
    { href: "/resumes/new", label: "Generate Resume", icon: FileText },
    { href: "/portfolio-settings", label: "Publish Portfolio", icon: Link2 },
    { href: "/pricing", label: "Upgrade to Pro", icon: Sparkles },
  ];

  const suggestions = [
    "Your React skill has no proof.",
    "Add a live demo for your strongest project.",
    mockVault.profile.portfolio_public ? "Share your public portfolio link with recruiters." : "Your portfolio is private.",
    "Generate a job-specific resume before applying.",
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
            Welcome back, {mockVault.profile.full_name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-slate-600">Here is the current status of your proof-backed career profile.</p>
        </div>
        <Badge className="w-fit">{score.grade} profile</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-950">{card.value}</div>
              <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
              {card.label === "Vault completion" && <Progress value={vaultCompletion} className="mt-3" />}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button key={action.href} variant="outline" className="h-auto justify-start gap-3 p-4" asChild>
                    <Link href={action.href}>
                      <Icon className="h-4 w-4" />
                      <span className="text-left">{action.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed bg-slate-50 p-8 text-center">
                <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 font-semibold text-slate-950">No saved applications yet</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Paste a job description to generate your first tailored resume and cover letter.</p>
                <Button asChild size="sm" className="mt-4">
                  <Link href="/jobs/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Match Job Description
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ProofScoreCard result={score} />
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <ShieldAlert className="h-5 w-5" />
                Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestions.map((suggestion) => (
                <div key={suggestion} className="rounded-md border border-amber-200 bg-white/70 p-3 text-sm text-amber-950">
                  {suggestion}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
