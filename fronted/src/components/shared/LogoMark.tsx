import { CarFront } from 'lucide-react';

interface LogoMarkProps {
  size?: number;
}

// Icône reprise telle quelle du AppHeader du prototype DispoConduite.full.jsx.
export function LogoMark({ size = 36 }: LogoMarkProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.4,
        background: 'linear-gradient(135deg, #F0562A 0%, #F0891A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <CarFront style={{ width: size * 0.5, height: size * 0.5, color: 'white' }} />
    </div>
  );
}

interface LogoProps {
  iconSize?: number;
  showText?: boolean;
}

export function Logo({ iconSize = 36, showText = true }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={iconSize} />
      {showText && (
        <span
          className="font-heading"
          style={{
            fontWeight: 800,
            fontSize: iconSize * 0.5,
            color: 'var(--foreground)',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          DispoConduite
        </span>
      )}
    </div>
  );
}
