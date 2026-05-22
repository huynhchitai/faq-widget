import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // Warm peach/cream surface
        // Use rgb(<channels> / <alpha-value>) so Tailwind v3 opacity modifiers work (e.g. bg-cream/90)
        cream: 'rgb(var(--cream-rgb) / <alpha-value>)',
        parchment: 'var(--parchment)',
        blush: 'var(--blush)',
        // Coral accent — DEFAULT uses alpha-value so focus:ring-coral/20 etc. work
        coral: {
          DEFAULT: 'rgb(var(--coral-rgb) / <alpha-value>)',
          deep: 'var(--coral-deep)',
          light: 'var(--coral-light)',
        },
        // Fresh grass accent
        grass: {
          DEFAULT: 'var(--grass)',
          light: 'var(--grass-light)',
        },
        // Ink tones
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          quiet: 'var(--ink-quiet)',
        },
        // Widget specific
        widget: {
          bg: 'var(--widget-bg)',
          border: 'var(--widget-border)',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        pill: '9999px',
      },
      boxShadow: {
        pillowy: '0 8px 32px -4px rgba(230,100,80,0.18), 0 2px 8px -2px rgba(230,100,80,0.10)',
        'pillowy-sm': '0 4px 16px -2px rgba(230,100,80,0.14), 0 1px 4px -1px rgba(230,100,80,0.08)',
        'pillowy-lg': '0 16px 48px -8px rgba(230,100,80,0.22), 0 4px 12px -4px rgba(230,100,80,0.12)',
        card: '0 2px 12px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 28px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-up': 'fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fadeIn 0.4s ease both',
        'bounce-soft': 'bounceSoft 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceSoft: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseDot: {
          '0%, 80%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
