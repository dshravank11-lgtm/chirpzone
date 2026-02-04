'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { getUserFriends, createGroupChat } from '@/services/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import PageTransition from '@/components/page-transition';
import { ArrowLeft, Loader } from 'lucide-react';
import Link from 'next/link';

const FriendSelectItem = ({ friend, onToggle, isSelected }) => {
    return (
        <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors">
            <Avatar className="h-12 w-12">
                <AvatarImage src={friend.avatarUrl} />
                <AvatarFallback>{friend.name.substring(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <p className="font-semibold">{friend.name}</p>
                <p className="text-sm text-muted-foreground">@{friend.username}</p>
            </div>
            <Checkbox checked={isSelected} onCheckedChange={() => onToggle(friend.uid)} />
        </div>
    );
}


export default function NewGroupPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [friends, setFriends] = useState<any[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user?.uid) {
            const unsubscribe = getUserFriends(user.uid, (friends) => {
                setFriends(friends);
                setLoading(false);
            });
            return () => unsubscribe();
        } else if (!user) {
            setLoading(false);
        }
    }, [user]);

    const handleToggleFriend = (friendId: string) => {
        setSelectedFriends(prev =>
            prev.includes(friendId)
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId]
        );
    };

    const handleCreateGroup = async () => {
        if (!user) return;
        if (groupName.trim() === '') {
            setError('Please enter a group name.');
            return;
        }
        if (selectedFriends.length < 1) {
            setError('Please select at least one friend to create a group.');
            return;
        }

        setError('');
        try {
            const members = [...new Set([user.uid, ...selectedFriends])];
            const newChatRoomId = await createGroupChat(groupName, members, user.uid);
            router.push(`/chat/${newChatRoomId}`);
        } catch (error) {
            console.error('Error creating group chat:', error);
            setError('Failed to create group chat. Please try again.');
        }
    };

    return (
        <AppLayout>
            <PageTransition>
                <div className="p-4 md:p-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-4">
                                <Link href="/chat" className="p-2 rounded-full hover:bg-muted">
                                    <ArrowLeft size={20} />
                                </Link>
                                Create Group Chat
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input 
                                placeholder="Group Name" 
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                             <p className="text-sm text-muted-foreground">You can only add people who are mutual friends.</p>

                            <div className="flex flex-col gap-2">
                                {loading ? (
                                    <div className="flex justify-center items-center h-24">
                                        <Loader className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : friends.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">You have no friends to add to a group.</p>
                                ) : (
                                    friends.map(friend => (
                                        friend && <FriendSelectItem 
                                            key={friend.uid} 
                                            friend={friend}
                                            isSelected={selectedFriends.includes(friend.uid)}
                                            onToggle={handleToggleFriend}
                                        />
                                    ))
                                )}
                            </div>

                            {error && <p className="text-sm text-destructive">{error}</p>}

                            <Button 
                                className="w-full"
                                onClick={handleCreateGroup}
                                disabled={loading || groupName.trim() === '' || selectedFriends.length < 1}
                            >
                                Create Group
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </PageTransition>
        </AppLayout>
    );
}
