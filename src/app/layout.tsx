import type { Metadata } from 'next';
import 'goey-toast/styles.css';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { GooeyToastProvider } from '@/components/ui/GooeyToastProvider';
import { AgentationToolbar } from '@/components/dev/AgentationToolbar';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: {
    default: 'ZamZam Properties CRM',
    template: '%s | ZamZam CRM',
  },
  description: 'Real estate CRM for lead attribution, property records, calculated all-in costs, requirements matching, private client portals, site visits, and deal tracking.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
