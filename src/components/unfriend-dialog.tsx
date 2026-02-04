'use client';

import { useState } from 'react';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';

export const UnfriendDialog = ({ onUnfriend, friendName }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleUnfriend = async () => {
        await onUnfriend();
        setIsOpen(false);
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">Unfriend</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to unfriend {friendName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. You will have to send a new friend request to reconnect.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleUnfriend}
                        className={buttonVariants({ variant: "destructive" })}
                    >
                        Unfriend
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
