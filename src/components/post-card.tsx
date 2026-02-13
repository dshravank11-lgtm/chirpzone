'use client';

import React, { useState, useEffect, forwardRef } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { deletePost, getCommentsByPostId, getUserProfile, likePost, unlikePost, type User } from '@/services/firebase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProfilePreviewCard } from './profile-preview-card';
import { PostDialog } from './post-dialog';
import { ReportDialog } from './report-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from "@/components/ui/use-toast"
import { SignInPrompt } from './signin-prompt';
import { motion } from 'framer-motion';

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

export interface Post {
    id: string;
    userId?: string;
    authorId?: string;
    content: string;
    imageUrl?: string;
    likes: number;
    shares: number;
    createdAt: any;
    likedBy?: string[];
    isAnonymous?: boolean;
    isHidden?: boolean;
    commentsCount?: number;
    
    // AUTHOR FIELD with ALL style properties
    author: {
        id?: string;
        username: string;
        avatarUrl: string;
        name: string;
        nameFont?: string;
        nameColor?: string;
        nameEffect?: 'none' | 'gradient' | 'moving-gradient' | 'nebula' | 'glitch';
    };
};

interface Comment {
  id: string;
  author: User;
  authorId?: string;
  text: string;
  createdAt: any;
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  className?: string;
  style?: React.CSSProperties;
  onPostDeleted?: (postId: string) => void;
  onReport?: (postId: string) => void;
}

const getSafeDate = (date: any): Date | null => {
    if (!date) return null;
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) {
        return null;
    }
    return d;
}

const getStyledName = (author: any) => {
  if (!author) return {};
  
  const style: React.CSSProperties = {
    fontFamily: author.nameFont || 'PT Sans, sans-serif',
    position: 'relative',
    zIndex: 10,
  };

  const colorValue = author.nameColor || '#ff990a';
  const effect = author.nameEffect || 'none';

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
    style.textShadow = '0 0 20px rgba(184, 113, 255, 0.8), 0 0 40px rgba(75, 0, 130, 0.6)';
  } else if (effect === 'glitch') {
    style.color = colorValue;
    style.textShadow = '1px 0 #00ff00, -1px 0 #ff00ff';
  }

  return style;
};

// Using React.forwardRef and ensuring it's a named export
export const PostCard = forwardRef<HTMLDivElement, PostCardProps>(({ post, className, style, onPostDeleted, onReport }, ref) => {
  const { user } = useAuth();
  const { toast } = useToast()
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVanishing, setIsVanishing] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const postDate = getSafeDate(post.createdAt);

  // Get the actual author ID - try multiple possible fields
  const authorId = post.authorId || post.userId || post.author?.id || '';
  
  // Get effect from author
  const nameEffect = post.author?.nameEffect || 'none';
  const hasNebulaEffect = nameEffect === 'nebula';
  const hasGlitchEffect = nameEffect === 'glitch';
  const nameColor = post.author?.nameColor || '#ff990a';
  
  useEffect(() => {
    if (isDialogOpen) {
      setComments([]);
      return;
    }
    const unsubscribe = getCommentsByPostId(post.id, setComments);
    return () => unsubscribe();
  }, [post.id, isDialogOpen]);

  // Fixed: Update like state when user or post changes
  useEffect(() => {
    if (user && post.likedBy) {
      setIsLiked(post.likedBy.includes(user.uid));
    } else {
      setIsLiked(false);
    }
    // Also sync the like count with the actual post data
    setLikeCount(post.likes || 0);
  }, [user, post.likedBy, post.likes]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    const newIsLiked = !isLiked;
    const previousIsLiked = isLiked;
    const previousLikeCount = likeCount;

    // Optimistically update UI
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));

    if (newIsLiked) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }

    try {
      if (newIsLiked) {
        await likePost(user.uid, post.id);
      } else {
        await unlikePost(user.uid, post.id);
      }
    } catch (error) {
      console.error("Failed to update like status:", error);
      // Revert UI changes on error
      setIsLiked(previousIsLiked);
      setLikeCount(previousLikeCount);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update like. Please try again.",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleDeletePost = async () => {
    setShowDeleteConfirm(false);
    setIsVanishing(true);

    // Remove the post from the UI immediately
    if (onPostDeleted) {
      onPostDeleted(post.id);
    }

    try {
      await deletePost(post.id);
      toast({
        title: "Post Deleted",
        description: "Your post has been removed.",
      });
    } catch (error) {
      console.error("Failed to delete post: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the post. Please try again.",
      });
      // Note: A more robust solution would involve re-adding the post to the list on failure.
    }
  }

  const handleAuthorClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
        setShowSignInPrompt(true);
        return;
    }
    
    if (authorId && post.author?.username && !post.isAnonymous) {
      try {
        setPreviewUserId(authorId);
        setIsPreviewing(true);
      } catch (error) {
        console.error("Error finding user:", error);
      }
    }
  };

  const handleCardClick = () => {
      if (!isVanishing) {
        setIsDialogOpen(true);
      }
  }

  if (isVanishing) {
    return null; // The component will be removed by the parent state update
  }

  const nameStyle = getStyledName(post.author);
  const displayName = post.isAnonymous ? 'Anonymous' : (post.author?.name || 'Unknown');

  return (
    <>
      <Card
        ref={ref}
        className={`my-4 overflow-hidden rounded-lg shadow-md transition-all duration-300 cursor-pointer ${isVanishing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} ${className}`}
        style={style}
        onClick={handleCardClick}
      >
        <CardHeader className="p-4 relative">
          {/* Nebula Effect Background */}
          {hasNebulaEffect && (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {/* Spinning Vortex Rings */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`post-vortex-ring-${i}`}
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            rotate: {
              duration: 8 - i * 1,
              repeat: Infinity,
              ease: 'linear',
            },
            scale: {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            },
            opacity: {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            },
          }}
          className="absolute left-1/4 top-1/4 pointer-events-none"
          style={{
            width: `${60 + i * 20}px`,
            height: `${60 + i * 20}px`,
            border: '1.5px solid',
            borderColor: `rgba(147, 112, 219, ${0.3 - i * 0.08})`,
            borderRadius: '50%',
            filter: 'blur(1.5px)',
          }}
        />
      ))}
      
      {/* Spiraling Energy Particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`post-spiral-${i}`}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 0.2,
          }}
          className="absolute left-1/4 top-1/4"
          style={{
            transformOrigin: '0 0',
          }}
        >
          <motion.div
            animate={{
              scale: [0, 0.8, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeOut',
              delay: i * 0.2,
            }}
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(${147 + i * 2}, ${112 + i}, 219, 0.8) 0%, transparent 70%)`,
              transform: `translateX(${25 + i * 6}px)`,
              filter: 'blur(0.5px)',
            }}
          />
        </motion.div>
      ))}
      
      {/* ADDITIONAL NEBULA PARTICLES FOR NAME AREA */}
      <div className="absolute left-32 top-4"> {/* Position near the name */}
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="relative"
          style={{ width: '60px', height: '60px' }}
        >
          {/* Central glowing orb */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: '40px',
              height: '40px',
              background: 'radial-gradient(circle, rgba(138, 43, 226, 0.6) 0%, rgba(75, 0, 130, 0.3) 50%, transparent 100%)',
              borderRadius: '50%',
              filter: 'blur(10px)',
            }}
          />
          
          {/* Orbiting stars */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`orbit-star-${i}`}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2,
              }}
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: `rotate(${i * 45}deg) translateY(-25px) rotate(-${i * 45}deg)`,
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(147,112,219,0.9) 0%, rgba(138,43,226,0.6) 70%, transparent 100%)`,
                filter: 'blur(1px)',
              }}
            />
          ))}
          
          {/* Nebula clouds - swirling effect */}
          {[...Array(2)].map((_, i) => (
            <motion.div
              key={`cloud-${i}`}
              animate={{
                rotate: [0, 180, 360],
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 6 + i * 2,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.8,
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: `${50 + i * 15}px`,
                height: `${50 + i * 15}px`,
                background: `conic-gradient(from ${i * 60}deg, transparent, rgba(${138 + i * 10}, ${43 + i * 5}, ${226 - i * 20}, 0.35), transparent)`,
                borderRadius: '50%',
                filter: 'blur(6px)',
              }}
            />
          ))}
        </motion.div>
        
        {/* Floating cosmic particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            animate={{
              y: [0, -Math.random() * 40 - 20],
              x: [0, (Math.random() - 0.5) * 30],
              opacity: [0, 0.7, 0],
              scale: [0, Math.random() * 0.5 + 0.3, 0],
            }}
            transition={{
              duration: Math.random() * 2.5 + 1.5,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeOut',
            }}
            className="absolute left-0 top-0"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              background: `radial-gradient(circle, rgba(${Math.floor(147 + Math.random() * 50)},${Math.floor(112 + Math.random() * 50)},${Math.floor(219 + Math.random() * 30)},0.8) 0%, transparent 70%)`,
              borderRadius: '50%',
              filter: 'blur(0.5px)',
            }}
          />
        ))}
      </div>
    </div>
  )}

          {/* Glitch Effect Background */}
          {hasGlitchEffect && (
            <>
              {/* Animated Glitch Layers */}
              <motion.div
                animate={{
                  x: [0, -2, 2, -1, 1, 0],
                  opacity: [0, 0.3, 0.2, 0.4, 0.1, 0],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 0, 0, 0.2) 50%, transparent 100%)',
                  mixBlendMode: 'screen',
                }}
              />
              
              <motion.div
                animate={{
                  x: [0, 2, -2, 1, -1, 0],
                  opacity: [0, 0.2, 0.3, 0.2, 0.3, 0],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  repeatDelay: 3,
                  delay: 0.15,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.2) 50%, transparent 100%)',
                  mixBlendMode: 'screen',
                }}
              />

              {/* Horizontal Scan Lines */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={`post-scanline-${i}`}
                  animate={{
                    x: ['-100%', '200%'],
                    opacity: [0, 0.4, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: 'linear',
                    repeatDelay: 2,
                  }}
                  className="absolute"
                  style={{
                    top: `${i * 33}%`,
                    width: '30%',
                    height: '1px',
                    background: 'rgba(0, 255, 0, 0.4)',
                    filter: 'blur(0.5px)',
                  }}
                />
              ))}

              {/* Digital Noise Blocks */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={`post-noise-block-${i}`}
                  animate={{
                    x: [0, Math.random() * 8 - 4],
                    opacity: [0, 0.5, 0],
                    scaleX: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity,
                    delay: i * 0.2,
                    repeatDelay: 3,
                  }}
                  className="absolute"
                  style={{
                    left: `${Math.random() * 80 + 10}%`,
                    top: `${Math.random() * 80 + 10}%`,
                    width: `${Math.random() * 20 + 8}px`,
                    height: `${Math.random() * 3 + 1}px`,
                    background: Math.random() > 0.5 ? 'rgba(0, 255, 0, 0.4)' : 'rgba(255, 0, 255, 0.4)',
                  }}
                />
              ))}
            </>
          )}

          <div className="flex items-start justify-between relative z-10">
          <div className="flex items-start space-x-4">
  <Avatar className="cursor-pointer" onClick={handleAuthorClick}>
    <AvatarImage src={post.author?.avatarUrl} alt={`@${post.author?.username}`} />
    <AvatarFallback>{post.author?.name?.charAt(0) || 'U'}</AvatarFallback>
  </Avatar>
  <div className="relative">
    <div className="flex items-center gap-2">
      <div className="relative inline-block">
        {/* Nebula Effect */}
        {hasNebulaEffect && (
          <div className="absolute -inset-4 pointer-events-none overflow-visible">
            {/* Nebula Orbit Container */}
            <motion.div
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute inset-0"
              style={{ transformOrigin: 'center' }}
            >
              {/* Swirling Nebula Center */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {/* Central glowing orb */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'radial-gradient(circle, rgba(138, 43, 226, 0.6) 0%, rgba(75, 0, 130, 0.3) 50%, transparent 100%)',
                    borderRadius: '50%',
                    filter: 'blur(10px)',
                  }}
                />
                
                {/* Orbiting stars */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.6, 1, 0.6],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.2,
                    }}
                    className="absolute"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `rotate(${i * 45}deg) translateY(-50px)`,
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle, rgba(147,112,219,0.9) 0%, rgba(138,43,226,0.6) 70%, transparent 100%)`,
                      filter: 'blur(1px)',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Glitch Effect */}
        {hasGlitchEffect && (
          <>
            {/* Glitch text effect layers - KEEP THESE INLINE WITH NAME */}
            <motion.span
              animate={{
                x: [-1, 1],
                opacity: [0, 0.3],
              }}
              transition={{
                duration: 0.1,
                repeat: Infinity,
                repeatDelay: 4,
              }}
              className="absolute inset-0"
              style={{
                color: '#ff0000',
                mixBlendMode: 'screen',
              }}
            >
              {displayName}
            </motion.span>
            <motion.span
              animate={{
                x: [1, -1],
                opacity: [0, 0.3],
              }}
              transition={{
                duration: 0.1,
                repeat: Infinity,
                repeatDelay: 4,
                delay: 0.05,
              }}
              className="absolute inset-0"
              style={{
                color: '#00ffff',
                mixBlendMode: 'screen',
              }}
            >
              {displayName}
            </motion.span>
          </>
        )}
        
        <h3 
          className="font-semibold cursor-pointer relative z-10"
          style={nameStyle}
          onClick={handleAuthorClick}
        >
          {displayName}
        </h3>
      </div>
      {!post.isAnonymous && post.author?.username && (
        <span className="text-sm text-gray-500">@{post.author?.username}</span>
      )}
    </div>
    <time className="text-xs text-gray-500" dateTime={postDate ? postDate.toISOString() : ''}>
      {postDate ? postDate.toLocaleString() : 'just now'}
    </time>
  </div>
</div>

{/* Binary code rain - POSITIONED RELATIVE TO ENTIRE CARD */}
{hasGlitchEffect && (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[...Array(15)].map((_, i) => {
      const binarySequences = ['101', '111', '000', '001', '110', '011', '100', '010'];
      const randomSequence = binarySequences[Math.floor(Math.random() * binarySequences.length)];
      
      return (
        <motion.div
          key={`binary-${i}`}
          animate={{
            y: ['-20%', '120%'],
            opacity: [0, 0.8, 0],
            x: [Math.random() * 100 - 50, Math.random() * 100 - 50],
          }}
          transition={{
            duration: Math.random() * 2 + 1.5,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'linear',
          }}
          className="absolute text-[10px] font-mono font-bold"
          style={{
            left: `${Math.random() * 100}%`,
            color: Math.random() > 0.5 ? '#00ff00' : '#0f0',
            textShadow: '0 0 3px rgba(0, 255, 0, 0.8)',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            top: '0%',
            zIndex: 1,
          }}
        >
          {randomSequence}
        </motion.div>
      );
    })}
    
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={`digit-${i}`}
        animate={{
          opacity: [0, 0.7, 0],
          y: [0, -20],
          x: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30],
        }}
        transition={{
          duration: Math.random() * 0.8 + 0.5,
          repeat: Infinity,
          delay: Math.random() * 2,
        }}
        className="absolute text-[9px] font-mono"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          color: Math.random() > 0.5 ? '#00ff00' : '#ff00ff',
          fontFamily: 'monospace',
          zIndex: 1,
        }}
      >
        {Math.random() > 0.5 ? '1' : '0'}
      </motion.div>
    ))}
  </div>
)}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => onReport && onReport(post.id)}>
                      Report
                    </DropdownMenuItem>
                    {authorId === user.uid && (
                      <DropdownMenuItem onSelect={() => setShowDeleteConfirm(true)} className="text-red-500">
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-2 relative">
          {/* Content area effects */}
          {hasNebulaEffect && (
            <motion.div
              animate={{
                scale: [1, 1.02, 1],
                opacity: [0.1, 0.15, 0.1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(138, 43, 226, 0.05) 0%, transparent 70%)',
                filter: 'blur(10px)',
              }}
            />
          )}

          {hasGlitchEffect && (
            <motion.div
              animate={{
                opacity: [0, 0.05, 0],
              }}
              transition={{
                duration: 0.2,
                repeat: Infinity,
                repeatDelay: 5,
              }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 2px)',
                mixBlendMode: 'overlay',
              }}
            />
          )}

          <p className="whitespace-pre-wrap relative z-10">{post.content}</p>
          {post.imageUrl && (
            <div className="mt-4 relative z-10">
              <img src={post.imageUrl} alt="Post attachment" className="rounded-lg w-full object-cover" />
            </div>
          )}
        </CardContent>
        
        <CardFooter className="p-2 border-t flex justify-around items-start relative z-10">
            <Button variant="ghost" className="flex items-center space-x-2" onClick={handleLike} disabled={isLiking}>
                <Heart className={`h-5 w-5 ${isLiked ? 'text-red-500 fill-current' : ''} transition-transform duration-300 ${isAnimating ? 'scale-125' : 'scale-100'}`} />
                <span>{likeCount}</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-2" onClick={() => !user && setShowSignInPrompt(true)}>
                <MessageCircle className="h-5 w-5" />
                <span>{comments.length}</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-2" onClick={(e) => {
              e.stopPropagation();
              const postUrl = `${window.location.origin}/post/${post.id}`;
              navigator.clipboard.writeText(postUrl);
              toast({
                title: "Link Copied!",
                description: "The post link has been copied to your clipboard.",
              });
            }}>
                <Share2 className="h-5 w-5" />
                <span>{post.shares || 0}</span>
            </Button>
        </CardFooter>
      </Card>

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

      {isPreviewing && previewUserId && (
        <ProfilePreviewCard userId={previewUserId} onOpenChange={setIsPreviewing} />
      )}

      {isDialogOpen && (
          <PostDialog 
            post={post} 
            onOpenChange={setIsDialogOpen} 
            onPostDeleted={onPostDeleted} 
          />
      )}
      <SignInPrompt open={showSignInPrompt} onOpenChange={setShowSignInPrompt} />
    </>
  );
});

PostCard.displayName = "PostCard";

// Global styles for animations
const globalStyles = `
  @keyframes gradientMove {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
`;

// Add global styles to document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = globalStyles;
  document.head.appendChild(styleElement);
}