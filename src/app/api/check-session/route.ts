import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin if needed
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { requiresReauth: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    // Check if user has session revocation data
    if (admin.apps.length > 0) {
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        if (userData?.tokensValidAfterTime) {
          // Get current user from Firebase Admin
          const userRecord = await admin.auth().getUser(userId);
          
          if (userRecord.tokensValidAfterTime) {
            const revocationTime = Math.floor(
              new Date(userRecord.tokensValidAfterTime).getTime() / 1000
            );
            
            if (userData.tokensValidAfterTime <= revocationTime) {
              return NextResponse.json({ requiresReauth: true });
            }
          }
        }
      }
    }

    return NextResponse.json({ requiresReauth: false });
    
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { requiresReauth: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}