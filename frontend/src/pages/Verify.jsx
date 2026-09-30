import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { Alert, Icon, Spinner, StatusChip, formatDate } from '../components/ui.jsx';
import { api, HELPLINE } from '../lib/api.js';

/** Public page opened by scanning the QR on a card. Shows masked details only. */
export default function Verify() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(cardId || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResult(null); setError('');
    if (!cardId) return;
    setLoading(true);
    api.get(`/public/verify/${encodeURIComponent(cardId)}`).then(setResult).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [cardId]);

  return (
    <>
      <SiteHeader />
      <main className="bg-gradient-to-br from-[#EDE8F7] via-canvas to-white min-h-[70vh] py-12">
        <div className="container-x max-w-2xl">
          <div className="text-center">
            <span className="w-16 h-16 mx-auto rounded-2xl bg-primary text-gold-light grid place-items-center shadow-floating"><Icon name="qr_code_scanner" className="text-3xl" /></span>
            <h1 className="mt-4 text-3xl font-extrabold text-primary-deep">Verify a Vishwas Card</h1>
            <p className="text-ink-muted mt-1">Hospitals, pharmacies and camp staff can confirm a card is genuine and active.</p>
          </div>
          <form className="mt-8 flex gap-3" onSubmit={(e) => { e.preventDefault(); if (input.trim()) navigate(`/verify/${input.trim().toUpperCase()}`); }}>
            <input className="input uppercase text-lg" placeholder="DBD-1001-2026" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Card ID" />
            <button type="submit" className="btn-primary rounded-xl shrink-0">Verify</button>
          </form>

          <div className="mt-8">
            {loading && <div className="grid place-items-center py-10 text-primary"><Spinner className="text-3xl" /></div>}
            {error && <Alert>{error}</Alert>}
            {result && (
              <div className={`panel overflow-hidden border-2 ${result.valid ? 'border-emerald-300' : 'border-red-200'}`}>
                <div className={`px-6 py-5 flex items-center gap-4 ${result.valid ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <Icon name={result.valid ? 'verified' : 'gpp_bad'} className={`text-5xl ${result.valid ? 'text-emerald-600' : 'text-red-600'}`} />
                  <div>
                    <p className={`text-xl font-extrabold ${result.valid ? 'text-emerald-800' : 'text-red-800'}`}>{result.valid ? 'Valid & Active Card' : 'Card is not active'}</p>
                    <p className="text-sm text-ink-body">{result.cardId}</p>
                  </div>
                  <div className="ml-auto"><StatusChip status={result.status} /></div>
                </div>
                <dl className="divide-y divide-lavender px-6 text-sm">
                  {[['Beneficiary', result.name], ['Registered mobile', result.mobile], ['Village / Ward', result.ward], ['Family members covered', result.familyMembers], ['Constituency', result.constituency], ['Valid until', formatDate(result.validUntil)]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-ink-muted">{k}</dt><dd className="font-semibold text-right">{v}</dd></div>
                  ))}
                </dl>
                <p className="px-6 py-4 bg-lavender-soft text-xs text-ink-muted">Details are partially hidden to protect the beneficiary&apos;s privacy. For disputes call {HELPLINE}.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
