export interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  points: number;
  level: number;
  tasksCompleted: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  color: string;
  assignee: string;
  description?: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  assignee: string;
  points: number;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Reward {
  id: string;
  title: string;
  points: number;
  icon: string;
  description: string;
  claimed: boolean;
}

export interface Photo {
  id: string;
  url: string;
  caption: string;
  date: string;
  uploadedBy: string;
}

export interface AppDataSnapshot {
  familyMembers: FamilyMember[];
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  rewards: Reward[];
  photos: Photo[];
}

export type AppDataSource = 'mock' | 'api';
