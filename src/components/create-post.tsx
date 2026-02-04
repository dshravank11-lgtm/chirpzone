
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizonal, ImageUp, X, Sparkles, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { createPost as createPostService } from '@/services/firebase';
import { type Post } from '@/components/post-card';
import { motion } from 'framer-motion';
import { censorText } from '@/lib/censor';
import { doc, updateDoc, increment, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const EXEMPT_UIDS = [
    "ZonTkSaIyebzkr3kPQW1sCncId63",
    "9T0b6EfDYghIjhuEU4QopdjJjUt1",
    "YmNJAuPyGKM6qPbhEs78AuyhPSz1",
    "m37C815wG6VqVNW8LLjmZc4IIHF3",
    "vFgkT0sz0rhcALPbVceiiKIHcC13"
];

export function CreatePost({
    isAnonymousDefault = false,
    variant = "default",
    onPostCreated,
    onStreakUpdate,
}: {
    isAnonymousDefault?: boolean;
    variant?: "default" | "confession";
    onPostCreated?: (newPost: Post) => void;
    onStreakUpdate?: (streak: number) => void;
}) {
    const { user } = useAuth();
    const [message, setMessage] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(isAnonymousDefault);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Anti-spam state
    const [postTimestamps, setPostTimestamps] = useState<number[]>([]);
    const [cooldownEndTime, setCooldownEndTime] = useState<number>(0);
    const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

    useEffect(() => {
        if (cooldownEndTime > Date.now()) {
            const interval = setInterval(() => {
                const remaining = Math.ceil((cooldownEndTime - Date.now()) / 1000);
                setCooldownRemaining(remaining > 0 ? remaining : 0);
                if (remaining <= 0) {
                    clearInterval(interval);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [cooldownEndTime]);

    const handleAnonymousChange = (checked: boolean) => {
        setIsAnonymous(checked);
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handlePost = async () => {
        new Audio('/click.mp3').play().catch(() => {});

        if (cooldownEndTime > Date.now()) {
            toast({
                variant: "destructive",
                title: "You're posting too fast!",
                description: `Please wait ${cooldownRemaining} seconds before posting again.`,
            });
            return;
        }

        const now = Date.now();
        const sevenSecondsAgo = now - 7000;
        const recentPosts = postTimestamps.filter(ts => ts > sevenSecondsAgo);

        if (recentPosts.length >= 3) {
            toast({
                variant: "destructive",
                title: "Spam protection activated",
                description: "You have been timed out for 5 seconds.",
            });
            const newCooldownEndTime = now + 5000;
            setCooldownEndTime(newCooldownEndTime);
            setCooldownRemaining(5);
            setPostTimestamps([]); 
            return;
        }

        if (!user && !isAnonymous) {
            toast({
                variant: "destructive",
                title: "Not logged in",
                description: "You must be logged in to create a post.",
            });
            return;
        }

        const rawMessage = message?.trim() || "";
        if (rawMessage === "") {
            toast({
                variant: "destructive",
                title: "Message is empty",
                description: "You cannot create an empty post.",
            });
            return;
        }

        const { censored, wasCensored } = censorText(rawMessage);
        
        setIsPosting(true);
        try {
            const userRef = user ? doc(db, 'users', user.uid) : null;
            const userSnap = userRef ? await getDoc(userRef) : null;
            const userData = userSnap?.data();
            
            let isCurrentlyShadowBanned = false;
            const isExempt = user ? EXEMPT_UIDS.includes(user.uid) : false;

            if (userData?.shadowBanUntil) {
                if (now < userData.shadowBanUntil.toMillis()) {
                    isCurrentlyShadowBanned = true;
                }
            }

            if (wasCensored && user && !isExempt) {
                const newWarningCount = (userData?.warningCount || 0) + 1;
                const updatePayload: any = { warningCount: increment(1) };

                if (newWarningCount >= 3) {
                    const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
                    const banUntilDate = new Date(now + fiveDaysInMs);
                    updatePayload.shadowBanUntil = Timestamp.fromDate(banUntilDate);
                    isCurrentlyShadowBanned = true;
                    toast({
                        variant: "destructive",
                        title: "5-Day Shadow Ban Active",
                        description: "Repeated violations. Your posts will be hidden for 5 days.",
                    });
                } else {
                    toast({
                        variant: "destructive",
                        title: `Warning (${newWarningCount}/3)`,
                        description: "Profanity detected and replaced. Keep it friendly!",
                    });
                }
                if(userRef) await updateDoc(userRef, updatePayload);
            }

            const { post: newPost, streakInfo } = await createPostService(
                user?.uid,
                censored,
                isAnonymous,
                imagePreview,
                isExempt ? false : isCurrentlyShadowBanned
            );

            setPostTimestamps(prev => [...prev, now]);

            if (onPostCreated && (isExempt || !isCurrentlyShadowBanned)) {
                onPostCreated(newPost);
            }

            if (streakInfo.streakUpdated && onStreakUpdate) {
                onStreakUpdate(streakInfo.streak);
            }

            const pointsGained = 2 + (streakInfo.streakUpdated ? 20 : 0);

            toast({ 
                title: (isCurrentlyShadowBanned && !isExempt) ? "Post Submitted" : (streakInfo.streakUpdated ? "Streak Increased! 🔥" : "Post Created!"), 
                description: (
                    <div className="flex items-center gap-2">
                        <span>{(isCurrentlyShadowBanned && !isExempt) ? "Sent for moderation." : "Your chirp is live."} </span>
                        <span className="font-bold text-[#ffa600] flex items-center">
                            +{pointsGained} Score <Sparkles className="ml-1 h-3 w-3" />
                        </span>
                    </div>
                )
            });

            setMessage("");
            removeImage();
        } catch (error: any) {
            console.error("Error creating post:", error);
            toast({
                variant: "destructive",
                title: "Failed to create post",
                description: error.message,
            });
        } finally {
            setIsPosting(false);
        }
    };

    const cardClasses = cn(
        variant === "confession" ? "bg-blue-950 text-blue-50 border-0" : ""
    );
    const textareaClasses = cn(
        "min-h-[80px] w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-2",
        variant === "confession" && "placeholder:text-blue-300"
    );
    const labelClasses = cn(variant === "confession" && "text-blue-200");
    const hasMessage = (message?.trim() || "").length > 0;
    const isDisabled = isPosting || cooldownRemaining > 0;

    const avatarSrc = isAnonymous
        ? "https://placehold.co/100x100.png"
        : user?.photoURL || "";
    const avatarFallback = isAnonymous
        ? "A"
        : user?.displayName?.substring(0, 1).toUpperCase() || "Y";

    const sendVariants = {
        initial: { x: 0, y: 0, opacity: 1 },
        animate: {
            x: 100,
            y: -100,
            opacity: 0,
            transition: { duration: 0.5, ease: "easeIn" },
        },
    };

    return (
        <Card className={cardClasses}>
            <CardContent className="p-4">
                <div className="flex gap-4">
                    <Avatar>
                        <AvatarImage src={avatarSrc} alt="You" />
                        <AvatarFallback>{avatarFallback}</AvatarFallback>
                    </Avatar>
                    <div className="w-full">
                        <Textarea
                            placeholder={variant === 'confession' ? 'Share your secret...' : "What's on your mind?"}
                            className={textareaClasses}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={isDisabled}
                        />
                        {imagePreview && (
                            <div className="mt-4 relative">
                                <Image
                                    src={imagePreview}
                                    alt="Image preview"
                                    width={500}
                                    height={300}
                                    className="rounded-lg w-full object-cover"
                                />
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="absolute top-2 right-2 h-6 w-6"
                                    onClick={removeImage}
                                    disabled={isDisabled}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
            <CardFooter
                className={cn(
                    "flex justify-between items-center px-4 py-3",
                    variant === "confession" ? "border-t border-blue-800" : "border-t"
                )}
            >
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isDisabled}
                    />
                    <Button
                        size="icon"
                        variant="outline"
                        className={cn(
                            variant === "confession"
                                ? "bg-transparent border-blue-600 hover:bg-blue-800"
                                : ""
                        )}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isDisabled}
                    >
                        <ImageUp className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="anonymous-mode"
                            checked={isAnonymous}
                            onCheckedChange={handleAnonymousChange}
                            disabled={isDisabled || variant === "confession"}
                        />
                        <Label htmlFor="anonymous-mode" className={labelClasses}>
                            Post Anonymously
                        </Label>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        className={cn(
                            variant === "confession" &&
                                "bg-accent hover:bg-accent/90 text-accent-foreground",
                            "w-28" // Fixed width for the button
                        )}
                        onClick={handlePost}
                        disabled={!hasMessage || isDisabled}
                    >
                        {cooldownRemaining > 0 ? (
                            <div className="flex items-center">
                                <AlertTriangle className="mr-2 h-4 w-4 animate-pulse" />
                                Wait {cooldownRemaining}s
                            </div>
                        ) : (
                            <motion.div
                                variants={sendVariants}
                                animate={isPosting ? "animate" : "initial"}
                                className="flex items-center"
                            >
                                <SendHorizonal className="mr-2 h-4 w-4" />
                                {isPosting
                                    ? "Posting..."
                                    : variant === "confession"
                                    ? "Confess"
                                    : "Chirp"}
                            </motion.div>
                        )}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
