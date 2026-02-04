
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/app-layout';
import { CreatePost } from '@/components/create-post';
import { PostCard, type Post } from '@/components/post-card';
import { WelcomeModal } from '@/components/WelcomeModal';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Flame, MoreHorizontal, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collection, query, orderBy, limit, onSnapshot, startAfter, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import PageTransition from '@/components/page-transition';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { PatchNotes } from '@/components/PatchNotes';
import { ReportDialog } from '@/components/report-button';

const StreakCard = ({ streak }: { streak: number }) => (
  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
    <Card className="relative overflow-hidden border-border/50 shadow-xl">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500"
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-3 text-2xl text-white font-bold">
          <Flame className="h-7 w-7" />
          {streak > 0 ? `You're on a ${streak}-day streak!` : 'Start your streak!'}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <p className="text-sm text-white">
          {streak > 0
            ? "Keep it up by posting or commenting tomorrow."
            : 'Post or comment to start your streak.'}
        </p>
      </CardContent>
    </Card>
  </motion.div>
);

const PostSkeleton = () => (
    <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
            <Card className="border-border/50 shadow-lg" key={i}>
                <CardHeader className="flex gap-4 p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 px-6">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </CardContent>
                <CardFooter className="flex justify-around border-t p-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                </CardFooter>
            </Card>
        ))}
    </div>
);

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver>();
  const { toast } = useToast();

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  const POSTS_PER_PAGE = 5;

  const fetchPosts = async () => {
    const postQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(POSTS_PER_PAGE)
    );

    const unsub = onSnapshot(postQuery, snap => {
      const newPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Post);
      setPosts(newPosts);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === POSTS_PER_PAGE);
      setLoading(false);
    });

    return unsub;
  };

  useEffect(() => {
    const unsub = fetchPosts();
    return () => {
      if (unsub) {
        unsub.then(u => u()).catch(err => console.error("Failed to unsubscribe", err));
      }
    };
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);

    const postQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(POSTS_PER_PAGE)
    );

    try {
        const snap = await getDocs(postQuery);
        const newPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Post);
        
        setPosts(prev => [...prev, ...newPosts]);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === POSTS_PER_PAGE);
    } catch(err) {
        console.error("Failed to load more posts", err);
        toast({ title: 'Error', description: 'Failed to load more posts.', variant: 'destructive' });
    } finally {
        setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, lastDoc]);

  const lastPostElementRef = useCallback(node => {
    if (isLoadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMorePosts();
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoadingMore, hasMore, loadMorePosts]);


  const handleReport = (postId: string) => {
    setReportingPostId(postId);
    setReportDialogOpen(true);
  };

  const onPostDeleted = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
  };

  return (
    <AppLayout>
      <WelcomeModal />
      <PatchNotes />

      <PageTransition>
        <div className="space-y-6 pb-8">
          {user && <StreakCard streak={user.streak || 0} />}
          <CreatePost onPostCreated={newPost => setPosts(prev => [newPost, ...prev])} />
          
          {loading || authLoading ? <PostSkeleton /> : (
            <AnimatePresence>
              {posts.map((p, index) => (
                <motion.div
                  key={p.id}
                  ref={index === posts.length - 1 ? lastPostElementRef : null}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <PostCard 
                    post={p} 
                    currentUserId={user?.uid || ''} 
                    onReport={handleReport} 
                    onPostDeleted={onPostDeleted} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {isLoadingMore && <PostSkeleton />}
          
          {!isLoadingMore && !hasMore && (
            <div className="text-center text-muted-foreground py-8">
              <p>You've reached the end of the feed!</p>
            </div>
          )}
          
          {/* Fallback button */}
          {hasMore && !isLoadingMore && (
             <div className="text-center">
                <Button onClick={loadMorePosts} variant="outline">
                    Load More
                </Button>
            </div>
          )}

        </div>
      </PageTransition>

      {reportingPostId && (
        <ReportDialog
          postId={reportingPostId}
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
        />
      )}
    </AppLayout>
  );
}
