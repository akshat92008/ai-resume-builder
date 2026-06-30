import { resumeStateToContent } from "./types";
import { removeEmptySections, removeUnsupportedPlaceholders } from "./validator";
import type { CareerPathResumeContent } from "@/lib/careerpath/types";
import type { ResumeState } from "./types";

export function deriveRenderableResume(state: ResumeState): CareerPathResumeContent {
  const cleaned = removeEmptySections(removeUnsupportedPlaceholders(state));
  const content = resumeStateToContent(cleaned);
  return {
    ...content,
    header: {
      ...content.header,
      name: safe(content.header.name),
      email: safe(content.header.email),
      phone: safe(content.header.phone),
      location: safe(content.header.location),
      links: {
        linkedin: safe(content.header.links.linkedin),
        github: safe(content.header.links.github),
        portfolio: safe(content.header.links.portfolio),
      },
    },
    summary: safe(content.summary),
    skills: content.skills.filter((group) => group.items.length > 0),
    projects: content.projects.filter((project) => project.name).map((project) => ({ ...project, bullets: project.bullets.slice(0, 3) })),
    experience: content.experience.filter((experience) => experience.company || experience.role || experience.bullets.length),
    education: content.education.filter((education) => education.institution || education.degree || education.dates || education.score),
    certifications: content.certifications.filter((certificate) => certificate.name),
    achievements: content.achievements.filter(Boolean),
    languages: content.languages.filter(Boolean),
  };
}

function safe(value?: string | null) {
  if (!value || /your |example@email|anytown|n\/a/i.test(value)) return "";
  return value;
}
