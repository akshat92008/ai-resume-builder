"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, CheckCircle2, Pencil, Plus, Sparkles } from "lucide-react";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress, Textarea } from "@/components/ui";
import { applyVaultUpdates } from "@/lib/agent/actions";
import { extractedProfileSummary, extractVaultUpdatesFromText } from "@/lib/agent/context";
import { ONBOARDING_EXAMPLE } from "@/lib/agent/prompts";
import { inspectCareerVault } from "@/lib/agents/career-vault-agent";
import { getCurrentVault, saveCurrentVault } from "@/lib/repositories";
import { trackEvent } from "@/lib/events";
import type { UserVault } from "@/lib/types";
import type { VaultUpdate } from "@/lib/agents/types";

const goals = [
  "Get internship",
  "Get placement",
  "Apply off-campus",
  "Build portfolio",
  "Improve resume",
  "Explore career direction",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(goals[0]);
  const [about, setAbout] = useState("");
  const [vault, setVault] = useState<UserVault | null>(null);
  const [updates, setUpdates] = useState<VaultUpdate[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getCurrentVault();
      if (!data) {
        router.push("/login");
        return;
      }
      setVault(data);
    }
    load();
  }, [router]);

  const previewVault = useMemo(() => (vault ? applyVaultUpdates(vault, updates) : null), [vault, updates]);
  const summary = useMemo(() => extractedProfileSummary(updates), [updates]);
  const previewReport = previewVault ? inspectCareerVault(previewVault) : null;

  function extractAndContinue() {
    if (!vault) return;
    setUpdates(extractVaultUpdatesFromText(vault, about, goal));
    setStep(2);
  }

  async function finish() {
    if (!vault) return;
    setSaving(true);
    const nextVault = applyVaultUpdates(vault, updates);
    await saveCurrentVault(nextVault);
    void trackEvent("onboarding_completed", {
      goal,
      projects: nextVault.projects.length,
      skills: nextVault.skills.length,
      extracted_updates: updates.length,
    });
    
    const params = new URLSearchParams(window.location.search);
    const nextPath = params.get("next");
    const plan = params.get("plan");

    if (nextPath) {
      const search = new URLSearchParams();
      if (plan) search.set("plan", plan);
      router.push(`${nextPath}${search.toString() ? `?${search.toString()}` : ""}`);
    } else {
      router.push("/dashboard?onboarding=success");
    }
  }

  if (!vault) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <main className="mx-auto max-w-3xl space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
            <Bot className="h-4 w-4" />
            CareerProof Agent onboarding
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">Welcome to CareerProof AI.</h1>
          <p className="mt-2 text-slate-600">Tell the agent what you already have. It will ask for missing proof later, only when it matters.</p>
          <Progress value={((step + 1) / 3) * 100} className="mt-5" />
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>What are you trying to achieve?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {goals.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGoal(item)}
                    className={`rounded-md border p-4 text-left text-sm font-medium transition ${
                      goal === item ? "border-blue-600 bg-blue-50 text-blue-950" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(1)}>Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <Sparkles className="h-8 w-8 text-blue-600" />
              <CardTitle>Tell me about yourself in one paragraph.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-6 text-slate-600">
                Mention your course, target role, skills, and projects naturally. You can skip links for now.
              </p>
              <Textarea
                rows={8}
                value={about}
                onChange={(event) => setAbout(event.target.value)}
                placeholder={ONBOARDING_EXAMPLE}
              />
              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                <Button onClick={extractAndContinue} disabled={!about.trim()}>Extract profile</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <CardTitle>Here is what I know about you.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <MemoryItem label="Goal" value={goal} />
                <MemoryItem label="Target role" value={summary.target || previewVault?.profile.target_roles[0] || "I do not know this yet."} />
                <MemoryItem label="Course" value={summary.course || previewVault?.education[0]?.degree || "Not added yet"} />
                <MemoryItem label="Skills" value={summary.skills.length ? summary.skills.join(", ") : "No skills detected yet"} />
                <MemoryItem label="Projects" value={summary.projects.length ? summary.projects.join(", ") : "No projects detected yet"} />
                <MemoryItem label="Missing" value={previewReport?.missingFields.slice(0, 4).join(", ") || "No major basics missing"} />
              </div>

              {updates.length === 0 && (
                <Alert variant="warning">I could not extract much yet. Add a project, skill, or target role in your paragraph before saving.</Alert>
              )}

              <div className="rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
                Your Career Memory is ready. CareerProof Agent found your first improvement steps.
              </div>

              <div className="flex flex-wrap justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" onClick={() => setStep(1)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add more
                </Button>
                <Button onClick={finish} disabled={saving || updates.length === 0}>
                  {saving ? "Saving..." : "Looks good, save this"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function MemoryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <Badge variant="secondary">{label}</Badge>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
