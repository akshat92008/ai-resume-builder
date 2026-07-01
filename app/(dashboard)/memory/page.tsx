"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Plus, Trash2, Brain } from "lucide-react";
import { Button, Card, CardContent, Textarea, Badge } from "@/components/ui";
import type { CareerProfile } from "@/lib/careerpath/types";

export default function MemoryPage() {
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/app-state")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.workspace?.careerProfile || { skills: [], experience: [], projects: [], achievements: [], gaps: [] });
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      await fetch("/api/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  function handleAddAchievement() {
    setProfile(prev => prev ? { ...prev, achievements: [{ text: "", date: "" }, ...(prev.achievements || [])] } : null);
  }

  function handleUpdateAchievement(index: number, text: string) {
    setProfile(prev => {
      if (!prev || !prev.achievements) return prev;
      const newAch = [...prev.achievements];
      newAch[index] = { ...newAch[index], text };
      return { ...prev, achievements: newAch };
    });
  }

  function handleRemoveAchievement(index: number) {
    setProfile(prev => {
      if (!prev || !prev.achievements) return prev;
      const newAch = [...prev.achievements];
      newAch.splice(index, 1);
      return { ...prev, achievements: newAch };
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading Memory...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            Career Memory
          </h1>
          <p className="mt-2 text-slate-600">Manually edit your raw career data and achievements.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Memory
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Achievements</h2>
              <Button size="sm" variant="outline" onClick={handleAddAchievement}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Win
              </Button>
            </div>
            <div className="space-y-4">
              {profile?.achievements?.map((ach, i) => (
                <div key={i} className="flex gap-3">
                  <Textarea 
                    value={ach.text} 
                    onChange={e => handleUpdateAchievement(i, e.target.value)} 
                    placeholder="Describe what you accomplished..."
                    className="min-h-[60px]"
                  />
                  <Button variant="ghost" className="shrink-0 text-slate-400 hover:text-red-600" onClick={() => handleRemoveAchievement(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!profile?.achievements || profile.achievements.length === 0) && (
                <p className="text-sm text-slate-500">No achievements logged yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Other Data</h2>
            <p className="text-sm text-slate-500 mb-4">For complex updates to experience, projects, or skills, use the AI Chat on the main app page. The AI will intelligently parse and update your memory structure.</p>
            <div className="flex gap-2 flex-wrap">
               <Badge variant="outline">Experience: {profile?.experience?.length || 0}</Badge>
               <Badge variant="outline">Projects: {profile?.projects?.length || 0}</Badge>
               <Badge variant="outline">Skills: {profile?.skills?.length || 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
