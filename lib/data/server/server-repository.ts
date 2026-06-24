import { isSupabaseMode } from "../client/mode";

import * as supabase from "./server-supabase";

export function getCurrentUser() {
  return isSupabaseMode() ? supabase.getCurrentUser() : Promise.resolve(null);
}

export function getCurrentProfile() {
  return isSupabaseMode() ? supabase.getCurrentProfile() : Promise.resolve(null);
}

export function getCurrentVault() {
  return isSupabaseMode() ? supabase.getCurrentVault() : Promise.resolve(null);
}

export function saveCurrentVault(vault: any) {
  return isSupabaseMode() ? supabase.saveCurrentVault(vault) : Promise.resolve(undefined);
}

export function getJobs() {
  return isSupabaseMode() ? supabase.getJobs() : Promise.resolve([]);
}

export function getJob(id: string) {
  return isSupabaseMode() ? supabase.getJob(id) : Promise.resolve(null);
}

export function saveJob(job: any) {
  return isSupabaseMode() ? supabase.saveJob(job) : Promise.resolve(job);
}

export function deleteJob(id: string) {
  return isSupabaseMode() ? supabase.deleteJob(id) : Promise.resolve(undefined);
}

export function getResumes() {
  return isSupabaseMode() ? supabase.getResumes() : Promise.resolve([]);
}

export function getResume(id: string) {
  return isSupabaseMode() ? supabase.getResume(id) : Promise.resolve(null);
}

export function saveResume(resume: any) {
  return isSupabaseMode() ? supabase.saveResume(resume) : Promise.resolve(resume);
}

export function deleteResume(id: string) {
  return isSupabaseMode() ? supabase.deleteResume(id) : Promise.resolve(undefined);
}

export function createOrder(input: any) {
  return isSupabaseMode() ? supabase.createOrder(input) : Promise.reject(new Error("Supabase is disabled."));
}

export function getOrders() {
  return isSupabaseMode() ? supabase.getOrders() : Promise.resolve([]);
}

export function getOrder(id: string) {
  return isSupabaseMode() ? supabase.getOrder(id) : Promise.resolve(null);
}

export function submitPaymentProof(input: any) {
  return isSupabaseMode() ? supabase.submitPaymentProof(input) : Promise.resolve(null);
}

export function saveLead(lead: any) {
  return isSupabaseMode() ? supabase.saveLead(lead) : Promise.resolve(lead);
}



export function savePortfolioSettings(public_slug: string, portfolio_public: boolean) {
  return isSupabaseMode() ? supabase.savePortfolioSettings(public_slug, portfolio_public) : Promise.resolve(undefined);
}

// Admin APIs have been moved to admin-repository.ts
