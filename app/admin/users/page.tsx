"use client";

import Link from "next/link";
import { AdminTable } from "@/components/admin/AdminTable";
import { Badge, Button } from "@/components/ui";
import { getDemoResumes, getDemoVault } from "@/lib/storage";
import { calculateProofScore } from "@/lib/proof-score";

export default function AdminUsersPage() {
  const vault = getDemoVault();
  const score = calculateProofScore(vault);
  const resumes = getDemoResumes();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <AdminHeader title="Users" />
        <AdminTable
          columns={["User", "Plan", "Proof score", "Resumes", "Portfolio", "Actions"]}
          rows={[
            [
              <div key="user">
                <div className="font-semibold">{vault.profile.full_name}</div>
                <div className="text-slate-500">{vault.profile.email}</div>
              </div>,
              <Badge key="plan">{vault.profile.plan ?? "free"}</Badge>,
              `${score.total}/100`,
              resumes.length,
              vault.profile.portfolio_public ? "Public" : "Private",
              <Button key="portfolio" size="sm" variant="outline" asChild>
                <Link href={`/portfolio/${vault.profile.public_slug || "sample"}`}>Portfolio</Link>
              </Button>,
            ],
          ]}
        />
      </main>
    </div>
  );
}

function AdminHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin</p>
        <h1 className="font-display text-3xl font-bold text-slate-950">{title}</h1>
      </div>
      <Button variant="outline" asChild><Link href="/admin">Back to admin</Link></Button>
    </div>
  );
}
