import { isSupabaseMode } from "../client/mode";
import * as demo from "../client/demo-storage";
import * as supabase from "./server-supabase";

export function getCurrentUser() {
  return isSupabaseMode() ? supabase.getCurrentUser() : demo.getCurrentUser();
}

export function getCurrentProfile() {
  return isSupabaseMode() ? supabase.getCurrentProfile() : demo.getCurrentProfile();
}

export function getCurrentVault() {
  return isSupabaseMode() ? supabase.getCurrentVault() : demo.getCurrentVault();
}

export function saveCurrentVault(vault: any) {
  return isSupabaseMode() ? supabase.saveCurrentVault(vault) : demo.saveCurrentVault(vault);
}

export function getJobs() {
  return isSupabaseMode() ? supabase.getJobs() : demo.getJobs();
}

export function getJob(id: string) {
  return isSupabaseMode() ? supabase.getJob(id) : demo.getJob(id);
}

export function saveJob(job: any) {
  return isSupabaseMode() ? supabase.saveJob(job) : demo.saveJob(job);
}

export function deleteJob(id: string) {
  return isSupabaseMode() ? supabase.deleteJob(id) : demo.deleteJob(id);
}

export function getResumes() {
  return isSupabaseMode() ? supabase.getResumes() : demo.getResumes();
}

export function getResume(id: string) {
  return isSupabaseMode() ? supabase.getResume(id) : demo.getResume(id);
}

export function saveResume(resume: any) {
  return isSupabaseMode() ? supabase.saveResume(resume) : demo.saveResume(resume);
}

export function deleteResume(id: string) {
  return isSupabaseMode() ? supabase.deleteResume(id) : demo.deleteResume(id);
}

export function createOrder(input: any) {
  return isSupabaseMode() ? supabase.createOrder(input) : demo.createOrder(input);
}

export function getOrders() {
  return isSupabaseMode() ? supabase.getOrders() : demo.getOrders();
}

export function getOrder(id: string) {
  return isSupabaseMode() ? supabase.getOrder(id) : demo.getOrder(id);
}

export function submitPaymentProof(input: any) {
  return isSupabaseMode() ? supabase.submitPaymentProof(input) : demo.submitPaymentProof(input);
}

export function saveLead(lead: any) {
  return isSupabaseMode() ? supabase.saveLead(lead) : demo.saveLead(lead);
}



export function savePortfolioSettings(public_slug: string, portfolio_public: boolean) {
  return isSupabaseMode() ? supabase.savePortfolioSettings(public_slug, portfolio_public) : demo.savePortfolioSettings(public_slug, portfolio_public);
}

// Admin APIs have been moved to admin-repository.ts
