
import { useState, useEffect } from 'react';
import { onValue, ref } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';

export const usePresence = (userId: string) => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const userStatusRef = ref(realtimeDb, `/status/${userId}`);
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const status = snapshot.val();
      setIsOnline(status?.isOnline || false);
    });

    return () => unsubscribe();
  }, [userId]);

  return isOnline;
};

export const useGroupPresence = (userIds: string[]) => {
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    useEffect(() => {
        if (!userIds || userIds.length === 0) return;

        const unsubs = userIds.map(userId => {
            const userStatusRef = ref(realtimeDb, `/status/${userId}`);
            return onValue(userStatusRef, (snapshot) => {
                const status = snapshot.val();
                setOnlineUsers(prev => {
                    const isOnline = status?.isOnline || false;
                    const userExists = prev.includes(userId);

                    if (isOnline && !userExists) {
                        return [...prev, userId];
                    } else if (!isOnline && userExists) {
                        return prev.filter(id => id !== userId);
                    } else {
                        return prev;
                    }
                });
            });
        });

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [userIds]);

    return onlineUsers;
};
