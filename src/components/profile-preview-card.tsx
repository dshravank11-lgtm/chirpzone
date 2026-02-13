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

// Animation variants
const rotateVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

const floatingVariants = {
  animate: {
    y: [0, -5, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const getStyledName = (user: any) => {
  if (!user) return {};
  
  const style: React.CSSProperties = {
    fontFamily: user.nameFont || 'PT Sans, sans-serif',
    position: 'relative' as const,
    zIndex: 10,
  };

  const colorValue = user.nameColor || '#ff990a';
  const effect = user.nameEffect || 'none';

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

const getStyleDescription = (user: any) => {
  if (!user) return null;
  
  if (!user.nameFont && !user.nameColor && !user.nameEffect) return null;
  
  const fontName = user.nameFont?.split(',')[0] || 'Default';
  const effect = user.nameEffect || 'none';
  
  let effectText = '';
  if (effect === 'gradient') effectText = 'with gradient';
  if (effect === 'moving-gradient') effectText = 'with animated gradient';
  if (effect === 'nebula') effectText = 'with nebula effect';
  if (effect === 'glitch') effectText = 'with glitch effect';
  
  return `${fontName} font ${effectText}`;
};

interface ProfilePreviewCardProps {
  userId: string;
  onOpenChange: (open: boolean) => void;
}

export function ProfilePreviewCard({ userId, onOpenChange }: ProfilePreviewCardProps) {
  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
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

  // Get effect from user profile
  const nameEffect = userProfile?.nameEffect || 'none';
  const hasNebulaEffect = nameEffect === 'nebula';
  const hasGlitchEffect = nameEffect === 'glitch';

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

  const { name, username, avatarUrl, followers, bio, following, nameFont, nameColor } = userProfile;
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
              {/* Vortex Effect (replacing Nebula) */}
              {hasNebulaEffect && (
                <>
                  {/* Spinning Vortex Rings */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={`preview-vortex-ring-${i}`}
                      animate={{
                        rotate: 360,
                        scale: [1, 1.12, 1],
                        opacity: [0.25, 0.5, 0.25],
                      }}
                      transition={{
                        rotate: {
                          duration: 8 - i * 0.5,
                          repeat: Infinity,
                          ease: 'linear',
                        },
                        scale: {
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.25,
                        },
                        opacity: {
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.25,
                        },
                      }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        width: `${100 + i * 30}px`,
                        height: `${100 + i * 30}px`,
                        border: '2px solid',
                        borderColor: `rgba(147, 112, 219, ${0.4 - i * 0.05})`,
                        borderRadius: '50%',
                        filter: 'blur(2px)',
                        zIndex: 0,
                      }}
                    />
                  ))}
                  
                  {/* Central Glowing Core */}
                  <motion.div
                    animate={{
                      scale: [1, 1.25, 1],
                      opacity: [0.5, 0.9, 0.5],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      width: '120px',
                      height: '120px',
                      background: 'radial-gradient(circle, rgba(138, 43, 226, 0.7) 0%, rgba(147, 112, 219, 0.4) 40%, transparent 70%)',
                      borderRadius: '50%',
                      filter: 'blur(18px)',
                      zIndex: 0,
                    }}
                  />

                  {/* Spiraling Energy Particles */}
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={`preview-spiral-${i}`}
                      animate={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: 'linear',
                        delay: i * 0.2,
                      }}
                      className="absolute left-1/2 top-1/2 pointer-events-none"
                      style={{
                        transformOrigin: '0 0',
                        zIndex: 0,
                      }}
                    >
                      <motion.div
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 0.8, 0],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeOut',
                          delay: i * 0.15,
                        }}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: `radial-gradient(circle, rgba(${147 + i * 2}, ${112 + i}, 219, 0.9) 0%, transparent 70%)`,
                          transform: `translateX(${50 + i * 10}px)`,
                          filter: 'blur(1px)',
                        }}
                      />
                    </motion.div>
                  ))}

                  {/* Flowing Energy Waves */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={`preview-wave-${i}`}
                      animate={{
                        scale: [0.5, 2.3],
                        opacity: [0.5, 0],
                      }}
                      transition={{
                        duration: 3.5,
                        repeat: Infinity,
                        ease: 'easeOut',
                        delay: i * 1.2,
                      }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        width: '120px',
                        height: '120px',
                        border: '3px solid rgba(138, 43, 226, 0.5)',
                        borderRadius: '50%',
                        filter: 'blur(3px)',
                        zIndex: 0,
                      }}
                    />
                  ))}
                </>
              )}

              {/* Enhanced Glitch Effect */}
              {hasGlitchEffect && (
                <>
                  {/* Animated Glitch Layers */}
                  <motion.div
                    animate={{
                      x: [0, -3, 3, -2, 2, 0],
                      opacity: [0, 0.5, 0.3, 0.6, 0.2, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255, 0, 0, 0.3) 50%, transparent 100%)',
                      mixBlendMode: 'screen',
                      zIndex: 0,
                    }}
                  />
                  
                  <motion.div
                    animate={{
                      x: [0, 3, -3, 2, -2, 0],
                      opacity: [0, 0.4, 0.5, 0.3, 0.4, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      repeatDelay: 2,
                      delay: 0.1,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.3) 50%, transparent 100%)',
                      mixBlendMode: 'screen',
                      zIndex: 0,
                    }}
                  />

                  {/* Horizontal Scan Lines */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={`preview-scanline-${i}`}
                      animate={{
                        x: ['-100%', '200%'],
                        opacity: [0, 0.8, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: 'linear',
                        repeatDelay: 1,
                      }}
                      className="absolute pointer-events-none"
                      style={{
                        top: `${i * 17}%`,
                        width: '40%',
                        height: '2px',
                        background: 'rgba(0, 255, 0, 0.6)',
                        filter: 'blur(1px)',
                        zIndex: 0,
                      }}
                    />
                  ))}

                  {/* RGB Split Effect */}
                  <motion.div
                    animate={{
                      opacity: [0, 0.3, 0],
                    }}
                    transition={{
                      duration: 0.15,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'repeating-linear-gradient(0deg, rgba(255,0,0,0.1) 0px, rgba(0,255,0,0.1) 1px, rgba(0,0,255,0.1) 2px, transparent 3px, transparent 6px)',
                      mixBlendMode: 'screen',
                      zIndex: 0,
                    }}
                  />

                  {/* Digital Noise Blocks */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={`preview-noise-block-${i}`}
                      animate={{
                        x: [0, Math.random() * 10 - 5],
                        opacity: [0, 0.7, 0],
                        scaleX: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 0.2,
                        repeat: Infinity,
                        delay: i * 0.15,
                        repeatDelay: 2,
                      }}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${Math.random() * 90}%`,
                        top: `${Math.random() * 90}%`,
                        width: `${Math.random() * 30 + 10}px`,
                        height: `${Math.random() * 4 + 2}px`,
                        background: Math.random() > 0.5 ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 255, 0.6)',
                        zIndex: 0,
                      }}
                    />
                  ))}

                  {/* Falling Binary Code */}
                  {[...Array(10)].map((_, i) => (
                    <motion.div
                      key={`preview-binary-${i}`}
                      animate={{
                        y: [-50, 200],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: Math.random() * 2 + 2,
                        repeat: Infinity,
                        delay: Math.random() * 3,
                        ease: 'linear',
                      }}
                      className="absolute text-xs font-mono pointer-events-none"
                      style={{
                        left: `${5 + i * 9}%`,
                        color: '#00ff00',
                        textShadow: '0 0 5px rgba(0, 255, 0, 0.8)',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        zIndex: 0,
                      }}
                    >
                      {Array.from({ length: 3 }, () => Math.random() > 0.5 ? '1' : '0').join('')}
                    </motion.div>
                  ))}

                  {/* Glitch Flicker Overlay */}
                  <motion.div
                    animate={{
                      opacity: [0, 0.1, 0, 0.2, 0],
                    }}
                    transition={{
                      duration: 0.1,
                      repeat: Infinity,
                      repeatDelay: 4,
                    }}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      mixBlendMode: 'overlay',
                      zIndex: 0,
                    }}
                  />
                </>
              )}

              {/* Close button - HIGHEST z-index to be clickable */}
              <button 
                onClick={handleClose} 
                className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-[#ffa600]/10 transition-colors z-50"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* Decorative corner */}
              <div className="absolute -top-8 -right-8 h-20 w-20 bg-gradient-to-br from-[#ffa600] to-transparent rounded-full opacity-10"></div>
              
              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                {/* Avatar with click handler */}
                <motion.div 
                  className="relative group cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Avatar effects */}
                  {hasNebulaEffect && (
                    <>
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={`avatar-vortex-${i}`}
                          animate={{
                            rotate: 360,
                            scale: [1, 1.08, 1],
                          }}
                          transition={{
                            rotate: {
                              duration: 6 - i,
                              repeat: Infinity,
                              ease: 'linear',
                            },
                            scale: {
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: i * 0.3,
                            },
                          }}
                          className="absolute"
                          style={{
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: `${110 + i * 20}px`,
                            height: `${110 + i * 20}px`,
                            border: '2px solid',
                            borderColor: `rgba(147, 112, 219, ${0.4 - i * 0.1})`,
                            borderRadius: '50%',
                            filter: 'blur(2px)',
                          }}
                        />
                      ))}
                      <motion.div
                        animate={{
                          scale: [1, 1.15, 1],
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="absolute"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '140px',
                          height: '140px',
                          background: 'radial-gradient(circle, rgba(138, 43, 226, 0.5) 0%, transparent 70%)',
                          borderRadius: '50%',
                          filter: 'blur(15px)',
                        }}
                      />
                    </>
                  )}

                  {hasGlitchEffect && (
                    <>
                      <motion.div
                        animate={{
                          x: [-2, 2, -1, 1, 0],
                          opacity: [0, 0.3, 0, 0.2, 0],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          repeatDelay: 3,
                        }}
                        className="absolute -inset-4"
                        style={{
                          background: 'radial-gradient(circle, transparent 30%, rgba(0, 255, 0, 0.2) 50%, transparent 70%)',
                          mixBlendMode: 'screen',
                        }}
                      />
                      <motion.div
                        animate={{
                          x: [2, -2, 1, -1, 0],
                          opacity: [0, 0.3, 0, 0.2, 0],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          repeatDelay: 3,
                          delay: 0.1,
                        }}
                        className="absolute -inset-4"
                        style={{
                          background: 'radial-gradient(circle, transparent 30%, rgba(255, 0, 255, 0.2) 50%, transparent 70%)',
                          mixBlendMode: 'screen',
                        }}
                      />
                    </>
                  )}

                  <Avatar className="h-24 w-24 mb-2 border-4 border-background shadow-lg group-hover:border-[#ffa600] transition-all relative z-10">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-[#ffa600] to-orange-600 text-white font-bold text-2xl">
                      {fallback}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                
                {/* Name with styling */}
                <div className="space-y-1">
                  <div className="relative">
                    {/* Glitch text effect layers */}
                    {hasGlitchEffect && (
                      <>
                        <motion.span
                          animate={{
                            x: [-2, 2],
                            opacity: [0, 0.5],
                          }}
                          transition={{
                            duration: 0.1,
                            repeat: Infinity,
                            repeatDelay: 3,
                          }}
                          className="absolute inset-0"
                          style={{
                            color: '#ff0000',
                            mixBlendMode: 'screen',
                          }}
                        >
                          {name}
                        </motion.span>
                        <motion.span
                          animate={{
                            x: [2, -2],
                            opacity: [0, 0.5],
                          }}
                          transition={{
                            duration: 0.1,
                            repeat: Infinity,
                            repeatDelay: 3,
                            delay: 0.05,
                          }}
                          className="absolute inset-0"
                          style={{
                            color: '#00ffff',
                            mixBlendMode: 'screen',
                          }}
                        >
                          {name}
                        </motion.span>
                      </>
                    )}
                    <h2 
                      className="text-2xl font-bold tracking-tight relative"
                      style={nameStyle}
                    >
                      {name}
                    </h2>
                  </div>
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
                        {nameEffect === 'nebula' && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                          >
                            <Sparkles className="h-3 w-3 text-purple-500" />
                          </motion.div>
                        )}
                        {nameEffect === 'glitch' && (
                          <motion.div
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.2, repeat: Infinity }}
                          >
                            <Sparkles className="h-3 w-3 text-green-500" />
                          </motion.div>
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