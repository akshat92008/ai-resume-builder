import { PublicPortfolio } from "@/components/portfolio/PublicPortfolio";
import { mockVault } from "@/lib/mock-data";

export default async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sample = slug === "sample" || slug === mockVault.profile.public_slug;
  return <PublicPortfolio vault={mockVault} sample={sample} />;
}
