import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createDashboardRepository } from '@/services/frameNe/dashboardRepository';
import type { AppDataSnapshot, AppDataSource, CalendarEvent, FamilyMember, Photo, Reward, Task } from '@/types/app';

interface AppContextType {
  familyMembers: FamilyMember[];
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  rewards: Reward[];
  photos: Photo[];
  isLoading: boolean;
  dataSource: AppDataSource;
  reloadData: () => Promise<void>;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => void;
  toggleTaskCompletion: (taskId: string) => void;
  addTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  claimReward: (rewardId: string, memberId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<AppDataSnapshot>({
    familyMembers: [],
    calendarEvents: [],
    tasks: [],
    rewards: [],
    photos: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<AppDataSource>('mock');
  const repositoryRef = useRef(createDashboardRepository());

  const familyMembers = appData.familyMembers;
  const calendarEvents = appData.calendarEvents;
  const tasks = appData.tasks;
  const rewards = appData.rewards;
  const photos = appData.photos;

  const reloadData = async () => {
    setIsLoading(true);

    try {
      const result = await repositoryRef.current.loadInitialData();
      setAppData(result.data);
      setDataSource(result.source);
    } catch (error) {
      console.error('Failed to load dashboard data, starting with empty state.', error);
      setAppData({
        familyMembers: [],
        calendarEvents: [],
        tasks: [],
        rewards: [],
        photos: [],
      });
      setDataSource('mock');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void reloadData();
  }, []);

  const updateFamilyMember = (id: string, updates: Partial<FamilyMember>) => {
    setAppData(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.map(member =>
        member.id === id ? { ...member, ...updates } : member,
      ),
    }));
  };

  const toggleTaskCompletion = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompletedStatus = !task.completed;

    // Update task completion status
    setAppData(prev => ({
      ...prev,
      tasks: prev.tasks.map(taskItem =>
        taskItem.id === taskId ? { ...taskItem, completed: newCompletedStatus } : taskItem,
      ),
    }));

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
    setAppData(prev => ({
      ...prev,
      tasks: [...prev.tasks, task],
    }));
  };

  const deleteTask = (taskId: string) => {
    setAppData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId),
    }));
  };

  const claimReward = (rewardId: string, memberId: string) => {
    const reward = rewards.find(r => r.id === rewardId);
    const member = familyMembers.find(m => m.id === memberId);

    if (reward && member && member.points >= reward.points) {
      setAppData(prev => ({
        ...prev,
        rewards: prev.rewards.map(rewardItem =>
          rewardItem.id === rewardId ? { ...rewardItem, claimed: true } : rewardItem,
        ),
      }));
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
        isLoading,
        dataSource,
        reloadData,
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
