import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { Post } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { likeComment, unlikeComment, getUserProfile } from '@/services/firebase';

interface CommentCardProps {
  comment: any;
  onCommentClick?: (post: Post) => void;
}

// Helper function to get styled name
const getStyledName = (author: any) => {
  if (!author) return {};
  
  const style: React.CSSProperties = {
    fontFamily: author.nameFont || 'PT Sans, sans-serif',
  };

  if (author.nameEffect === 'none') {
    style.color = author.nameColor || '#ff990a';
  } else if (author.nameEffect === 'gradient') {
    style.background = author.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
  } else if (author.nameEffect === 'moving-gradient') {
    style.background = author.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
    style.backgroundSize = '200% 200%';
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
    style.animation = 'gradientMove 3s ease infinite';
  }

  return style;
};

const CommentCard: React.FC<CommentCardProps> = ({ comment, onCommentClick }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes || 0);
  const [isLiking, setIsLiking] = useState(false);

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

  return (
    <Card 
      className="mb-4 transition-all duration-300 ease-in-out hover:shadow-lg cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className="p-4">
        <div className="flex items-start space-x-4">
          <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary transition-colors">
            <AvatarImage src={author.avatarUrl} alt={`@${author.username}`} />
            <AvatarFallback>{author.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-baseline space-x-2">
              <Link 
                href={`/profile/${author.id}`} 
                className="font-bold text-base hover:underline" 
                onClick={stopPropagation}
                style={nameStyle}
              >
                {author.name}
              </Link>
              <span className="text-sm text-muted-foreground">@{author.username}</span>
              <span className="text-xs text-muted-foreground">
                · {commentDate ? commentDate.toLocaleDateString() : 'just now'}
              </span>
            </div>
            <p className="text-sm mt-1 text-gray-400">Replying to
              {post && post.isAnonymous ? (
                <span className="text-orange-500"> an anonymous post</span>
              ) : post && post.authorId && post.author?.name ? (
                <Link href={`/profile/${post.authorId}`} onClick={stopPropagation} className="text-orange-500 hover:underline">
                   {" "}
                   {post.author.name}'s post
                </Link>
              ) : (
                " a post"
              )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="whitespace-pre-wrap text-base">{text}</p>
        <div className="flex items-center justify-start gap-4 mt-4 text-muted-foreground">
            <Button variant="ghost" size="lg" className={`flex items-center gap-2 ${isLiked ? 'text-red-500' : 'text-orange-500'}`} onClick={handleLike} disabled={isLiking}>
                <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likeCount}</span>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommentCard;