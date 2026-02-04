'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Quote, Users, Palette, Sparkles } from 'lucide-react';
import { followUser, unfollowUser, db, sendFriendRequest, getUserProfile } from '@/services/firebase';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

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
    style.animation = 'gradientMove 3s ease infinite';
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

export function ProfilePreviewCard({ userId, onOpenChange }) {
  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      // First fetch the user profile directly to get immediate data
      const fetchProfile = async () => {
        try {
          const profile = await getUserProfile(userId);
          if (profile) {
            setUserProfile(profile);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchProfile();
      
      // Then set up real-time listener
      const unsub = onSnapshot(doc(db, 'users', userId), (doc) => {
        if (doc.exists()) {
          setUserProfile({ id: doc.id, ...doc.data() });
        }
        setLoading(false);
      });
      
      return () => unsub();
    }
  }, [userId]);

  useEffect(() => {
    if (authUser?.uid) {
      const unsub = onSnapshot(doc(db, 'users', authUser.uid), (doc) => {
        if (doc.exists()) {
          setCurrentUserProfile({ id: doc.id, ...doc.data() });
        }
      });
      return () => unsub();
    }
  }, [authUser?.uid]);

  useEffect(() => {
    if (currentUserProfile && userProfile) {
      setIsFollowing(currentUserProfile.following?.includes(userProfile.id));
      setIsFriend(currentUserProfile.friends?.includes(userProfile.id));
      setIsRequestSent(userProfile.friendRequests?.includes(currentUserProfile.id));
    }
  }, [currentUserProfile, userProfile]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => onOpenChange(false), 300);
  };

  const handleFollow = async () => {
    if (!authUser || !userProfile) return;

    if (isFollowing) {
      await unfollowUser(authUser.uid, userId);
    } else {
      await followUser(authUser.uid, userId);
    }
  };

  const handleAddFriend = async () => {
    if (!authUser) return;
    await sendFriendRequest(authUser.uid, userId);
  };

  if (loading) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-background rounded-xl shadow-2xl p-8 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center">
                <div className="h-24 w-24 rounded-full bg-muted animate-pulse mb-4"></div>
                <div className="h-4 w-32 bg-muted rounded animate-pulse mb-2"></div>
                <div className="h-3 w-24 bg-muted rounded animate-pulse mb-6"></div>
                <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (!userProfile) {
    return null;
  }

  const { name, username, avatarUrl, followers, bio, following, nameFont, nameColor, nameEffect } = userProfile;
  const fallback = name?.substring(0, 2).toUpperCase() || 'U';
  const nameStyle = getStyledName(userProfile);
  const styleDescription = getStyleDescription(userProfile);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <style jsx global>{`
            @keyframes gradientMove {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
          `}</style>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-background via-background to-muted/10 border-2 border-[#ffa600]/20 rounded-xl shadow-2xl p-6 max-w-sm w-full relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button 
                onClick={handleClose} 
                className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-[#ffa600]/10 transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* Decorative corner */}
              <div className="absolute -top-8 -right-8 h-20 w-20 bg-gradient-to-br from-[#ffa600] to-transparent rounded-full opacity-10"></div>
              
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Avatar with click handler */}
                <motion.div 
                  className="relative group cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Avatar className="h-24 w-24 mb-2 border-4 border-background shadow-lg group-hover:border-[#ffa600] transition-all">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-[#ffa600] to-orange-600 text-white font-bold text-2xl">
                      {fallback}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                
                {/* Name with styling */}
                <div className="space-y-1">
                  <h2 
                    className="text-2xl font-bold tracking-tight"
                    style={nameStyle}
                  >
                    {name}
                  </h2>
                  <p className="text-sm text-muted-foreground">@{username}</p>
                  
                  {/* Show style info if not default */}
                  {styleDescription && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        <Palette className="h-3 w-3" />
                        <span>{styleDescription}</span>
                        {nameEffect === 'gradient' && (
                          <Sparkles className="h-3 w-3 text-purple-500" />
                        )}
                        {nameEffect === 'moving-gradient' && (
                          <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Bio */}
                {bio && (
                  <div className="relative w-full bg-gradient-to-r from-transparent via-[#ffa600]/5 to-transparent p-4 rounded-lg">
                    <Quote className="h-4 w-4 text-[#ffa600] absolute left-2 top-2" />
                    <p className="text-sm text-foreground px-6 py-2">
                      {bio}
                    </p>
                    <Quote className="h-4 w-4 text-[#ffa600] absolute right-2 bottom-2 transform rotate-180" />
                  </div>
                )}
                
                {/* Stats */}
                <div className="flex items-center justify-center space-x-8 w-full py-4 border-y border-[#ffa600]/10">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-[#ffa600]" />
                      <p className="font-bold text-lg">{followers?.length || 0}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </div>
                  <div className="h-6 w-px bg-[#ffa600]/20" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-[#ffa600]" />
                      <p className="font-bold text-lg">{following?.length || 0}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Following</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col w-full space-y-3 pt-2">
                  {authUser?.uid !== userId && (
                    <>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={handleFollow}
                          className="w-full bg-gradient-to-r from-[#ffa600] via-[#ff9500] to-[#ffa600] text-black font-bold hover:shadow-lg hover:shadow-[#ffa600]/30 transition-all"
                          size="lg"
                        >
                          {isFollowing ? '✓ Following' : `Follow ${name?.split(' ')[0] || name}`}
                        </Button>
                      </motion.div>
                      
                      {isFriend ? (
                        <Link href={`/chat/${userId}`} passHref className="w-full">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button 
                              className="w-full border-[#ffa600] text-[#ffa600] hover:bg-[#ffa600]/10 font-medium" 
                              variant="outline" 
                              size="lg"
                            >
                              💬 Message
                            </Button>
                          </motion.div>
                        </Link>
                      ) : (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={handleAddFriend}
                            disabled={isRequestSent}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold hover:shadow-lg transition-all"
                            variant="default"
                            size="lg"
                          >
                            {isRequestSent ? '✓ Request Sent' : '🤝 Add Friend'}
                          </Button>
                        </motion.div>
                      )}
                    </>
                  )}
                  
                  <div className="flex gap-3 pt-2">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button 
                        onClick={handleClose} 
                        className="w-full bg-muted hover:bg-muted/80" 
                        variant="ghost" 
                        size="lg"
                      >
                        Close
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Link href={`/profile/${userId}`} passHref className="w-full">
                        <Button 
                          className="w-full bg-gradient-to-r from-[#ffa600] to-orange-600 hover:from-orange-600 hover:to-[#ffa600] text-white font-bold hover:shadow-lg transition-all"
                          size="lg"
                        >
                          View Profile
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}