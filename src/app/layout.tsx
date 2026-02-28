import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import { ReactNode } from 'react';
import Script from 'next/script';   // ✅ ADD THIS
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'Chirp',
  description: 'Connect, Share, and Chirp!',
};

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>

      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3645158319821683"
     crossorigin="anonymous"></script>
        <meta name="google-adsense-account" content="ca-pub-3645158319821683">
      </head>

      <body className={cn('min-h-screen bg-background font-sans antialiased', ptSans.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
