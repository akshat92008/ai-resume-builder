"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Copy, Download, FileText, Linkedin, Mail, Save, ShieldAlert, Loader2 } from "lucide-react";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, LoadingState } from "@/components/ui";
import { ResumeEditor } from "@/components/resume/ResumeEditor";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { trackEvent } from "@/lib/events";
import { supabase } from "@/lib/supabase/client";
import type { Resume, ResumeContent } from "@/lib/types";

function resumeToText(content: ResumeContent) {
  return [
    content.header.name,
    [content.header.email, content.header.phone, content.header.city].filter(Boolean).join(" | "),
    content.summary,
    "SKILLS",
    [...content.skills.technical, ...content.skills.tools, ...content.skills.soft].join(", "),
    "PROJECTS",
    ...content.projects.flatMap((project) => [project.title, ...project.bullets.map((bullet) => `- ${bullet}`)]),
    "EXPERIENCE",
    ...content.experience.flatMap((experience) => [`${experience.role} at ${experience.company}`, ...experience.bullets.map((bullet) => `- ${bullet}`)]),
    "EDUCATION",
    ...content.education.map((education) => `${education.institution} - ${education.degree} ${education.score}`),
  ].filter(Boolean).join("\n");
}

export default function ResumeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [resume, setResume] = useState<Resume | null>(null);
  const [content, setContent] = useState<ResumeContent | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [linkedinAbout, setLinkedinAbout] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: resumeData } = await supabase.from('resumes').select('*').eq('id', params.id).single();
      if (resumeData) {
        setResume(resumeData);
        setContent(resumeData.content_json);
        if (resumeData.job_id) {
          const { data: jobData } = await supabase.from('jobs').select('job_description').eq('id', resumeData.job_id).single();
          if (jobData) setJobDescription(jobData.job_description);
        }
      }

      const [
        { data: profile },
        { data: education },
        { data: skills },
        { data: projects },
        { data: experiences },
        { data: certificates },
        { data: achievements },
        { data: proof_links },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('education').select('*').eq('user_id', user.id),
        supabase.from('skills').select('*').eq('user_id', user.id),
        supabase.from('projects').select('*').eq('user_id', user.id),
        supabase.from('experiences').select('*').eq('user_id', user.id),
        supabase.from('certificates').select('*').eq('user_id', user.id),
        supabase.from('achievements').select('*').eq('user_id', user.id),
        supabase.from('proof_links').select('*').eq('user_id', user.id),
      ]);

      setVault({
        profile: profile || { full_name: "", email: "", phone: "", city: "", headline: "", summary: "", public_slug: "", linkedin_url: "", github_url: "", portfolio_url: "", target_roles: [], portfolio_public: false },
        education: education || [],
        skills: skills || [],
        projects: projects || [],
        experiences: experiences || [],
        certificates: certificates || [],
        achievements: achievements || [],
        proof_links: proof_links || [],
      });

      setLoading(false);
    }
    loadData();
  }, [params.id]);

  async function save() {
    if (!resume || !content) return;
    setSaving(true);
    const updated = { ...resume, content_json: content };
    await supabase.from('resumes').update({ content_json: content }).eq('id', resume.id);
    setResume(updated);
    setMessage("Saved resume changes.");
    setSaving(false);
    window.setTimeout(() => setMessage(""), 1600);
  }

  async function copyText() {
    if (!content) return;
    await navigator.clipboard.writeText(resumeToText(content));
    setMessage("Copied resume text.");
    await trackEvent("resume_copied", { resume_id: resume?.id });
  }

  async function generateCoverLetter() {
    if (!content || !vault) return;
    const response = await fetch("/api/ai/generate-cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription: jobDescription || "General fresher application", resume: content, userVault: vault }),
    });
    const data = (await response.json()) as { content?: string };
    setCoverLetter(data.content ?? "Unable to generate cover letter.");
  }

  async function generateLinkedInAbout() {
    if (!vault) return;
    const response = await fetch("/api/ai/generate-linkedin-about", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userVault: vault }),
    });
    const data = (await response.json()) as { content?: string };
    setLinkedinAbout(data.content ?? "Unable to generate LinkedIn About.");
  }

  async function deleteResume() {
    if (!resume) return;
    await supabase.from('resumes').delete().eq('id', resume.id);
    router.push("/resumes");
  }

  if (loading) return <LoadingState label="Loading resume..." />;
  if (!resume || !content) return <Alert variant="error">Resume not found</Alert>;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-5 no-print">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Resume editor</p>
          <h1 className="font-display text-3xl font-bold text-slate-950">{resume.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{resume.style}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Proof score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-slate-950">{resume.proof_score}<span className="text-lg font-normal text-slate-400">/100</span></div>
            <Badge className="mt-3">{resume.warnings.length} warnings</Badge>
          </CardContent>
        </Card>

        {resume.warnings.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <ShieldAlert className="h-5 w-5" />
                Unsupported claims
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {resume.warnings.map((warning, index) => (
                <Alert key={`${warning.message}-${index}`} variant="warning">
                  <strong>{warning.type.replace("_", " ")}:</strong> {warning.message}
                </Alert>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Download / Print PDF
          </Button>
          <Button variant="outline" onClick={copyText}>
            <Copy className="mr-2 h-4 w-4" />
            Copy resume text
          </Button>
          <Button variant="outline" onClick={generateCoverLetter}>
            <Mail className="mr-2 h-4 w-4" />
            Generate cover letter
          </Button>
          <Button variant="outline" onClick={generateLinkedInAbout}>
            <Linkedin className="mr-2 h-4 w-4" />
            Generate LinkedIn About
          </Button>
          <Button variant="outline" asChild>
            <Link href="/portfolio-settings">
              <FileText className="mr-2 h-4 w-4" />
              Link to portfolio
            </Link>
          </Button>
          <Button variant="outline" onClick={deleteResume} className="text-red-600">Delete resume</Button>
        </div>
        {message && <Alert variant="success">{message}</Alert>}
      </aside>

      <main className="grid gap-8 xl:grid-cols-[420px_1fr]">
        <section className="no-print">
          <Card>
            <CardHeader>
              <CardTitle>Edit content</CardTitle>
            </CardHeader>
            <CardContent>
              <ResumeEditor content={content} onChange={setContent} />
            </CardContent>
          </Card>
          {coverLetter && (
            <Card className="mt-5">
              <CardHeader><CardTitle>Cover letter</CardTitle></CardHeader>
              <CardContent><pre className="whitespace-pre-wrap text-sm leading-6">{coverLetter}</pre></CardContent>
            </Card>
          )}
          {linkedinAbout && (
            <Card className="mt-5">
              <CardHeader><CardTitle>LinkedIn About</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-6">{linkedinAbout}</p></CardContent>
            </Card>
          )}
        </section>
        <ResumePreview content={content} />
      </main>
    </div>
  );
}
