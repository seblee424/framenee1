import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  color: string;
}

export function CalendarModule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: '1', title: 'Family Movie Night', date: new Date(2026, 4, 20), color: '#ff6b6b' },
    { id: '2', title: 'Soccer Practice', date: new Date(2026, 4, 22), color: '#4ecdc4' },
    { id: '3', title: 'Dentist Appointment', date: new Date(2026, 4, 25), color: '#95e1d3' },
  ]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-primary" />
          <h2 className="text-2xl">Family Calendar</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 py-2 bg-muted rounded-lg min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 flex-1">
        {monthDays.map((day, idx) => {
          const dayEvents = getEventsForDate(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(day)}
              className={`
                relative p-2 rounded-lg border transition-all hover:border-primary
                ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}
                ${isTodayDate && !isSelected ? 'bg-accent' : ''}
              `}
            >
              <div className="text-sm mb-1">{format(day, 'd')}</div>
              {dayEvents.length > 0 && (
                <div className="flex gap-1 justify-center">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isSelected ? 'currentColor' : event.color }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h3 className="mb-3">{format(selectedDate, 'MMMM d, yyyy')}</h3>
          <div className="space-y-2">
            {getEventsForDate(selectedDate).map(event => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-2 bg-white rounded-lg"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: event.color }}
                />
                <span>{event.title}</span>
              </div>
            ))}
            {getEventsForDate(selectedDate).length === 0 && (
              <p className="text-muted-foreground">No events scheduled</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
