import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { Alert, Icon, Spinner } from '../components/ui.jsx';
import { api, HELPLINE } from '../lib/api.js';
import { STEPS } from '../lib/content.js';

const EMPTY = { fullName: '', mobile: '', voterId: '', dob: '', gender: '', ward: '', familyMembers: '1', address: '' };

export default function Apply() {
  const [wards, setWards] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { api.get('/public/meta').then((m) => setWards(m.wards)).catch(() => {}); }, []);
  useEffect(() => {
    if (!photo) return setPreview(null);
    const u = URL.createObjectURL(photo); setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!consent) return setError('Please confirm the declaration to continue.');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append('photo', photo);
      setDone(await api.postForm('/public/apply', fd));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="bg-gradient-to-b from-[#EDE8F7] to-canvas py-10 lg:py-14">
        <div className="container-x grid lg:grid-cols-[1fr_340px] gap-8 items-start">
          <div className="panel p-6 sm:p-8">
            {done ? (
              <div className="text-center py-10 space-y-4">
                <span className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 grid place-items-center"><Icon name="task_alt" className="text-4xl" /></span>
                <h1 className="text-2xl font-extrabold text-primary-deep">Application received</h1>
                <p className="text-ink-body">Your application number is</p>
                <p className="text-3xl font-extrabold tracking-wide text-gold">{done.cardId}</p>
                <p className="text-ink-muted max-w-md mx-auto">{done.message} Once approved, log in with your mobile number and this card number to download your e-card.</p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Link to="/login" className="btn-primary">Go to Login</Link>
                  <Link to="/" className="btn-outline">Back to Home</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-6">
                <div>
                  <span className="chip bg-gold/15 text-gold-ink border border-gold/40">Online Application</span>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-primary-deep">Apply for Deoband Vishwas Card</h1>
                  <p className="font-deva text-ink-muted text-lg">विश्वास कार्ड के लिए आवेदन करें</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="a-name">Full Name * <span className="hi">(पूरा नाम)</span></label>
                    <input id="a-name" className="input" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="a-mobile">Mobile Number * <span className="hi">(मोबाइल)</span></label>
                    <input id="a-mobile" className="input" inputMode="numeric" maxLength={10} required value={form.mobile} onChange={(e) => set('mobile', e.target.value.replace(/\D/g, ''))} placeholder="10-digit number" />
                  </div>
                  <div>
                    <label className="label" htmlFor="a-voter">Voter ID / PAN <span className="hi">(Optional)</span></label>
                    <input id="a-voter" className="input uppercase" value={form.voterId} onChange={(e) => set('voterId', e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="a-dob">Date of Birth</label>
                    <input id="a-dob" type="date" className="input" value={form.dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('dob', e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="a-gender">Gender</label>
                    <select id="a-gender" className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                      <option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="a-ward">Village / Ward * <span className="hi">(ग्राम / वार्ड)</span></label>
                    <select id="a-ward" className="input" required value={form.ward} onChange={(e) => set('ward', e.target.value)}>
                      <option value="">Select</option>{wards.map((w) => <option key={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="a-family">Family Members</label>
                    <select id="a-family" className="input" value={form.familyMembers} onChange={(e) => set('familyMembers', e.target.value)}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="a-address">Address <span className="hi">(पता)</span></label>
                    <textarea id="a-address" rows={2} className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(f); e.target.value = ''; }} />
                    <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-4 rounded-xl border-2 border-dashed border-gold/50 bg-gold/5 p-4 text-left hover:bg-gold/10">
                      {preview ? <img src={preview} alt="" className="w-14 h-16 rounded-lg object-cover border border-gold" /> : <span className="w-14 h-16 rounded-lg bg-white grid place-items-center text-gold"><Icon name="add_a_photo" /></span>}
                      <span className="flex-1"><span className="block font-bold text-primary-deep">{photo ? 'Photo selected' : 'Add a passport-size photo'}</span><span className="block text-xs text-ink-muted">{photo ? photo.name : 'JPG / PNG, up to 5 MB'}</span></span>
                    </button>
                  </div>
                </div>
                <label className="flex items-start gap-3 text-sm text-ink-body">
                  <input type="checkbox" className="mt-0.5 rounded text-primary focus:ring-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  I declare that I am a resident of Deoband Assembly constituency and the information above is true. I consent to it being used to verify and issue my Vishwas Card.
                </label>
                <Alert onClose={() => setError('')}>{error}</Alert>
                <button type="submit" disabled={busy} className="btn-primary w-full rounded-xl py-4 text-base">{busy ? <Spinner /> : <Icon name="send" />} Submit Application</button>
              </form>
            )}
          </div>
          <aside className="space-y-4">
            {STEPS.map((s) => (
              <div key={s.n} className="panel p-5">
                <span className="text-2xl font-black text-gold">{s.n}</span>
                <h3 className="font-bold text-primary-deep mt-1">{s.title}</h3>
                <p className="text-sm text-ink-muted mt-1">{s.text}</p>
              </div>
            ))}
            <div className="rounded-2xl bg-primary text-white p-5">
              <p className="font-bold flex items-center gap-2"><Icon name="support_agent" className="text-gold-light" /> Need help applying?</p>
              <p className="text-sm text-purple-100/80 mt-1">Call {HELPLINE} or visit the Civic Welfare Desk, GT Road, Deoband.</p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
