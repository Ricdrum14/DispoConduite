import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/shared/LogoMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/hooks/useAuth';
import { api } from '@/api/client';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const submit = async () => {
    setError('');
    if (!form.email || !form.password) {
      setError('Email et mot de passe requis');
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { email: form.email, password: form.password, full_name: form.full_name };
      const res = await api.post(endpoint, payload);
      setUser(res.data.user);
      navigate(res.data.user.stych_connected ? '/dashboard' : '/onboarding');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const status = err?.response?.status;
      if (!msg || status === 500) {
        setError('Une erreur est survenue. Veuillez réessayer.');
      } else {
        setError(Array.isArray(msg) ? msg[0] : msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8 gap-3">
          <Logo iconSize={48} />
          <p className="text-muted-foreground text-sm">Vos créneaux Stych, surveillés pour vous</p>
        </div>

        <div className="bg-card rounded-3xl shadow-xl shadow-primary/10 border border-primary/10 overflow-hidden">
          <div className="flex border-b">
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setMode(tab);
                  setError('');
                }}
                className={`flex-1 py-4 text-sm font-semibold transition-all ${
                  mode === tab ? 'text-primary border-b-2 border-primary bg-accent/60' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'login' ? 'Se connecter' : 'Créer un compte'}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Votre nom complet"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="pl-10"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="votre@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Min. 8 caractères, 1 majuscule, 1 chiffre, 1 spécial' : 'Mot de passe'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-primary text-sm bg-accent border border-primary/20 rounded-xl px-4 py-2">{error}</p>
            )}

            <Button onClick={submit} disabled={loading} className="w-full py-6 text-base gap-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                }}
                className="text-primary font-medium hover:opacity-80 transition-colors"
              >
                {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">Tes identifiants Stych restent privés — jamais stockés en clair 🔒</p>
      </div>
    </div>
  );
}
