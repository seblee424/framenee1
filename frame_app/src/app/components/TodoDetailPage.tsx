import { ListTodo, Home, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';

interface TodoDetailPageProps {
  onClose: () => void;
}

export function TodoDetailPage({ onClose }: TodoDetailPageProps) {
  const { tasks, toggleTaskCompletion, deleteTask, familyMembers } = useAppContext();

  const tasksByDate = tasks.reduce((acc, task) => {
    const date = task.dueDate;
    if (!acc[date]) acc[date] = [];
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

  const getDateLabel = (date: string) => {
    switch (date) {
      case 'Today': return '今天';
      case 'Tomorrow': return '明天';
      default: return date;
    }
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
      {/* 顶部标题 */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListTodo className="w-8 h-8 text-green-500" />
            <h2 className="text-2xl">待办事项</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg">
              {completedCount} / {tasks.length} 已完成
            </div>
            <div className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg flex items-center gap-2">
              <Award className="w-5 h-5" />
              <span>获得 {totalPoints} 分</span>
            </div>
          </div>
        </div>
      </div>

      {/* 待办列表 */}
      <div className="flex-1 p-6 overflow-auto">
        {sortedDates.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            暂无待办事项
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date}>
                <h3 className="text-lg mb-4">{getDateLabel(date)}</h3>
                <div className="space-y-3">
                  {tasksByDate[date].map(task => (
                    <motion.div
                      key={task.id}
                      layout
                      className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTaskCompletion(task.id)}
                          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors ${
                            task.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-500'
                          } flex items-center justify-center`}
                        >
                          {task.completed && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              ✓
                            </motion.span>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className={`text-sm mb-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.text}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>👤 {task.assignee}</span>
                            <span className={`px-1.5 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'}
                            </span>
                            <span>{task.points} 分</span>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors text-muted-foreground hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 shadow-lg"
        >
          <Home className="w-6 h-6" />
          <span>返回首页</span>
        </motion.button>
      </div>
    </div>
  );
}
