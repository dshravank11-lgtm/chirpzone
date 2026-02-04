// /lib/firebase.ts - UPDATED
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyA5RRQd0mcUec234MrSVjrff-t_p3QjQko",
  authDomain: "chirpzone-oq44f.firebaseapp.com",
  databaseURL: "https://chirpzone-oq44f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chirpzone-oq44f",
  storageBucket: "chirpzone-oq44f.firebasestorage.app",
  messagingSenderId: "439771262630",
  appId: "1:439771262630:web:cf9e578e42ca13910ace67"
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const realtimeDb: Database = getDatabase(app, "https://chirpzone-oq44f-default-rtdb.asia-southeast1.firebasedatabase.app");
// Use us-central1 to match your function deployment
const functions: Functions = getFunctions(app, 'us-central1'); // CHANGED THIS
const googleProvider = new GoogleAuthProvider();

// Optional: Connect to emulator in development
if (process.env.NODE_ENV === 'development') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { 
  app, 
  auth, 
  db, 
  storage, 
  googleProvider, 
  onAuthStateChanged, 
  realtimeDb, 
  functions,
  connectFunctionsEmulator // Export if needed elsewhere
};