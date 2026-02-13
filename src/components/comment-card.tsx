import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageSquare, Share2, Repeat2 } from 'lucide-react';
import Link from 'next/link';
import { Post } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { likeComment, unlikeComment, getUserProfile } from '@/services/firebase';
import { motion } from 'framer-motion';

interface CommentCardProps {
  comment: any;
  onCommentClick?: (post: Post) => void;
}

// Updated Helper function to get styled name with all effects
const getStyledName = (author: any) => {
  if (!author) return {};
  
  const style: React.CSSProperties = {
    fontFamily: author.nameFont || 'PT Sans, sans-serif',
    position: 'relative' as const,
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
    style.textShadow = '0 0 10px rgba(138, 43, 226, 0.8), 0 0 20px rgba(75, 0, 130, 0.6)';
  } else if (effect === 'glitch') {
    style.color = colorValue;
    style.textShadow = '1px 0 #00ff00, -1px 0 #ff00ff';
  }

  return style;
};

const CommentCard: React.FC<CommentCardProps> = ({ comment, onCommentClick }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showFullComment, setShowFullComment] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchUserProfile = async () => {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile && userProfile.likedComments) {
          setIsLiked(userProfile.likedComments.includes(comment.id));
        }
      };
      fetchUserProfile();
    }
  }, [user, comment.id]);

  if (!comment || !comment.author) {
    return null;
  }

  const { author, text, createdAt, post } = comment;
  const hasNebulaEffect = author.nameEffect === 'nebula';
  const hasGlitchEffect = author.nameEffect === 'glitch';
  const isLongComment = text && text.length > 150;

  const getSafeDate = (date: any): Date | null => {
    if (!date) return null;
    const d = date.toDate ? date.toDate() : new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }

  const commentDate = getSafeDate(createdAt);
  const nameStyle = getStyledName(author);

  const handleCardClick = () => {
    if (onCommentClick && post) {
      onCommentClick(post);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isLiking) return;

    setIsLiking(true);
    const newIsLiked = !isLiked;
    const oldLikeCount = likeCount;

    // Optimistically update UI
    setIsLiked(newIsLiked);
    setLikeCount(newIsLiked ? likeCount + 1 : Math.max(0, likeCount - 1));

    try {
      if (newIsLiked) {
        await likeComment(user.uid, comment.id);
      } else {
        await unlikeComment(user.uid, comment.id);
      }
    } catch (error) {
      console.error("Failed to update like status:", error);
      // Revert UI changes on error
      setIsLiked(!newIsLiked);
      setLikeCount(oldLikeCount);
    }

    setIsLiking(false);
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const toggleCommentLength = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFullComment(!showFullComment);
  };

  return (
    <Card 
      className="mb-4 transition-all duration-300 ease-in-out hover:shadow-lg cursor-pointer border-2 border-[#ffa600]/20 relative overflow-hidden group"
      onClick={handleCardClick}
    >
      {/* Nebula Effect Background */}
      {hasNebulaEffect && (
        <>
          {/* Spinning Vortex Rings */}
          {[...Array(2)].map((_, i) => (
            <motion.div
              key={`vortex-ring-${i}`}
              animate={{
                rotate: 360,
                scale: [1, 1.05, 1],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                rotate: {
                  duration: 15 - i * 3,
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
              className="absolute left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                width: `${100 + i * 40}px`,
                height: `${100 + i * 40}px`,
                border: '1px solid',
                borderColor: `rgba(147, 112, 219, ${0.2 - i * 0.05})`,
                borderRadius: '50%',
                filter: 'blur(1px)',
              }}
            />
          ))}
          
          {/* Central Glowing Core */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              width: '75px',
              height: '75px',
              background: 'radial-gradient(circle, rgba(138, 43, 226, 0.4) 0%, rgba(147, 112, 219, 0.2) 40%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(8px)',
            }}
          />
        </>
      )}

      {/* Glitch Effect */}
      {hasGlitchEffect && (
        <>
          {/* Animated Glitch Layers */}
          <motion.div
            animate={{
              x: [0, -2, 2, -1, 1, 0],
              y: [0, 1, -1, 0.5, -0.5, 0],
              opacity: [0, 0.3, 0, 0.4, 0.2, 0],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(45deg, transparent 0%, rgba(255, 0, 0, 0.2) 50%, transparent 100%)',
              mixBlendMode: 'screen',
              filter: 'blur(0.5px)',
            }}
          />
          
          {/* Horizontal Scan Lines */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`scanline-${i}`}
              animate={{
                x: ['-100%', '200%'],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'linear',
                repeatDelay: 2,
              }}
              className="absolute pointer-events-none"
              style={{
                top: `${i * 20}%`,
                width: '60%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.6), transparent)',
                filter: 'blur(0.3px)',
              }}
            />
          ))}
        </>
      )}

      <CardHeader className="p-4 relative z-10">
        <div className="flex items-start space-x-4">
          {/* Avatar with Effects */}
          <div className="relative">
            {hasNebulaEffect && (
              <motion.div
                animate={{
                  rotate: 360,
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  rotate: {
                    duration: 12,
                    repeat: Infinity,
                    ease: 'linear',
                  },
                  scale: {
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
                className="absolute -inset-2 pointer-events-none"
                style={{
                  background: 'conic-gradient(from 0deg, transparent, rgba(138, 43, 226, 0.3), rgba(75, 0, 130, 0.4), transparent)',
                  borderRadius: '50%',
                  filter: 'blur(6px)',
                }}
              />
            )}

            {hasGlitchEffect && (
              <motion.div
                animate={{
                  x: [-2, 2, -1, 1, 0],
                  y: [0, 1, -1, 0.5, -0.5],
                  opacity: [0, 0.2, 0, 0.15, 0],
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
                className="absolute -inset-2 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, transparent 30%, rgba(0, 255, 0, 0.2) 50%, transparent 70%)',
                  mixBlendMode: 'screen',
                  filter: 'blur(3px)',
                }}
              />
            )}

            <Avatar className="h-12 w-12 border-2 border-background shadow-lg group-hover:border-[#ffa600]/50 transition-all duration-300">
              <AvatarImage src={author.avatarUrl} alt={`@${author.username}`} />
              <AvatarFallback className="bg-gradient-to-br from-[#ffa600] to-orange-600 text-white font-bold">
                {author.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <Link 
                href={`/profile/${author.id}`} 
                className="font-bold text-base hover:underline transition-all duration-300 group-hover:scale-105 inline-block" 
                onClick={stopPropagation}
              >
                <span className="relative">
                  {/* Glitch text effect layers for name */}
                  {hasGlitchEffect && (
                    <>
                      <motion.span
                        animate={{
                          x: [-1, 1, -0.5, 0.5, 0],
                          opacity: [0, 0.2, 0, 0.15, 0],
                        }}
                        transition={{
                          duration: 0.1,
                          repeat: Infinity,
                          repeatDelay: 3,
                        }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          color: '#ff0000',
                          mixBlendMode: 'screen',
                          filter: 'blur(0.3px)',
                        }}
                      >
                        {author.name}
                      </motion.span>
                      <motion.span
                        animate={{
                          x: [1, -1, 0.5, -0.5, 0],
                          y: [0, 0.5, -0.5, 0.25, -0.25],
                          opacity: [0, 0.2, 0, 0.15, 0],
                        }}
                        transition={{
                          duration: 0.1,
                          repeat: Infinity,
                          repeatDelay: 3,
                          delay: 0.03,
                        }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          color: '#00ffff',
                          mixBlendMode: 'screen',
                          filter: 'blur(0.3px)',
                        }}
                      >
                        {author.name}
                      </motion.span>
                    </>
                  )}
                  <span style={nameStyle}>
                    {author.name}
                  </span>
                </span>
              </Link>
              <span className="text-sm text-muted-foreground">@{author.username}</span>
              <span className="text-xs text-muted-foreground">
                · {commentDate ? commentDate.toLocaleDateString() : 'just now'}
              </span>
            </div>
            
            <p className="text-sm mt-1 text-gray-400">
              Replying to
              {post && post.isAnonymous ? (
                <span className="text-[#ffa600]"> an anonymous post</span>
              ) : post && post.authorId && post.author?.name ? (
                <Link href={`/profile/${post.authorId}`} onClick={stopPropagation} className="text-[#ffa600] hover:underline ml-1">
                  {post.author.name}'s post
                </Link>
              ) : (
                " a post"
              )}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 relative z-10">
        <div className="relative">
          <p className="whitespace-pre-wrap text-base text-foreground/90">
            {isLongComment && !showFullComment ? `${text.substring(0, 150)}...` : text}
          </p>
          
          {isLongComment && (
            <button
              onClick={toggleCommentLength}
              className="mt-2 text-sm text-[#ffa600] hover:text-[#ff9500] font-medium transition-colors"
            >
              {showFullComment ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Enhanced Action Buttons */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-4 text-muted-foreground">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`flex items-center gap-2 transition-all duration-300 ${
                isLiked 
                  ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' 
                  : 'hover:text-[#ffa600] hover:bg-[#ffa600]/10'
              }`} 
              onClick={handleLike} 
              disabled={isLiking}
            >
              <Heart className={`h-5 w-5 transition-all ${isLiked ? 'fill-current animate-pulse' : ''}`} />
              <span className="font-medium">{likeCount}</span>
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2 hover:text-blue-500 hover:bg-blue-500/10 transition-all duration-300"
              onClick={stopPropagation}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Reply</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 hover:text-green-500 hover:bg-green-500/10 transition-all duration-300"
              onClick={stopPropagation}
            >
              <Repeat2 className="h-4 w-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 hover:text-purple-500 hover:bg-purple-500/10 transition-all duration-300"
              onClick={stopPropagation}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Gradient border effect on hover */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-[#ffa600]/0 via-[#ffa600]/5 to-[#ffa600]/0"></div>
      </div>
    </Card>
  );
};

export default CommentCard;