import type { Project, ProofLink, Skill, UserVault } from "@/lib/types";
import type { SuggestedAction, VaultUpdate } from "@/lib/agents/types";
import { makeId } from "@/lib/utils";
import { cleanText, unique } from "@/lib/agents/utils";

function mergeUnique(existing: string[], incoming?: string[]) {
  return unique([...(existing ?? []), ...(incoming ?? [])]);
}

function emptyProject(title: string): Project {
  return {
    id: makeId("project"),
    title,
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

export function applyVaultUpdates(vault: UserVault, updates: VaultUpdate[]): UserVault {
  return updates.reduce((current, update) => {
    if (update.type === "profile") {
      return {
        ...current,
        profile: {
          ...current.profile,
          ...update.data,
          target_roles: update.data.target_roles?.length ? update.data.target_roles : current.profile.target_roles,
        },
      };
    }

    if (update.type === "skill") {
      const existingIndex = current.skills.findIndex((skill) => skill.name.toLowerCase() === update.data.name.toLowerCase());
      const nextSkill: Skill = {
        id: current.skills[existingIndex]?.id ?? makeId("skill"),
        name: update.data.name,
        category: update.data.category ?? current.skills[existingIndex]?.category ?? "other",
        proficiency: update.data.proficiency ?? current.skills[existingIndex]?.proficiency ?? "beginner",
        proof_links: mergeUnique(current.skills[existingIndex]?.proof_links ?? [], update.data.proof_links),
      };
      const skills = [...current.skills];
      if (existingIndex >= 0) skills[existingIndex] = nextSkill;
      else skills.push(nextSkill);
      return { ...current, skills };
    }

    if (update.type === "education") {
      const existing = current.education[0];
      const nextEducation = {
        id: existing?.id ?? makeId("education"),
        institution: existing?.institution ?? "",
        degree: update.data.degree || existing?.degree || "",
        field: update.data.field ?? existing?.field ?? "",
        start_year: update.data.start_year ?? existing?.start_year ?? 0,
        end_year: update.data.end_year ?? existing?.end_year ?? 0,
        score: update.data.score ?? existing?.score ?? "",
        coursework: mergeUnique(existing?.coursework ?? [], update.data.coursework),
        achievements: update.data.achievements ?? existing?.achievements ?? "",
      };
      return { ...current, education: [nextEducation, ...current.education.slice(1)] };
    }

    if (update.type === "project") {
      const existingIndex = current.projects.findIndex((project) => project.title.toLowerCase() === update.data.title.toLowerCase());
      const base = existingIndex >= 0 ? current.projects[existingIndex] : emptyProject(update.data.title);
      const nextProject: Project = {
        ...base,
        ...update.data,
        id: base.id,
        title: cleanText(update.data.title) || base.title,
        short_description: cleanText(update.data.short_description) || base.short_description,
        problem_solved: cleanText(update.data.problem_solved) || base.problem_solved,
        tech_stack: mergeUnique(base.tech_stack, update.data.tech_stack),
        features: mergeUnique(base.features, update.data.features),
        tags: mergeUnique(base.tags, update.data.tags),
      };
      const projects = [...current.projects];
      if (existingIndex >= 0) projects[existingIndex] = nextProject;
      else projects.push(nextProject);
      return { ...current, projects };
    }

    const proof: ProofLink = {
      id: makeId("proof"),
      title: update.data.title ?? "Proof link",
      url: update.data.url,
      type: update.data.type ?? "other",
      related_type: update.data.related_type,
      related_id: update.data.related_id,
      notes: update.data.notes ?? "Saved from CareerProof Agent",
    };
    if (current.proof_links.some((item) => item.url.toLowerCase() === proof.url.toLowerCase())) return current;
    return { ...current, proof_links: [...current.proof_links, proof] };
  }, vault);
}

export function defaultSuggestedActions(): SuggestedAction[] {
  return [
    { label: "Improve Career Memory", action: "open_vault", href: "/vault" },
    { label: "Analyze a job", action: "analyze_job", href: "/jobs/new" },
    { label: "Generate draft anyway", action: "generate_resume", href: "/resumes/new", payload: { force: true } },
  ];
}
