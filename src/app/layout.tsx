import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono, Playfair_Display } from 'next/font/google';
import 'goey-toast/styles.css';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { GooeyToastProvider } from '@/components/ui/GooeyToastProvider';
import { AgentationToolbar } from '@/components/dev/AgentationToolbar';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: {
    default: 'ZamZam Properties CRM',
    template: '%s | ZamZam CRM',
  },
  description: 'Real estate CRM for lead attribution, property records, calculated all-in costs, requirements matching, private client portals, site visits, and deal tracking.',
  icons: {
    icon: [
      { url: '/images/zamzam-logo-dark.jpg' },
      { url: '/images/zamzam-logo-dark.jpg', sizes: '32x32', type: 'image/jpeg' },
      { url: '/images/zamzam-logo-dark.jpg', sizes: '16x16', type: 'image/jpeg' },
    ],
    shortcut: '/images/zamzam-logo-dark.jpg',
    apple: '/images/zamzam-logo-dark.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`light ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('zamzam-theme-mode');
                const isDark = stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                const themeClass = isDark ? 'dark' : 'light';
                document.documentElement.classList.remove('dark', 'light');
                document.documentElement.classList.add(themeClass);
                document.documentElement.setAttribute('data-theme', themeClass);
                document.documentElement.style.colorScheme = themeClass;
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased bg-canvas text-content font-body-md min-h-screen" suppressHydrationWarning>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <GooeyToastProvider />
          <AgentationToolbar />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
