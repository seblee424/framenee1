import { createContext, useContext, useState, ReactNode } from 'react';
import {
  FamilyMember,
  CalendarEvent,
  Task,
  Reward,
  Photo,
  familyMembers as initialFamilyMembers,
  calendarEvents as initialCalendarEvents,
  tasks as initialTasks,
  rewards as initialRewards,
  photos as initialPhotos,
} from '../data/sharedData';

interface AppContextType {
  familyMembers: FamilyMember[];
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  rewards: Reward[];
  photos: Photo[];
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => void;
  toggleTaskCompletion: (taskId: string) => void;
  addTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  claimReward: (rewardId: string, memberId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(initialFamilyMembers);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialCalendarEvents);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [rewards, setRewards] = useState<Reward[]>(initialRewards);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);

  const updateFamilyMember = (id: string, updates: Partial<FamilyMember>) => {
    setFamilyMembers(prev =>
      prev.map(member => (member.id === id ? { ...member, ...updates } : member))
    );
  };

  const toggleTaskCompletion = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompletedStatus = !task.completed;

    // Update task completion status
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, completed: newCompletedStatus } : t))
    );

    // If completing the task, add points to the assignee
    if (newCompletedStatus) {
      const member = familyMembers.find(m => m.name === task.assignee);
      if (member) {
        updateFamilyMember(member.id, {
          points: member.points + task.points,
          tasksCompleted: member.tasksCompleted + 1,
        });
      }
    } else {
      // If uncompleting the task, subtract points from the assignee
      const member = familyMembers.find(m => m.name === task.assignee);
      if (member) {
        updateFamilyMember(member.id, {
          points: member.points - task.points,
          tasksCompleted: Math.max(0, member.tasksCompleted - 1),
        });
      }
    }
  };

  const addTask = (task: Task) => {
    setTasks(prev => [...prev, task]);
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const claimReward = (rewardId: string, memberId: string) => {
    const reward = rewards.find(r => r.id === rewardId);
    const member = familyMembers.find(m => m.id === memberId);

    if (reward && member && member.points >= reward.points) {
      setRewards(prev =>
        prev.map(r => (r.id === rewardId ? { ...r, claimed: true } : r))
      );
      updateFamilyMember(memberId, {
        points: member.points - reward.points,
      });
    }
  };

  return (
    <AppContext.Provider
      value={{
        familyMembers,
        calendarEvents,
        tasks,
        rewards,
        photos,
        updateFamilyMember,
        toggleTaskCompletion,
        addTask,
        deleteTask,
        claimReward,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
