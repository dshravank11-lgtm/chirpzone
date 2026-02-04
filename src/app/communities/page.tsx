'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import * as Icons from 'lucide-react';
import { auth } from '@/lib/firebase';
import { 
  createCommunity, 
  subscribeToAllCommunities, 
  subscribeToJoinedCommunities,
  joinCommunity, 
  leaveCommunity 
} from '@/services/communities';
import { DocumentData } from 'firebase/firestore';
import { User, onAuthStateChanged } from 'firebase/auth';

const availableIcons = [
  'Apple', 'Bitcoin', 'Book', 'Briefcase', 'Camera', 'Car', 'Cat', 'Church', 'Cloud', 'Code', 'Coffee', 'CreditCard', 'Diamond', 'Dice5', 'Dog', 'Dumbbell', 'Film', 'FlaskConical', 'Flower', 'Gift', 'Globe', 'GraduationCap', 'Hammer', 'Headphones', 'Heart', 'Home', 'Image', 'Keyboard', 'Languages', 'Laptop', 'Lightbulb', 'Map', 'Mic', 'Moon', 'Music', 'Palette', 'Plane', 'Puzzle', 'Rocket', 'School', 'ShoppingCart', 'Smartphone', 'Sprout', 'Star', 'Sun', 'Tent', 'Train', 'TreePine', 'Trophy', 'Users', 'Utensils', 'Video', 'Wallet', 'Watch', 'Wind', 'Cpu', 'Gamepad2', 'Paintbrush'
] as const;

type IconName = typeof availableIcons[number];

const Icon = ({ name, ...props }: { name: IconName } & Icons.LucideProps) => {
  const LucideIcon = Icons[name];
  if (!LucideIcon) return <Icons.HelpCircle {...props} />;
  return <LucideIcon {...props} />;
};

// Animated number component
const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setDisplayValue(value);
        setTimeout(() => setIsAnimating(false), 300);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [value, displayValue]);

  return (
    <span className={`inline-block transition-all duration-300 ${isAnimating ? 'scale-125 text-orange-500 font-bold' : 'scale-100'}`}>
      {displayValue}
    </span>
  );
};

const CommunitiesPage = () => {
  const [communities, setCommunities] = useState<DocumentData[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<IconName>('Users');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [joiningCommunity, setJoiningCommunity] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    const unsubscribeCommunities = subscribeToAllCommunities((communitiesList) => {
      setCommunities(communitiesList);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeCommunities();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setJoinedCommunities([]);
      return;
    }

    const unsubscribeJoined = subscribeToJoinedCommunities(currentUser.uid, (joined) => {
      setJoinedCommunities(joined);
    });

    return () => unsubscribeJoined();
  }, [currentUser]);

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim() || !newCommunityDesc.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide a name and a description for the community.",
      });
      return;
    }

    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "You must be logged in to create a community.",
      });
      return;
    }

    try {
      await createCommunity(newCommunityName, newCommunityDesc, selectedIcon, currentUser.uid);
      
      toast({
        title: "Community Created! 🎉",
        description: `${newCommunityName} has been successfully created.`,
      });

      setIsCreateOpen(false);
      setNewCommunityName('');
      setNewCommunityDesc('');
      setSelectedIcon('Users');
    } catch (error) {
      console.error("Error creating community:", error);
      if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "There was an error creating the community. Please try again.",
        });
      }
    }
  };

  const handleJoinToggle = async (communityId: string) => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "You must be logged in to join a community.",
      });
      return;
    }

    if (joiningCommunity) return;

    setJoiningCommunity(communityId);

    try {
      const isJoined = joinedCommunities.includes(communityId);
      
      if (isJoined) {
        await leaveCommunity(currentUser.uid, communityId);
        toast({
          title: "Left Community",
          description: "You have successfully left this community.",
        });
      } else {
        await joinCommunity(currentUser.uid, communityId);
        toast({
          title: "Joined Community! 🎉",
          description: "Welcome to the community!",
        });
      }
    } catch (error) {
      console.error('Error joining/leaving community:', error);
      if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "There was an error. Please try again.",
        });
      }
    } finally {
      setJoiningCommunity(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Icons.Loader className="animate-spin h-10 w-10 text-orange-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Discover Communities</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                <Icons.PlusCircle className="mr-2 h-4 w-4" /> Create Community
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] md:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create a new community</DialogTitle>
                <DialogDescription>
                  Creating a community costs <span className="font-bold text-orange-500">200 ChirpScore</span>. You can only own one community at a time.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right">Name</label>
                  <Input 
                    id="name" 
                    value={newCommunityName} 
                    onChange={(e) => setNewCommunityName(e.target.value)} 
                    className="col-span-3"
                    placeholder="e.g., Photography Enthusiasts"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="description" className="text-right">Description</label>
                  <Textarea 
                    id="description" 
                    value={newCommunityDesc} 
                    onChange={(e) => setNewCommunityDesc(e.target.value)} 
                    className="col-span-3"
                    placeholder="Describe what your community is about..."
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <label className="text-right pt-2">Icon</label>
                  <div className="col-span-3 grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                    {availableIcons.map(iconName => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setSelectedIcon(iconName)}
                        className={`p-2 rounded-md flex justify-center items-center transition-all duration-200 ${selectedIcon === iconName ? 'bg-orange-500 text-white scale-110' : 'hover:bg-muted'}`}
                      >
                        <Icon name={iconName} className="h-6 w-6" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateCommunity} className="bg-orange-500 hover:bg-orange-600 text-white">
                  Create (-200 pts)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {communities.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <Icons.Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Communities Yet</h2>
            <p className="text-muted-foreground mb-4">Be the first to create a community!</p>
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Icons.PlusCircle className="mr-2 h-4 w-4" /> Create Community
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((community, index) => {
              const isJoined = joinedCommunities.includes(community.id);
              const isProcessing = joiningCommunity === community.id;
              
              return (
                <Link 
                  href={`/communities/${community.id}`} 
                  key={community.id} 
                  className="block animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col group border-2 border-transparent hover:border-orange-500/50 bg-card hover:scale-105">
                    <CardHeader className="flex-grow flex flex-row items-center gap-4 p-4">
                      <div className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
                        <Icon name={community.icon || 'Users'} className="h-12 w-12 text-orange-500" />
                      </div>
                      <CardTitle className="text-2xl font-bold group-hover:text-orange-500 transition-colors">
                        {community.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-muted-foreground mb-4 line-clamp-2">{community.description || 'No description'}</p>
                      <div className="flex items-center text-muted-foreground mb-4">
                        <Icons.Users className="h-4 w-4 mr-2" />
                        <span>
                          <AnimatedNumber value={community.memberCount || 0} /> {community.memberCount === 1 ? 'member' : 'members'}
                        </span>
                        <Icons.MessageSquare className="h-4 w-4 mr-2 ml-4" />
                        <span>
                          <AnimatedNumber value={community.postCount || 0} /> {community.postCount === 1 ? 'post' : 'posts'}
                        </span>
                      </div>
                      <Button
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation();
                          handleJoinToggle(community.id); 
                        }}
                        disabled={isProcessing}
                        className={`w-full transition-all duration-300 ${isJoined ? 'bg-gray-500 hover:bg-gray-600' : 'bg-orange-500 hover:bg-orange-600'} text-white ${isProcessing ? 'scale-95' : 'hover:scale-105'}`}
                      >
                        {isProcessing ? (
                          <Icons.Loader className="mr-2 h-4 w-4 animate-spin" />
                        ) : isJoined ? (
                          <Icons.UserMinus className="mr-2 h-4 w-4" />
                        ) : (
                          <Icons.UserPlus className="mr-2 h-4 w-4" />
                        )}
                        {isProcessing ? 'Processing...' : isJoined ? 'Leave' : 'Join'}
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </AppLayout>
  );
};

export default CommunitiesPage;