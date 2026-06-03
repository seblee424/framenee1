import { useState } from 'react';
import { Award, Star, Trophy, TrendingUp } from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  points: number;
  level: number;
  tasksCompleted: number;
}

interface Reward {
  id: string;
  title: string;
  points: number;
  icon: string;
}

export function FamilyRewardModule() {
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Emma', avatar: '👧', points: 145, level: 3, tasksCompleted: 24 },
    { id: '2', name: 'Jake', avatar: '👦', points: 128, level: 2, tasksCompleted: 19 },
    { id: '3', name: 'Mom', avatar: '👩', points: 95, level: 2, tasksCompleted: 15 },
    { id: '4', name: 'Dad', avatar: '👨', points: 87, level: 2, tasksCompleted: 13 },
  ]);

  const rewards: Reward[] = [
    { id: '1', title: 'Extra Screen Time', points: 50, icon: '📱' },
    { id: '2', title: 'Choose Dinner', points: 75, icon: '🍕' },
    { id: '3', title: 'Ice Cream Trip', points: 100, icon: '🍦' },
    { id: '4', title: 'Movie Night Pick', points: 125, icon: '🎬' },
  ];

  const topMember = members.reduce((prev, current) =>
    prev.points > current.points ? prev : current
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          <h2 className="text-2xl">Family Rewards</h2>
        </div>
      </div>

      <div className="mb-6 p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl">
        <div className="flex items-center gap-4">
          <div className="text-6xl">{topMember.avatar}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5" />
              <span className="text-sm opacity-90">Top Performer</span>
            </div>
            <h3 className="text-2xl mb-1">{topMember.name}</h3>
            <div className="flex items-center gap-4 text-sm opacity-90">
              <span>{topMember.points} points</span>
              <span>•</span>
              <span>Level {topMember.level}</span>
              <span>•</span>
              <span>{topMember.tasksCompleted} tasks done</span>
            </div>
          </div>
        </div>
      </div>

      <h3 className="mb-4">Leaderboard</h3>
      <div className="space-y-2 mb-6">
        {members.map((member, index) => {
          const progress = (member.points % 50) / 50 * 100;

          return (
            <div key={member.id} className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full">
                  {index + 1}
                </div>
                <div className="text-3xl">{member.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span>{member.name}</span>
                    <div className="flex items-center gap-1 text-primary">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{member.points}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Level {member.level}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{member.tasksCompleted} tasks</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="mb-4">Available Rewards</h3>
      <div className="grid grid-cols-2 gap-3">
        {rewards.map(reward => (
          <div
            key={reward.id}
            className="p-4 bg-accent rounded-lg hover:bg-accent/70 transition-colors cursor-pointer"
          >
            <div className="text-4xl mb-2">{reward.icon}</div>
            <div className="text-sm mb-1">{reward.title}</div>
            <div className="flex items-center gap-1 text-primary text-sm">
              <Award className="w-4 h-4" />
              <span>{reward.points} pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
