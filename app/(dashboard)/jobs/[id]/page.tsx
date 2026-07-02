"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building, Save, Trash2, Calendar, MapPin, ExternalLink, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { JobApplication } from "@/lib/careerpath/types";
import Link from "next/link";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [job, setJob] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (!res.ok) throw new Error("Failed to load job");
        const data = await res.json();
        setJob(data.job);
      } catch (err) {
        console.error(err);
        setError("Could not load job details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchJob();
  }, [id]);

  const handleChange = (field: keyof JobApplication, value: any) => {
    if (job) setJob({ ...job, [field]: value });
  };

  const handleSave = async () => {
    if (!job) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      if (!res.ok) throw new Error("Failed to save updates");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this job application?")) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/jobs");
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading job details...</div>;
  }

  if (!job) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Job not found</h2>
        <Button onClick={() => router.push("/jobs")} className="mt-4">Back to Tracker</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto">
      <div className="flex-none p-6 pb-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/jobs" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{job.role}</h1>
              <div className="flex items-center text-sm text-slate-500 mt-1 gap-4">
                <span className="flex items-center"><Building className="h-4 w-4 mr-1.5" /> {job.company}</span>
                {job.location && <span className="flex items-center"><MapPin className="h-4 w-4 mr-1.5" /> {job.location}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Core Info */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-lg text-slate-900">Application Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select 
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={job.status}
                      onChange={(e) => handleChange("status", e.target.value)}
                    >
                      <option value="saved">Saved</option>
                      <option value="applied">Applied</option>
                      <option value="interview">Interviewing</option>
                      <option value="offer">Offer Received</option>
                      <option value="rejected">Rejected / Ghosted</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Interview Stage</label>
                    <Input 
                      value={job.stage || ""} 
                      onChange={(e) => handleChange("stage", e.target.value)} 
                      placeholder="e.g. Technical Round" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Job Post URL</label>
                  <div className="flex gap-2">
                    <Input 
                      type="url"
                      value={job.jobUrl || ""} 
                      onChange={(e) => handleChange("jobUrl", e.target.value)} 
                      placeholder="https://..." 
                    />
                    {job.jobUrl && (
                      <a href={job.jobUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes & Follow-ups</label>
                  <Textarea 
                    value={job.notes || ""} 
                    onChange={(e) => handleChange("notes", e.target.value)} 
                    placeholder="Recruiter contact info, interview notes, action items..." 
                    rows={6}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Compensation & Details */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-lg text-slate-900 flex items-center">
                  <DollarSign className="h-5 w-5 mr-1 text-emerald-500" />
                  Compensation
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Min Base</label>
                    <Input 
                      type="number"
                      value={job.salaryMin || ""} 
                      onChange={(e) => handleChange("salaryMin", e.target.value ? Number(e.target.value) : undefined)} 
                      placeholder="120000" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Max Base</label>
                    <Input 
                      type="number"
                      value={job.salaryMax || ""} 
                      onChange={(e) => handleChange("salaryMax", e.target.value ? Number(e.target.value) : undefined)} 
                      placeholder="150000" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Bonus</label>
                    <Input 
                      type="number"
                      value={job.bonus || ""} 
                      onChange={(e) => handleChange("bonus", e.target.value ? Number(e.target.value) : undefined)} 
                      placeholder="20000" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Equity (Annual)</label>
                    <Input 
                      type="number"
                      value={job.equity || ""} 
                      onChange={(e) => handleChange("equity", e.target.value ? Number(e.target.value) : undefined)} 
                      placeholder="50000" 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-lg text-slate-900 flex items-center">
                  <Calendar className="h-5 w-5 mr-1 text-indigo-500" />
                  Logistics
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Work Type</label>
                  <select 
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={job.workType || ""}
                    onChange={(e) => handleChange("workType", e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <Input 
                    value={job.location || ""} 
                    onChange={(e) => handleChange("location", e.target.value)} 
                    placeholder="e.g. San Francisco, CA" 
                  />
                </div>
                
                {job.status === "offer" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Offer Deadline</label>
                    <Input 
                      type="date"
                      value={job.offerDeadline ? new Date(job.offerDeadline).toISOString().split('T')[0] : ""} 
                      onChange={(e) => handleChange("offerDeadline", e.target.value ? new Date(e.target.value).toISOString() : undefined)} 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
