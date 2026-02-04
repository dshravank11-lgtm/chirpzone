
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function UserCard({ user }) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar>
          <AvatarImage src={user.photoURL} />
          <AvatarFallback>{user.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-bold">{user.name}</p>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
        </div>
        <Button onClick={() => router.push(`/profile/${user.uid}`)}>View Profile</Button>
      </CardContent>
    </Card>
  );
}
