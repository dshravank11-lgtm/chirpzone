
export interface User {
    id: string;
    uid: string;
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
}

export interface Post {
    id: string;
    author: User;
    authorId: string;
    content: string;
    imageUrl?: string;
    likes: number;
    shares: number;
    createdAt: any;
}

export interface Comment {
    id: string;
    author: User;
    authorId?: string;
    text: string;
    createdAt: any;
    likes?: number;
    replies?: number;
    post?: Post;
}

export interface UserProfile extends User {
    posts: Post[];
    achievements: any[];
    likedPosts: Post[];
    comments: Comment[];
    photoURL?: string;
    displayName?: string;
    creationTime?: string;
    occupation?: string;
    website?: string;
}
