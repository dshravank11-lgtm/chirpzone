'use client';

import { useState, useEffect } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getMutualFriends } from '@/services/firebase';
import { useAuth } from '@/hooks/use-auth';

interface AddGroupMemberDialogProps {
    onAddMembers: (memberIds: string[]) => void;
    currentMembers: string[];
}

export const AddGroupMemberDialog = ({ onAddMembers, currentMembers }: AddGroupMemberDialogProps) => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            loadUsers();
        }
    }, [open, currentMembers]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            // Only fetches users who are mutual friends with all group members
            const availableUsers = await getMutualFriends(currentMembers);
            setUsers(availableUsers);
        } catch (error) {
            console.error("Error loading mutual friends:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleAdd = () => {
        onAddMembers(selectedUsers);
        setOpen(false);
        setSelectedUsers([]);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-[#ffa600] hover:bg-[#ff8c00] text-black font-semibold gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Add New Members
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Members</DialogTitle>
                    <p className="text-xs text-muted-foreground">
                        Showing users who are mutual friends with all current members.
                    </p>
                </DialogHeader>

                <div className="relative my-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search mutual friends..." 
                        className="pl-9 focus-visible:ring-[#ffa600]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2 mt-2">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-[#ffa600]" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8 text-sm">
                            No mutual friends found.
                        </p>
                    ) : (
                        filteredUsers.map((u) => (
                            <div 
                                key={u.uid} 
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                                onClick={() => toggleUser(u.uid)}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border border-border/50">
                                        <AvatarImage src={u.avatarUrl} />
                                        <AvatarFallback>{u.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">{u.name}</p>
                                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                                    </div>
                                </div>
                                <Checkbox 
                                    checked={selectedUsers.includes(u.uid)} 
                                    onCheckedChange={() => toggleUser(u.uid)}
                                    className="data-[state=checked]:bg-[#ffa600] data-[state=checked]:border-[#ffa600]"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAdd}
                        disabled={selectedUsers.length === 0}
                        className="bg-[#ffa600] hover:bg-[#ff8c00] text-black"
                    >
                        Add {selectedUsers.length} {selectedUsers.length === 1 ? 'Member' : 'Members'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};