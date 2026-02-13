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
import { Sparkles, Palette, Type, Award, AlertCircle, ShoppingBag, Eye, Crown, Shield, Check, Zap, ChevronRight, Star, Gift, TrendingUp, Users, Flame, Cloud, Cpu } from 'lucide-react';
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

const nebulaOrbitVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 15,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

const glitchVariants = {
  animate: {
    x: [0, -2, 2, -2, 2, 0],
    y: [0, 1, -1, 1, -1, 0],
    opacity: [1, 0.8, 1, 0.8, 1],
    transition: {
      duration: 0.3,
      repeat: Infinity,
      repeatDelay: 3,
    },
  },
};

const starPulseVariants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.3, 0.8, 0.3],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const pixelShiftVariants = {
  animate: {
    x: [0, 2, -2, 0],
    y: [0, -1, 1, 0],
    transition: {
      duration: 0.1,
      repeat: Infinity,
      repeatDelay: 5,
    },
  },
};

// Define the new effects for the shop
const SPECIAL_EFFECTS: ShopItem[] = [
  {
    name: 'Nebula Swirl',
    type: 'special-effect',
    value: 'nebula',
    price: 1200,
    description: 'A cosmic swirling galaxy with orbiting stars and nebula clouds',
    rarity: 'epic',
  },
  {
    name: 'Digital Glitch',
    type: 'special-effect',
    value: 'glitch',
    price: 1000,
    description: 'Retro computer glitch effect with digital noise and binary rain',
    rarity: 'epic',
  }
];

export default function ShopPage() {
  const { user } = useAuth();
  const [chirpScore, setChirpScore] = useState(0);
  const [currentStyle, setCurrentStyle] = useState({
    ...DEFAULT_NAME_STYLE,
    color: '#ff990a',
  });
  const [selectedColor, setSelectedColor] = useState<ShopItem | null>(null);
  const [selectedFont, setSelectedFont] = useState<ShopItem | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<ShopItem | null>(null);
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
      } else if (item.type === 'special-effect') {
        setCurrentStyle(prev => ({ ...prev, effect: item.value }));
        setSelectedEffect(null);
      }
      
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Purchase failed', {
        description: error.message || 'Please try again later.',
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
    if (selectedEffect) itemsToPurchase.push(selectedEffect);
    
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
      setSelectedEffect(null);
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
      const effect = selectedEffect?.value || 
                    selectedColor?.type === 'gradient' ? 'gradient' : 
                    selectedColor?.type === 'moving-gradient' ? 'moving-gradient' : 
                    currentStyle.effect;

      if (effect === 'none' || effect === 'nebula' || effect === 'glitch') {
        style.color = colorValue;
        if (effect === 'nebula') {
          style.textShadow = '0 0 20px rgba(138, 43, 226, 0.8), 0 0 40px rgba(75, 0, 130, 0.6)';
        } else if (effect === 'glitch') {
          style.textShadow = '1px 0 #00ff00, -1px 0 #ff00ff';
        }
      } else if (effect === 'gradient') {
        style.backgroundImage = colorValue;
        style.WebkitBackgroundClip = 'text';
        style.WebkitTextFillColor = 'transparent';
        style.backgroundClip = 'text';
        style.textShadow = '0 0 10px rgba(255, 87, 34, 0.3)';
      } else if (effect === 'moving-gradient') {
        style.backgroundImage = colorValue;
        style.backgroundSize = '200% 200%';
        style.WebkitBackgroundClip = 'text';
        style.WebkitTextFillColor = 'transparent';
        style.backgroundClip = 'text';
        style.animation = 'gradientMove 3s ease infinite';
        style.textShadow = '0 0 10px rgba(255, 87, 34, 0.3)';
      }

      return style;
    };
  }, [selectedFont, selectedColor, selectedEffect, currentStyle]);

  const renderNamePreview = () => {
    const previewStyle = getPreviewStyle();
    const displayName = user?.name || 'Your Name';
    const hasNebulaEffect = selectedEffect?.value === 'nebula' || currentStyle.effect === 'nebula';
    const hasGlitchEffect = selectedEffect?.value === 'glitch' || currentStyle.effect === 'glitch';

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
          
          <div className="relative inline-block min-h-[150px]">
            {/* Vortex Effect (replacing Nebula) */}
            {hasNebulaEffect && (
              <>
                {/* Spinning Vortex Rings */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`vortex-ring-${i}`}
                    animate={{
                      rotate: 360,
                      scale: [1, 1.15, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      rotate: {
                        duration: 6 - i * 0.3,
                        repeat: Infinity,
                        ease: 'linear',
                      },
                      scale: {
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.2,
                      },
                      opacity: {
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.2,
                      },
                    }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      width: `${80 + i * 25}px`,
                      height: `${80 + i * 25}px`,
                      border: '2px solid',
                      borderColor: `rgba(147, 112, 219, ${0.4 - i * 0.04})`,
                      borderRadius: '50%',
                      filter: 'blur(2px)',
                    }}
                  />
                ))}
                
                {/* Central Glowing Core */}
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(138, 43, 226, 0.8) 0%, rgba(147, 112, 219, 0.4) 40%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(20px)',
                  }}
                />

                {/* Spiraling Energy Particles */}
                {[...Array(24)].map((_, i) => (
                  <motion.div
                    key={`spiral-${i}`}
                    animate={{
                      rotate: 360,
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'linear',
                      delay: i * 0.15,
                    }}
                    className="absolute left-1/2 top-1/2"
                    style={{
                      transformOrigin: '0 0',
                    }}
                  >
                    <motion.div
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeOut',
                        delay: i * 0.15,
                      }}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, rgba(${147 + i * 2}, ${112 + i}, 219, 0.9) 0%, transparent 70%)`,
                        transform: `translateX(${40 + i * 8}px)`,
                        filter: 'blur(1px)',
                      }}
                    />
                  </motion.div>
                ))}

                {/* Flowing Energy Waves */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={`wave-${i}`}
                    animate={{
                      scale: [0.5, 2.5],
                      opacity: [0.6, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeOut',
                      delay: i * 1,
                    }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      width: '100px',
                      height: '100px',
                      border: '3px solid rgba(138, 43, 226, 0.5)',
                      borderRadius: '50%',
                      filter: 'blur(3px)',
                    }}
                  />
                ))}
              </>
            )}

            {/* Enhanced Glitch Effect */}
            {hasGlitchEffect && (
              <>
                {/* Animated Glitch Layers */}
                <motion.div
                  animate={{
                    x: [0, -3, 3, -2, 2, 0],
                    opacity: [0, 0.5, 0.3, 0.6, 0.2, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 0, 0, 0.3) 50%, transparent 100%)',
                    mixBlendMode: 'screen',
                  }}
                />
                
                <motion.div
                  animate={{
                    x: [0, 3, -3, 2, -2, 0],
                    opacity: [0, 0.4, 0.5, 0.3, 0.4, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    repeatDelay: 2,
                    delay: 0.1,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.3) 50%, transparent 100%)',
                    mixBlendMode: 'screen',
                  }}
                />

                {/* Horizontal Scan Lines */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`scanline-${i}`}
                    animate={{
                      x: ['-100%', '200%'],
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: 'linear',
                      repeatDelay: 1,
                    }}
                    className="absolute"
                    style={{
                      top: `${i * 15}%`,
                      width: '40%',
                      height: '2px',
                      background: 'rgba(0, 255, 0, 0.6)',
                      filter: 'blur(1px)',
                    }}
                  />
                ))}

                {/* RGB Split Effect */}
                <motion.div
                  animate={{
                    opacity: [0, 0.3, 0],
                  }}
                  transition={{
                    duration: 0.15,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'repeating-linear-gradient(0deg, rgba(255,0,0,0.1) 0px, rgba(0,255,0,0.1) 1px, rgba(0,0,255,0.1) 2px, transparent 3px, transparent 6px)',
                    mixBlendMode: 'screen',
                  }}
                />

                {/* Digital Noise Blocks */}
                {[...Array(15)].map((_, i) => (
                  <motion.div
                    key={`noise-block-${i}`}
                    animate={{
                      x: [0, Math.random() * 10 - 5],
                      opacity: [0, 0.7, 0],
                      scaleX: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 0.2,
                      repeat: Infinity,
                      delay: i * 0.15,
                      repeatDelay: 2,
                    }}
                    className="absolute"
                    style={{
                      left: `${Math.random() * 90}%`,
                      top: `${Math.random() * 90}%`,
                      width: `${Math.random() * 30 + 10}px`,
                      height: `${Math.random() * 4 + 2}px`,
                      background: Math.random() > 0.5 ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 255, 0.6)',
                    }}
                  />
                ))}

                {/* Falling Binary Code */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`binary-${i}`}
                    animate={{
                      y: [-50, 250],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: Math.random() * 2 + 2,
                      repeat: Infinity,
                      delay: Math.random() * 3,
                      ease: 'linear',
                    }}
                    className="absolute text-xs font-mono"
                    style={{
                      left: `${5 + i * 7.5}%`,
                      color: '#00ff00',
                      textShadow: '0 0 5px rgba(0, 255, 0, 0.8)',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                    }}
                  >
                    {Array.from({ length: 3 }, () => Math.random() > 0.5 ? '1' : '0').join('')}
                  </motion.div>
                ))}

                {/* Glitch Flicker Overlay */}
                <motion.div
                  animate={{
                    opacity: [0, 0.1, 0, 0.2, 0],
                  }}
                  transition={{
                    duration: 0.1,
                    repeat: Infinity,
                    repeatDelay: 4,
                  }}
                  className="absolute inset-0"
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    mixBlendMode: 'overlay',
                  }}
                />
              </>
            )}

            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
              }}
              transition={{ 
                delay: 0.4,
                duration: 0.5,
              }}
              className="text-4xl font-bold transition-all duration-300 mb-2 relative z-10"
              style={previewStyle}
            >
              {/* Additional glitch effect on text */}
              {hasGlitchEffect && (
                <>
                  <motion.span
                    animate={{
                      x: [-2, 2],
                      opacity: [0, 0.5],
                    }}
                    transition={{
                      duration: 0.1,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                    className="absolute inset-0"
                    style={{
                      color: '#ff0000',
                      mixBlendMode: 'screen',
                    }}
                  >
                    {displayName}
                  </motion.span>
                  <motion.span
                    animate={{
                      x: [2, -2],
                      opacity: [0, 0.5],
                    }}
                    transition={{
                      duration: 0.1,
                      repeat: Infinity,
                      repeatDelay: 3,
                      delay: 0.05,
                    }}
                    className="absolute inset-0"
                    style={{
                      color: '#00ffff',
                      mixBlendMode: 'screen',
                    }}
                  >
                    {displayName}
                  </motion.span>
                </>
              )}
              {displayName}
            </motion.h1>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg relative z-10 border border-white/20"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Username Preview:</p>
            <div className="relative inline-block">
              {(hasNebulaEffect || hasGlitchEffect) && (
                <div className="absolute inset-0 -m-6 pointer-events-none">
                  {hasNebulaEffect && (
                    <>
                      {/* Mini Vortex */}
                      {[...Array(4)].map((_, i) => (
                        <motion.div
                          key={`mini-vortex-${i}`}
                          animate={{
                            rotate: 360,
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            rotate: {
                              duration: 4 - i * 0.5,
                              repeat: Infinity,
                              ease: 'linear',
                            },
                            scale: {
                              duration: 1.5,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: i * 0.2,
                            },
                          }}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{
                            width: `${40 + i * 15}px`,
                            height: `${40 + i * 15}px`,
                            border: '1px solid',
                            borderColor: `rgba(147, 112, 219, ${0.5 - i * 0.1})`,
                            borderRadius: '50%',
                            filter: 'blur(1px)',
                          }}
                        />
                      ))}
                    </>
                  )}
                  
                  {hasGlitchEffect && (
                    <>
                      <motion.div
                        animate={{
                          opacity: [0, 0.3, 0],
                        }}
                        transition={{
                          duration: 0.15,
                          repeat: Infinity,
                          repeatDelay: 3,
                        }}
                        className="absolute inset-0"
                        style={{
                          background: 'rgba(0, 255, 0, 0.2)',
                          mixBlendMode: 'screen',
                        }}
                      />
                    </>
                  )}
                </div>
              )}
              <p 
                className="text-xl font-semibold relative z-10"
                style={previewStyle}
              >
                {previewUsername}
              </p>
            </div>
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
    // Check for Nebula or Digital Glitch
    if (item.value === 'nebula' || item.value === 'glitch') {
      const itemName = item.name;
      const confirmed = window.confirm(
        `⚠️ BETA VERSION - ${itemName}\n\nThis effect is in beta and might have issues. Are you sure you want to proceed?`
      );
      
      if (!confirmed) {
        return; // Don't proceed if user cancels
      }
    }
    
    if (item.type === 'font' || item.type === 'color' || item.type === 'gradient' || item.type === 'moving-gradient' || item.type === 'special-effect') {
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
      } else if (item.type === 'special-effect') {
        setSelectedEffect(item);
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
                      {userRole === 'superadmin' ? 'Super Admin Discount' : 'Moderator Discount'}
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
                        {selectedEffect && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Special Effect:</span>
                            <div className="flex items-center gap-2">
                              {selectedEffect.value === 'nebula' ? (
                                <Cloud className="w-4 h-4 text-purple-500" />
                              ) : (
                                <Cpu className="w-4 h-4 text-green-500" />
                              )}
                              <span>{selectedEffect.name}</span>
                            </div>
                          </div>
                        )}
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
                  <TabsList className="grid grid-cols-3 mb-6 bg-muted/50">
                    <TabsTrigger 
                      value="colors" 
                      className="flex items-center gap-2 data-[state=active]:bg-[#ff990a] data-[state=active]:text-white rounded-lg transition-all"
                    >
                      <Palette className="h-4 w-4" />
                      Colors
                    </TabsTrigger>
                    <TabsTrigger 
                      value="fonts" 
                      className="flex items-center gap-2 data-[state=active]:bg-[#ff990a] data-[state=active]:text-white rounded-lg transition-all"
                    >
                      <Type className="h-4 w-4" />
                      Fonts
                    </TabsTrigger>
                    <TabsTrigger 
                      value="effects" 
                      className="flex items-center gap-2 data-[state=active]:bg-[#ff990a] data-[state=active]:text-white rounded-lg transition-all"
                    >
                      <Flame className="h-4 w-4" />
                      Effects
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

                <TabsContent value="effects" className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#ff990a] flex items-center gap-2">
                        <Flame className="h-4 w-4 animate-pulse" />
                        Special Effects
                      </h3>
                      <Badge variant="outline" className="text-xs bg-gradient-to-r from-purple-50 to-blue-50">
                        Epic
                      </Badge>
                    </div>
                    <motion.div 
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {SPECIAL_EFFECTS.map((item) => (
                        <motion.div key={`${item.name}-${item.type}`} variants={itemVariants}>
                          <ShopItemCard
                            item={item}
                            isSelected={selectedEffect?.value === item.value}
                            onSelect={handleSelectItem}
                            chirpScore={chirpScore}
                            userRole={userRole}
                            userProfile={userProfile}
                            isEpic={true}
                            getColorPreviewStyle={getColorPreviewStyle}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>

        {/* Purchase Panel - Fixed at bottom on mobile, sidebar on desktop */}
        <AnimatePresence>
          {showPurchasePanel && (selectedColor || selectedFont || selectedEffect) && (
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
                    selectedEffect={selectedEffect}
                    userRole={userRole}
                    chirpScore={chirpScore}
                    isPurchasing={isPurchasing}
                    onPurchaseAll={handlePurchaseAll}
                    onCancel={() => {
                      setSelectedColor(null);
                      setSelectedFont(null);
                      setSelectedEffect(null);
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
                  selectedEffect={selectedEffect}
                  userRole={userRole}
                  chirpScore={chirpScore}
                  isPurchasing={isPurchasing}
                  onPurchaseAll={handlePurchaseAll}
                  onCancel={() => {
                    setSelectedColor(null);
                    setSelectedFont(null);
                    setSelectedEffect(null);
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
  selectedEffect,
  userRole,
  chirpScore,
  isPurchasing,
  onPurchaseAll,
  onCancel,
  getDiscountedPrice,
}: {
  selectedColor: ShopItem | null;
  selectedFont: ShopItem | null;
  selectedEffect: ShopItem | null;
  userRole: 'superadmin' | 'moderator' | 'user';
  chirpScore: number;
  isPurchasing: boolean;
  onPurchaseAll: () => void;
  onCancel: () => void;
  getDiscountedPrice: (item: ShopItem) => number;
}) {
  const totalPrice = (selectedColor ? getDiscountedPrice(selectedColor) : 0) + 
                     (selectedFont ? getDiscountedPrice(selectedFont) : 0) +
                     (selectedEffect ? getDiscountedPrice(selectedEffect) : 0);
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

              {selectedEffect && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2">
                    {selectedEffect.value === 'nebula' ? (
                      <Cloud className="h-4 w-4 text-purple-500 animate-pulse" />
                    ) : (
                      <Cpu className="h-4 w-4 text-green-500 animate-pulse" />
                    )}
                    <span className="font-medium">{selectedEffect.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {userRole !== 'user' && selectedEffect.price > 0 && (
                      <span className="text-xs text-muted-foreground line-through">
                        {selectedEffect.price}
                      </span>
                    )}
                    <motion.span 
                      className="font-bold text-[#ff990a]"
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    >
                      {getDiscountedPrice(selectedEffect)} pts
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
  isEpic = false,
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
  isEpic?: boolean;
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
        } overflow-hidden relative ${
          isEpic ? 'bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/30 dark:to-blue-950/20' : ''
        }`}
        onClick={isClickable ? handleClick : undefined}
      >
        {/* Epic effect background */}
        {isEpic && (
          <motion.div
            animate={shimmerVariants.animate}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-100/10 to-transparent bg-[length:200%_100%] pointer-events-none"
          />
        )}
        
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
        
        {/* Epic Badge */}
        {isEpic && !userOwns && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.05 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-purple-300"
          >
            {item.value === 'nebula' ? (
              <Cloud className="h-3 w-3 inline mr-1" />
            ) : (
              <Cpu className="h-3 w-3 inline mr-1" />
            )}
            EPIC
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
          ) : item.type === 'special-effect' ? (
            <div className="space-y-4 flex-1">
              <motion.div 
                className="h-16 rounded-lg transition-all border shadow-inner flex items-center justify-center relative overflow-hidden"
                whileHover={{ scale: 1.05 }}
                style={{
                  background: item.value === 'nebula' 
                    ? 'linear-gradient(135deg, #4b0082, #8a2be2, #9370db)'
                    : 'linear-gradient(135deg, #001100, #003300, #005500)'
                }}
              >
                {item.value === 'nebula' ? (
                  <>
                    {/* Mini Nebula Preview */}
                    <motion.div
                      animate={nebulaOrbitVariants.animate}
                      className="absolute inset-0"
                      style={{ 
                        transformOrigin: 'center',
                        animationDuration: '8s',
                      }}
                    >
                      {/* Central glowing orb */}
                      <motion.div
                        animate={starPulseVariants.animate}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{
                          width: '30px',
                          height: '30px',
                          background: 'radial-gradient(circle, rgba(138, 43, 226, 0.6) 0%, rgba(75, 0, 130, 0.3) 50%, transparent 100%)',
                          borderRadius: '50%',
                          filter: 'blur(5px)',
                        }}
                      />
                      
                      {/* Orbiting stars */}
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={starPulseVariants.animate}
                          style={{
                            animationDelay: `${i * 0.2}s`,
                          }}
                          className="absolute"
                          style={{
                            left: '50%',
                            top: '50%',
                            transform: `rotate(${i * 60}deg) translateY(-25px)`,
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: `radial-gradient(circle, rgba(147,112,219,0.9) 0%, rgba(138,43,226,0.6) 70%, transparent 100%)`,
                            filter: 'blur(1px)',
                          }}
                        />
                      ))}
                    </motion.div>
                  </>
                ) : (
                  <>
                    {/* Glitch Effect Preview */}
                    <motion.div
                      variants={glitchVariants}
                      animate="animate"
                      className="absolute inset-0"
                      style={{
                        mixBlendMode: 'screen',
                      }}
                    >
                      {/* Glitch lines */}
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(45deg, transparent 45%, rgba(0, 255, 0, 0.2) 50%, transparent 55%)',
                          backgroundSize: '20px 20px',
                          opacity: 0.5,
                        }}
                      />
                    </motion.div>
                    
                    {/* Binary code */}
                    <div className="absolute inset-0 overflow-hidden">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            y: ['-20%', '120%'],
                            opacity: [0, 0.8, 0],
                          }}
                          transition={{
                            duration: Math.random() * 1.5 + 1,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                            ease: 'linear',
                          }}
                          className="absolute text-xs font-mono text-green-400"
                          style={{
                            left: `${10 + i * 15}%`,
                            fontFamily: 'monospace',
                            opacity: 0,
                          }}
                        >
                          {Math.random() > 0.5 ? '101' : '010'}
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
              <div className="text-center flex-1 flex flex-col">
                <h4 className="font-medium mb-1">{item.name}</h4>
                <p className="text-xs text-muted-foreground flex-1">
                  {item.description}
                </p>
                <motion.p 
                  className="text-xs mt-2 flex items-center justify-center gap-1"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    color: item.value === 'nebula' ? '#8a2be2' : '#00ff00'
                  }}
                >
                  {item.value === 'nebula' ? (
                    <>
                      <Cloud className="h-3 w-3" />
                      Cosmic Animation
                    </>
                  ) : (
                    <>
                      <Cpu className="h-3 w-3" />
                      Digital Glitch
                    </>
                  )}
                </motion.p>
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
                  canAfford || discountedPrice === 0 ? 
                    isEpic ? 'bg-gradient-to-r from-purple-500 to-blue-500' :
                    'bg-gradient-to-r from-[#ff990a] to-orange-500' : ''
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