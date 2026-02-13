'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, User, HeartHandshake, Settings, MessageCircle, TrendingUp, Users, ShoppingBag, Users2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

// Navigation items configuration
const navItems = [
  { href: '/', label: 'Home', icon: Home, color: 'text-blue-500' },
  { href: '/profile', label: 'Profile', icon: User, color: 'text-green-500' },
  { href: '/shop', label: 'Shop', icon: ShoppingBag, color: 'text-red-500' },
  { href: '/friends', label: 'Friends', icon: HeartHandshake, isNotification: true, color: 'text-pink-500' },
  { href: '/chat', label: 'Messages', icon: MessageCircle, isNotification: true, color: 'text-purple-500' },
  { href: '/trending', label: 'Trending', icon: TrendingUp, color: 'text-yellow-500' },
  { href: '/communities', label: 'Communities', icon: Users2, color: 'text-indigo-500' },
  { href: '/settings', label: 'Settings', icon: Settings, color: 'text-gray-500' },
];

interface MainNavProps {
  notifications: number;
  friendRequests: number;
  messages: number;
}

export function MainNav({ notifications, friendRequests, messages }: MainNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="h-full flex flex-col w-full bg-card border-r shadow-lg">
      {/* Branding section */}
      <div className="p-8 border-b">
        <Link href='/'>
        <h1 className="text-4xl font-bold text-[#ff990a] font-sans">Chirp.</h1>
        <p className="text-lg text-muted-foreground mt-2">Connect, share, chirp!</p>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-6">
        {navItems.map(({ href, label, icon: Icon, isNotification, color }) => {
          const newHref = label === 'Profile' ? `/profile/${user?.uid}` : href;
          const isActive = pathname === newHref || (href !== '/' && pathname.startsWith(href));

          let hasNotification = false;
          if (href === '/friends') hasNotification = friendRequests > 0;
          if (href === '/chat') hasNotification = messages > 0;

          return (
            <Link href={newHref} key={label}>
              <div className={cn(
                "flex items-center px-8 py-4 mx-4 mb-3 text-lg rounded-2xl font-medium transition-all duration-200",
                isActive
                  ? "bg-[#ff990a] text-white font-semibold shadow-lg transform scale-[1.02]"
                  : "hover:bg-muted/50 text-foreground hover:shadow-md",
                "hover:text-black dark:hover:text-white",
              )}>
                <Icon className={cn("h-7 w-7 mr-4", color)} />
                <span className="flex-1 font-medium">{label}</span>
                {isNotification && hasNotification && (
                  <span className="ml-auto bg-red-500 text-white text-sm font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {href === '/friends' ? friendRequests : messages}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}