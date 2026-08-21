import type {Metadata} from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from '@/lib/auth-context';
import { LibraryProvider } from '@/lib/library-context';
import { BlockedFiltersProvider } from '@/lib/blocked-filters-context';
import BlockedFiltersModal from '@/components/filters/BlockedFiltersModal';
import VerificationBanner from '@/components/auth/VerificationBanner';
import { NavigationProvider } from '@/components/layout/NavigationProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  title: 'Aonime Stream',
  description: 'Anime Streaming Website',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased')}>
        <AuthProvider>
          <LibraryProvider>
            <BlockedFiltersProvider>
              <NavigationProvider>
                <TooltipProvider>
                  <div className="relative flex min-h-screen flex-col bg-background">
                    <Header />
                    <VerificationBanner />
                    <main className="flex-1">{children}</main>
                    <Footer />
                  </div>
                  <BlockedFiltersModal />
                  <Toaster />
                  <SpeedInsights />
                </TooltipProvider>
              </NavigationProvider>
            </BlockedFiltersProvider>
          </LibraryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
