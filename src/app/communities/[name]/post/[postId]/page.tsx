'use client';

import { getPostById, addComment } from '@/services/firebase';
import { notFound, useParams } from 'next/navigation';
import React, { useState, useEffect, forwardRef } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share2, MoreHorizontal, ThumbsUp, ThumbsDown, Bookmark, Flag, Eye, Clock, Send, ThumbsUp as LikeIcon, ThumbsDown as DislikeIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { deletePost, getCommentsByPostId, getUserProfile, likePost, unlikePost, type User } from '@/services/firebase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProfilePreviewCard } from '@/components/profile-preview-card';
import { PostDialog } from '@/components/post-dialog';
import { ReportDialog } from '@/components/report-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from "@/components/ui/use-toast"
import { SignInPrompt } from '@/components/signin-prompt';
import { Separator } from '@/components/ui/separator';

// --- Interfaces ---
export interface Post {
    id: string;
    author: User;
    authorId: string;
    content: string;
    imageUrl?: string;
    likes: number;
    shares: number;
    createdAt: any;
    likedBy?: string[];
    isAnonymous?: boolean;
};

interface Comment {
  id: string;
  author: User;
  authorId?: string;
  text: string;
  createdAt: any;
  likes?: number;
  likedBy?: string[];
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  className?: string;
  style?: React.CSSProperties;
  onPostDeleted?: (postId: string) => void;
}

// --- Helpers ---
const getSafeDate = (date: any): Date | null => {
    if (!date) return null;
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return null;
    return d;
}

const getTimeAgo = (date: Date | null): string => {
  if (!date) return 'just now';
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'mo';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'm';
  return Math.floor(seconds) + 's';
};

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

// --- PostCard Component ---
export const PostCard = forwardRef<HTMLDivElement, PostCardProps>(({ post, className, style, onPostDeleted }, ref) => {
  const { user } = useAuth();
  const { toast } = useToast()
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [views] = useState(Math.floor(Math.random() * 500) + 50);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isVanishing, setIsVanishing] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [authorData, setAuthorData] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  const postDate = getSafeDate(post.createdAt);

  useEffect(() => {
    const fetchAuthorData = async () => {
      if (post.authorId && !post.isAnonymous) {
        try {
          const data = await getUserProfile(post.authorId);
          setAuthorData(data);
        } catch (error) {
          console.error("Error fetching author data:", error);
        }
      }
    };
    fetchAuthorData();
  }, [post.authorId, post.isAnonymous]);

  useEffect(() => {
    const unsubscribe = getCommentsByPostId(post.id, setComments);
    return () => unsubscribe();
  }, [post.id]);

  useEffect(() => {
    if (user && post.likedBy) {
      setIsLiked(post.likedBy.includes(user.uid));
    } else {
      setIsLiked(false);
    }
    setLikeCount(post.likes);
  }, [user, post.likedBy, post.likes]);

  const nameStyle = getStyledName(authorData || post.author);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { setShowSignInPrompt(true); return; }
    if (isLiking) return;

    setIsLiking(true);
    const newIsLiked = !isLiked;
    const previousIsLiked = isLiked;
    const previousLikeCount = likeCount;

    if (isDisliked && newIsLiked) {
      setIsDisliked(false);
      setDislikeCount(prev => Math.max(0, prev - 1));
    }

    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      if (newIsLiked) await likePost(user.uid, post.id);
      else await unlikePost(user.uid, post.id);
    } catch (error) {
      setIsLiked(previousIsLiked);
      setLikeCount(previousLikeCount);
      toast({ variant: "destructive", title: "Error", description: "Failed to update like." });
    } finally { setIsLiking(false); }
  };

  const handleDislike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { setShowSignInPrompt(true); return; }
    if (isLiked && !isDisliked) {
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    }
    setIsDisliked(!isDisliked);
    setDislikeCount(prev => isDisliked ? Math.max(0, prev - 1) : prev + 1);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { setShowSignInPrompt(true); return; }
    setIsSaved(!isSaved);
    toast({ title: isSaved ? "Post Unsaved" : "Post Saved! 📌" });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast({ title: "Link Copied! 🔗" });
  };

  const handleDeletePost = async () => {
    setShowDeleteConfirm(false);
    setIsVanishing(true);
    if (onPostDeleted) onPostDeleted(post.id);
    try {
      await deletePost(post.id);
      toast({ title: "Post Deleted" });
    } catch (error) {
      setIsVanishing(false);
      toast({ variant: "destructive", title: "Error", description: "Delete failed." });
    }
  }

  const handleAuthorClick = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    setPreviewUserId(userId);
    setIsPreviewing(true);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { setShowSignInPrompt(true); return; }
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addComment(post.id, user.uid, commentText);
      setCommentText('');
      toast({ title: "Comment Posted! 💬" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Comment failed." });
    } finally { setIsSubmittingComment(false); }
  };

  if (isVanishing) return null;
  const voteScore = likeCount - dislikeCount;

  return (
    <>
      <Card
        ref={ref}
        className={`group my-3 overflow-hidden transition-all duration-300 cursor-pointer
          ${isHovered ? 'shadow-lg border-[#ffa600] bg-amber-50/50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}
          hover:border-[#ffa600]/50 animate-slide-in ${className}`}
        style={style}
        onClick={() => !isVanishing && setIsDialogOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex gap-2 p-4">
          <div className="flex flex-col items-center gap-1 pt-1">
            <Button variant="ghost" size="icon" className={`h-8 w-8 ${isLiked ? 'text-[#ffa600]' : 'text-gray-400'}`} onClick={handleLike} disabled={isLiking}>
              <ThumbsUp className={`h-5 w-5 ${isLiked ? 'fill-current animate-bounce-once' : ''}`} />
            </Button>
            <span className={`font-bold text-sm ${voteScore > 0 ? 'text-[#ffa600]' : voteScore < 0 ? 'text-red-500' : 'text-gray-600'}`}>
              {voteScore > 0 ? '+' : ''}{voteScore}
            </span>
            <Button variant="ghost" size="icon" className={`h-8 w-8 ${isDisliked ? 'text-red-500' : 'text-gray-400'}`} onClick={handleDislike}>
              <ThumbsDown className={`h-5 w-5 ${isDisliked ? 'fill-current animate-bounce-once' : ''}`} />
            </Button>
          </div>

          <div className="flex-1 min-w-0">
            <CardHeader className="p-0 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 cursor-pointer" onClick={(e) => post.authorId && handleAuthorClick(e, post.authorId)}>
                    <AvatarImage src={post.author?.avatarUrl} />
                    <AvatarFallback>{post.author?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm" style={!post.isAnonymous ? nameStyle : {}}>
                      {post.isAnonymous ? 'Anonymous' : (post.author?.name || 'Unknown')}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {getTimeAgo(postDate)}
                    </span>
                  </div>
                </div>
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleSave(e as any); }}>
                        <Bookmark className="h-4 w-4 mr-2" /> {isSaved ? 'Unsave' : 'Save'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setIsReportDialogOpen(true)}>
                        <Flag className="h-4 w-4 mr-2" /> Report
                      </DropdownMenuItem>
                      {post.authorId === user.uid && (
                        <DropdownMenuItem onSelect={() => setShowDeleteConfirm(true)} className="text-red-500">
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <p className="text-gray-800 dark:text-gray-200 text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
              {post.imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border">
                  <img src={post.imageUrl} alt="Post" className="w-full object-cover max-h-96" />
                </div>
              )}
            </CardContent>

            <CardFooter className="p-0 pt-3 flex gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={(e) => { e.stopPropagation(); if (!user) setShowSignInPrompt(true); }}>
                <MessageCircle className="h-4 w-4 mr-1" /> {comments.length} Comments
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1" /> Share
              </Button>
              <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                <Eye className="h-3 w-3" /> {views}
              </div>
            </CardFooter>

            <div className="mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
              {user && (
                <form onSubmit={handleSubmitComment} className="mb-4 flex gap-2">
                  <Avatar className="h-8 w-8"><AvatarImage src={user.photoURL || ''} /></Avatar>
                  <div className="flex-1">
                    <Textarea placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} className="min-h-[40px] text-sm" />
                    <div className="flex justify-end mt-2">
                      <Button type="submit" size="sm" disabled={isSubmittingComment || !commentText.trim()} className="bg-[#ffa600]">
                        <Send className="h-4 w-4 mr-2" /> {isSubmittingComment ? '...' : 'Comment'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-6 w-6"><AvatarImage src={comment.author?.avatarUrl} /></Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs" style={getStyledName(comment.author)}>{comment.author?.name}</span>
                        <span className="text-xs text-gray-400">{getTimeAgo(getSafeDate(comment.createdAt))}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeletePost(); }} className="bg-red-500">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportDialog postId={post.id} open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} />
      {isPreviewing && previewUserId && <ProfilePreviewCard userId={previewUserId} onOpenChange={setIsPreviewing} />}
      {isDialogOpen && <PostDialog post={post} onOpenChange={setIsDialogOpen} onPostDeleted={onPostDeleted} />}
      <SignInPrompt open={showSignInPrompt} onOpenChange={setShowSignInPrompt} />

      <style jsx>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes bounce-once { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }
        @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        .animate-bounce-once { animation: bounce-once 0.4s ease-out; }
      `}</style>
    </>
  );
});

PostCard.displayName = "PostCard";

// --- Main Page Component ---
export default function CommunityPostPage() {
  const params = useParams();
  const name = params?.name as string;
  const postId = params?.postId as string;
  
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        const fetchedPost = await getPostById(postId);
        setPost(fetchedPost);
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffa600]"></div>
      </div>
    );
  }

  if (!post) return notFound();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
            <MessageCircle className="h-6 w-6 text-[#ffa600]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Post in {name}</h1>
            <p className="text-gray-600">Community discussion</p>
          </div>
        </div>
        <Separator className="my-4" />
      </div>
      
      <PostCard 
        post={post} 
        currentUserId={user?.uid || ''}
      />
    </div>
  );
}