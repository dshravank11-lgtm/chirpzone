'use client';

import { useState, useEffect } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { AddGroupMemberDialog } from './add-group-member-dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, UserMinus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserProfile } from '@/services/firebase';
import { Skeleton } from '@/components/ui/skeleton';

const getStyledName = (member: any) => {
    if (!member) return {};
    
    const style: React.CSSProperties = {
      fontFamily: member.nameFont || 'PT Sans, sans-serif',
    };
  
    const colorValue = member.nameColor || '#ff990a';
    const effect = member.nameEffect || 'none';
  
    if (effect === 'none') {
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
    } else if (effect === 'nebula') {
      style.color = colorValue;
      style.textShadow = '0 0 20px rgba(181, 124, 247, 0.8), 0 0 40px rgba(75, 0, 130, 0.6)';
    } else if (effect === 'glitch') {
      style.color = colorValue;
      style.textShadow = '1px 0 #00ff00, -1px 0 #ff00ff';
    }
  
    return style;
  };

const MemberSkeleton = () => (
    <div className="rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-24 sm:w-32" />
                    <Skeleton className="h-3 w-20 sm:w-28" />
                </div>
            </div>
        </div>
    </div>
);

export const GroupMembersDialog = ({ members: initialMembers, createdBy, onAddMembers, onRemoveMember }) => {
    const { user } = useAuth();
    const isCreator = user?.uid === createdBy;
    const [open, setOpen] = useState(false);
    const [memberProfiles, setMemberProfiles] = useState(initialMembers);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const memberIds = initialMembers.map(m => m.uid);

        const fetchMemberProfiles = async () => {
            if (!open || memberIds.length === 0) return;
            setLoading(true);
            try {
                const profilePromises = memberIds.map(id => getUserProfile(id));
                const profiles = await Promise.all(profilePromises);
                setMemberProfiles(profiles.filter(Boolean));
            } catch (error) {
                console.error("Failed to fetch fresh member profiles:", error);
                setMemberProfiles(initialMembers);
            } finally {
                setLoading(false);
            }
        };

        fetchMemberProfiles();
    }, [open, initialMembers]);

    const handleRemoveMember = (uid) => {
        onRemoveMember(uid);
        setMemberProfiles(currentProfiles => currentProfiles.filter(p => p.uid !== uid));
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hover:bg-[#ffa600]/10 hover:text-[#ffa600] transition-all h-9 w-9"
                >
                    <Users className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md max-h-[85vh] flex flex-col border-border/50 shadow-xl bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6">
                <DialogHeader className="space-y-2 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#ffa600]/10 border border-[#ffa600]/20">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#ffa600]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-lg sm:text-xl font-bold text-[#ffa600] truncate">
                                Group Members
                            </DialogTitle>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                {memberProfiles.length} {memberProfiles.length === 1 ? 'member' : 'members'}
                            </p>
                        </div>
                    </div>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 py-2">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-3"
                            >
                                <MemberSkeleton />
                                <MemberSkeleton />
                                <MemberSkeleton />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="loaded"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-2.5 sm:gap-3"
                            >
                                {memberProfiles.map((member, index) => (
                                    <motion.div
                                        key={member.uid}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                        layout
                                        className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-3 sm:p-4 hover:shadow-lg hover:shadow-[#ffa600]/10 hover:border-[#ffa600]/30 transition-all duration-300"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#ffa600]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="relative flex items-center justify-between gap-2 sm:gap-3">
                                            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                                                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-background group-hover:ring-[#ffa600]/30 transition-all flex-shrink-0">
                                                    <AvatarImage src={member.avatarUrl} />
                                                    <AvatarFallback className="bg-[#ffa600] text-black font-semibold text-sm sm:text-base">
                                                        {member.name?.substring(0, 1).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                    <p 
  className="font-semibold text-sm sm:text-base truncate"
  style={getStyledName(member)}
>
  {member.name}
</p>
                                                        {member.uid === createdBy && (
                                                            <Badge 
                                                                variant="secondary" 
                                                                className="bg-[#ffa600]/20 text-[#ffa600] border-[#ffa600]/30 flex items-center gap-1 px-1.5 sm:px-2 py-0 h-4 sm:h-5 text-[10px] sm:text-xs flex-shrink-0"
                                                            >
                                                                <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                                                Admin
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                                        @{member.username}
                                                    </p>
                                                </div>
                                            </div>
                                            {isCreator && user.uid !== member.uid && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleRemoveMember(member.uid)}
                                                    className="hover:bg-red-500/10 hover:text-red-500 transition-all flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9"
                                                >
                                                    <UserMinus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {isCreator && (
                    <div className="pt-3 sm:pt-4 border-t border-border/50 mt-2">
                        <AddGroupMemberDialog 
                            onAddMembers={onAddMembers} 
                            currentMembers={memberProfiles.map(m => m.uid)} 
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};