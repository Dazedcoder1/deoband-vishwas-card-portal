// Loads MSG91's OTP Widget with exposeMethods, so our own login form drives it
// (no MSG91 popup). Docs: https://docs.msg91.com/otp-widget
const SCRIPT_URL = 'https://verify.msg91.com/otp-provider.js';
export const CAPTCHA_ELEMENT_ID = 'msg91-captcha';

let loading = null;

export function loadMsg91Widget({ widgetId, tokenAuth }) {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const configuration = {
      widgetId,
      tokenAuth,
      exposeMethods: true,
      captchaRenderId: CAPTCHA_ELEMENT_ID, // only used if captcha is switched on in the MSG91 widget settings
      success: () => {}, // we listen on each method's own callbacks instead
      failure: () => {},
    };
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      try {
        window.initSendOTP(configuration);
      } catch (err) {
        loading = null;
        return reject(new Error('Could not start the OTP service. Please refresh the page.'));
      }
      // initSendOTP attaches window.sendOtp / retryOtp / verifyOtp; wait until they exist.
      const started = Date.now();
      const wait = () => {
        if (typeof window.sendOtp === 'function' && typeof window.verifyOtp === 'function') return resolve();
        if (Date.now() - started > 10_000) { loading = null; return reject(new Error('The OTP service did not start. Please refresh the page.')); }
        setTimeout(wait, 100);
      };
      wait();
    };
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('Could not load the OTP service. Check your internet connection and refresh.'));
    };
    document.body.appendChild(script);
  });
  return loading;
}

const errorText = (e, fallback) => (typeof e === 'string' ? e : e?.message || fallback);

/** True when captcha is switched on in the widget settings but not solved yet. */
export function captchaPending() {
  const el = document.getElementById(CAPTCHA_ELEMENT_ID);
  const rendered = el && el.childElementCount > 0;
  return Boolean(rendered && typeof window.isCaptchaVerified === 'function' && !window.isCaptchaVerified());
}

const reqIdOf = (data) => (typeof data === 'string' ? data : data?.message || data?.reqId || undefined);

/** Wraps the widget's callback API in promises (see MSG91 docs: sendOtp / retryOtp / verifyOtp). */
export const widget = {
  /** Resolves with the request ID MSG91 returns, used by retry() and verify(). */
  send: (identifier) => new Promise((resolve, reject) =>
    window.sendOtp(identifier, (data) => resolve(reqIdOf(data)), (e) => reject(new Error(errorText(e, 'Could not send the OTP.')))),
  ),
  // channel null = the widget's default configuration
  retry: (reqId) => new Promise((resolve, reject) =>
    window.retryOtp(null, (data) => resolve(data), (e) => reject(new Error(errorText(e, 'Could not resend the OTP.'))), reqId),
  ),
  /** Resolves with the MSG91 access token that our backend then confirms. */
  verify: (otp, reqId) => new Promise((resolve, reject) =>
    window.verifyOtp(otp, (data) => {
      const token = typeof data === 'string' ? data : data?.message || data?.token || data?.['access-token'];
      token ? resolve(token) : reject(new Error('OTP verified, but no confirmation token was returned. Please try again.'));
    }, (e) => reject(new Error(errorText(e, 'Incorrect OTP. Please check and try again.'))), reqId),
  ),
};
