import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/LogoMark';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { path: '/historique', label: 'Historique', icon: CalendarCheck },
  { path: '/settings', label: 'Paramètres', icon: SettingsIcon },
];

export default function Layout() {
  const { logout } = useAuth();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 overflow-auto pb-20">
          <Outlet />
        </main>
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50">
          <div className="flex items-center justify-around px-2 py-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn('flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all', isActive ? 'text-primary' : 'text-muted-foreground')
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-card border-r flex flex-col fixed h-full z-40">
        <div className="p-6 border-b">
          <Logo iconSize={32} />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-muted',
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-primary transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 overflow-auto flex flex-col">
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
