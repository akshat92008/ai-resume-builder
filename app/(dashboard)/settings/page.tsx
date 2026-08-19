"use client";

import Link from "next/link";
import { CheckCircle2, FlaskConical, LogOut, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui";

export default function SettingsPage() {
  async function logout() {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Account</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">CareerOS is currently in free beta. Keep your account simple while we validate the core job-search workflow.</p>
      </header>

      <section className="career-surface overflow-hidden rounded-3xl">
        <div className="border-b border-slate-100 p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><FlaskConical className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-950">Free beta access</h2><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Active</span></div><p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Core CareerOS features are available with fair-use AI limits. There is nothing to purchase during this launch phase.</p></div></div>
            <CheckCircle2 className="hidden h-6 w-6 text-emerald-500 sm:block" />
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-7">
          <SettingPoint icon={<ShieldCheck className="h-4 w-4" />} title="Evidence-first AI" text="CareerOS should not invent skills, achievements, or experience that are missing from your career data." />
          <SettingPoint icon={<User className="h-4 w-4" />} title="Your account" text="Authentication and account identity are managed securely through the connected auth service." />
        </div>
      </section>

      <section className="career-surface rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-950">Session</h2><p className="mt-1 text-sm leading-6 text-slate-500">Sign out of CareerOS on this device.</p></div><Button variant="outline" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Log out</Button></div>
      </section>

      <p className="text-center text-xs leading-5 text-slate-400">Need to review how CareerOS handles your data? <Link href="/privacy" className="font-semibold text-slate-600 hover:text-indigo-700">Read the privacy policy</Link>.</p>
    </div>
  );
}

function SettingPoint({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center gap-2 font-semibold text-slate-900"><span className="text-indigo-500">{icon}</span>{title}</div><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>;
}
