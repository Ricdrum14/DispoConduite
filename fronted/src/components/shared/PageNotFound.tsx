import { useLocation, useNavigate } from 'react-router-dom';

export default function PageNotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageName = location.pathname.substring(1);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-display font-bold text-muted-foreground/40">404</h1>
          <div className="h-0.5 w-16 bg-border mx-auto" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-display font-bold">Page introuvable</h2>
          <p className="text-muted-foreground leading-relaxed">
            La page <span className="font-medium text-foreground">"{pageName}"</span> n'existe pas.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center px-4 py-2 text-sm font-medium bg-card border rounded-lg hover:bg-muted transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
