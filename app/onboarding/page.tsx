"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Progress, Textarea } from "@/components/ui";
import { getCurrentVault, saveCurrentVault } from "@/lib/repositories";
import { makeId } from "@/lib/utils";
import { trackEvent } from "@/lib/events";
import type { UserVault } from "@/lib/types";

const steps = ["Basic profile", "Links", "Top skills", "Top projects", "Proof links"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [vault, setVault] = useState<UserVault | null>(null);
  const [skillsText, setSkillsText] = useState("");
  const [projectsText, setProjectsText] = useState("");
  const [proofText, setProofText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getCurrentVault();
      if (!data) {
        router.push("/login");
        return;
      }
      setVault(data);
      setSkillsText(data.skills.map((skill) => skill.name).join(", "));
      setProjectsText(data.projects.slice(0, 3).map((project) => project.title).join("\n"));
      setProofText(data.proof_links.map((proof) => proof.url).join("\n"));
    }
    load();
  }, [router]);

  async function finish() {
    if (!vault) return;
    setSaving(true);
    const nextVault = {
      ...vault,
      skills: skillsText
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name, index) => ({
          id: vault.skills[index]?.id ?? makeId("skill"),
          name,
          category: vault.skills[index]?.category ?? "other",
          proficiency: vault.skills[index]?.proficiency ?? "beginner",
          proof_links: vault.skills[index]?.proof_links ?? [],
        })),
      projects: projectsText
        .split("\n")
        .map((title) => title.trim())
        .filter(Boolean)
        .map((title, index) => ({
          ...(vault.projects[index] ?? {
            id: makeId("project"),
            short_description: "Project added during onboarding. Add details in the Career Vault.",
            problem_solved: "",
            target_users: "",
            tech_stack: [],
            features: [],
            impact: "",
            github_url: "",
            live_url: "",
            screenshots_url: "",
            case_study_url: "",
            role: "",
            start_date: "",
            end_date: "",
            status: "completed" as const,
            tags: [],
          }),
          title,
        })),
      proof_links: proofText
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url, index) => ({
          id: vault.proof_links[index]?.id ?? makeId("proof"),
          title: vault.proof_links[index]?.title ?? "Proof link",
          url,
          type: vault.proof_links[index]?.type ?? "other",
          notes: vault.proof_links[index]?.notes ?? "Added during onboarding",
        })),
    };
    
    await saveCurrentVault(nextVault);
    void trackEvent("onboarding_completed", { projects: nextVault.projects.length, skills: nextVault.skills.length });
    router.push("/dashboard");
  }

  if (!vault) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <main className="mx-auto max-w-3xl">
        <div className="mb-6">
          <div className="text-sm font-semibold text-blue-700">Step {step + 1} of {steps.length}</div>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">{steps[step]}</h1>
          <Progress value={((step + 1) / steps.length) * 100} className="mt-4" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 0 && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={vault.profile.full_name} onChange={(event) => setVault({ ...vault, profile: { ...vault.profile, full_name: event.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={vault.profile.phone} onChange={(event) => setVault({ ...vault, profile: { ...vault.profile, phone: event.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={vault.profile.city} onChange={(event) => setVault({ ...vault, profile: { ...vault.profile, city: event.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Course / college</Label>
                    <Input
                      value={`${vault.education[0]?.degree || ""}${vault.education[0]?.institution ? `, ${vault.education[0].institution}` : ""}`}
                      onChange={(event) =>
                        setVault({
                          ...vault,
                          education: [
                            {
                              ...(vault.education[0] ?? {
                                id: makeId("education"),
                                field: "",
                                start_year: 0,
                                end_year: 0,
                                score: "",
                                coursework: [],
                                achievements: "",
                              }),
                              degree: event.target.value.split(",")[0]?.trim() ?? "",
                              institution: event.target.value.split(",").slice(1).join(",").trim(),
                            },
                            ...vault.education.slice(1),
                          ],
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Target role</Label>
                  <Input value={vault.profile.target_roles[0] ?? ""} onChange={(event) => setVault({ ...vault, profile: { ...vault.profile, target_roles: [event.target.value] } })} />
                </div>
              </>
            )}

            {step === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>GitHub</Label>
                  <Input value={vault.profile.github_url} onChange={(event) => setVault({ ...vault, profile: { ...vault.profile, github_url: event.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input value={vault.profile.linkedin_url} onChange={(event) => setVault({ ...vault, profile: { ...vault.profile, linkedin_url: event.target.value } })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Portfolio</Label>
                  <Input value={vault.profile.portfolio_url} onChange={(event) => setVault({ ...vault, profile: { ...vault.profile, portfolio_url: event.target.value } })} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-2">
                <Label>Top skills</Label>
                <Textarea rows={5} value={skillsText} onChange={(event) => setSkillsText(event.target.value)} placeholder="React, TypeScript, Supabase" />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <Label>Top projects</Label>
                <Textarea rows={7} value={projectsText} onChange={(event) => setProjectsText(event.target.value)} placeholder="One project per line" />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-2">
                <Label>Proof links</Label>
                <Textarea rows={7} value={proofText} onChange={(event) => setProofText(event.target.value)} placeholder="One GitHub/live/certificate link per line" />
              </div>
            )}

            <div className="flex justify-between gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || saving}>
                Back
              </Button>
              {step === steps.length - 1 ? (
                <Button type="button" onClick={finish} disabled={saving}>
                  {saving ? "Saving..." : "Finish onboarding"}
                </Button>
              ) : (
                <Button type="button" onClick={() => setStep((current) => current + 1)} disabled={saving}>Continue</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
