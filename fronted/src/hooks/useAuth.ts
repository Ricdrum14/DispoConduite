import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string | null;
  role?: string | null;
  email_verified?: boolean;
  stych_connected?: boolean;
}

interface AuthStore {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// Le token JWT est dans un cookie httpOnly géré par le navigateur.
// On persiste uniquement les infos non-sensibles de l'utilisateur pour l'UX.
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => {
        set({ user: null, isAuthenticated: false });
        fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        }).finally(() => {
          window.location.href = '/auth';
        });
      },
    }),
    {
      name: 'dispoconduite-user',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export function useAuth() {
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  return { user, isAuthenticated, setUser, logout };
}
