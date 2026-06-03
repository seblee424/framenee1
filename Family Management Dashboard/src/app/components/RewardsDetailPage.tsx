import { Trophy, Home, Award, TrendingUp, Star, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';

interface RewardsDetailPageProps {
  onClose: () => void;
}

export function RewardsDetailPage({ onClose }: RewardsDetailPageProps) {
  const { familyMembers, rewards } = useAppContext();

  const sortedMembers = [...familyMembers].sort((a, b) => b.points - a.points);
  const totalFamilyPoints = familyMembers.reduce((sum, member) => sum + member.points, 0);
  const topPerformer = sortedMembers[0];

  const getLevelProgress = (member: typeof familyMembers[0]) => {
    const pointsForNextLevel = member.level * 50;
    const currentLevelPoints = member.points % 50;
    return (currentLevelPoints / 50) * 100;
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            <h2 className="text-2xl">Family Rewards</h2>
          </div>
          <div className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg flex items-center gap-2">
            <Award className="w-5 h-5" />
            <span>Total Family Points: {totalFamilyPoints}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* Leaderboard */}
          <div className="col-span-2 space-y-6">
            {/* Top Performer Highlight */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-6xl"
                >
                  {topPerformer.avatar}
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-6 h-6" />
                    <span className="text-lg opacity-90">Top Performer</span>
                  </div>
                  <h3 className="text-3xl mb-2">{topPerformer.name}</h3>
                  <div className="flex items-center gap-4 text-sm opacity-90">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" />
                      {topPerformer.points} points
                    </span>
                    <span>•</span>
                    <span>Level {topPerformer.level}</span>
                    <span>•</span>
                    <span>{topPerformer.tasksCompleted} tasks done</span>
                  </div>
                </div>
                <div className="text-6xl">🏆</div>
              </div>
            </motion.div>

            {/* Full Leaderboard */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <h3 className="mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <span>Family Leaderboard</span>
              </h3>
              <div className="space-y-3">
                {sortedMembers.map((member, index) => {
                  const progress = getLevelProgress(member);
                  const isTopThree = index < 3;

                  return (
                    <motion.div
                      key={member.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`
                        p-4 rounded-xl border-2 transition-all
                        ${index === 0 ? 'bg-amber-50 border-amber-300' : ''}
                        ${index === 1 ? 'bg-slate-50 border-slate-300' : ''}
                        ${index === 2 ? 'bg-orange-50 border-orange-300' : ''}
                        ${index > 2 ? 'bg-white border-border' : ''}
                      `}
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-sm
                          ${index === 0 ? 'bg-amber-500 text-white' : ''}
                          ${index === 1 ? 'bg-slate-400 text-white' : ''}
                          ${index === 2 ? 'bg-orange-500 text-white' : ''}
                          ${index > 2 ? 'bg-muted text-foreground' : ''}
                        `}>
                          {index + 1}
                        </div>
                        <div className="text-4xl">{member.avatar}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{member.name}</span>
                              {isTopThree && (
                                <span className="text-xl">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-amber-600">
                              <Star className="w-4 h-4 fill-current" />
                              <span>{member.points}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Level {member.level}</span>
                            <span>•</span>
                            <span>{member.tasksCompleted} tasks</span>
                          </div>
                        </div>
                      </div>
                      {/* Level Progress Bar */}
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                          className={`h-full ${
                            index === 0 ? 'bg-amber-500' :
                            index === 1 ? 'bg-slate-400' :
                            index === 2 ? 'bg-orange-500' :
                            'bg-primary'
                          }`}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Available Rewards */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <h3 className="mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Available Rewards</span>
            </h3>
            <div className="space-y-3">
              {rewards.map((reward, index) => (
                <motion.div
                  key={reward.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  className={`
                    p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${reward.claimed ? 'bg-muted border-muted opacity-60' : 'bg-white border-amber-200 hover:border-amber-400'}
                  `}
                >
                  <div className="text-4xl mb-2 text-center">{reward.icon}</div>
                  <div className="text-sm mb-1 text-center">{reward.title}</div>
                  <div className="text-xs text-muted-foreground mb-2 text-center">
                    {reward.description}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-amber-600">
                    <Award className="w-4 h-4" />
                    <span className="text-sm">{reward.points} pts</span>
                  </div>
                  {reward.claimed && (
                    <div className="mt-2 text-center text-xs text-green-600">
                      ✓ Claimed
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-900 mb-2">💡 How it works</div>
              <div className="text-xs text-blue-700">
                Complete tasks to earn points. Use points to claim awesome rewards!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 shadow-lg"
        >
          <Home className="w-6 h-6" />
          <span>Back to Home</span>
        </motion.button>
      </div>
    </div>
  );
}
