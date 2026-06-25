import type { ResumeContent } from "@/lib/types";

export function ResumePreview({ content }: { content: ResumeContent }) {
  return (
    <div>
    <article className="resume-print-page min-h-[1056px] bg-white p-8 text-sm leading-snug text-slate-900 shadow-sm ring-1 ring-slate-200 sm:p-12">
      <header className="mb-6 text-center">
        {content.header.name && <h1 className="text-2xl font-bold uppercase tracking-wide">{content.header.name}</h1>}
        <div className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-1 text-xs text-slate-600">
          {[content.header.email, content.header.phone, content.header.city].filter(Boolean).map((item) => (
            <span key={item}>{item}</span>
          ))}
          {content.header.links.map((link) => (
            <a key={link.url} href={link.url} className="text-blue-700">
              {link.label}
            </a>
          ))}
        </div>
      </header>

      {content.summary && (
        <section className="mb-5">
          <h2 className="mb-2 border-b border-slate-300 pb-1 text-xs font-bold uppercase tracking-wide">Summary</h2>
          <p className="text-xs leading-relaxed text-slate-800">{content.summary}</p>
        </section>
      )}

      <section className="mb-5">
        <h2 className="mb-2 border-b border-slate-300 pb-1 text-xs font-bold uppercase tracking-wide">Skills</h2>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="font-semibold">Technical</div>
          <div className="col-span-3">{content.skills.technical.join(", ")}</div>
          <div className="font-semibold">Tools</div>
          <div className="col-span-3">{content.skills.tools.join(", ")}</div>
          {content.skills.soft.length > 0 && (
            <>
              <div className="font-semibold">Soft</div>
              <div className="col-span-3">{content.skills.soft.join(", ")}</div>
            </>
          )}
        </div>
      </section>

      {content.projects.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 border-b border-slate-300 pb-1 text-xs font-bold uppercase tracking-wide">Projects</h2>
          <div className="space-y-4">
            {content.projects.map((project, index) => (
              <div key={`${project.title}-${index}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-bold">{project.title}</h3>
                  <div className="flex gap-2 text-xs">
                    {project.proofLinks.map((link) => (
                      <a key={link.url} href={link.url} className="text-blue-700">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
                {project.techStack.length > 0 && <p className="mb-1 text-xs italic text-slate-600">Tech: {project.techStack.join(", ")}</p>}
                <ul className="list-disc space-y-1 pl-4 text-xs text-slate-800">
                  {project.bullets.map((bullet, bulletIndex) => (
                    <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {content.experience.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 border-b border-slate-300 pb-1 text-xs font-bold uppercase tracking-wide">Experience</h2>
          <div className="space-y-3">
            {content.experience.map((experience, index) => (
              <div key={`${experience.company}-${index}`}>
                <div className="flex justify-between gap-3 text-xs">
                  <strong>{experience.role} at {experience.company}</strong>
                  <span>{experience.date}</span>
                </div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                  {experience.bullets.map((bullet, bulletIndex) => (
                    <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {content.education.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 border-b border-slate-300 pb-1 text-xs font-bold uppercase tracking-wide">Education</h2>
          {content.education.map((education, index) => (
            <div key={`${education.institution}-${index}`} className="flex justify-between gap-4 text-xs">
              <span><strong>{education.institution}</strong> - {education.degree}</span>
              <span>{education.date} {education.score && `| ${education.score}`}</span>
            </div>
          ))}
        </section>
      )}

      {content.certifications.length > 0 && (
        <section>
          <h2 className="mb-2 border-b border-slate-300 pb-1 text-xs font-bold uppercase tracking-wide">Certifications</h2>
          <div className="space-y-1 text-xs">
            {content.certifications.map((certificate, index) => (
              <div key={`${certificate.title}-${index}`}>
                <strong>{certificate.title}</strong> - {certificate.issuer} {certificate.date && `(${certificate.date})`}
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
    <div className="mt-6 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 ring-1 ring-yellow-200">
      <strong>Safety Notice:</strong> Generated resumes should be reviewed before sending to recruiters. Do not add fake projects, fake internships, or fake metrics.
    </div>
    </div>
  );
}
