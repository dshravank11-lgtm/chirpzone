
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type Achievement } from "@/config/achievements";
import { Trophy } from "lucide-react";

export const AchievementCard = ({ title, description, icon: Icon }: Achievement) => (
    <Card className="flex items-center p-4 space-x-4">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Trophy className="w-8 h-8 text-yellow-500" />
    </Card>
);
