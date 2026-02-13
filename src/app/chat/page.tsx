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

// Animation variants
const floatingVariants = {
  animate: {
    y: [0, -5, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const getStyledName = (friend: any) => {
  if (!friend) return {};
  
  const style: React.CSSProperties = {
    fontFamily: friend.nameFont || 'PT Sans, sans-serif',
  };

  const colorValue = friend.nameColor || '#ff990a';
  const effect = friend.nameEffect || 'none';

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
    style.textShadow = '0 0 25px rgba(178, 115, 237, 0.9), 0 0 50px rgba(75, 0, 130, 0.7), 0 0 75px rgba(138, 43, 226, 0.5)';
  } else if (effect === 'glitch') {
    style.color = colorValue;
    style.textShadow = '2px 0 #00ff00, -2px 0 #ff00ff, 0 2px #ff0000, 0 -2px #00ffff';
  }

  return style;
};

const ChatListItem = ({ chat, currentUser, onUnfriend }: { chat: any, currentUser: any, onUnfriend: () => void }) => {
  const { user } = useAuth();
  const isFriendOnline = usePresence(chat.isGroup ? null : chat.friend.uid);
  const onlineMembers = useGroupPresence(chat.isGroup ? chat.members : []);
  
  const unreadCount = chat.unreadCount?.[user?.uid || ''] || 0;
  const nameStyle = getStyledName(chat.friend);
  const hasNebulaEffect = chat.friend?.nameEffect === 'nebula';
  const hasGlitchEffect = chat.friend?.nameEffect === 'glitch';

  const handleUnfriend = async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      await unfollowUser(currentUser.uid, chat.friend.uid);
      onUnfriend();
  };

  const chatHref = chat.id ? `/chat/${chat.id}` : `/chat/${chat.friend.uid}`;
  const displayAvatar = chat.isGroup ? (chat.groupIcon || chat.friend.avatarUrl) : chat.friend.avatarUrl;

  return (
      <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-4 hover:shadow-lg hover:shadow-[#ffa600]/20 hover:border-[#ffa600]/50 transition-all duration-300"
      >
          {/* Enhanced Nebula Effect - MORE CIRCLES */}
          {hasNebulaEffect && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {/* Large background glow */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: '150px',
                  height: '150px',
                  background: 'radial-gradient(circle, rgba(138, 43, 226, 0.8) 0%, rgba(147, 112, 219, 0.5) 30%, transparent 70%)',
                  borderRadius: '50%',
                  filter: 'blur(20px)',
                }}
              />

              {/* Multiple rotating circles - INCREASED FROM 3 TO 6 */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`nebula-circle-${i}`}
                  animate={{
                    rotate: 360,
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.5, 0.2],
                  }}
                  transition={{
                    rotate: {
                      duration: 20 - i * 3, // FASTER ROTATION
                      repeat: Infinity,
                      ease: 'linear',
                    },
                    scale: {
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.3,
                    },
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    width: `${60 + i * 30}px`, // SMALLER START, MORE VARIETY
                    height: `${60 + i * 30}px`,
                    border: '3px solid', // THICKER BORDERS
                    borderColor: `rgba(${147 + i * 10}, ${112 + i * 5}, 219, ${0.3 + i * 0.07})`,
                    borderRadius: '50%',
                    filter: 'blur(3px)',
                  }}
                />
              ))}
              
              {/* Pulsating inner core */}
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 0.9, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(138, 43, 226, 0.6) 70%)',
                  borderRadius: '50%',
                  filter: 'blur(5px)',
                }}
              />

              {/* Increased particle count from 5 to 12 - MORE MOVEMENT */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={`nebula-particle-${i}`}
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 10 + Math.random() * 5, // VARIED SPEEDS
                    repeat: Infinity,
                    ease: 'linear',
                    delay: i * 0.2,
                  }}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    transformOrigin: `0 ${40 + (i % 3) * 15}px`, // MORE SPREAD
                  }}
                >
                  <motion.div
                    animate={{
                      scale: [0, 1.2, 0],
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2, // VARIED TIMING
                      repeat: Infinity,
                      ease: 'easeOut',
                      delay: i * 0.15,
                    }}
                    style={{
                      width: '6px', // LARGER PARTICLES
                      height: '6px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle, 
                        rgba(${147 + (i % 3) * 30}, ${112 + (i % 2) * 20}, 219, 0.9) 0%, 
                        rgba(${147 + (i % 3) * 30}, ${112 + (i % 2) * 20}, 219, 0.5) 50%,
                        transparent 100%)`,
                      filter: 'blur(2px)',
                      boxShadow: '0 0 10px rgba(138, 43, 226, 0.8)',
                    }}
                  />
                </motion.div>
              ))}

              {/* Floating dust particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`dust-particle-${i}`}
                  animate={{
                    x: [0, Math.random() * 40 - 20],
                    y: [0, Math.random() * 40 - 20],
                    opacity: [0, 0.4, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.5,
                  }}
                  className="absolute"
                  style={{
                    left: `${20 + (i * 10) % 60}%`,
                    top: `${20 + (i * 15) % 60}%`,
                    width: '3px',
                    height: '3px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '50%',
                    filter: 'blur(1px)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Enhanced Glitch Effect */}
          {hasGlitchEffect && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                animate={{
                  x: [0, -4, 4, -3, 3, 0],
                  opacity: [0, 0.5, 0.3, 0.4, 0, 0],
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(45deg, transparent 0%, rgba(255, 0, 0, 0.4) 50%, transparent 100%)',
                  mixBlendMode: 'screen',
                  filter: 'blur(2px)',
                }}
              />
              
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={`glitch-scan-${i}`}
                  animate={{
                    x: ['-100%', '200%'],
                    opacity: [0, 0.8, 0],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: i * 0.3,
                    repeatDelay: 0.5,
                  }}
                  className="absolute"
                  style={{
                    top: `${15 + i * 25}%`,
                    width: '50%',
                    height: '3px',
                    background: 'linear-gradient(90deg, transparent, rgba(0, 255, 0, 1), rgba(0, 255, 255, 0.8), transparent)',
                    filter: 'blur(1px)',
                  }}
                />
              ))}

              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={`glitch-block-${i}`}
                  animate={{
                    x: [0, Math.random() * 15 - 7.5],
                    y: [0, Math.random() * 8 - 4],
                    opacity: [0, 0.9, 0],
                    scale: [1, 1.5, 1],
                  }}
                  transition={{
                    duration: 0.2,
                    repeat: Infinity,
                    delay: i * 0.15,
                    repeatDelay: 1,
                  }}
                  className="absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: `${Math.random() * 25 + 8}px`,
                    height: `${Math.random() * 4 + 2}px`,
                    background: Math.random() > 0.5 
                      ? 'rgba(0, 255, 0, 0.9)' 
                      : 'rgba(255, 0, 255, 0.9)',
                    borderRadius: '2px',
                    filter: 'blur(0.5px)',
                  }}
                />
              ))}
            </div>
          )}

          <div className="relative flex items-center gap-4 z-10">
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
                            className={`font-semibold ${unreadCount > 0 ? 'text-[#ffa600]' : 'text-foreground'} relative`}
                          >
                            {hasGlitchEffect && (
                              <>
                                <motion.span
                                  animate={{
                                    x: [-2, 2, -1, 1, 0],
                                    opacity: [0, 0.3, 0, 0.2, 0],
                                  }}
                                  transition={{
                                    duration: 0.08,
                                    repeat: Infinity,
                                    repeatDelay: 1.5,
                                  }}
                                  className="absolute inset-0 pointer-events-none"
                                  style={{
                                    color: '#ff0000',
                                    mixBlendMode: 'screen',
                                  }}
                                >
                                  {chat.friend.name}
                                </motion.span>
                                <motion.span
                                  animate={{
                                    x: [2, -2, 1, -1, 0],
                                    y: [0, 1, -1, 0.5, -0.5],
                                    opacity: [0, 0.3, 0, 0.2, 0],
                                  }}
                                  transition={{
                                    duration: 0.08,
                                    repeat: Infinity,
                                    repeatDelay: 1.5,
                                    delay: 0.04,
                                  }}
                                  className="absolute inset-0 pointer-events-none"
                                  style={{
                                    color: '#00ffff',
                                    mixBlendMode: 'screen',
                                  }}
                                >
                                  {chat.friend.name}
                                </motion.span>
                              </>
                            )}
                            <span style={nameStyle}>
                              {chat.friend.name}
                            </span>
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