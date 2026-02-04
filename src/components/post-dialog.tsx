import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, MessageCircle, Share2, Trash2, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { addComment, deletePost, getCommentsByPostId, User, likePost, unlikePost, likeComment, unlikeComment, getUserProfile } from '@/services/firebase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProfilePreviewCard } from './profile-preview-card';
import { useToast } from '@/components/ui/use-toast';

interface Comment {
  id: string;
  author: User;
  authorId?: string;
  text: string;
  createdAt: any;
  likes?: number;
}

interface PostDialogProps {
  post: {
    id: string;
    author: User;
    authorId: string;
    content: string;
    imageUrl?: string;
    likes: number;
    shares: number;
    createdAt: any;
  };
  onOpenChange: (open: boolean) => void;
  onPostDeleted?: (postId: string) => void;
}

const getSafeDate = (date: any): Date | null => {
    if (!date) return null;
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) {
        return null;
    }
    return d;
}

const CommentView: React.FC<{ comment: Comment, index: number, isVisible: boolean, onAuthorClick: (userId: string) => void }> = ({ comment, index, isVisible, onAuthorClick }) => {
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

    if (!comment || !comment.id) {
        return null;
    }
    const commentDate = getSafeDate(comment.createdAt);
    const userId = comment.authorId || comment.author.id;

    const handleLike = async () => {
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

  return (
    <div
        className={`flex items-start space-x-3 mt-4 ${isVisible ? 'animate-fall-down' : 'animate-fall-up'}`}
        style={{ animationDelay: `${index * 100}ms` }}
    >
      <Avatar className="h-8 w-8 cursor-pointer" onClick={() => onAuthorClick(userId)}>
          <AvatarImage src={comment.author.avatarUrl} alt={`@${comment.author.username}`} />
          <AvatarFallback>{comment.author?.name?.charAt(0) || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm cursor-pointer" onClick={() => onAuthorClick(userId)}>{comment.author?.name || 'Unknown'}</span>
            <span className="text-xs text-gray-500 cursor-pointer" onClick={() => onAuthorClick(userId)}>@{comment.author.username}</span>
          </div>
          <p className="text-sm">{comment.text}</p>
        </div>
        <div className="flex items-center justify-start gap-2 mt-1">
            <Button variant="ghost" size="sm" className={`flex items-center gap-1 text-xs ${isLiked ? 'text-red-500' : 'text-orange-500'}`} onClick={handleLike} disabled={isLiking}>
                <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likeCount}</span>
            </Button>
            <span className="text-xs text-gray-500 cursor-pointer" onClick={() => onAuthorClick(userId)}>
            {commentDate ? commentDate.toLocaleString() : 'just now'}
            </span>
        </div>
      </div>
    </div>
  );
};

export const PostDialog: React.FC<PostDialogProps> = ({ post, onOpenChange, onPostDeleted }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const postDate = getSafeDate(post.createdAt);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = getCommentsByPostId(post.id, setComments);
    return () => unsubscribe();
  }, [post.id]);

  const handleLike = async () => {
    if (!user) return;

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(newIsLiked ? likeCount + 1 : likeCount - 1);
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
        console.error("Error liking/unliking post:", error);
        // Revert UI changes on error
        setIsLiked(!newIsLiked);
        setLikeCount(newIsLiked ? likeCount -1 : likeCount + 1);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && user) {
      setIsSending(true);
      try {
        // Fix: Destructure from the response object
        const response = await addComment(post.id, user.uid, newComment.trim());

        setNewComment('');

        // Safe check using optional chaining
        if (response?.streakInfo?.streakUpdated) {
            toast({
                title: 'Streak Updated!',
                description: `You're now on a ${response.streakInfo.streak}-day streak! +20 ChirpScore!`,
            });
        }
      } catch (error) {
        console.error("Error adding comment:", error);
        toast({
            variant: "destructive",
            title: "Failed to add comment",
            description: "There was an error posting your comment.",
        });
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleDeletePost = async () => {
    setShowDeleteConfirm(false);
    if (onPostDeleted) {
      onPostDeleted(post.id);
    }
    onOpenChange(false);

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
      // Note: A more robust solution would involve re-adding the post to the list on failure.\n
    }
  }

  const handleAuthorClick = (userId: string) => {
    setPreviewUserId(userId);
    setIsPreviewing(true);
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-5/6 flex flex-col">
        <DialogHeader className="text-center">
          <DialogTitle className="text-3xl font-bold text-center">
            <span className="text-orange-500">{post.author?.name || 'Unknown'}</span>'s Post
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-start space-x-4">
                <Avatar className="cursor-pointer" onClick={() => handleAuthorClick(post.authorId)}>
                    <AvatarImage src={post.author.avatarUrl} alt={`@${post.author.username}`} />
                    <AvatarFallback>{post.author?.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold cursor-pointer" onClick={() => handleAuthorClick(post.authorId)}>{post.author?.name || 'Unknown'}</h3>
                        <span className="text-sm text-gray-500 cursor-pointer" onClick={() => handleAuthorClick(post.authorId)}>@{post.author.username}</span>
                    </div>
                    <time className="text-xs text-gray-500 cursor-pointer" onClick={() => handleAuthorClick(post.authorId)} dateTime={postDate ? postDate.toISOString() : new Date().toISOString()}>
                        {postDate ? postDate.toLocaleString() : 'just now'}
                    </time>
                </div>
                {user && post.author.username === user.username && (
                    <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="h-5 w-5" />
                    </Button>
                )}
            </div>

            <div className="mt-4">
                <p className="whitespace-pre-wrap">{post.content}</p>
                {post.imageUrl && (
                    <div className="mt-4">
                    <img src={post.imageUrl} alt="Post attachment" className="rounded-lg w-full object-cover" />
                    </div>
                )}
            </div>

            <div className="mt-4 flex justify-around border-t pt-4">
                <Button variant="ghost" size="lg" className="flex items-center space-x-2" onClick={handleLike}>
                    <Heart className={`h-6 w-6 ${isLiked ? 'text-red-500 fill-current' : ''} transition-transform duration-300 ${isAnimating ? 'scale-125' : 'scale-100'}`} />
                    <span>{likeCount}</span>
                </Button>
                <Button variant="ghost" size="lg" className="flex items-center space-x-2">
                    <Share2 className="h-6 w-6" />
                    <span>{post.shares}</span>
                </Button>
            </div>

            <div className="mt-4 border-t pt-4">
                <form onSubmit={handleCommentSubmit} className={`flex items-center space-x-2 ${isSending ? 'animate-send-bounce' : ''}`}>
                    <Avatar className="h-8 w-8">
                        {user && (
                            <>
                                <AvatarImage src={user.avatarUrl} alt={`@${user.username}`} />
                                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                            </>
                        )}
                    </Avatar>
                    <Input
                        placeholder="Add a comment..."
                        className="flex-1"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={!user}
                    />
                    <Button type="submit" disabled={!newComment.trim() || !user}>Send</Button>
                </form>

                <div className="mt-4 space-y-4">
                    {comments.length === 0 && (
                        <p className="text-sm text-gray-500 text-center">No comments yet.</p>
                    )}
                    {comments.map((comment, index) => (
                        <CommentView key={comment.id} comment={comment} index={index} isVisible={true} onAuthorClick={handleAuthorClick} />
                    ))}
                </div>
            </div>
        </div>
        <DialogFooter className="sm:justify-center">
            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your post.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePost}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {isPreviewing && previewUserId && (
            <ProfilePreviewCard userId={previewUserId} onOpenChange={setIsPreviewing} />
        )}
      </DialogContent>
    </Dialog>
  );
};