'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      setIsOpen(true);
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  const handleLogin = () => {
    router.push('/login');
    setIsOpen(false);
  };

  const handleGuest = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Welcome to Chirp</DialogTitle>
          <DialogDescription className="text-center text-gray-500">
            Log in to enjoy the full experience or browse as a guest.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col space-y-4">
          <Button onClick={handleLogin}>Log In</Button>
          <Button variant="outline" onClick={handleGuest}>Browse as Guest</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
