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
import { 
    Camera, 
    CalendarDays, 
    Briefcase, 
    Link as LinkIcon, 
    Users, 
    UserPlus, 
    MessageCircle, 
    Trophy, 
    Heart, 
    MessageSquare, 
    Crown, 
    Palette, 
    Sparkles,
    MapPin,
    Settings,
    Image as ImageIcon,
    Video,
    Smile
} from 'lucide-react';
import { achievementList, type Achievement } from '@/config/achievements';
import { AchievementCard } from '@/components/achievement-card';
import Link from 'next/link';

// Animation variants from second code
const nebulaOrbitVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

const starPulseVariants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const glitchVariants = {
  animate: {
    x: [0, -2, 2, -2, 2, 0],
    y: [0, 1, -1, 1, -1, 0],
    transition: {
      duration: 0.3,
      repeat: Infinity,
      repeatDelay: 3,
      ease: "easeInOut"
    }
  }
};

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

// Updated getStyledName function with nebula and glitch effects
const getStyledName = (profile: UserProfile | null) => {
  if (!profile) return {};
  
  const style: React.CSSProperties = {
    fontFamily: profile.nameFont || 'PT Sans, sans-serif',
    position: 'relative' as const,
    zIndex: 10,
  };

  const colorValue = profile.nameColor || '#ff990a';
  const effect = profile.nameEffect || 'none';

  if (effect === 'none') {
    style.color = colorValue;
  } else if (effect === 'gradient') {
    style.backgroundImage = colorValue;
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
  } else if (effect === 'moving-gradient') {
    style.backgroundImage = colorValue;
    style.backgroundSize = '200% 200%';
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
    style.animation = 'gradientMove 3s ease infinite';
  } else if (effect === 'nebula') {
    style.color = colorValue;
    style.textShadow = '0 0 20px rgba(138, 43, 226, 0.8), 0 0 40px rgba(75, 0, 130, 0.6)';
  } else if (effect === 'glitch') {
    style.color = colorValue;
    style.textShadow = '1px 0 #00ff00, -1px 0 #ff00ff';
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
  if (effect === 'nebula') effectText = 'with nebula effect';
  if (effect === 'glitch') effectText = 'with glitch effect';
  
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
                : <p className="text-center text-muted-foreground py-16">This user hasn't posted anything yet.</p>;
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
                : <p className="text-center text-muted-foreground py-16">This user hasn't liked any posts yet.</p>;
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
    const hasNebulaEffect = profile.nameEffect === 'nebula';
    const hasGlitchEffect = profile.nameEffect === 'glitch';
    const fallback = profile.displayName?.substring(0, 2).toUpperCase() || 'U';

    return (
        <AppLayout>
          <PageTransition>
          <div className="space-y-6">
            {/* Profile Header Card with Effects */}
            <Card className="overflow-hidden border-2 border-[#ffa600]/20 relative">
              {/* Nebula Effect Background */}
              {hasNebulaEffect && (
                <>
                  {/* Spinning Vortex Rings */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={`vortex-ring-${i}`}
                      animate={{
                        rotate: 360,
                        scale: [1, 1.1, 1],
                        opacity: [0.2, 0.4, 0.2],
                      }}
                      transition={{
                        rotate: {
                          duration: 10 - i * 2,
                          repeat: Infinity,
                          ease: 'linear',
                        },
                        scale: {
                          duration: 4,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.3,
                        },
                        opacity: {
                          duration: 4,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.3,
                        },
                      }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        width: `${200 + i * 80}px`,
                        height: `${200 + i * 80}px`,
                        border: '2px solid',
                        borderColor: `rgba(147, 112, 219, ${0.3 - i * 0.08})`,
                        borderRadius: '50%',
                        filter: 'blur(2px)',
                      }}
                    />
                  ))}
                  
                  {/* Central Glowing Core */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      width: '150px',
                      height: '150px',
                      background: 'radial-gradient(circle, rgba(138, 43, 226, 0.6) 0%, rgba(147, 112, 219, 0.3) 40%, transparent 70%)',
                      borderRadius: '50%',
                      filter: 'blur(15px)',
                    }}
                  />

                  {/* Spiraling Energy Particles */}
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={`spiral-${i}`}
                      animate={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: 'linear',
                        delay: i * 0.1,
                      }}
                      className="absolute left-1/2 top-1/2 pointer-events-none"
                      style={{
                        transformOrigin: '0 0',
                      }}
                    >
                      <motion.div
                        animate={{
                          scale: [0, 0.6, 0],
                          opacity: [0, 0.5, 0],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: 'easeOut',
                          delay: i * 0.1,
                        }}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: `radial-gradient(circle, rgba(${147 + i * 2}, ${112 + i}, 219, 0.7) 0%, transparent 70%)`,
                          transform: `translateX(${80 + i * 15}px)`,
                          filter: 'blur(1px)',
                        }}
                      />
                    </motion.div>
                  ))}
                </>
              )}

              {/* Glitch Effect */}
              {hasGlitchEffect && (
                <>
                  {/* Enhanced Animated Glitch Layers */}
                  <motion.div
                    animate={{
                      x: [0, -5, 5, -3, 3, 0],
                      y: [0, 2, -2, 1, -1, 0],
                      opacity: [0, 0.6, 0.4, 0.8, 0.3, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(45deg, transparent 0%, rgba(255, 0, 0, 0.4) 50%, transparent 100%)',
                      mixBlendMode: 'screen',
                      filter: 'blur(1px)',
                    }}
                  />
                  
                  {/* Horizontal Scan Lines */}
                  {[...Array(10)].map((_, i) => (
                    <motion.div
                      key={`scanline-${i}`}
                      animate={{
                        x: ['-100%', '200%'],
                        opacity: [0, 0.8, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'linear',
                        repeatDelay: 1,
                      }}
                      className="absolute pointer-events-none"
                      style={{
                        top: `${i * 10}%`,
                        width: '50%',
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.8), transparent)',
                        filter: 'blur(0.5px)',
                      }}
                    />
                  ))}

                  {/* Binary Rain Effect */}
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={`binary-rain-${i}`}
                      animate={{
                        y: [-50, 400],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: Math.random() * 3 + 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: 'linear',
                      }}
                      className="absolute text-xs font-mono pointer-events-none"
                      style={{
                        left: `${5 + i * 4.5}%`,
                        color: Math.random() > 0.5 ? '#00ff00' : '#00ffff',
                        textShadow: '0 0 5px currentColor',
                        fontWeight: 'bold',
                      }}
                    >
                      {Array.from({ length: 4 }, () => Math.random() > 0.5 ? '1' : '0').join('')}
                    </motion.div>
                  ))}

                  {/* Digital Noise Blocks */}
                  {[...Array(25)].map((_, i) => (
                    <motion.div
                      key={`noise-block-${i}`}
                      animate={{
                        x: [0, Math.random() * 15 - 7.5],
                        y: [0, Math.random() * 8 - 4],
                        opacity: [0, 0.9, 0],
                        scale: [1, 1.3, 1],
                      }}
                      transition={{
                        duration: 0.25,
                        repeat: Infinity,
                        delay: i * 0.15,
                        repeatDelay: 1.5,
                      }}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${Math.random() * 95}%`,
                        top: `${Math.random() * 95}%`,
                        width: `${Math.random() * 35 + 5}px`,
                        height: `${Math.random() * 5 + 2}px`,
                        background: Math.random() > 0.5 
                          ? 'rgba(0, 255, 0, 0.8)' 
                          : Math.random() > 0.5 
                          ? 'rgba(255, 0, 255, 0.8)' 
                          : 'rgba(255, 0, 0, 0.8)',
                        borderRadius: '2px',
                        filter: 'blur(0.5px)',
                      }}
                    />
                  ))}
                </>
              )}

              <CardContent className="p-0 relative z-10">
                {/* Cover Image */}
                <div className="h-48 bg-gradient-to-r from-[#ffa600] via-orange-500 to-[#ffa600] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50"></div>
                </div>

                {/* Profile Info */}
                <div className="px-6 pb-6">
                  {/* Avatar */}
                  <div className="relative -mt-16 mb-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="relative inline-block"
                    >
                      {/* Avatar effects */}
                      {hasNebulaEffect && (
                        <motion.div
                          animate={{
                            rotate: 360,
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            rotate: {
                              duration: 15,
                              repeat: Infinity,
                              ease: 'linear',
                            },
                            scale: {
                              duration: 3,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            },
                          }}
                          className="absolute -inset-4 pointer-events-none"
                          style={{
                            background: 'conic-gradient(from 0deg, transparent, rgba(138, 43, 226, 0.4), rgba(75, 0, 130, 0.6), transparent)',
                            borderRadius: '50%',
                            filter: 'blur(10px)',
                          }}
                        />
                      )}

                      {hasGlitchEffect && (
                        <motion.div
                          animate={{
                            x: [-4, 4, -2, 2, 0],
                            y: [0, 2, -2, 1, -1],
                            opacity: [0, 0.3, 0, 0.2, 0],
                          }}
                          transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            repeatDelay: 2,
                          }}
                          className="absolute -inset-4 pointer-events-none"
                          style={{
                            background: 'radial-gradient(circle, transparent 30%, rgba(0, 255, 0, 0.3) 50%, transparent 70%)',
                            mixBlendMode: 'screen',
                            filter: 'blur(4px)',
                          }}
                        />
                      )}

                      <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                        <AvatarImage src={profile.avatarUrl || 'https://placehold.co/100x100.png'} alt={profile.displayName} />
                        <AvatarFallback className="bg-gradient-to-br from-[#ffa600] to-orange-600 text-white text-4xl font-bold">
                          {fallback}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>

                    {/* Action Buttons */}
                    <div className="absolute right-0 top-0 flex gap-2">
                      {!isOwnProfile && (
                        <>
                          <Button
                            onClick={handleFollow}
                            className={isFollowing ? "bg-muted" : "bg-[#ffa600] hover:bg-[#ff9500]"}
                            size="lg"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            {isFollowing ? 'Following' : 'Follow'}
                          </Button>
                          {isFriend ? (
                            <Button variant="outline" size="lg">
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Chat
                            </Button>
                          ) : (
                            <Button variant="outline" size="lg">
                              <Users className="h-4 w-4 mr-2" />
                              Add Friend
                            </Button>
                          )}
                        </>
                      )}

                      {isOwnProfile && (
                        <div className="flex items-center gap-2">
                          <Link href="/equip">
                            <Button variant="outline" className="flex items-center gap-2">
                              <Crown className="h-4 w-4" />
                              Manage Styles
                            </Button>
                          </Link>
                          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name and Username */}
                  <div className="space-y-1">
                    <div className="relative">
                      {/* Glitch text effect layers for name */}
                      {hasGlitchEffect && (
                        <>
                          <motion.span
                            animate={{
                              x: [-3, 3, -2, 2, 0],
                              opacity: [0, 0.4, 0, 0.3, 0],
                            }}
                            transition={{
                              duration: 0.1,
                              repeat: Infinity,
                              repeatDelay: 2,
                            }}
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              color: '#ff0000',
                              mixBlendMode: 'screen',
                              filter: 'blur(0.5px)',
                            }}
                          >
                            {profile.displayName || profile.name || profile.username}
                          </motion.span>
                          <motion.span
                            animate={{
                              x: [3, -3, 2, -2, 0],
                              y: [0, 1, -1, 0.5, -0.5],
                              opacity: [0, 0.4, 0, 0.3, 0],
                            }}
                            transition={{
                              duration: 0.1,
                              repeat: Infinity,
                              repeatDelay: 2,
                              delay: 0.05,
                            }}
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              color: '#00ffff',
                              mixBlendMode: 'screen',
                              filter: 'blur(0.5px)',
                            }}
                          >
                            {profile.displayName || profile.name || profile.username}
                          </motion.span>
                        </>
                      )}
                      <h1 
                        className="text-3xl font-bold relative"
                        style={nameStyle}
                      >
                        {profile.displayName || profile.name || profile.username}
                      </h1>
                    </div>
                    <p className="text-muted-foreground">@{profile.username}</p>
                    
                    {/* Show style info if not default */}
                    {styleDescription && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                          <Palette className="h-3 w-3" />
                          <span>{styleDescription}</span>
                          {profile.nameEffect === 'gradient' && (
                            <Sparkles className="h-3 w-3 text-purple-500 ml-1" />
                          )}
                          {profile.nameEffect === 'moving-gradient' && (
                            <Sparkles className="h-3 w-3 text-purple-500 ml-1 animate-pulse" />
                          )}
                          {profile.nameEffect === 'nebula' && (
                            <Sparkles className="h-3 w-3 text-purple-500 ml-1" />
                          )}
                          {profile.nameEffect === 'glitch' && (
                            <Sparkles className="h-3 w-3 text-green-500 ml-1" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="mt-4 text-foreground">{profile.bio}</p>
                  )}

                  {/* Location, Website, Joined */}
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground text-sm">
                      {profile.occupation && (
                          <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              <span>{profile.occupation}</span>
                          </div>
                      )}
                      {profile.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{profile.location}</span>
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

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
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
                </div>
              </CardContent>
            </Card>

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