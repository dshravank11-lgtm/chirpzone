import { db } from '@/lib/firebase';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    query, 
    updateDoc, 
    getCountFromServer, 
    DocumentData, 
    arrayUnion, 
    arrayRemove, 
    increment, 
    setDoc, 
    deleteDoc, 
    serverTimestamp,
    runTransaction,
    onSnapshot,
    where
} from 'firebase/firestore';

export const getCommunityByName = async (name: string): Promise<DocumentData | null> => {
    const communityRef = doc(db, 'communities', name);
    const docSnap = await getDoc(communityRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        return null;
    }
};

export const getAllCommunities = async (): Promise<DocumentData[]> => {
    const communitiesCollection = collection(db, 'communities');
    const querySnapshot = await getDocs(communitiesCollection);
    const communities = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const communityData = doc.data();
        const postsCollection = collection(db, 'communities', doc.id, 'posts');
        const postsSnapshot = await getCountFromServer(postsCollection);
        return {
            id: doc.id,
            ...communityData,
            postCount: postsSnapshot.data().count,
            memberCount: communityData.memberCount || 0,
            members: communityData.members || []
        };
    }));
    return communities;
};

export const createCommunity = async (name: string, description: string, icon: string, creatorId: string) => {
    const communityDocRef = doc(db, 'communities', name);
    const userRef = doc(db, 'users', creatorId);
    const communitiesRef = collection(db, 'communities');

    return await runTransaction(db, async (transaction) => {
        // 1. Check if user already owns a community
        const ownerQuery = query(communitiesRef, where('creatorId', '==', creatorId));
        const ownerSnap = await getDocs(ownerQuery);
        if (!ownerSnap.empty) {
            throw new Error("You can only create and own one community.");
        }

        // 2. Check if community name exists
        const communityDoc = await transaction.get(communityDocRef);
        if (communityDoc.exists()) {
            throw new Error("A community with this name already exists.");
        }

        // 3. Check user's ChirpScore
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found.");
        
        const userData = userDoc.data();
        const currentScore = userData.chirpScore || 0;

        if (currentScore < 200) {
            throw new Error(`Insufficient ChirpScore. You need 200 points (Current: ${currentScore}).`);
        }

        // 4. Prepare data
        const communityData = {
            name,
            description,
            icon,
            creatorId, // Store this to track ownership
            href: `/communities/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}`,
            createdAt: serverTimestamp(),
            memberCount: 1,
            postCount: 0,
            members: [creatorId]
        };

        // 5. Execute: Deduct points and Create community
        transaction.update(userRef, { 
            chirpScore: increment(-200) 
        });
        
        transaction.set(communityDocRef, communityData);

        const userCommunityRef = doc(db, 'users', creatorId, 'joinedCommunities', name);
        transaction.set(userCommunityRef, { 
            joinedAt: serverTimestamp(),
            communityName: name 
        });

        return { id: name, ...communityData };
    });
};

// FIXED: Use transaction for atomic updates
export const joinCommunity = async (userId: string, communityId: string) => {
    const communityDocRef = doc(db, 'communities', communityId);
    const userCommunityRef = doc(db, 'users', userId, 'joinedCommunities', communityId);

    await runTransaction(db, async (transaction) => {
        const communityDoc = await transaction.get(communityDocRef);
        
        if (!communityDoc.exists()) {
            throw new Error("Community does not exist!");
        }

        const communityData = communityDoc.data();
        const members = communityData.members || [];

        if (members.includes(userId)) {
            throw new Error("Already a member of this community");
        }

        transaction.update(communityDocRef, {
            members: arrayUnion(userId),
            memberCount: increment(1)
        });

        transaction.set(userCommunityRef, { 
            joinedAt: serverTimestamp(),
            communityName: communityData.name 
        });
    });
};

// FIXED: Use transaction for atomic updates
export const leaveCommunity = async (userId: string, communityId: string) => {
    const communityDocRef = doc(db, 'communities', communityId);
    const userCommunityRef = doc(db, 'users', userId, 'joinedCommunities', communityId);

    await runTransaction(db, async (transaction) => {
        const communityDoc = await transaction.get(communityDocRef);
        
        if (!communityDoc.exists()) {
            throw new Error("Community does not exist!");
        }

        const communityData = communityDoc.data();
        const members = communityData.members || [];

        if (!members.includes(userId)) {
            throw new Error("Not a member of this community");
        }

        transaction.update(communityDocRef, {
            members: arrayRemove(userId),
            memberCount: increment(-1)
        });

        transaction.delete(userCommunityRef);
    });
};

export const getJoinedCommunities = async (userId: string): Promise<string[]> => {
    try {
        const communitiesCollectionRef = collection(db, 'users', userId, 'joinedCommunities');
        const querySnapshot = await getDocs(communitiesCollectionRef);
        return querySnapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error("Error fetching joined communities:", error);
        return [];
    }
};

// Real-time listener for communities
export const subscribeToAllCommunities = (callback: (communities: any[]) => void) => {
    const communitiesRef = collection(db, 'communities');
    
    return onSnapshot(communitiesRef, async (snapshot) => {
        const communities = await Promise.all(snapshot.docs.map(async (doc) => {
            const communityData = doc.data();
            const postsCollection = collection(db, 'communities', doc.id, 'posts');
            try {
                const postsSnapshot = await getCountFromServer(postsCollection);
                return {
                    id: doc.id,
                    ...communityData,
                    postCount: postsSnapshot.data().count,
                    memberCount: communityData.memberCount || 0,
                    members: communityData.members || []
                };
            } catch {
                return {
                    id: doc.id,
                    ...communityData,
                    postCount: 0,
                    memberCount: communityData.memberCount || 0,
                    members: communityData.members || []
                };
            }
        }));
        callback(communities);
    }, (error) => {
        console.error("Error subscribing to communities:", error);
    });
};

// Real-time listener for user's joined communities
export const subscribeToJoinedCommunities = (userId: string, callback: (communityIds: string[]) => void) => {
    const joinedRef = collection(db, 'users', userId, 'joinedCommunities');
    
    return onSnapshot(joinedRef, (snapshot) => {
        const communityIds = snapshot.docs.map(doc => doc.id);
        callback(communityIds);
    }, (error) => {
        console.error("Error subscribing to joined communities:", error);
    });
};

// Subscribe to a single community
export const subscribeToCommunity = (communityId: string, callback: (community: DocumentData | null) => void) => {
    const communityRef = doc(db, 'communities', communityId);
    
    return onSnapshot(communityRef, (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() });
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error subscribing to community:", error);
    });
};
