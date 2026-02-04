 'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Tab {
  value: string;
  label: string;
}

interface FilterTabBarProps {
  onTabChange: (value: string) => void;
  defaultValue: string;
  tabs: Tab[];
}

export function FilterTabBar({ onTabChange, defaultValue, tabs }: FilterTabBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultValue);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onTabChange(value);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="bg-background/80 backdrop-blur-sm border">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary text-primary-foreground rounded-full p-4 shadow-lg flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={isOpen ? 'x' : 'filter'}
            initial={{ rotate: 45, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -45, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? <X size={24} /> : <Filter size={24} />}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
