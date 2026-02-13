import React from 'react';
import { cn } from '@/lib/utils';

interface UserNameProps {
  name: string;
  items: any[]; // Replace 'any' with a more specific type for user items
  className?: string;
}

const UserName: React.FC<UserNameProps> = ({ name, items, className }) => {
  const hasSwirlingDragon = items?.includes('swirling-dragon');

  const nameStyle: React.CSSProperties = {
    // Note: The Swirling Dragon effect is primarily CSS-driven
  };

  return (
    <h1 
      className={cn(
        'text-3xl font-bold mb-1',
        hasSwirlingDragon && 'swirling-dragon-effect',
        className
      )}
      style={nameStyle}
    >
      {name}
    </h1>
  );
};

export { UserName };
