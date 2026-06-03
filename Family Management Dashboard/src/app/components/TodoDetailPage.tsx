import { ListTodo, Home, CheckCircle2, Circle, Trash2, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';

interface TodoDetailPageProps {
  onClose: () => void;
}

export function TodoDetailPage({ onClose }: TodoDetailPageProps) {
  const { tasks, toggleTaskCompletion, deleteTask, familyMembers } = useAppContext();

  // Group tasks by date
  const tasksByDate = tasks.reduce((acc, task) => {
    const date = task.dueDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  const dateOrder = ['Today', 'Tomorrow'];
  const sortedDates = Object.keys(tasksByDate).sort((a, b) => {
    const aIndex = dateOrder.indexOf(a);
    const bIndex = dateOrder.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const totalPoints = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.points, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListTodo className="w-8 h-8 text-green-500" />
            <h2 className="text-2xl">Family To-Do List</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg">
              {completedCount} / {tasks.length} Completed
            </div>
            <div className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg flex items-center gap-2">
              <Award className="w-5 h-5" />
              <span>{totalPoints} Points Earned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* Task List */}
          <div className="col-span-2 space-y-6">
            {sortedDates.map(date => (
              <div key={date} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <h3 className="mb-4 flex items-center gap-2">
                  <span>{date}</span>
                  <span className="text-sm text-muted-foreground">
                    ({tasksByDate[date].length} tasks)
                  </span>
                </h3>

                <div className="space-y-3">
                  {tasksByDate[date].map(task => (
                    <motion.div
                      key={task.id}
                      layout
                      className={`
                        p-4 rounded-lg border transition-all
                        ${task.completed ? 'bg-muted border-muted' : 'bg-white border-border hover:border-green-500'}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTaskCompletion(task.id)}
                          className="mt-1 flex-shrink-0 hover:scale-110 transition-transform"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : (
                            <Circle className="w-6 h-6 text-muted-foreground" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className={`mb-2 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.text}
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                              👤 {task.assignee}
                            </span>
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              {task.points} pts
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority} priority
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {sortedDates.length === 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-lg text-center">
                <p className="text-muted-foreground">No tasks scheduled. Add a task to get started!</p>
              </div>
            )}
          </div>

          {/* Family Leaderboard */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <h3 className="mb-4">Family Leaderboard</h3>
            <div className="space-y-3">
              {[...familyMembers]
                .sort((a, b) => b.points - a.points)
                .map((member, index) => (
                  <div
                    key={member.id}
                    className={`
                      p-4 rounded-lg
                      ${index === 0 ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white' : 'bg-muted'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm
                        ${index === 0 ? 'bg-white/20' : 'bg-white'}
                      `}>
                        {index + 1}
                      </div>
                      <div className="text-2xl">{member.avatar}</div>
                      <div className="flex-1">
                        <div className="text-sm">{member.name}</div>
                        <div className={`text-xs ${index === 0 ? 'opacity-90' : 'text-muted-foreground'}`}>
                          {member.points} points
                        </div>
                      </div>
                      {index === 0 && <span className="text-xl">🏆</span>}
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-900 mb-2">💡 Tip</div>
              <div className="text-xs text-blue-700">
                Complete tasks to earn points and climb the leaderboard!
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
