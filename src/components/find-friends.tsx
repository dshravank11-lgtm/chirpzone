'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { searchUsers, sendFriendRequest, getUserProfile } from '@/services/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';
import Link from 'next/link';

const UserCard = ({ profile, currentUser, onFriendRequestSent }) => {
    const [isFriend, setIsFriend] = useState(false);
    const [hasSentRequest, setHasSentRequest] = useState(false);

    useEffect(() => {
        if (currentUser && profile) {
            setIsFriend(currentUser.friends?.includes(profile.uid));
            setHasSentRequest(currentUser.sentFriendRequests?.includes(profile.uid));
        }
    }, [currentUser, profile]);

    const handleSendRequest = async () => {
        if (!currentUser) return;
        await sendFriendRequest(currentUser.uid, profile.uid);
        onFriendRequestSent();
    };

    return (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <Link href={`/profile/${profile.uid}`}>
                <Avatar className="h-12 w-12">
                    <AvatarImage src={profile.avatarUrl} />
                    <AvatarFallback>{profile.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1">
                <p className="font-semibold">{profile.name}</p>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
            {!isFriend && !hasSentRequest && (
                 <Button size="sm" onClick={handleSendRequest}>Add Friend</Button>
            )}
            {isFriend && (
                <Button size="sm" variant="outline" disabled>Friends</Button>
            )}
            {hasSentRequest && (
                <Button size="sm" variant="outline" disabled>Request Sent</Button>
            )}
        </div>
    );
}

export default function FindFriends({ searchQuery }: { searchQuery: string }) {
    const { user } = useAuth();
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
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
        const handleSearch = async () => {
            if (!searchQuery) {
                setSearchResults([]);
                return;
            }
            setLoading(true);
            const results = await searchUsers(searchQuery, user?.uid || '');
            setSearchResults(results);
            setLoading(false);
        };

        const debounceTimeout = setTimeout(() => {
            handleSearch();
        }, 300); // Debounce search

        return () => clearTimeout(debounceTimeout);
    }, [searchQuery, user]);

    return (
        <div className="space-y-4">
             {loading && (
                <div className="flex justify-center p-4">
                    <Loader className="h-6 w-6 animate-spin" />
                </div>
            )}
            {!loading && searchResults.length === 0 && searchQuery && (
                 <p className="text-center text-muted-foreground">No users found.</p>
            )}
            <div className="grid gap-4">
                {searchResults.map(profile => (
                    <UserCard
                        key={profile.uid}
                        profile={profile}
                        currentUser={currentUser}
                        onFriendRequestSent={fetchCurrentUser}
                    />
                ))}
            </div>
        </div>
    )
}
