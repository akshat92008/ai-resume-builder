"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Input, Label, Select, Tabs, Textarea } from "@/components/ui";
import { CsvInput, Field } from "@/components/vault/VaultForms";
import { getDemoVault, makeId, saveDemoVault } from "@/lib/storage";
import { trackEvent } from "@/lib/events";
import type { Achievement, Certificate, Education, Experience, Project, ProofLink, Skill, UserVault } from "@/lib/types";

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
  return { id: makeId("education"), institution: "", degree: "", field: "", start_year: 0, end_year: 0, score: "", coursework: [], achievements: "" };
}

function emptySkill(): Skill {
  return { id: makeId("skill"), name: "", category: "other", proficiency: "beginner", proof_links: [] };
}

function emptyProject(): Project {
  return {
    id: makeId("project"),
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
  return { id: makeId("experience"), company: "", role: "", start_date: "", end_date: "", description: "", responsibilities: [], achievements: [], proof_links: [], certificate_url: "" };
}

function emptyCertificate(): Certificate {
  return { id: makeId("certificate"), title: "", issuer: "", issue_date: "", credential_url: "", related_skills: [] };
}

function emptyAchievement(): Achievement {
  return { id: makeId("achievement"), title: "", description: "", date: "", proof_url: "", category: "" };
}

function emptyProofLink(): ProofLink {
  return { id: makeId("proof"), title: "", url: "", type: "other", notes: "" };
}

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [vault, setVault] = useState<UserVault>(() => getDemoVault());
  const [saved, setSaved] = useState(false);

  function save() {
    saveDemoVault(vault);
    setSaved(true);
    void trackEvent("vault_updated", { tab: activeTab });
    window.setTimeout(() => setSaved(false), 1800);
  }

  function updateProfile<K extends keyof UserVault["profile"]>(key: K, value: UserVault["profile"][K]) {
    setVault((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  }

  function updateList(key: VaultListKey, id: string, item: VaultItem) {
    setVault((current) => {
      const list = current[key] as unknown as VaultItem[];
      return { ...current, [key]: list.map((entry) => (entry.id === id ? item : entry)) };
    });
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
    setVault((current) => {
      const list = current[key] as unknown as VaultItem[];
      return { ...current, [key]: [factories[key](), ...list] };
    });
  }

  function deleteItem(key: VaultListKey, id: string) {
    setVault((current) => {
      const list = current[key] as unknown as VaultItem[];
      return { ...current, [key]: list.filter((item) => item.id !== id) };
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Career Vault</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-950">Your source of truth for achievements and proof.</h1>
          <p className="mt-2 text-slate-600">Add honest evidence once, then use it for resumes, cover letters, LinkedIn, and portfolios.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <Badge variant="secondary">Saved</Badge>}
          <Button onClick={save}>
            <Save className="mr-2 h-4 w-4" />
            Save vault
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
      {count === 0 ? <EmptyState title={`No ${title.toLowerCase()} yet`} description="Add the first item and save your Career Vault." /> : <div className="space-y-4">{children}</div>}
    </section>
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
