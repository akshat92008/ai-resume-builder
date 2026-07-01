"use client";

import { useState, useEffect } from "react";
import { X, Trophy, Loader2 } from "lucide-react";
import { Button, Textarea } from "@/components/ui";

interface AchievementPromptModalProps {
  onLogAchievement: (achievement: string) => Promise<void>;
  onClose: () => void;
}

export function AchievementPromptModal({ onLogAchievement, onClose }: AchievementPromptModalProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    await onLogAchievement(`Log achievement: ${input}`);
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-lg animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">What did you accomplish recently?</h2>
            <p className="text-sm text-slate-500">Log small wins so you don't forget them.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="e.g. Fixed a tricky bug in the auth flow, launched the new landing page, or finally finished that refactor..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="min-h-[100px] resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Skip for now
            </Button>
            <Button type="submit" disabled={!input.trim() || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save to Memory
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
