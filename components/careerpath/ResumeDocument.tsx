import type { ReactNode } from "react";
import type { CareerPathResumeContent } from "@/lib/careerpath/types";

export function ResumeDocument({ content }: { content: CareerPathResumeContent }) {
  const contactItems = [
    clean(content.header.email),
    clean(content.header.phone),
    clean(content.header.location),
    clean(content.header.links?.linkedin),
    clean(content.header.links?.github),
    clean(content.header.links?.portfolio),
  ].filter(Boolean) as string[];
  const displayName = clean(content.header.name);

  return (
    <article className="resume-print-page min-h-[1056px] bg-white p-8 text-sm leading-snug text-slate-900 shadow-sm ring-1 ring-slate-200 sm:p-12">
      {(displayName || contactItems.length > 0) && (
        <header className="mb-6 text-center">
          {displayName && <h1 className="text-2xl font-bold uppercase tracking-wide">{displayName}</h1>}
          {contactItems.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-1 text-xs text-slate-600">
            {contactItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          )}
        </header>
      )}

      {content.summary && (
        <ResumeSection title="Summary">
          <p className="text-xs leading-relaxed text-slate-800">{content.summary}</p>
        </ResumeSection>
      )}

      {content.skills.filter((group) => group.items.length > 0).length > 0 && (
        <ResumeSection title="Skills">
          <div className="space-y-1 text-xs">
            {content.skills.filter((group) => group.items.length > 0).map((group) => (
              <div key={group.category} className="grid grid-cols-[112px_1fr] gap-3">
                <strong>{group.category}</strong>
                <span>{group.items.join(", ")}</span>
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {content.projects.filter((project) => clean(project.name)).length > 0 && (
        <ResumeSection title="Projects">
          <div className="space-y-4">
            {content.projects.filter((project) => clean(project.name)).map((project, index) => (
              <div key={`${project.name}-${index}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-bold">{project.name}</h3>
                  {project.link && <span className="text-xs text-blue-700">{project.link}</span>}
                </div>
                {project.techStack.filter(Boolean).length > 0 && <p className="mb-1 text-xs italic text-slate-600">Tech: {project.techStack.filter(Boolean).join(", ")}</p>}
                {project.bullets.filter((bullet) => clean(bullet)).length > 0 && (
                  <ul className="list-disc space-y-1 pl-4 text-xs text-slate-800">
                    {project.bullets.filter((bullet) => clean(bullet)).slice(0, 3).map((bullet, bulletIndex) => (
                      <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {content.experience.filter((experience) => clean(experience.company) || clean(experience.role) || experience.bullets.length > 0).length > 0 && (
        <ResumeSection title="Experience">
          <div className="space-y-3">
            {content.experience.filter((experience) => clean(experience.company) || clean(experience.role) || experience.bullets.length > 0).map((experience, index) => (
              <div key={`${experience.company}-${index}`}>
                <div className="flex justify-between gap-3 text-xs">
                  <strong>{[experience.role, experience.company].filter(clean).join(" at ")}</strong>
                  {clean(experience.dates) && <span>{experience.dates}</span>}
                </div>
                {experience.bullets.filter((bullet) => clean(bullet)).length > 0 && (
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                    {experience.bullets.filter((bullet) => clean(bullet)).map((bullet, bulletIndex) => (
                      <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {content.education.filter((education) => clean(education.institution) || clean(education.degree) || clean(education.dates) || clean(education.score)).length > 0 && (
        <ResumeSection title="Education">
          <div className="space-y-1">
            {content.education.filter((education) => clean(education.institution) || clean(education.degree) || clean(education.dates) || clean(education.score)).map((education, index) => (
              <div key={`${education.institution}-${index}`} className="flex justify-between gap-4 text-xs">
                <span>
                  {education.institution && <strong>{education.institution}</strong>}
                  {education.institution && education.degree && " - "}
                  {!education.institution && education.degree && <strong>{education.degree}</strong>}
                  {education.institution && education.degree && education.degree}
                </span>
                <span>{[education.dates, education.score].filter(Boolean).join(" | ")}</span>
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {content.certifications.length > 0 && (
        <ResumeSection title="Certifications">
          <div className="space-y-1 text-xs">
            {content.certifications.map((certificate, index) => (
              <div key={`${certificate.name}-${index}`}>
                <strong>{certificate.name}</strong>
                {certificate.issuer && ` - ${certificate.issuer}`}
                {certificate.date && ` (${certificate.date})`}
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {content.achievements.length > 0 && (
        <ResumeSection title="Achievements">
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {content.achievements.map((achievement) => (
              <li key={achievement}>{achievement}</li>
            ))}
          </ul>
        </ResumeSection>
      )}

      {content.languages.length > 0 && (
        <ResumeSection title="Languages">
          <p className="text-xs">{content.languages.join(", ")}</p>
        </ResumeSection>
      )}
    </article>
  );
}

function clean(value?: string | null) {
  if (!value) return "";
  if (/your |example@email|anytown|n\/a|unknown/i.test(value)) return "";
  return value.trim();
}

function ResumeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 border-b border-slate-300 pb-1 text-xs font-bold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}
