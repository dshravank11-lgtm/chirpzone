// app/equip/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  getUserProfile,
  getUserPurchasedItems,
  equipStyle,
  resetToDefaultStyle,
  isItemEquipped
} from '@/services/firebase';
import { SHOP_ITEMS, DEFAULT_NAME_STYLE } from '@/config/shop-config';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Palette, Type, Sparkles, Check, RotateCcw, Crown, ArrowRight, X, Cloud, Cpu } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { toast } from 'sonner';
import PageTransition from '@/components/page-transition';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const DEFAULT_PURCHASED_ITEMS = {
  fonts: [],
  colors: [],
  gradients: [],
  movingGradients: [],
  effects: [], 
};

// ─── Animated floating orbs ──────────────────────────────────────────────────
function AmbientOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {[
        { size: 280, top: '5%', left: '-10%', delay: 0 },
        { size: 200, top: '55%', right: '-5%', delay: 1.5 },
        { size: 160, top: '75%', left: '40%', delay: 2.8 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size, height: orb.size,
            top: orb.top,
            left: (orb as any).left,
            right: (orb as any).right,
            background: `radial-gradient(circle, rgba(255,153,10,${0.07 - i * 0.015}) 0%, transparent 70%)`,
            filter: 'blur(36px)',
          }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 7 + i * 1.5, repeat: Infinity, delay: orb.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Staggered list item wrapper ─────────────────────────────────────────────
function StaggerItem({ index, children }: { index: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -20px 0px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -16 : 16, y: 8 }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: index % 2 === 0 ? -16 : 16, y: 8 }}
      transition={{ duration: 0.36, delay: index * 0.06, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Define special effects items
const SPECIAL_EFFECTS = [
  {
    name: 'Nebula Swirl',
    type: 'special-effect',
    value: 'nebula',
    description: 'Cosmic swirling galaxy effect',
    rarity: 'epic',
  },
  {
    name: 'Digital Glitch',
    type: 'special-effect',
    value: 'glitch',
    description: 'Retro computer glitch effect',
    rarity: 'epic',
  }
];

export default function EquipPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [purchasedItems, setPurchasedItems] = useState(DEFAULT_PURCHASED_ITEMS);
  const [equippedStyle, setEquippedStyle] = useState(DEFAULT_NAME_STYLE);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isEquipping, setIsEquipping] = useState(false);

  useEffect(() => {
    if (user?.uid) loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      const profile = await getUserProfile(user.uid);
      const purchased = await getUserPurchasedItems(user.uid);
      setUserProfile(profile);
      setPurchasedItems(purchased || DEFAULT_PURCHASED_ITEMS);
      if (profile?.equippedStyle) {
        setEquippedStyle({
          color: profile.equippedStyle.nameColor || DEFAULT_NAME_STYLE.color,
          font: profile.equippedStyle.nameFont || DEFAULT_NAME_STYLE.font,
          effect: profile.equippedStyle.nameEffect || DEFAULT_NAME_STYLE.effect,
        });
      } else {
        setEquippedStyle({
          color: profile?.nameColor || DEFAULT_NAME_STYLE.color,
          font: profile?.nameFont || DEFAULT_NAME_STYLE.font,
          effect: profile?.nameEffect || DEFAULT_NAME_STYLE.effect,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load your items');
    } finally {
      setLoading(false);
    }
  };

  const getStylePreview = (item?: any) => {
    const styleItem = item || selectedItem;
    const style: React.CSSProperties = {
      fontFamily: styleItem?.type === 'font' ? styleItem.value : equippedStyle.font,
    };
    
    let colorValue = equippedStyle.color;
    let effect = equippedStyle.effect;
    
    if (styleItem) {
      if (styleItem.type === 'color') { 
        colorValue = styleItem.value; 
        effect = 'none'; 
      }
      else if (styleItem.type === 'gradient') { 
        colorValue = styleItem.value; 
        effect = 'gradient'; 
      }
      else if (styleItem.type === 'moving-gradient') { 
        colorValue = styleItem.value; 
        effect = 'moving-gradient'; 
      }
      else if (styleItem.type === 'special-effect') {
        effect = styleItem.value;
      }
    }
    
    // Apply text shadow for special effects
    if (effect === 'nebula') {
      style.textShadow = '0 0 20px rgba(138, 43, 226, 0.8), 0 0 40px rgba(75, 0, 130, 0.6)';
    } else if (effect === 'glitch') {
      style.textShadow = '1px 0 #00ff00, -1px 0 #ff00ff';
    }
    
    if (effect === 'none' || effect === 'nebula' || effect === 'glitch') {
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

  const handleEquip = async () => {
    if (!user || !selectedItem) return;
    
    setIsEquipping(true);
    try {
      const styleToEquip: any = {};
      
      if (selectedItem.type === 'font') {
        styleToEquip.nameFont = selectedItem.value;
      } else if (selectedItem.type === 'color') {
        styleToEquip.nameColor = selectedItem.value;
        styleToEquip.nameEffect = 'none';
      } else if (selectedItem.type === 'gradient') {
        styleToEquip.nameColor = selectedItem.value;
        styleToEquip.nameEffect = 'gradient';
      } else if (selectedItem.type === 'moving-gradient') {
        styleToEquip.nameColor = selectedItem.value;
        styleToEquip.nameEffect = 'moving-gradient';
      } else if (selectedItem.type === 'special-effect') {
        styleToEquip.nameEffect = selectedItem.value;
      }
      
      await equipStyle(user.uid, selectedItem);
      
      toast.success('Style equipped! Refreshing posts...');
      
      // Force refresh by reloading data
      await loadUserData();
      
      // Force page refresh for posts
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      setSelectedItem(null);
      
    } catch (error) {
      console.error('Error equipping style:', error);
      toast.error('Failed to equip style');
    } finally {
      setIsEquipping(false);
    }
  };

  const handleReset = async () => {
    if (!user) return;
    setIsEquipping(true);
    try {
      await resetToDefaultStyle(user.uid);
      setEquippedStyle(DEFAULT_NAME_STYLE);
      setSelectedItem(null);
      toast.success('Reset to default style!');
    } catch (error) {
      console.error('Error resetting style:', error);
      toast.error('Failed to reset style');
    } finally {
      setIsEquipping(false);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout>
        <PageTransition>
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-56 rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          </div>
        </PageTransition>
      </AppLayout>
    );
  }

  const previewStyle = getStylePreview();

  const allColorItems = [
    ...(purchasedItems?.colors?.map(v => SHOP_ITEMS.colors.find(c => c.value === v)).filter(Boolean) || []),
    ...(purchasedItems?.gradients?.map(v => SHOP_ITEMS.gradients.find(g => g.value === v)).filter(Boolean) || []),
    ...(purchasedItems?.movingGradients?.map(v => SHOP_ITEMS.movingGradients.find(mg => mg.value === v)).filter(Boolean) || []),
  ];

  // Get purchased special effects
  const purchasedEffects = (purchasedItems?.effects || [])
    .map(effectValue => SPECIAL_EFFECTS.find(e => e.value === effectValue))
    .filter(Boolean) as any[];

  return (
    <AppLayout>
      <PageTransition>
        <AmbientOrbs />
        <div className="relative z-10 container mx-auto p-4 md:p-6 space-y-6">

          {/* ─── Hero Header ───────────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 md:p-8">
            {/* subtle background grid */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,153,10,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,153,10,1) 1px, transparent 1px)`,
                backgroundSize: '32px 32px',
              }}
            />
            {/* decorative corner orb */}
            <motion.div
              className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-[0.07]"
              style={{ background: 'radial-gradient(circle, #ff990a 0%, transparent 70%)' }}
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              {/* left: icon + title + description */}
              <div className="flex items-start gap-4">
                {/* icon badge */}
                <div className="relative shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff990a] to-[#ffa600] flex items-center justify-center shadow-lg shadow-orange-200/40 dark:shadow-orange-900/30">
                  <Crown className="h-7 w-7 text-white" />
                  {/* subtle pulsing ring */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-[#ff990a]"
                    animate={{ opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>

                <div>
                  {/* main heading */}
                  <h1 className="text-3xl md:text-4xl font-bold text-[#ff990a]">
                    Style Manager
                  </h1>
                  {/* description */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-md">
                    Equip and manage the colors, gradients, fonts, and effects you've purchased — and see exactly how your name looks to others.
                  </p>
                </div>
              </div>

              {/* right: action buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isEquipping}
                  className="flex-1 sm:flex-none flex items-center gap-2 rounded-xl border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#ff990a] hover:text-[#ff990a] transition-colors"
                >
                  <RotateCcw className={`h-4 w-4 ${isEquipping ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Reset to Default</span>
                  <span className="sm:hidden">Reset</span>
                </Button>
                <Link href="/shop">
                  <Button variant="outline" className="flex items-center gap-2 rounded-xl border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#ff990a] hover:text-[#ff990a] transition-colors">
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Buy More</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <Separator className="dark:border-gray-700" />

          {/* ─── Live Preview ──────────────────────────────────────────────── */}
          <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white text-base">
                Live Preview
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400 text-xs">
                This is how your name will appear to others
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Dark preview stage */}
              <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-950 dark:bg-gray-800 p-8 text-center">
                {/* grid overlay */}
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage: `linear-gradient(rgba(255,153,10,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,153,10,1) 1px, transparent 1px)`,
                    backgroundSize: '28px 28px',
                  }}
                />
                
                {/* Special Effects Overlay */}
                {equippedStyle.effect === 'nebula' && (
                  <>
                    {/* Nebula particles */}
                    {[...Array(15)].map((_, i) => (
                      <motion.div
                        key={`nebula-${i}`}
                        animate={{
                          x: [0, (Math.random() - 0.5) * 40],
                          y: [0, -Math.random() * 40 - 20],
                          opacity: [0, 0.7, 0],
                        }}
                        transition={{
                          duration: Math.random() * 4 + 2,
                          repeat: Infinity,
                          delay: Math.random() * 3,
                        }}
                        className="absolute rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          width: `${Math.random() * 6 + 2}px`,
                          height: `${Math.random() * 6 + 2}px`,
                          background: `radial-gradient(circle, rgba(147,112,219,0.8) 0%, transparent 70%)`,
                          filter: 'blur(1px)',
                        }}
                      />
                    ))}
                  </>
                )}
                
                {equippedStyle.effect === 'glitch' && (
                  <>
                    {/* Glitch scan lines */}
                    <motion.div
                      className="absolute inset-0"
                      animate={{
                        opacity: [0, 0.2, 0],
                      }}
                      transition={{
                        duration: 0.3,
                        repeat: Infinity,
                        repeatDelay: 3,
                      }}
                      style={{
                        background: 'linear-gradient(to bottom, transparent 50%, rgba(0, 255, 0, 0.1) 50%)',
                        backgroundSize: '100% 4px',
                      }}
                    />
                    {/* Digital noise */}
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={`noise-${i}`}
                        animate={{
                          opacity: [0, Math.random(), 0],
                        }}
                        transition={{
                          duration: Math.random() * 0.5 + 0.1,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                        }}
                        className="absolute"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          width: '2px',
                          height: '2px',
                          background: Math.random() > 0.5 ? '#00ff00' : '#ff00ff',
                        }}
                      />
                    ))}
                  </>
                )}

                <div className="relative">
                  <motion.h1
                    className="text-4xl sm:text-5xl font-bold"
                    style={previewStyle}
                    key={`name-${selectedItem?.value || 'none'}-${equippedStyle.color}-${equippedStyle.font}`}
                    initial={{ scale: 0.92, opacity: 0.5 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                    }}
                    transition={{ 
                      duration: 0.38, 
                      ease: [0.34, 1.56, 0.64, 1],
                    }}
                  >
                    {userProfile?.name || 'Your Name'}
                  </motion.h1>
                </div>

                {/* style meta pills */}
                <div className="relative mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    { label: 'Font', value: equippedStyle.font.split(',')[0] },
                    { label: 'Effect', value: equippedStyle.effect === 'none' ? 'None' : equippedStyle.effect === 'nebula' ? 'Nebula Swirl' : equippedStyle.effect === 'glitch' ? 'Digital Glitch' : equippedStyle.effect.replace('-', ' ') },
                  ].map(pill => (
                    <span key={pill.label} className="inline-flex items-center gap-1.5 bg-gray-800 dark:bg-gray-700 border border-gray-700 dark:border-gray-600 text-gray-300 text-xs px-3 py-1 rounded-full">
                      <span className="text-[#ff990a] font-semibold">{pill.label}:</span> {pill.value}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selected item equip bar */}
              <AnimatePresence>
                {selectedItem && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.97 }}
                    transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                    className="mt-4 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 border border-green-200 dark:border-green-800/40 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Selected: {selectedItem.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Click "Equip" to apply</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                      <Button
                        onClick={handleEquip}
                        disabled={isEquipping}
                        className="rounded-xl bg-gradient-to-r from-[#ff990a] to-[#ffa600] text-white font-semibold shadow-md shadow-orange-200/40 dark:shadow-orange-900/30 text-sm px-4 py-1.5 h-auto"
                      >
                        {isEquipping ? (
                          <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-1.5" /> Equipping…</>
                        ) : 'Equip Style'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* ─── Three-column item lists ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Fonts */}
            <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white text-base">
                  <Type className="h-5 w-5 text-blue-500" /> Purchased Fonts
                </CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400 text-xs">
                  {(!purchasedItems.fonts || purchasedItems.fonts.length === 0) ? (
                    <span>No fonts yet. <Link href="/shop" className="text-[#ff990a] hover:underline">Visit shop →</Link></span>
                  ) : 'Select a font to equip'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {/* Default */}
                  <EquipItemRow
                    index={0}
                    isEquipped={isItemEquipped(userProfile, { type: 'font', value: 'PT Sans, sans-serif' })}
                    isSelected={selectedItem?.value === 'PT Sans, sans-serif' && selectedItem?.type === 'font'}
                    onSelect={() => setSelectedItem({ type: 'font', name: 'PT Sans (Default)', value: 'PT Sans, sans-serif' })}
                    icon={
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200" style={{ fontFamily: 'PT Sans, sans-serif' }}>Aa</span>
                    }
                    title="PT Sans (Default)"
                    subtitle={<span style={{ fontFamily: 'PT Sans, sans-serif' }}>The quick brown fox…</span>}
                  />
                  {/* Purchased */}
                  {purchasedItems?.fonts?.map((fontValue, i) => {
                    const fontItem = SHOP_ITEMS.fonts.find(f => f.value === fontValue);
                    if (!fontItem) return null;
                    return (
                      <EquipItemRow
                        key={fontValue}
                        index={i + 1}
                        isEquipped={isItemEquipped(userProfile, fontItem)}
                        isSelected={selectedItem?.value === fontValue && selectedItem?.type === 'font'}
                        onSelect={() => setSelectedItem(fontItem)}
                        icon={
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200" style={{ fontFamily: fontValue }}>Aa</span>
                        }
                        title={fontItem.name}
                        subtitle={<span style={{ fontFamily: fontValue }}>The quick brown fox…</span>}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Colors & Effects */}
            <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white text-base">
                  <Palette className="h-5 w-5 text-purple-500" /> Colors & Effects
                </CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400 text-xs">
                  Select a color, gradient, or effect to equip
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {/* Default orange */}
                  <EquipItemRow
                    index={0}
                    isEquipped={isItemEquipped(userProfile, { type: 'color', value: '#ff990a' })}
                    isSelected={selectedItem?.value === '#ff990a' && selectedItem?.type === 'color'}
                    onSelect={() => setSelectedItem({ type: 'color', name: 'Orange (Default)', value: '#ff990a' })}
                    icon={<div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600" style={{ background: '#ff990a' }} />}
                    title="Orange (Default)"
                    subtitle="Solid color"
                  />
                  {/* Purchased colors / gradients / moving */}
                  {allColorItems.map((colorItem, i) => {
                    const isMoving = colorItem.type === 'moving-gradient';
                    const isGrad = colorItem.type === 'gradient';
                    return (
                      <EquipItemRow
                        key={`${colorItem.type}-${colorItem.value}`}
                        index={i + 1}
                        isEquipped={isItemEquipped(userProfile, colorItem)}
                        isSelected={selectedItem?.value === colorItem.value && selectedItem?.type === colorItem.type}
                        onSelect={() => setSelectedItem(colorItem)}
                        icon={
                          <div
                            className={`w-6 h-6 rounded-md border border-gray-300 dark:border-gray-600 ${isGrad || isMoving ? '' : 'rounded-full'}`}
                            style={{
                              background: colorItem.value,
                              animation: isMoving ? 'gradientMove 3s ease infinite' : 'none',
                              backgroundSize: isMoving ? '200% 200%' : undefined,
                            }}
                          />
                        }
                        title={colorItem.name}
                        subtitle={
                          isMoving
                            ? <span className="flex items-center gap-0.5 text-[#ff990a]"><Sparkles className="h-3 w-3 animate-pulse" /> Animated gradient</span>
                            : isGrad
                              ? <span className="flex items-center gap-0.5 text-purple-500"><Sparkles className="h-3 w-3" /> Gradient</span>
                              : 'Solid color'
                        }
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Special Effects */}
            <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white text-base">
                  <Sparkles className="h-5 w-5 text-[#ff990a]" /> Special Effects
                </CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400 text-xs">
                  {purchasedEffects.length === 0 ? (
                    <span>No effects yet. <Link href="/shop" className="text-[#ff990a] hover:underline">Visit shop →</Link></span>
                  ) : 'Select an effect to equip'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {/* Default - No Effect */}
                  <EquipItemRow
                    index={0}
                    isEquipped={equippedStyle.effect === 'none'}
                    isSelected={selectedItem?.value === 'none' && selectedItem?.type === 'special-effect'}
                    onSelect={() => setSelectedItem({ 
                      type: 'special-effect', 
                      name: 'No Effect (Default)', 
                      value: 'none' 
                    })}
                    icon={<div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700" />}
                    title="No Effect (Default)"
                    subtitle="Plain text appearance"
                  />
                  
                  {/* Purchased Effects */}
                  {purchasedEffects.map((effectItem, i) => (
                    <EquipItemRow
                      key={effectItem.value}
                      index={i + 1}
                      isEquipped={isItemEquipped(userProfile, effectItem)}
                      isSelected={selectedItem?.value === effectItem.value && selectedItem?.type === 'special-effect'}
                      onSelect={() => setSelectedItem(effectItem)}
                      icon={
                        <div className="w-6 h-6 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center" 
                          style={{
                            background: effectItem.value === 'nebula' 
                              ? 'linear-gradient(135deg, #4b0082, #8a2be2, #9370db)'
                              : 'linear-gradient(135deg, #001100, #003300, #005500)'
                          }}
                        >
                          {effectItem.value === 'nebula' ? (
                            <Cloud className="h-3.5 w-3.5 text-white" />
                          ) : (
                            <Cpu className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>
                      }
                      title={effectItem.name}
                      subtitle={
                        effectItem.value === 'nebula'
                          ? <span className="flex items-center gap-0.5 text-purple-500"><Cloud className="h-3 w-3" /> Cosmic effect</span>
                          : <span className="flex items-center gap-0.5 text-green-500"><Cpu className="h-3 w-3" /> Digital glitch</span>
                      }
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Shop Link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <Link href="/shop">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto border-[#ff990a] text-[#ff990a] hover:bg-[#ff990a] hover:text-white transition-colors"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Need more styles? Visit the shop
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </PageTransition>

      <style jsx global>{`
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        
        @keyframes nebulaPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        
        @keyframes glitch {
          0% {
            clip-path: inset(40% 0 61% 0);
            transform: translate(-2px, 2px);
          }
          5% {
            clip-path: inset(92% 0 1% 0);
            transform: translate(2px, -2px);
          }
          10% {
            clip-path: inset(43% 0 1% 0);
            transform: translate(0px, -1px);
          }
          15% {
            clip-path: inset(25% 0 58% 0);
            transform: translate(-2px, 0px);
          }
          20% {
            clip-path: inset(54% 0 7% 0);
            transform: translate(1px, 2px);
          }
          45% {
            clip-path: inset(58% 0 43% 0);
            transform: translate(0px, -2px);
          }
          50% {
            clip-path: inset(98% 0 1% 0);
            transform: translate(-1px, 1px);
          }
          55% {
            clip-path: inset(75% 0 9% 0);
            transform: translate(2px, 0px);
          }
          60% {
            clip-path: inset(83% 0 7% 0);
            transform: translate(-1px, 2px);
          }
          75% {
            clip-path: inset(68% 0 14% 0);
            transform: translate(1px, -1px);
          }
          80% {
            clip-path: inset(21% 0 18% 0);
            transform: translate(-2px, 0px);
          }
          85% {
            clip-path: inset(45% 0 33% 0);
            transform: translate(0px, 1px);
          }
          90% {
            clip-path: inset(73% 0 9% 0);
            transform: translate(2px, -2px);
          }
          95% {
            clip-path: inset(91% 0 6% 0);
            transform: translate(-1px, 2px);
          }
          100% {
            clip-path: inset(0);
            transform: translate(0);
          }
        }
      `}</style>
    </AppLayout>
  );
}

// ─── Reusable equip row ──────────────────────────────────────────────────────
function EquipItemRow({
  index, isEquipped, isSelected, onSelect, icon, title, subtitle,
}: {
  index: number;
  isEquipped: boolean;
  isSelected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
}) {
  return (
    <StaggerItem index={index}>
      <motion.div
        whileHover={{ x: 3 }}
        transition={{ duration: 0.18 }}
        onClick={onSelect}
        className={[
          'flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer',
          isSelected
            ? 'border-[#ff990a] bg-orange-50 dark:bg-orange-950/30 ring-1 ring-[#ff990a]/30'
            : isEquipped
              ? 'border-[#ff990a]/40 bg-orange-50/60 dark:bg-orange-950/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-700">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="shrink-0">
          <AnimatePresence mode="wait">
            {isEquipped ? (
              <motion.div key="equipped" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.22 }}>
                <Badge className="bg-[#ff990a] text-white text-xs flex items-center gap-1">
                  <Check className="h-3 w-3" /> Equipped
                </Badge>
              </motion.div>
            ) : isSelected ? (
              <motion.div key="selected" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.22 }}>
                <Badge className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs">Selected</Badge>
              </motion.div>
            ) : (
              <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                <span className="text-xs text-gray-400 dark:text-gray-500 hover:text-[#ff990a] transition-colors">Select →</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </StaggerItem>
  );
}