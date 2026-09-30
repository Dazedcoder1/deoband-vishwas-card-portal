import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import VishwasCard from '../components/VishwasCard.jsx';
import { Icon } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { KEY_SERVICES, WHY_CHOOSE, STEPS } from '../lib/content.js';

export default function Home() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get('/public/stats').then(setStats).catch(() => {});
  }, []);
  // Live count from the database; shown once enrolment passes 100 so early numbers don't look odd.
  const enrolled = stats?.enrolled >= 100 ? `${stats.enrolled.toLocaleString('en-IN')} Enrolled` : 'Enrolment Open';

  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden pt-10 pb-16 lg:pt-14 lg:pb-24 bg-gradient-to-br from-[#EDE8F7] via-canvas to-white">
          <div className="absolute inset-y-0 right-0 w-full lg:w-1/2 pointer-events-none bg-gradient-to-l from-lavender/80 to-transparent" />
          <div className="container-x relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 animate-glow animate-fadeIn">
                <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
                <span className="text-xs uppercase tracking-widest font-bold text-primary">Health • Education • Support • Community</span>
              </div>
              <div className="animate-fadeIn [animation-delay:150ms]">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-primary leading-none">Deoband</h1>
                <p className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gold leading-tight">Vishwas Card</p>
              </div>
              <div className="space-y-3 animate-fadeIn [animation-delay:250ms]">
                <p className="text-xl sm:text-2xl font-bold text-slate-800">
                  Your Health. Our Priority.<br className="hidden sm:inline" /> Support for a Better Tomorrow.
                </p>
                <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                  The Deoband Vishwas Card provides access to essential healthcare services, community support and welfare benefits for the people of Deoband.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-2 animate-fadeIn [animation-delay:350ms]">
                <Link to="/apply" className="btn-primary group px-7 py-3.5 hover:scale-105">
                  Get Your Card <Icon name="arrow_forward" className="text-lg group-hover:translate-x-1.5 transition-transform" />
                </Link>
                <a href="#about" className="btn-outline group py-3.5 hover:scale-105">
                  Learn More <Icon name="play_arrow" className="text-gold group-hover:scale-125 transition-transform" />
                </a>
              </div>
              <div className="pt-4 flex flex-wrap items-center gap-6 text-sm text-slate-600 animate-fadeIn [animation-delay:450ms]">
                <span className="flex items-center gap-2"><Icon name="verified" className="text-gold text-xl" /><b className="font-medium">{enrolled}</b></span>
                <span className="flex items-center gap-2"><Icon name="local_hospital" className="text-gold text-xl" /><b className="font-medium">{stats?.networkCenters || 18}+ Network Centers</b></span>
              </div>
            </div>
            <div className="lg:col-span-6 flex justify-center lg:justify-end animate-fadeIn [animation-delay:300ms]">
              <div className="relative w-full max-w-[560px] animate-float group">
                <div className="absolute -inset-2 bg-gradient-to-r from-gold via-purple-600 to-primary rounded-3xl blur-xl opacity-40 group-hover:opacity-70 transition-all duration-500" />
                <div className="relative bg-white rounded-2xl shadow-floating border-2 border-gold/60 overflow-hidden shimmer transition-transform duration-500 group-hover:scale-[1.015]">
                  <VishwasCard placeholder className="rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key services */}
        <section id="services" className="container-x -mt-6 sm:-mt-10 relative z-20 scroll-mt-24">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-purple-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 mb-6 gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Key Services &amp; Benefits</h2>
                <p className="text-sm text-slate-500 mt-0.5">Comprehensive support for a healthier and stronger community.</p>
              </div>
              <Link to="/login" className="group inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-gold transition-colors">
                View All Services <Icon name="arrow_forward" className="text-base group-hover:translate-x-1.5 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
              {KEY_SERVICES.map((s) => (
                <div key={s.title} className="group flex flex-col items-center p-3 rounded-2xl hover:bg-purple-50/50 hover:-translate-y-2 hover:shadow-lg transition-all duration-300">
                  <div className="w-16 h-16 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white group-hover:border-gold/50 group-hover:shadow-[0_0_20px_rgba(75,42,138,0.35)] transition-all duration-300 shadow-sm">
                    <Icon name={s.icon} className="text-2xl group-hover:rotate-6 transition-transform" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-800 leading-snug group-hover:text-primary">{s.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 hidden sm:block">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why choose */}
        <section id="about" className="py-16 lg:py-24 container-x scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Why Choose Deoband Vishwas Card?</h2>
                <p className="text-sm text-slate-500 mt-2">Designed to guarantee immediate healthcare accessibility and financial security for families across Deoband.</p>
              </div>
              <div className="space-y-4">
                {WHY_CHOOSE.map((w) => (
                  <div key={w.title} className="flex items-start gap-3.5 p-2 rounded-xl hover:translate-x-1.5 hover:bg-purple-50/60 transition-all">
                    <span className="w-10 h-10 shrink-0 rounded-full bg-purple-100 flex items-center justify-center text-primary shadow-sm"><Icon name={w.icon} className="text-xl" /></span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{w.title}</h3>
                      <p className="text-sm text-slate-600">{w.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3 flex flex-col items-center text-center gap-4">
              <div>
                <p className="font-hand text-3xl sm:text-4xl text-primary font-bold -rotate-3 hover:rotate-0 transition-transform">Together for a<br />Healthier Deoband</p>
                <div className="w-16 h-1 bg-gold mx-auto mt-1 rounded-full" />
              </div>
              <div className="w-full max-w-[240px] bg-[#EDE9F6] border border-purple-200 rounded-xl p-5 shadow-sm hover:scale-105 hover:border-gold/60 transition-all font-deva">
                <p className="text-lg font-bold text-primary">स्वस्थ देवबंद</p>
                <p className="text-base font-semibold text-slate-700 mt-1">सुरक्षित परिवार</p>
                <p className="text-base font-bold text-gold mt-1">मजबूत भविष्य</p>
                <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-purple-200">
                  <span className="w-4 h-0.5 bg-gold/70" /><Icon name="diamond" className="text-gold text-xs" /><span className="w-4 h-0.5 bg-gold/70" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-4 flex justify-center">
              <OutreachTile />
            </div>
          </div>
        </section>

        {/* Steps */}
        <section id="benefits" className="py-12 bg-white border-y border-purple-100 scroll-mt-20">
          <div className="container-x">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">How To Get Your Vishwas Card</h2>
              <p className="text-sm text-slate-500 mt-2">3 simple steps to register yourself and your household members.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((s) => (
                <div key={s.n} className="group p-6 rounded-xl bg-canvas border border-purple-100 hover:border-gold/70 hover:shadow-xl hover:-translate-y-1.5 transition-all">
                  <span className="text-3xl font-black text-gold/40 group-hover:text-gold transition-colors">{s.n}</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-primary">{s.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/apply" className="btn-primary">Apply Online <Icon name="arrow_forward" /></Link>
              <Link to="/verify" className="btn-outline"><Icon name="qr_code_scanner" /> Verify a Card</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/** Photo tile. Drop a real photo at frontend/public/images/outreach.jpg to replace the illustration. */
function OutreachTile() {
  const [hasPhoto, setHasPhoto] = useState(true);
  return (
    <div className="relative w-full max-w-[360px] group">
      <div className="absolute -inset-2 bg-gradient-to-tr from-gold to-purple-600 rounded-3xl opacity-30 group-hover:opacity-60 blur-md transition-all duration-500" />
      <div className="relative rounded-2xl overflow-hidden border-2 border-gold shadow-xl h-80 bg-gradient-to-br from-primary-light via-primary to-primary-dark">
        {hasPhoto ? (
          <img src="/images/outreach.jpg" alt="Doctor examining an elderly patient at a village health camp" onError={() => setHasPhoto(false)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-4 opacity-90">
              {['stethoscope', 'elderly', 'favorite', 'medication', 'health_and_safety', 'family_restroom'].map((i) => (
                <span key={i} className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 grid place-items-center"><Icon name={i} className="text-3xl text-gold-light" /></span>
              ))}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <span className="text-xs uppercase font-bold tracking-wider text-gold-light">Free Village Outreach</span>
          <p className="text-sm font-semibold">Compassionate Medical Care for Seniors &amp; Families</p>
        </div>
      </div>
    </div>
  );
}
