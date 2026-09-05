import { create } from 'zustand';

export interface PatientUser {
  id: string;
  uhid: string;
  phone: string;
  name: string | null;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  bloodGroup?: string | null;
  city?: string | null;
}

interface AuthState {
  user: PatientUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: PatientUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  fetchSession: () => Promise<void>;
}

export const usePatientAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    try { await fetch('/patient/api/auth/logout', { method: 'POST' }); } catch {}
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
  fetchSession: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/patient/api/auth/session');
      const data = await res.json();
      if (data.success && data.authenticated) {
        set({ user: data.patient, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
