
'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { PostCard, type Post } from '@/components/post-card';
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Drama } from 'lucide-react';
import { getPaginatedPosts } from '@/services/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { CreatePost } from '@/components/create-post';
import PageTransition from '@/components/page-transition';

const PostSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-4 p-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </CardHeader>
    <CardContent className="px-6 pb-2">
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </CardContent>
    <CardFooter className="flex justify-around w-full border-t p-2 mt-4">
       <Skeleton className="h-8 w-24" />
       <Skeleton className="h-8 w-24" />
       <Skeleton className="h-8 w-24" />
    </CardFooter>
  </Card>
);

export default function ConfessPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { posts: allPosts } = await getPaginatedPosts(null);
        const confessionPosts = allPosts.filter(p => p.isAnonymous);
        setPosts(confessionPosts);
      } catch (error) {
        console.error("Error fetching confession posts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);


  return (
    <AppLayout>
      <PageTransition>
      <div className="space-y-4">
        <Card className="bg-blue-950 text-blue-50 border-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Drama className="h-6 w-6" />
                    Confess Corner
                </CardTitle>
                 <CardDescription className="text-blue-200">A safe space to share your secrets anonymously. What you say here, stays here.</CardDescription>
            </CardHeader>
        </Card>

        <CreatePost isAnonymousDefault={true} variant="confession" />
        
        <div className="space-y-4">
            {loading ? (
                <PostSkeleton />
            ) : posts.map((post) => (
                <PostCard key={post.id} post={post} variant="confession" />
            ))}
        </div>
      </div>
      </PageTransition>
    </AppLayout>
  );
}
