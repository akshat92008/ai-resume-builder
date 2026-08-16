import { create } from "zustand";
import type { CareerPathResume, CareerWorkspaceState } from "@/lib/careerpath/types";

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
    "CareerOS helps you turn career evidence into better job-search decisions. Start by pasting your real education, projects, experience, achievements, links, or an existing resume. Then bring a job: I’ll help decide whether it is worth applying, prepare a truthful application, track the outcome, and learn from what actually converts.",
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
  setMessages: (updater) => set((state) => ({ messages: typeof updater === "function" ? updater(state.messages) : updater })),
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
    messages: [{
      id: "new",
      role: "assistant",
      content: "Starting fresh Career Memory. Paste real career evidence first; I’ll use it as the source of truth behind later job decisions and applications.",
      createdAt: new Date().toISOString(),
    }],
    error: "",
  }),
}));
