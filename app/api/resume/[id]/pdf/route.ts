import { NextResponse } from "next/server";
import { getServerResume } from "@/lib/careerpath/server-store";
import type { CareerPathResumeContent } from "@/lib/careerpath/types";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const resume = getServerResume(id);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  return new NextResponse(renderResumeHtml(resume.content), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${safeFileName(resume.content.header.name, resume.targetRole)}.html"`,
    },
  });
}

function renderResumeHtml(content: CareerPathResumeContent) {
  const contact = [
    content.header.email,
    content.header.phone,
    content.header.location,
    content.header.links.linkedin,
    content.header.links.github,
    content.header.links.portfolio,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" | ");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(content.header.name || "CareerPath AI Resume")}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; background: #fff; margin: 32px; }
    main { max-width: 760px; margin: 0 auto; }
    h1 { text-align: center; font-size: 24px; margin: 0 0 6px; text-transform: uppercase; }
    .contact { text-align: center; font-size: 12px; color: #475569; margin-bottom: 22px; }
    h2 { font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 18px 0 8px; }
    p, li, div { font-size: 12px; line-height: 1.45; }
    ul { margin: 4px 0 0 18px; padding: 0; }
    .row { display: flex; justify-content: space-between; gap: 16px; }
    @page { size: A4; margin: 12mm; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(content.header.name || "Your Name")}</h1>
    <div class="contact">${contact}</div>
    ${section("Summary", `<p>${escapeHtml(content.summary)}</p>`)}
    ${section("Skills", content.skills.map((group) => `<div><strong>${escapeHtml(group.category)}:</strong> ${group.items.map(escapeHtml).join(", ")}</div>`).join(""))}
    ${section("Projects", content.projects.map((project) => `<div><strong>${escapeHtml(project.name)}</strong>${project.techStack.length ? ` - ${project.techStack.map(escapeHtml).join(", ")}` : ""}<ul>${project.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul></div>`).join(""))}
    ${section("Experience", content.experience.map((item) => `<div class="row"><strong>${escapeHtml(item.role)} at ${escapeHtml(item.company)}</strong><span>${escapeHtml(item.dates)}</span></div><ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`).join(""))}
    ${section("Education", content.education.map((item) => `<div class="row"><span><strong>${escapeHtml(item.institution)}</strong> - ${escapeHtml(item.degree)}</span><span>${escapeHtml([item.dates, item.score].filter(Boolean).join(" | "))}</span></div>`).join(""))}
    ${section("Certifications", content.certifications.map((item) => `<div><strong>${escapeHtml(item.name)}</strong>${item.issuer ? ` - ${escapeHtml(item.issuer)}` : ""}${item.date ? ` (${escapeHtml(item.date)})` : ""}</div>`).join(""))}
    ${section("Achievements", content.achievements.map((item) => `<div>${escapeHtml(item)}</div>`).join(""))}
  </main>
  <script>window.print()</script>
</body>
</html>`;
}

function section(title: string, body: string) {
  return body ? `<section><h2>${title}</h2>${body}</section>` : "";
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (character) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[character] ?? character;
  });
}

function safeFileName(name = "", role = "") {
  const base = [name || "CareerPathAI", role || "TargetRole", "Resume"].join("_");
  return base.replace(/[^a-z0-9_-]+/gi, "_").replace(/_+/g, "_");
}
