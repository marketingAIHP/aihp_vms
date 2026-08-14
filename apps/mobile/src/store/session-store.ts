import { create } from "zustand";

export type SessionRole = "admin" | "site_manager";

export interface SessionState {
  accessToken: string;
  email: string;
  name: string;
  role: SessionRole;
  siteName: string;
  userId: string;
}

interface SessionStore {
  isHydrating: boolean;
  session: SessionState | null;
  clearSession: () => void;
  setSession: (session: SessionState) => void;
  setHydrating: (value: boolean) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  isHydrating: true,
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
  setHydrating: (value) => set({ isHydrating: value })
}));
