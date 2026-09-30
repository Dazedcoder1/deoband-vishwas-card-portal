import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PortalHeader from '../components/PortalHeader.jsx';
import VishwasCard from '../components/VishwasCard.jsx';
import { Alert, Icon, Modal, Spinner, StatusChip, Toast, formatDate, formatMobile, rupees } from '../components/ui.jsx';
import { api, HELPLINE } from '../lib/api.js';
import { SCHEME_ICONS } from '../lib/content.js';

const TABS = [
  { key: 'new', icon: 'badge', label: 'Make New ID', short: 'New ID' },
  { key: 'db', icon: 'database', label: 'Existing DB', short: 'DB' },
  { key: 'availment', icon: 'policy', label: 'Search & Availment', short: 'Availment' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('new');
  const [meta, setMeta] = useState({ wards: [], schemes: [] });
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, kind = 'success') => setToast({ message, kind }), []);

  const loadStats = useCallback(() => api.get('/admin/stats').then(setStats).catch(() => {}), []);
  useEffect(() => {
    api.get('/public/meta').then(setMeta).catch(() => {});
    loadStats();
  }, [loadStats]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <PortalHeader subtitle="Admin Console • व्यवस्थापक पोर्टल" badge="Admin" />
      <main className="flex-1 w-full max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-ink">Official Constituency Administrative Suite</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-deep">Deoband Vishwas Portal</h1>
          </div>
          <p className="text-sm text-ink-muted flex items-center gap-1.5"><Icon name="emergency" className="text-red-500 text-base" /> Emergency: <b className="text-ink">108</b> / {HELPLINE}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-28">
            <nav className="panel p-2 flex lg:flex-col gap-1" aria-label="Admin modules">
              {TABS.map((t) => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center lg:justify-start gap-1.5 sm:gap-2.5 rounded-xl px-2 sm:px-3 py-3 text-sm font-semibold transition ${tab === t.key ? 'bg-primary text-white shadow-floating' : 'text-ink-body hover:bg-lavender-soft'}`}>
                  <Icon name={t.icon} className={tab === t.key ? 'text-gold-light' : 'text-primary'} />
                  <span className="hidden sm:inline">{t.label}</span><span className="sm:hidden text-xs">{t.short}</span>
                  {t.key === 'db' && stats && <span className={`lg:ml-auto chip ${tab === t.key ? 'bg-white/15 text-white' : 'bg-lavender text-primary-deep'}`}>{stats.totalCards.toLocaleString('en-IN')}</span>}
                </button>
              ))}
            </nav>
            <div className="panel p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center justify-between">Constituency Pulse <Icon name="analytics" className="text-gold" /></p>
              <div className="mt-3 grid grid-cols-2 lg:grid-cols-1 gap-2.5 [&>*]:min-w-0">
                <Stat label="Total Vishwas Cards" value={stats?.totalCards} icon="credit_card" />
                <Stat label="Issued Today (Verified)" value={stats?.issuedToday} icon="verified" accent="text-emerald-600" />
                <Stat label="Pending KYC" value={stats?.pending} icon="pending_actions" accent="text-amber-600" />
                <Stat label="Total Subsidised" value={stats ? rupees(stats.subsidisedTotal) : null} icon="currency_rupee" />
              </div>
            </div>
            <div className="panel p-4 hidden lg:block">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Guaranteed Health Entitlements</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-primary-deep">
                {[['ambulance', 'Ambulance'], ['local_hospital', 'IPD Support'], ['stethoscope', 'Health Camps'], ['medication', 'Free Meds']].map(([i, l]) => (
                  <span key={l} className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/5 px-2 py-2"><Icon name={i} className="text-gold text-base" />{l}</span>
                ))}
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            {tab === 'new' && <NewIdTab meta={meta} notify={notify} onIssued={loadStats} />}
            {tab === 'db' && <DatabaseTab meta={meta} notify={notify} onChanged={loadStats} />}
            {tab === 'availment' && <AvailmentTab meta={meta} notify={notify} onChanged={loadStats} />}
          </section>
        </div>
      </main>
      <footer className="border-t border-lavender bg-white">
        <div className="container-x py-5 text-center text-xs text-ink-muted">
          © {new Date().getFullYear()} Deoband Constituency Civic Welfare Administration · <span className="font-deva">‘सेवा, सुरक्षा और विश्वास’</span> — Service, Security &amp; Trust
        </div>
      </footer>
      <Toast message={toast?.message} kind={toast?.kind} onDone={() => setToast(null)} />
    </div>
  );
}

function Stat({ label, value, icon, accent = 'text-primary-deep' }) {
  return (
    <div className="rounded-xl border border-lavender bg-lavender-soft/60 px-3 py-2.5 flex items-center justify-between">
      <div>
        <p className="text-[11px] text-ink-muted font-semibold">{label}</p>
        <p className={`text-xl font-extrabold ${accent}`}>{value ?? '—'}</p>
      </div>
      <Icon name={icon} className="text-gold" outline />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card actions (print / SMS / PDF) shared by New ID + record modal     */
/* ------------------------------------------------------------------ */
function CardActions({ card, notify }) {
  const [busy, setBusy] = useState('');
  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (e) { notify(e.message, 'error'); } finally { setBusy(''); }
  };
  const disabled = !card || card.status !== 'verified';
  const btn = 'panel flex flex-col items-center gap-1 py-3.5 text-sm font-bold text-primary-deep hover:border-primary hover:-translate-y-0.5 transition disabled:opacity-50 disabled:pointer-events-none';
  return (
    <div className="grid grid-cols-3 gap-3">
      <button type="button" className={btn} disabled={disabled || !!busy} onClick={() => run('print', () => api.openPdf(`/admin/cards/${card.cardId}/pdf?inline=1`))}>
        {busy === 'print' ? <Spinner /> : <Icon name="print" className="text-gold" />} Print PVC Card
      </button>
      <button type="button" className={btn} disabled={disabled || !!busy} onClick={() => run('sms', async () => notify((await api.post(`/admin/cards/${card.cardId}/sms`)).message))}>
        {busy === 'sms' ? <Spinner /> : <Icon name="sms" className="text-gold" />} SMS e-Card Link
      </button>
      <button type="button" className={btn} disabled={disabled || !!busy} onClick={() => run('pdf', () => api.download(`/admin/cards/${card.cardId}/pdf`, `Vishwas-Card-${card.cardId}.pdf`))}>
        {busy === 'pdf' ? <Spinner /> : <Icon name="download" className="text-gold" />} Download PDF
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Beneficiary form (used for new cards and edits)                      */
/* ------------------------------------------------------------------ */
const EMPTY = { fullName: '', mobile: '', voterId: '', dob: '', gender: '', ward: '', familyMembers: '1', address: '' };

function BeneficiaryFields({ form, set, wards, photo, setPhoto, photoPreview }) {
  const fileRef = useRef(null);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="fullName">Beneficiary Full Name * <span className="hi">(लाभार्थी का पूरा नाम)</span></label>
        <input id="fullName" className="input" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="e.g. Smt. Sunita Devi" />
      </div>
      <div>
        <label className="label" htmlFor="mobileNo">Mobile Number * <span className="hi">(मोबाइल)</span></label>
        <input id="mobileNo" className="input" inputMode="numeric" maxLength={10} required value={form.mobile} onChange={(e) => set('mobile', e.target.value.replace(/\D/g, ''))} placeholder="98765 43210" />
      </div>
      <div>
        <label className="label" htmlFor="voterId">PAN / Voter ID <span className="hi">(Optional)</span></label>
        <input id="voterId" className="input uppercase" value={form.voterId} onChange={(e) => set('voterId', e.target.value)} placeholder="e.g. ABCPD1234F" />
      </div>
      <div>
        <label className="label" htmlFor="dob">Date of Birth</label>
        <input id="dob" type="date" className="input" value={form.dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('dob', e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="gender">Gender</label>
        <select id="gender" className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
          <option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="ward">Village / Ward * <span className="hi">(ग्राम / वार्ड)</span></label>
        <select id="ward" className="input" required value={form.ward} onChange={(e) => set('ward', e.target.value)}>
          <option value="">Select village / ward</option>
          {wards.map((w) => <option key={w}>{w}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="family">Family Members Included</label>
        <select id="family" className="input" value={form.familyMembers} onChange={(e) => set('familyMembers', e.target.value)}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? '1 Member (Individual)' : `${n} Members`}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="address">Street Address &amp; Landmark <span className="hi">(पता)</span></label>
        <textarea id="address" rows={2} className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="H.No., Mohalla, Landmark, Deoband, Saharanpur - 247554" />
      </div>
      <div className="sm:col-span-2">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(f); e.target.value = ''; }} />
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-full flex items-center gap-4 rounded-xl border-2 border-dashed border-gold/50 bg-gold/5 p-4 text-left hover:bg-gold/10 transition">
          {photoPreview
            ? <img src={photoPreview} alt="" className="w-14 h-16 rounded-lg object-cover border border-gold" />
            : <span className="w-14 h-16 rounded-lg bg-white grid place-items-center text-gold"><Icon name="add_a_photo" /></span>}
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-primary-deep">{photo ? 'Citizen Photo Selected' : 'Upload Citizen Photo'}</span>
            <span className="block text-xs text-ink-muted truncate">{photo ? `${photo.name} • ${(photo.size / 1024).toFixed(0)} KB` : 'JPG, PNG or WEBP, up to 5 MB — stored securely in Cloudflare R2'}</span>
          </span>
          <span className="text-xs font-bold text-primary">{photo || photoPreview ? 'Retake / Change' : 'Browse'}</span>
        </button>
      </div>
    </div>
  );
}

function usePhotoPreview(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function toFormData(form, photo) {
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
  if (photo) fd.append('photo', photo);
  return fd;
}

/* ------------------------------------------------------------------ */
/* Tab: New ID                                                          */
/* ------------------------------------------------------------------ */
function NewIdTab({ meta, notify, onIssued }) {
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const preview = usePhotoPreview(photo);
  const [draftId, setDraftId] = useState('');
  const [issued, setIssued] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadDraft = useCallback(() => api.get('/admin/next-id').then((r) => setDraftId(r.cardId)).catch(() => {}), []);
  useEffect(() => { loadDraft(); }, [loadDraft]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { card } = await api.postForm('/admin/cards', toFormData(form, photo));
      setIssued(card);
      notify(`Card ${card.cardId} issued to ${card.fullName}.`);
      onIssued();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  function startNew() {
    setForm(EMPTY); setPhoto(null); setIssued(null); setError('');
    loadDraft();
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
      <form onSubmit={submit} className="panel p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <span className="chip bg-gold/15 text-gold-ink border border-gold/40">New Citizen Issuance</span>
            <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-primary-deep">Citizen Registration &amp; Card Generation <span className="font-deva font-semibold text-ink-muted text-lg">/ नया विश्वास कार्ड बनाएं</span></h2>
            <p className="text-sm text-ink-muted mt-1">Grants access to subsidised healthcare &amp; Dr. B.R. Ambedkar Medical College benefits.</p>
          </div>
          <div className="rounded-xl border border-lavender bg-lavender-soft px-4 py-2.5 text-right shrink-0">
            <p className="text-[11px] font-semibold text-ink-muted">{issued ? 'Issued Card ID' : 'Auto-Generated Draft ID'}</p>
            <p className="text-lg font-extrabold text-primary-deep tracking-wide">{issued?.cardId || draftId || '—'}</p>
          </div>
        </div>

        {issued ? (
          <div className="space-y-4">
            <Alert kind="success">
              <b>{issued.fullName}</b> is now a verified beneficiary. Card <b>{issued.cardId}</b> is valid until {formatDate(issued.validUntil)}.
            </Alert>
            <button type="button" onClick={startNew} className="btn-primary rounded-xl"><Icon name="person_add" /> Register Another Citizen</button>
          </div>
        ) : (
          <>
            <p className="text-sm font-bold text-primary-deep flex items-center gap-2"><Icon name="person_add" className="text-gold" /> Beneficiary Demographics <span className="ml-auto text-xs font-medium text-ink-muted">* Mandatory</span></p>
            <BeneficiaryFields form={form} set={set} wards={meta.wards} photo={photo} setPhoto={setPhoto} photoPreview={preview} />
            <Alert onClose={() => setError('')}>{error}</Alert>
            <button type="submit" disabled={busy} className="btn w-full bg-gradient-to-r from-primary-dark to-primary text-white py-4 rounded-xl shadow-floating text-base">
              {busy ? <Spinner /> : <Icon name="stars" className="text-gold-light" />} Generate Card &amp; Issue DBD Credential
            </button>
          </>
        )}
      </form>

      <div className="space-y-4 xl:sticky xl:top-28">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Official Live Card Preview</p>
          <span className="text-xs font-bold text-gold-ink flex items-center gap-1"><Icon name="verified" className="text-sm" /> Validated Template</span>
        </div>
        <div className="rounded-2xl p-1 bg-gradient-to-br from-gold-light to-gold shadow-id">
          <div className="rounded-xl overflow-hidden bg-white">
            <VishwasCard cardId={issued?.cardId || draftId} verifyUrl={issued?.verifyUrl || `${window.location.origin}/verify/${draftId}`} />
          </div>
        </div>
        <CardActions card={issued} notify={notify} />
        {!issued && <p className="text-xs text-ink-muted text-center">Print, SMS and PDF unlock after the card is issued.</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: Existing DB                                                     */
/* ------------------------------------------------------------------ */
function DatabaseTab({ meta, notify, onChanged }) {
  const [filters, setFilters] = useState({ search: '', ward: '', status: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [debounced, setDebounced] = useState(filters);

  useEffect(() => { const t = setTimeout(() => setDebounced(filters), 300); return () => clearTimeout(t); }, [filters]);
  const qs = useMemo(() => new URLSearchParams(Object.entries({ ...debounced, page, pageSize: 10 }).filter(([, v]) => v !== '')).toString(), [debounced, page]);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/cards?${qs}`).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [qs]);
  useEffect(() => { load(); }, [load]);

  const setF = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const exportQs = new URLSearchParams(Object.entries(debounced).filter(([, v]) => v)).toString();

  return (
    <div className="panel">
      <div className="p-5 sm:p-6 border-b border-lavender flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="chip-lav"><Icon name="verified" className="text-sm" /> Verified Central Registry</span>
          <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-primary-deep">Beneficiary Directory <span className="text-ink-muted font-semibold text-base">({data?.total?.toLocaleString('en-IN') ?? '…'} records)</span></h2>
          <p className="text-sm text-ink-muted">Enrolled households eligible for free clinical coverage, camp admissions and emergency transport.</p>
        </div>
        <button type="button" className="btn-outline rounded-xl py-2.5" onClick={() => api.download(`/admin/cards/export.csv${exportQs ? `?${exportQs}` : ''}`, 'beneficiaries.csv').catch((e) => notify(e.message, 'error'))}>
          <Icon name="file_download" /> Export CSV
        </button>
      </div>
      <div className="p-5 sm:px-6 grid sm:grid-cols-[1fr_200px_170px] gap-3 border-b border-lavender bg-lavender-soft/40">
        <label className="relative">
          <span className="sr-only">Search</span>
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-10" placeholder="Search name, card ID, mobile or voter ID" value={filters.search} onChange={(e) => setF('search', e.target.value)} />
        </label>
        <select className="input" value={filters.ward} onChange={(e) => setF('ward', e.target.value)} aria-label="Ward">
          <option value="">All Wards &amp; Villages</option>{meta.wards.map((w) => <option key={w}>{w}</option>)}
        </select>
        <select className="input" value={filters.status} onChange={(e) => setF('status', e.target.value)} aria-label="Status">
          <option value="">Status: All</option><option value="verified">Verified Only</option><option value="pending">Pending KYC</option><option value="suspended">Suspended</option>
        </select>
      </div>

      {error && <div className="p-5"><Alert>{error}</Alert></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted border-b border-lavender">
              <th className="px-6 py-3 font-bold">Beneficiary</th><th className="px-3 py-3 font-bold">Card ID</th><th className="px-3 py-3 font-bold">Mobile</th>
              <th className="px-3 py-3 font-bold">Village / Ward</th><th className="px-3 py-3 font-bold">Family</th><th className="px-3 py-3 font-bold">Status</th><th className="px-6 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {data?.items.map((c) => (
              <tr key={c.id} className="border-b border-[#F0EBF7] hover:bg-lavender-soft/60">
                <td className="px-6 py-3.5"><p className="font-bold text-ink">{c.fullName}</p><p className="text-xs text-ink-muted">{c.dob ? `DOB: ${formatDate(c.dob)}` : c.source === 'online' ? 'Online application' : '—'}</p></td>
                <td className="px-3 py-3.5 font-semibold text-primary-deep whitespace-nowrap">{c.cardId}</td>
                <td className="px-3 py-3.5 whitespace-nowrap">{formatMobile(c.mobile)}</td>
                <td className="px-3 py-3.5">{c.ward}</td>
                <td className="px-3 py-3.5 whitespace-nowrap">{c.familyMembers} {c.familyMembers === 1 ? 'Member' : 'Members'}</td>
                <td className="px-3 py-3.5"><StatusChip status={c.status} /></td>
                <td className="px-6 py-3.5 text-right">
                  <button type="button" onClick={() => setOpenId(c.cardId)} className="inline-flex items-center gap-1 rounded-lg border border-lavender-line px-3 py-1.5 text-xs font-bold text-primary-deep hover:border-primary">
                    <Icon name={c.status === 'pending' ? 'verified_user' : 'visibility'} className="text-sm" /> {c.status === 'pending' ? 'Review' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-14 text-center text-ink-muted"><Icon name="person_search" className="text-4xl text-lavender-line" /><p className="mt-2">No beneficiaries match these filters.</p></td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data.pages > 1 && (
        <div className="px-6 py-4 flex items-center justify-between text-sm text-ink-muted">
          <span>Page {data.page} of {data.pages.toLocaleString('en-IN')}</span>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost border border-lavender-line rounded-lg py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button type="button" className="btn-ghost border border-lavender-line rounded-lg py-1.5" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
      <RecordModal cardId={openId} onClose={() => setOpenId(null)} meta={meta} notify={notify} onChanged={() => { load(); onChanged(); }} />
    </div>
  );
}

function RecordModal({ cardId, onClose, meta, notify, onChanged }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const preview = usePhotoPreview(photo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null); setEditing(false); setPhoto(null); setError('');
    if (cardId) api.get(`/admin/cards/${cardId}`).then(setData).catch((e) => setError(e.message));
  }, [cardId]);

  const card = data?.card;
  const startEdit = () => {
    setForm({ fullName: card.fullName, mobile: card.mobile, voterId: card.voterId || '', dob: card.dob || '', gender: card.gender || '', ward: card.ward, familyMembers: String(card.familyMembers), address: card.address || '' });
    setEditing(true);
  };

  async function patch(fd, msg) {
    setBusy(true); setError('');
    try {
      const r = await api.patchForm(`/admin/cards/${card.cardId}`, fd);
      setData((d) => ({ ...d, card: r.card }));
      setEditing(false); setPhoto(null);
      notify(msg);
      onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const setStatus = (status) => { const fd = new FormData(); fd.append('status', status); patch(fd, `Card ${card.cardId} marked ${status}.`); };

  return (
    <Modal open={!!cardId} onClose={onClose} title={card ? `${card.fullName} · ${card.cardId}` : 'Beneficiary record'} size="max-w-3xl">
      {!card && !error && <div className="py-16 grid place-items-center text-primary"><Spinner className="text-3xl" /></div>}
      <Alert>{error}</Alert>
      {card && !editing && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {card.photoUrl ? <img src={card.photoUrl} alt="" className="w-20 h-24 rounded-xl object-cover border-2 border-gold" /> : <span className="w-20 h-24 rounded-xl bg-lavender grid place-items-center text-primary"><Icon name="person" className="text-4xl" /></span>}
              <div><StatusChip status={card.status} /><p className="text-xs text-ink-muted mt-2">{card.source === 'online' ? 'Applied online' : 'Registered at desk'} · {formatDate(card.createdAt)}</p></div>
            </div>
            <dl className="divide-y divide-lavender text-sm">
              {[['Mobile', formatMobile(card.mobile)], ['PAN / Voter ID', card.voterId || '—'], ['Date of birth', formatDate(card.dob)], ['Village / Ward', card.ward], ['Family members', card.familyMembers], ['Address', card.address || '—'], ['Valid until', formatDate(card.validUntil)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-ink-muted">{k}</dt><dd className="font-semibold text-right">{v}</dd></div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2">
              {card.status !== 'verified' && <button type="button" disabled={busy} onClick={() => setStatus('verified')} className="btn bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl"><Icon name="check_circle" /> Approve &amp; Issue</button>}
              <button type="button" disabled={busy} onClick={startEdit} className="btn-outline rounded-xl py-2 px-4"><Icon name="edit" /> Edit</button>
              {card.status === 'verified' && <button type="button" disabled={busy} onClick={() => setStatus('suspended')} className="btn text-red-700 hover:bg-red-50 border border-red-200 px-4 py-2 rounded-xl"><Icon name="block" /> Suspend</button>}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border-2 border-gold/60"><VishwasCard cardId={card.cardId} verifyUrl={card.verifyUrl} placeholder={card.status !== 'verified'} /></div>
            <CardActions card={card} notify={notify} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Benefits availed ({data.availments.length})</p>
              {data.availments.length === 0 ? <p className="text-sm text-ink-muted">None recorded yet.</p> : (
                <ul className="text-sm divide-y divide-lavender">
                  {data.availments.map((a) => <li key={a.id} className="py-2 flex justify-between gap-3"><span>{a.scheme}<span className="block text-xs text-ink-muted">{formatDate(a.availed_on)}</span></span><b>{a.amount ? rupees(a.amount) : '—'}</b></li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      {card && editing && (
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); patch(toFormData(form, photo), 'Beneficiary details updated.'); }}>
          <BeneficiaryFields form={form} set={(k, v) => setForm((f) => ({ ...f, [k]: v }))} wards={meta.wards} photo={photo} setPhoto={setPhoto} photoPreview={preview || card.photoUrl} />
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary rounded-xl">{busy ? <Spinner /> : <Icon name="save" />} Save changes</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: Search & Availment                                              */
/* ------------------------------------------------------------------ */
const EMPTY_AV = { search: '', ward: '', family: '', scheme: '', series: '' };

function AvailmentTab({ meta, notify, onChanged }) {
  const [draft, setDraft] = useState(EMPTY_AV);
  const [applied, setApplied] = useState(EMPTY_AV);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [recordOpen, setRecordOpen] = useState(false);

  const load = useCallback(() => {
    const qs = new URLSearchParams(Object.entries(applied).filter(([, v]) => v)).toString();
    api.get(`/admin/availments${qs ? `?${qs}` : ''}`).then((d) => { setItems(d.items); setError(''); }).catch((e) => setError(e.message));
  }, [applied]);
  useEffect(() => { load(); }, [load]);
  const setD = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const year = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="panel p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <span className="chip-lav"><Icon name="local_hospital" className="text-sm" /> Healthcare Claim Audit</span>
            <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-primary-deep">Scheme Availment Registry <span className="font-deva font-semibold text-ink-muted text-lg">/ योजना लाभ ट्रैकर</span></h2>
            <p className="text-sm text-ink-muted">Audit which citizens availed free ambulance, hospital bill subsidies, pharmacy dispensing or medical camps.</p>
          </div>
          <button type="button" onClick={() => setRecordOpen(true)} className="btn-gold rounded-xl shrink-0"><Icon name="add_circle" /> Record Benefit</button>
        </div>
        <form className="mt-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3" onSubmit={(e) => { e.preventDefault(); setApplied(draft); }}>
          <input className="input lg:col-span-5" placeholder="Search beneficiary name or card ID" value={draft.search} onChange={(e) => setD('search', e.target.value)} />
          <select className="input" value={draft.ward} onChange={(e) => setD('ward', e.target.value)} aria-label="Village / Ward"><option value="">All Locations</option>{meta.wards.map((w) => <option key={w}>{w}</option>)}</select>
          <select className="input" value={draft.family} onChange={(e) => setD('family', e.target.value)} aria-label="Family size"><option value="">Any Family Size</option><option value="small">1 – 2 Members</option><option value="medium">3 – 5 Members</option><option value="large">6+ Members</option></select>
          <select className="input" value={draft.scheme} onChange={(e) => setD('scheme', e.target.value)} aria-label="Scheme"><option value="">All Health Benefits</option>{meta.schemes.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="input" value={draft.series} onChange={(e) => setD('series', e.target.value)} aria-label="Card series"><option value="">All Card Series</option>{[year, year - 1, year - 2].map((y) => <option key={y} value={y}>{y} Series</option>)}</select>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost border border-lavender-line rounded-xl flex-1" onClick={() => { setDraft(EMPTY_AV); setApplied(EMPTY_AV); }}>Reset</button>
            <button type="submit" className="btn-primary rounded-xl flex-1 px-3"><Icon name="filter_alt" /> Apply</button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="px-5 sm:px-6 py-4 border-b border-lavender flex items-center justify-between">
          <p className="font-bold text-primary-deep flex items-center gap-2"><Icon name="receipt_long" className="text-gold" /> Recent Scheme Transactions &amp; Benefit Disbursals</p>
          <span className="chip-lav">{items?.length ?? '…'} records</span>
        </div>
        {error && <div className="p-5"><Alert>{error}</Alert></div>}
        {items?.length === 0 && <p className="px-6 py-14 text-center text-ink-muted">No benefit records match these filters.</p>}
        <ul className="divide-y divide-[#F0EBF7]">
          {items?.map((a) => (
            <li key={a.id} className="px-5 sm:px-6 py-4 grid sm:grid-cols-[auto_1fr_auto] gap-4 items-center">
              <span className="w-12 h-12 rounded-xl bg-lavender-soft border border-lavender grid place-items-center text-primary"><Icon name={SCHEME_ICONS[a.scheme] || 'medical_services'} /></span>
              <div className="min-w-0">
                <p className="font-bold text-ink">{a.fullName} <span className="text-primary-deep font-semibold text-sm">· {a.cardId}</span></p>
                <p className="text-xs text-ink-muted">Village: {a.ward} • Family: {a.familyMembers} Members</p>
                <p className="text-sm mt-1"><span className="font-semibold text-primary-deep">{a.scheme}</span>{a.facility && <span className="text-ink-muted"> — {a.facility}</span>}</p>
              </div>
              <div className="sm:text-right">
                <span className="chip-verified">{a.amount ? `${rupees(a.amount)} Subsidised` : a.status === 'pending' ? 'Pending' : 'Completed'}</span>
                <p className="text-xs text-ink-muted mt-1">Date: {formatDate(a.availedOn)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <RecordBenefitModal open={recordOpen} onClose={() => setRecordOpen(false)} schemes={meta.schemes}
        onSaved={() => { setRecordOpen(false); notify('Benefit recorded.'); load(); onChanged(); }} />
    </div>
  );
}

function RecordBenefitModal({ open, onClose, schemes, onSaved }) {
  const blank = { cardId: '', scheme: '', facility: '', amount: '', availedOn: new Date().toISOString().slice(0, 10), notes: '' };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setF(blank); setError(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api.post('/admin/availments', f); onSaved(); } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Record a benefit availment">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="av-card">Card ID *</label><input id="av-card" className="input uppercase" required placeholder="DBD-1001-2026" value={f.cardId} onChange={(e) => set('cardId', e.target.value)} /></div>
        <div><label className="label" htmlFor="av-scheme">Scheme *</label><select id="av-scheme" className="input" required value={f.scheme} onChange={(e) => set('scheme', e.target.value)}><option value="">Select scheme</option>{schemes.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label className="label" htmlFor="av-fac">Facility</label><input id="av-fac" className="input" placeholder="e.g. Dr. B.R. Ambedkar Hospital Deoband" value={f.facility} onChange={(e) => set('facility', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label" htmlFor="av-amt">Amount subsidised (₹)</label><input id="av-amt" className="input" inputMode="numeric" value={f.amount} onChange={(e) => set('amount', e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
          <div><label className="label" htmlFor="av-date">Date</label><input id="av-date" type="date" className="input" value={f.availedOn} onChange={(e) => set('availedOn', e.target.value)} /></div>
        </div>
        <div><label className="label" htmlFor="av-notes">Notes</label><textarea id="av-notes" rows={2} className="input" value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        <Alert>{error}</Alert>
        <div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" disabled={busy} className="btn-primary rounded-xl">{busy ? <Spinner /> : <Icon name="save" />} Save record</button></div>
      </form>
    </Modal>
  );
}
