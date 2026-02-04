'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import PageTransition from '@/components/page-transition';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';


interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [pathname]);


  if (loading) {
    // You can replace this with a proper skeleton loader
    return (
        <div className="flex h-screen items-center justify-center">
            <div>Loading...</div>
        </div>
    );
  }
  
  // Render children directly for routes that should not have the main layout
  const noLayoutRoutes = ['/login', '/signup', '/forgot-password'];
  if (!user || noLayoutRoutes.includes(pathname)) {
    return <PageTransition>{children}</PageTransition>;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 border-r bg-card">
          {/* By passing empty props, we assume MainNav can handle it or doesn't need them */}
          <MainNav notifications={0} friendRequests={0} messages={0} />
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
         {/* Header */}
        <header className="flex items-center justify-between md:justify-end border-b h-16 px-4 md:px-8 flex-shrink-0">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 -ml-2 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          {/* Placeholder for mobile logo or title if needed, or can be removed */}
          <div className="md:hidden text-lg font-bold">
            {/* You could put a small logo here if desired */}
          </div>

          <UserNav />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 pt-6">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-40 transform transition-transform duration-300 ease-in-out",
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="relative z-50 flex flex-col w-64 h-full bg-card border-r">
          <div className="p-2 absolute top-2 right-2">
            <button onClick={() => setIsMenuOpen(false)} aria-label="Close menu">
                <X className="h-6 w-6"/>
            </button>
          </div>
          {/* By passing empty props, we assume MainNav can handle it or doesn't need them */}
          <MainNav notifications={0} friendRequests={0} messages={0} />
        </div>
        <div
          className="fixed inset-0 bg-black/30"
          onClick={() => setIsMenuOpen(false)}
        ></div>
      </div>
    </div>
  );
}
