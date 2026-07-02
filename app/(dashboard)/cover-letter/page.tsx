"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Send, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import Link from "next/link";
import type { OutreachPack, CareerPathResume } from "@/lib/careerpath/types";

export default function CoverLetterPage() {
  const [resumes, setResumes] = useState<CareerPathResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobDescription, setJobDescription] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [outreachPack, setOutreachPack] = useState<OutreachPack | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const res = await fetch("/api/memory");
        if (res.ok) {
          const data = await res.json();
          // Assuming /api/memory returns user's data including resumes. Let's adapt if needed.
          // Since there isn't a dedicated /api/resumes list route in the snippets I saw,
          // I will assume the memory route or a simple fetch can get them.
          // For now, I'll fetch memory and try to extract resumes if they exist there,
          // or gracefully handle an empty state if I can't fetch them directly.
          if (data.workspace?.smartVersions) {
            const mappedResumes = data.workspace.smartVersions.map((sv: any) => ({
              id: sv.resumeDocumentId,
              title: sv.title,
              targetRole: sv.targetRole,
            }));
            setResumes(mappedResumes);
            if (mappedResumes.length > 0) setSelectedResumeId(mappedResumes[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch resumes", err);
      } finally {
        setLoadingResumes(false);
      }
    };
    
    // We actually need to fetch resumes from the DB. I'll make a quick call to /api/builder/history
    // since /api/memory didn't seem to have a list of all resumes.
    const loadHistory = async () => {
      try {
        const res = await fetch("/api/builder/history");
        if (res.ok) {
          const data = await res.json();
          if (data.history && data.history.length > 0) {
            setResumes(data.history);
            setSelectedResumeId(data.history[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingResumes(false);
      }
    };
    
    loadHistory();
  }, []);

  const handleGenerate = async () => {
    if (!selectedResumeId || !jobDescription.trim()) {
      setError("Please select a resume and paste a job description.");
      return;
    }

    setLoading(true);
    setError(null);
    setOutreachPack(null);

    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          jobDescription,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to generate outreach materials");
      }

      setOutreachPack(data.outreachPack);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto">
      <div className="flex-none p-6 pb-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Outreach & Cover Letters</h1>
            <p className="text-sm text-slate-500 mt-1">Generate personalized cover letters, DMs, and interview prep.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Resume Base</label>
                {loadingResumes ? (
                  <div className="h-10 bg-slate-100 rounded animate-pulse w-full"></div>
                ) : resumes.length > 0 ? (
                  <select 
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    disabled={loading}
                  >
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.title || r.targetRole || "Untitled Resume"}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                    No resumes found. Please create a resume first.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Description</label>
                <Textarea 
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={12}
                  disabled={loading}
                />
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={loading || !jobDescription.trim() || !selectedResumeId}
                className="w-full"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Generate Outreach Pack</>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8 space-y-6">
            {!outreachPack && !loading && (
              <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Ready to Generate</h3>
                <p className="text-slate-500 max-w-sm">
                  Paste a job description and click Generate to create a highly personalized cover letter, recruiter DMs, and interview prep.
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Analyzing Job & Profile</h3>
                <p className="text-slate-500 max-w-sm">
                  Crafting personalized outreach materials based on your exact experience... (this takes about 15-20 seconds)
                </p>
              </div>
            )}

            {outreachPack && (
              <div className="space-y-6">
                {/* Cover Letter */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold text-slate-900 flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-indigo-500" /> Cover Letter
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(outreachPack.coverLetter, 'coverLetter')}>
                      {copiedSection === 'coverLetter' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-400" />}
                    </Button>
                  </div>
                  <div className="p-6 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-serif">
                    {outreachPack.coverLetter}
                  </div>
                </div>

                {/* Short Messages Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recruiter DM */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="font-semibold text-sm text-slate-900">Recruiter LinkedIn DM</h3>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(outreachPack.recruiterDM, 'recruiterDM')}>
                        {copiedSection === 'recruiterDM' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-3 w-3 text-slate-400" />}
                      </Button>
                    </div>
                    <div className="p-4 text-sm text-slate-700 flex-1">
                      {outreachPack.recruiterDM}
                    </div>
                  </div>

                  {/* Cold Email */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="font-semibold text-sm text-slate-900">Cold Email</h3>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(outreachPack.coldEmail, 'coldEmail')}>
                        {copiedSection === 'coldEmail' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-3 w-3 text-slate-400" />}
                      </Button>
                    </div>
                    <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap flex-1">
                      {outreachPack.coldEmail}
                    </div>
                  </div>
                </div>

                {/* Interview Prep */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-indigo-50/30">
                    <h3 className="font-semibold text-indigo-900">Interview Preparation</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Elevator Pitch ("Why are you a fit?")</h4>
                      <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        {outreachPack.whyFitAnswer}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Likely Questions</h4>
                      <div className="space-y-4">
                        {outreachPack.interviewQuestions.map((q, i) => (
                          <div key={i} className="border-l-2 border-indigo-200 pl-4 py-1">
                            <p className="font-medium text-slate-800 text-sm mb-1">{q.question}</p>
                            <p className="text-xs text-slate-500 mb-2">Why they ask: {q.whyAsked}</p>
                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">{q.suggestedAnswer}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2 text-sm text-amber-700">Missing Skills to Brush Up</h4>
                        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                          {outreachPack.missingSkillsToPrepare.map((skill, i) => (
                            <li key={i}>{skill}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2 text-sm text-emerald-700">Action Plan</h4>
                        <ol className="list-decimal pl-5 text-sm text-slate-600 space-y-1">
                          {outreachPack.preparationPlan.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
