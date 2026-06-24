import Link from "next/link";
import { AdminTable } from "@/components/admin/AdminTable";
import { Alert, Badge, Button } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateProofScore } from "@/lib/proof-score";

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient();
  let users: any[] = [];
  if (supabase) {
    const { data: profiles } = await supabase.from('profiles').select('*').limit(100);
    const { data: resumes } = await supabase.from('resumes').select('id, user_id');

    if (profiles) {
      users = profiles.map(profile => {
        const userResumes = resumes ? resumes.filter(r => r.user_id === profile.id) : [];
        return {
          profile,
          resumeCount: userResumes.length,
          score: 0 // Simplification since full vault loading is heavy
        };
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <AdminHeader title="Users" />
        <AdminTable
          columns={["User", "Plan", "Proof score", "Resumes", "Portfolio", "Actions"]}
          rows={users.map(({ profile, resumeCount, score }) => [
            <div key="user">
              <div className="font-semibold">{profile.full_name || "No name"}</div>
              <div className="text-slate-500">{profile.email}</div>
            </div>,
            <Badge key="plan">{profile.plan ?? "free"}</Badge>,
            `${score}/100`,
            resumeCount,
            profile.portfolio_public ? "Public" : "Private",
            <Button key="portfolio" size="sm" variant="outline" asChild>
              <Link href={`/portfolio/${profile.public_slug || "sample"}`}>Portfolio</Link>
            </Button>,
          ])}
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
