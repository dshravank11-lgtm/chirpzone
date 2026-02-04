
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
        nameEffect?: 'none' | 'gradient' | 'moving-gradient';
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
  onReport?: (postId: string) => void; // Add this prop
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
  };

  if (author.nameEffect === 'none') {
    style.color = author.nameColor || '#ff990a';
  } else if (author.nameEffect === 'gradient') {
    style.backgroundImage = author.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
  } else if (author.nameEffect === 'moving-gradient') {
    style.backgroundImage = author.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
    style.backgroundSize = '200% 200%';
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
    style.animation = 'gradientMove 3s ease infinite';
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

  return (
    <>
      <Card
        ref={ref}
        className={`my-4 overflow-hidden rounded-lg shadow-md transition-all duration-300 cursor-pointer ${isVanishing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} ${className}`}
        style={style}
        onClick={handleCardClick}
      >
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                  <Avatar className="cursor-pointer" onClick={handleAuthorClick}>
                      <AvatarImage src={post.author?.avatarUrl} alt={`@${post.author?.username}`} />
                      <AvatarFallback>{post.author?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                      <div className="flex items-center gap-2">
                          <h3 
                            className="font-semibold cursor-pointer"
                            style={nameStyle}
                            onClick={handleAuthorClick}
                          >
                            {post.isAnonymous ? 'Anonymous' : (post.author?.name || 'Unknown')}
                          </h3>
                          {!post.isAnonymous && post.author?.username && (
                            <span className="text-sm text-gray-500">@{post.author?.username}</span>
                          )}
                      </div>
                      <time className="text-xs text-gray-500" dateTime={postDate ? postDate.toISOString() : ''}>
                          {postDate ? postDate.toLocaleString() : 'just now'}
                      </time>
                  </div>
              </div>
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

        <CardContent className="px-4 pb-2">
          <p className="whitespace-pre-wrap">{post.content}</p>
          {post.imageUrl && (
            <div className="mt-4">
              <img src={post.imageUrl} alt="Post attachment" className="rounded-lg w-full object-cover" />
            </div>
          )}
        </CardContent>
        
        <CardFooter className="p-2 border-t flex justify-around items-start">
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
