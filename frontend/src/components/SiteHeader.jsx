import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Brand } from './Brand.jsx';
import { Icon } from './ui.jsx';
import { useAuth } from '../lib/auth.jsx';

const NAV = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/#about', label: 'About' },
  { href: '/#services', label: 'Services' },
  { href: '/#benefits', label: 'Card Benefits' },
  { href: '/#contact', label: 'Contact' },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const account = user ? { to: user.role === 'admin' ? '/admin' : '/dashboard', label: 'My Dashboard', icon: 'dashboard' } : { to: '/login', label: 'Login / Sign Up', icon: 'person' };

  return (
    <header className="bg-header/95 backdrop-blur-md text-white sticky top-0 z-50 shadow-md">
      <div className="container-x">
        <div className="flex items-center justify-between h-20">
          <Brand tone="dark" />
          <nav className="hidden md:flex items-center gap-1 lg:gap-3" aria-label="Main">
            {NAV.map((n) =>
              n.href === '/' ? (
                <NavLink key={n.label} to="/" end className="px-4 py-2 text-sm font-semibold rounded-full bg-white/15 hover:bg-white/25 flex items-center gap-1.5 transition">
                  <Icon name={n.icon} className="text-[18px]" /> {n.label}
                </NavLink>
              ) : (
                <a key={n.label} href={n.href} className="px-3 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 rounded-full transition">
                  {n.label}
                </a>
              ),
            )}
          </nav>
          <div className="flex items-center gap-2">
            <Link to={account.to} className="group hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gold/70 text-gold-light hover:bg-gold hover:text-slate-900 hover:border-gold hover:shadow-[0_0_15px_rgba(201,152,46,0.4)] transition-all font-semibold text-sm">
              <Icon name={account.icon} className="text-[18px] group-hover:rotate-12 transition-transform" />
              {account.label}
            </Link>
            <button type="button" className="md:hidden p-2 rounded-full hover:bg-white/10" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Menu">
              <Icon name={open ? 'close' : 'menu'} />
            </button>
          </div>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-white/10 bg-header px-4 pb-4 pt-2 space-y-1" aria-label="Mobile">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-slate-100 hover:bg-white/10 font-medium">
              {n.label}
            </a>
          ))}
          <Link to={account.to} onClick={() => setOpen(false)} className="flex items-center gap-2 mt-2 px-3 py-2.5 rounded-lg bg-gold text-slate-900 font-bold">
            <Icon name={account.icon} /> {account.label}
          </Link>
        </nav>
      )}
    </header>
  );
}
