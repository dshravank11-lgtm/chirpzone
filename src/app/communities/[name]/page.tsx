'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import PageTransition from '@/components/page-transition';
import { Button } from '@/components/ui/button';
import { MessageSquare, PlusCircle, Heart, MessageCircle as MessageCircleIcon, Share2, Send, Users, Loader, TrendingUp, Crown, Award, Search, Filter, X, ChevronDown, Sparkles, ThumbsUp, Eye, Clock, Bookmark, Pin, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove, getDoc, DocumentData, increment, getDocs } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { joinCommunity, leaveCommunity, subscribeToCommunity } from '@/services/communities';
import { getUserProfile, type User } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProfilePreviewCard } from '@/components/profile-preview-card';
import { useGroupPresence } from '@/hooks/usePresence.ts';

interface Comment {
  id: string;
  author: string;
  authorId: string;
  avatar: string;
  text: string;
  createdAt: any;
}

interface Post {
  id: string;
  author: string;
  authorId: string;
  avatar: string;
  title: string;
  description: string;
  likers: string[];
  commentCount: number;
  createdAt: any;
}

const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setDisplayValue(value);
        setTimeout(() => setIsAnimating(false), 300);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [value, displayValue]);

  return (
    <span className={`inline-block transition-all duration-300 ${isAnimating ? 'scale-125 text-[#ffa600] font-bold' : 'scale-100'}`}>
      {displayValue}
    </span>
  );
};

const getTimeAgo = (date: any): string => {
  if (!date) return 'just now';
  const d = date.toDate ? date.toDate() : new Date(date);
  const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'mo ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'm ago';
  return 'just now';
};

const MemberCard = ({ member, rank, isOnline, onClick }: { member: User, rank: number, isOnline?: boolean, onClick?: () => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Get styled name
  const getStyledName = (member: any) => {
    if (!member) return {};
    
    const style: React.CSSProperties = {
      fontFamily: member.nameFont || 'PT Sans, sans-serif',
    };

    if (member.nameEffect === 'none') {
      style.color = member.nameColor || '#ff990a';
    } else if (member.nameEffect === 'gradient') {
      style.backgroundImage = member.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
      style.WebkitBackgroundClip = 'text';
      style.WebkitTextFillColor = 'transparent';
      style.backgroundClip = 'text';
    } else if (member.nameEffect === 'moving-gradient') {
      style.backgroundImage = member.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
      style.backgroundSize = '200% 200%';
      style.WebkitBackgroundClip = 'text';
      style.WebkitTextFillColor = 'transparent';
      style.backgroundClip = 'text';
      style.animation = 'gradientMove 3s ease infinite';
    }

    return style;
  };

  const nameStyle = getStyledName(member);

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 cursor-pointer border
        ${isHovered 
          ? 'bg-amber-50 dark:bg-gray-800 border-[#ffa600] shadow-md scale-105' 
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-[#ffa600]/50'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar className={`h-12 w-12 transition-all duration-300 ${isHovered ? 'ring-2 ring-[#ffa600]' : ''}`}>
          <AvatarImage src={member.avatarUrl} />
          <AvatarFallback className="bg-[#ffa600] text-white font-bold">
            {member.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
        )}
        {rank <= 3 && (
          <div className="absolute -top-1 -right-1 bg-[#ffa600] rounded-full p-1 shadow-lg">
            <Crown className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div 
            className="font-bold text-sm truncate text-gray-900 dark:text-gray-100"
            style={nameStyle}
          >
            {member.name}
          </div>
          {rank <= 3 && (
            <Badge className="text-xs bg-[#ffa600] hover:bg-[#ffa600] text-white border-0">
              #{rank}
            </Badge>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">u/{member.username}</div>
      </div>
      {member.streak > 0 && (
        <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full animate-pulse">
          <span className="text-xs font-bold text-[#ffa600]">{member.streak}🔥</span>
        </div>
      )}
      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
    </div>
  );
};

const ForumPostCard = ({ post, onLike, onComment, onShare, isJoined, user, onAuthorClick }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const isLiked = user && post.likers?.includes(user.uid);
  const voteScore = post.likers?.length || 0;
  
  // Get styled name
  const getStyledName = (postAuthor: any) => {
    if (!postAuthor) return {};
    
    const style: React.CSSProperties = {
      fontFamily: postAuthor.nameFont || 'PT Sans, sans-serif',
    };

    if (postAuthor.nameEffect === 'none') {
      style.color = postAuthor.nameColor || '#ff990a';
    } else if (postAuthor.nameEffect === 'gradient') {
      style.backgroundImage = postAuthor.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
      style.WebkitBackgroundClip = 'text';
      style.WebkitTextFillColor = 'transparent';
      style.backgroundClip = 'text';
    } else if (postAuthor.nameEffect === 'moving-gradient') {
      style.backgroundImage = postAuthor.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
      style.backgroundSize = '200% 200%';
      style.WebkitBackgroundClip = 'text';
      style.WebkitTextFillColor = 'transparent';
      style.backgroundClip = 'text';
      style.animation = 'gradientMove 3s ease infinite';
    }

    return style;
  };


  const [authorData, setAuthorData] = useState<any>(null);
  
  useEffect(() => {
    const fetchAuthorData = async () => {
      if (post.authorId && !post.isAnonymous) {
        const data = await getUserProfile(post.authorId);
        setAuthorData(data);
      }
    };
    fetchAuthorData();
  }, [post.authorId, post.isAnonymous]);

  const nameStyle = getStyledName(authorData);

  return (
    <div 
      className={`flex gap-3 p-4 bg-white dark:bg-gray-900 border rounded-lg transition-all duration-300 cursor-pointer
        ${isHovered ? 'border-[#ffa600] shadow-lg translate-x-1' : 'border-gray-200 dark:border-gray-700 hover:border-[#ffa600]/50'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Vote Section */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 transition-all duration-200
            ${isLiked ? 'text-[#ffa600]' : 'text-gray-400 hover:text-[#ffa600] hover:bg-amber-50 dark:hover:bg-gray-800'}`}
          onClick={(e) => {
            e.stopPropagation();
            onLike(post.id, post.likers);
          }}
        >
          <ThumbsUp className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
        </Button>
        <span className={`font-bold text-sm ${voteScore > 0 ? 'text-[#ffa600]' : 'text-gray-600 dark:text-gray-400'}`}>
          {voteScore}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Avatar className="h-6 w-6 cursor-pointer" onClick={(e) => {
            e.stopPropagation();
            if (post.authorId) onAuthorClick(post.authorId);
          }}>
            <AvatarImage src={post.avatar} />
            <AvatarFallback className="bg-[#ffa600] text-white text-xs">
              {post.author?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <span 
            className="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-[#ffa600] transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (post.authorId) onAuthorClick(post.authorId);
            }}
            style={!post.isAnonymous ? nameStyle : {}}
          >
            {post.author || 'Anonymous'}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {getTimeAgo(post.createdAt)}
          </span>
        </div>

        <h3 className="font-bold text-base mb-2 text-gray-900 dark:text-gray-100 hover:text-[#ffa600] transition-colors line-clamp-2">
          {post.title}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {post.description}
        </p>

        <div className="flex gap-2 items-center flex-wrap">
          <Button 
            variant="ghost" 
            size="sm"
            className="h-7 text-xs text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-gray-800 hover:text-[#ffa600]"
            onClick={(e) => {
              e.stopPropagation();
              onComment();
            }}
          >
            <MessageCircleIcon className="h-3 w-3 mr-1" />
            {post.commentCount || 0}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="h-7 text-xs text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-gray-800 hover:text-[#ffa600]"
            onClick={(e) => {
              e.stopPropagation();
              onShare(post.id);
            }}
          >
            <Share2 className="h-3 w-3 mr-1" />
            Share
          </Button>

          <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            <Eye className="h-3 w-3" />
            <span>{Math.floor(Math.random() * 500) + 50}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CommunityPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  
  const name = params?.name as string;
  
  const [community, setCommunity] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'new' | 'top' | 'hot'>('hot');
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  
  const [postsSnapshot] = useCollection(
    name ? query(collection(db, 'communities', name, 'posts'), orderBy('createdAt', 'desc')) : null
  );
  
  let posts: Post[] = postsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)) || [];
  
  // Get online users
  const onlineUsers = useGroupPresence(members.map(m => m.uid));
  
  // Sort posts
  if (sortBy === 'top') {
    posts = [...posts].sort((a, b) => (b.likers?.length || 0) - (a.likers?.length || 0));
  } else if (sortBy === 'hot') {
    posts = [...posts].sort((a, b) => {
      const aScore = (b.likers?.length || 0) + (b.commentCount || 0);
      const bScore = (a.likers?.length || 0) + (a.commentCount || 0);
      return bScore - aScore;
    });
  }

  // Filter posts
  if (searchTerm) {
    posts = posts.filter(post => 
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  const [isJoined, setIsJoined] = useState(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostDescription, setNewPostDescription] = useState('');
  const [postAnonymously, setPostAnonymously] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [joiningCommunity, setJoiningCommunity] = useState(false);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    
    const unsubscribe = subscribeToCommunity(name, (communityData) => {
        if (communityData) {
            setCommunity(communityData);
            loadMembers(communityData.members || []);
        } else {
            setCommunity(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [name]);

  const loadMembers = async (memberIds: string[]) => {
    setLoadingMembers(true);
    try {
      const memberPromises = memberIds.map(id => getUserProfile(id));
      const memberProfiles = await Promise.all(memberPromises);
      const validMembers = memberProfiles.filter(m => m !== null) as User[];
      validMembers.sort((a, b) => (b.streak || 0) - (a.streak || 0));
      setMembers(validMembers);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (user && community) {
        setIsJoined(community.members?.includes(user.uid) || false);
    } else {
        setIsJoined(false);
    }
  }, [user, community]);

  const handleJoinCommunity = async () => {
    if (!user || !community || joiningCommunity) return;
    
    setJoiningCommunity(true);
    try {
      if (isJoined) {
        await leaveCommunity(user.uid, community.id);
        toast({
          title: "Left Community",
          description: "You have successfully left this community.",
        });
      } else {
        await joinCommunity(user.uid, community.id);
        toast({
          title: "Joined! 🎉",
          description: "Welcome to the community!",
        });
      }
    } catch (error) {
      console.error('Error toggling community membership:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update membership.",
      });
    } finally {
      setJoiningCommunity(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostDescription.trim() || !user || !name) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all fields.",
      });
      return;
    }

    setIsCreatingPost(true);

    try {
        let authorName = 'Anonymous';
        let authorAvatar = '';

        if (!postAnonymously) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                authorName = userData.name || userData.displayName || user.displayName || 'Anonymous';
                authorAvatar = userData.avatarUrl || userData.photoURL || user.photoURL || '';
            } else {
                authorName = user.displayName || 'Anonymous';
                authorAvatar = user.photoURL || '';
            }
        }

        const postsSubCollection = collection(db, 'communities', name, 'posts');
        await addDoc(postsSubCollection, {
            author: authorName,
            avatar: authorAvatar,
            title: newPostTitle,
            description: newPostDescription,
            likers: [],
            commentCount: 0,
            createdAt: serverTimestamp(),
            authorId: user.uid,
        });

        toast({
            title: "Post Created! 🎉",
            description: "Your post has been shared.",
        });

        setIsNewPostOpen(false);
        setNewPostTitle('');
        setNewPostDescription('');
        setPostAnonymously(false);
    } catch (error) {
        console.error("Error creating post:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create post.",
        });
    } finally {
        setIsCreatingPost(false);
    }
  };

  const handleLikePost = async (postId: string, likers: string[]) => {
    if (!user || !name) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to like posts.",
      });
      return;
    }
    
    const postRef = doc(db, 'communities', name, 'posts', postId);
    const safeLikers = likers || [];
    const isLiked = safeLikers.includes(user.uid);

    try {
      await updateDoc(postRef, {
        likers: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error("Error liking post:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to like post.",
      });
    }
  };

  const handleSharePost = (postId: string) => {
    const postUrl = `${window.location.origin}/communities/${name}/post/${postId}`;
    navigator.clipboard.writeText(postUrl);
    toast({
      title: "Link Copied! 🔗",
      description: "Post link copied to clipboard.",
    });
  };

  const handleMemberClick = (userId: string) => {
    setSelectedUserId(userId);
    setShowProfilePreview(true);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col justify-center items-center h-screen">
          <Loader className="animate-spin h-12 w-12 text-[#ffa600] mb-4" />
          <p className="text-gray-600 dark:text-gray-400 animate-pulse">Loading community...</p>
        </div>
      </AppLayout>
    );
  }

  if (!community && !loading) {
    return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center h-screen text-center p-4">
                <Users className="h-20 w-20 text-[#ffa600] mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Community Not Found</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">The community you are looking for does not exist.</p>
            </div>
        </AppLayout>
    );
  }

  const onlineMembers = onlineUsers.length || Math.floor((members.length || 0) * 0.3);
  const totalPosts = posts.length;
  const totalComments = posts.reduce((acc, post) => acc + (post.commentCount || 0), 0);

  return (
    <AppLayout>
      <PageTransition>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          {/* Header Banner */}
          <div className="bg-[#ffa600] border-b-4 border-amber-600">
            <div className="max-w-6xl mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-full shadow-lg">
                    <MessageSquare className="h-8 w-8 text-[#ffa600]" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black text-white capitalize">
                      c/{community?.name || name}
                    </h1>
                    <p className="text-amber-100 text-sm">
                      {community?.description || 'A community for discussion'}
                    </p>
                  </div>
                </div>
                {user && (
                  <Button 
                    size="lg"
                    onClick={handleJoinCommunity} 
                    disabled={joiningCommunity}
                    className={`transition-all duration-300 font-bold shadow-lg hover:shadow-xl
                      ${isJoined 
                        ? 'bg-white text-[#ffa600] hover:bg-gray-100' 
                        : 'bg-amber-700 text-white hover:bg-amber-800'}`}
                  >
                    {joiningCommunity ? (
                      <Loader className="mr-2 h-5 w-5 animate-spin" />
                    ) : isJoined ? (
                      'Joined ✓'
                    ) : (
                      <><PlusCircle className="mr-2 h-5 w-5" /> Join</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex gap-6">
              {/* Main Content */}
              <div className="flex-1">
                {/* Action Bar */}
                <Card className="mb-4 border-2 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search posts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 border-gray-300 focus:border-[#ffa600] focus:ring-[#ffa600]"
                        />
                        {searchTerm && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setSearchTerm('')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded">
                        <Button
                          size="sm"
                          variant={sortBy === 'hot' ? 'default' : 'ghost'}
                          onClick={() => setSortBy('hot')}
                          className={sortBy === 'hot' ? 'bg-[#ffa600] hover:bg-[#ffa600]/90 text-white' : ''}
                        >
                          🔥 Hot
                        </Button>
                        <Button
                          size="sm"
                          variant={sortBy === 'new' ? 'default' : 'ghost'}
                          onClick={() => setSortBy('new')}
                          className={sortBy === 'new' ? 'bg-[#ffa600] hover:bg-[#ffa600]/90 text-white' : ''}
                        >
                          ✨ New
                        </Button>
                        <Button
                          size="sm"
                          variant={sortBy === 'top' ? 'default' : 'ghost'}
                          onClick={() => setSortBy('top')}
                          className={sortBy === 'top' ? 'bg-[#ffa600] hover:bg-[#ffa600]/90 text-white' : ''}
                        >
                          📈 Top
                        </Button>
                      </div>

                      <Dialog open={isNewPostOpen} onOpenChange={setIsNewPostOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-[#ffa600] hover:bg-amber-600 text-white font-bold shadow-lg hover:shadow-xl transition-all">
                            <PlusCircle className="mr-2 h-5 w-5" /> Create Post
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-2xl text-[#ffa600]">Create a Post</DialogTitle>
                            <DialogDescription>
                              Share your thoughts with the community
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="Post title"
                              value={newPostTitle}
                              onChange={(e) => setNewPostTitle(e.target.value)}
                              className="border-2 focus:border-[#ffa600]"
                            />
                            <Textarea
                              placeholder="What's on your mind?"
                              value={newPostDescription}
                              onChange={(e) => setNewPostDescription(e.target.value)}
                              rows={6}
                              className="border-2 focus:border-[#ffa600]"
                            />
                            <div className="flex items-center space-x-2 bg-amber-50 dark:bg-gray-800 p-3 rounded">
                              <Checkbox 
                                id="anonymous" 
                                checked={postAnonymously} 
                                onCheckedChange={(checked) => setPostAnonymously(Boolean(checked))} 
                              />
                              <Label htmlFor="anonymous" className="cursor-pointer">Post anonymously</Label>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewPostOpen(false)}>Cancel</Button>
                            <Button 
                              onClick={handleCreatePost} 
                              className="bg-[#ffa600] hover:bg-amber-600 text-white"
                              disabled={isCreatingPost}
                            >
                              {isCreatingPost && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                              Post
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>

                {/* Posts List */}
                <div className="space-y-3">
                  {posts.length > 0 ? (
                    posts.map((post, index) => (
                      <div 
                        key={post.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <ForumPostCard
                          post={post}
                          onLike={handleLikePost}
                          onComment={() => {}}
                          onShare={handleSharePost}
                          isJoined={isJoined}
                          user={user}
                          onAuthorClick={handleMemberClick}
                        />
                      </div>
                    ))
                  ) : (
                    <Card className="p-12 text-center border-2 border-dashed">
                      <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {searchTerm ? 'No posts found' : 'No posts yet'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {searchTerm ? 'Try a different search term' : 'Be the first to post!'}
                      </p>
                      {!searchTerm && (
                        <Button 
                          onClick={() => setIsNewPostOpen(true)}
                          className="bg-[#ffa600] hover:bg-amber-600 text-white"
                        >
                          <PlusCircle className="mr-2 h-5 w-5" />
                          Create First Post
                        </Button>
                      )}
                    </Card>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-80 space-y-4 hidden lg:block">
                {/* About Community */}
                <Card className="border-2 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-[#ffa600] to-amber-500 text-white">
                    <CardTitle className="text-lg font-bold">About Community</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#ffa600]" />
                        <span className="text-sm font-semibold">Members</span>
                      </div>
                      <span className="font-bold text-[#ffa600]">
                        <AnimatedNumber value={community?.members?.length || 0} />
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold">Online</span>
                      </div>
                      <span className="font-bold text-green-600">
                        <AnimatedNumber value={onlineMembers} />
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-[#ffa600]" />
                        <span className="text-sm font-semibold">Posts</span>
                      </div>
                      <span className="font-bold">
                        <AnimatedNumber value={totalPosts} />
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <MessageCircleIcon className="h-4 w-4 text-[#ffa600]" />
                        <span className="text-sm font-semibold">Comments</span>
                      </div>
                      <span className="font-bold">
                        <AnimatedNumber value={totalComments} />
                      </span>
                    </div>

                    <Separator />

                    <Button 
                      onClick={() => setShowMembersDialog(true)}
                      className="w-full bg-[#ffa600] hover:bg-amber-600 text-white font-bold"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      View All Members
                    </Button>
                  </CardContent>
                </Card>

                {/* Top Members */}
                <Card className="border-2 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-amber-500 to-[#ffa600] text-white">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Crown className="h-5 w-5" />
                      Top Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    {loadingMembers ? (
                      <div className="flex justify-center py-4">
                        <Loader className="h-6 w-6 animate-spin text-[#ffa600]" />
                      </div>
                    ) : members.slice(0, 5).length > 0 ? (
                      members.slice(0, 5).map((member, index) => (
                        <div key={member.uid} className="animate-slide-in" style={{ animationDelay: `${index * 100}ms` }}>
                          <MemberCard 
                            member={member} 
                            rank={index + 1} 
                            isOnline={onlineUsers.includes(member.uid)} 
                            onClick={() => handleMemberClick(member.uid)}
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4 text-sm">No members yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* Community Rules */}
                <Card className="border-2 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <CardTitle className="text-lg font-bold">Community Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    {['Be respectful', 'No spam', 'Stay on topic', 'No hate speech', 'Follow guidelines'].map((rule, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <span className="font-bold text-[#ffa600] min-w-[1.5rem]">{index + 1}.</span>
                        <span className="text-gray-700 dark:text-gray-300">{rule}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Members Dialog */}
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl text-[#ffa600] flex items-center gap-2">
                <Users className="h-6 w-6" />
                Community Members
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4">
                <span>Total: <strong><AnimatedNumber value={members.length} /></strong></span>
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  Online: <strong className="text-green-600"><AnimatedNumber value={onlineMembers} /></strong>
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto pr-2">
              {loadingMembers ? (
                <div className="flex justify-center py-8">
                  <Loader className="h-8 w-8 animate-spin text-[#ffa600]" />
                </div>
              ) : members.length > 0 ? (
                members.map((member, index) => (
                  <div 
                    key={member.uid}
                    className="animate-slide-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <MemberCard 
                      member={member} 
                      rank={index + 1} 
                      isOnline={onlineUsers.includes(member.uid)} 
                      onClick={() => {
                        handleMemberClick(member.uid);
                        setShowMembersDialog(false);
                      }}
                    />
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No members found.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </PageTransition>
      
      {/* Profile Preview */}
      {showProfilePreview && selectedUserId && (
        <ProfilePreviewCard 
          userId={selectedUserId} 
          onOpenChange={setShowProfilePreview}
        />
      )}
      
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
          opacity: 0;
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </AppLayout>
  );
};

export default CommunityPage;