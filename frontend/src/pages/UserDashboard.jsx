import { useEffect, useState } from 'react';
import PortalHeader from '../components/PortalHeader.jsx';
import VishwasCard from '../components/VishwasCard.jsx';
import { Alert, Icon, Modal, Spinner, StatusChip, Toast, formatDate, rupees } from '../components/ui.jsx';
import { api, HELPLINE } from '../lib/api.js';
import { CITIZEN_SERVICES } from '../lib/content.js';

export default function UserDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [service, setService] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/me/card').then(setData).catch((e) => setError(e.message));
  }, []);

  const card = data?.card;
  const firstName = card?.fullName?.split(' ')[0];
  const validFrom = card?.issuedAt ? new Date(card.issuedAt).getFullYear() : null;
  const validTo = card?.validUntil ? new Date(card.validUntil).getFullYear() : null;

  async function downloadPdf() {
    setBusy(true);
    try { await api.download('/me/card/pdf', `Vishwas-Card-${card.cardId}.pdf`); }
    catch (e) { setToast({ kind: 'error', message: e.message }); }
    finally { setBusy(false); }
  }

  async function shareQr() {
    const share = { title: 'Deoband Vishwas Card', text: `Verify my Deoband Vishwas Card ${card.cardId}`, url: card.verifyUrl };
    try {
      if (navigator.share) await navigator.share(share);
      else { await navigator.clipboard.writeText(card.verifyUrl); setToast({ message: 'Verification link copied to clipboard.' }); }
    } catch { /* user cancelled */ }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <PortalHeader subtitle="Citizen Welfare & Healthcare Portal" />
      <main className="flex-1 container-x py-8 space-y-10">
        {error && <Alert>{error}</Alert>}
        {!card && !error && <div className="py-24 grid place-items-center text-primary"><Spinner className="text-4xl" /></div>}

        {card && (
          <>
            {/* Welcome hero */}
            <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-[#2A1254] text-white shadow-floating border-t-4 border-gold">
              <div className="grid lg:grid-cols-12 gap-8 p-6 sm:p-10 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="chip bg-gold/15 text-gold-light border border-gold/40 uppercase tracking-wider"><Icon name="verified_user" className="text-sm" /> Official Constituency Welfare Beneficiary</span>
                    {card.status === 'verified'
                      ? <span className="chip bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active &amp; Verified</span>
                      : <StatusChip status={card.status} />}
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Welcome back, {card.fullName}</h1>
                    <p className="font-deva text-lg text-purple-100/90 mt-1">नमस्ते {firstName} जी | आपका स्वास्थ्य एवं सशक्तिकरण, हमारा संकल्प</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[['Card ID', card.cardId], ['Assembly Area', card.constituency], ['Validity Period', validFrom ? `${validFrom} – ${validTo}` : 'Awaiting approval']].map(([k, v], i) => (
                      <div key={k} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wider text-purple-200/80 font-semibold">{k}</p>
                        <p className={`text-lg font-extrabold ${i === 2 ? 'text-gold-light' : ''}`}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={downloadPdf} disabled={busy || card.status !== 'verified'} className="btn-gold">
                      {busy ? <Spinner /> : <Icon name="download" />} Download e-Card PDF
                    </button>
                    <button type="button" onClick={shareQr} className="btn border-2 border-white/30 hover:bg-white/10 px-6 py-3 text-white">
                      <Icon name="qr_code_scanner" /> Share QR Code
                    </button>
                  </div>
                  {card.status !== 'verified' && (
                    <p className="text-sm text-amber-200 flex items-center gap-2"><Icon name="hourglass_top" /> Your application is being verified. Your e-card unlocks once approved.</p>
                  )}
                </div>
                <div className="lg:col-span-5">
                  <div className="rounded-2xl bg-gradient-to-br from-gold-light to-gold p-1.5 shadow-id">
                    <div className="rounded-xl overflow-hidden bg-white">
                      <VishwasCard cardId={card.cardId} verifyUrl={card.verifyUrl} placeholder={card.status !== 'verified'} />
                      <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="flex items-center gap-1.5 text-primary-deep font-semibold"><Icon name="verified" className="text-gold" outline /> Constituency Beneficiary Card</span>
                        <span className="text-xs text-ink-muted rounded-md border border-lavender px-2 py-1">Valid thru: {validTo || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs text-purple-200/80 flex items-center justify-center gap-1.5"><Icon name="lock" className="text-sm" /> Official Emblazoned Card • Secure Digital Ledger</p>
                </div>
              </div>
            </section>

            {/* Profile + benefit history */}
            <section className="grid lg:grid-cols-3 gap-6">
              <div className="panel p-6">
                <h2 className="font-extrabold text-primary-deep flex items-center gap-2"><Icon name="badge" className="text-gold" /> My Details</h2>
                <div className="mt-4 flex items-center gap-4">
                  {card.photoUrl
                    ? <img src={card.photoUrl} alt="" className="w-20 h-24 rounded-xl object-cover border-2 border-gold" />
                    : <span className="w-20 h-24 rounded-xl bg-lavender grid place-items-center text-primary"><Icon name="person" className="text-4xl" /></span>}
                  <div>
                    <p className="font-bold text-lg leading-tight">{card.fullName}</p>
                    <p className="text-sm text-ink-muted">{card.ward}</p>
                    <div className="mt-2"><StatusChip status={card.status} /></div>
                  </div>
                </div>
                <dl className="mt-5 divide-y divide-lavender text-sm">
                  {[['Mobile', `+91 ${card.mobile}`], ['Family members', card.familyMembers], ['Address', card.address || '—'], ['Issued on', formatDate(card.issuedAt)], ['Valid until', formatDate(card.validUntil)]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">{k}</dt><dd className="font-semibold text-right">{v}</dd></div>
                  ))}
                </dl>
              </div>
              <div className="panel p-6 lg:col-span-2">
                <h2 className="font-extrabold text-primary-deep flex items-center gap-2"><Icon name="receipt_long" className="text-gold" /> Benefits Availed</h2>
                {data.availments.length === 0 ? (
                  <div className="py-10 text-center text-ink-muted">
                    <Icon name="volunteer_activism" className="text-4xl text-lavender-line" />
                    <p className="mt-2 text-sm">No benefits recorded yet. Show your card at any empanelled facility to avail services.</p>
                  </div>
                ) : (
                  <ul className="mt-4 divide-y divide-lavender">
                    {data.availments.map((a, i) => (
                      <li key={i} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold">{a.scheme}</p>
                          <p className="text-xs text-ink-muted">{a.facility || '—'} • {formatDate(a.availedOn)}</p>
                        </div>
                        <span className="chip-verified whitespace-nowrap">{a.amount ? `${rupees(a.amount)} subsidised` : 'Completed'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Services directory */}
            <section>
              <p className="text-xs font-bold uppercase tracking-wider text-gold-ink flex items-center gap-1.5"><Icon name="medical_services" className="text-base" /> Constituency Services Directory</p>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mt-1 pb-4 border-b border-lavender-line">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-primary-deep">Beneficiary Healthcare &amp; Welfare Services</h2>
                  <p className="font-deva text-ink-muted text-lg">कल्याण एवं स्वास्थ्य सेवाएं</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="chip-lav"><Icon name="pin_drop" className="text-sm" /> Coverage: All Municipal &amp; Rural Wards</span>
                  <span className="chip-verified">{CITIZEN_SERVICES.length} Services Active</span>
                </div>
              </div>
              <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {CITIZEN_SERVICES.map((s) => (
                  <button key={s.title} type="button" onClick={() => setService(s)}
                    className="group text-left panel p-5 hover:-translate-y-1 hover:shadow-id hover:border-gold/50 transition-all flex flex-col">
                    <div className="flex items-start justify-between">
                      <span className="w-12 h-12 rounded-xl bg-lavender-soft border border-lavender grid place-items-center text-primary-deep group-hover:bg-primary group-hover:text-white transition"><Icon name={s.icon} /></span>
                      <span className="chip bg-gold/10 text-gold-ink border border-gold/30">{s.tag}</span>
                    </div>
                    <h3 className="mt-4 font-extrabold text-lg text-primary-deep">{s.title}</h3>
                    <p className="font-deva text-sm font-semibold text-gold-ink">{s.hi}</p>
                    <p className="mt-2 text-sm text-ink-body flex-1">{s.text}</p>
                    <span className="mt-4 pt-3 border-t border-lavender flex items-center justify-between text-sm font-bold text-primary-deep">
                      Explore Benefit <Icon name="arrow_forward" className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel p-5 sm:p-6 flex flex-col md:flex-row items-center gap-5 justify-between">
              <div className="flex items-center gap-4">
                <span className="w-12 h-12 rounded-xl bg-gold/15 grid place-items-center text-gold"><Icon name="handshake" /></span>
                <div>
                  <p className="font-deva font-bold text-primary-deep text-lg">एक स्वस्थ, सशक्त और समर्पित देवबंद के लिए हमारी प्रतिबद्धता</p>
                  <p className="text-sm text-ink-muted">Official welfare partner: Dr. B.R. Ambedkar College of Medical Sciences &amp; Hospital, Deoband.</p>
                </div>
              </div>
              <a href={`tel:${HELPLINE}`} className="btn bg-primary-ink hover:bg-primary text-white px-6 py-3 rounded-xl shrink-0"><Icon name="support_agent" /> Contact 24/7 Welfare Helpdesk</a>
            </section>
          </>
        )}
      </main>
      <footer className="border-t border-lavender bg-lavender-soft">
        <div className="container-x py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-muted">
          <p><span className="font-deva text-base text-primary-deep font-semibold">साथ मिलकर, एक बेहतर देवबंद</span> · © {new Date().getFullYear()} Deoband Constituency Civic Welfare Administration</p>
          <p>Helpline {HELPLINE}</p>
        </div>
      </footer>

      <Modal open={!!service} onClose={() => setService(null)} title={service?.title || ''}>
        {service && (
          <div className="space-y-4">
            <span className="chip bg-gold/15 text-gold-ink border border-gold/40"><Icon name="rocket_launch" className="text-sm" /> Launching Soon • <span className="font-deva">जल्द ही उपलब्ध</span></span>
            <p className="text-ink-body">{service.text}</p>
            <Alert kind="info">This digital service is being rolled out across Deoband facilities. Until then, call the welfare helpdesk with your Card ID ({card?.cardId}) and our team will arrange it for you.</Alert>
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-ghost" onClick={() => setService(null)}>Close</button>
              <a href={`tel:${HELPLINE}`} className="btn-primary rounded-xl"><Icon name="call" /> Call {HELPLINE}</a>
            </div>
          </div>
        )}
      </Modal>
      <Toast message={toast?.message} kind={toast?.kind} onDone={() => setToast(null)} />
    </div>
  );
}
