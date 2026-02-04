
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export interface Notification {
    id: string;
    user: { name: string; avatarUrl: string };
    type: 'like' | 'comment' | 'friend_request';
    postContent?: string;
    postId?: string;
    time: string;
}

export const NotificationItem = ({ notification }: { notification: Notification }) => (
    <div className="flex items-start gap-4 p-4">
        <Avatar className="h-10 w-10">
            <AvatarImage src={notification.user.avatarUrl} data-ai-hint="user avatar" />
            <AvatarFallback>{notification.user.name.substring(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <p className="text-sm">
                <span className="font-semibold">{notification.user.name}</span>
                {notification.type === 'like' && ' liked your post.'}
                {notification.type === 'comment' && ' commented on your post.'}
                {notification.type === 'friend_request' && ' sent you a friend request.'}
            </p>
            {notification.postContent && (
                 <p className="text-sm text-muted-foreground mt-1 p-2 bg-muted rounded-md">
                    "{notification.postContent}"
                 </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
             <div className="flex items-center gap-2 mt-2">
                {notification.type === 'friend_request' && (
                    <>
                        <Button size="sm">Accept</Button>
                        <Button size="sm" variant="outline">Decline</Button>
                    </>
                )}
                {(notification.type === 'like' || notification.type === 'comment') && notification.postId && (
                    <Link href={`/#${notification.postId}`}>
                        <Button size="sm" variant="outline">View Post</Button>
                    </Link>
                )}
            </div>
        </div>
    </div>
);
