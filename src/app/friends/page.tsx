'use client';

import AppLayout from '@/components/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, UserPlus, X, MessageSquare, Search, Users, Palette, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePresence } from '@/hooks/usePresence';
import PageTransition from "@/components/page-transition";
import { 
    getUserFriends, 
    getPendingFriendRequests, 
    acceptFriendRequest, 
    declineFriendRequest, 
    unfriend, 
    sendFriendRequest, 
    findUsersByEmail,
    getUserProfile
} from '@/services/firebase';
import FindFriends from '@/components/find-friends';
import { AnimatePresence, motion } from 'framer-motion';
import { ProfilePreviewCard } from '@/components/profile-preview-card';

type Friend = {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
    email: string;
    nameFont?: string;
    nameColor?: string;
    nameEffect?: string;
}

const getStyledName = (friend: Friend) => {
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

const FriendCard = ({ friend, onUnfriend, onAvatarClick }: { 
  friend: Friend; 
  onUnfriend: (id: string) => void;
  onAvatarClick: (userId: string) => void;
}) => {
    const isFriendOnline = usePresence(friend.id);
    const nameStyle = getStyledName(friend);
    
    const getStyleDescription = () => {
      if (!friend.nameFont && !friend.nameColor) return null;
      
      const fontName = friend.nameFont?.split(',')[0] || 'Default';
      const effect = friend.nameEffect || 'none';
      
      let effectText = '';
      if (effect === 'gradient') effectText = 'with gradient';
      if (effect === 'moving-gradient') effectText = 'with animated gradient';
      
      return `${fontName} font ${effectText}`;
    };
    
    const styleDescription = getStyleDescription();

    const handleAvatarClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onAvatarClick(friend.id);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-5 hover:shadow-lg hover:shadow-[#ffa600]/20 hover:border-[#ffa600]/50 transition-all duration-300"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-[#ffa600]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-4">
                    <div 
                      className="cursor-pointer"
                      onClick={handleAvatarClick}
                    >
                      <Avatar className="h-12 w-12 ring-2 ring-background group-hover:ring-[#ffa600]/50 transition-all hover:scale-105">
                          <AvatarImage src={friend.avatarUrl} data-ai-hint="user avatar" />
                          <AvatarFallback className="bg-[#ffa600] text-black font-semibold">
                              {friend.name.substring(0,1).toUpperCase()}
                          </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p 
                              className="text-sm font-semibold leading-none"
                              style={nameStyle}
                            >
                              {friend.name}
                            </p>
                            {isFriendOnline && (
                                <motion.div 
                                    className="h-2.5 w-2.5 rounded-full bg-green-500"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                />
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">@{friend.username}</p>
                        
                        {styleDescription && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              <Palette className="h-2 w-2" />
                              <span>{styleDescription}</span>
                              {friend.nameEffect === 'gradient' && (
                                <Sparkles className="h-2 w-2 text-purple-500" />
                              )}
                              {friend.nameEffect === 'moving-gradient' && (
                                <Sparkles className="h-2 w-2 text-purple-500 animate-pulse" />
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link href={`/chat/${friend.id}`} className="flex-1 sm:flex-none">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full sm:w-auto hover:bg-[#ffa600] hover:text-black hover:border-[#ffa600] transition-all"
                        >
                            <MessageSquare className="mr-2 h-4 w-4"/>
                            Chat
                        </Button>
                    </Link>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onUnfriend(friend.id)} 
                        className="flex-1 sm:flex-none hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                    >
                        Unfriend
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

const RequestCard = ({ request, onAccept, onDecline, onAvatarClick }: { 
  request: Friend; 
  onAccept: (request: Friend) => void; 
  onDecline: (id: string) => void;
  onAvatarClick: (userId: string) => void;
}) => {
    const nameStyle = getStyledName(request);
    
    const getStyleDescription = () => {
      if (!request.nameFont && !request.nameColor) return null;
      
      const fontName = request.nameFont?.split(',')[0] || 'Default';
      const effect = request.nameEffect || 'none';
      
      let effectText = '';
      if (effect === 'gradient') effectText = 'with gradient';
      if (effect === 'moving-gradient') effectText = 'with animated gradient';
      
      return `${fontName} font ${effectText}`;
    };
    
    const styleDescription = getStyleDescription();

    const handleAvatarClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onAvatarClick(request.id);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-5 hover:shadow-lg hover:shadow-[#ffa600]/20 hover:border-[#ffa600]/50 transition-all duration-300"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-[#ffa600]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-4">
                    <div 
                      className="cursor-pointer"
                      onClick={handleAvatarClick}
                    >
                      <Avatar className="h-12 w-12 ring-2 ring-background group-hover:ring-[#ffa600]/50 transition-all hover:scale-105">
                          <AvatarImage src={request.avatarUrl} data-ai-hint="user avatar" />
                          <AvatarFallback className="bg-[#ffa600] text-black font-semibold">
                              {request.name.substring(0,1).toUpperCase()}
                          </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                        <p 
                          className="text-sm font-semibold leading-none"
                          style={nameStyle}
                        >
                          {request.name}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">@{request.username}</p>
                        
                        {styleDescription && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              <Palette className="h-2 w-2" />
                              <span>{styleDescription}</span>
                              {request.nameEffect === 'gradient' && (
                                <Sparkles className="h-2 w-2 text-purple-500" />
                              )}
                              {request.nameEffect === 'moving-gradient' && (
                                <Sparkles className="h-2 w-2 text-purple-500 animate-pulse" />
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-9 w-9 text-green-500 hover:text-white hover:bg-green-500 hover:border-green-500 transition-all flex-1 sm:flex-none" 
                        onClick={() => onAccept(request)}
                    >
                        <Check className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-9 w-9 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all flex-1 sm:flex-none" 
                        onClick={() => onDecline(request.id)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export default function FriendsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [direction, setDirection] = useState(0);
  const [findSearchQuery, setFindSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const TABS = ['all', 'pending', 'find'];

  const handleTabChange = (newTab: string) => {
      const oldIndex = TABS.indexOf(activeTab);
      const newIndex = TABS.indexOf(newTab);
      setDirection(newIndex > oldIndex ? 1 : -1);
      setActiveTab(newTab);
  };

  useEffect(() => {
    if (user) {
      const unsubscribeFriends = getUserFriends(user.uid, async (friendList) => {
        const friendsWithStyles = await Promise.all(
          friendList.map(async (friend: any) => {
            try {
              const profile = await getUserProfile(friend.id);
              return {
                ...friend,
                name: profile?.name || friend.name,
                username: profile?.username || friend.username,
                avatarUrl: profile?.avatarUrl || friend.avatarUrl,
                nameFont: profile?.nameFont,
                nameColor: profile?.nameColor,
                nameEffect: profile?.nameEffect,
                ...profile
              };
            } catch (error) {
              console.error("Error fetching friend profile:", friend.id, error);
              return friend;
            }
          })
        );
        setFriends(friendsWithStyles);
      });
      
      const unsubscribeRequests = getPendingFriendRequests(user.uid, async (requestList) => {
        const requestsWithStyles = await Promise.all(
          requestList.map(async (request: any) => {
            try {
              const profile = await getUserProfile(request.id);
              return {
                ...request,
                name: profile?.name || request.name,
                username: profile?.username || request.username,
                avatarUrl: profile?.avatarUrl || request.avatarUrl,
                nameFont: profile?.nameFont,
                nameColor: profile?.nameColor,
                nameEffect: profile?.nameEffect,
                ...profile
              };
            } catch (error) {
              console.error("Error fetching request profile:", request.id, error);
              return request;
            }
          })
        );
        setPendingRequests(requestsWithStyles);
      });
      
      return () => {
        if (typeof unsubscribeFriends === 'function') unsubscribeFriends();
        if (typeof unsubscribeRequests === 'function') unsubscribeRequests();
      };
    }
  }, [user]);

  const handleUnfriend = async (friendId: string) => {
    if (user) {
      await unfriend(user.uid, friendId);
      toast({ title: 'Friend Removed', description: 'You have unfriended this user.' });
    }
  }
  
  const handleAccept = async (request: Friend) => {
      if(user){
        await acceptFriendRequest(user.uid, request.id);
        setPendingRequests(prev => prev.filter(r => r.id !== request.id));
        toast({ title: 'Friend Request Accepted', description: `You are now friends with ${request.name}.` });
      }
  }
  
  const handleDecline = async (senderId: string) => {
      if(user){
        await declineFriendRequest(user.uid, senderId);
        setPendingRequests(prev => prev.filter(r => r.id !== senderId));
        toast({ title: 'Friend Request Declined', description: 'You have declined the friend request.' });
      }
  }

  const handleAvatarClick = (userId: string) => {
    setSelectedUserId(userId);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      position: 'absolute',
      width: '100%'
    }),
    center: {
      x: 0,
      opacity: 1,
      position: 'relative',
      width: '100%'
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      position: 'absolute',
      width: '100%'
    }),
  };

  return (
    <AppLayout>
        <PageTransition>
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#ffa600]/20 border border-[#ffa600]/30">
                        <Users className="h-6 w-6 text-[#ffa600]" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-[#ffa600]">Friends</h2>
                        <p className="text-muted-foreground hidden sm:block">Manage your connections and friend requests</p>
                    </div>
                </div>
            </div>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full max-w-4xl space-y-6">
                <div className="w-full">
                    <TabsList className="relative w-full grid grid-cols-3 h-auto gap-2 bg-transparent p-0 sm:hidden">
                        <TabsTrigger 
                            value="all" 
                            className="relative z-10 h-12 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-black transition-colors rounded-md"
                        >
                            Friends
                        </TabsTrigger>
                        <TabsTrigger 
                            value="pending" 
                            className="relative z-10 h-12 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-black transition-colors rounded-md"
                        >
                            <span className="flex items-center gap-2">
                                Requests
                                {pendingRequests.length > 0 && (
                                    <span className="bg-red-500 text-white text-xs h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center rounded-full font-semibold">
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="find" 
                            className="relative z-10 h-12 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-black transition-colors rounded-md"
                        >
                            Find
                        </TabsTrigger>
                        <motion.div
                            className="absolute z-0 bg-gradient-to-r from-[#ffa600] via-[#ff9500] to-[#ffa600] rounded-md shadow-md shadow-[#ffa600]/20"
                            animate={{
                                width: 'calc(33.33% - 4px)',
                                height: '48px',
                                top: '0px',
                                left: activeTab === 'all' ? '0px' : activeTab === 'pending' ? 'calc(33.33% + 4px)' : 'calc(66.66% + 8px)'
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 35
                            }}
                        />
                    </TabsList>
                    
                    <TabsList className="relative hidden sm:grid w-full grid-cols-3 h-12 bg-muted/50 backdrop-blur rounded-md">
                        <TabsTrigger 
                            value="all" 
                            className="relative z-10 data-[state=active]:text-black transition-colors"
                        >
                            All Friends
                        </TabsTrigger>
                        <TabsTrigger 
                            value="pending" 
                            className="relative z-10 data-[state=active]:text-black transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                Requests
                                {pendingRequests.length > 0 && (
                                    <span className="bg-[#ffa600] text-black text-xs h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center rounded-full font-semibold">
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="find" 
                            className="relative z-10 data-[state=active]:text-black transition-colors"
                        >
                            Find
                        </TabsTrigger>
                        <motion.div
                            className="absolute inset-y-1 bg-gradient-to-r from-[#ffa600] via-[#ff9500] to-[#ffa600] rounded-md shadow-md shadow-[#ffa600]/20"
                            animate={{
                                width: 'calc(33.33% - 8px)',
                                left: activeTab === 'all' ? '4px' : 
                                      activeTab === 'pending' ? 'calc(33.33% + 4px)' :
                                      'calc(66.66% + 4px)'
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 35
                            }}
                        />
                    </TabsList>
                </div>
                <Separator className="hidden sm:block" />
                <div className="relative min-h-[400px] overflow-hidden">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={activeTab}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        >
                            <TabsContent value="all">
                                <Card className="border-border/50 shadow-lg bg-gradient-to-br from-background via-background to-muted/20">
                                    <CardHeader>
                                        <CardTitle className="text-[#ffa600]">Your Friends</CardTitle>
                                        <CardDescription>Manage your connections.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-3">
                                        {friends.length > 0 ? (
                                            friends.map(f => (
                                              <FriendCard 
                                                key={f.id} 
                                                friend={f} 
                                                onUnfriend={handleUnfriend} 
                                                onAvatarClick={handleAvatarClick}
                                              />
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-8">No friends yet. Start connecting!</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="pending">
                                <Card className="border-border/50 shadow-lg bg-gradient-to-br from-background via-background to-muted/20">
                                    <CardHeader>
                                        <CardTitle className="text-[#ffa600]">Pending Requests</CardTitle>
                                        <CardDescription>Accept or decline friend requests.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-3">
                                        {pendingRequests.length > 0 ? (
                                            pendingRequests.map(r => (
                                              <RequestCard 
                                                key={r.id} 
                                                request={r} 
                                                onAccept={handleAccept} 
                                                onDecline={handleDecline}
                                                onAvatarClick={handleAvatarClick}
                                              />
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-8">No pending requests.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="find" className="space-y-4">
                                <Card className="border-border/50 shadow-lg bg-gradient-to-br from-background via-background to-muted/20">
                                    <CardHeader>
                                        <CardTitle className="text-[#ffa600]">Find Friends</CardTitle>
                                        <CardDescription>Search and discover new connections.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="relative mb-6">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ffa600]" />
                                            <Input
                                                type="text"
                                                placeholder="Search for friends..."
                                                value={findSearchQuery}
                                                onChange={(e) => setFindSearchQuery(e.target.value)}
                                                className="pl-10 border-[#ffa600]/30 focus:ring-[#ffa600] focus:border-[#ffa600]"
                                            />
                                        </div>
                                        <FindFriends searchQuery={findSearchQuery} />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </Tabs>
        </div>
        </PageTransition>
        
        {selectedUserId && (
          <ProfilePreviewCard 
            userId={selectedUserId} 
            onOpenChange={() => setSelectedUserId(null)} 
          />
        )}
        
        <style jsx global>{`
            @keyframes gradientMove {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
          `}</style>
    </AppLayout>
  );
}