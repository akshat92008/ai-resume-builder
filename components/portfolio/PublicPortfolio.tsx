import Link from "next/link";
import { ExternalLink, Github, Linkedin, Mail, ShieldCheck } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { calculateProofScore } from "@/lib/proof-score";
import { canRemoveFooter } from "@/lib/plans";
import type { UserVault } from "@/lib/types";

export function PublicPortfolio({ vault, sample = false }: { vault: UserVault; sample?: boolean }) {
  if (!vault.profile.portfolio_public && !sample) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">This portfolio is private.</h1>
          <p className="mt-2 text-slate-600">Ask the candidate to enable their public CareerProof link.</p>
          <Button asChild className="mt-5">
            <Link href="/proof-score">Create your proof-backed resume</Link>
          </Button>
        </div>
      </div>
    );
  }

  const score = calculateProofScore(vault);
  const showFooter = !canRemoveFooter(vault.profile.plan ?? "free");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="font-display text-lg font-bold text-slate-950">{vault.profile.full_name}</div>
          <div className="flex items-center gap-2">
            {sample && <Badge variant="secondary">Sample portfolio</Badge>}
            {/* Email contact can be added later with an explicit public contact setting. */}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <section className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
              {vault.profile.target_roles[0] || "Proof-backed candidate"}
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {vault.profile.headline || `Proof-backed profile for ${vault.profile.full_name}`}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{vault.profile.summary}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-medium">
              {vault.profile.github_url && (
                <a href={vault.profile.github_url} className="inline-flex items-center gap-2 text-slate-700 hover:text-blue-700">
                  <Github className="h-5 w-5" />
                  GitHub
                </a>
              )}
              {vault.profile.linkedin_url && (
                <a href={vault.profile.linkedin_url} className="inline-flex items-center gap-2 text-slate-700 hover:text-blue-700">
                  <Linkedin className="h-5 w-5" />
                  LinkedIn
                </a>
              )}
              {vault.profile.portfolio_url && (
                <a href={vault.profile.portfolio_url} className="inline-flex items-center gap-2 text-slate-700 hover:text-blue-700">
                  <ExternalLink className="h-5 w-5" />
                  Website
                </a>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <ShieldCheck className="h-10 w-10 text-blue-600" />
            <div className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-500">CareerProof Score</div>
            <div className="mt-2 text-5xl font-bold text-slate-950">{score.total}</div>
            <Badge className="mt-3">{score.grade}</Badge>
            <p className="mt-4 text-sm text-slate-600">Score is based on profile completion, projects, proof links, resume clarity, and portfolio readiness.</p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-950">Featured Projects</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {vault.projects.map((project) => (
              <article key={project.id} className="rounded-lg border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-bold text-slate-950">{project.title}</h3>
                  <Badge variant={project.status === "completed" ? "default" : "secondary"}>{project.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{project.short_description}</p>
                {project.impact && (
                  <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
                    <strong>Impact:</strong> {project.impact}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tech_stack.map((tech) => (
                    <Badge key={tech} variant="secondary">{tech}</Badge>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
                  {project.github_url && <a href={project.github_url} className="text-blue-700 hover:underline">GitHub</a>}
                  {project.live_url && <a href={project.live_url} className="text-blue-700 hover:underline">Live demo</a>}
                  {project.case_study_url && <a href={project.case_study_url} className="text-blue-700 hover:underline">Case study</a>}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Verified Skills</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {vault.skills.map((skill) => (
                <div key={skill.id} className="rounded-lg border bg-white p-4">
                  <div className="font-semibold">{skill.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{skill.category} | {skill.proficiency}</div>
                  <div className="mt-3 text-xs font-medium text-emerald-700">
                    {skill.proof_links.length ? "Proof attached" : "Proof needed"}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-2xl font-bold text-slate-950">Why hire this candidate?</h2>
            <p className="mt-4 leading-7 text-slate-600">
              {vault.profile.full_name} presents real projects with visible proof links, a transparent proof score, and clear gaps where proof still needs to improve. Recruiters can inspect projects, skills, certificates, and links without relying only on polished resume wording.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t bg-slate-950 px-4 py-8 text-center text-sm text-slate-300">
        {showFooter || sample ? (
          <Link href="/proof-score" className="hover:text-white">
            Built with CareerProof AI by Amaura Labs - Create your proof-backed resume.
          </Link>
        ) : (
          <span>Proof-backed profile</span>
        )}
      </footer>
    </div>
  );
}
