"use client";

import { ResumeContentSchema, type CareerPathResume } from "./types";

const RESUME_KEY = "careerpath_resumes";

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getCareerPathResumes() {
  return readLocal<CareerPathResume[]>(RESUME_KEY, []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCareerPathResume(id: string) {
  return getCareerPathResumes().find((resume) => resume.id === id) ?? null;
}

export function saveCareerPathResume(resume: CareerPathResume) {
  if (resume.content) {
    const parseResult = ResumeContentSchema.safeParse(resume.content);
    if (!parseResult.success) {
      console.error("[StateCorruptionError] Failed to save malformed AI output:", parseResult.error);
      throw new Error("StateCorruptionError: The generated resume data is malformed and cannot be saved safely.");
    }
  }

  const now = new Date().toISOString();
  const resumes = getCareerPathResumes();
  const index = resumes.findIndex((item) => item.id === resume.id);
  const nextResume = { ...resume, updatedAt: now };
  if (index >= 0) {
    resumes[index] = nextResume;
  } else {
    resumes.unshift(nextResume);
  }
  writeLocal(RESUME_KEY, resumes);
  return nextResume;
}

export function deleteCareerPathResume(id: string) {
  writeLocal(RESUME_KEY, getCareerPathResumes().filter((resume) => resume.id !== id));
}

export function duplicateCareerPathResume(resume: CareerPathResume) {
  const now = new Date().toISOString();
  const copy: CareerPathResume = {
    ...resume,
    id: crypto.randomUUID(),
    title: `${resume.title} v${resume.version + 1}`,
    version: resume.version + 1,
    createdAt: now,
    updatedAt: now,
  };
  return saveCareerPathResume(copy);
}
