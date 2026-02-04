import { getStorage } from 'firebase/storage';
import { 
    app, 
    auth, 
    db, 
    storage, 
    googleProvider, 
    onAuthStateChanged,
    realtimeDb
} from '@/lib/firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    signInWithPopup, 
    sendPasswordResetEmail,
} from 'firebase/auth';
import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    updateDoc, 
    serverTimestamp, 
    onSnapshot,
    arrayUnion,
    arrayRemove,
    limit,
    startAfter,
    orderBy,
    deleteDoc,
    writeBatch,
    increment,
    runTransaction
} from 'firebase/firestore';
import { ref, set, onDisconnect } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export { app, auth, db, storage, googleProvider, onAuthStateChanged };


export interface User {
    id: string;
    uid: string;
    firstName: string;
    lastName: string;
    name: string;
    username: string;
    email: string;
    bio: string;
    avatarUrl: string;
    joinedAt: any;
    friends: string[];
    friendRequests: string[];
    followers: string[];
    following: string[];
    streak: number;
    lastActivity: any;
    chirpScore: number;
    
    nameColor?: string;
    nameFont?: string;
    nameEffect?: 'none' | 'gradient' | 'moving-gradient';
    
    purchasedItems?: {
        fonts: string[];
        colors: string[];
        gradients: string[];
        movingGradients: string[];
    };
    equippedStyle?: {
        nameColor?: string;
        nameFont?: string;
        nameEffect?: 'none' | 'gradient' | 'moving-gradient';
    };
    
    likedPosts?: string[];
    likedComments?: string[];
    achievements?: any[];
    dailyPostCount?: number;
    lastPostDate?: string;
    dailyStats?: {
        [date: string]: {
            posts: number;
            comments: number;
        }
    };
}

// --- Auth Functions Modified ---
export const signUp = async (email, password, firstName, lastName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
  
    const username = email.split('@')[0];
    const fullName = `${firstName} ${lastName}`.trim();
    
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      username,
      firstName: firstName,
      lastName: lastName,
      name: fullName || username,
      displayName_lowercase: (fullName || username).toLowerCase(),
      email: user.email, 
      bio: 'Just a regular person exploring the digital world.',
      avatarUrl: `https://placehold.co/100x100.png`,
      joinedAt: serverTimestamp(),
      friends: [],
      friendRequests: [],
      followers: [],
      following: [],
      likedPosts: [],
      chirpScore: 0, // Initialize chirpScore to 0
      streak: 0,
      lastActivity: null,
      dailyPostCount: 0,
      lastPostDate: '',
      dailyStats: {},
    });
  
    return user;
  };

  export const signIn = signInWithEmailAndPassword;

  export const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        const username = user.email.split('@')[0];
        const displayName = user.displayName || username;
        
        const nameParts = displayName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        await setDoc(userDocRef, {
            uid: user.uid,
            username: username,
            firstName: firstName,
            lastName: lastName,
            name: displayName,
            displayName_lowercase: displayName.toLowerCase(),
            email: user.email,
            bio: 'Just a regular person exploring the digital world.',
            avatarUrl: user.photoURL || 'https://placehold.co/100x100.png',
            joinedAt: serverTimestamp(),
            friends: [],
            friendRequests: [],
            followers: [],
            following: [],
            likedPosts: [],
            chirpScore: 0, // Initialize chirpScore to 0
            streak: 0,
            lastActivity: null,
            dailyPostCount: 0,
            lastPostDate: '',
            dailyStats: {},
        });
    }
    return result;
}


export const logOut = async () => {
  return await signOut(auth);
};

export const forgotPassword = async (email) => {
    return await sendPasswordResetEmail(auth, email);
};

// --- User Functions -- -

export const searchUsers = async (searchTerm, currentUserId) => {
    if (!searchTerm.trim()) return [];
    const usersRef = collection(db, 'users');
    const q = query(
        usersRef,
        where('displayName_lowercase', '>=', searchTerm.toLowerCase()),
        where('displayName_lowercase', '<=', searchTerm.toLowerCase() + '\uf8ff')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== currentUserId);
};

export const getAllUsers = async () => {
    try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        const users = querySnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        }));
        
        return users;
    } catch (error) {
        console.error("Error fetching all users:", error);
        throw error;
    }
};

export const getUserProfile = async (userId) => {
  if (!userId) return null;
  const userDoc = await getDoc(doc(db, 'users', userId));
  return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
};

export const updateUserProfile = async (userId, data) => {
    const userRef = doc(db, 'users', userId);
    const batch = writeBatch(db);

    // 1. Update the primary User document
    const updatedData = { ...data };
    if (data.name) {
        updatedData.displayName_lowercase = data.name.toLowerCase();
    }
    batch.update(userRef, updatedData);

    // 2. Prepare the update object for the "author" map inside posts/comments
    const authorUpdate = {};
    if (data.name) {
        authorUpdate['author.name'] = data.name;
    }
    if (data.avatarUrl) {
        authorUpdate['author.avatarUrl'] = data.avatarUrl;
    }

    // 3. Only run sub-queries if name or avatar actually changed
    if (Object.keys(authorUpdate).length > 0) {
        // Find and update all Posts by this user
        const postsQuery = query(collection(db, 'posts'), where("authorId", "==", userId));
        const postsSnapshot = await getDocs(postsQuery);
        postsSnapshot.forEach(doc => {
            batch.update(doc.ref, authorUpdate);
        });

        // Find and update all Comments by this user
        const commentsQuery = query(collection(db, 'comments'), where("authorId", "==", userId));
        const commentsSnapshot = await getDocs(commentsQuery);
        commentsSnapshot.forEach(doc => {
            batch.update(doc.ref, authorUpdate);
        });
    }

    // 4. Execute everything as one single network request
    await batch.commit();
};

export const uploadProfilePicture = async (userId, file) => {
    const filePath = `profile-pictures/${userId}/${file.name}`;
    const fileRef = storageRef(storage, filePath);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
};

export const findUsersByEmail = async (email) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where("email", "==", email));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const findUsersByUsername = async (username) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("username", ">=", username), where("username", "<=", username + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- Streak Functions -- -
export const updateStreak = async (userId) => {
    const userRef = doc(db, 'users', userId);
    return await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            return { streak: 0, streakUpdated: false };
        }

        const userData = userDoc.data();
        const currentChirpScore = userData.chirpScore || 0;
        const now = new Date();
        const lastActivity = userData.lastActivity ? userData.lastActivity.toDate() : null;
        let newStreak = userData.streak || 0;
        let streakUpdated = false;
        let scoreIncrement = 0;

        if (lastActivity) {
            const diff = now.getTime() - lastActivity.getTime();
            const hours = diff / (1000 * 60 * 60);

            if (hours > 48) {
                newStreak = 1; 
                scoreIncrement = 20;
                streakUpdated = true;
            } else if (now.getDate() !== lastActivity.getDate()) {
                newStreak++;
                scoreIncrement = 20;
                streakUpdated = true;
            }
        } else {
            newStreak = 1;
            scoreIncrement = 20;
            streakUpdated = true;
        }

        // Update the document
        transaction.update(userRef, {
            streak: newStreak,
            chirpScore: currentChirpScore + scoreIncrement,
            lastActivity: serverTimestamp(),
        });

        return { streak: newStreak, streakUpdated };
    });
};

// --- Notifications Functions -- -

export const getUserNotifications = (userId, callback) => {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, orderBy('time', 'desc'));

    return onSnapshot(q, (querySnapshot) => {
        const notifications = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            time: doc.data().time?.toDate() || new Date(),
        }));
        callback(notifications);
    });
};


// --- Chat Functions -- -

const getChatRoomId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const getChatRoom = async (chatId) => {
    if (!chatId) return null;
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) return null;

    const chatData = chatDoc.data();
    if (chatData.isGroup) {
        const memberPromises = chatData.members.map(memberId => getUserProfile(memberId));
        const memberProfiles = await Promise.all(memberPromises);
        chatData.memberProfiles = memberProfiles.filter(p => p);
    }

    return { id: chatDoc.id, ...chatData };
}

export const getUserChats = (userId, callback) => {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('members', 'array-contains', userId));

    return onSnapshot(q, async (querySnapshot) => {
        const chatPromises = querySnapshot.docs.map(async (chatDoc) => {
            const chatData = chatDoc.data();
            if (chatData.isGroup) {
                const memberPromises = chatData.members.map(memberId => getUserProfile(memberId));
                const memberProfiles = await Promise.all(memberPromises);
                return {
                    id: chatDoc.id,
                    ...chatData,
                    friend: { name: chatData.name, avatarUrl: chatData.avatarUrl || 'https://placehold.co/100x100.png' },
                    memberProfiles: memberProfiles.filter(p => p)
                };
            }
            const otherMemberId = chatData.members.find(id => id !== userId);
            if (otherMemberId) {
                const userProfile = await getUserProfile(otherMemberId);
                if (userProfile) {
                    return {
                        id: chatDoc.id,
                        ...chatData,
                        friend: userProfile,
                    };
                }
            }
            return null;
        });

        const chats = (await Promise.all(chatPromises)).filter(Boolean);
        callback(chats);
    });
};

export const onMessagesUpdate = (chatRoomId, callback) => {
    const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

    return onSnapshot(q, (querySnapshot) => {
        const messages = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        callback(messages);
    });
};

export const sendMessage = async (chatRoomId, senderId, text) => {
    const chatRef = doc(db, 'chats', chatRoomId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error("Chat room not found!");
    }
    
    const chatData = chatDoc.data();
    const members = chatData.members;
  
    // 1. Add the message
    const messagesRef = collection(db, `chats/${chatRoomId}/messages`);
    await addDoc(messagesRef, {
      senderId,
      text,
      createdAt: serverTimestamp(),
      members: members
    });
  
    // 2. Prepare unread count updates
    const updates: any = {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
    };
  
    // Increment unread count for everyone EXCEPT the sender
    members.forEach((memberId) => {
      if (memberId !== senderId) {
        updates[`unreadCount.${memberId}`] = increment(1);
      }
    });
  
    await updateDoc(chatRef, updates);
  };

export const createChatRoom = async (uids: string[]) => {
    // If you pass [uid1, uid2], destructure them
    const [id1, id2] = uids;
    const chatRoomId = getChatRoomId(id1, id2);
    const chatRoomRef = doc(db, 'chats', chatRoomId);
    
    const docSnap = await getDoc(chatRoomRef);

    if (!docSnap.exists()) {
        await setDoc(chatRoomRef, {
            id: chatRoomId, // Optional but helpful
            members: [id1, id2],
            isGroup: false,
            createdAt: serverTimestamp(),
            lastMessage: '',
            lastMessageAt: serverTimestamp(),
        });
    }
    return chatRoomId;
};

export const createGroupChat = async (groupName, members, createdBy) => {
    // Ensure the creator is included in the members array
    const finalMembers = members.includes(createdBy) ? members : [...members, createdBy];
    
    const chatRoomRef = await addDoc(collection(db, 'chats'), {
        name: groupName,
        members: finalMembers, // Use the cleaned array
        isGroup: true,
        createdAt: serverTimestamp(),
        createdBy: createdBy,
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
    });
    return chatRoomRef.id;
};

export const addMemberToGroup = async (chatId, memberId) => {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
        members: arrayUnion(memberId)
    });
};

export const removeMemberFromGroup = async (chatId, memberId) => {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
        members: arrayRemove(memberId)
    });
};


// --- Post Functions -- -

async function deleteCollection(collectionPath) {
    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef);
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
}

export const deletePost = async (postId) => {
    const postRef = doc(db, 'posts', postId);
    await deleteDoc(postRef);
};

export const debugPostAuthor = async (postId: string) => {
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (postDoc.exists()) {
      const data = postDoc.data();
      console.log('Post Author Data:', {
        name: data.author?.name,
        nameFont: data.author?.nameFont,
        nameColor: data.author?.nameColor,
        nameEffect: data.author?.nameEffect,
        fullAuthor: data.author
      });
      return data.author;
    }
    return null;
  };

const getUserProfileWithRetry = async (userId, retries = 3, delay = 500) => {
  for (let i = 0; i < retries; i++) {
    const userProfile = await getUserProfile(userId);
    if (userProfile) {
      return userProfile;
    }
    await new Promise(res => setTimeout(res, delay));
  }
  return null;
};

export const createPost = async (
    userId: string | undefined, 
    content: string, 
    isAnonymous: boolean, 
    image: string | null,
    isHidden: boolean = false
  ) => {
    if (!userId) throw new Error("User ID is required");
  
    const userRef = doc(db, 'users', userId);
    const postsRef = collection(db, 'posts');
    const newPostRef = doc(postsRef);
  
    return await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("User does not exist");
  
      const userData = userDoc.data();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      
      const currentChirpScore = userData.chirpScore || 0;
      
      // --- 1. Daily Post Score Logic (+2 per post, max 10) ---
      const lastPostDate = userData.lastPostDate || "";
      const dailyCount = lastPostDate === todayStr ? (userData.dailyPostCount || 0) : 0;
      
      let scoreIncrement = 0;
      if (dailyCount < 10) {
        scoreIncrement += 2;
      }
  
      // --- 2. Streak Score Logic (+20 on streak increase) ---
      let streakIncrement = 0;
      const lastStreakUpdate = userData.lastStreakUpdate || "";
      
      
      if (lastStreakUpdate !== todayStr) {
          streakIncrement = 20;
      }
  
      const totalScoreGain = scoreIncrement + streakIncrement;
  
      // --- 3. Construct Post with ALL style properties ---
      const newPost = {
        id: newPostRef.id,
        authorId: userId, 
        userId,
        content,
        isAnonymous,
        imageUrl: image,
        isHidden,
        likes: 0,
        commentsCount: 0,
        shares: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
        author: {
          id: userId, // Add user ID
          username: userData.username,
          avatarUrl: userData.avatarUrl,
          name: userData.name || userData.displayName || userData.username,
          // Include ALL name customization fields
          nameFont: userData.nameFont || 'PT Sans, sans-serif',
          nameColor: userData.nameColor || '#ff990a',
          nameEffect: userData.nameEffect || 'none',
        }
      };
  
      // --- 4. Atomic Updates ---
      transaction.set(newPostRef, newPost);
      transaction.update(userRef, {
        chirpScore: currentChirpScore + totalScoreGain,
        dailyPostCount: dailyCount + 1,
        lastPostDate: todayStr,
        lastStreakUpdate: todayStr,
      });
  
      return { 
        post: newPost, 
        streakInfo: { 
          streak: (userData.streak || 0) + (streakIncrement > 0 ? 1 : 0), 
          streakUpdated: streakIncrement > 0 
        } 
      };
    });
  };

export const getPaginatedPosts = async (lastVisible) => {
    const postsCol = collection(db, 'posts');
    let q;
    if (lastVisible) {
        q = query(postsCol, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(10));
    } else {
        q = query(postsCol, orderBy('createdAt', 'desc'), limit(10));
    }
    const postSnapshot = await getDocs(q);
    const postList = postSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
    }));
    const newLastVisible = postSnapshot.docs[postSnapshot.docs.length-1];
    return { posts: postList, lastVisible: newLastVisible };
}

export const getPostsByUserId = async (userId) => {
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, where("authorId", "==", userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
    }));
};

export const getPostById = async (postId) => {
    if (!postId) return null;
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) {
        return null;
    }
    const postData = postDoc.data();
    return { 
        id: postDoc.id, 
        ...postData,
        createdAt: postData.createdAt?.toDate().toISOString() || new Date().toISOString(),
    };
};

// --- FIXED: Like/Unlike Functions with likedBy array updates ---
export const likePost = async (userId, postId) => {
    const userRef = doc(db, 'users', userId);
    const postRef = doc(db, 'posts', postId);

    await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        
        if (!postDoc.exists()) {
            throw new Error("Post does not exist!");
        }

        const postData = postDoc.data();
        const likedBy = postData.likedBy || [];

        // Only proceed if user hasn't already liked the post
        if (!likedBy.includes(userId)) {
            // Update user's liked posts
            transaction.update(userRef, {
                likedPosts: arrayUnion(postId)
            });

            // Update post's likes count and likedBy array
            transaction.update(postRef, {
                likes: increment(1),
                likedBy: arrayUnion(userId)
            });
        }
    });
};

export const unlikePost = async (userId, postId) => {
    const userRef = doc(db, 'users', userId);
    const postRef = doc(db, 'posts', postId);

    await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);

        if (!postDoc.exists()) {
            throw new Error("Post does not exist!");
        }

        const postData = postDoc.data();
        const likedBy = postData.likedBy || [];

        // Only proceed if user has actually liked the post
        if (likedBy.includes(userId)) {
            // Update user's liked posts
            transaction.update(userRef, { 
                likedPosts: arrayRemove(postId) 
            });

            // Update post's likes count and likedBy array
            transaction.update(postRef, { 
                likes: postData.likes > 0 ? postData.likes - 1 : 0,
                likedBy: arrayRemove(userId)
            });
        }
    });
};

export const getLikedPosts = async (userId) => {
    const user = await getUserProfile(userId);
    if (!user || !user.likedPosts || user.likedPosts.length === 0) {
        return [];
    }

    const postPromises = user.likedPosts.map(postId => getDoc(doc(db, 'posts', postId)));
    const postDocs = await Promise.all(postPromises);
    
    return postDocs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
    }));
};


// --- Comment Functions -- -
// Update the addComment function in firebase.ts
export const addComment = async (postId, userId, text) => {
    const userRef = doc(db, 'users', userId);
    
    return await runTransaction(db, async (transaction) => {
        // Get user data first
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");

        const userData = userDoc.data();
        const userProfile = { id: userDoc.id, ...userData };
        
        // Initialize chirpScore if not exists
        const currentChirpScore = userData.chirpScore || 0;
        
        const today = new Date().toISOString().split('T')[0];
        const commentCount = userData.dailyStats?.[today]?.comments || 0;

        // Prepare comment data
        const commentData = {
            postId,
            authorId: userId,
            author: {
                name: userProfile.name,
                username: userProfile.username,
                avatarUrl: userProfile.avatarUrl,
                nameFont: userProfile.nameFont,
                nameColor: userProfile.nameColor,
                nameEffect: userProfile.nameEffect,
            },
            text,
            createdAt: serverTimestamp(),
        };

        // Add comment
        const commentRef = await addDoc(collection(db, 'comments'), commentData);
        
        // 1. Handle Streak
        const streakInfo = await updateStreak(userId);

        // 2. Handle Points (Max 15 per day = 15 comments @ 1pt each)
        let scoreIncrement = 0;
        if (commentCount < 15) {
            scoreIncrement = 1;
        }

        // Update user's chirpScore and daily stats
        transaction.update(userRef, {
            chirpScore: currentChirpScore + scoreIncrement,
            [`dailyStats.${today}.comments`]: increment(1)
        });
        
        return { 
            comment: { id: commentRef.id, ...commentData, createdAt: new Date() }, 
            streakInfo 
        };
    });
};

export const getCommentsByPostId = (postId, callback) => {
    const commentsRef = collection(db, 'comments');
    const q = query(commentsRef, where("postId", "==", postId), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (querySnapshot) => {
        const comments = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        callback(comments);
    });
};

export const getCommentsByUserId = async (userId) => {
    const commentsRef = collection(db, 'comments');
    const q = query(commentsRef, where("authorId", "==", userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const comments = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const commentData = doc.data();
        const post = await getPostById(commentData.postId);
        return {
            id: doc.id,
            ...commentData,
            createdAt: commentData.createdAt?.toDate() || new Date().toISOString(),
            post: post || null,
        };
    }));

    return comments;
};

export const likeComment = async (userId, commentId) => {
    const userRef = doc(db, 'users', userId);
    const commentRef = doc(db, 'comments', commentId);

    await updateDoc(userRef, {
        likedComments: arrayUnion(commentId)
    });

    await updateDoc(commentRef, {
        likes: increment(1)
    });
};

export const unlikeComment = async (userId, commentId) => {
    const userRef = doc(db, 'users', userId);
    const commentRef = doc(db, 'comments', commentId);

    await runTransaction(db, async (transaction) => {
        const commentDoc = await transaction.get(commentRef);

        transaction.update(userRef, { likedComments: arrayRemove(commentId) });

        if (commentDoc.exists()) {
            const commentData = commentDoc.data();
            if (commentData.likes > 0) {
                transaction.update(commentRef, { likes: commentData.likes - 1 });
            }
        }
    });
};


// --- Friend Functions -- -

export const sendFriendRequest = async (fromUserId, toUserId) => {
    const toUserRef = doc(db, 'users', toUserId);
    await updateDoc(toUserRef, {
        friendRequests: arrayUnion(fromUserId)
    });
}

export const acceptFriendRequest = async (userId, friendId) => {
    const userRef = doc(db, 'users', userId);
    const friendRef = doc(db, 'users', friendId);

    await updateDoc(userRef, {
        friends: arrayUnion(friendId),
        friendRequests: arrayRemove(friendId)
    });

    await updateDoc(friendRef, {
        friends: arrayUnion(userId)
    });
};

export const declineFriendRequest = async (userId, friendId) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        friendRequests: arrayRemove(friendId)
    });
};

export const unfriend = async (userId, friendId) => {
    const userRef = doc(db, 'users', userId);
const friendRef = doc(db, 'users', friendId);
    await updateDoc(userRef, {
        friends: arrayRemove(friendId)
    });

    await updateDoc(friendRef, {
        friends: arrayRemove(userId)
    });
};

export const getUserFriends = (userId, callback) => {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, async (doc) => {
        const user = doc.data();
        if (user && user.friends) {
            const friendPromises = user.friends.map(friendId => getUserProfile(friendId));
            const friends = await Promise.all(friendPromises);
            callback(friends.filter(f => f)); // Filter out any null profiles
        }
    });
};

export const getPendingFriendRequests = (userId, callback) => {
    const userRef = doc(db, 'users', userId);
    console.log(`Setting up listener for user: ${userId}`);
    
    return onSnapshot(userRef, async (doc) => {
      const user = doc.data();
      console.log(`User data updated:`, user);
      
      if (user && user.friendRequests) {
        console.log(`Found ${user.friendRequests.length} friend requests`);
        const requestPromises = user.friendRequests.map(senderId => {
          console.log(`Fetching profile for sender: ${senderId}`);
          return getUserProfile(senderId);
        });
        
        const requests = await Promise.all(requestPromises);
        console.log(`Resolved ${requests.filter(r => r).length} profiles`);
        callback(requests.filter(r => r));
      } else {
        console.log('No friend requests or user data');
        callback([]);
      }
    });
  };

// --- Presence Functions -- -

export const updateUserPresence = (userId) => {
  const userStatusRef = ref(realtimeDb, `/status/${userId}`);
  const isOnline = {
      isOnline: true,
      last_changed: Date.now(),
  };
  const isOffline = {
      isOnline: false,
      last_changed: Date.now(),
  };

  onDisconnect(userStatusRef).set(isOffline).then(() => {
      set(userStatusRef, isOnline);
  });
};

// --- Follow Functions -- -

export const followUser = async (currentUserId, targetUserId) => {
    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', targetUserId);

    await updateDoc(currentUserRef, {
        following: arrayUnion(targetUserId)
    });

    await updateDoc(targetUserRef, {
        followers: arrayUnion(currentUserId)
    });
};

export const unfollowUser = async (currentUserId, targetUserId) => {
    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', targetUserId);

    await updateDoc(currentUserRef, {
        following: arrayRemove(targetUserId)
    });

    await updateDoc(targetUserRef, {
        followers: arrayRemove(currentUserId)
    });
};

// --- Achievement Functions -- -
export const getUserAchievements = async (userId) => {
    const user = await getUserProfile(userId);
    if (!user || !user.achievements) {
        return [];
    }
    return user.achievements;
};

// --- Trending Page Functions -- -

/**
 * Real-time listener for the leaderboard.
 * This is the engine for "Instant" updates.
 */
export const subscribeToTopChirpers = (callback) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('chirpScore', 'desc'), limit(10));

    return onSnapshot(q, (snapshot) => {
        const chirpers = snapshot.docs.map((doc, index) => ({
            id: doc.id,
            ...doc.data(),
            rank: index + 1
        }));
        callback(chirpers);
    });
};

export const getTopChirpers = async () => {
    // 1. Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    // 2. Map them and ensure they have a score (default to 0 if missing)
    const chirpers = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            uid: doc.id,
            ...data,
            // Use the saved chirpScore, or 0 if it hasn't been created yet
            chirpScore: data.chirpScore || 0 
        };
    });

    // 3. Sort them locally so no one is hidden by Firestore's strict ordering
    const sortedChirpers = chirpers.sort((a, b) => (b.chirpScore || 0) - (a.chirpScore || 0));
    
    // 4. Return the top 10 with their ranks
    return sortedChirpers
        .slice(0, 10)
        .map((chirper, index) => ({ ...chirper, rank: index + 1 }));
};

export const getHotPosts = async () => {
    const postsQuery = query(collection(db, 'posts'), orderBy('likes', 'desc'), limit(10));
    const postsSnapshot = await getDocs(postsQuery);
    return postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
    }));
};

export const getMostFollowedUsers = async () => {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as User }));
    return users.sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0)).slice(0, 10);
};

// ... existing functions

/* --- Corrected updateGroupImage --- */
export const updateGroupImage = async (chatId: string, file: File) => {
    // Use the 'storage' instance imported from your lib/firebase
    // Use 'storageRef' which is the alias for the Storage ref function
    const fileRef = storageRef(storage, `chats/${chatId}/groupIcon_${Date.now()}`);
    
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      groupIcon: downloadURL
    });
    
    return downloadURL;
  };

  export const markChatAsRead = async (chatId: string, userId: string) => {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        [`unreadCount.${userId}`]: 0
      });
    } catch (error) {
      console.error("Error marking chat as read:", error);
    }
  };
export const updateGroupName = async (chatId, newName) => {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
        name: newName
    });
};
/**
 * Logic: Finds users who appear in the 'friends' array of EVERY 
 * group member currently in the chat.
 */
export const getMutualFriends = async (currentMemberIds: string[]) => {
    try {
        if (!currentMemberIds || currentMemberIds.length === 0) return [];

        // 1. Fetch documents for all current members
        const memberDocs = await Promise.all(
            currentMemberIds.map(id => getDoc(doc(db, 'users', id)))
        );

        // 2. Map to their friend UID arrays
        const friendsLists = memberDocs
            .map(d => d.data()?.friends || []) as string[][];

        if (friendsLists.length === 0) return [];

        // 3. Find intersection (UIDs that exist in ALL lists)
        const mutualIds = friendsLists.reduce((acc, currentList) => 
            acc.filter(uid => currentList.includes(uid))
        );

        // 4. Exclude people who are already in the group
        const finalIds = mutualIds.filter(id => !currentMemberIds.includes(id));

        if (finalIds.length === 0) return [];

        // 5. Fetch profile data for these IDs (limit 30 for Firestore 'in' query)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', 'in', finalIds.slice(0, 30)));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching mutual friends:", error);
        return [];
    }
};

import { ref as rtRef, push as rtPush, set as rtSet } from 'firebase/database';

// Helper to create a community (useful for your "Create" button)
export const createNewCommunity = async (name: string, description: string, icon: string) => {
    const communitiesRef = rtRef(realtimeDb, 'public/communities');
    const newCommunityRef = rtPush(communitiesRef);
    
    const communityData = {
        name,
        description,
        icon,
        href: `/communities/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}`,
        createdAt: new Date().toISOString()
    };

    await rtSet(newCommunityRef, communityData);
    return newCommunityRef.key;
};

// Helper to seed initial data manually if needed
export const seedInitialCommunities = async (initialData: any[]) => {
    const communitiesRef = rtRef(realtimeDb, 'public/communities');
    for (const item of initialData) {
        const newRef = rtPush(communitiesRef);
        await rtSet(newRef, item);
    }
};

// --- Admin & Reporting Functions ---

export const reportPost = async (postId: string, reporterId: string, reason: string) => {
    const reportRef = collection(db, 'reports');
    await addDoc(reportRef, {
        postId,
        reporterId,
        reason,
        status: 'pending',
        createdAt: serverTimestamp(),
    });
};


export const subscribeToReports = (callback: (reports: any[]) => void) => {
    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, async (snapshot) => {
        const reports = await Promise.all(snapshot.docs.map(async (reportDoc) => {
            const data = reportDoc.data();
            const [post, reporter] = await Promise.all([
                getPostById(data.postId),
                getUserProfile(data.reporterId)
            ]);
            
            return {
                id: reportDoc.id,
                ...data,
                post,
                reporter,
                createdAt: data.createdAt?.toDate() || new Date(),
            };
        }));
        callback(reports);
    });
};


export const getAdminUserDetail = async (userId: string) => {
    const [posts, comments] = await Promise.all([
        getPostsByUserId(userId),
        getCommentsByUserId(userId)
    ]);
    return { posts, comments };
};


export const logAdminAction = async (adminId: string, adminUsername: string, action: string, details: string) => {
    try {
        await addDoc(collection(db, 'system_logs'), {
            adminId: adminId || "unknown_id",
            adminUsername: adminUsername || "Unknown Admin",
            action: action || "UNKNOWN_ACTION",
            // Use logical OR to ensure this is never undefined
            details: details || "No details provided", 
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Logging failed:", error);
    }
};



/**
 * Dismisses a report without deleting the post
 */
export const dismissReport = async (reportId: string, adminId: string) => {
    const reportRef = doc(db, 'reports', reportId);
    await deleteDoc(reportRef);
    await logAdminAction(adminId, "DISMISS_REPORT", `Report ${reportId} was dismissed.`);
};

/**
 * Enhanced Delete Post for Admins
 */
export const adminDeletePost = async (postId: string, reportId: string | null, adminId: string, adminUsername: string) => {
    if (!postId) throw new Error("Post ID is required");

    // 1. Delete the post
    await deleteDoc(doc(db, 'posts', postId));
    
    // 2. Delete report if it exists
    if (reportId) {
        await deleteDoc(doc(db, 'reports', reportId));
    }
    
    // 3. Log it with the NEW username parameter
    await logAdminAction(
        adminId, 
        adminUsername, 
        "DELETE_POST", 
        `Deleted post ID: ${postId}`
    );
};

// Shop Functions
export const purchaseItem = async (userId: string, item: any, discountedPrice?: number) => {
    const userRef = doc(db, 'users', userId);
    
    return await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentScore = userData.chirpScore || 0;
      const finalPrice = discountedPrice !== undefined ? discountedPrice : item.price;
      const discountPercentage = discountedPrice !== undefined ? 
          Math.round((1 - discountedPrice / item.price) * 100) : 0;
      const userRole = getUserRole(userId);

      if (currentScore < finalPrice) {
        throw new Error('Insufficient ChirpScore');
      }

      const updates: any = {
        chirpScore: increment(-finalPrice),
      };

      // Add to purchased items
      if (item.type === 'font') {
        updates[`purchasedItems.fonts`] = arrayUnion(item.value);
      } else if (item.type === 'color') {
        updates[`purchasedItems.colors`] = arrayUnion(item.value);
      } else if (item.type === 'gradient') {
        updates[`purchasedItems.gradients`] = arrayUnion(item.value);
      } else if (item.type === 'moving-gradient') {
        updates[`purchasedItems.movingGradients`] = arrayUnion(item.value);
      }

      // Equip the item
      if (item.type === 'font') {
        updates.nameFont = item.value;
        updates[`equippedStyle.nameFont`] = item.value;
      } else if (item.type === 'color') {
        updates.nameColor = item.value;
        updates.nameEffect = 'none';
        updates[`equippedStyle.nameColor`] = item.value;
        updates[`equippedStyle.nameEffect`] = 'none';
      } else if (item.type === 'gradient') {
        updates.nameColor = item.value;
        updates.nameEffect = 'gradient';
        updates[`equippedStyle.nameColor`] = item.value;
        updates[`equippedStyle.nameEffect`] = 'gradient';
      } else if (item.type === 'moving-gradient') {
        updates.nameColor = item.value;
        updates.nameEffect = 'moving-gradient';
        updates[`equippedStyle.nameColor`] = item.value;
        updates[`equippedStyle.nameEffect`] = 'moving-gradient';
      }

      transaction.update(userRef, updates);
      
      // Log the purchase AFTER the transaction succeeds
      const newBalance = currentScore - finalPrice;
      
      // Return the purchase info for logging
      return {
        userId,
        username: userData.username || 'Unknown',
        itemName: item.name,
        originalPrice: item.price,
        discountedPrice: finalPrice,
        discountPercentage,
        userRole,
        newBalance
      };
    }).then(async (purchaseInfo) => {
      // Log the purchase outside the transaction
      await logPurchaseToSystem(
        purchaseInfo.userId,
        purchaseInfo.username,
        purchaseInfo.itemName,
        purchaseInfo.originalPrice,
        purchaseInfo.discountedPrice,
        purchaseInfo.discountPercentage,
        purchaseInfo.userRole,
        purchaseInfo.newBalance
      );
      return purchaseInfo;
    });
  };

  const logPurchaseToSystem = async (
    userId: string, 
    username: string, 
    itemName: string, 
    originalPrice: number, 
    discountedPrice: number, 
    discountPercentage: number, 
    userRole: string,
    newBalance: number
) => {
    try {
        await addDoc(collection(db, 'system_logs'), {
            action: 'SHOP_PURCHASE',
            adminId: userId,
            adminUsername: username,
            details: `Purchased ${itemName} for ${discountedPrice} points (Original: ${originalPrice}, Discount: ${discountPercentage}%) - Balance: ${newBalance} - Role: ${userRole}`,
            timestamp: serverTimestamp(),
        });
        console.log('Purchase logged successfully');
    } catch (error) {
        console.error('Error logging purchase:', error);
        // Don't throw error here - purchase succeeded, just logging failed
    }
};

  export const purchaseMultipleItems = async (userId: string, items: any[]) => {
    const userRef = doc(db, 'users', userId);
    
    return await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
  
      const userData = userDoc.data();
      const currentScore = userData.chirpScore || 0;
      const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
  
      if (currentScore < totalPrice) {
        throw new Error('Insufficient ChirpScore');
      }
  
      const updates: any = {
        chirpScore: increment(-totalPrice),
      };
  
 
      items.forEach(item => {
        if (item.type === 'font') {
          updates.nameFont = item.value;
        } else if (item.type === 'color') {
          updates.nameColor = item.value;
          updates.nameEffect = 'none';
        } else if (item.type === 'gradient') {
          updates.nameColor = item.value;
          updates.nameEffect = 'gradient';
        } else if (item.type === 'moving-gradient') {
          updates.nameColor = item.value;
          updates.nameEffect = 'moving-gradient';
        }
      });
  
      transaction.update(userRef, updates);
    });
  };

export const SUPER_ADMINS = [
    "ZonTkSaIyebzkr3kPQW1sCncId63",
    "m37C815wG6VqVNW8LLjmZc4IIHF3",
    "ehUetd1rw3hdUvezMiSbwtQFUJR2"
];

export const MODERATORS = [
    "YmNJAuPyGKM6qPbhEs78AuyhPSz1"
];

export const getUserRole = (userId: string): 'superadmin' | 'moderator' | 'user' => {
    if (SUPER_ADMINS.includes(userId)) {
        return 'superadmin';
    } else if (MODERATORS.includes(userId)) {
        return 'moderator';
    }
    return 'user';
};


export const calculateDiscountedPrice = (originalPrice: number, userRole: 'superadmin' | 'moderator' | 'user'): number => {
    if (userRole === 'superadmin') {
        
        return Math.floor(originalPrice * 0.1);
    } else if (userRole === 'moderator') {
       
        return Math.ceil(originalPrice * 0.7);
    }
    return originalPrice;
};


export const equipStyle = async (userId: string, item: any) => {
    const userRef = doc(db, 'users', userId);
    
    const updates: any = {};
    const styleToEquip: any = {};
    
    if (item.type === 'font') {
      updates.nameFont = item.value;
      styleToEquip.nameFont = item.value;
    } else if (item.type === 'color') {
      updates.nameColor = item.value;
      updates.nameEffect = 'none';
      styleToEquip.nameColor = item.value;
      styleToEquip.nameEffect = 'none';
    } else if (item.type === 'gradient') {
      updates.nameColor = item.value;
      updates.nameEffect = 'gradient';
      styleToEquip.nameColor = item.value;
      styleToEquip.nameEffect = 'gradient';
    } else if (item.type === 'moving-gradient') {
      updates.nameColor = item.value;
      updates.nameEffect = 'moving-gradient';
      styleToEquip.nameColor = item.value;
      styleToEquip.nameEffect = 'moving-gradient';
    }
    
    // Update equippedStyle
    updates.equippedStyle = styleToEquip;
  
    await updateDoc(userRef, updates);
    
    // Update all existing posts with new style
    await updateAllPostsWithUserStyle(userId, updates);
    
    // Dispatch events to notify all components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('style-equipped', { 
        detail: { userId, style: styleToEquip } 
      }));
      window.dispatchEvent(new CustomEvent('profile-updated'));
    }
    
    return true;
  };
  

  export const resetToDefaultStyle = async (userId: string) => {
    const defaultStyle = {
      nameColor: '#ff990a',
      nameFont: 'PT Sans, sans-serif',
      nameEffect: 'none' as const,
    };
  
    await equipStyle(userId, defaultStyle);
  };


const updateAllPostsWithUserStyle = async (userId: string, style: any) => {
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where("authorId", "==", userId));
      const querySnapshot = await getDocs(q);
  
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => {
        const postRef = doc.ref;
        
        
        batch.update(postRef, {
          'author.nameFont': style.nameFont || 'PT Sans, sans-serif',
          'author.nameColor': style.nameColor || '#ff990a',
          'author.nameEffect': style.nameEffect || 'none',
        });
      });
  
      if (querySnapshot.docs.length > 0) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Error updating posts:', error);
    }
  };
  
  export const getUserPurchasedItems = async (userId: string) => {
    const user = await getUserProfile(userId);
    return user?.purchasedItems || {
      fonts: [],
      colors: [],
      gradients: [],
      movingGradients: [],
    };
  };
  
  export const userOwnsItem = (user: User, item: any): boolean => {
    if (!user.purchasedItems) return false;
    
    if (item.type === 'font') {
      return user.purchasedItems.fonts?.includes(item.value) || false;
    } else if (item.type === 'color') {
      return user.purchasedItems.colors?.includes(item.value) || false;
    } else if (item.type === 'gradient') {
      return user.purchasedItems.gradients?.includes(item.value) || false;
    } else if (item.type === 'moving-gradient') {
      return user.purchasedItems.movingGradients?.includes(item.value) || false;
    }
    
    return false;
  };

export const isItemEquipped = (user: User, item: any): boolean => {
    if (!user.equippedStyle) return false;
    
    if (item.type === 'font') {
      return user.equippedStyle.nameFont === item.value;
    } else if (item.type === 'color') {
      return user.equippedStyle.nameColor === item.value && 
             user.equippedStyle.nameEffect === 'none';
    } else if (item.type === 'gradient') {
      return user.equippedStyle.nameColor === item.value && 
             user.equippedStyle.nameEffect === 'gradient';
    } else if (item.type === 'moving-gradient') {
      return user.equippedStyle.nameColor === item.value && 
             user.equippedStyle.nameEffect === 'moving-gradient';
    }
    
    return false;
  };