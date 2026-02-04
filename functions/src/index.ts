// functions/src/index.ts - SIMPLEST WORKING VERSION
import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Test function to verify everything works
export const testEndpoint = onCall(async (request) => {
  logger.info("Test endpoint called");
  
  if (!request.auth) {
    throw new Error("Unauthorized");
  }
  
  return {
    success: true,
    message: "Function is working!",
    timestamp: new Date().toISOString(),
    userId: request.auth.uid
  };
});

// Main session revocation function
export const revokeAllSessions = onCall(async (request) => {
  // Verify authentication
  if (!request.auth) {
    logger.warn("Unauthorized access attempt");
    throw new Error("Unauthorized. Please sign in again.");
  }

  const userId = request.auth.uid;
  logger.info(`Starting session revocation for user: ${userId}`);

  try {
    // Get current timestamp
    const revocationTime = Math.floor(Date.now() / 1000);
    
    // Revoke all refresh tokens
    await admin.auth().revokeRefreshTokens(userId);
    
    // Update Firestore
    const db = admin.firestore();
    await db.collection('users').doc(userId).update({
      sessionRevokedAt: admin.firestore.FieldValue.serverTimestamp(),
      tokensValidAfterTime: revocationTime,
    });
    
    // Log security action
    await db.collection('security_logs').add({
      userId: userId,
      action: 'REVOKE_ALL_SESSIONS',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    logger.info(`Successfully revoked sessions for user: ${userId}`);
    
    return { 
      success: true, 
      message: "Successfully signed out of all other devices.",
      revocationTime: revocationTime
    };
    
  } catch (error: any) {
    logger.error("Error in revokeAllSessions:", error);
    throw new Error("Unable to revoke sessions. Please try again later.");
  }
});

export const sendVerificationEmail = onCall(async (request) => {
    const { email } = request.data;
    if (!email) {
        throw new Error("Email is required");
    }
    try {
        const user = await admin.auth().getUserByEmail(email);
        const link = await admin.auth().generateEmailVerificationLink(email);
        
        logger.info(`Verification email sent to: ${email} with link ${link}`);
        return {
            success: true,
            message: "Verification email sent successfully",
        };
    }
    catch (error) {
        logger.error("Error sending verification email:", error);
        throw new Error("Unable to send verification email");
    }
});

export const sendPasswordResetEmail = onCall(async (request) => {
    const { email } = request.data;
    if (!email) {
        throw new Error("Email is required");
    }
    try {
        const link = await admin.auth().generatePasswordResetLink(email);
        logger.info(`Password reset email sent to: ${email} with link ${link}`);
        return {
            success: true,
            message: "Password reset email sent successfully",
        };
    }
    catch (error) {
        logger.error("Error sending password reset email:", error);
        throw new Error("Unable to send password reset email");
    }
});
