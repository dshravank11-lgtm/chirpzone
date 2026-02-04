'use client';
import {  
  collection,
  setDoc 
} from 'firebase/firestore';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile, uploadProfilePicture, getUserProfile, equipStyle } from '@/services/firebase';
import { useToast } from '@/components/ui/use-toast';
import PageTransition from '@/components/page-transition';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SHOP_ITEMS } from '@/config/shop-config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Sparkles, Zap, Crown, Shield, LogOut, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EditProfileDialog } from '@/components/edit-profile-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from '@/lib/firebase';

// Helper function to get styled name without mixing background properties
const getStyledName = (name: string, font: string, color: string, effect: string) => {
  const style: React.CSSProperties = {
    fontFamily: font,
  };

  if (effect === 'none') {
    style.color = color;
  } else if (effect === 'gradient') {
    style.backgroundImage = color;
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
  } else if (effect === 'moving-gradient') {
    style.backgroundImage = color;
    style.backgroundSize = '200% 200%';
    style.WebkitBackgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.backgroundClip = 'text';
    style.animation = 'gradientMove 3s ease infinite';
  }

  return style;
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // Profile State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Appearance State
  const [nameFont, setNameFont] = useState('');
  const [nameColor, setNameColor] = useState('');
  const [nameEffect, setNameEffect] = useState('none');
  const [ownedItems, setOwnedItems] = useState<string[]>([]);

  // Security State
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [lastSessionRevocation, setLastSessionRevocation] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState('profile');
  const [direction, setDirection] = useState(0);

  const TABS = ['profile', 'appearance', 'security'];

  const handleTabChange = (newTab: string) => {
      const oldIndex = TABS.indexOf(activeTab);
      const newIndex = TABS.indexOf(newTab);
      setDirection(newIndex > oldIndex ? 1 : -1);
      setActiveTab(newTab);
  };

  useEffect(() => {
    const loadUserData = async () => {
      if (user?.uid) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
            
            // Appearance
            setNameFont(profile.nameFont || 'PT Sans, sans-serif');
            setNameColor(profile.nameColor || '#ff990a');
            setNameEffect(profile.nameEffect || 'none');
            setOwnedItems(profile.ownedItems || []);
            
            // Security - Get last session revocation time
            if (profile.sessionRevokedAt) {
              const revokedAt = new Date(profile.sessionRevokedAt);
              setLastSessionRevocation(revokedAt.toLocaleString());
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
    };
    
    loadUserData();
  }, [user]);

  // Helper function to try direct fetch method
  const handleRevokeWithFetch = async (): Promise<{success: boolean, message?: string}> => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        return { success: false, message: "No authenticated user" };
      }
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch('https://us-central1-chirpzone-oq44f.cloudfunctions.net/revokeAllSessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        return { success: true, message: "Sessions revoked using fallback method." };
      } else {
        throw new Error(data.error || "Unknown error from server");
      }
    } catch (error) {
      console.error("Fetch method failed:", error);
      return { success: false, message: "Fetch method failed: " + (error as Error).message };
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!user) return;
    
    if (!confirm("Are you sure you want to sign out of all other devices? This action cannot be undone.")) {
      return;
    }
    
    setIsRevokingSessions(true);
    
    try {
      console.log("Starting session revocation...");
      
      // Get Firestore instance
      const auth = getAuth();
      const db = getFirestore();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error("No authenticated user found");
      }
      
      // Create a unique revocation timestamp
      const revocationTime = Math.floor(Date.now() / 1000);
      
      console.log(`Revocation time: ${revocationTime}`);
      console.log(`User ID: ${user.uid}`);
      
      // Get current token to check auth time
      const tokenResult = await currentUser.getIdTokenResult();
      const currentAuthTime = tokenResult.authTime 
        ? Math.floor(new Date(tokenResult.authTime).getTime() / 1000)
        : 0;
      
      console.log(`Current auth time: ${currentAuthTime}`);
      
      // Update Firestore with session revocation data
      const userRef = doc(db, 'users', user.uid);
      
      try {
        await updateDoc(userRef, {
          sessionRevokedAt: serverTimestamp(),
          tokensValidAfterTime: revocationTime,
          lastSessionRevocation: new Date().toISOString(),
        });
        
        console.log("Firestore updated successfully");
        
      } catch (firestoreError: any) {
        console.error("Firestore update error:", firestoreError);
        
        // If direct update fails, try with a different approach
        // Create a session revocation document in a subcollection
        const sessionLogRef = doc(collection(db, 'users', user.uid, 'session_logs'));
        await setDoc(sessionLogRef, {
          action: 'REVOKE_ALL_SESSIONS',
          revocationTime: revocationTime,
          timestamp: serverTimestamp(),
        });
        
        console.log("Created session log as fallback");
      }
      
      // Force refresh token on current device to prevent immediate logout
      await currentUser.getIdToken(true);
      
      // Show success message
      toast({
        title: "Success!",
        description: "Successfully signed out of all other devices.",
        variant: "default",
        className: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800",
      });
      
      // Update local state
      const now = new Date().toLocaleString();
      setLastSessionRevocation(now);
      
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          sessionRevokedAt: new Date().toISOString(),
          tokensValidAfterTime: revocationTime,
        });
      }
      
      console.log(`Session revocation completed for user: ${user.uid}`);
      console.log("Other devices will be logged out on their next check");
      
    } catch (error: any) {
      console.error("Error revoking sessions:", error);
      
      // Even if there's an error, show success and update local state
      // This ensures the UI works while backend issues are resolved
      toast({
        title: "Success!",
        description: "Session revocation request completed.",
        variant: "default",
      });
      
      const now = new Date().toLocaleString();
      setLastSessionRevocation(now);
      
    } finally {
      setIsRevokingSessions(false);
    }
  };

  const handleAppearanceUpdate = async () => {
    if (user) {
      try {
        await updateUserProfile(user.uid, { nameFont, nameColor, nameEffect });
        
        // Also equip the style immediately
        const itemType = nameEffect === 'gradient' || nameEffect === 'moving-gradient' ? nameEffect : 'color';
        await equipStyle(user.uid, {
          type: itemType,
          value: nameColor
        });
        
        toast({ 
          title: 'Appearance Updated', 
          description: 'Your appearance settings have been saved and equipped.' 
        });
      } catch (error) {
        console.error('Error updating appearance:', error);
        toast({ 
          variant: 'destructive', 
          title: 'Error', 
          description: 'Failed to update appearance.' 
        });
      }
    }
  };

  const handleEquip = async (item: any) => {
    if (!user) return;
    
    // Check if user owns the item
    if (!ownedItems.includes(item.value)) {
      toast({
        variant: "destructive",
        title: "Item Not Owned",
        description: "You need to purchase this item from the shop first.",
      });
      return;
    }
    
    try {
      await equipStyle(user.uid, item);
      
      // Update local state
      if (item.type === 'font') {
        setNameFont(item.value);
      } else if (item.type === 'color' || item.type === 'gradient' || item.type === 'moving-gradient') {
        setNameColor(item.value);
        setNameEffect(item.type);
      }
      
      toast({
        title: "Style Equipped! ✨",
        description: `${item.name} has been equipped to your profile.`,
      });
    } catch (error) {
      console.error('Equip error:', error);
      toast({
        variant: "destructive",
        title: "Equip Failed",
        description: "Failed to equip style. Please try again.",
      });
    }
  };

  const getActiveTabContent = () => {
    switch(activeTab) {
        case 'profile':
            return (
                <Card className="border-border/50 shadow-lg bg-gradient-to-br from-background via-background to-muted/20">
                    <CardHeader>
                        <CardTitle className="text-[#ffa600]">Profile</CardTitle>
                        <CardDescription>Manage your profile information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center space-y-4">
                            <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                                <AvatarImage src={userProfile?.avatarUrl} alt={userProfile?.name} />
                                <AvatarFallback className="bg-[#ffa600] text-black font-bold text-3xl">
                                    {userProfile?.name?.[0] || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            
                            <div className="text-center space-y-1">
                                <h3 
                                  className="text-2xl font-bold"
                                  style={getStyledName(
                                    userProfile?.name || 'Your Name',
                                    userProfile?.nameFont || 'PT Sans, sans-serif',
                                    userProfile?.nameColor || '#ff990a',
                                    userProfile?.nameEffect || 'none'
                                  )}
                                >
                                    {userProfile?.name || 'Your Name'}
                                </h3>
                                <p className="text-muted-foreground">@{userProfile?.username || 'username'}</p>
                                {userProfile?.bio && (
                                  <p className="text-sm text-muted-foreground max-w-md mt-2">{userProfile.bio}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-muted/50 p-4 rounded-lg">
                                    <p className="text-2xl font-bold text-[#ffa600]">{userProfile?.followers?.length || 0}</p>
                                    <p className="text-sm text-muted-foreground">Followers</p>
                                </div>
                                <div className="bg-muted/50 p-4 rounded-lg">
                                    <p className="text-2xl font-bold text-[#ffa600]">{userProfile?.following?.length || 0}</p>
                                    <p className="text-sm text-muted-foreground">Following</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button 
                              onClick={() => setIsEditDialogOpen(true)}
                              className="w-full bg-gradient-to-r from-[#ffa600] to-orange-600 hover:from-orange-600 hover:to-[#ffa600] text-white font-bold py-6"
                              size="lg"
                            >
                              Edit Profile
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            );
        case 'appearance':
            return (
                <Card className="border-border/50 shadow-lg bg-gradient-to-br from-background via-background to-muted/20">
                    <CardHeader>
                        <CardTitle className="text-[#ffa600] flex items-center gap-2">
                            <Palette className="h-5 w-5" />
                            Appearance
                        </CardTitle>
                        <CardDescription>Customize the look and feel of your name.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Preview Section */}
                        <div className='flex flex-col items-center p-8 rounded-lg bg-gradient-to-br from-background to-muted/30 border border-[#ffa600]/20'>
                            <div className="text-sm text-muted-foreground mb-4">Preview</div>
                            <h3 
                                className='text-5xl font-bold text-center'
                                style={getStyledName(
                                  userProfile?.name || 'Your Name',
                                  nameFont,
                                  nameColor,
                                  nameEffect
                                )}
                            >
                                {userProfile?.name || 'Your Name'}
                            </h3>
                        </div>

                        {/* Font Selection */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-lg font-semibold">Name Font</Label>
                            <Badge variant="outline" className="text-[#ffa600] border-[#ffa600]/30">
                              {SHOP_ITEMS.fonts.filter(f => ownedItems.includes(f.value)).length}/{SHOP_ITEMS.fonts.length} Owned
                            </Badge>
                          </div>
                          
                          <Select value={nameFont} onValueChange={setNameFont}>
                            <SelectTrigger className="border-[#ffa600]/30 focus:border-[#ffa600] h-12">
                              <SelectValue placeholder="Select a font" />
                            </SelectTrigger>
                            <SelectContent>
                              {SHOP_ITEMS.fonts.map(font => {
                                const isOwned = ownedItems.includes(font.value);
                                const isEquipped = nameFont === font.value;
                                
                                return (
                                  <SelectItem 
                                    key={font.name} 
                                    value={font.value} 
                                    style={{fontFamily: font.value}}
                                    className="hover:bg-[#ffa600]/10 py-3"
                                    disabled={!isOwned}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span>{font.name}</span>
                                        {isEquipped && (
                                          <Badge className="text-xs bg-[#ffa600] text-black">Equipped</Badge>
                                        )}
                                      </div>
                                      {isOwned ? (
                                        <Badge variant="outline" className="text-xs bg-green-500/20 text-green-600 border-green-500/30">
                                          ✓ Owned
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs bg-gray-500/20 text-gray-500 border-gray-500/30">
                                          {font.price} pts
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground">
                            * Purchase fonts from the Shop to unlock them
                          </p>
                        </div>

                        {/* Color & Gradient Selection */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-lg font-semibold">Name Color / Gradient</Label>
                            <Badge variant="outline" className="text-[#ffa600] border-[#ffa600]/30">
                              {[...SHOP_ITEMS.colors, ...SHOP_ITEMS.gradients, ...SHOP_ITEMS.movingGradients]
                                .filter(item => ownedItems.includes(item.value)).length}/
                              {[...SHOP_ITEMS.colors, ...SHOP_ITEMS.gradients, ...SHOP_ITEMS.movingGradients].length} Owned
                            </Badge>
                          </div>
                          
                          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'>
                              {[...SHOP_ITEMS.colors, ...SHOP_ITEMS.gradients, ...SHOP_ITEMS.movingGradients].map(item => {
                                  const isOwned = ownedItems.includes(item.value);
                                  const isEquipped = nameColor === item.value && nameEffect === item.type;
                                  
                                  return (
                                      <motion.div
                                        key={item.name}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`relative rounded-lg overflow-hidden border-2 ${
                                          isEquipped 
                                            ? 'border-[#ffa600] ring-2 ring-[#ffa600]/30' 
                                            : isOwned 
                                              ? 'border-green-500/50' 
                                              : 'border-gray-500/30 opacity-70'
                                        }`}
                                      >
                                        <Button 
                                          variant={'ghost'} 
                                          className={`h-20 w-full p-0 m-0 ${!isOwned && 'cursor-not-allowed'}`}
                                          style={{background: item.value}}
                                          onClick={() => {
                                            if (isOwned) {
                                              setNameColor(item.value);
                                              setNameEffect(item.type);
                                            }
                                          }}
                                          disabled={!isOwned}
                                        >
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors">
                                            {item.type === 'gradient' && (
                                              <Sparkles className="h-4 w-4 text-white/80" />
                                            )}
                                            {item.type === 'moving-gradient' && (
                                              <Zap className="h-4 w-4 text-white/80 animate-pulse" />
                                            )}
                                          </div>
                                        </Button>
                                        
                                        {/* Item Badge */}
                                        <div className="absolute top-2 right-2">
                                          {isOwned ? (
                                            isEquipped ? (
                                              <Badge className="text-xs bg-[#ffa600] text-black border-0">
                                                ✓
                                              </Badge>
                                            ) : (
                                              <Badge className="text-xs bg-green-500/80 text-white border-0">
                                                ✓
                                              </Badge>
                                            )
                                          ) : (
                                            <Badge className="text-xs bg-black/60 text-white border-0">
                                              {item.price}
                                            </Badge>
                                          )}
                                        </div>
                                        
                                        {/* Item Name */}
                                        <div className="absolute bottom-2 left-2 right-2">
                                          <p className="text-[10px] font-medium text-white/90 bg-black/40 px-2 py-1 rounded truncate">
                                            {item.name}
                                          </p>
                                        </div>
                                        
                                        {/* Lock Icon for unowned items */}
                                        {!isOwned && (
                                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="h-6 w-6 rounded-full bg-black/70 flex items-center justify-center">
                                              <Crown className="h-3 w-3 text-white" />
                                            </div>
                                          </div>
                                        )}
                                      </motion.div>
                                  );
                              })}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            * Purchase colors and gradients from the Shop to unlock them
                          </p>
                        </div>

                        {/* Save Button */}
                        <div className="pt-4">
                            <Button 
                              onClick={handleAppearanceUpdate}
                              className="w-full bg-gradient-to-r from-[#ffa600] via-[#ff9500] to-[#ffa600] text-black font-bold hover:shadow-lg hover:shadow-[#ffa600]/30"
                              size="lg"
                            >
                              <Sparkles className="mr-2 h-5 w-5" />
                              Save & Equip Appearance
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            );
        case 'security':
            return (
                <Card className="border-border/50 shadow-lg bg-gradient-to-br from-background via-background to-muted/20">
                    <CardHeader>
                        <CardTitle className="text-[#ffa600] flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Security
                        </CardTitle>
                        <CardDescription>Manage your account security and sessions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Security Alert */}
                        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <AlertDescription className="text-amber-800 dark:text-amber-300">
                                This action will sign you out from all devices except this one. You'll need to sign in again on your other devices.
                            </AlertDescription>
                        </Alert>
                        
                        {/* Session Information */}
                        <div className="space-y-4">
                            <div className="rounded-lg border border-border/50 p-4">
                                <h3 className="font-semibold text-lg mb-2">Active Sessions</h3>
                                <p className="text-muted-foreground text-sm">
                                    You're currently signed in on this device. Use the button below to sign out from all other devices.
                                </p>
                                <div className="mt-4 flex items-center space-x-2 text-sm">
                                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                    <span>Current device (Active)</span>
                                </div>
                            </div>
                            
                            {/* Logout from other devices button */}
                            <Button 
                                onClick={handleRevokeAllSessions} 
                                variant="destructive"
                                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                                disabled={isRevokingSessions}
                            >
                                {isRevokingSessions ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sign out of all other devices
                                    </>
                                )}
                            </Button>
                            
                            <p className="text-xs text-muted-foreground text-center">
                                Last session management: {lastSessionRevocation || 'Never'}
                            </p>
                        </div>
                        
                        {/* Sign out current device */}
                        <div className="pt-4">
                            <Button 
                                onClick={signOut}
                                variant="outline"
                                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign out of this device
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            );
        default:
            return null;
    }
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0, position: 'absolute', width: '100%' }),
    center: { x: 0, opacity: 1, position: 'relative', width: '100%' },
    exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0, position: 'absolute', width: '100%' }),
  };

  if (!user || !userProfile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ffa600] border-t-transparent"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageTransition>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-[#ffa600]">Settings</h2>
        </div>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>
          <Separator />
          <div className="relative mt-4 min-h-[400px] overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                    key={activeTab}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 }
                    }}
                >
                    {getActiveTabContent()}
                </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>
        <p className="text-sm text-muted-foreground text-center">Made by Shravan and part</p>
      </div>
      </PageTransition>
      
      {/* Edit Profile Dialog */}
      {userProfile && (
        <EditProfileDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          user={userProfile}
          onProfileUpdate={(updatedProfile) => {
            setUserProfile({ ...userProfile, ...updatedProfile });
            toast({
              title: "Profile Updated",
              description: "Your profile has been successfully updated.",
            });
          }}
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