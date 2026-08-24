import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/api/client';
import Layout from '@/components/shared/Layout';
import NavigationTracker from '@/components/shared/NavigationTracker';
import PageNotFound from '@/components/shared/PageNotFound';

import Auth from '@/pages/Auth';
import VerifyEmail from '@/pages/VerifyEmail';
import VerifyEmailPending from '@/pages/VerifyEmailPending';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import Historique from '@/pages/Historique';
import Settings from '@/pages/Settings';

// Le store persisté (localStorage) ne reflète que l'état au moment du
// dernier login/register — sans ça, un changement fait ailleurs (email
// vérifié, rôle admin, Stych déconnecté par la veille...) reste invisible
// tant qu'on ne se reconnecte pas. On resynchronise depuis la source de
// vérité (le backend) à chaque chargement de l'app.
function AuthBootstrap() {
  const { isAuthenticated, setUser } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// Email vérifié requis avant d'aller plus loin (onboarding compris) —
// avant, ce n'était qu'un bandeau ignorable, pas un vrai garde-fou.
function VerifiedGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!user?.email_verified) return <Navigate to="/verify-email-pending" replace />;
  return <>{children}</>;
}

function OnboardedGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!user?.email_verified) return <Navigate to="/verify-email-pending" replace />;

  // Compte Stych déjà connecté → app normale
  if (user?.stych_connected) return <>{children}</>;

  // Première connexion — onboarding Stych (cahier des charges §5.1)
  return <Navigate to="/onboarding" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <NavigationTracker />
      <Routes>
        {/* Routes publiques */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/verify-email-pending"
          element={
            <ProtectedRoute>
              <VerifyEmailPending />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <VerifiedGuard>
              <Onboarding />
            </VerifiedGuard>
          }
        />

        {/* Routes protégées */}
        <Route
          path="/"
          element={
            <OnboardedGuard>
              <Layout />
            </OnboardedGuard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="historique" element={<Historique />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
