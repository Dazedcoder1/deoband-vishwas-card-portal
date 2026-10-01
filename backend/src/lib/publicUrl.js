// The address put inside QR codes and SMS links. It has to work on a phone, so "localhost" is no good.
//   1. PUBLIC_APP_URL from .env (production: https://your-domain)
//   2. otherwise, in development: this computer's Wi-Fi / LAN address + the frontend port,
//      e.g. http://192.168.1.7:5173 — any phone on the same Wi-Fi can open it.
//   3. last resort: the first CLIENT_URL.
import os from 'node:os';
import { config } from '../config.js';

function lanAddress() {
  const candidates = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (/^169\.254\./.test(a.address)) continue; // link-local, not usable
      // Skip virtual adapters (VirtualBox, VMware, WSL, Docker, Hyper-V) when possible.
      const virtual = /vbox|virtual|vmware|vethernet|wsl|docker|hyper-v|loopback|tailscale|zerotier/i.test(name);
      const privateLan = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address);
      candidates.push({ address: a.address, score: (privateLan ? 2 : 0) + (virtual ? 0 : 1) + (/^192\.168\./.test(a.address) ? 1 : 0) });
    }
  }
  candidates.sort((x, y) => y.score - x.score);
  return candidates[0]?.address || null;
}

function resolve() {
  if (config.publicAppUrl) return { url: config.publicAppUrl, source: 'PUBLIC_APP_URL in .env' };
  const first = config.clientOrigins[0] || 'http://localhost:5173';
  let parsed;
  try { parsed = new URL(first); } catch { return { url: first, source: 'CLIENT_URL' }; }
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  if (local && !config.isProd) {
    const ip = lanAddress();
    if (ip) {
      parsed.hostname = ip;
      return { url: parsed.origin, source: 'this PC\'s Wi-Fi address — phones on the same Wi-Fi can scan; set PUBLIC_APP_URL when you deploy' };
    }
  }
  return { url: parsed.origin, source: local ? 'CLIENT_URL — localhost only works on this PC; set PUBLIC_APP_URL' : 'CLIENT_URL' };
}

const resolved = resolve();
export const publicAppUrl = resolved.url;
export const publicUrlSource = resolved.source;
