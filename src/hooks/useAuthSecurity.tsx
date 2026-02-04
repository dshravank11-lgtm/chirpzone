import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

export const useAuthSecurity = () => {
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
          const idTokenResult = await user.getIdTokenResult();
          
          // Check if token was issued before revocation
          const tokenAuthTime = parseInt(idTokenResult.claims.auth_time, 10);
          
          if (tokenAuthTime < userData.tokensValidAfterTime) {
            // Token is invalid, sign out
            console.warn('Session invalidated by security action. Signing out.');
            await auth.signOut();
            window.location.href = '/auth/signin?reason=session_revoked';
          }
        }
      } catch (error) {
        console.error('Error checking token validity:', error);
      }
    };

    // Check token validity periodically (every 5 minutes)
    const intervalId = setInterval(checkTokenValidity, 5 * 60 * 1000);
    
    // Also check on initial load
    checkTokenValidity();

    return () => clearInterval(intervalId);
  }, [user]);

  return null;
};