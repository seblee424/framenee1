import { useState } from 'react';
import { Calendar, Home, ChevronLeft, ChevronRight, Check, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';
import { webEventsApi } from '@/services/frameNe/webEvents';

interface CalendarDetailPageProps {
  onClose: () => void;
}

export function CalendarDetailPage({ onClose }: CalendarDetailPageProps) {
  const { calendarEvents, reloadData } = useAppContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => isSameDay(event.date, date));
  };

  const hasItemsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0;
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const handleToggleComplete = async (id: string) => {
    try {
      await webEventsApi.toggleComplete(id);
      await reloadData();
    } catch (error) {
      console.error('切换日程完成状态失败', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await webEventsApi.remove(id);
      await reloadData();
    } catch (error) {
      console.error('删除日程失败', error);
    }
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
      {/* 顶部标题 */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-500" />
            <h2 className="text-2xl">日程日历</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="px-4 py-2 bg-muted rounded-lg min-w-[140px] text-center">
              {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* 日历内容 */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-3 gap-6 h-full">
          {/* 月视图 */}
          <div className="col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg flex flex-col">
            {/* 星期头 */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <div key={day} className="text-center text-muted-foreground py-2 text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-2 flex-1">
              {calendarDays.map((day, idx) => {
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const hasItems = hasItemsOnDate(day);

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative p-3 rounded-lg border transition-all hover:border-blue-500
                      ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'border-border'}
                      ${isTodayDate && !isSelected ? 'bg-blue-50 border-blue-300' : ''}
                      ${!isCurrentMonth ? 'opacity-40' : ''}
                    `}
                  >
                    <div className="text-sm mb-1">{format(day, 'd')}</div>
                    {hasItems && (
                      <div className="flex gap-1 justify-center">
                        {getEventsForDate(day).slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? 'white' : event.color }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 选中日期的详情 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg overflow-auto">
            <h3 className="mb-4 text-lg">
              {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}
            </h3>

            {/* 事件列表 */}
            {selectedDateEvents.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm text-muted-foreground mb-3">日程</h4>
                <div className="space-y-3">
                  {selectedDateEvents.map(event => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border-l-4 flex items-center gap-3"
                      style={{ borderLeftColor: event.color, backgroundColor: `${event.color}10` }}
                    >
                      {/* 勾选完成按钮 */}
                      <button
                        onClick={() => handleToggleComplete(event.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          event.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                        }`}
                        title={event.completed ? '标记为未完成' : '标记为已完成'}
                      >
                        {event.completed && <Check className="w-4 h-4" />}
                      </button>

                      {/* 事件内容 */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm mb-1 ${
                            event.completed ? 'line-through text-gray-400' : ''
                          }`}
                        >
                          {event.title}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">{event.time}</div>
                        <div className="text-xs text-muted-foreground">👤 {event.assignee}</div>
                        {event.description && (
                          <div className="text-xs text-muted-foreground mt-2 italic">
                            {event.description}
                          </div>
                        )}
                      </div>

                      {/* 删除按钮 */}
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        title="删除日程"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDateEvents.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">
                当天暂无日程
              </p>
            )}
          </div>
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
