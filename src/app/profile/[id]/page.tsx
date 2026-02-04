"use client";
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

import AppLayout from '@/components/app-layout';
import PageTransition from '@/components/page-transition';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PostCard } from '@/components/post-card';
import { PostDialog } from '@/components/post-dialog';
import CommentCard from '@/components/comment-card';
import { useAuth } from '@/hooks/use-auth';
import { 
    getUserProfile, 
    getPostsByUserId, 
    followUser, 
    unfollowUser, 
    getLikedPosts, 
    getCommentsByUserId, 
    getUserAchievements
} from '@/services/firebase';
import type { UserProfile, Post, Comment } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { EditProfileDialog } from '@/components/edit-profile-dialog';
import { Camera, CalendarDays, Briefcase, Link as LinkIcon, Users, UserPlus, MessageCircle, Trophy, Heart, MessageSquare, Crown, Palette, Sparkles } from 'lucide-react';
import { achievementList, type Achievement } from '@/config/achievements';
import { AchievementCard } from '@/components/achievement-card';
import Link from 'next/link';

const ProfileSkeleton = () => (
    <div className="space-y-6">
        <div className="flex items-center space-x-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
            </div>
        </div>
        <div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mt-2" />
        </div>
        <div className="flex space-x-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
        </div>
        <Separator />
        <div className="grid grid-cols-5 gap-4 text-center">
            {[...Array(5)].map((_, i) => (
                <div key={i}>
                    <Skeleton className="h-6 w-10 mx-auto" />
                    <Skeleton className="h-4 w-16 mx-auto mt-2" />
                </div>
            ))}
        </div>
    </div>
);

const PostSkeleton = () => (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 p-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-around w-full border-t p-2 mt-4">
         <Skeleton className="h-8 w-24" />
         <Skeleton className="h-8 w-24" />
         <Skeleton className="h-8 w-24" />
      </CardFooter>
    </Card>
  );

const AchievementSkeleton = () => (
    <Card className="flex items-center p-4 space-x-4">
        <Skeleton className="h-16 w-16" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    </Card>
)

// FIXED: Properly extract style from profile
const getStyledName = (profile: UserProfile | null) => {
  if (!profile) return {};
  
  const style: React.CSSProperties = {
    fontFamily: profile.nameFont || 'PT Sans, sans-serif',
  };

  if (profile.nameEffect === 'none') {
    style.color = profile.nameColor || '#ff990a';
  } else if (profile.nameEffect === 'gradient') {
    style.backgroundImage = profile.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
  } else if (profile.nameEffect === 'moving-gradient') {
    style.backgroundImage = profile.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
    style.backgroundSize = '200% 200%';
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
    style.animation = 'gradientMove 3s ease infinite';
  }

  return style;
};

// Helper to get style description
const getStyleDescription = (profile: UserProfile | null) => {
  if (!profile) return null;
  
  if (!profile.nameFont && !profile.nameColor) return null;
  
  const fontName = profile.nameFont?.split(',')[0] || 'Default';
  const effect = profile.nameEffect || 'none';
  
  let effectText = '';
  if (effect === 'gradient') effectText = 'with gradient';
  if (effect === 'moving-gradient') effectText = 'with animated gradient';
  
  return `${fontName} font ${effectText}`;
};

export default function ProfilePage() {
    const { user: currentUser } = useAuth();
    const params = useParams();
    const userId = params.id as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [likedPosts, setLikedPosts] = useState<Post[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFriend, setIsFriend] = useState(false);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');
    const [direction, setDirection] = useState(0);
    const [isSwitchingTabs, setIsSwitchingTabs] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    const TABS = ['posts', 'achievements', 'likes', 'comments'];

    const handleTabChange = (newTab: string) => {
        const oldIndex = TABS.indexOf(activeTab);
        const newIndex = TABS.indexOf(newTab);
        setDirection(newIndex > oldIndex ? 1 : -1);
        setActiveTab(newTab);
        setIsSwitchingTabs(true);
    };

    const fetchProfileData = useCallback(async () => {
        setLoading(true);
        try {
            const userProfile = await getUserProfile(userId);
            if (userProfile) {
                setProfile(userProfile);
                const [userPosts, userLikedPosts, userComments, userAchievements] = await Promise.all([
                    getPostsByUserId(userId),
                    getLikedPosts(userId),
                    getCommentsByUserId(userId),
                    getUserAchievements(userId)
                ]);
                setPosts(userPosts);
                setLikedPosts(userLikedPosts);
                setComments(userComments);
                setAchievements(userAchievements);
            }
        } catch (error) {
            console.error("Error fetching profile data:", error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    useEffect(() => {
        if (currentUser && profile) {
            setIsOwnProfile(currentUser.uid === profile.id);
            setIsFollowing(profile.followers?.includes(currentUser.uid) || false);
            setIsFriend(profile.friends?.includes(currentUser.uid) || false);
        }
    }, [currentUser, profile]);

    const handleFollow = async () => {
        if (!currentUser || !profile) return;
        if (isFollowing) {
            await unfollowUser(currentUser.uid, profile.id);
            setProfile(p => p ? { ...p, followers: p.followers.filter(uid => uid !== currentUser.uid) } : null);
        } else {
            await followUser(currentUser.uid, profile.id);
            setProfile(p => p ? { ...p, followers: [...p.followers, currentUser.uid] } : null);
        }
        setIsFollowing(!isFollowing);
    };

    const handleProfileUpdate = async (updatedProfile: Partial<UserProfile>) => {
        setProfile(p => p ? { ...p, ...updatedProfile } : null);
        try {
            const [userPosts, userComments] = await Promise.all([
                getPostsByUserId(userId),
                getCommentsByUserId(userId)
            ]);
            setPosts(userPosts);
            setComments(userComments);
        } catch (error) {
            console.error("Failed to refresh posts/comments after profile update:", error);
        }
    };

    const handleCommentClick = (post: Post) => {
        setSelectedPost(post);
    };

    const creationDate = profile?.creationTime
        ? new Date(profile.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        : 'Not available';

    const variants = {
        enter: (direction: number) => ({
          x: direction > 0 ? '100%' : '-100%',
          opacity: 0,
          position: 'absolute',
          width: '100%',
        }),
        center: {
          x: 0,
          opacity: 1,
          position: 'relative',
          width: '100%',
        },
        exit: (direction: number) => ({
          x: direction < 0 ? '100%' : '-100%',
          opacity: 0,
          position: 'absolute',
          width: '100%',
        }),
      };

      const getActiveTabContent = () => {
        switch (activeTab) {
          case 'posts':
            return posts.length > 0 
                ? posts.map(post => <PostCard key={post.id} post={post} />)
                : <p className="text-center text-muted-foreground py-16">This user hasn\'t posted anything yet.</p>;
          case 'achievements':
            return achievements.length > 0
                ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Badges</CardTitle>
                            <CardDescription>Badges earned on Chirp.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {achievements.map(ach => <AchievementCard key={ach.title} {...ach} />)}
                        </CardContent>
                    </Card>
                )
                : <p className="text-center text-muted-foreground py-16">This user has no Badges yet.</p>;
          case 'likes':
            return likedPosts.length > 0 
                ? likedPosts.map(post => <PostCard key={post.id} post={post} />)
                : <p className="text-center text-muted-foreground py-16">This user hasn\'t liked any posts yet.</p>;
          case 'comments':
            return comments.length > 0 
                ? comments.map(comment => (
                    <div key={comment.id} className="mb-4">
                      <CommentCard comment={comment} onCommentClick={handleCommentClick}/>
                    </div>
                  ))
                : <p className="text-center text-muted-foreground py-16">This user has no comments yet.</p>;
          default:
            return null;
        }
      };


    if (loading) {
        return (
            <AppLayout>
                <PageTransition>
                    <ProfileSkeleton />
                </PageTransition>
            </AppLayout>
        )
    }

    if (!profile) {
        return (
            <AppLayout>
                <PageTransition>
                    <div className="text-center py-16">
                        <h2 className="text-2xl font-bold">Profile not found</h2>
                        <p className="text-muted-foreground">This user may not exist or has been suspended.</p>
                    </div>
                </PageTransition>
            </AppLayout>
        );
    }

    const nameStyle = getStyledName(profile);
    const styleDescription = getStyleDescription(profile);

    return (
        <AppLayout>
          <PageTransition>
          <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-start space-x-0 md:space-x-6">
                <div 
                    className={`relative group ${isOwnProfile ? 'cursor-pointer' : ''}`}
                    onClick={() => isOwnProfile && setIsEditDialogOpen(true)}
                >
                    <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-md transition-all group-hover:ring-4 group-hover:ring-primary/20">
                        <AvatarImage src={profile.avatarUrl || 'https://placehold.co/100x100.png'} alt={profile.displayName} />
                        <AvatarFallback>{profile.displayName?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="h-8 w-8 text-white" />
                        </div>
                    )}
                </div>
                <div className="flex-1 mt-4 md:mt-0">
                    <div className="flex items-center justify-between">
                    
<div>
  <h1 
    className="text-3xl font-bold mb-1"
    style={nameStyle}
  >
    {profile.displayName || profile.name || profile.username}
  </h1>
  <p className="text-muted-foreground mb-2">@{profile.username}</p>
  
  {/* Show style info if not default */}
  {styleDescription && (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
        <Palette className="h-3 w-3" />
        <span>{styleDescription}</span>
        {profile.nameEffect === 'gradient' && (
          <Sparkles className="h-3 w-3 text-purple-500 ml-1" />
        )}
        {profile.nameEffect === 'moving-gradient' && (
          <Sparkles className="h-3 w-3 text-purple-500 ml-1 animate-pulse" />
        )}
      </div>
    </div>
  )}
</div>
                        {isOwnProfile ? (
                          <div className="flex items-center gap-2">
                            <Link href="/equip">
                              <Button variant="outline" className="flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                Manage Styles
                              </Button>
                            </Link>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>Edit Profile</Button>
                          </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Button variant={isFollowing ? 'secondary' : 'default'} onClick={handleFollow}>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    {isFollowing ? 'Following' : 'Follow'}
                                </Button>
                                {isFriend ? (
                                    <Button variant="outline">
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        Chat
                                    </Button>
                                ) : (
                                    <Button variant="outline">
                                        <Users className="h-4 w-4 mr-2" />
                                        Add Friend
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                    {profile.bio && <p className="mt-4 text-foreground">{profile.bio}</p>}
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground text-sm">
                        {profile.occupation && (
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                <span>{profile.occupation}</span>
                            </div>
                        )}
                        {profile.website && (
                             <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                                <LinkIcon className="h-4 w-4" />
                                <span>{profile.website.replace(/^(https?:\/\/)?(www\.)?/, '')}</span>
                            </a>
                        )}
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>Joined {creationDate}</span>
                        </div>
                    </div>
                 </div>
            </div>

            <Separator />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
               <div className="p-2 rounded-lg transition-colors hover:bg-muted">
                   <p className="font-bold text-lg">{posts.length}</p>
                   <p className="text-sm text-muted-foreground">Chirps</p>
               </div>
               <div className="p-2 rounded-lg transition-colors hover:bg-muted">
                   <p className="font-bold text-lg">{profile?.following?.length || 0}</p>
                   <p className="text-sm text-muted-foreground">Following</p>
               </div>
                <div className="p-2 rounded-lg transition-colors hover:bg-muted">
                   <p className="font-bold text-lg">{profile?.followers?.length || 0}</p>
                   <p className="text-sm text-muted-foreground">Followers</p>
               </div>
               <div className="p-2 rounded-lg transition-colors hover:bg-muted">
                    <p className="font-bold text-lg">{likedPosts.length}</p>
                    <p className="text-sm text-muted-foreground">Likes</p>
                </div>
                <div className="p-2 rounded-lg transition-colors hover:bg-muted">
                    <p className="font-bold text-lg">{comments.length}</p>
                    <p className="text-sm text-muted-foreground">Comments</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="posts" isActive={activeTab === 'posts'}>Posts</TabsTrigger>
                    <TabsTrigger value="achievements" isActive={activeTab === 'achievements'}>Badges</TabsTrigger>
                    <TabsTrigger value="likes" isActive={activeTab === 'likes'}>Likes</TabsTrigger>
                    <TabsTrigger value="comments" isActive={activeTab === 'comments'}>Comments</TabsTrigger>
                </TabsList>
                <div className="relative mt-4 min-h-[300px]">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={activeTab}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: 'spring', stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 },
                            }}
                            className="space-y-4"
                            onAnimationComplete={() => setIsSwitchingTabs(false)}
                        >
                            {isSwitchingTabs ? (
                                <>
                                    {activeTab === 'posts' && <><PostSkeleton /><PostSkeleton /></>}
                                    {activeTab === 'achievements' && <><AchievementSkeleton /><AchievementSkeleton /></>}
                                    {activeTab === 'likes' && <><PostSkeleton /><PostSkeleton /></>}
                                    {activeTab === 'comments' && <><PostSkeleton /><PostSkeleton /></>}
                                </>
                            ) : (
                                getActiveTabContent()
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </Tabs>
          </div>
          {isOwnProfile && profile && (
            <EditProfileDialog
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              user={profile}
              onProfileUpdate={handleProfileUpdate}
            />
          )}
          {selectedPost && (
              <PostDialog post={selectedPost} onOpenChange={() => setSelectedPost(null)} />
          )}
          </PageTransition>
          <style jsx global>{`
            @keyframes gradientMove {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
          `}</style>
        </AppLayout>
      );
    }