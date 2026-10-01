import { Link } from 'react-router-dom';

/** Official emblem used inside the site (frontend/public/emblem-sm.png; large version: emblem.png).
 *  The simpler hexagon logo (logo.png) is used for the browser-tab favicon. */
export function LogoMark({ className = 'w-10 h-10', large = false }) {
  return <img src={large ? '/emblem.png' : '/emblem-sm.png'} alt="" aria-hidden="true" className={`${className} object-contain`} draggable="false" />;
}

/** Logo lockup. `tone="dark"` = white text for purple headers, `tone="light"` = purple/gold on white. */
export function Brand({ tone = 'dark', to = '/', sub }) {
  const dark = tone === 'dark';
  return (
    <Link to={to} className="flex items-center gap-3 group">
      <LogoMark className="w-14 h-14 shrink-0 drop-shadow-md transition-transform duration-300 group-hover:scale-105" />
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
