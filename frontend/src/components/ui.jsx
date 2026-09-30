import { useEffect } from 'react';

export const Icon = ({ name, className = '', outline = false }) => (
  <span aria-hidden="true" className={`icon ${outline ? 'icon-outline' : ''} ${className}`}>{name}</span>
);

export const Spinner = ({ className = '' }) => <Icon name="progress_activity" className={`animate-spin ${className}`} />;

export function Alert({ kind = 'error', children, onClose }) {
  if (!children) return null;
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-lavender-soft border-lavender-line text-primary-deep',
    dev: 'bg-amber-50 border-amber-200 text-amber-900',
  };
  const icon = { error: 'error', success: 'check_circle', info: 'info', dev: 'developer_mode' }[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${styles[kind]}`}>
      <Icon name={icon} className="text-lg mt-px" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
          <Icon name="close" className="text-lg" />
        </button>
      )}
    </div>
  );
}

export function Toast({ message, kind = 'success', onDone }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDone?.(), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);
  if (!message) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md animate-fadeIn">
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow-floating text-sm font-semibold ${kind === 'error' ? 'bg-red-700 text-white' : 'bg-primary-ink text-white'}`}>
        <Icon name={kind === 'error' ? 'error' : 'check_circle'} className={kind === 'error' ? '' : 'text-gold-light'} />
        <span className="flex-1">{message}</span>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-primary-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${size} max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-floating animate-fadeIn`}>
        <div className="sticky top-0 bg-white/95 backdrop-blur flex items-center justify-between px-5 py-4 border-b border-lavender">
          <h2 className="font-extrabold text-lg text-primary-deep">{title}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-lavender" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function StatusChip({ status }) {
  if (status === 'verified') return <span className="chip-verified"><Icon name="check_circle" className="text-sm" />Verified</span>;
  if (status === 'suspended') return <span className="chip-suspended"><Icon name="block" className="text-sm" />Suspended</span>;
  if (status === 'expired') return <span className="chip-suspended"><Icon name="event_busy" className="text-sm" />Expired</span>;
  return <span className="chip-pending"><Icon name="pending_actions" className="text-sm" />Pending KYC</span>;
}

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const formatMobile = (m) => (m ? `+91 ${m.slice(0, 5)} ${m.slice(5)}` : '');

export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
