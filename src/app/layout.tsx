import type { Metadata } from 'next';
import { Baloo_2, Mulish, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const baloo2 = Baloo_2({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const mulish = Mulish({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'FAQ Widget — AI-powered embeddable FAQ assistant | Tai Huynh',
    template: '%s | FAQ Widget · Tai Huynh',
  },
  description:
    'Drop a <script> tag on any website and instantly get an AI FAQ assistant grounded in your knowledge base. Built with Gemini 2.5 Flash.',
  openGraph: {
    siteName: 'Tai Huynh — FAQ Widget',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${baloo2.variable} ${mulish.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body bg-cream text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
