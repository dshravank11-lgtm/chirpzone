'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { censorText } from '@/lib/censor';
import { useToast } from '@/components/ui/use-toast';
import { addComment } from '@/services/firebase';
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CreateComment({ postId, onCommentAdded }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const validateComment = (text: string) => {
    const trimmed = text.trim();
    
    if (!trimmed) {
      setValidationError('Comment cannot be empty');
      return false;
    }
    
    if (trimmed.length < 2) {
      setValidationError('Comment is too short');
      return false;
    }
    
    if (trimmed.length > 500) {
      setValidationError(`Comment is too long (${trimmed.length}/500 characters)`);
      return false;
    }
    
    // Check for excessive whitespace
    if (trimmed.split(/\s+/).length < 2 && trimmed.length > 20) {
      setValidationError('Please use proper spacing in your comment');
      return false;
    }
    
    // Check for repetitive characters
    const charArray = trimmed.split('');
    const uniqueChars = new Set(charArray);
    if (uniqueChars.size < 3 && trimmed.length > 10) {
      setValidationError('Comment appears repetitive');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  const handleChange = (e) => {
    const newText = e.target.value;
    setComment(newText);
    
    // Real-time validation (but only show after user stops typing)
    if (newText.trim().length > 0) {
      setTimeout(() => {
        validateComment(newText);
      }, 500);
    } else {
      setValidationError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Signed In",
        description: "Please sign in to comment.",
      });
      return;
    }

    // Final validation
    if (!validateComment(comment)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Censor the text
      const { censored, wasCensored, censoredWords } = censorText(comment);
      
      // Show warning if content was censored
      if (wasCensored) {
        toast({
          variant: "warning",
          title: "Content Filtered",
          description: `Some words were filtered: ${censoredWords.join(', ')}`,
          duration: 3000,
        });
      }
      
      // Call the addComment function
      const result = await addComment(postId, user.uid, censored);
      
      if (result.success) {
        // Clear the input on success
        setComment('');
        setValidationError('');
        
        // Show success message with bonus info
        if (result.notification.pointsEarned > 0) {
          toast({
            variant: "default",
            title: (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Comment Posted!</span>
              </div>
            ),
            description: (
              <div>
                <p>+{result.notification.pointsEarned} ChirpScore</p>
                <p className="text-sm text-muted-foreground">
                  {result.comment.dailyStats.remainingComments} comments left today
                </p>
              </div>
            ),
          });
        } else {
          toast({
            variant: "default",
            title: "Comment Posted",
            description: "Daily comment limit reached - no points awarded",
          });
        }
        
        // Callback if provided
        if (onCommentAdded) {
          onCommentAdded(result.comment);
        }
      }
      
    } catch (error) {
      console.error("Error adding comment:", error);
      
      // User-friendly error messages
      let toastTitle = "Error";
      let toastDescription = error.message;
      let toastVariant: "default" | "destructive" | "warning" = "destructive";
      
      // Categorize errors
      if (error.message.includes("already posted") || error.message.includes("similar")) {
        toastTitle = "Duplicate Content";
        toastVariant = "warning";
      } else if (error.message.includes("Please wait") || error.message.includes("too quickly")) {
        toastTitle = "Too Fast!";
        toastVariant = "warning";
      } else if (error.message.includes("daily limit") || error.message.includes("Come back tomorrow")) {
        toastTitle = "Limit Reached";
        toastVariant = "warning";
      } else if (error.message.includes("permission")) {
        toastTitle = "Permission Denied";
      } else if (error.message.includes("Network error") || error.message.includes("connection")) {
        toastTitle = "Connection Error";
        toastDescription = "Please check your internet connection";
      }
      
      toast({
        variant: toastVariant,
        title: toastTitle,
        description: toastDescription,
        duration: 5000,
      });
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = comment.length;
  const isNearLimit = characterCount > 450;
  const isOverLimit = characterCount > 500;

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div className="relative">
        <Textarea
          placeholder="Share your thoughts... (Max 500 characters)"
          value={comment}
          onChange={handleChange}
          disabled={isSubmitting}
          maxLength={500}
          className={`min-h-[100px] resize-none ${
            isOverLimit ? 'border-red-500' : 
            isNearLimit ? 'border-yellow-500' : ''
          }`}
          onBlur={() => validateComment(comment)}
        />
        
        {/* Character counter */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs ${
              isOverLimit ? 'text-red-600 font-bold' :
              isNearLimit ? 'text-yellow-600' :
              'text-gray-500'
            }`}>
              {characterCount}/500
            </span>
            
            {isSubmitting && (
              <span className="text-xs text-blue-500 flex items-center gap-1">
                <Clock className="h-3 w-3 animate-spin" />
                Posting...
              </span>
            )}
          </div>
          
          {validationError && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {validationError}
            </span>
          )}
        </div>
      </div>

      {/* Warning messages */}
      {isNearLimit && !isOverLimit && (
        <Alert variant="warning" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your comment is getting long ({characterCount}/500)
          </AlertDescription>
        </Alert>
      )}
      
      {isOverLimit && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Comment is too long! Please shorten it.
          </AlertDescription>
        </Alert>
      )}

      {/* Submit button */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting || !comment.trim() || !!validationError || isOverLimit}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Posting...
            </>
          ) : (
            'Post Comment'
          )}
        </Button>
      </div>
      
      {/* Info tip */}
      <p className="text-xs text-muted-foreground">
        • 2-second cooldown between comments • Max 15 comments/day • Points earned for first 15 comments daily
      </p>
    </form>
  );
}