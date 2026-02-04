// /app/trending/page.tsx - UPDATED VERSION with styled names
'use client';

import AppLayout from '@/components/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Flame, UserPlus, TrendingUp, MessageCircle, Users, MoreHorizontal, Palette, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import PageTransition from '@/components/page-transition';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getTopChirpers, getHotPosts, getMostFollowedUsers, followUser, User, deletePost, getUserProfile } from '@/services/firebase';
import { useAuth } from '@/hooks/use-auth';
import { ProfilePreviewCard } from '@/components/profile-preview-card';
import Podium from '@/components/podium';
import { ChirpScore } from '@/components/ui/chirp-score';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Helper function to get styled name
const getStyledName = (user: any) => {
  if (!user) return {};
  
  const style: React.CSSProperties = {
    fontFamily: user.nameFont || 'PT Sans, sans-serif',
  };

  if (user.nameEffect === 'none') {
    style.color = user.nameColor || '#ff990a';
  } else if (user.nameEffect === 'gradient') {
    style.backgroundImage = user.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
  } else if (user.nameEffect === 'moving-gradient') {
    style.backgroundImage = user.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
    style.backgroundSize = '200% 200%';
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
  }

  return style;
};

// Helper to get style description
const getStyleDescription = (user: any) => {
  if (!user) return null;
  
  if (!user.nameFont && !user.nameColor) return null;
  
  const fontName = user.nameFont?.split(',')[0] || 'Default';
  const effect = user.nameEffect || 'none';
  
  let effectText = '';
  if (effect === 'gradient') effectText = 'with gradient';
  if (effect === 'moving-gradient') effectText = 'with animated gradient';
  
  return `${fontName} font ${effectText}`;
};

const ChirperCard = ({ chirper, currentUser, onFollowToggle, onSelectUser }) => {
    const { toast } = useToast();
    const [userWithStyles, setUserWithStyles] = useState<any>(chirper);
    
    // Fetch full user profile to get style data
    useEffect(() => {
      const fetchUserStyles = async () => {
        try {
          const profile = await getUserProfile(chirper.id);
          if (profile) {
            setUserWithStyles(profile);
          }
        } catch (error) {
          console.error("Error fetching user styles:", error);
        }
      };
      
      fetchUserStyles();
    }, [chirper.id]);

    const nameStyle = getStyledName(userWithStyles);
    const styleDescription = getStyleDescription(userWithStyles);

    const handleFollow = () => {
        if (currentUser && currentUser.id !== chirper.id) {
            followUser(currentUser.id, chirper.id);
            onFollowToggle(chirper.id);
            toast({ 
              title: 'Followed!', 
              description: `You are now following @${chirper.username}.` 
            });
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-5 hover:shadow-lg hover:shadow-[#ffa600]/20 hover:border-[#ffa600]/50 transition-all duration-300"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-[#ffa600]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4 cursor-pointer flex-1" onClick={() => onSelectUser(chirper.id)}>
                    <div className="relative">
                        <div className="absolute -inset-1 bg-[#ffa600] rounded-full blur opacity-30 group-hover:opacity-60 transition" />
                        <span className="relative flex items-center justify-center text-lg font-bold w-10 h-10 rounded-full bg-[#ffa600]/20 border border-[#ffa600]/30">
                            {chirper.rank}
                        </span>
                    </div>
                    
                    <Avatar className="h-12 w-12 ring-2 ring-background group-hover:ring-[#ffa600]/50 transition-all">
                        <AvatarImage src={chirper.avatarUrl} data-ai-hint="user avatar" />
                        <AvatarFallback className="bg-[#ffa600] text-black font-semibold">
                            {chirper.name.substring(0,1).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p 
                              className="text-sm font-semibold leading-none"
                              style={nameStyle}
                            >
                              {chirper.name}
                            </p>
                            {chirper.rank === 1 && (
                                <motion.div
                                    initial={{ rotate: -10 }}
                                    animate={{ rotate: 10 }}
                                    transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.5 }}
                                >
                                    <Crown className="h-4 w-4 text-yellow-500 drop-shadow-lg" />
                                </motion.div>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">@{chirper.username}</p>
                        
                        {/* Show style info if not default */}
                        {styleDescription && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              <Palette className="h-2 w-2" />
                              <span>{styleDescription}</span>
                              {userWithStyles.nameEffect === 'gradient' && (
                                <Sparkles className="h-2 w-2 text-purple-500" />
                              )}
                              {userWithStyles.nameEffect === 'moving-gradient' && (
                                <Sparkles className="h-2 w-2 text-purple-500 animate-pulse" />
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="font-bold text-[#ffa600] text-lg">
                            {chirper.chirpScore}
                        </p>
                        <p className="text-xs text-muted-foreground">ChirpScore</p>
                    </div>
                    {currentUser && currentUser.id !== chirper.id && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleFollow}
                            className="hover:bg-[#ffa600] hover:text-black hover:border-[#ffa600] transition-all"
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Follow
                        </Button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const HotPostCard = ({ post, onPostDeleted }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [authorWithStyles, setAuthorWithStyles] = useState<any>(post.author);
    
    // Fetch author profile to get style data
    useEffect(() => {
      const fetchAuthorStyles = async () => {
        if (post.authorId && !post.isAnonymous) {
          try {
            const profile = await getUserProfile(post.authorId);
            if (profile) {
              setAuthorWithStyles(profile);
            }
          } catch (error) {
            console.error("Error fetching author styles:", error);
          }
        }
      };
      
      fetchAuthorStyles();
    }, [post.authorId, post.isAnonymous]);

    const authorNameStyle = getStyledName(authorWithStyles);

    const handleDeletePost = async () => {
        setShowDeleteConfirm(false);
        try {
            await deletePost(post.id);
            toast({
                title: 'Post Deleted',
                description: 'Your post has been removed.',
            });
            if (onPostDeleted) {
                onPostDeleted(post.id);
            }
        } catch (error) {
            console.error('Failed to delete post: ', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to delete the post. Please try again.',
            });
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Link 
                    href={`/#${post.id}`} 
                    className="group block p-5 rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 hover:shadow-lg hover:shadow-[#ffa600]/20 hover:border-[#ffa600]/50 transition-all duration-300 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#ffa600]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 mb-3">
                                <Flame className="h-4 w-4 text-red-500" />
                                {post.isAnonymous ? (
                                  <p className="text-sm font-medium text-muted-foreground">Anonymous</p>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <p 
                                      className="text-sm font-medium text-muted-foreground hover:text-[#ffa600] transition-colors cursor-pointer"
                                      style={authorNameStyle}
                                    >
                                      @{post.author?.username || 'unknown'}
                                    </p>
                                  </div>
                                )}
                            </div>
                            {user && user.uid === post.authorId && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                            <MoreHorizontal className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenuItem onSelect={() => setShowDeleteConfirm(true)} className="text-red-500">
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                        
                        <p className="font-medium text-foreground/90 group-hover:text-foreground transition-colors leading-relaxed">
                            {post.content}
                        </p>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground mt-4 pt-3 border-t border-border/50">
                            <div className="flex items-center gap-2 group-hover:text-[#ffa600] transition-colors">
                                <Flame className="h-4 w-4"/>
                                <span className="font-medium">{post.likes}</span>
                                <span>Likes</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4"/>
                                <span className="font-medium">{post.comments}</span>
                                <span>Comments</span>
                            </div>
                        </div>
                    </div>
                </Link>
            </motion.div>
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your post.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeletePost(); }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const MostFollowedCard = ({ user, currentUser, onFollowToggle, onSelectUser }) => {
    const { toast } = useToast();
    const [userWithStyles, setUserWithStyles] = useState<any>(user);
    
    // Fetch user profile to get style data
    useEffect(() => {
      const fetchUserStyles = async () => {
        try {
          const profile = await getUserProfile(user.id);
          if (profile) {
            setUserWithStyles(profile);
          }
        } catch (error) {
          console.error("Error fetching user styles:", error);
        }
      };
      
      fetchUserStyles();
    }, [user.id]);

    const nameStyle = getStyledName(userWithStyles);
    const styleDescription = getStyleDescription(userWithStyles);

    const handleFollow = () => {
        if (currentUser && currentUser.id !== user.id) {
            followUser(currentUser.id, user.id);
            onFollowToggle(user.id);
            toast({ 
              title: 'Followed!', 
              description: `You are now following @${user.username}.` 
            });
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-5 hover:shadow-lg hover:shadow-[#ffa600]/20 hover:border-[#ffa600]/50 transition-all duration-300"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-[#ffa600]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4 cursor-pointer flex-1" onClick={() => onSelectUser(user.id)}>
                    <Avatar className="h-12 w-12 ring-2 ring-background group-hover:ring-[#ffa600]/50 transition-all">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="bg-[#ffa600] text-black font-semibold">
                            {user.name.substring(0,1).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p 
                          className="text-sm font-semibold leading-none"
                          style={nameStyle}
                        >
                          {user.name}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">@{user.username}</p>
                        
                        {/* Show style info if not default */}
                        {styleDescription && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              <Palette className="h-2 w-2" />
                              <span>{styleDescription}</span>
                              {userWithStyles.nameEffect === 'gradient' && (
                                <Sparkles className="h-2 w-2 text-purple-500" />
                              )}
                              {userWithStyles.nameEffect === 'moving-gradient' && (
                                <Sparkles className="h-2 w-2 text-purple-500 animate-pulse" />
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="font-bold text-[#ffa600] text-lg">
                            {user.followers?.length || 0}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Followers
                        </p>
                    </div>
                    {currentUser && currentUser.id !== user.id && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleFollow}
                            className="hover:bg-[#ffa600] hover:text-black hover:border-[#ffa600] transition-all"
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Follow
                        </Button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default function TrendingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chirpers');
  const [direction, setDirection] = useState(0);
  const [topChirpers, setTopChirpers] = useState<User[]>([]);
  const [hotPosts, setHotPosts] = useState([]);
  const [mostFollowed, setMostFollowed] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        const chirpers = await getTopChirpers();
        const posts = await getHotPosts();
        const followed = await getMostFollowedUsers();
        
        setTopChirpers(chirpers);
        setHotPosts(posts);
        setMostFollowed(followed);
    };

    fetchData();
}, [user?.chirpScore]); // Re-fetch leaderboard when local user score changes

  const handleFollowToggle = (userId: string) => {
    setMostFollowed(prevUsers =>
      prevUsers.map(u =>
        u.id === userId
          ? { ...u, followers: [...(u.followers || []), user.uid] }
          : u
      )
    );
    setTopChirpers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId
            ? { ...u, followers: [...(u.followers || []), user.uid] }
            : u
        )
      );
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleClosePreview = () => {
      setSelectedUserId(null);
  };
  
  const handlePostDeleted = (postId: string) => {
    setHotPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
  };

  const TABS = ['chirpers', 'posts', 'followed'];

  const handleTabChange = (newTab: string) => {
      const oldIndex = TABS.indexOf(activeTab);
      const newIndex = TABS.indexOf(newTab);
      setDirection(newIndex > oldIndex ? 1 : -1);
      setActiveTab(newTab);
  };

  const getActiveTabContent = () => {
      switch(activeTab) {
          case 'chirpers':
              const top3 = topChirpers.slice(0, 3);
              const rest = topChirpers.slice(3);
              return (
                  <div className="space-y-6">
                      <Podium topChirpers={top3} onSelectUser={handleSelectUser} />
                      <div className="flex flex-col gap-3 px-4 pb-4">
                          {rest.map((chirper, idx) => (
                              <ChirperCard 
                                  key={chirper.id} 
                                  chirper={chirper} 
                                  currentUser={user} 
                                  onFollowToggle={handleFollowToggle} 
                                  onSelectUser={handleSelectUser}
                              />
                          ))}
                      </div>
                  </div>
              );
          case 'posts':
              return (
                  <div className="flex flex-col gap-3 p-4">
                      {hotPosts.map((post, idx) => (
                          <HotPostCard key={post.id} post={post} onPostDeleted={handlePostDeleted} />
                      ))}
                  </div>
              );
          case 'followed':
              return (
                  <div className="flex flex-col gap-3 p-4">
                      {mostFollowed.map((u, idx) => (
                          <MostFollowedCard 
                              key={u.id} 
                              user={u} 
                              currentUser={user} 
                              onFollowToggle={handleFollowToggle} 
                              onSelectUser={handleSelectUser}
                          />
                      ))}
                  </div>
              );
          default:
              return null;
      }
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      position: 'absolute',
      width: '100%'
    }),
    center: {
      x: 0,
      opacity: 1,
      position: 'relative',
      width: '100%'
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      position: 'absolute',
      width: '100%'
    }),
  };

  return (
    <AppLayout>
        <PageTransition>
            <div className="space-y-6">
                <Card className="border-border/50 shadow-lg bg-gradient-to-br from-background via-background to-muted/20">
                    <CardHeader className="space-y-3 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#ffa600]/20 border border-[#ffa600]/30">
                                <TrendingUp className="h-6 w-6 text-[#ffa600]" />
                            </div>
                            <div>
                                <CardTitle className="text-3xl font-bold text-[#ffa600]">
                                    Trending on Chirp
                                </CardTitle>
                                <CardDescription className="mt-2 text-base">
                                    Discover the most popular users and posts. Your <strong>ChirpScore</strong> represents your influence—earn it by engaging, and use it (200 pts) to unlock and lead your own community!
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className='p-0'>
                        <Tabs value={activeTab} onValueChange={handleTabChange}>
                            <div className="px-4 pb-4">
                                <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 backdrop-blur relative">
                                    <TabsTrigger 
                                        value="chirpers" 
                                        className="relative z-10 data-[state=active]:text-black transition-colors"
                                    >
                                        <Crown className="h-4 w-4 mr-2" />
                                        Top Chirpers
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="posts"
                                        className="relative z-10 data-[state=active]:text-black transition-colors"
                                    >
                                        <Flame className="h-4 w-4 mr-2" />
                                        Hot Posts
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="followed"
                                        className="relative z-10 data-[state=active]:text-black transition-colors"
                                    >
                                        <Users className="h-4 w-4 mr-2" />
                                        Most Followed
                                    </TabsTrigger>
                                    <motion.div
                                        className="absolute inset-y-1 bg-gradient-to-r from-[#ffa600] via-[#ff6b00] to-[#ff8c00] rounded-md shadow-md shadow-[#ffa600]/20"
                                        layout
                                        transition={{
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 35
                                        }}
                                        style={{
                                            width: `calc(33.333% - 8px)`,
                                            left: activeTab === 'chirpers' ? '4px' : activeTab === 'posts' ? 'calc(33.333% + 4px)' : 'calc(66.666% + 4px)'
                                        }}
                                    />
                                </TabsList>
                            </div>
                            <div className="relative min-h-[400px] overflow-hidden">
                                <AnimatePresence initial={false} custom={direction} mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        custom={direction}
                                        variants={variants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{
                                            x: { type: "spring", stiffness: 300, damping: 30 },
                                            opacity: { duration: 0.2 }
                                        }}
                                    >
                                        {getActiveTabContent()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
                <ChirpScore />
            </div>
        </PageTransition>
        {selectedUserId && (
            <ProfilePreviewCard userId={selectedUserId} onOpenChange={handleClosePreview} />
        )}
        <style jsx global>{`
            @keyframes gradientMove {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
          `}</style>
    </AppLayout>
  );
}