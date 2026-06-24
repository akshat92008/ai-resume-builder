import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserVault } from "@/lib/types";

export async function getPublicVault(slug: string): Promise<Partial<UserVault> | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, headline, summary, linkedin_url, github_url, portfolio_url, target_roles, city, portfolio_public, public_slug")
    .eq("public_slug", slug)
    .eq("portfolio_public", true)
    .single();

  if (!profile) return null;

  const [
    { data: education },
    { data: skills },
    { data: projects },
    { data: experiences },
    { data: certificates },
    { data: achievements },
    { data: proof_links },
  ] = await Promise.all([
    supabase.from("education").select("id, institution, degree, field, start_year, end_year, score").eq("user_id", profile.id),
    supabase.from("skills").select("id, name, category, proficiency, proof_links").eq("user_id", profile.id),
    supabase.from("projects").select("id, title, short_description, problem_solved, tech_stack, github_url, live_url, case_study_url, screenshots_url, features, status").eq("user_id", profile.id),
    supabase.from("experiences").select("id, company, role, start_date, end_date, description, responsibilities, achievements").eq("user_id", profile.id),
    supabase.from("certificates").select("id, title, issuer, issue_date, credential_url").eq("user_id", profile.id),
    supabase.from("achievements").select("id, title, description, proof_url").eq("user_id", profile.id),
    supabase.from("proof_links").select("id, title, url, type, notes").eq("user_id", profile.id),
  ]);

  return {
    profile: profile as any,
    education: (education as any) || [],
    skills: (skills as any) || [],
    projects: (projects as any) || [],
    experiences: (experiences as any) || [],
    certificates: (certificates as any) || [],
    achievements: (achievements as any) || [],
    proof_links: (proof_links as any) || [],
  };
}
