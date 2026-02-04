
'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ShopItem } from '@/config/shop-config';

export function ShopItemCard({ 
  item, 
  isSelected, 
  onSelect, 
  chirpScore,
  currentFont 
}: { 
  item: ShopItem;
  isSelected: boolean;
  onSelect: (item: ShopItem) => void;
  chirpScore: number;
  currentFont?: string;
}) {
  const canAfford = chirpScore >= item.price;
  const isOwned = currentFont === item.value;

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Card
        className={`cursor-pointer transition-all hover:border-orange-300 dark:hover:border-orange-700 ${
          isSelected ? 'ring-2 ring-orange-500 border-orange-500' : ''
        } ${isOwned ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={isOwned ? undefined : () => onSelect(item)}
      >
        <CardContent className="p-4">
          {item.type === 'font' ? (
            <div className="space-y-3">
              <div className="h-8 flex items-center">
                <h3 
                  className="text-xl font-bold"
                  style={{ fontFamily: item.value }}
                >
                  Aa
                </h3>
              </div>
              <div className="text-center">
                <h4 className="font-medium">{item.name}</h4>
                <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: item.value }}>
                  The quick brown fox
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div 
                className="h-12 rounded-md transition-all"
                style={{ 
                  background: item.value,
                  animation: item.type === 'moving-gradient' ? 'gradientMove 3s ease infinite' : 'none'
                }}
              />
              <div className="text-center">
                <h4 className="font-medium">{item.name}</h4>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-3">
            <Badge 
              variant={canAfford ? "default" : "destructive"}
              className={`${canAfford ? 'bg-gradient-to-r from-orange-500 to-orange-600' : ''}`}
            >
              {item.price} ChirpScore
            </Badge>
            {isOwned && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Owned
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
