
'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

export function AuthSecurityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkTokenValidity = async () => {
      try {
        // Get user's token revocation time from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData?.tokensValidAfterTime) {
          // Get current ID token
          const idTokenResult = await user.getIdTokenResult(true); // Force refresh
          
          // Check if token was issued before revocation
          const tokenAuthTime = parseInt(idTokenResult.claims.auth_time as string, 10);
          
          if (tokenAuthTime < userData.tokensValidAfterTime) {
            // Token is invalid, sign out
            console.warn('Session invalidated by security action. Signing out.');
            await auth.signOut();
            window.location.href = '/login?reason=session_revoked';
          }
        }
      } catch (error) {
        console.error('Error checking token validity:', error);
        // If there's an error getting token, force sign out for security
        if (error instanceof Error && (error.message.includes('auth/invalid-user-token') || error.message.includes('auth/user-token-expired'))) {
          await auth.signOut();
          window.location.href = '/login?reason=invalid_token';
        }
      }
    };

    // Check token validity periodically (every 2 minutes)
    const intervalId = setInterval(checkTokenValidity, 2 * 60 * 1000);
    
    // Also check on initial load
    checkTokenValidity();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        // User signed out, clear interval
        clearInterval(intervalId);
      }
    });

    return () => {
      clearInterval(intervalId);
      unsubscribe();
    };
  }, [user]);

  return <>{children}</>;
}
