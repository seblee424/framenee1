import { useState } from 'react';
import { Calendar, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { useAppContext } from '../context/AppContext';

interface CalendarDetailPageProps {
  onClose: () => void;
}

export function CalendarDetailPage({ onClose }: CalendarDetailPageProps) {
  const { calendarEvents, tasks } = useAppContext();
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

  const getTasksForDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks.filter(task => {
      if (task.dueDate === 'Today') {
        return isSameDay(date, today);
      } else if (task.dueDate === 'Tomorrow') {
        return isSameDay(date, tomorrow);
      }
      return false;
    });
  };

  const hasItemsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0 || getTasksForDate(date).length > 0;
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const selectedDateTasks = getTasksForDate(selectedDate);

  return (
    <div className="size-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-500" />
            <h2 className="text-2xl">Family Calendar</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="px-4 py-2 bg-muted rounded-lg min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
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

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-3 gap-6 h-full">
          {/* Calendar Grid */}
          <div className="col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg flex flex-col">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-muted-foreground py-2 text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
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
                        {getTasksForDate(day).length > 0 && (
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? 'white' : '#10b981' }}
                          />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Details */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg overflow-auto">
            <h3 className="mb-4 text-lg">{format(selectedDate, 'MMMM d, yyyy')}</h3>

            {/* Events */}
            {selectedDateEvents.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm text-muted-foreground mb-3">Events</h4>
                <div className="space-y-3">
                  {selectedDateEvents.map(event => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border-l-4"
                      style={{ borderLeftColor: event.color, backgroundColor: `${event.color}10` }}
                    >
                      <div className="text-sm mb-1">{event.title}</div>
                      <div className="text-xs text-muted-foreground mb-1">{event.time}</div>
                      <div className="text-xs text-muted-foreground">👤 {event.assignee}</div>
                      {event.description && (
                        <div className="text-xs text-muted-foreground mt-2 italic">
                          {event.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            {selectedDateTasks.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm text-muted-foreground mb-3">Tasks</h4>
                <div className="space-y-3">
                  {selectedDateTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500"
                    >
                      <div className="text-sm mb-1">{task.text}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>👤 {task.assignee}</span>
                        <span>•</span>
                        <span>{task.points} pts</span>
                        <span>•</span>
                        <span className={task.completed ? 'text-green-600' : 'text-amber-600'}>
                          {task.completed ? '✓ Done' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDateEvents.length === 0 && selectedDateTasks.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">
                No events or tasks scheduled for this day
              </p>
            )}
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
