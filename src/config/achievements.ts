
import { ShieldCheck, MessageCircle, Users, Heart } from 'lucide-react';

export interface Achievement {
    title: string;
    description: string;
    icon: React.ElementType;
}

export const achievementList: Achievement[] = [
    {
        title: 'First Chirp',
        description: 'Posted your first message on the platform.',
        icon: MessageCircle,
    },
    {
        title: 'Community Helper',
        description: 'Received 10 upvotes on a helpful comment.',
        icon: ShieldCheck,
    },
    {
        title: 'New Friend',
        description: 'Successfully added your first friend.',
        icon: Users,
    },
    {
        title: 'Spreading Love',
        description: 'Your posts have been liked 50 times.',
        icon: Heart,
    },
];
