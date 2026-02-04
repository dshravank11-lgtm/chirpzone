// scripts/migrate-chirpscore.ts
import { db } from '@/services/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export const migrateChirpScores = async () => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const updates = usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      
      // Only update if chirpScore doesn't exist
      if (userData.chirpScore === undefined) {
        await updateDoc(doc(db, 'users', userDoc.id), {
          chirpScore: 0,
          dailyPostCount: userData.dailyPostCount || 0,
          lastPostDate: userData.lastPostDate || '',
          dailyStats: userData.dailyStats || {},
        });
        console.log(`Updated user: ${userDoc.id}`);
      }
    });
    
    await Promise.all(updates);
    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration error:', error);
  }
};

// Run the migration
migrateChirpScores();