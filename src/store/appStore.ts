import { create } from "zustand";

interface AppState {
  resumeId: string | null;
  jobId: string | null;
  setResumeId: (id: string) => void;
  setJobId: (id: string) => void;
}

export const useAppStore = create<AppState>(set => ({
  resumeId: null,
  jobId: null,
  setResumeId: id => set({ resumeId: id }),
  setJobId: id => set({ jobId: id })
}));
