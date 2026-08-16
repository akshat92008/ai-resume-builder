import type { CareerPathResumeContent } from "./types";

type PdfLine = { text: string; bold?: boolean; size?: number; gapBefore?: number };

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 46;
const TOP = 800;
const BOTTOM = 46;
const DEFAULT_SIZE = 9.5;
const LINE_HEIGHT = 12.5;

function ascii(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrap(text: string, max = 94) {
  const clean = ascii(text);
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) current = word;
    else if (`${current} ${word}`.length <= max) current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function section(title: string, body: PdfLine[], target: PdfLine[]) {
  if (!body.length) return;
  target.push({ text: title.toUpperCase(), bold: true, size: 10.5, gapBefore: 5 });
  target.push(...body);
}

export function resumeContentToPdfLines(content: CareerPathResumeContent): PdfLine[] {
  const lines: PdfLine[] = [];
  const name = ascii(content.header.name) || "Resume";
  lines.push({ text: name, bold: true, size: 16 });

  const contact = [
    content.header.email,
    content.header.phone,
    content.header.location,
    content.header.links.linkedin,
    content.header.links.github,
    content.header.links.portfolio,
  ].map(ascii).filter(Boolean).join(" | ");
  if (contact) wrap(contact, 100).forEach((text) => lines.push({ text, size: 8.5 }));

  section("Summary", wrap(content.summary).map((text) => ({ text })), lines);

  const skillLines = content.skills.flatMap((group) => {
    const text = `${ascii(group.category)}: ${group.items.map(ascii).filter(Boolean).join(", ")}`;
    return wrap(text).map((item) => ({ text: item }));
  });
  section("Skills", skillLines, lines);

  const experienceLines: PdfLine[] = [];
  for (const item of content.experience) {
    const heading = [item.role, item.company, item.dates, item.location].map(ascii).filter(Boolean).join(" | ");
    wrap(heading).forEach((text) => experienceLines.push({ text, bold: true }));
    for (const bullet of item.bullets) wrap(`- ${bullet}`).forEach((text) => experienceLines.push({ text }));
  }
  section("Experience", experienceLines, lines);

  const projectLines: PdfLine[] = [];
  for (const item of content.projects) {
    const heading = [item.name, item.techStack.map(ascii).filter(Boolean).join(", "), item.link].map(ascii).filter(Boolean).join(" | ");
    wrap(heading).forEach((text) => projectLines.push({ text, bold: true }));
    for (const bullet of item.bullets) wrap(`- ${bullet}`).forEach((text) => projectLines.push({ text }));
  }
  section("Projects", projectLines, lines);

  const educationLines: PdfLine[] = [];
  for (const item of content.education) {
    const text = [item.degree, item.institution, item.dates, item.score, item.location].map(ascii).filter(Boolean).join(" | ");
    wrap(text).forEach((line) => educationLines.push({ text: line }));
  }
  section("Education", educationLines, lines);

  const certificationLines = content.certifications.flatMap((item) =>
    wrap([item.name, item.issuer, item.date, item.link].map(ascii).filter(Boolean).join(" | ")).map((text) => ({ text })),
  );
  section("Certifications", certificationLines, lines);

  section("Achievements", content.achievements.flatMap((item) => wrap(`- ${item}`).map((text) => ({ text }))), lines);
  if (content.languages.length) section("Languages", wrap(content.languages.map(ascii).filter(Boolean).join(", ")).map((text) => ({ text })), lines);

  return lines;
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function paginate(lines: PdfLine[]) {
  const pages: PdfLine[][] = [[]];
  let y = TOP;
  for (const line of lines) {
    const size = line.size ?? DEFAULT_SIZE;
    const gap = line.gapBefore ?? 0;
    const required = Math.max(LINE_HEIGHT, size + 3) + gap;
    if (y - required < BOTTOM && pages[pages.length - 1].length) {
      pages.push([]);
      y = TOP;
    }
    pages[pages.length - 1].push(line);
    y -= required;
  }
  return pages;
}

function pageStream(lines: PdfLine[]) {
  let y = TOP;
  const commands: string[] = ["BT"];
  for (const line of lines) {
    y -= line.gapBefore ?? 0;
    const size = line.size ?? DEFAULT_SIZE;
    commands.push(`/${line.bold ? "F2" : "F1"} ${size.toFixed(1)} Tf`);
    commands.push(`1 0 0 1 ${LEFT} ${y.toFixed(1)} Tm`);
    commands.push(`(${escapePdfText(ascii(line.text))}) Tj`);
    y -= Math.max(LINE_HEIGHT, size + 3);
  }
  commands.push("ET");
  return commands.join("\n") + "\n";
}

/**
 * Deterministic, one-column, standard-font PDF. The renderer intentionally
 * avoids images, columns, tables, embedded fonts, and browser print behavior
 * so the exact bytes downloaded are the bytes ATS verification can reparse.
 */
export function renderResumePdf(content: CareerPathResumeContent): Buffer {
  const pages = paginate(resumeContentToPdfLines(content));
  const objects = new Map<number, Buffer>();
  const pageRefs: number[] = [];

  objects.set(1, Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"));
  objects.set(3, Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "ascii"));
  objects.set(4, Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>", "ascii"));

  pages.forEach((pageLines, index) => {
    const pageObject = 5 + index * 2;
    const contentObject = pageObject + 1;
    pageRefs.push(pageObject);
    const stream = Buffer.from(pageStream(pageLines), "ascii");
    objects.set(contentObject, Buffer.concat([
      Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "ascii"),
      stream,
      Buffer.from("endstream", "ascii"),
    ]));
    objects.set(pageObject, Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`,
      "ascii",
    ));
  });

  objects.set(2, Buffer.from(`<< /Type /Pages /Kids [${pageRefs.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`, "ascii"));

  const maxObject = Math.max(...objects.keys());
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n%CareerOS ATS-safe resume\n", "ascii")];
  const offsets = new Array(maxObject + 1).fill(0);
  let offset = chunks[0].length;

  for (let id = 1; id <= maxObject; id++) {
    const object = objects.get(id);
    if (!object) throw new Error(`Missing PDF object ${id}`);
    offsets[id] = offset;
    const prefix = Buffer.from(`${id} 0 obj\n`, "ascii");
    const suffix = Buffer.from("\nendobj\n", "ascii");
    chunks.push(prefix, object, suffix);
    offset += prefix.length + object.length + suffix.length;
  }

  const xrefOffset = offset;
  const xref: string[] = [`xref`, `0 ${maxObject + 1}`, "0000000000 65535 f "];
  for (let id = 1; id <= maxObject; id++) xref.push(`${String(offsets[id]).padStart(10, "0")} 00000 n `);
  const trailer = [
    ...xref,
    "trailer",
    `<< /Size ${maxObject + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
    "",
  ].join("\n");
  chunks.push(Buffer.from(trailer, "ascii"));
  return Buffer.concat(chunks);
}
