// config/shop-config.ts
export const SHOP_ITEMS = {
  colors: [
    { name: 'Orange', value: '#ff990a', price: 0, type: 'color', isDefault: true },
    { name: 'Red', value: '#ef4444', price: 15, type: 'color' },
    { name: 'Blue', value: '#3b82f6', price: 15, type: 'color' },
    { name: 'Green', value: '#10b981', price: 15, type: 'color' },
    { name: 'Purple', value: '#8b5cf6', price: 15, type: 'color' },
    { name: 'Pink', value: '#ec4899', price: 15, type: 'color' },
    { name: 'Teal', value: '#14b8a6', price: 15, type: 'color' },
    { name: 'Yellow', value: '#eab308', price: 15, type: 'color' },
  ],
  
  gradients: [
    { 
      name: 'Sunset', 
      value: 'linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcf7f)', 
      price: 30, 
      type: 'gradient' 
    },
    { 
      name: 'Ocean', 
      value: 'linear-gradient(90deg, #36d1dc, #5b86e5)', 
      price: 30, 
      type: 'gradient' 
    },
    { 
      name: 'Cotton Candy', 
      value: 'linear-gradient(90deg, #f093fb, #f5576c)', 
      price: 30, 
      type: 'gradient' 
    },
    { 
      name: 'Midnight', 
      value: 'linear-gradient(90deg, #0f2027, #203a43, #2c5364)', 
      price: 30, 
      type: 'gradient' 
    },
  ],
  
  movingGradients: [
    { 
      name: 'Rainbow Flow', 
      value: 'linear-gradient(90deg, #ff0000, #ff9900, #ffff00, #00ff00, #0099ff, #6633ff)',
      price: 60,
      type: 'moving-gradient'
    },
    { 
      name: 'Galaxy', 
      value: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)',
      price: 60,
      type: 'moving-gradient'
    },
    { 
      name: 'Neon Pulse', 
      value: 'linear-gradient(90deg, #00d2ff, #3a7bd5, #00d2ff)',
      price: 60,
      type: 'moving-gradient'
    },
  ],
  
  fonts: [
    { name: 'PT Sans', value: 'PT Sans, sans-serif', price: 0, type: 'font', isDefault: true },
    { name: 'Montserrat', value: 'Montserrat, sans-serif', price: 20, type: 'font' },
    { name: 'Playfair Display', value: 'Playfair Display, serif', price: 25, type: 'font' },
    { name: 'Dancing Script', value: 'Dancing Script, cursive', price: 30, type: 'font' },
    { name: 'Roboto Mono', value: 'Roboto Mono, monospace', price: 20, type: 'font' },
    { name: 'Lobster', value: 'Lobster, cursive', price: 35, type: 'font' },
  ],
  effects: [
    { name: 'Swirling Dragon', value: 'swirling-dragon', price: 500, type: 'effect' }
  ]
} as const;

export type ShopItem = typeof SHOP_ITEMS.colors[0] | 
                       typeof SHOP_ITEMS.gradients[0] | 
                       typeof SHOP_ITEMS.movingGradients[0] | 
                       typeof SHOP_ITEMS.fonts[0] |
                       typeof SHOP_ITEMS.effects[0];

export const DEFAULT_NAME_STYLE = {
  color: '#ff990a',
  font: 'PT Sans, sans-serif',
  effect: 'none' as const
};
