"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { getDemoResumes } from "@/lib/storage";
import type { Resume } from "@/lib/types";

export default function ResumesPage() {
  const [resumes] = useState<Resume[]>(() => getDemoResumes());

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Resumes</p>
          <h1 className="font-display text-3xl font-bold text-slate-950">Proof-backed resumes</h1>
          <p className="mt-2 text-slate-600">Edit, print, and reuse generated job-specific resumes.</p>
        </div>
        <Button asChild>
          <Link href="/resumes/new">
            <Plus className="mr-2 h-4 w-4" />
            Generate resume
          </Link>
        </Button>
      </div>

      {resumes.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No resumes generated"
          description="Analyze a job description first, or generate a demo proof-backed resume from your vault."
          action={<Button asChild><Link href="/jobs/new">Analyze a job</Link></Button>}
        />
      ) : (
        <div className="grid gap-4">
          {resumes.map((resume) => (
            <Card key={resume.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{resume.title}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">{new Date(resume.created_at).toLocaleDateString()} | {resume.style}</p>
                  </div>
                  <Badge>{resume.proof_score}/100 proof</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-600">{resume.warnings.length} unsupported or missing-proof warnings</p>
                <Button asChild variant="outline">
                  <Link href={`/resumes/${resume.id}`}>Open editor</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
