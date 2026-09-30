import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Brand } from '../components/Brand.jsx';
import VishwasCard from '../components/VishwasCard.jsx';
import { Alert, Icon, Modal, Spinner } from '../components/ui.jsx';
import { api, HELPLINE } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { CAPTCHA_ELEMENT_ID, captchaPending, loadMsg91Widget, widget } from '../lib/msg91Widget.js';

export default function Login() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'admin' ? 'admin' : 'user';
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="bg-white border-b border-lavender">
        <div className="container-x h-20 flex items-center justify-between">
          <Brand tone="light" />
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="hidden sm:flex items-center gap-1.5 text-ink-body hover:text-primary font-medium">
              <Icon name="arrow_back" className="text-gold text-lg" /> Back to Homepage
            </Link>
            <span className="hidden md:block w-px h-6 bg-lavender-line" />
            <a href={`tel:${HELPLINE}`} className="flex items-center gap-2 text-ink-muted whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> <span className="hidden sm:inline">Helpline:</span>
              <b className="text-primary-deep hidden sm:inline">{HELPLINE}</b>
              <Icon name="call" className="sm:hidden text-primary" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 container-x py-8 lg:py-14">
        <div className="grid lg:grid-cols-2 rounded-3xl overflow-hidden shadow-floating bg-white">
          {/* Left brand panel */}
          <section className="relative bg-gradient-to-br from-primary via-primary-dark to-[#2A1254] text-white p-8 sm:p-12 overflow-hidden order-last lg:order-none">
            <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 200 Q200 120 400 260" stroke="#E5B44E" fill="none" strokeWidth="1.5" />
              <path d="M0 380 Q220 300 400 440" stroke="#E5B44E" fill="none" strokeWidth="1.5" />
            </svg>
            <div className="relative space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-light">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" /> Civic Healthcare Initiative
              </span>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.05]">
                Deoband<br /><span className="text-gold">Vishwas Card</span>
              </h1>
              <p className="text-purple-100/90 text-lg leading-relaxed max-w-md">
                Empowering every family across Deoband with subsidized medical care, free ambulance dispatch, and verified community welfare.
              </p>
              <div className="hidden sm:block max-w-md -rotate-2 hover:rotate-0 transition-transform duration-500 rounded-2xl overflow-hidden border-2 border-gold/60 shadow-floating">
                <VishwasCard placeholder />
              </div>
              <div className="pt-6 border-t border-white/10 flex items-center justify-between gap-4">
                <p className="font-hand text-3xl text-gold-light leading-tight">Together for a<br />Healthier Deoband</p>
                <p className="text-xs font-bold uppercase tracking-widest text-purple-200/80 text-right">Deoband<br />Constituency</p>
              </div>
              <div className="hidden sm:block rounded-xl bg-white/5 border border-white/10 p-4 text-center font-deva">
                <p className="text-lg font-bold">स्वस्थ देवबंद • सुरक्षित परिवार • मजबूत भविष्य</p>
                <p className="text-sm text-gold-light">आपका स्वास्थ्य, हमारी प्राथमिकता • जन सेवा ही हमारा संकल्प</p>
              </div>
            </div>
          </section>

          {/* Right form panel */}
          <section className="p-6 sm:p-12 lg:p-16">
            <div className="max-w-md mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-primary-deep tracking-tight">Portal Access</h2>
              <p className="text-ink-muted mt-2">Sign in to check card validity, subsidized benefits, and camp bookings.</p>

              <div className="mt-8 grid grid-cols-2 gap-1 p-1.5 rounded-2xl bg-lavender-soft border border-lavender" role="tablist">
                {[['user', 'person', 'User Login'], ['admin', 'shield_person', 'Admin Login']].map(([key, icon, label]) => (
                  <button key={key} role="tab" aria-selected={tab === key} type="button"
                    onClick={() => setParams(key === 'admin' ? { tab: 'admin' } : {}, { replace: true })}
                    className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${tab === key ? 'bg-white text-primary-deep shadow-lift' : 'text-ink-muted hover:text-primary'}`}>
                    <Icon name={icon} outline className={tab === key ? 'text-gold' : ''} /> {label}
                  </button>
                ))}
              </div>

              <div className="mt-8">{tab === 'user' ? <UserLogin /> : <AdminLogin />}</div>

              <div className="mt-10 grid grid-cols-3 gap-2 text-center">
                {[['Constituency', 'Deoband Assembly'], ['Assistance', '24/7 Helpline'], ['Verification', 'Instant OTP']].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-lavender-soft border border-lavender px-2 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{k}</p>
                    <p className="text-xs sm:text-sm font-bold text-primary-deep mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-[#2A1254] text-purple-200/80 text-sm">
        <div className="container-x py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Deoband Vishwas Card Initiative. All Rights Reserved.</p>
          <p className="font-deva text-gold-light text-base">साथ मिलकर, एक बेहतर देवबंद</p>
        </div>
      </footer>
    </div>
  );
}

function UserLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobile, setMobile] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [findOpen, setFindOpen] = useState(false);

  // How OTP works on this server: MSG91 OTP Widget in the browser, or backend-sent OTP.
  const [otpConfig, setOtpConfig] = useState(null);
  const [sentTo, setSentTo] = useState('');
  const [reqId, setReqId] = useState(undefined);
  useEffect(() => {
    api.get('/public/meta').then((m) => {
      const cfg = m.otp || { mode: 'server' };
      setOtpConfig(cfg);
      if (cfg.mode === 'widget') loadMsg91Widget(cfg).catch((e) => setError(e.message));
    }).catch(() => setOtpConfig({ mode: 'server' }));
  }, []);
  const widgetMode = otpConfig?.mode === 'widget';

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const cardId = cardNo.toUpperCase().startsWith('DBD') ? cardNo.toUpperCase() : `DBD-${cardNo.toUpperCase().replace(/^-/, '')}`;
  const mobileOk = /^[6-9]\d{9}$/.test(mobile);

  // If the number or card changes after an OTP was sent, start over.
  useEffect(() => {
    if (sent && sentTo !== `${mobile}|${cardId}`) { setSent(false); setOtp(''); setDevOtp(''); setInfo(''); setCountdown(0); setReqId(undefined); }
  }, [mobile, cardId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendOtp() {
    setError(''); setInfo('');
    if (!mobileOk) return setError('Enter your 10-digit registered mobile number.');
    if (cardNo.replace(/\D/g, '').length < 4) return setError('Enter your Vishwas Card number, e.g. DBD-1001-2026.');
    setBusy('send');
    try {
      if (widgetMode) {
        const { identifier } = await api.post('/auth/otp/precheck', { mobile, cardId });
        await loadMsg91Widget(otpConfig);
        if (captchaPending()) throw new Error('Please complete the captcha below, then click Send OTP.');
        if (sent && reqId) {
          // Resend on the same request; if MSG91 has closed that request (expired / retry limit), start a fresh one.
          try { await widget.retry(reqId); }
          catch (retryErr) { console.warn('[MSG91] retry failed, sending a new OTP instead:', retryErr.message); setReqId(await widget.send(identifier)); }
        } else {
          setReqId(await widget.send(identifier));
        }
        setCountdown(30);
        setInfo('OTP sent to your registered mobile number.');
      } else {
        const r = await api.post('/auth/otp/send', { mobile, cardId });
        setCountdown(r.resendIn || 45);
        setDevOtp(r.devOtp || '');
        setInfo(r.message);
      }
      setSent(true);
      setSentTo(`${mobile}|${cardId}`);
    } catch (e) {
      setError(e.message);
      if (e.data?.retryAfter) setCountdown(e.data.retryAfter);
    } finally {
      setBusy('');
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError('');
    if (!sent) return sendOtp();
    if (!/^\d{4,6}$/.test(otp)) return setError('Enter the OTP sent to your mobile.');
    setBusy('verify');
    try {
      if (widgetMode) {
        const accessToken = await widget.verify(otp, reqId);
        login(await api.post('/auth/otp/widget-verify', { mobile, cardId, accessToken }));
      } else {
        login(await api.post('/auth/otp/verify', { mobile, cardId, otp }));
      }
      navigate(location.state?.from?.startsWith('/dashboard') ? location.state.from : '/dashboard', { replace: true });
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <form onSubmit={verify} className="space-y-6" noValidate>
      <div>
        <label className="label" htmlFor="mobile">Registered Mobile Number</label>
        <div className="flex rounded-lg border border-lavender-line bg-white focus-within:border-primary-deep focus-within:ring-[3px] focus-within:ring-primary/15 transition">
          <span className="px-4 grid place-items-center text-ink-muted font-semibold border-r border-lavender-line">+91</span>
          <input id="mobile" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210"
            className="flex-1 border-0 focus:ring-0 rounded-r-lg px-4 py-3 text-[15px]"
            value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} />
        </div>
        <p className="hint">Enter 10-digit number linked to your Vishwas Card</p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="cardno">Card Number</label>
          <button type="button" onClick={() => setFindOpen(true)} className="text-xs font-semibold text-primary hover:text-gold mb-1.5">Find Card ID?</button>
        </div>
        <div className="flex items-center rounded-lg border border-lavender-line bg-white focus-within:border-primary-deep focus-within:ring-[3px] focus-within:ring-primary/15 transition">
          <span className="ml-3 chip-lav">DBD</span>
          <input id="cardno" autoComplete="off" placeholder="1001-2026" className="flex-1 border-0 focus:ring-0 rounded-r-lg px-3 py-3 text-[15px] uppercase"
            value={cardNo.replace(/^DBD-?/i, '')} onChange={(e) => setCardNo(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20))} />
          {cardNo.replace(/\D/g, '').length >= 8 && <Icon name="check_circle" className="text-emerald-500 mr-3" />}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="otp">One Time Password (OTP)</label>
        <div className="flex gap-3">
          <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter OTP"
            className="input tracking-[0.3em] text-lg placeholder:tracking-normal placeholder:text-[15px]" disabled={!sent}
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <button type="button" onClick={sendOtp} disabled={busy === 'send' || countdown > 0}
            className="shrink-0 rounded-xl border-2 border-primary text-primary font-bold px-4 hover:bg-primary/5 disabled:opacity-50 min-w-[112px]">
            {busy === 'send' ? <Spinner /> : sent ? 'Resend' : 'Send OTP'}
          </button>
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-ink-muted">
          <span>{sent ? 'OTP sent to +91 ' + mobile.slice(0, 2) + 'XXXXXX' + mobile.slice(-2) : 'Click Send OTP to receive code on mobile'}</span>
          {countdown > 0 && <span>Resend in <b className="text-primary-deep">00:{String(countdown).padStart(2, '0')}</b></span>}
        </div>
      </div>

      {widgetMode && <div id={CAPTCHA_ELEMENT_ID} className="empty:hidden" />}

      {devOtp && <Alert kind="dev">Development mode — your OTP is <b className="tracking-widest">{devOtp}</b>. (Set <code>OTP_DEV_MODE=false</code> in production.)</Alert>}
      {info && !devOtp && <Alert kind="success">{info}</Alert>}
      <Alert onClose={() => setError('')}>{error}</Alert>

      <button type="submit" disabled={!!busy} className="btn w-full bg-gradient-to-r from-primary to-primary-light text-white py-4 rounded-xl shadow-floating text-base">
        {busy === 'verify' ? <Spinner /> : <>Verify &amp; Login <Icon name="arrow_forward" className="text-gold-light" /></>}
      </button>

      <div className="flex items-center justify-between border-t border-lavender pt-5 text-sm">
        <span className="text-ink-muted">Don&apos;t have a card yet?</span>
        <Link to="/apply" className="font-bold text-primary hover:text-gold">Apply for Vishwas Card →</Link>
      </div>

      <FindCardModal open={findOpen} onClose={() => setFindOpen(false)} initialMobile={mobile} />
    </form>
  );
}

function FindCardModal({ open, onClose, initialMobile }) {
  const [mobile, setMobile] = useState(initialMobile);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setMobile(initialMobile); setMsg(''); setError(''); } }, [open, initialMobile]);

  async function submit() {
    setBusy(true); setError('');
    try { setMsg((await api.post('/public/find-card', { mobile })).message); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Find your Card ID">
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">Enter your registered mobile number. We&apos;ll send your Vishwas Card number to it by SMS.</p>
        <input className="input" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} />
        <Alert kind="success">{msg}</Alert>
        <Alert>{error}</Alert>
        <button type="button" onClick={submit} disabled={busy} className="btn-primary w-full rounded-xl">{busy ? <Spinner /> : 'Send my Card ID'}</button>
      </div>
    </Modal>
  );
}

function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      login(await api.post('/auth/admin/login', { username, password }));
      navigate('/admin', { replace: true });
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Alert kind="info">Authorized medical officers, hospital coordinators, and Deoband constituency camp administrators only.</Alert>
      <div>
        <label className="label" htmlFor="username">Admin ID / Officer Username</label>
        <input id="username" className="input" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. admin" />
      </div>
      <div>
        <label className="label" htmlFor="password">Security Password</label>
        <div className="relative">
          <input id="password" className="input pr-12" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-primary" aria-label={show ? 'Hide password' : 'Show password'}>
            <Icon name={show ? 'visibility_off' : 'visibility'} outline />
          </button>
        </div>
      </div>
      <Alert onClose={() => setError('')}>{error}</Alert>
      <button type="submit" disabled={busy} className="btn w-full bg-gradient-to-r from-primary to-primary-light text-white py-4 rounded-xl shadow-floating text-base">
        {busy ? <Spinner /> : <><Icon name="lock" className="text-gold-light" /> Login</>}
      </button>
      <p className="text-xs text-ink-muted flex items-center gap-1.5"><Icon name="encrypted" className="text-sm text-gold" /> Sessions are signed and expire automatically.</p>
    </form>
  );
}
