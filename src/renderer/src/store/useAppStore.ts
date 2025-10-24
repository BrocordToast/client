import { create } from 'zustand';

export interface AccountSummary {
  gamertag: string;
  uuid: string;
  profile: {
    id: string;
    name: string;
    skins?: Array<{ url: string }>;
  };
}

export interface VersionSummary {
  id: string;
  type: string;
  url: string;
  releaseTime: string;
}

export interface ProgressState {
  taskId: string;
  downloaded: number;
  total?: number;
}

export interface InstanceState {
  id: string;
  name: string;
  version: string;
  javaPath?: string;
  minRam: number;
  maxRam: number;
  resolution: {
    width: number;
    height: number;
    fullscreen: boolean;
  };
  gameDir: string;
  modsDir: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AppState {
  account: AccountSummary | null;
  versions: VersionSummary[];
  selectedVersionId: string | null;
  instances: InstanceState[];
  currentInstanceId: string | null;
  progress: ProgressState | null;
  logs: string[];
  launching: boolean;
  theme: 'dark' | 'light';
  setAccount: (account: AccountSummary | null) => void;
  setVersions: (versions: VersionSummary[]) => void;
  setSelectedVersionId: (id: string) => void;
  setInstances: (instances: InstanceState[]) => void;
  setCurrentInstanceId: (id: string) => void;
  appendLog: (line: string) => void;
  setProgress: (progress: ProgressState | null) => void;
  setLaunching: (launching: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  resetLogs: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  account: null,
  versions: [],
  selectedVersionId: null,
  instances: [],
  currentInstanceId: null,
  progress: null,
  logs: [],
  launching: false,
  theme: 'dark',
  setAccount: (account) => set({ account }),
  setVersions: (versions) => set({ versions }),
  setSelectedVersionId: (id) => set({ selectedVersionId: id }),
  setInstances: (instances) => set({ instances }),
  setCurrentInstanceId: (id) => set({ currentInstanceId: id }),
  appendLog: (line) => set((state) => ({ logs: [...state.logs, line] })),
  setProgress: (progress) => set({ progress }),
  setLaunching: (launching) => set({ launching }),
  setTheme: (theme) => set({ theme }),
  resetLogs: () => set({ logs: [] })
}));
