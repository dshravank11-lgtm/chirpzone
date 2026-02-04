
'use client';

import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

const achievements = [
  { name: 'First Post', description: 'You made your first post!' },
  { name: 'Serial Liker', description: 'You liked 10 posts in a row!' },
  { name: 'Chatterbox', description: 'You sent 100 messages!' },
  { name: 'Social Butterfly', description: 'You made 5 friends!' },
];

export default function AchievementsPage() {
  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Achievements</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {achievements.map((achievement, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{achievement.name}</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{achievement.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
