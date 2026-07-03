import { create } from "zustand";
import type { CareerPathResume, CareerWorkspaceState, ResumeMessage } from "@/lib/careerpath/types";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export const WELCOME_MESSAGE: ChatMsg = {
  id: "welcome",
  role: "assistant",
  content:
    "CareerPath AI is your AI Career Memory. Paste messy career info once, then generate resumes, job tailoring, ATS audits, cover letters, LinkedIn sections, application tracking, coaching, and new achievement updates from the same source of truth.",
  createdAt: new Date().toISOString(),
};

interface WorkspaceState {
  messages: ChatMsg[];
  input: string;
  currentResume: CareerPathResume | null;
  currentResumeId: string | null;
  workspace: CareerWorkspaceState | null;
  activeTab: string;
  loading: boolean;
  initialLoading: boolean;
  error: string;
  rateLimitUntil: number | null;
  showAchievementModal: boolean;
  
  // Actions
  setMessages: (updater: (prev: ChatMsg[]) => ChatMsg[] | ChatMsg[]) => void;
  setInput: (input: string) => void;
  setCurrentResume: (resume: CareerPathResume | null) => void;
  setCurrentResumeId: (id: string | null) => void;
  setWorkspace: (workspace: CareerWorkspaceState | null) => void;
  setActiveTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;
  setInitialLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setRateLimitUntil: (until: number | null) => void;
  setShowAchievementModal: (show: boolean) => void;
  
  startNewResume: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  messages: [WELCOME_MESSAGE],
  input: "",
  currentResume: null,
  currentResumeId: null,
  workspace: null,
  activeTab: "dashboard",
  loading: false,
  initialLoading: true,
  error: "",
  rateLimitUntil: null,
  showAchievementModal: false,

  setMessages: (updater) => 
    set((state) => ({ 
      messages: typeof updater === "function" ? updater(state.messages) : updater 
    })),
  setInput: (input) => set({ input }),
  setCurrentResume: (currentResume) => set({ currentResume }),
  setCurrentResumeId: (currentResumeId) => set({ currentResumeId }),
  setWorkspace: (workspace) => set({ workspace }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setLoading: (loading) => set({ loading }),
  setInitialLoading: (initialLoading) => set({ initialLoading }),
  setError: (error) => set({ error }),
  setRateLimitUntil: (rateLimitUntil) => set({ rateLimitUntil }),
  setShowAchievementModal: (showAchievementModal) => set({ showAchievementModal }),
  
  startNewResume: () => set({
    currentResume: null,
    currentResumeId: null,
    workspace: null,
    messages: [
      {
        id: "new",
        role: "assistant",
        content: "Starting a fresh Career Memory. Paste education, skills, projects, experience, goals, links, documents, or achievements.",
        createdAt: new Date().toISOString(),
      },
    ],
    error: ""
  })
}));
