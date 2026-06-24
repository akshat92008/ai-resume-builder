"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Plus, Loader2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import type { Job } from "@/lib/types";
import { getJobs } from "@/lib/repositories";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      const data = await getJobs();
      if (data) setJobs(data);
      setLoading(false);
    }
    loadJobs();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Jobs</p>
          <h1 className="font-display text-3xl font-bold text-slate-950">Saved job analyses</h1>
          <p className="mt-2 text-slate-600">Analyze job descriptions before generating proof-backed resumes.</p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus className="mr-2 h-4 w-4" />
            New analysis
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-10 w-10" />}
          title="No job analyses yet"
          description="Paste a job description to calculate fit score, missing skills, and resume angle."
          action={<Button asChild><Link href="/jobs/new">Analyze job description</Link></Button>}
        />
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{job.job_title}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">{job.company_name || "Company not added"}</p>
                  </div>
                  <Badge>{job.fit_score}/100 fit</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <p className="max-w-2xl text-sm text-slate-600">{job.analysis_json.resumeAngle}</p>
                <Button asChild variant="outline">
                  <Link href={`/jobs/${job.id}`}>Open analysis</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
