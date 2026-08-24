import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { LogoMark } from '@/components/shared/LogoMark';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/api/client';

export default function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }

    api
      .get(`/auth/verify-email?token=${token}`)
      .then(() => {
        if (user) setUser({ ...user, email_verified: true });
        setStatus('success');
      })
      .catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="flex justify-center mb-5">
          <LogoMark size={72} />
        </div>

        {status === 'loading' && (
          <>
            <Loader className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Vérification en cours…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Email vérifié !</h2>
            <p className="text-muted-foreground text-sm mb-6">Votre adresse email a été confirmée avec succès.</p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full bg-foreground text-background rounded-2xl py-3 font-semibold hover:opacity-90 transition-opacity"
            >
              Continuer vers l'application
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Lien invalide</h2>
            <p className="text-muted-foreground text-sm mb-6">Ce lien de vérification est invalide ou a expiré.</p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full border rounded-2xl py-3 font-semibold hover:bg-muted transition-colors"
            >
              Retour à l'application
            </button>
          </>
        )}
      </div>
    </div>
  );
}
