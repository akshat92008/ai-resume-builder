import { notFound } from "next/navigation";
import { PublicPortfolio } from "@/components/portfolio/PublicPortfolio";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const supabase = await createServerSupabaseClient();
  
  if (!supabase) {
    return notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("public_slug", slug)
    .eq("portfolio_public", true)
    .single();

  if (!profile) return notFound();

  const [
    { data: education },
    { data: skills },
    { data: projects },
    { data: experiences },
    { data: certificates },
    { data: achievements },
    { data: proof_links },
  ] = await Promise.all([
    supabase.from('education').select('*').eq('user_id', profile.id),
    supabase.from('skills').select('*').eq('user_id', profile.id),
    supabase.from('projects').select('*').eq('user_id', profile.id),
    supabase.from('experiences').select('*').eq('user_id', profile.id),
    supabase.from('certificates').select('*').eq('user_id', profile.id),
    supabase.from('achievements').select('*').eq('user_id', profile.id),
    supabase.from('proof_links').select('*').eq('user_id', profile.id),
  ]);

  const vault = {
    profile,
    education: education || [],
    skills: skills || [],
    projects: projects || [],
    experiences: experiences || [],
    certificates: certificates || [],
    achievements: achievements || [],
    proof_links: proof_links || [],
  };

  return <PublicPortfolio vault={vault as any} sample={false} />;
}
