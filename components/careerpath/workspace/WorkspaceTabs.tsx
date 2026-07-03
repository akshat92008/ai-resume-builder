import React from "react";
import { FileText, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui";
import type { CareerPathResume, CareerWorkspaceState } from "@/lib/careerpath/types";
import { SectionShell, Metric, TextBlock, BadgeCloud, List, MemorySummary, NextActions, ProofStrip } from "./UIHelpers";

const ResumeDocument = dynamic(() => import("@/components/careerpath/ResumeDocument").then(mod => mod.ResumeDocument), {
  ssr: false,
});

export function DashboardTab({
  workspace,
  resume,
  onCommand,
}: {
  workspace: CareerWorkspaceState | null;
  resume: CareerPathResume | null;
  onCommand: (command: string) => void;
}) {
  const health = workspace?.careerHealth;
  const profile = workspace?.careerProfile;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Career health" value={`${health?.overall ?? 0} /100`} />
        <Metric label="Memory" value={`${health?.memoryCompleteness ?? 0}%`} />
        <Metric label="Resume" value={`${health?.resumeScore ?? resume?.score?.overall ?? 0} /100`} />
        <Metric label="Applications" value={health?.applicationCount ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionShell title="Career Memory">
          <MemorySummary workspace={workspace} expanded />
        </SectionShell>
        <SectionShell title="Next Actions">
          <NextActions workspace={workspace} />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => onCommand("Improve my resume")} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Improve resume
            </button>
            <button type="button" onClick={() => onCommand("Log achievement: ")} className="rounded-md border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Log achievement
            </button>
          </div>
        </SectionShell>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionShell title="Career Goals">
          <List
            items={[
              profile?.target.dreamRole ? `Dream role: ${profile.target.dreamRole}` : "",
              profile?.target.targetRoles.length ? `Target roles: ${profile.target.targetRoles.join(", ")}` : "",
              profile?.target.dreamCompanies?.length ? `Dream companies: ${profile.target.dreamCompanies.join(", ")}` : "",
              profile?.target.workPreference ? `Work mode: ${profile.target.workPreference}` : "",
            ].filter(Boolean)}
            empty="No goals stored yet."
          />
        </SectionShell>
        <SectionShell title="Skill Gaps">
          <List items={(workspace?.careerProfile?.gaps ?? []).slice(0, 5).map((gap) => gap.question)} empty="No major gaps found." />
        </SectionShell>
        <SectionShell title="Latest Documents">
          <List items={health?.latestDocuments ?? []} empty="No documents saved yet." />
        </SectionShell>
      </div>
    </div>
  );
}

export function ResumeTab({ resume }: { resume: CareerPathResume | null }) {
  if (!resume) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">Resume preview will appear here</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Paste messy career details into the agent. CareerPath AI will extract memory, mine achievements, and build a proof-based resume.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="no-print mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{resume.title}</h2>
          <p className="text-sm text-slate-500">
            {resume.targetRole} | Career Readiness Score: {resume.resumeDocument?.score?.overall ?? resume.score?.overall ?? "-"} /100 | v{resume.version}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">Live Preview</span>
        </div>
      </div>
      <ProofStrip resume={resume} />
      <ResumeDocument content={resume.content} style={resume.style} />
    </div>
  );
}

export function JobIntelligenceTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const report = workspace?.jobIntelligence;
  if (!report) {
    return (
      <SectionShell title="Job Intelligence" description="Paste a job description to extract role signals before tailoring.">
        <button
          type="button"
          onClick={() => onCommand("Analyze and tailor to this job description: ")}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add job description
        </button>
      </SectionShell>
    );
  }
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Fit" value={`${report.fitPercentage} /100`} />
        <Metric label="Matched" value={report.matchedSkills.length} />
        <Metric label="Missing skills" value={report.missingSkills.length} />
        <Metric label="Keywords" value={report.keywordRanking.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell title={report.job.title || "Job Description"}>
          <List items={[
            report.job.company ? `Company: ${report.job.company}` : "",
            report.job.location ? `Location: ${report.job.location}` : "",
            report.industry ? `Industry: ${report.industry}` : "",
            report.job.seniority ? `Seniority: ${report.job.seniority}` : "",
            report.job.requiredExperience ? `Experience: ${report.job.requiredExperience}` : "",
          ].filter(Boolean)} />
        </SectionShell>
        <SectionShell title="Hidden Expectations">
          <List items={report.hiddenExpectations} empty="No hidden expectations detected." />
        </SectionShell>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionShell title="Matched Skills">
          <BadgeCloud items={report.matchedSkills} empty="No matched skills yet." />
        </SectionShell>
        <SectionShell title="Missing Skills">
          <BadgeCloud items={report.missingSkills} empty="No missing skills detected." />
        </SectionShell>
        <SectionShell title="Salary Clues">
          <List items={report.salaryClues} empty="No salary clues found." />
        </SectionShell>
      </div>
      <SectionShell title="Keyword Ranking">
        <div className="grid gap-2 md:grid-cols-2">
          {report.keywordRanking.map((item) => (
            <div key={item.keyword} className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">{item.keyword}</span>
              <span className={item.presentInCareerMemory ? "text-emerald-700" : "text-amber-700"}>
                {item.importance} | {item.presentInCareerMemory ? "in memory" : "missing"}
              </span>
            </div>
          ))}
        </div>
      </SectionShell>
    </div>
  );
}

export function ATSAuditTab({ resume }: { resume: CareerPathResume | null }) {
  const audit = resume?.audit;
  if (!audit) {
    return (
      <SectionShell title="ATS Audit">
        <p className="text-sm text-slate-500">Build or paste a resume to see ATS scoring.</p>
      </SectionShell>
    );
  }
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Metric label="Overall" value={`${audit.score.overall} /100`} />
        <Metric label="Keywords" value={`${audit.score.keywordCoverage} /100`} />
        <Metric label="Format" value={`${audit.score.formattingSafety} /100`} />
        <Metric label="Grammar" value={`${audit.score.clarity} /100`} />
        <Metric label="Proof" value={`${audit.score.proofAndMetrics} /100`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionShell title="Weak Bullets">
            <List items={audit.issues.filter(i => i.type === 'WEAK_BULLET').map((issue) => `${issue.section}: ${issue.message}`)} empty="No weak bullets found." />
          </SectionShell>
          <SectionShell title="Missing Metrics">
            <List items={audit.issues.filter(i => i.type === 'MISSING_METRIC').map((issue) => `${issue.section}: ${issue.message}`)} empty="No missing metrics." />
          </SectionShell>
          <SectionShell title="Timeline Issues">
            <List items={audit.issues.filter(i => i.type === 'TIMELINE_GAP').map((issue) => `${issue.section}: ${issue.message}`)} empty="No timeline gaps detected." />
          </SectionShell>
          <SectionShell title="Other Issues">
            <List items={audit.issues.filter(i => !['WEAK_BULLET', 'MISSING_METRIC', 'TIMELINE_GAP'].includes(i.type)).map((issue) => `${issue.section}: ${issue.message}`)} empty="No other issues found." />
          </SectionShell>
        </div>
        <div className="space-y-4">
          <SectionShell title="Recommendations">
            <List items={audit.recommendedFixes} empty="No recommendations yet." />
          </SectionShell>
          <SectionShell title="Readability And Achievement Quality">
            <List
              items={[
                `Readability: ${audit.score.clarity}/100`,
                `Achievement quality: ${audit.score.bulletStrength}/100`,
                `Missing metrics risk: ${audit.score.proofAndMetrics < 75 ? "needs attention" : "healthy"}`,
                `Timeline and formatting risk: ${audit.score.formattingSafety < 85 ? "review formatting" : "safe"}`,
              ]}
            />
          </SectionShell>
        </div>
      </div>
    </div>
  );
}

export function ImproveTab({
  resume,
  workspace,
  onCommand,
}: {
  resume: CareerPathResume | null;
  workspace: CareerWorkspaceState | null;
  onCommand: (command: string) => void;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <SectionShell title="AI Improvement">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Weak bullets" value={resume?.audit?.issues.filter((issue) => issue.type.includes("weak")).length ?? 0} />
          <Metric label="Missing metrics" value={(workspace?.coachNotes ?? []).filter((note) => /impact|metric/i.test(note.title + note.message)).length} />
          <Metric label="Proof gaps" value={workspace?.careerProfile?.gaps.filter((gap) => /proof|impact/i.test(gap.area)).length ?? 0} />
        </div>
        <button
          type="button"
          onClick={() => onCommand("Improve my resume")}
          className="mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Improve resume
        </button>
      </SectionShell>
      <SectionShell title="Improvement Queue">
        <List items={[
          ...(resume?.audit?.recommendedFixes ?? []),
          ...(workspace?.careerProfile?.weaknesses ?? []).map((item) => item.suggestedFix),
        ]} empty="No improvement queue yet." />
      </SectionShell>
    </div>
  );
}

export function TailorTab({
  resume,
  workspace,
  onCommand,
}: {
  resume: CareerPathResume | null;
  workspace: CareerWorkspaceState | null;
  onCommand: (command: string) => void;
}) {
  const tailoring = resume?.tailoring;
  const job = workspace?.jobDescription;
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <SectionShell title="Job Tailoring" description="Paste a job description in the agent to tailor without keyword stuffing.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Match" value={`${tailoring?.matchScore ?? resume?.resumeDocument?.score?.roleMatch ?? "-"} /100`} />
          <Metric label="Matched keywords" value={tailoring?.matchedKeywords?.length ?? job?.keywords.length ?? 0} />
          <Metric label="Missing" value={tailoring?.missingKeywordsNotAdded?.length ?? 0} />
        </div>
        <button
          type="button"
          onClick={() => onCommand("Tailor my resume to this job description: ")}
          className="mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Tailor to a job
        </button>
      </SectionShell>
      {tailoring && (
        <SectionShell title="Changes Made">
          <List items={tailoring.tailoringSummary} />
          {tailoring.missingKeywordsNotAdded.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-900">Unsupported keywords left out</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {tailoring.missingKeywordsNotAdded.map((keyword) => (
                  <Badge key={keyword} variant="outline">{keyword}</Badge>
                ))}
              </div>
            </div>
          )}
        </SectionShell>
      )}
    </div>
  );
}

export function CoverLetterTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const pack = workspace?.applicationPack;
  if (!pack) {
    return (
      <SectionShell title="Cover Letter" description="Generate job-specific writing from Career Memory and a job description.">
        <button
          type="button"
          onClick={() => onCommand("Write a cover letter for this job description: ")}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create cover letter
        </button>
      </SectionShell>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <TextBlock title="Cover Letter" text={pack.coverLetter} />
      <TextBlock title="Recruiter DM" text={pack.recruiterDM} />
      <TextBlock title="Cold Email" text={pack.coldEmail} />
      <TextBlock title="LinkedIn Message" text={pack.linkedinMessage} />
      <TextBlock title="Why Fit Answer" text={pack.whyFitAnswer} />
      <TextBlock title="Follow-up Message" text={pack.followUpMessage} />
    </div>
  );
}

export function LinkedInTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const linkedIn = workspace?.linkedInOptimization;
  if (!linkedIn) {
    return (
      <SectionShell title="LinkedIn Optimizer">
        <button
          type="button"
          onClick={() => onCommand("Optimize my LinkedIn profile")}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Generate LinkedIn sections
        </button>
      </SectionShell>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <TextBlock title="Headline" text={linkedIn.headline} />
      <TextBlock title="About" text={linkedIn.about} />
      <SectionShell title="Experience Updates">
        <List items={linkedIn.experienceUpdates} empty="No experience updates yet." />
      </SectionShell>
      <SectionShell title="Skills And SEO Keywords">
        <BadgeCloud items={linkedIn.skills} empty="No skills stored yet." />
        <div className="mt-4">
          <BadgeCloud items={linkedIn.keywords} empty="No keywords generated yet." />
        </div>
      </SectionShell>
      <SectionShell title="Featured">
        <List items={linkedIn.featured} empty="No featured items yet." />
      </SectionShell>
    </div>
  );
}

export function ApplicationsTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const applications = workspace?.applications ?? [];
  const statuses = ["saved", "applied", "follow_up_needed", "interview", "rejected", "offer", "ghosted"];
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Application Tracker</h2>
          <p className="text-sm text-slate-500">Track jobs so CareerPath AI can learn from your search loop.</p>
        </div>
        <button
          type="button"
          onClick={() => onCommand("Track this job application: ")}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Track application
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statuses.map((status) => {
          const items = applications.filter((item) => item.status === status);
          return (
            <section key={status} className="min-h-[160px] rounded-lg border bg-white p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold capitalize text-slate-900">{status.replaceAll("_", " ")}</h3>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="rounded-md border bg-slate-50 p-3">
                    <p className="font-medium text-slate-950">{item.company}</p>
                    <p className="text-sm text-slate-600">{item.role}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.followUpAt ? "Next: follow up scheduled" : "Next: prepare or update status"}</p>
                  </div>
                ))}
                {items.length === 0 && <p className="text-xs text-slate-400">No jobs yet.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function MemoryTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const profile = workspace?.careerProfile;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <SectionShell title="Career Memory">
        <MemorySummary workspace={workspace} expanded />
      </SectionShell>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell title="Personal Profile">
          <List items={[
            profile?.personal.fullName ? `Name: ${profile.personal.fullName}` : "",
            profile?.personal.email ? `Email: ${profile.personal.email}` : "",
            profile?.personal.phone ? `Phone: ${profile.personal.phone}` : "",
            profile?.personal.location ? `Location: ${profile.personal.location}` : "",
            profile?.personal.linkedin ? `LinkedIn: ${profile.personal.linkedin}` : "",
            profile?.personal.github ? `GitHub: ${profile.personal.github}` : "",
            profile?.personal.portfolio ? `Portfolio: ${profile.personal.portfolio}` : "",
            profile?.personal.workAuthorization ? `Work authorization: ${profile.personal.workAuthorization}` : "",
          ].filter(Boolean)} empty="No personal profile stored yet." />
        </SectionShell>
        <SectionShell title="Career Goals">
          <List items={[
            profile?.target.dreamRole ? `Dream role: ${profile.target.dreamRole}` : "",
            profile?.target.targetRoles.length ? `Target roles: ${profile.target.targetRoles.join(", ")}` : "",
            profile?.target.targetIndustries.length ? `Industries: ${profile.target.targetIndustries.join(", ")}` : "",
            profile?.target.targetSalary ? `Target salary: ${profile.target.targetSalary}` : "",
            profile?.target.workPreference ? `Work mode: ${profile.target.workPreference}` : "",
            profile?.target.relocation ? "Open to relocation" : "",
          ].filter(Boolean)} empty="No goals stored yet." />
        </SectionShell>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionShell title="Education">
          <List items={(profile?.education ?? []).map((item) => [item.degree, item.field, item.institution, item.endDate].filter(Boolean).join(" | "))} empty="No education stored yet." />
        </SectionShell>
        <SectionShell title="Experience">
          <List items={(profile?.experience ?? []).map((item) => [item.title, item.company, item.startDate && item.endDate ? `${item.startDate}-${item.endDate}` : ""].filter(Boolean).join(" | "))} empty="No experience stored yet." />
        </SectionShell>
        <SectionShell title="Projects">
          <List items={(profile?.projects ?? []).map((item) => `${item.name}${item.technologies.length ? ` | ${item.technologies.slice(0, 4).join(", ")}` : ""}`)} empty="No projects stored yet." />
        </SectionShell>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionShell title="Skills">
          <BadgeCloud items={(profile?.skills ?? []).map((skill) => skill.name)} empty="No skills stored yet." />
        </SectionShell>
        <SectionShell title="Certifications">
          <List items={(profile?.certifications ?? []).map((item) => [item.name, item.issuer, item.date].filter(Boolean).join(" | "))} empty="No certifications stored yet." />
        </SectionShell>
        <SectionShell title="Documents">
          <List items={(profile?.documents ?? []).map((item) => `${item.name} (${item.type.replaceAll("_", " ")})`)} empty="No documents stored yet." />
        </SectionShell>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell title="Memory Gaps">
          <List items={(profile?.gaps ?? []).slice(0, 6).map((gap) => `${gap.question} (${gap.importance})`)} empty="No major missing details found yet." />
          <button
            type="button"
            onClick={() => onCommand("Add this to my Career Memory: ")}
            className="mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add memory
          </button>
        </SectionShell>
        <SectionShell title="Smart Resume Versions">
          <div className="grid gap-3 sm:grid-cols-2">
            {(workspace?.smartVersions ?? []).map((version) => (
              <div key={version.versionType} className="rounded-md border bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-950">{version.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">{version.whenToUse}</p>
                <p className="mt-2 text-xs text-slate-500">Emphasizes: {version.emphasizes.slice(0, 3).join(", ")}</p>
              </div>
            ))}
          </div>
        </SectionShell>
      </div>
    </div>
  );
}

export function CoachTab({ workspace }: { workspace: CareerWorkspaceState | null }) {
  const notes = workspace?.coachNotes ?? [];
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <SectionShell title="AI Career Coach">
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-md border bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-950">{note.title}</h3>
                <Badge variant={note.priority === "high" ? "outline" : "secondary"}>{note.priority}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{note.message}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{note.action}</p>
            </div>
          ))}
          {!notes.length && <p className="text-sm text-slate-500">No coach notes yet.</p>}
        </div>
      </SectionShell>
    </div>
  );
}

export function AchievementLoggerTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const profile = workspace?.careerProfile;
  const log = workspace?.achievementLog;
  const achievements = profile?.achievements ?? [];
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <SectionShell title="Achievement Logger">
        <button
          type="button"
          onClick={() => onCommand("Log achievement: ")}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Log achievement
        </button>
        {log && (
          <div className="mt-4 rounded-md border bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-950">Latest log</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{log.achievement.text}</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{log.suggestedResumeBullet}</p>
            <div className="mt-3">
              <BadgeCloud items={log.linkedSkills} empty="No linked skills yet." />
            </div>
          </div>
        )}
      </SectionShell>
      <SectionShell title="Stored Achievements">
        <List items={achievements.map((item) => `${item.text}${item.context ? ` (${item.context})` : ""}`)} empty="No achievements stored yet." />
      </SectionShell>
      <SectionShell title="Suggested Resume Bullets">
        <List items={workspace?.mining?.strongBullets ?? []} empty="Add achievements or project details to see suggested bullets." />
      </SectionShell>
    </div>
  );
}
