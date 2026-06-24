import Link from "next/link";
import {
  BarChart3,
  Briefcase,
  CreditCard,
  FileText,
  Home,
  Link2,
  Settings,
  Share2,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { calculateProofScore } from "@/lib/proof-score";
import { getCurrentVault } from "@/lib/repositories";
import { Progress } from "@/components/ui";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/vault", label: "Career Vault", icon: UserCircle },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/portfolio-settings", label: "Portfolio", icon: Link2 },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/referrals", label: "Referrals", icon: Share2 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: BarChart3 },
];

export async function DashboardSidebar() {
  let score = { total: 0 };
  let vault: any = null;
  
  try {
    vault = await getCurrentVault();
    if (vault) {
      score = calculateProofScore(vault);
    }
  } catch (error) {
    // Ignore error if not logged in or fetching fails
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 text-slate-300 md:flex">
      <Link href="/" className="flex h-16 items-center border-b border-slate-800 px-6 text-white">
        <div className="mr-2 flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-xs font-bold">C</div>
        <span className="font-display text-lg font-bold">CareerProof</span>
      </Link>
      <nav className="flex-1 space-y-1 px-4 py-5">
        {navItems
          .filter((item) => item.label !== "Admin" || vault?.profile.role === "admin")
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-900 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-lg bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <ShieldCheck className="h-4 w-4" />
            Vault Proof Score
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {score.total}<span className="text-sm font-normal text-slate-400">/100</span>
          </div>
          <Progress value={score.total} className="mt-3 bg-slate-800" />
        </div>
      </div>
    </aside>
  );
}
