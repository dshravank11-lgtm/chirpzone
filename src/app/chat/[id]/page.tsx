'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { SendHorizonal, ArrowLeft, Loader, Camera, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { usePresence } from '@/hooks/usePresence';
import { getCroppedImg } from '@/lib/utils';
import Cropper from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { 
    getUserProfile, 
    sendMessage, 
    onMessagesUpdate, 
    getChatRoom, 
    addMemberToGroup, 
    removeMemberFromGroup, 
    createChatRoom, 
    updateGroupImage, 
    markChatAsRead 
} from '@/services/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import type { Unsubscribe } from 'firebase/firestore';
import PageTransition from '@/components/page-transition';
import { motion, AnimatePresence } from 'framer-motion';
import { GroupMembersDialog } from '@/components/group-members-dialog';

export default function ChatPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const chatIdOrFriendId = params?.id as string;
    
    const [chatRoom, setChatRoom] = useState<any>(null);
    const [friend, setFriend] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [messageLoading, setMessageLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<{text: string, tempId: string} | null>(null);

    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const friendId = chatRoom?.isGroup ? null : chatRoom?.members?.find((id: string) => id !== user?.uid);
    const isFriendOnline = usePresence(friendId);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, pendingMessage]);

    const playClickSound = () => {
        try {
            const audio = new Audio('/click.mp3');
            audio.volume = 0.5;
            audio.play().catch(err => console.log('Audio play failed:', err));
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    };

const getStyledName = (friend: any) => {
    if (!friend) return {};
    
    const style: React.CSSProperties = {
      fontFamily: friend.nameFont || 'PT Sans, sans-serif',
    };
  
    if (friend.nameEffect === 'none') {
      style.color = friend.nameColor || '#ff990a';
    } else if (friend.nameEffect === 'gradient') {
      style.backgroundImage = friend.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
      style.WebkitBackgroundClip = 'text';
      style.WebkitTextFillColor = 'transparent';
      style.backgroundClip = 'text';
    } else if (friend.nameEffect === 'moving-gradient') {
      style.backgroundImage = friend.nameColor || 'linear-gradient(90deg, #ff990a, #ff6b00)';
      style.backgroundSize = '200% 200%';
      style.WebkitBackgroundClip = 'text';
      style.WebkitTextFillColor = 'transparent';
      style.backgroundClip = 'text';
      style.animation = 'gradientMove 3s ease infinite';
    }
  
    return style;
  };
  
    const setupChat = async () => {
        if (!user || !chatIdOrFriendId) return;
        setLoading(true);
        try {
            let room = await getChatRoom(chatIdOrFriendId);

            if (!room) {
                const friendProfile = await getUserProfile(chatIdOrFriendId);
                if (friendProfile) {
                    const newRoomId = await createChatRoom([user.uid, chatIdOrFriendId]);
                    room = await getChatRoom(newRoomId);
                    window.history.replaceState(null, '', `/chat/${newRoomId}`);
                } else {
                     router.push('/chat');
                     return;
                }
            }
            
            if (!room.members.includes(user.uid)) {
                 router.push('/chat');
                 return;
            }

            setChatRoom(room);
            await markChatAsRead(room.id, user.uid);

            if (!room.isGroup) {
                const fId = room.members.find((id: string) => id !== user.uid);
                if (fId) {
                    const friendProfile = await getUserProfile(fId);
                    setFriend(friendProfile);
                }
            }
        } catch (error) {
            console.error("Error setting up chat:", error);
            router.push('/chat');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setupChat();
    }, [user, chatIdOrFriendId]);

    useEffect(() => {
        let unsubscribe: Unsubscribe | undefined;
        if (chatRoom?.id && user?.uid) {
            setMessageLoading(true);
            unsubscribe = onMessagesUpdate(chatRoom.id, (initialMessages) => {
                setMessages(initialMessages);
                setMessageLoading(false);
                markChatAsRead(chatRoom.id, user.uid);
                // Clear pending message when new messages arrive
                if (pendingMessage) {
                    setPendingMessage(null);
                }
            });
        }
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [chatRoom?.id, user?.uid]);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result as string);
                setIsCropping(true);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleImageUpload = async () => {
        if (!imageSrc || !croppedAreaPixels || !chatRoom?.id || !chatRoom?.isGroup) return;

        try {
            setUploading(true);
            setIsCropping(false);
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            const croppedImageFile = new File([croppedImage], 'group_avatar.jpeg', { type: 'image/jpeg' });
            await updateGroupImage(chatRoom.id, croppedImageFile);
            const updatedRoom = await getChatRoom(chatRoom.id);
            setChatRoom(updatedRoom);
        } catch (error) {
            console.error("Upload failed:", error);
        } finally {
            setUploading(false);
            setImageSrc(null);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !user || !chatRoom?.id || isSending) return;

        const text = newMessage;
        const tempId = `temp-${Date.now()}`;
        setPendingMessage({ text, tempId });
        setNewMessage('');
        setIsSending(true);

        // Play sound immediately
        playClickSound();

        try {
            await sendMessage(chatRoom.id, user.uid, text);
            // Wait a bit before clearing pending to ensure Firebase update comes through
            setTimeout(() => {
                setPendingMessage(null);
                setIsSending(false);
            }, 500);
        } catch (error) {
            console.error("Error sending message:", error);
            setNewMessage(text);
            setPendingMessage(null);
            setIsSending(false);
        }
    };

    const handleAddMembers = async (memberIds: string[]) => {
        if (!chatRoom?.id) return;
        for (const memberId of memberIds) {
            await addMemberToGroup(chatRoom.id, memberId);
        }
        setupChat();
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!chatRoom?.id) return;
        await removeMemberFromGroup(chatRoom.id, memberId);
        setupChat();
    };

    const handleLeaveGroup = async () => {
        if (!chatRoom?.id || !user?.uid) return;
        
        const confirmLeave = window.confirm("Are you sure you want to leave this group?");
        if (!confirmLeave) return;

        try {
            await removeMemberFromGroup(chatRoom.id, user.uid);
            router.push('/chat'); 
        } catch (error) {
            console.error("Error leaving group:", error);
        }
    };

    if (loading || !chatRoom) {
        return (
            <AppLayout>
                <div className="flex flex-col h-[calc(100vh-64px)] p-4 md:p-6">
                    <Card className="flex-1 flex flex-col border-border/50 shadow-xl bg-gradient-to-br from-background via-background to-muted/10">
                        <CardHeader className="flex flex-row items-center gap-4 border-b border-border/50 bg-gradient-to-r from-background to-muted/5">
                            <Skeleton className="h-14 w-14 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-[180px]" />
                                <Skeleton className="h-3 w-[100px]" />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                                <Loader className="h-10 w-10 text-[#ffa600]" />
                            </motion.div>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    const displayName = chatRoom?.isGroup ? chatRoom.name : friend?.name;
    const displayAvatar = chatRoom?.isGroup 
        ? (chatRoom.groupIcon || `https://placehold.co/100x100.png?text=${chatRoom.name.charAt(0)}`) 
        : (friend?.avatarUrl || 'https://placehold.co/100x100.png');

    return (
        <AppLayout>
            <PageTransition>
                <div className="flex flex-col h-[calc(100vh-64px)]">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="flex-1 flex flex-col"
                    >
                        {/* Sticky Header - Now positioned outside the scrolling container */}
                        <div className="sticky top-0 z-10 border-b border-border/50 bg-gradient-to-r from-background to-muted/5 backdrop-blur-md shadow-md">
                            <div className="flex items-center justify-between gap-4 p-4 md:p-5">
                                <div className="flex items-center gap-4">
                                    <Link href="/chat">
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                            <Button variant="ghost" size="icon" className="hover:bg-[#ffa600]/10 rounded-full">
                                                <ArrowLeft className="h-5 w-5" />
                                            </Button>
                                        </motion.div>
                                    </Link>
                                    
                                    
<div className="relative group/avatar">
    <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300 }}
    >
        <Avatar 
            className={`h-14 w-14 ring-2 ring-[#ffa600]/20 transition-all shadow-lg ${chatRoom?.isGroup ? 'cursor-pointer hover:ring-[#ffa600]/40' : ''}`}
            onClick={() => chatRoom?.isGroup && fileInputRef.current?.click()}
        >
            <AvatarImage src={displayAvatar} />
            <AvatarFallback className="bg-[#ffa600] text-black font-bold text-lg">
                {displayName?.substring(0, 1).toUpperCase()}
            </AvatarFallback>
        </Avatar>
    </motion.div>
    
    {chatRoom?.isGroup && (
        <>
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none">
                <Camera className="h-5 w-5 text-white" />
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*" 
            />
        </>
    )}

    {!chatRoom?.isGroup && isFriendOnline && (
        <motion.span
            className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-[3px] border-background shadow-lg"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
        />
    )}
    {uploading && (
        <div className="absolute -inset-1 flex items-center justify-center bg-background/80 rounded-full backdrop-blur-sm">
            <Loader className="h-6 w-6 animate-spin text-[#ffa600]" />
        </div>
    )}
</div>

<div>
    <h2 
      className="text-xl font-bold text-[#ffa600]"
      style={!chatRoom?.isGroup ? getStyledName(friend) : {}}
    >
        {displayName}
    </h2>
    {!chatRoom?.isGroup ? (
        <motion.p 
            className={`text-xs font-medium ${isFriendOnline ? 'text-green-500' : 'text-muted-foreground'}`}
            animate={isFriendOnline ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
        >
            {isFriendOnline ? '● Online' : '○ Offline'}
        </motion.p>
    ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {chatRoom?.members?.length || 0} members
        </p>
    )}
</div>
                                </div>
                                {chatRoom?.isGroup && (
                                    <GroupMembersDialog 
                                        chatId={chatRoom.id}
                                        name={chatRoom.name}
                                        members={chatRoom.memberProfiles || []} 
                                        createdBy={chatRoom.createdBy} 
                                        onAddMembers={handleAddMembers}
                                        onRemoveMember={handleRemoveMember}
                                        onUpdateName={(newName) => setChatRoom(prev => ({ ...prev, name: newName }))}
                                        onLeaveGroup={handleLeaveGroup}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Scrollable Messages Container */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-muted/5">
                            {messageLoading ? (
                                <div className="flex flex-col justify-center items-center h-full gap-4">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Loader className="h-10 w-10 text-[#ffa600]" />
                                    </motion.div>
                                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                                </div>
                            ) : (
                                <>
                                    <AnimatePresence initial={false}>
                                        {messages.map((msg, index) => (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ 
                                                    type: "spring",
                                                    stiffness: 400,
                                                    damping: 25,
                                                    delay: index * 0.03
                                                }}
                                                className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <motion.div 
                                                    whileHover={{ scale: 1.02, y: -2 }}
                                                    className={`rounded-2xl px-5 py-3 max-w-[75%] shadow-md transition-shadow hover:shadow-lg ${
                                                        msg.senderId === user?.uid
                                                            ? 'bg-[#ffa600] text-black font-medium'
                                                            : 'bg-muted border border-border/50'
                                                    }`}
                                                >
                                                    <p className="break-words">{msg.text}</p>
                                                </motion.div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    
                                    {/* Pending message animation */}
                                    <AnimatePresence>
                                        {pendingMessage && (
                                            <motion.div
                                                key={pendingMessage.tempId}
                                                initial={{ opacity: 0, scale: 0.3, x: -100 }}
                                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                className="flex justify-end"
                                            >
                                                <motion.div 
                                                    className="rounded-2xl px-5 py-3 max-w-[75%] bg-[#ffa600] text-black font-medium shadow-md"
                                                    animate={{ opacity: [0.7, 1, 0.7] }}
                                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                                >
                                                    <p className="break-words">{pendingMessage.text}</p>
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Sticky Input Footer */}
                        <div className="sticky bottom-0 border-t border-border/50 p-4 md:p-5 bg-muted/5 backdrop-blur-sm">
                            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-3">
                                <motion.div 
                                    className="flex-1"
                                    animate={isSending ? { scale: [1, 0.98, 1] } : {}}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Input
                                        ref={inputRef}
                                        placeholder="Type your message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="h-12 border-2 border-[#ffa600]/30 focus:ring-2 focus:ring-[#ffa600] focus:border-[#ffa600] rounded-xl transition-all"
                                        disabled={isSending}
                                    />
                                </motion.div>
                                <motion.div
                                    whileTap={{ scale: 0.9 }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <Button
                                        type="submit"
                                        disabled={isSending || !newMessage.trim()}
                                        className="h-12 px-6 bg-[#ffa600] hover:bg-[#ff8c00] text-black font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                                    >
                                        <motion.div
                                            animate={isSending ? { rotate: 360 } : { rotate: 0 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            {isSending ? (
                                                <Loader className="h-5 w-5" />
                                            ) : (
                                                <SendHorizonal className="h-5 w-5" />
                                            )}
                                        </motion.div>
                                    </Button>
                                </motion.div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </PageTransition>

            {/* Cropping Dialog */}
            <Dialog open={isCropping} onOpenChange={setIsCropping}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crop Group Image</DialogTitle>
                    </DialogHeader>
                    <div className="relative h-64 w-full">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                            cropShape="round"
                            showGrid={false}
                        />
                         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48">
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.1}
                                onValueChange={(value) => setZoom(value[0])}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleImageUpload} disabled={uploading}>
                            {uploading ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}