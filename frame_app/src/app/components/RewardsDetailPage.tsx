import { useState, useEffect } from 'react';
import { Trophy, Home, Calendar, Clock, ChevronRight, ChevronLeft, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { webEventsApi, type CompletedEvent, type CompletedSummaryItem } from '@/services/frameNe/webEvents';

interface RewardsDetailPageProps {
  onClose: () => void;
}

export function RewardsDetailPage({ onClose }: RewardsDetailPageProps) {
  const [summary, setSummary] = useState<CompletedSummaryItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [records, setRecords] = useState<CompletedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserRecords, setSelectedUserRecords] = useState<CompletedEvent[]>([]);
  const [viewingUser, setViewingUser] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [summaryRes] = await Promise.all([
        webEventsApi.getCompletedSummary(),
      ]);
      setSummary(summaryRes.items);
    } catch (err) {
      console.error('加载完成记录失败', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewUser = async (email: string) => {
    setViewingUser(email);
    try {
      const res = await webEventsApi.getCompletedRecords(email);
      setSelectedUserRecords(res.items);
    } catch (err) {
      console.error('加载用户记录失败', err);
      setSelectedUserRecords([]);
    }
  };

  const totalCompleted = summary.reduce((sum, s) => sum + parseInt(s.total_completed), 0);

  // 用户首字母头像颜色
  const getAvatarColor = (email: string) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getUserName = (email: string) => {
    return email.split('@')[0] || email;
  };

  if (viewingUser) {
    return (
      <div className="size-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
        {/* 顶部标题 */}
        <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewingUser(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                 style={{ backgroundColor: getAvatarColor(viewingUser) }}>
              {getUserName(viewingUser).charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl">{getUserName(viewingUser)}</h2>
              <p className="text-xs text-muted-foreground">{viewingUser}</p>
            </div>
            <div className="ml-auto px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm">
              {selectedUserRecords.length} 条记录
            </div>
          </div>
        </div>

        {/* 记录列表 */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-2xl mx-auto space-y-3">
            {selectedUserRecords.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无已完成日程记录</p>
              </div>
            ) : (
              selectedUserRecords.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium mb-1">{record.title}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(record.completed_at), 'M月d日 HH:mm', { locale: zhCN })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
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

  return (
    <div className="size-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
      {/* 顶部标题 */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-green-500" />
            <h2 className="text-2xl">用户日程记录</h2>
          </div>
          <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span>总计 {totalCompleted} 项</span>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : summary.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Trophy className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg mb-2">暂无已完成日程</p>
            <p className="text-sm">在日历页面勾选 ✅ 日程后，记录将显示在这里</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {summary.map((item, index) => {
              const email = item.source_email;
              const name = getUserName(email);
              return (
                <motion.button
                  key={email}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => handleViewUser(email)}
                  className="w-full bg-white/90 backdrop-blur-sm rounded-xl p-5 shadow-lg flex items-center gap-4 hover:shadow-xl transition-shadow text-left"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                       style={{ backgroundColor: getAvatarColor(email) }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium mb-1">{name}</div>
                    <div className="text-xs text-muted-foreground truncate">{email}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                        已完成 {item.total_completed} 项
                      </span>
                      {item.last_completed_at && (
                        <span className="text-xs text-muted-foreground">
                          最近完成 {format(new Date(item.last_completed_at), 'M月d日', { locale: zhCN })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </motion.button>
              );
            })}
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
