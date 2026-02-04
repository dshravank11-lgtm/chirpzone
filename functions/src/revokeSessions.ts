import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const revokeAllSessions = functions
  .region('asia-southeast1')
  .https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    const userId = context.auth.uid;

    try {
      // Revoke all refresh tokens
      await admin.auth().revokeRefreshTokens(userId);
      
      // Get the revocation time
      const userRecord = await admin.auth().getUser(userId);
      const revocationTime = userRecord.tokensValidAfterTime
        ? Math.floor(new Date(userRecord.tokensValidAfterTime).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      // Update Firestore
      const db = admin.firestore();
      await db.collection('users').doc(userId).update({
        sessionRevokedAt: admin.firestore.FieldValue.serverTimestamp(),
        tokensValidAfterTime: revocationTime,
        lastSessionRevocation: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'All other sessions have been revoked.',
        revocationTime: revocationTime
      };
    } catch (error) {
      console.error('Error revoking sessions:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Unable to revoke sessions. Please try again.'
      );
    }
  });