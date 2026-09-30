import { useNavigate } from 'react-router-dom';
import { Brand, MottoBar } from './Brand.jsx';
import { Icon } from './ui.jsx';
import { useAuth } from '../lib/auth.jsx';
import { HELPLINE } from '../lib/api.js';

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Header for logged-in areas (citizen dashboard + admin console). */
export default function PortalHeader({ subtitle, badge, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <header className="bg-white/95 backdrop-blur border-b border-lavender sticky top-0 z-40">
        <div className="container-x h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Brand tone="light" sub={subtitle} />
            {badge && <span className="hidden sm:inline-flex chip bg-gold/15 text-gold-ink border border-gold/40 uppercase tracking-wider">{badge}</span>}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {children}
            <a href={`tel:${HELPLINE}`} className="hidden md:flex items-center gap-2 rounded-full border border-lavender-line px-4 py-2 text-sm font-bold text-primary-deep hover:border-primary">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {HELPLINE}
            </a>
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-full bg-primary text-white grid place-items-center font-bold text-sm ring-2 ring-gold/50" title={user?.name}>
                {initials(user?.name)}
              </span>
              <span className="hidden lg:block leading-tight">
                <span className="block text-sm font-bold text-ink">{user?.name}</span>
                <span className="block text-xs text-ink-muted">{user?.role === 'admin' ? `@${user.username}` : user?.cardId}</span>
              </span>
            </div>
            <button type="button" onClick={() => { logout(); navigate('/login'); }} className="p-2 rounded-full hover:bg-lavender text-ink-muted hover:text-primary" title="Log out" aria-label="Log out">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </header>
      <MottoBar />
    </>
  );
}
