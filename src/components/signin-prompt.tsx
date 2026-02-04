'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

interface SignInPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInPrompt({ open, onOpenChange }: SignInPromptProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Join the Conversation</DialogTitle>
          <DialogDescription className="text-center text-gray-500">
            Sign in to like, comment, and share posts.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col space-y-4">
          <Button variant="outline" onClick={() => { /* Handle Google Sign-In */ }}>
            <Icons.google className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
          <Button onClick={() => { /* Handle Email/Password Sign-In */ }}>
            Sign in with Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
