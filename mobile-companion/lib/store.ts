import { create } from 'zustand';

export interface CallLogEntry {
  clientCallId: string;
  phoneNumber: string;
  direction: 'INCOMING' | 'OUTGOING' | 'MISSED';
  durationSeconds: number;
  callEndTimeMs: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  recordingUrl?: string;
  timestamp: string; // ISO string for display
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  serverUrl: string;
  userName: string;
  brokerPhone: string;

  // Monitoring
  isMonitoring: boolean;
  deviceInfo: {
    manufacturer: string;
    model: string;
    androidVersion: string;
  } | null;
  oemRecordingPath: string | null;

  // Call log
  recentCalls: CallLogEntry[];

  // Actions
  setAuth: (serverUrl: string, userName: string, brokerPhone?: string) => void;
  clearAuth: () => void;
  setMonitoring: (active: boolean) => void;
  setDeviceInfo: (info: AppState['deviceInfo']) => void;
  setOemPath: (path: string | null) => void;
  addCall: (call: CallLogEntry) => void;
  updateCallStatus: (clientCallId: string, status: CallLogEntry['syncStatus'], recordingUrl?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  isAuthenticated: false,
  serverUrl: '',
  userName: '',
  brokerPhone: '',
  isMonitoring: false,
  deviceInfo: null,
  oemRecordingPath: null,
  recentCalls: [],

  // Auth actions
  setAuth: (serverUrl, userName, brokerPhone) =>
    set({
      isAuthenticated: true,
      serverUrl,
      userName,
      brokerPhone: brokerPhone || '',
    }),
  clearAuth: () =>
    set({ isAuthenticated: false, serverUrl: '', userName: '', brokerPhone: '' }),

  // Monitoring actions
  setMonitoring: (active) => set({ isMonitoring: active }),
  setDeviceInfo: (info) => set({ deviceInfo: info }),
  setOemPath: (path) => set({ oemRecordingPath: path }),

  // Call log actions
  addCall: (call) =>
    set((state) => ({
      recentCalls: [call, ...state.recentCalls].slice(0, 50), // Keep last 50
    })),
  updateCallStatus: (clientCallId, status, recordingUrl) =>
    set((state) => ({
      recentCalls: state.recentCalls.map((c) =>
        c.clientCallId === clientCallId
          ? { ...c, syncStatus: status, ...(recordingUrl ? { recordingUrl } : {}) }
          : c
      ),
    })),
}));
