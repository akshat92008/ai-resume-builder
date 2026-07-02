"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Building, DollarSign, Briefcase, Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { JobApplication } from "@/lib/careerpath/types";
import Link from "next/link";

export default function OffersPage() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch("/api/jobs");
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
        }
      } catch (err) {
        console.error("Failed to load jobs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const offerJobs = jobs.filter((j) => j.status === "offer" || (j.salaryMax && j.status === "interview"));

  const calculateTC = (job: JobApplication) => {
    const base = job.salaryMax || job.salaryMin || 0;
    const bonus = job.bonus || 0;
    const equity = job.equity || 0;
    return base + bonus + equity;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading offers...</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      <div className="flex-none p-6 pb-4 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/jobs" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Offer Comparison</h1>
              <p className="text-sm text-slate-500 mt-1">Compare total compensation and benefits side-by-side.</p>
            </div>
          </div>
          <Link href="/jobs">
            <Button variant="outline">Back to Tracker</Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {offerJobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
                <DollarSign className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">No offers to compare yet</h2>
              <p className="text-slate-500 max-w-md mx-auto mb-6">
                When you receive offers or have salary expectations for interviews, they will appear here for comparison.
              </p>
              <Link href="/jobs">
                <Button>Go to Job Tracker</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {offerJobs.sort((a, b) => calculateTC(b) - calculateTC(a)).map((job) => {
                const tc = calculateTC(job);
                const isInterview = job.status === "interview";
                
                return (
                  <div key={job.id} className={`bg-white rounded-xl border ${isInterview ? 'border-dashed border-slate-300' : 'border-emerald-200 shadow-sm'} overflow-hidden flex flex-col relative`}>
                    {isInterview && (
                      <div className="absolute top-3 right-3 bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-1 rounded">
                        PROJECTION
                      </div>
                    )}
                    
                    <div className={`p-5 border-b ${isInterview ? 'border-slate-100' : 'border-emerald-100 bg-emerald-50/30'}`}>
                      <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{job.company}</h3>
                      <p className="text-sm text-slate-600 line-clamp-1">{job.role}</p>
                      
                      <div className="mt-4">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Total Comp</div>
                        <div className="text-3xl font-extrabold text-slate-900">
                          {tc > 0 ? formatCurrency(tc) : "TBD"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-5 flex-1 space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-500">Base Salary</span>
                          <span className="font-medium text-slate-900">{job.salaryMax ? formatCurrency(job.salaryMax) : (job.salaryMin ? formatCurrency(job.salaryMin) : '-')}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-500">Sign-on / Bonus</span>
                          <span className="font-medium text-slate-900">{job.bonus ? formatCurrency(job.bonus) : '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-500">Equity (Annual)</span>
                          <span className="font-medium text-slate-900">{job.equity ? formatCurrency(job.equity) : '-'}</span>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-100 space-y-2">
                        {job.location && (
                          <div className="flex items-center text-sm text-slate-600">
                            <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                            {job.location}
                          </div>
                        )}
                        {job.workType && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Briefcase className="h-4 w-4 mr-2 text-slate-400" />
                            <span className="capitalize">{job.workType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="outline" className="w-full bg-white">Edit Details</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
