import { create } from "zustand";

export interface MediaItem {
  id: string;
  project_id: string | null;
  filename: string;
  path: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  size_bytes: number | null;
  thumbnail: string | null;
}

export interface Clip {
  id: string;
  project_id: string;
  media_id: string;
  start: number;
  end: number;
  duration: number;
  score: number;
  event: string | null;
  transcript: string | null;
  status: string;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface JobInfo {
  status: string;
  progress: number;
  error?: string;
}

interface AppState {
  media: MediaItem[];
  clips: Clip[];
  projects: Project[];
  jobs: Record<string, JobInfo>;
  setMedia: (m: MediaItem[]) => void;
  setClips: (c: Clip[]) => void;
  setProjects: (p: Project[]) => void;
  setJobProgress: (jobId: string, info: Partial<JobInfo>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  media: [],
  clips: [],
  projects: [],
  jobs: {},
  setMedia: (media) => set({ media }),
  setClips: (clips) => set({ clips }),
  setProjects: (projects) => set({ projects }),
  setJobProgress: (jobId, info) =>
    set((s) => ({
      jobs: { ...s.jobs, [jobId]: { ...s.jobs[jobId], ...info } },
    })),
}));
