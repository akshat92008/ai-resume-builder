import { notFound } from "next/navigation";
import { PublicPortfolio } from "@/components/portfolio/PublicPortfolio";
import { getPublicVault } from "@/lib/data/server/public-portfolio-repository";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "sample") {
    return { title: "Jane Developer | CareerProof", description: "Sample proof-backed portfolio" };
  }
  
  const vault = await getPublicVault(slug);
  if (!vault || !vault.profile) return { title: "Portfolio Not Found" };
  
  return {
    title: `${vault.profile.full_name} | CareerProof Portfolio`,
    description: vault.profile.headline || vault.profile.summary || `Professional portfolio of ${vault.profile.full_name}`,
  };
}

export default async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  let vault: any = null;
  
  if (slug === "sample") {
    vault = getSampleVault();
  } else {
    vault = await getPublicVault(slug);
  }

  if (!vault) {
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
