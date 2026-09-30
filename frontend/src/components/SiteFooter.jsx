import { Link } from 'react-router-dom';
import { LogoMark } from './Brand.jsx';
import { Icon } from './ui.jsx';
import { HELPLINE, SUPPORT_EMAIL } from '../lib/api.js';

export default function SiteFooter() {
  return (
    <footer id="contact" className="bg-footer text-white pt-14 pb-8">
      <div className="container-x">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-purple-800/60">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-gold/60">
                <LogoMark className="w-7 h-7" bg="#30165C" />
              </span>
              <span className="leading-tight">
                <span className="block text-[10px] uppercase tracking-widest text-slate-300 font-bold">Deoband</span>
                <span className="block text-lg font-extrabold">VISHWAS CARD</span>
              </span>
            </div>
            <p className="text-sm text-purple-200/80 leading-relaxed lg:pr-6">
              A citizen-first initiative dedicated to providing medical assistance, emergency patient relief, and social welfare security to every resident in Deoband.
            </p>
            <p className="font-deva text-xl text-gold-light">“साथ मिलकर, एक बेहतर देवबंद”</p>
          </div>
          <FooterCol title="Quick Links" links={[['Home', '/'], ['About the Initiative', '/#about'], ['Key Healthcare Benefits', '/#services'], ['Apply for Vishwas Card', '/apply'], ['Verify a Card', '/verify']]} />
          <FooterCol title="Welfare Wings" links={[['24/7 Ambulance Fleet', '/#services'], ['Jan Aushadhi Assistance', '/#services'], ['Senior Citizen Helpline', '/#contact'], ['Weekly Rural Camps', '/#services'], ['Citizen Login', '/login']]} />
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-gold mb-4">Helpline &amp; Support</h4>
            <ul className="space-y-3 text-sm text-purple-200/80">
              <li className="flex items-start gap-2">
                <Icon name="call" className="text-gold text-lg mt-0.5" />
                <span><span className="block font-bold text-white">Toll-Free 24×7</span>{HELPLINE}</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="mail" className="text-gold text-lg mt-0.5" />
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white">{SUPPORT_EMAIL}</a>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="location_on" className="text-gold text-lg mt-0.5" />
                <span>Civic Welfare Desk, GT Road, Deoband, Saharanpur, UP – 247554</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-purple-300/70 gap-3">
          <p>© {new Date().getFullYear()} Deoband Vishwas Card Initiative. All Rights Reserved.</p>
          <div className="flex gap-6">
            <a className="hover:text-white" href="#">Privacy Policy</a>
            <a className="hover:text-white" href="#">Terms of Service</a>
            <a className="hover:text-white" href="#">Citizen Charter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="text-sm font-bold uppercase tracking-wider text-gold mb-4">{title}</h4>
      <ul className="space-y-2.5 text-sm text-purple-200/80">
        {links.map(([label, to]) => (
          <li key={label}>
            {to.includes('#') ? (
              <a href={to} className="hover:text-white hover:translate-x-1 inline-block transition">{label}</a>
            ) : (
              <Link to={to} className="hover:text-white hover:translate-x-1 inline-block transition">{label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
