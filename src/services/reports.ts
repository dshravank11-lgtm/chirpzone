import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

interface ReportData {
  reason: string;
  reportedBy: string;
  postId: string;
}

export const submitReport = async (data: ReportData) => {
  try {
    await addDoc(collection(db, 'reports'), {
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    throw new Error('Failed to submit report');
  }
};
