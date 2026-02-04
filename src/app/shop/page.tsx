// app/shop/page.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { SHOP_ITEMS, DEFAULT_NAME_STYLE, type ShopItem } from '@/config/shop-config';
import { purchaseItem, getUserProfile, getUserRole, calculateDiscountedPrice, userOwnsItem, isItemEquipped, getUserPurchasedItems, type User } from '@/services/firebase';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Palette, Type, Award, AlertCircle, ShoppingBag, Eye, Crown, Shield, Check, Zap, ChevronRight, Star, Gift, TrendingUp, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import PageTransition from '@/components/page-transition';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12,
    },
  },
};

const floatingVariants = {
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const pulseVariants = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(255, 153, 10, 0.4)',
      '0 0 0 10px rgba(255, 153, 10, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
    },
  },
};

const shimmerVariants = {
  animate: {
    backgroundPosition: ['0% 0%', '100% 0%'],
    transition: {
      duration: 3,
      repeat: Infinity,
    },
  },
};

const rotateVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export default function ShopPage() {
  const { user } = useAuth();
  const [chirpScore, setChirpScore] = useState(0);
  const [currentStyle, setCurrentStyle] = useState({
    ...DEFAULT_NAME_STYLE,
    color: '#ff990a',
  });
  const [selectedColor, setSelectedColor] = useState<ShopItem | null>(null);
  const [selectedFont, setSelectedFont] = useState<ShopItem | null>(null);
  const [previewUsername, setPreviewUsername] = useState('@username');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'superadmin' | 'moderator' | 'user'>('user');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('colors');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showPurchasePanel, setShowPurchasePanel] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadUserData();
      setPreviewUsername(`@${user.username || 'username'}`);
      const role = getUserRole(user.uid);
      setUserRole(role);
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setUserProfile(profile);
        setChirpScore(profile.chirpScore || 0);
        setCurrentStyle({
          color: profile.nameColor || '#ff990a',
          font: profile.nameFont || 'PT Sans, sans-serif',
          effect: profile.nameEffect || 'none',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDiscountedPrice = (item: ShopItem): number => {
    const discountedPrice = calculateDiscountedPrice(item.price, userRole);
    return discountedPrice;
  };

  const handlePurchase = async (item: ShopItem) => {
    if (!user) return;
    
    const discountedPrice = getDiscountedPrice(item);
    
    if (chirpScore < discountedPrice) {
      toast.error('Insufficient ChirpScore', {
        description: `You need ${discountedPrice - chirpScore} more points to purchase this item.`,
      });
      return;
    }

    setIsPurchasing(true);
    try {
      await purchaseItem(user.uid, item, discountedPrice);
      toast.success('Purchase successful!');
      
      setChirpScore(prev => prev - discountedPrice);
      
      // Reload user data to update purchased items
      await loadUserData();
      
      // Auto-equip the item
      if (item.type === 'font') {
        setCurrentStyle(prev => ({ ...prev, font: item.value }));
        setSelectedFont(null);
      } else if (item.type === 'color') {
        setCurrentStyle(prev => ({ ...prev, color: item.value, effect: 'none' }));
        setSelectedColor(null);
      } else if (item.type === 'gradient') {
        setCurrentStyle(prev => ({ ...prev, color: item.value, effect: 'gradient' }));
        setSelectedColor(null);
      } else if (item.type === 'moving-gradient') {
        setCurrentStyle(prev => ({ ...prev, color: item.value, effect: 'moving-gradient' }));
        setSelectedColor(null);
      }
      
    } catch (error) {
      toast.error('Purchase failed', {
        description: 'Please try again later.',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handlePurchaseAll = async () => {
    if (!user) return;
    
    const itemsToPurchase = [];
    if (selectedColor) itemsToPurchase.push(selectedColor);
    if (selectedFont) itemsToPurchase.push(selectedFont);
    
    if (itemsToPurchase.length === 0) return;
    
    const totalDiscountedPrice = itemsToPurchase.reduce((sum, item) => sum + getDiscountedPrice(item), 0);
    
    if (chirpScore < totalDiscountedPrice) {
      toast.error('Insufficient ChirpScore', {
        description: `You need ${totalDiscountedPrice - chirpScore} more points to purchase these items.`,
      });
      return;
    }

    setIsPurchasing(true);
    try {
      for (const item of itemsToPurchase) {
        const discountedPrice = getDiscountedPrice(item);
        await purchaseItem(user.uid, item, discountedPrice);
      }
      
      toast.success('Purchases successful!');
      
      setChirpScore(prev => prev - totalDiscountedPrice);
      
      // Reload user data
      await loadUserData();
      
      // Clear selections
      setSelectedColor(null);
      setSelectedFont(null);
      setShowPurchasePanel(false);
      
    } catch (error) {
      toast.error('Purchase failed', {
        description: 'Please try again later.',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const getPreviewStyle = useMemo(() => {
    return () => {
      const style: React.CSSProperties = {
        fontFamily: (selectedFont?.value || currentStyle.font),
      };

      const colorValue = selectedColor?.value || currentStyle.color;
      const effect = selectedColor?.type === 'gradient' ? 'gradient' : 
                    selectedColor?.type === 'moving-gradient' ? 'moving-gradient' : 
                    currentStyle.effect;

      if (effect === 'none') {
        style.color = colorValue;
      } else if (effect === 'gradient') {
        style.backgroundImage = colorValue;
        style.WebkitBackgroundClip = 'text';
        style.WebkitTextFillColor = 'transparent';
        style.backgroundClip = 'text';
      } else if (effect === 'moving-gradient') {
        style.backgroundImage = colorValue;
        style.backgroundSize = '200% 200%';
        style.WebkitBackgroundClip = 'text';
        style.WebkitTextFillColor = 'transparent';
        style.backgroundClip = 'text';
        style.animation = 'gradientMove 3s ease infinite';
      }

      return style;
    };
  }, [selectedFont, selectedColor, currentStyle]);

  const renderNamePreview = () => {
    const previewStyle = getPreviewStyle();
    const displayName = user?.name || 'Your Name';

    return (
      <div className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800 relative overflow-hidden"
        >
          {/* Animated background elements */}
          <motion.div
            animate={rotateVariants.animate}
            className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-orange-200/20 to-transparent rounded-full blur-3xl"
          />
          <motion.div
            animate={rotateVariants.animate}
            style={{ animationDirection: 'reverse' }}
            className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-full blur-3xl"
          />

          <motion.h3 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-4 flex items-center justify-center gap-2 relative z-10"
          >
            <motion.div animate={floatingVariants.animate}>
              <Eye className="h-4 w-4" />
            </motion.div>
            Real-time Preview
          </motion.h3>
          
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 80 }}
            className="text-4xl font-bold transition-all duration-300 mb-2 relative z-10"
            style={previewStyle}
          >
            {displayName}
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg relative z-10 border border-white/20"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Username Preview:</p>
            <p 
              className="text-xl font-semibold"
              style={previewStyle}
            >
              {previewUsername}
            </p>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-muted-foreground mt-4 relative z-10"
          >
            This is how others will see your name and username
          </motion.p>
        </motion.div>
        
        <style jsx global>{`
          @keyframes gradientMove {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>
      </div>
    );
  };

  const getColorPreviewStyle = (colorItem: ShopItem) => {
    if (colorItem.type === 'color') {
      return { backgroundColor: colorItem.value };
    } else {
      return { backgroundImage: colorItem.value };
    }
  };

  const handleSelectItem = (item: ShopItem) => {
    if (item.type === 'font' || item.type === 'color' || item.type === 'gradient' || item.type === 'moving-gradient') {
      const userOwns = userOwnsItem(userProfile, item);
      const isEquipped = isItemEquipped(userProfile, item);
      
      if (userOwns && !isEquipped) {
        toast.info('You already own this item', {
          description: 'Visit the Style Manager to equip it.',
          action: {
            label: 'Go to Manager',
            onClick: () => window.location.href = '/equip',
          },
        });
        return;
      }
      
      if (item.type === 'font') {
        setSelectedFont(item);
      } else {
        setSelectedColor(item);
      }
      
      setShowPurchasePanel(true);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <PageTransition>
          <div className="container mx-auto p-6 space-y-6">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Skeleton className="h-12 w-64" />
            </motion.div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
              >
                <Skeleton className="lg:col-span-1 h-[600px]" />
              </motion.div>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
              >
                <Skeleton className="lg:col-span-2 h-[600px]" />
              </motion.div>
            </div>
          </div>
        </PageTransition>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageTransition>
        <div className="container mx-auto p-4 md:p-6 space-y-6">
          {/* Header with Admin Badge and Manage Button */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                    <ShoppingBag className="h-6 w-6 md:h-8 md:w-8 text-[#ff990a]" />
                    Customization Shop
                  </h1>
                </motion.div>
                {userRole !== 'user' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Badge className={`ml-2 ${userRole === 'superadmin' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-teal-500'}`}>
                      {userRole === 'superadmin' ? (
                        <Crown className="h-3 w-3 mr-1" />
                      ) : (
                        <Shield className="h-3 w-3 mr-1" />
                      )}
                      {userRole === 'superadmin' ? 'Super Admin' : 'Moderator'} Discount
                    </Badge>
                  </motion.div>
                )}
              </div>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm md:text-base text-muted-foreground"
              >
                Customize how your name appears using ChirpScore
                {userRole !== 'user' && (
                  <span className="ml-2 text-[#ff990a] font-semibold">
                    ({userRole === 'superadmin' ? '90% OFF' : '30% OFF'} for staff!)
                  </span>
                )}
              </motion.p>
            </div>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4 w-full sm:w-auto"
            >
              <Link href="/equip" className="flex-1 sm:flex-none">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    <span className="hidden sm:inline">Manage Styles</span>
                    <span className="sm:hidden">Styles</span>
                  </Button>
                </motion.div>
              </Link>
              <motion.div 
                variants={pulseVariants}
                animate="animate"
                className="flex items-center gap-2 bg-gradient-to-r from-[#ff990a] to-orange-500 text-white px-3 py-2 rounded-xl"
              >
                <Award className="h-4 w-4 md:h-5 md:w-5" />
                <motion.span 
                  className="font-bold text-lg md:text-xl"
                  key={chirpScore}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  {chirpScore.toLocaleString()}
                </motion.span>
                <span className="text-xs md:text-sm">ChirpScore</span>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Admin Discount Info Card */}
          {userRole !== 'user' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 relative overflow-hidden"
            >
              <motion.div
                animate={shimmerVariants.animate}
                style={{ backgroundPosition: '0% 0%' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]"
              />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {userRole === 'superadmin' ? (
                      <Crown className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
                    ) : (
                      <Shield className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                    )}
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base">
                      {userRole === 'superadmin' ? 'Super Admin Exclusive' : 'Moderator Discount'}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      All shop items are {userRole === 'superadmin' ? '90% off' : '30% off'} for staff members!
                    </p>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Badge className={userRole === 'superadmin' ? 'bg-purple-500' : 'bg-blue-500'}>
                    {userRole === 'superadmin' ? 'SUPER DISCOUNT' : 'STAFF DISCOUNT'}
                  </Badge>
                </motion.div>
              </div>
            </motion.div>
          )}

          <Separator />

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Preview (Fixed on large screens) */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:w-1/3"
            >
              <div className="sticky top-6 space-y-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="border-orange-200 dark:border-orange-800 overflow-hidden">
                    <CardHeader>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <CardTitle className="flex items-center gap-2">
                          <motion.div animate={floatingVariants.animate}>
                            <Eye className="h-5 w-5 text-[#ff990a]" />
                          </motion.div>
                          Live Preview
                        </CardTitle>
                        <CardDescription>
                          See how your name will look in real-time
                        </CardDescription>
                      </motion.div>
                    </CardHeader>
                    <CardContent>
                      {renderNamePreview()}
                      
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-6"
                      >
                        <label className="text-sm font-medium mb-2 block">
                          Preview Username
                        </label>
                        <motion.div whileHover={{ scale: 1.01 }}>
                          <Input
                            value={previewUsername}
                            onChange={(e) => setPreviewUsername(e.target.value)}
                            placeholder="@username"
                            className="bg-white dark:bg-gray-800 rounded-xl"
                          />
                        </motion.div>
                      </motion.div>
                      
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="mt-6 space-y-3"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Selected Font:</span>
                          <span className="font-medium" style={{ fontFamily: selectedFont?.value || currentStyle.font }}>
                            {(selectedFont?.name || currentStyle.font.split(',')[0])}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Selected Color:</span>
                          <div className="flex items-center gap-2">
                            <motion.div
                              whileHover={{ scale: 1.2 }}
                              className="w-4 h-4 rounded-full border"
                              style={getColorPreviewStyle(selectedColor || SHOP_ITEMS.colors[0])}
                            />
                            <span>{selectedColor?.name || 'Orange'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Current ChirpScore:</span>
                          <span className="font-medium text-[#ff990a]">{chirpScore.toLocaleString()}</span>
                        </div>
                        {userRole !== 'user' && (
                          <div className="flex items-center justify-between text-sm pt-2 border-t">
                            <span className="text-muted-foreground">Your Discount:</span>
                            <Badge className={userRole === 'superadmin' ? 'bg-purple-500' : 'bg-blue-500'}>
                              {userRole === 'superadmin' ? '90% OFF' : '30% OFF'}
                            </Badge>
                          </div>
                        )}
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border-orange-200 dark:border-orange-800 overflow-hidden relative">
                    <motion.div
                      animate={shimmerVariants.animate}
                      style={{ backgroundPosition: '0% 0%' }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]"
                    />
                    <CardHeader className="relative z-10">
                      <CardTitle className="flex items-center gap-2 text-[#ff990a] dark:text-orange-400">
                        <motion.div animate={floatingVariants.animate}>
                          <TrendingUp className="h-5 w-5" />
                        </motion.div>
                        How to Earn ChirpScore
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 relative z-10">
                      <motion.div 
                        className="space-y-2"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <motion.div variants={itemVariants} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <motion.div 
                              className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"
                              whileHover={{ scale: 1.1 }}
                            >
                              <span className="text-xs font-bold text-green-600">+2</span>
                            </motion.div>
                            <span className="text-sm">Post a Chirp</span>
                          </div>
                          <span className="text-xs text-muted-foreground">(max 10/day)</span>
                        </motion.div>
                        <motion.div variants={itemVariants} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <motion.div 
                              className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"
                              whileHover={{ scale: 1.1 }}
                            >
                              <span className="text-xs font-bold text-green-600">+1</span>
                            </motion.div>
                            <span className="text-sm">Comment on a post</span>
                          </div>
                          <span className="text-xs text-muted-foreground">(max 15/day)</span>
                        </motion.div>
                        <motion.div variants={itemVariants} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <motion.div 
                              className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center"
                              whileHover={{ scale: 1.1 }}
                            >
                              <Star className="h-3 w-3 text-blue-600" />
                            </motion.div>
                            <span className="text-sm">Daily streak bonus</span>
                          </div>
                          <span className="text-xs font-bold text-blue-600">+20</span>
                        </motion.div>
                      </motion.div>
                      
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="pt-3 border-t"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Quick Tip</span>
                          <motion.div animate={floatingVariants.animate}>
                            <Gift className="h-4 w-4 text-[#ff990a]" />
                          </motion.div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Active users can earn up to <span className="font-bold text-[#ff990a]">55 points daily</span> just by posting and commenting!
                        </p>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>

            {/* Right Column - Shop Items (Scrollable) */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:w-2/3" 
              ref={scrollContainerRef}
            >
              <Tabs defaultValue="colors" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <TabsList className="grid grid-cols-2 mb-6 bg-muted/50">
                    <TabsTrigger 
                      value="colors" 
                      className="flex items-center gap-2 data-[state=active]:bg-[#ff990a] data-[state=active]:text-white rounded-lg transition-all"
                    >
                      <Palette className="h-4 w-4" />
                      Colors & Gradients
                    </TabsTrigger>
                    <TabsTrigger 
                      value="fonts" 
                      className="flex items-center gap-2 data-[state=active]:bg-[#ff990a] data-[state=active]:text-white rounded-lg transition-all"
                    >
                      <Type className="h-4 w-4" />
                      Fonts
                    </TabsTrigger>
                  </TabsList>
                </motion.div>

                <TabsContent value="colors" className="space-y-8">
                  {/* Colors Section */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#ff990a]">Solid Colors</h3>
                      <Badge variant="outline" className="text-xs">
                        {SHOP_ITEMS.colors.length} options
                      </Badge>
                    </div>
                    <motion.div 
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {SHOP_ITEMS.colors.map((item) => (
                        <motion.div key={`${item.name}-${item.type}`} variants={itemVariants}>
                          <ShopItemCard
                            item={item}
                            isSelected={selectedColor?.name === item.name}
                            onSelect={handleSelectItem}
                            chirpScore={chirpScore}
                            userRole={userRole}
                            userProfile={userProfile}
                            isOwned={item.isDefault}
                            getColorPreviewStyle={getColorPreviewStyle}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>

                  {/* Gradients Section */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#ff990a] flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Static Gradients
                      </h3>
                      <Badge variant="outline" className="text-xs bg-gradient-to-r from-purple-50 to-pink-50">
                        Premium
                      </Badge>
                    </div>
                    <motion.div 
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {SHOP_ITEMS.gradients.map((item) => (
                        <motion.div key={`${item.name}-${item.type}`} variants={itemVariants}>
                          <ShopItemCard
                            item={item}
                            isSelected={selectedColor?.name === item.name}
                            onSelect={handleSelectItem}
                            chirpScore={chirpScore}
                            userRole={userRole}
                            userProfile={userProfile}
                            getColorPreviewStyle={getColorPreviewStyle}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>

                  {/* Moving Gradients Section */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#ff990a] flex items-center gap-2">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        Animated Gradients
                      </h3>
                      <Badge variant="outline" className="text-xs bg-gradient-to-r from-blue-50 to-cyan-50">
                        Ultra Premium
                      </Badge>
                    </div>
                    <motion.div 
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {SHOP_ITEMS.movingGradients.map((item) => (
                        <motion.div key={`${item.name}-${item.type}`} variants={itemVariants}>
                          <ShopItemCard
                            item={item}
                            isSelected={selectedColor?.name === item.name}
                            onSelect={handleSelectItem}
                            chirpScore={chirpScore}
                            userRole={userRole}
                            userProfile={userProfile}
                            getColorPreviewStyle={getColorPreviewStyle}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                </TabsContent>

                <TabsContent value="fonts" className="space-y-4">
                  <motion.div 
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {SHOP_ITEMS.fonts.map((item) => (
                      <motion.div key={`${item.name}-${item.type}`} variants={itemVariants}>
                        <ShopItemCard
                          item={item}
                          isSelected={selectedFont?.name === item.name}
                          onSelect={handleSelectItem}
                          chirpScore={chirpScore}
                          userRole={userRole}
                          userProfile={userProfile}
                          currentFont={currentStyle.font}
                          isOwned={item.isDefault}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>

        {/* Purchase Panel - Fixed at bottom on mobile, sidebar on desktop */}
        <AnimatePresence>
          {showPurchasePanel && (selectedColor || selectedFont) && (
            <>
              {/* Mobile Purchase Panel */}
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-white to-white/95 dark:from-gray-900 dark:to-gray-900/95 backdrop-blur-sm border-t shadow-lg"
              >
                <div className="container mx-auto max-w-md">
                  <PurchasePanel
                    selectedColor={selectedColor}
                    selectedFont={selectedFont}
                    userRole={userRole}
                    chirpScore={chirpScore}
                    isPurchasing={isPurchasing}
                    onPurchaseAll={handlePurchaseAll}
                    onCancel={() => {
                      setSelectedColor(null);
                      setSelectedFont(null);
                      setShowPurchasePanel(false);
                    }}
                    getDiscountedPrice={getDiscountedPrice}
                  />
                </div>
              </motion.div>

              {/* Desktop Purchase Panel */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="hidden lg:block fixed right-6 bottom-6 z-50 w-80"
              >
                <PurchasePanel
                  selectedColor={selectedColor}
                  selectedFont={selectedFont}
                  userRole={userRole}
                  chirpScore={chirpScore}
                  isPurchasing={isPurchasing}
                  onPurchaseAll={handlePurchaseAll}
                  onCancel={() => {
                    setSelectedColor(null);
                    setSelectedFont(null);
                    setShowPurchasePanel(false);
                  }}
                  getDiscountedPrice={getDiscountedPrice}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </PageTransition>
    </AppLayout>
  );
}

function PurchasePanel({
  selectedColor,
  selectedFont,
  userRole,
  chirpScore,
  isPurchasing,
  onPurchaseAll,
  onCancel,
  getDiscountedPrice
}: {
  selectedColor: ShopItem | null;
  selectedFont: ShopItem | null;
  userRole: 'superadmin' | 'moderator' | 'user';
  chirpScore: number;
  isPurchasing: boolean;
  onPurchaseAll: () => void;
  onCancel: () => void;
  getDiscountedPrice: (item: ShopItem) => number;
}) {
  const totalPrice = (selectedColor ? getDiscountedPrice(selectedColor) : 0) + 
                     (selectedFont ? getDiscountedPrice(selectedFont) : 0);
  const canAfford = chirpScore >= totalPrice;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <Card className="border-[#ff990a] shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
        <motion.div
          animate={shimmerVariants.animate}
          style={{ backgroundPosition: '0% 0%' }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%] pointer-events-none"
        />
        <CardContent className="p-4 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#ff990a]" />
                Purchase Summary
              </h3>
              <motion.button
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onCancel}
                className="h-8 w-8 p-0 flex items-center justify-center"
              >
                ×
              </motion.button>
            </div>
            
            <div className="space-y-2 text-sm">
              {selectedColor && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2">
                    <motion.div 
                      className="w-4 h-4 rounded-full border"
                      whileHover={{ scale: 1.3 }}
                      style={{ 
                        background: selectedColor.type === 'color' 
                          ? selectedColor.value 
                          : `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='16' height='16' fill='url(${encodeURIComponent(selectedColor.value)})'/></svg>")`
                      }}
                    />
                    <span>{selectedColor.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {userRole !== 'user' && selectedColor.price > 0 && (
                      <span className="text-xs text-muted-foreground line-through">
                        {selectedColor.price}
                      </span>
                    )}
                    <motion.span 
                      className="font-semibold text-[#ff990a]"
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                    >
                      {getDiscountedPrice(selectedColor)} pts
                    </motion.span>
                  </div>
                </motion.div>
              )}
              
              {selectedFont && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-gray-500" />
                    <span>{selectedFont.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {userRole !== 'user' && selectedFont.price > 0 && (
                      <span className="text-xs text-muted-foreground line-through">
                        {selectedFont.price}
                      </span>
                    )}
                    <motion.span 
                      className="font-semibold text-[#ff990a]"
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.05 }}
                    >
                      {getDiscountedPrice(selectedFont)} pts
                    </motion.span>
                  </div>
                </motion.div>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total</span>
                <div className="text-right">
                  <motion.div 
                    className="font-bold text-lg text-[#ff990a]"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    {totalPrice} ChirpScore
                  </motion.div>
                  {userRole !== 'user' && (
                    <div className="text-xs text-purple-500">
                      {userRole === 'superadmin' ? '90%' : '30%'} discount applied!
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your balance:</span>
                <motion.span 
                  className={`font-medium ${canAfford ? 'text-green-600' : 'text-red-600'}`}
                  initial={{ scale: 1 }}
                  animate={{ scale: canAfford ? [1, 1.05, 1] : 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {chirpScore.toLocaleString()} pts
                </motion.span>
              </div>
              
              {!canAfford && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded-lg"
                >
                  You need {totalPrice - chirpScore} more points to purchase these items.
                </motion.div>
              )}
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <motion.div 
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={isPurchasing}
                  className="flex-1 rounded-lg"
                >
                  Cancel
                </Button>
              </motion.div>
              <motion.div 
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={onPurchaseAll}
                  disabled={isPurchasing || !canAfford}
                  className="flex-1 rounded-lg bg-gradient-to-r from-[#ff990a] to-orange-500 hover:from-orange-600 hover:to-orange-700"
                >
                  {isPurchasing ? (
                    <>
                      <motion.div 
                        className="h-4 w-4 rounded-full border-2 border-white border-t-transparent mr-2"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      Purchasing...
                    </>
                  ) : (
                    'Purchase Now'
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ShopItemCard({ 
  item, 
  isSelected, 
  onSelect, 
  chirpScore,
  currentFont,
  userRole,
  userProfile,
  isOwned = false,
  getColorPreviewStyle,
}: { 
  item: ShopItem;
  isSelected: boolean;
  onSelect: (item: ShopItem) => void;
  chirpScore: number;
  currentFont?: string;
  userRole: 'superadmin' | 'moderator' | 'user';
  userProfile?: any;
  isOwned?: boolean;
  getColorPreviewStyle?: (item: ShopItem) => React.CSSProperties;
}) {
  const calculateDiscountedPrice = (originalPrice: number): number => {
    if (userRole === 'superadmin') {
      return Math.floor(originalPrice * 0.1);
    } else if (userRole === 'moderator') {
      return Math.ceil(originalPrice * 0.7);
    }
    return originalPrice;
  };

  const discountedPrice = calculateDiscountedPrice(item.price);
  const canAfford = chirpScore >= discountedPrice;
  const isFontOwned = item.type === 'font' && currentFont === item.value;
  const hasDiscount = userRole !== 'user' && item.price > 0;
  
  const userOwns = userProfile ? userOwnsItem(userProfile, item) : false;
  const isEquipped = userProfile ? isItemEquipped(userProfile, item) : false;

  const handleClick = () => {
    onSelect(item);
  };

  const isClickable = !isOwned && (userOwns ? !isEquipped : true);

  return (
    <motion.div 
      whileHover={{ scale: isClickable ? 1.05 : 1, y: isClickable ? -4 : 0 }} 
      whileTap={{ scale: isClickable ? 0.96 : 1 }}
      className="relative"
    >
      <Card
        className={`transition-all duration-300 ${
          isSelected ? 'ring-2 ring-[#ff990a] border-[#ff990a] shadow-lg' : 'border-gray-200'
        } ${!isClickable ? 'opacity-75' : ''} rounded-xl h-full ${
          isClickable ? 'cursor-pointer hover:border-[#ff990a] hover:shadow-md' : 'cursor-default'
        } overflow-hidden relative`}
        onClick={isClickable ? handleClick : undefined}
      >
        {/* Ownership badges */}
        {userOwns && (
          <motion.div 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="absolute -top-2 -right-2 z-10 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
          >
            OWNED
          </motion.div>
        )}
        
        {isEquipped && (
          <motion.div 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
            className="absolute -top-2 -left-2 z-10 bg-[#ff990a] text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
          >
            <Check className="h-3 w-3 inline mr-1" />
            EQUIPPED
          </motion.div>
        )}
        
        {/* Discount Badge */}
        {hasDiscount && !userOwns && !isOwned && (
          <motion.div 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className={`absolute -top-2 ${userOwns ? '-right-10' : '-right-2'} z-10 ${
              userRole === 'superadmin' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-teal-500'
            } text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg`}
          >
            {userRole === 'superadmin' ? '90% OFF' : '30% OFF'}
          </motion.div>
        )}
        
        <CardContent className="p-4 h-full flex flex-col">
          {item.type === 'font' ? (
            <div className="space-y-4 flex-1">
              <motion.div 
                className="h-16 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <h3 
                  className="text-3xl font-bold"
                  style={{ fontFamily: item.value }}
                >
                  Aa
                </h3>
              </motion.div>
              <div className="text-center flex-1 flex flex-col">
                <h4 className="font-medium mb-2">{item.name}</h4>
                <p className="text-sm text-muted-foreground flex-1" style={{ fontFamily: item.value }}>
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              <motion.div 
                className="h-16 rounded-lg transition-all border shadow-inner"
                whileHover={{ scale: 1.05 }}
                style={{
                  ...(getColorPreviewStyle ? getColorPreviewStyle(item) : { background: item.value }),
                  animation: item.type === 'moving-gradient' ? 'gradientMove 3s ease infinite' : 'none'
                }}
              />
              <div className="text-center flex-1 flex flex-col">
                <h4 className="font-medium mb-1">{item.name}</h4>
                {item.type === 'moving-gradient' && (
                  <motion.p 
                    className="text-xs text-[#ff990a] mt-1 flex items-center justify-center gap-1"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Zap className="h-3 w-3" />
                    Animated
                  </motion.p>
                )}
                {item.type === 'gradient' && (
                  <p className="text-xs text-purple-500 mt-1 flex items-center justify-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Gradient
                  </p>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Badge 
                variant={
                  userOwns ? "secondary" : 
                  canAfford || discountedPrice === 0 ? "default" : "destructive"
                }
                className={`rounded-lg ${
                  userOwns ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' :
                  canAfford || discountedPrice === 0 ? 'bg-gradient-to-r from-[#ff990a] to-orange-500' : ''
                }`}
              >
                {userOwns ? 'OWNED' : discountedPrice === 0 ? 'FREE' : `${discountedPrice.toLocaleString()} pts`}
              </Badge>
              {hasDiscount && item.price > 0 && !userOwns && !isOwned && (
                <span className="text-xs text-muted-foreground line-through">
                  {item.price.toLocaleString()}
                </span>
              )}
            </div>
            
            {/* Status indicator */}
            <div className="text-xs">
              {userOwns ? (
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1 ${isEquipped ? 'text-[#ff990a]' : 'text-green-600'}`}>
                    {isEquipped ? (
                      <>
                        <Check className="h-3 w-3" />
                        Equipped
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Owned - Equip in Style Manager
                      </>
                    )}
                  </span>
                  {!isEquipped && (
                    <Link href="/equip" className="text-[#ff990a] hover:underline">
                      Equip Now →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className={canAfford ? 'text-green-600' : 'text-red-500'}>
                    {canAfford ? '✓ Can afford' : `Need ${(discountedPrice - chirpScore).toLocaleString()} more`}
                  </span>
                  {hasDiscount && (
                    <span className="text-[#ff990a] font-medium">
                      {userRole === 'superadmin' ? 'Super Admin Discount' : 'Staff Discount'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}