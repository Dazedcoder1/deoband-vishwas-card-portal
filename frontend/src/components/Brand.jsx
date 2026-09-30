import { Link } from 'react-router-dom';

export function LogoMark({ className = 'w-10 h-10', bg = '#3D1E75' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <polygon fill={bg} points="24 4 42 12 42 26 24 44 6 26 6 12 24 4" stroke="#C9982E" strokeWidth="2.5" />
      <circle cx="24" cy="20" r="7" stroke="#FFFFFF" strokeWidth="1.8" />
      <path d="M24 14v12M18 20h12" stroke="#C9982E" strokeLinecap="round" strokeWidth="2" />
      <path d="M14 36c2.5-3 5.5-4.5 10-4.5s7.5 1.5 10 4.5" stroke="#FFFFFF" strokeWidth="2" />
    </svg>
  );
}

/** Logo lockup. `tone="dark"` = white text for purple headers, `tone="light"` = purple/gold on white. */
export function Brand({ tone = 'dark', to = '/', sub }) {
  const dark = tone === 'dark';
  return (
    <Link to={to} className="flex items-center gap-3 group">
      <span className={`w-12 h-12 rounded-xl p-1 flex items-center justify-center border transition-all duration-300 group-hover:scale-105 ${dark ? 'bg-white/10 border-white/20 group-hover:border-gold/60' : 'bg-primary border-gold/40 shadow-lift'}`}>
        <LogoMark className="w-10 h-10" />
      </span>
      <span className="leading-none whitespace-nowrap">
        <span className={`block text-xs uppercase tracking-[0.2em] font-bold ${dark ? 'text-slate-200 group-hover:text-gold-light' : 'text-primary-deep'}`}>Deoband</span>
        <span className={`block text-lg sm:text-xl font-extrabold tracking-tight ${dark ? 'text-white' : 'text-gold'}`}>VISHWAS CARD</span>
        {sub && <span className={`hidden sm:block text-[11px] mt-1 font-medium ${dark ? 'text-purple-200/80' : 'text-ink-muted'}`}>{sub}</span>}
      </span>
    </Link>
  );
}

export function MottoBar({ className = '' }) {
  return (
    <div className={`bg-gradient-to-r from-primary-dark via-primary to-primary-dark text-center py-1.5 ${className}`}>
      <p className="font-deva text-[13px] font-semibold text-gold-light tracking-wide">
        स्वस्थ देह • सशक्त समाज • समृद्ध देवबंद
      </p>
    </div>
  );
}
