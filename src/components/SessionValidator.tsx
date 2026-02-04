'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function SessionValidator() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Check session validity on app startup
    const checkSessionOnStartup = async () => {
      try {
        const response = await fetch('/api/check-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid }),
        });
        
        const data = await response.json();
        
        if (data.requiresReauth) {
          // Redirect to login with session_revoked reason
          window.location.href = `/login?reason=session_revoked&redirect=${encodeURIComponent(window.location.pathname)}`;
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
    };

    checkSessionOnStartup();
  }, [user]);

  return null;
}