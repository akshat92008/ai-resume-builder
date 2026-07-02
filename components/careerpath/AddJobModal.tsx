"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type AddJobModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
};

export function AddJobModal({ isOpen, onClose, onAdded }: AddJobModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!company.trim() || !role.trim()) {
      setError("Company and Role are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, jobUrl, notes, status: "saved" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to add job");
      }

      // Reset form
      setCompany("");
      setRole("");
      setJobUrl("");
      setNotes("");
      
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add a Job">
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
            {error}
          </div>
        )}
        
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
          <Input 
            id="company" 
            value={company} 
            onChange={(e) => setCompany(e.target.value)} 
            placeholder="e.g. Acme Corp" 
            required 
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">Target Role *</label>
          <Input 
            id="role" 
            value={role} 
            onChange={(e) => setRole(e.target.value)} 
            placeholder="e.g. Frontend Engineer" 
            required 
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="jobUrl" className="block text-sm font-medium text-slate-700 mb-1">Job URL (Optional)</label>
          <Input 
            id="jobUrl" 
            type="url"
            value={jobUrl} 
            onChange={(e) => setJobUrl(e.target.value)} 
            placeholder="https://..." 
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
          <Textarea 
            id="notes" 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            placeholder="Important details, recruiter name, etc." 
            rows={3}
            disabled={loading}
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Job"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
