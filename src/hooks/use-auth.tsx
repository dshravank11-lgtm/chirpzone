'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  getAuth, 
  onAuthStateChanged, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateUserPresence } from '@/services/firebase';
import { usePresence } from './usePresence';

interface AuthContextType {
  user: any | null;
  isOnline: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  isOnline: false, 
  loading: true, 
  signOut: async () => {} 
});

const publicPaths = ['/login', '/signup', '/privacy-policy', '/terms-of-service'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const isOnline = usePresence(user?.uid);

  const signOut = async () => {
    const auth = getAuth();
    await firebaseSignOut(auth);
    setUser(null);
    window.location.href = '/login';
  }

  // Function to check if session is still valid
  const checkSessionValidity = async (currentUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      
      if (userData?.tokensValidAfterTime) {
        const idTokenResult = await currentUser.getIdTokenResult();
        const tokenAuthTime = parseInt(idTokenResult.claims.auth_time as string, 10);
        
        if (tokenAuthTime < userData.tokensValidAfterTime) {
          // Session was revoked, sign out
          console.log('Session invalidated. Signing out.');
          await signOut();
          window.location.href = '/login?reason=session_revoked';
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return true; // Don't log out on error
    }
  };

  useEffect(() => {
    const auth = getAuth();
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser: FirebaseUser | null) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }

      if (authUser) {
        try {
          // Check if session is valid on login/state change
          const isValid = await checkSessionValidity(authUser);
          if (!isValid) return;

          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          const userData = userDoc.data();

          const userDocRef = doc(db, 'users', authUser.uid);
          unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              setUser({ ...authUser, ...doc.data() });
            } else {
              setUser(authUser);
            }
            setLoading(false);
          }, (error) => {
            console.error("Error listening to user profile:", error);
            setUser(authUser);
            setLoading(false);
          });

          updateUserPresence(authUser.uid);

        } catch (error) {
          console.error('Auth state change error:', error);
          await signOut();
          setUser(null);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
        if (!publicPaths.includes(window.location.pathname)) {
          window.location.href = '/login';
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  // Periodically check session validity (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const checkTokenInterval = setInterval(async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        await checkSessionValidity(currentUser);
      } catch (error) {
        console.error('Periodic token check error:', error);
      }
    }, 30 * 1000);

    return () => clearInterval(checkTokenInterval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isOnline, loading, signOut }}>
      {!loading && children} 
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);