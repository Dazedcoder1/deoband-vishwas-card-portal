import forms from '@tailwindcss/forms';

/** Design tokens ported from the Stitch "Sovereign Trust Portal" design system. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4B2A8A', dark: '#361B69', deep: '#3B1C78', light: '#673DBB', ink: '#25005E' },
        gold: { DEFAULT: '#C9982E', light: '#E5B44E', bright: '#E2B755', ink: '#8C6510' },
        header: '#3D1E75',
        footer: '#30165C',
        canvas: '#F7F6FB',
        lavender: { DEFAULT: '#EDE7F6', soft: '#F6F3FA', line: '#DDD6E8' },
        ink: { DEFAULT: '#1C1B22', body: '#47454E', muted: '#767380' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Hind"', 'system-ui', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
        deva: ['"Hind"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px -5px rgba(75, 42, 138, 0.08)',
        floating: '0 20px 40px -10px rgba(54, 27, 105, 0.25)',
        lift: '0 4px 16px -2px rgba(59, 28, 120, 0.06), 0 2px 6px -1px rgba(59, 28, 120, 0.04)',
        id: '0 12px 32px -4px rgba(59, 28, 120, 0.12), 0 4px 12px -2px rgba(201, 152, 46, 0.08)',
      },
      keyframes: {
        floatHero: { '0%,100%': { transform: 'translateY(0) rotate(-1.5deg)' }, '50%': { transform: 'translateY(-10px) rotate(0deg)' } },
        shimmer: { '0%': { transform: 'translateX(-150%) skewX(-20deg)' }, '50%,100%': { transform: 'translateX(250%) skewX(-20deg)' } },
        fadeInUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(201,152,46,.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(201,152,46,0)' } },
      },
      animation: {
        float: 'floatHero 6s ease-in-out infinite',
        shimmer: 'shimmer 5s ease-in-out infinite',
        fadeIn: 'fadeInUp .8s cubic-bezier(.16,1,.3,1) both',
        glow: 'pulseGlow 2.5s infinite',
      },
    },
  },
  plugins: [forms],
};
