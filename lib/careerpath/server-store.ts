import type { BuilderSession, CareerPathResume } from "./types";

type CareerPathMemoryStore = {
  sessions: Map<string, BuilderSession>;
  resumes: Map<string, CareerPathResume>;
};

const globalForCareerPath = globalThis as typeof globalThis & {
  __careerPathStore?: CareerPathMemoryStore;
};

export const careerPathStore: CareerPathMemoryStore =
  globalForCareerPath.__careerPathStore ??
  (globalForCareerPath.__careerPathStore = {
    sessions: new Map(),
    resumes: new Map(),
  });

export function saveSession(session: BuilderSession) {
  session.updatedAt = new Date().toISOString();
  careerPathStore.sessions.set(session.id, session);
  return session;
}

export function getSession(id: string) {
  return careerPathStore.sessions.get(id) ?? null;
}

export function saveServerResume(resume: CareerPathResume) {
  careerPathStore.resumes.set(resume.id, resume);
  return resume;
}

export function getServerResume(id: string) {
  return careerPathStore.resumes.get(id) ?? null;
}
