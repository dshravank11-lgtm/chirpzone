
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  vx: number;
  vy: number;
  vr: number;
}

const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];

export const Confetti = ({ count = 150 }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const createParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        rotation: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.random() * 4 - 2,
        vy: Math.random() * 5 + 5,
        vr: Math.random() * 10 - 5,
      });
    }
    setParticles(newParticles);
  }, [count]);

  useEffect(() => {
    createParticles();
  }, [createParticles]);

  useEffect(() => {
    if (particles.length === 0) return;

    let animationFrameId: number;

    const update = () => {
      setParticles(prevParticles => {
        const updatedParticles = prevParticles.map(p => {
          let newY = p.y + p.vy;
          let newX = p.x + p.vx;
          
          if (newY > 120) {
            return null; // Mark for removal
          }
          
          return {
            ...p,
            y: newY,
            x: newX,
            rotation: p.rotation + p.vr,
          };
        }).filter(Boolean) as Particle[];

        if (updatedParticles.length > 0) {
            animationFrameId = requestAnimationFrame(update);
        }

        return updatedParticles;
      });
    };

    animationFrameId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationFrameId);
  }, [particles.length > 0]); // Re-trigger effect if particles are re-created

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-50">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-2 h-4"
          style={{
            backgroundColor: p.color,
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            transition: 'top 50ms linear, left 50ms linear',
          }}
        />
      ))}
    </div>
  );
};
