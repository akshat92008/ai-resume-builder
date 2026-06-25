"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Save, Trash2, Loader2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Input, Label, Progress, Select, Tabs, Textarea } from "@/components/ui";
import { CsvInput, Field } from "@/components/vault/VaultForms";
import { expandProjectWithAgent } from "@/lib/agents/project-expander-agent";
import { createEntityId } from "@/lib/utils/ids";
import { trackEvent } from "@/lib/events";
import type { Achievement, Certificate, Education, Experience, Project, ProofLink, Skill, UserVault } from "@/lib/types";
import { getCurrentVault, saveCurrentVault } from "@/lib/repositories";

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "certificates", label: "Certificates" },
  { id: "achievements", label: "Achievements" },
  { id: "proof_links", label: "Proof Links" },
];

type VaultListKey = "education" | "skills" | "projects" | "experiences" | "certificates" | "achievements" | "proof_links";
type VaultItem = Education | Skill | Project | Experience | Certificate | Achievement | ProofLink;

function emptyEducation(): Education {
  return { id: createEntityId(), institution: "", degree: "", field: "", start_year: 0, end_year: 0, score: "", coursework: [], achievements: "" };
}

function emptySkill(): Skill {
  return { id: createEntityId(), name: "", category: "other", proficiency: "beginner", proof_links: [] };
}

function emptyProject(): Project {
  return {
    id: createEntityId(),
    title: "",
    short_description: "",
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
    status: "completed",
    tags: [],
  };
}

function emptyExperience(): Experience {
  return { id: createEntityId(), company: "", role: "", start_date: "", end_date: "", description: "", responsibilities: [], achievements: [], proof_links: [], certificate_url: "" };
}

function emptyCertificate(): Certificate {
  return { id: createEntityId(), title: "", issuer: "", issue_date: "", credential_url: "", related_skills: [] };
}

function emptyAchievement(): Achievement {
  return { id: createEntityId(), title: "", description: "", date: "", proof_url: "", category: "" };
}

function emptyProofLink(): ProofLink {
  return { id: createEntityId(), title: "", url: "", type: "other", notes: "" };
}

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [vault, setVault] = useState<UserVault | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadVault() {
      const data = await getCurrentVault();
      setVault(data);
    }
    loadVault();
  }, []);

  async function save() {
    if (!vault) return;
    setSaving(true);
    await saveCurrentVault(vault);

    setSaved(true);
    setSaving(false);
    void trackEvent("vault_updated", { tab: activeTab });
    window.setTimeout(() => setSaved(false), 1800);
  }

  function updateProfile<K extends keyof UserVault["profile"]>(key: K, value: UserVault["profile"][K]) {
    setVault((current) => current ? ({ ...current, profile: { ...current.profile, [key]: value } }) : null);
  }

  function updateList(key: VaultListKey, id: string, item: VaultItem) {
    setVault((current) => current ? ({ ...current, [key]: (current[key] as any[]).map((i: any) => (i.id === id ? item : i)) as any }) : null);
  }

  function addItem(key: VaultListKey) {
    const factories = {
      education: emptyEducation,
      skills: emptySkill,
      projects: emptyProject,
      experiences: emptyExperience,
      certificates: emptyCertificate,
      achievements: emptyAchievement,
      proof_links: emptyProofLink,
    };
    setVault((current) => current ? ({ ...current, [key]: [factories[key](), ...(current[key] as any[])] }) : null);
  }

  function deleteItem(key: VaultListKey, id: string) {
    setVault((current) => current ? ({ ...current, [key]: (current[key] as any[]).filter((i: any) => i.id !== id) as any }) : null);
  }

  if (!vault) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Career Memory</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-950">Your proof-backed career data.</h1>
          <p className="mt-2 text-slate-600">This is your core career profile. CareerProof Agent uses this data to generate tailored resumes and analyze your job fit. Keep it accurate and updated.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <Badge variant="secondary">Saved</Badge>}
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Career Memory
          </Button>
        </div>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" value={vault.profile.full_name} onChange={(value) => updateProfile("full_name", value)} />
              <Field label="Email" value={vault.profile.email} onChange={(value) => updateProfile("email", value)} />
              <Field label="Phone" value={vault.profile.phone} onChange={(value) => updateProfile("phone", value)} />
              <Field label="City" value={vault.profile.city} onChange={(value) => updateProfile("city", value)} />
              <Field label="Headline" value={vault.profile.headline} onChange={(value) => updateProfile("headline", value)} />
              <Field label="Public slug" value={vault.profile.public_slug} onChange={(value) => updateProfile("public_slug", value)} />
              <Field label="LinkedIn URL" value={vault.profile.linkedin_url} onChange={(value) => updateProfile("linkedin_url", value)} />
              <Field label="GitHub URL" value={vault.profile.github_url} onChange={(value) => updateProfile("github_url", value)} />
              <Field label="Portfolio URL" value={vault.profile.portfolio_url} onChange={(value) => updateProfile("portfolio_url", value)} />
              <CsvInput label="Target roles" value={vault.profile.target_roles} onChange={(value) => updateProfile("target_roles", value)} />
            </div>
            <Field label="Summary" value={vault.profile.summary} textarea onChange={(value) => updateProfile("summary", value)} />
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={vault.profile.portfolio_public} onChange={(event) => updateProfile("portfolio_public", event.target.checked)} />
              Make public portfolio visible
            </label>
          </CardContent>
        </Card>
      )}

      {activeTab === "education" && (
        <VaultList title="Education" count={vault.education.length} onAdd={() => addItem("education")}>
          {vault.education.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Institution" value={item.institution} onChange={(value) => updateList("education", item.id, { ...item, institution: value })} />
                  <Field label="Degree" value={item.degree} onChange={(value) => updateList("education", item.id, { ...item, degree: value })} />
                  <Field label="Field" value={item.field} onChange={(value) => updateList("education", item.id, { ...item, field: value })} />
                  <Field label="Score" value={item.score} onChange={(value) => updateList("education", item.id, { ...item, score: value })} />
                  <NumberField label="Start year" value={item.start_year} onChange={(value) => updateList("education", item.id, { ...item, start_year: value })} />
                  <NumberField label="End year" value={item.end_year} onChange={(value) => updateList("education", item.id, { ...item, end_year: value })} />
                </div>
                <CsvInput label="Coursework" value={item.coursework} onChange={(value) => updateList("education", item.id, { ...item, coursework: value })} />
                <Field label="Achievements" value={item.achievements} textarea onChange={(value) => updateList("education", item.id, { ...item, achievements: value })} />
                <DeleteButton onClick={() => deleteItem("education", item.id)} />
              </CardContent>
            </Card>
          ))}
        </VaultList>
      )}

      {activeTab === "skills" && (
        <VaultList title="Skills" count={vault.skills.length} onAdd={() => addItem("skills")}>
          <div className="grid gap-4 md:grid-cols-2">
            {vault.skills.map((skill) => (
              <Card key={skill.id}>
                <CardContent className="space-y-4 p-5">
                  <Field label="Skill name" value={skill.name} onChange={(value) => updateList("skills", skill.id, { ...skill, name: value })} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={skill.category} onChange={(event) => updateList("skills", skill.id, { ...skill, category: event.target.value as Skill["category"] })}>
                        {["frontend", "backend", "ai", "data", "design", "marketing", "business", "soft", "other"].map((category) => <option key={category}>{category}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Proficiency</Label>
                      <Select value={skill.proficiency} onChange={(event) => updateList("skills", skill.id, { ...skill, proficiency: event.target.value as Skill["proficiency"] })}>
                        {["beginner", "intermediate", "advanced"].map((level) => <option key={level}>{level}</option>)}
                      </Select>
                    </div>
                  </div>
                  <CsvInput label="Proof links" value={skill.proof_links} onChange={(value) => updateList("skills", skill.id, { ...skill, proof_links: value })} />
                  <DeleteButton onClick={() => deleteItem("skills", skill.id)} />
                </CardContent>
              </Card>
            ))}
          </div>
        </VaultList>
      )}

      {activeTab === "projects" && (
        <VaultList title="Projects" count={vault.projects.length} onAdd={() => addItem("projects")}>
          {vault.projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="space-y-4 p-5">
                <ProjectHealthPanel project={project} targetRole={vault.profile.target_roles[0] ?? ""} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Title" value={project.title} onChange={(value) => updateList("projects", project.id, { ...project, title: value })} />
                  <Field label="Role" value={project.role} onChange={(value) => updateList("projects", project.id, { ...project, role: value })} />
                </div>
                <Field label="Description" value={project.short_description} textarea onChange={(value) => updateList("projects", project.id, { ...project, short_description: value })} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Problem solved" value={project.problem_solved} textarea onChange={(value) => updateList("projects", project.id, { ...project, problem_solved: value })} />
                  <Field label="Target users" value={project.target_users} textarea onChange={(value) => updateList("projects", project.id, { ...project, target_users: value })} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <CsvInput label="Tech stack" value={project.tech_stack} onChange={(value) => updateList("projects", project.id, { ...project, tech_stack: value })} />
                  <CsvInput label="Features" value={project.features} onChange={(value) => updateList("projects", project.id, { ...project, features: value })} />
                  <Field label="Impact" value={project.impact} onChange={(value) => updateList("projects", project.id, { ...project, impact: value })} />
                  <CsvInput label="Tags" value={project.tags} onChange={(value) => updateList("projects", project.id, { ...project, tags: value })} />
                  <Field label="GitHub URL" value={project.github_url} onChange={(value) => updateList("projects", project.id, { ...project, github_url: value })} />
                  <Field label="Live URL" value={project.live_url} onChange={(value) => updateList("projects", project.id, { ...project, live_url: value })} />
                  <Field label="Screenshots URL" value={project.screenshots_url} onChange={(value) => updateList("projects", project.id, { ...project, screenshots_url: value })} />
                  <Field label="Case study URL" value={project.case_study_url} onChange={(value) => updateList("projects", project.id, { ...project, case_study_url: value })} />
                  <Field label="Start date" value={project.start_date} onChange={(value) => updateList("projects", project.id, { ...project, start_date: value })} />
                  <Field label="End date" value={project.end_date} onChange={(value) => updateList("projects", project.id, { ...project, end_date: value })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={project.status} onChange={(event) => updateList("projects", project.id, { ...project, status: event.target.value as Project["status"] })}>
                    <option value="completed">completed</option>
                    <option value="in_progress">in_progress</option>
                    <option value="paused">paused</option>
                  </Select>
                </div>
                <DeleteButton onClick={() => deleteItem("projects", project.id)} />
              </CardContent>
            </Card>
          ))}
        </VaultList>
      )}

      {activeTab === "experience" && (
        <VaultList title="Experience" count={vault.experiences.length} onAdd={() => addItem("experiences")}>
          {vault.experiences.map((experience) => (
            <Card key={experience.id}>
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Company" value={experience.company} onChange={(value) => updateList("experiences", experience.id, { ...experience, company: value })} />
                  <Field label="Role" value={experience.role} onChange={(value) => updateList("experiences", experience.id, { ...experience, role: value })} />
                  <Field label="Start date" value={experience.start_date} onChange={(value) => updateList("experiences", experience.id, { ...experience, start_date: value })} />
                  <Field label="End date" value={experience.end_date} onChange={(value) => updateList("experiences", experience.id, { ...experience, end_date: value })} />
                </div>
                <Field label="Description" value={experience.description} textarea onChange={(value) => updateList("experiences", experience.id, { ...experience, description: value })} />
                <CsvInput label="Responsibilities" value={experience.responsibilities} onChange={(value) => updateList("experiences", experience.id, { ...experience, responsibilities: value })} />
                <CsvInput label="Achievements" value={experience.achievements} onChange={(value) => updateList("experiences", experience.id, { ...experience, achievements: value })} />
                <CsvInput label="Proof links" value={experience.proof_links} onChange={(value) => updateList("experiences", experience.id, { ...experience, proof_links: value })} />
                <Field label="Certificate URL" value={experience.certificate_url} onChange={(value) => updateList("experiences", experience.id, { ...experience, certificate_url: value })} />
                <DeleteButton onClick={() => deleteItem("experiences", experience.id)} />
              </CardContent>
            </Card>
          ))}
        </VaultList>
      )}

      {activeTab === "certificates" && (
        <VaultList title="Certificates" count={vault.certificates.length} onAdd={() => addItem("certificates")}>
          {vault.certificates.map((certificate) => (
            <Card key={certificate.id}>
              <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                <Field label="Title" value={certificate.title} onChange={(value) => updateList("certificates", certificate.id, { ...certificate, title: value })} />
                <Field label="Issuer" value={certificate.issuer} onChange={(value) => updateList("certificates", certificate.id, { ...certificate, issuer: value })} />
                <Field label="Issue date" value={certificate.issue_date} onChange={(value) => updateList("certificates", certificate.id, { ...certificate, issue_date: value })} />
                <Field label="Credential URL" value={certificate.credential_url} onChange={(value) => updateList("certificates", certificate.id, { ...certificate, credential_url: value })} />
                <CsvInput label="Related skills" value={certificate.related_skills} onChange={(value) => updateList("certificates", certificate.id, { ...certificate, related_skills: value })} />
                <DeleteButton onClick={() => deleteItem("certificates", certificate.id)} />
              </CardContent>
            </Card>
          ))}
        </VaultList>
      )}

      {activeTab === "achievements" && (
        <VaultList title="Achievements" count={vault.achievements.length} onAdd={() => addItem("achievements")}>
          {vault.achievements.map((achievement) => (
            <Card key={achievement.id}>
              <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                <Field label="Title" value={achievement.title} onChange={(value) => updateList("achievements", achievement.id, { ...achievement, title: value })} />
                <Field label="Category" value={achievement.category} onChange={(value) => updateList("achievements", achievement.id, { ...achievement, category: value })} />
                <Field label="Date" value={achievement.date} onChange={(value) => updateList("achievements", achievement.id, { ...achievement, date: value })} />
                <Field label="Proof URL" value={achievement.proof_url} onChange={(value) => updateList("achievements", achievement.id, { ...achievement, proof_url: value })} />
                <div className="md:col-span-2">
                  <Field label="Description" textarea value={achievement.description} onChange={(value) => updateList("achievements", achievement.id, { ...achievement, description: value })} />
                </div>
                <DeleteButton onClick={() => deleteItem("achievements", achievement.id)} />
              </CardContent>
            </Card>
          ))}
        </VaultList>
      )}

      {activeTab === "proof_links" && (
        <VaultList title="Proof Links" count={vault.proof_links.length} onAdd={() => addItem("proof_links")}>
          {vault.proof_links.map((proof) => (
            <Card key={proof.id}>
              <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                <Field label="Title" value={proof.title} onChange={(value) => updateList("proof_links", proof.id, { ...proof, title: value })} />
                <Field label="URL" value={proof.url} onChange={(value) => updateList("proof_links", proof.id, { ...proof, url: value })} />
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={proof.type} onChange={(event) => updateList("proof_links", proof.id, { ...proof, type: event.target.value as ProofLink["type"] })}>
                    {["github", "live_demo", "certificate", "article", "case_study", "video", "design", "document", "linkedin_post", "other"].map((type) => <option key={type}>{type}</option>)}
                  </Select>
                </div>
                <Field label="Notes" value={proof.notes} onChange={(value) => updateList("proof_links", proof.id, { ...proof, notes: value })} />
                <DeleteButton onClick={() => deleteItem("proof_links", proof.id)} />
              </CardContent>
            </Card>
          ))}
        </VaultList>
      )}
    </div>
  );
}

function VaultList({ title, count, onAdd, children }: { title: string; count: number; onAdd: () => void; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        <Button type="button" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
      {count === 0 ? <EmptyState title={`No ${title.toLowerCase()} yet`} description="Add the first item and save your Career Memory." /> : <div className="space-y-4">{children}</div>}
    </section>
  );
}

function ProjectHealthPanel({ project, targetRole }: { project: Project; targetRole: string }) {
  const health = expandProjectWithAgent(project, targetRole);
  return (
    <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-blue-950">Project health</div>
          <p className="mt-1 text-sm text-blue-900">
            {health.healthLabel}: {health.canGenerateResumeBullet ? "Ready for an honest draft bullet." : "Needs clearer detail before a strong resume bullet."}
          </p>
        </div>
        <Badge className="w-fit bg-white text-blue-700">{health.projectHealth}/100</Badge>
      </div>
      <Progress value={health.projectHealth} className="mt-3" />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-800">Missing details</div>
          <div className="mt-1 space-y-1 text-sm text-blue-950">
            {(health.missingDetails.length ? health.missingDetails : ["No major details missing."]).slice(0, 3).map((item) => (
              <div key={item}>- {item}</div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-800">Targeted questions</div>
          <div className="mt-1 space-y-1 text-sm text-blue-950">
            {health.targetedQuestions.slice(0, 3).map((item) => (
              <div key={item}>- {item}</div>
            ))}
          </div>
        </div>
      </div>
      <Button asChild size="sm" variant="outline" className="mt-4 border-blue-200 bg-white text-blue-700 hover:bg-blue-50">
        <Link href="/dashboard">Improve with Agent</Link>
      </Button>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" value={value || ""} onChange={(event) => onChange(Number(event.target.value || 0))} />
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="w-fit text-red-600 hover:text-red-700">
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </Button>
  );
}
