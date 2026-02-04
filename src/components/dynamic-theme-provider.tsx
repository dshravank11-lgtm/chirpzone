
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect } from 'react';

const hexToHsl = (hex: string) => {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length == 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }

    r /= 255, g /= 255, b /= 255;
    const cmin = Math.min(r,g,b),
          cmax = Math.max(r,g,b),
          delta = cmax - cmin;
    let h = 0, s = 0, l = 0;

    if (delta == 0) h = 0;
    else if (cmax == r) h = ((g - b) / delta) % 6;
    else if (cmax == g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return `${h} ${s}% ${l}%`;
}


export function DynamicThemeProvider({ children }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.themeColor) {
      const hslColor = hexToHsl(user.themeColor);
      document.documentElement.style.setProperty('--primary', hslColor);
    }
  }, [user]);

  return <>{children}</>;
}
