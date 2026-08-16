import type { CareerProfile, ProofLevel } from "@/lib/careerpath/types";
import type { CareerEvidenceGraph, CareerEvidenceNode } from "./types";

const PROOF_ORDER: Record<ProofLevel, number> = {
  risky: 0,
  weak: 1,
  estimated: 2,
  strong: 3,
  verified: 4,
};

function unique(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function inferredProof(level: ProofLevel | undefined, evidence: string[], urls: string[]): ProofLevel {
  if (level) return level;
  if (urls.length || evidence.length >= 2) return "strong";
  if (evidence.length === 1) return "estimated";
  return "weak";
}

function addSkillEvidence(target: Record<string, string[]>, skills: string[], label: string) {
  for (const skill of skills) {
    const key = skill.trim().toLowerCase();
    if (!key) continue;
    target[key] = unique([...(target[key] || []), label]);
  }
}

export function buildCareerEvidenceGraph(profile: CareerProfile): CareerEvidenceGraph {
  const nodes: CareerEvidenceNode[] = [];
  const skillEvidence: Record<string, string[]> = {};

  for (const item of profile.experience) {
    const evidence = unique([
      ...(item.metrics || []),
      ...(item.businessImpact || []),
      ...(item.documents || []).map((document) => document.name),
      ...item.achievements.map((achievement) => achievement.evidence || achievement.metric),
    ]);
    const urls = unique((item.documents || []).map((document) => document.url));
    const skills = unique(item.technologies);
    const label = `${item.title} @ ${item.company}`;
    nodes.push({
      id: `experience:${item.id}`,
      type: "experience",
      label,
      proofLevel: inferredProof(item.proofLevel, evidence, urls),
      skills,
      claims: unique([
        item.description,
        ...item.responsibilities,
        ...item.achievements.map((achievement) => achievement.text),
        ...(item.leadership || []),
        ...(item.businessImpact || []),
      ]),
      evidence,
      urls,
    });
    addSkillEvidence(skillEvidence, skills, label);
  }

  for (const item of profile.projects) {
    const urls = unique([item.github, item.liveDemo, ...item.links.map((link) => link.url)]);
    const evidence = unique([
      ...(item.metrics || []),
      ...item.achievements.map((achievement) => achievement.evidence || achievement.metric),
      ...(item.screenshots || []),
    ]);
    const skills = unique(item.technologies);
    nodes.push({
      id: `project:${item.id}`,
      type: "project",
      label: item.name,
      proofLevel: inferredProof(item.proofLevel, evidence, urls),
      skills,
      claims: unique([
        item.description,
        item.problem,
        item.solution,
        item.role,
        ...item.achievements.map((achievement) => achievement.text),
        ...(item.metrics || []),
      ]),
      evidence,
      urls,
    });
    addSkillEvidence(skillEvidence, skills, item.name);
  }

  for (const item of profile.achievements) {
    const evidence = unique([item.evidence, item.metric, item.context, item.impact]);
    nodes.push({
      id: `achievement:${item.id}`,
      type: "achievement",
      label: item.text,
      proofLevel: inferredProof(item.proofLevel, evidence, []),
      skills: [],
      claims: unique([item.text, item.context, item.impact]),
      evidence,
      urls: [],
    });
  }

  for (const item of profile.certifications) {
    const skills = unique(item.skills || []);
    const urls = unique([item.credentialUrl]);
    const label = `${item.name}${item.issuer ? ` — ${item.issuer}` : ""}`;
    nodes.push({
      id: `certification:${item.id}`,
      type: "certification",
      label,
      proofLevel: urls.length ? "verified" : "strong",
      skills,
      claims: unique([item.name, item.issuer]),
      evidence: unique([item.credentialUrl]),
      urls,
    });
    addSkillEvidence(skillEvidence, skills, label);
  }

  for (const item of profile.skills) {
    const evidence = unique(item.evidence || []);
    nodes.push({
      id: `skill:${item.id}`,
      type: "skill",
      label: item.name,
      proofLevel: evidence.length ? "strong" : "weak",
      skills: [item.name],
      claims: [item.name],
      evidence,
      urls: [],
    });
    if (evidence.length) addSkillEvidence(skillEvidence, [item.name], item.name);
  }

  const verifiedNodes = nodes.filter((node) => node.proofLevel === "verified").length;
  const strongNodes = nodes.filter((node) => PROOF_ORDER[node.proofLevel] >= PROOF_ORDER.strong).length;
  const coveredNodes = nodes.filter((node) => node.evidence.length || node.urls.length || PROOF_ORDER[node.proofLevel] >= PROOF_ORDER.strong).length;

  return {
    nodes,
    skillEvidence,
    stats: {
      totalNodes: nodes.length,
      verifiedNodes,
      strongNodes,
      evidenceCoverage: nodes.length ? Math.round((coveredNodes / nodes.length) * 100) : 0,
      skillsWithEvidence: Object.keys(skillEvidence).length,
    },
  };
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\- ]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

export function findEvidenceForRequirement(graph: CareerEvidenceGraph, requirement: string): CareerEvidenceNode[] {
  const normalized = requirement.trim().toLowerCase();
  if (!normalized) return [];
  const requirementTokens = tokens(requirement);
  return graph.nodes
    .map((node) => {
      const haystack = [node.label, ...node.skills, ...node.claims, ...node.evidence].join(" ").toLowerCase();
      const exact = haystack.includes(normalized);
      const matchedTokens = requirementTokens.filter((token) => haystack.includes(token)).length;
      return { node, score: exact ? 100 : matchedTokens };
    })
    .filter(({ score }) => score >= Math.max(1, Math.ceil(requirementTokens.length * 0.6)))
    .sort((a, b) => PROOF_ORDER[b.node.proofLevel] - PROOF_ORDER[a.node.proofLevel] || b.score - a.score)
    .slice(0, 4)
    .map(({ node }) => node);
}
