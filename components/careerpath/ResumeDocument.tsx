import type { ReactNode } from "react";
import type { CareerPathResumeContent } from "@/lib/careerpath/types";

export type ResumeTemplateStyle = "modern" | "professional" | "minimal" | "executive" | "student";

const STYLE_MAP: Record<ResumeTemplateStyle, {
  container: string;
  headerAlign: "left" | "center";
  headerName: string;
  contactRow: string;
  sectionHeading: string;
  textBody: string;
}> = {
  modern: {
    container: "bg-white p-8 text-sm leading-snug text-slate-900 font-sans shadow-sm ring-1 ring-slate-200 sm:p-12",
    headerAlign: "center",
    headerName: "text-2xl font-bold uppercase tracking-wide text-slate-900",
    contactRow: "mt-2 flex flex-wrap justify-center gap-x-2 gap-y-1 text-xs text-slate-600",
    sectionHeading: "mb-2 border-b-2 border-slate-900 pb-1 text-xs font-bold uppercase tracking-wide text-slate-900",
    textBody: "text-xs text-slate-800",
  },
  professional: {
    container: "bg-white p-8 text-sm leading-relaxed text-gray-900 font-serif shadow-sm ring-1 ring-gray-200 sm:p-12",
    headerAlign: "center",
    headerName: "text-2xl font-bold uppercase tracking-wider text-gray-900",
    contactRow: "mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-600",
    sectionHeading: "mb-3 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-widest text-gray-800",
    textBody: "text-xs text-gray-800",
  },
  minimal: {
    container: "bg-white p-8 text-sm leading-loose text-neutral-800 font-sans shadow-sm ring-1 ring-neutral-100 sm:p-12",
    headerAlign: "left",
    headerName: "text-3xl font-light tracking-tight text-neutral-900",
    contactRow: "mt-1 flex flex-wrap justify-start gap-x-3 gap-y-1 text-xs text-neutral-500",
    sectionHeading: "mb-4 pt-2 text-xs font-medium uppercase tracking-widest text-neutral-400",
    textBody: "text-xs text-neutral-600",
  },
  executive: {
    container: "bg-white p-8 text-sm leading-snug text-slate-900 font-serif shadow-sm ring-1 ring-slate-200 sm:p-12",
    headerAlign: "center",
    headerName: "text-2xl font-extrabold uppercase tracking-wide text-slate-900",
    contactRow: "mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs font-medium text-slate-700",
    sectionHeading: "mb-2 border-b-[3px] border-slate-900 pb-1 text-xs font-extrabold uppercase tracking-wide text-slate-900",
    textBody: "text-xs text-slate-900 font-medium",
  },
  student: {
    container: "bg-white p-8 text-sm leading-snug text-slate-900 font-sans shadow-sm ring-1 ring-slate-200 sm:p-12 border-t-8 border-t-blue-600",
    headerAlign: "left",
    headerName: "text-3xl font-bold tracking-tight text-slate-900",
    contactRow: "mt-2 flex flex-wrap justify-start gap-x-2 gap-y-1 text-xs text-slate-600",
    sectionHeading: "mb-2 border-b border-blue-200 pb-1 text-xs font-bold uppercase tracking-wider text-blue-700",
    textBody: "text-xs text-slate-700",
  },
};

export function ResumeDocument({ content, style = "modern" }: { content: CareerPathResumeContent; style?: string }) {
  const contactItems = [
    clean(content.header.email),
    clean(content.header.phone),
    clean(content.header.location),
    clean(content.header.links?.linkedin),
    clean(content.header.links?.github),
    clean(content.header.links?.portfolio),
  ].filter(Boolean) as string[];
  const displayName = clean(content.header.name);

  // Fallback to modern if unknown style is passed
  const theme = STYLE_MAP[style as ResumeTemplateStyle] || STYLE_MAP.modern;

  // For Student style, prioritize Education section
  const isStudent = style === "student";
  
  return (
    <article className={`resume-print-page min-h-[1056px] ${theme.container}`}>
      {(displayName || contactItems.length > 0) && (
        <header className={`mb-6 ${theme.headerAlign === "center" ? "text-center" : "text-left"}`}>
          {displayName && <h1 className={theme.headerName}>{displayName}</h1>}
          {contactItems.length > 0 && (
          <div className={theme.contactRow}>
            {contactItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          )}
        </header>
      )}

      {content.summary && (
        <ResumeSection title="Summary" headingClass={theme.sectionHeading}>
          <p className={`${theme.textBody} leading-relaxed`}>{content.summary}</p>
        </ResumeSection>
      )}

      {isStudent && content.education.filter((education) => clean(education.institution) || clean(education.degree) || clean(education.dates) || clean(education.score)).length > 0 && (
        <EducationSection content={content} theme={theme} />
      )}

      {content.skills.filter((group) => group.items.length > 0).length > 0 && (
        <ResumeSection title="Skills" headingClass={theme.sectionHeading}>
          <div className={`space-y-1 ${theme.textBody}`}>
            {content.skills.filter((group) => group.items.length > 0).map((group) => (
              <div key={group.category} className="grid grid-cols-[112px_1fr] gap-3">
                <strong>{group.category}</strong>
                <span>{group.items.join(", ")}</span>
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {content.experience.filter((experience) => clean(experience.company) || clean(experience.role) || experience.bullets.length > 0).length > 0 && (
        <ResumeSection title="Experience" headingClass={theme.sectionHeading}>
          <div className="space-y-3">
            {content.experience.filter((experience) => clean(experience.company) || clean(experience.role) || experience.bullets.length > 0).map((experience, index) => (
              <div key={`${experience.company}-${index}`}>
                <div className={`flex justify-between gap-3 ${theme.textBody}`}>
                  <strong>{[experience.role, experience.company].filter(clean).join(" at ")}</strong>
                  {clean(experience.dates) && <span>{experience.dates}</span>}
                </div>
                {experience.bullets.filter((bullet) => clean(bullet)).length > 0 && (
                  <ul className={`mt-1 list-disc space-y-1 pl-4 ${theme.textBody}`}>
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
      
      {content.projects.filter((project) => clean(project.name)).length > 0 && (
        <ResumeSection title="Projects" headingClass={theme.sectionHeading}>
          <div className="space-y-4">
            {content.projects.filter((project) => clean(project.name)).map((project, index) => (
              <div key={`${project.name}-${index}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className={`${theme.textBody} font-bold text-[13px]`}>{project.name}</h3>
                  {project.link && <span className={`${theme.textBody} text-blue-600`}>{project.link}</span>}
                </div>
                {project.techStack.filter(Boolean).length > 0 && <p className={`mb-1 italic ${theme.textBody} opacity-80`}>Tech: {project.techStack.filter(Boolean).join(", ")}</p>}
                {project.bullets.filter((bullet) => clean(bullet)).length > 0 && (
                  <ul className={`list-disc space-y-1 pl-4 ${theme.textBody}`}>
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

      {!isStudent && content.education.filter((education) => clean(education.institution) || clean(education.degree) || clean(education.dates) || clean(education.score)).length > 0 && (
        <EducationSection content={content} theme={theme} />
      )}

      {content.certifications.length > 0 && (
        <ResumeSection title="Certifications" headingClass={theme.sectionHeading}>
          <div className={`space-y-1 ${theme.textBody}`}>
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
        <ResumeSection title="Achievements" headingClass={theme.sectionHeading}>
          <ul className={`list-disc space-y-1 pl-4 ${theme.textBody}`}>
            {content.achievements.map((achievement) => (
              <li key={achievement}>{achievement}</li>
            ))}
          </ul>
        </ResumeSection>
      )}

      {content.languages.length > 0 && (
        <ResumeSection title="Languages" headingClass={theme.sectionHeading}>
          <p className={theme.textBody}>{content.languages.join(", ")}</p>
        </ResumeSection>
      )}
    </article>
  );
}

function EducationSection({ content, theme }: { content: CareerPathResumeContent; theme: typeof STYLE_MAP[ResumeTemplateStyle] }) {
  return (
    <ResumeSection title="Education" headingClass={theme.sectionHeading}>
      <div className="space-y-1">
        {content.education.filter((education) => clean(education.institution) || clean(education.degree) || clean(education.dates) || clean(education.score)).map((education, index) => (
          <div key={`${education.institution}-${index}`} className={`flex justify-between gap-4 ${theme.textBody}`}>
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
  );
}

function clean(value?: string | null) {
  if (!value) return "";
  if (/your |example@email|anytown|n\/a|unknown/i.test(value)) return "";
  return value.trim();
}

function ResumeSection({ title, headingClass, children }: { title: string; headingClass: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className={headingClass}>{title}</h2>
      {children}
    </section>
  );
}
