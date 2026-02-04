'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Loader, MessageCircle, Ghost } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { usePresence, useGroupPresence } from '@/hooks/usePresence';
import { getUserChats, unfollowUser, getUserProfile } from '@/services/firebase';
import { formatDistanceToNow } from 'date-fns';
import PageTransition from '@/components/page-transition';
import { Button } from '@/components/ui/button';
import { UsersIcon } from '@/components/icons/users-icon';
import { motion } from 'framer-motion';

const ChatListItem = ({ chat, currentUser, onUnfriend }: { chat: any, currentUser: any, onUnfriend: () => void }) => {
  const { user } = useAuth();
  const isFriendOnline = usePresence(chat.isGroup ? null : chat.friend.uid);
  const onlineMembers = useGroupPresence(chat.isGroup ? chat.members : []);
  
  // Unread logic
  const unreadCount = chat.unreadCount?.[user?.uid || ''] || 0;

  // Get styled name for friend
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

  const nameStyle = getStyledName(chat.friend);

  const handleUnfriend = async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      await unfollowUser(currentUser.uid, chat.friend.uid);
      onUnfriend();
  };

  const chatHref = chat.id ? `/chat/${chat.id}` : `/chat/${chat.friend.uid}`;

  // Common Avatar Rendering
  const displayAvatar = chat.isGroup ? (chat.groupIcon || chat.friend.avatarUrl) : chat.friend.avatarUrl;

  return (
      <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-4 hover:shadow-lg hover:shadow-[#ffa600]/20 hover:border-[#ffa600]/50 transition-all duration-300"
      >
          <div className="relative flex items-center gap-4">
               <Link href={chatHref} className="flex-shrink-0">
                  <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-background group-hover:ring-[#ffa600]/50 transition-all">
                          <AvatarImage src={displayAvatar} />
                          <AvatarFallback className="bg-[#ffa600] text-black font-semibold">
                              {chat.friend.name.substring(0, 1).toUpperCase()}
                          </AvatarFallback>
                      </Avatar>
                      {!chat.isGroup && isFriendOnline && (
                          <motion.span 
                              className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                          />
                      )}
                  </div>
              </Link>
              <div className="flex-1 min-w-0">
                  <Link href={chatHref} className="block">
                      <div className="flex items-center justify-between">
                          <p 
                            className={`font-semibold ${unreadCount > 0 ? 'text-[#ffa600]' : 'text-foreground'}`}
                            style={nameStyle}
                          >
                              {chat.friend.name}
                          </p>
                          {unreadCount > 0 && (
                              <span className="bg-[#ffa600] text-black text-[10px] font-bold px-2 py-0.5 rounded-full ring-2 ring-background">
                                  {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
                          )}
                      </div>
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                          {chat.lastMessage || 'No messages yet'}
                      </p>
                      
                      {chat.isGroup && chat.memberProfiles && (
                           <div className="flex items-center gap-1 mt-1 opacity-60">
                              <UsersIcon className="w-3 h-3" />
                              <span className="text-[10px]">{chat.members.length} members</span>
                           </div>
                      )}
                  </Link>
              </div>
              <div className="flex flex-col items-end gap-2">
                  {chat.lastMessageAt?.toDate && (
                      <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true })}
                      </p>
                  )}
                  {!chat.isGroup && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleUnfriend}>
                          Unfriend
                      </Button>
                  )}
              </div>
          </div>
      </motion.div>
  );
}

export default function ChatListPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchCurrentUser = async () => {
    if (user?.uid) {
        const profile = await getUserProfile(user.uid);
        setCurrentUser(profile);
    }
  }

  useEffect(() => {
    fetchCurrentUser();
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = getUserChats(user.uid, (userChats) => {
        const sortedChats = userChats.sort((a, b) => {
          const timeA = a.lastMessageAt?.toDate() || 0;
          const timeB = b.lastMessageAt?.toDate() || 0;
          return timeB - timeA;
        });
        setChats(sortedChats);
        setLoading(false);
      });

      return () => unsubscribe();
    } else if (user === null) {
        setLoading(false);
    }
  }, [user]);

  return (
    <AppLayout>
      <PageTransition>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#ffa600]/10 border border-[#ffa600]/20">
            <MessageCircle className="h-6 w-6 text-[#ffa600]" />
          </div>
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-[#ffa600]">Messages</h2>
          </div>
        </div>

        <Card className="border-border/50 shadow-lg bg-gradient-to-br from-background via-background to-muted/20">
          <CardHeader>
            <CardTitle className='flex justify-between items-center'>
              <span className="text-[#ffa600]">Conversations</span>
              <Link href="/chat/new-group">
                <Button 
                  size='sm'
                  className="bg-[#ffa600] hover:bg-[#ff8c00] text-black font-semibold"
                >
                  <UsersIcon className='w-4 h-4 mr-2' />
                  Create Group
                </Button>
              </Link>
            </CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ffa600]" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-10 border-[#ffa600]/30 focus:ring-[#ffa600] focus:border-[#ffa600]" 
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-24">
                <Loader className="h-6 w-6 animate-spin text-[#ffa600]" />
              </div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="p-4 rounded-full bg-muted/50">
                  <Ghost className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No conversations yet</h3>
                  <p className="text-muted-foreground">Find a friend to start chatting!</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {chats.map(chat => (
                  <ChatListItem key={chat.id} chat={chat} currentUser={currentUser} onUnfriend={fetchCurrentUser} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </PageTransition>
    </AppLayout>
  );
}