"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { PublicPortfolio } from "@/components/portfolio/PublicPortfolio";
import { isSupabaseMode } from "@/lib/data/mode";
import { getCurrentVault } from "@/lib/repositories";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import type { UserVault } from "@/lib/types";

export default function PortfolioPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [vault, setVault] = useState<UserVault | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      if (slug === "sample") {
        setVault(getSampleVault());
        setLoading(false);
        return;
      }

      if (isSupabaseMode()) {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          setError(true);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("public_slug", slug)
          .eq("portfolio_public", true)
          .single();

        if (!profile) {
          setError(true);
          setLoading(false);
          return;
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
          supabase.from("education").select("*").eq("user_id", profile.id),
          supabase.from("skills").select("*").eq("user_id", profile.id),
          supabase.from("projects").select("*").eq("user_id", profile.id),
          supabase.from("experiences").select("*").eq("user_id", profile.id),
          supabase.from("certificates").select("*").eq("user_id", profile.id),
          supabase.from("achievements").select("*").eq("user_id", profile.id),
          supabase.from("proof_links").select("*").eq("user_id", profile.id),
        ]);

        setVault({
          profile: profile as any,
          education: education || [],
          skills: skills || [],
          projects: projects || [],
          experiences: experiences || [],
          certificates: certificates || [],
          achievements: achievements || [],
          proof_links: proof_links || [],
        } as any);
        setLoading(false);
      } else {
        // Demo mode
        const localVault = await getCurrentVault();
        if (localVault && localVault.profile.public_slug === slug && localVault.profile.portfolio_public) {
          setVault(localVault);
        } else {
          setError(true);
        }
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !vault) {
    return notFound();
  }

  return <PublicPortfolio vault={vault as any} sample={slug === "sample"} />;
}

function getSampleVault(): any {
  return {
    profile: {
      id: "sample",
      full_name: "Jane Developer",
      email: "jane@example.com",
      phone: "123-456-7890",
      city: "San Francisco",
      linkedin_url: "https://linkedin.com",
      github_url: "https://github.com",
      portfolio_url: "",
      target_roles: ["Frontend Engineer", "Full Stack Developer"],
      headline: "Creative Frontend Engineer",
      summary: "I build fast, accessible, and beautiful web applications.",
      public_slug: "sample",
      portfolio_public: true,
      role: "user",
      plan: "pro",
    },
    education: [
      { id: "e1", institution: "Stanford University", degree: "B.S.", field: "Computer Science", start_year: 2018, end_year: 2022, score: "3.9 GPA" },
    ],
    skills: [
      { id: "s1", name: "React", category: "frontend", proficiency: "advanced", proof_links: ["https://github.com/sample"] },
      { id: "s2", name: "TypeScript", category: "frontend", proficiency: "advanced", proof_links: [] },
    ],
    projects: [
      {
        id: "p1",
        title: "E-Commerce Platform",
        short_description: "A high-performance storefront.",
        problem_solved: "Slow load times on legacy stack.",
        tech_stack: ["Next.js", "Tailwind CSS", "Supabase"],
        status: "completed",
        github_url: "https://github.com/sample/ecommerce",
      },
    ],
    experiences: [
      {
        id: "exp1",
        company: "TechNova",
        role: "Frontend Engineer",
        start_date: "2022-06-01",
        end_date: "2024-01-01",
        description: "Led the frontend team in rebuilding the core product.",
        responsibilities: ["Built component library", "Improved Lighthouse score to 100"],
      },
    ],
    certificates: [],
    achievements: [],
    proof_links: [],
  };
}
