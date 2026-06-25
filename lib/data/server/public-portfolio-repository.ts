import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserVault } from "@/lib/types";

export async function getPublicVault(slug: string): Promise<Partial<UserVault> | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  let { data: profile } = await supabase
    .from("public_profiles")
    .select("id, full_name, headline, summary, linkedin_url, github_url, portfolio_url, target_roles, city, portfolio_public, public_slug")
    .eq("public_slug", slug)
    .single();

  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, headline, summary, linkedin_url, github_url, portfolio_url, target_roles, city, portfolio_public, public_slug")
      .eq("public_slug", slug)
      .single();
    profile = data;
  }

  if (!profile) return null;

  const { data: authData } = await supabase.auth.getUser();
  const isOwner = authData?.user?.id === profile.id;

  if (!profile.portfolio_public && !isOwner) {
    return null;
  }

  const [
    { data: education },
    { data: skills },
    { data: projects },
    { data: experiences },
    { data: certificates },
    { data: achievements },
    { data: proof_links },
  ] = await Promise.all([
    supabase.from("public_education").select("id, institution, degree, field, start_year, end_year, score, achievements").eq("user_id", profile.id),
    supabase.from("public_skills").select("id, name, category, proficiency, proof_links").eq("user_id", profile.id),
    supabase.from("public_projects").select("id, title, short_description, problem_solved, tech_stack, github_url, live_url, case_study_url, screenshots_url, features, status, tags").eq("user_id", profile.id),
    supabase.from("public_experiences").select("id, company, role, start_date, end_date, description, responsibilities, achievements").eq("user_id", profile.id),
    supabase.from("public_certificates").select("id, title, issuer, issue_date, credential_url").eq("user_id", profile.id),
    supabase.from("public_achievements").select("id, title, description, proof_url, category").eq("user_id", profile.id),
    supabase.from("public_proof_links").select("id, title, url, type").eq("user_id", profile.id),
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
