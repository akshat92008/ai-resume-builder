"use client";

import { useEffect, useState } from "react";
import { Plus, MoreHorizontal, Calendar, Building, MapPin, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AddJobModal } from "@/components/careerpath/AddJobModal";
import type { JobApplication } from "@/lib/careerpath/types";
import Link from "next/link";

const COLUMNS = [
  { id: "saved", title: "Saved", color: "bg-slate-100" },
  { id: "applied", title: "Applied", color: "bg-blue-50" },
  { id: "interview", title: "Interview", color: "bg-amber-50" },
  { id: "offer", title: "Offer", color: "bg-emerald-50" },
  { id: "rejected", title: "Rejected", color: "bg-red-50" },
];

export default function JobTrackerPage() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [draggedJob, setDraggedJob] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    fetchJobs();
  }, []);

  const updateJobStatus = async (id: string, newStatus: string) => {
    // Optimistic update
    setJobs((prev) => 
      prev.map((job) => (job.id === id ? { ...job, status: newStatus as any } : job))
    );

    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      // Revert on failure
      fetchJobs(); 
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedJob(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedJob) {
      updateJobStatus(draggedJob, columnId);
      setDraggedJob(null);
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin text-slate-400">
          <RefreshCw className="h-6 w-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      <div className="flex-none p-6 pb-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Tracker</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your applications and interviews.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/offers">
              <Button variant="outline">Compare Offers</Button>
            </Link>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-6 h-full items-start max-w-7xl mx-auto pb-6">
          {COLUMNS.map((col) => {
            const colJobs = jobs.filter((j) => j.status === col.id);
            return (
              <div 
                key={col.id} 
                className="w-80 flex-shrink-0 flex flex-col h-full max-h-full"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-sm text-slate-700">{col.title}</h3>
                  <span className="bg-slate-200 text-slate-600 text-xs py-0.5 px-2 rounded-full font-medium">
                    {colJobs.length}
                  </span>
                </div>
                
                <div className={`flex-1 overflow-y-auto rounded-xl p-3 ${col.color} border border-slate-200/60 shadow-inner min-h-[150px] flex flex-col gap-3`}>
                  {colJobs.map((job) => (
                    <div 
                      key={job.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-slate-900 line-clamp-1">{job.role}</h4>
                        <Link href={`/jobs/${job.id}`} className="text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Link>
                      </div>
                      
                      <div className="flex items-center text-sm text-slate-600 mb-3">
                        <Building className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        <span className="line-clamp-1">{job.company}</span>
                      </div>
                      
                      {job.location && (
                        <div className="flex items-center text-xs text-slate-500 mb-2">
                          <MapPin className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          <span className="line-clamp-1">{job.location} {job.workType ? `(${job.workType})` : ''}</span>
                        </div>
                      )}
                      
                      {job.appliedAt && (
                        <div className="flex items-center text-xs text-slate-500">
                          <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          <span>Applied {new Date(job.appliedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        {job.jobUrl ? (
                          <a href={job.jobUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center font-medium">
                            View JD <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">No URL</span>
                        )}
                        
                        {job.stage && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                            {job.stage}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {colJobs.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-200 rounded-lg">
                      <p className="text-sm text-slate-400">Drag jobs here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AddJobModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdded={fetchJobs} 
      />
    </div>
  );
}
