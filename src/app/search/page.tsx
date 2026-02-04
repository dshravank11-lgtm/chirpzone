
'use client';

import { useSearchParams } from 'next/navigation';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PostCard } from '@/components/post-card';
import { ProfilePreviewCard } from '@/components/profile-preview-card';
import AppLayout from '@/components/app-layout';
import { Skeleton } from '@/components/ui/skeleton';

function SearchResults() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q');

  const [users, usersLoading] = useCollection(
    searchQuery ? query(collection(db, 'users'), where('displayName', '>=', searchQuery), where('displayName', '<=', searchQuery + '\uf8ff')) : null
  );

  const [posts, postsLoading] = useCollection(
    searchQuery ? query(collection(db, 'posts'), where('content', '>=', searchQuery), where('content', '<=', searchQuery + '\uf8ff')) : null
  );

  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Search Results for: <span className="text-primary">{searchQuery}</span></h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
          <div className="absolute w-px bg-orange-500 h-full left-1/2 transform -translate-x-1/2 hidden md:block"></div>
          
          <div className="space-y-6 pr-8">
            <h2 className="text-2xl font-bold mb-4">Posts</h2>
            {postsLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            {posts && posts.docs.length === 0 && <p className="text-muted-foreground">No posts found.</p>}
            {posts && posts.docs.map((doc) => (
              <PostCard key={doc.id} post={{ id: doc.id, ...doc.data() } as any} />
            ))}
          </div>

          <div className="space-y-6 pl-8">
            <h2 className="text-2xl font-bold mb-4">Users</h2>
            {usersLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            {users && users.docs.length === 0 && <p className="text-muted-foreground">No users found.</p>}
            {users && users.docs.map((doc) => (
              <ProfilePreviewCard key={doc.id} userId={doc.id} />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default SearchResults;
