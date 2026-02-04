'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { censorText } from '@/lib/censor';
import { useToast } from '@/components/ui/use-toast';

export function CreateComment({ postId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !comment.trim()) return;

    setIsSubmitting(true);
    const { censored, wasCensored } = censorText(comment);

    try {
      let isShadowBanned = false;

      // Warning logic for comments
      if (wasCensored) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { warningCount: increment(1) });
        const userSnap = await getDoc(userRef);
        if ((userSnap.data()?.warningCount || 0) >= 3) {
          isShadowBanned = true;
        }
        
        toast({
          variant: "destructive",
          title: "Warning",
          description: isShadowBanned ? "Comment hidden pending review." : "Keep it clean! Word filtered.",
        });
      }

      await addDoc(collection(db, 'posts', postId, 'comments'), {
        author: {
          uid: user.uid,
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl,
        },
        content: censored,
        createdAt: serverTimestamp(),
        isHidden: isShadowBanned // This flag hides it from other users
      });

      setComment('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="grid w-full gap-2">
        <Textarea
          placeholder="Write a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Posting..." : "Post Comment"}
        </Button>
      </div>
    </form>
  );
}