import type { AppDataSnapshot } from '@/types/app';

const dashboardMockData: AppDataSnapshot = {
  familyMembers: [
    { id: '1', name: 'Emma', avatar: '👧', points: 145, level: 3, tasksCompleted: 24 },
    { id: '2', name: 'Jake', avatar: '👦', points: 128, level: 2, tasksCompleted: 19 },
    { id: '3', name: 'Mom', avatar: '👩', points: 95, level: 2, tasksCompleted: 15 },
    { id: '4', name: 'Dad', avatar: '👨', points: 87, level: 2, tasksCompleted: 13 }
  ],
  calendarEvents: [
    {
      id: '1',
      title: 'Family Movie Night',
      date: new Date(2026, 4, 27),
      time: '8:00 PM',
      color: '#ff6b6b',
      assignee: 'Everyone',
      description: 'Watch the new animated movie together'
    },
    {
      id: '2',
      title: 'Soccer Practice',
      date: new Date(2026, 4, 28),
      time: '4:00 PM',
      color: '#4ecdc4',
      assignee: 'Jake',
      description: 'Weekly soccer practice at the park'
    },
    {
      id: '3',
      title: 'Dentist Appointment',
      date: new Date(2026, 4, 30),
      time: '10:00 AM',
      color: '#95e1d3',
      assignee: 'Emma',
      description: "Regular checkup at Dr. Smith's office"
    },
    {
      id: '4',
      title: 'Piano Lesson',
      date: new Date(2026, 4, 29),
      time: '3:30 PM',
      color: '#f9ca24',
      assignee: 'Emma',
      description: 'Weekly piano lesson with Mrs. Johnson'
    },
    {
      id: '5',
      title: 'Grocery Shopping',
      date: new Date(2026, 4, 28),
      time: '6:00 PM',
      color: '#6c5ce7',
      assignee: 'Mom',
      description: 'Weekly grocery run'
    }
  ],
  tasks: [
    {
      id: '1',
      text: 'Clean your room',
      completed: false,
      assignee: 'Emma',
      points: 10,
      dueDate: 'Today',
      priority: 'medium'
    },
    {
      id: '2',
      text: 'Do homework',
      completed: true,
      assignee: 'Jake',
      points: 15,
      dueDate: 'Today',
      priority: 'high'
    },
    {
      id: '3',
      text: 'Water the plants',
      completed: false,
      assignee: 'Mom',
      points: 5,
      dueDate: 'Today',
      priority: 'low'
    },
    {
      id: '4',
      text: 'Take out trash',
      completed: false,
      assignee: 'Dad',
      points: 5,
      dueDate: 'Tomorrow',
      priority: 'medium'
    },
    {
      id: '5',
      text: 'Practice piano',
      completed: false,
      assignee: 'Emma',
      points: 20,
      dueDate: 'Today',
      priority: 'high'
    },
    {
      id: '6',
      text: 'Walk the dog',
      completed: false,
      assignee: 'Jake',
      points: 10,
      dueDate: 'Today',
      priority: 'medium'
    }
  ],
  rewards: [
    {
      id: '1',
      title: 'Extra Screen Time',
      points: 50,
      icon: '📱',
      description: '30 extra minutes of screen time',
      claimed: false
    },
    {
      id: '2',
      title: 'Choose Dinner',
      points: 75,
      icon: '🍕',
      description: 'Pick what the family has for dinner',
      claimed: false
    },
    {
      id: '3',
      title: 'Ice Cream Trip',
      points: 100,
      icon: '🍦',
      description: 'Family trip to the ice cream shop',
      claimed: false
    },
    {
      id: '4',
      title: 'Movie Night Pick',
      points: 125,
      icon: '🎬',
      description: 'Choose the next family movie',
      claimed: false
    },
    {
      id: '5',
      title: 'Late Bedtime',
      points: 80,
      icon: '🌙',
      description: 'Stay up 1 hour later on weekend',
      claimed: false
    },
    {
      id: '6',
      title: 'Special Outing',
      points: 200,
      icon: '🎡',
      description: 'Choose a special family outing',
      claimed: false
    }
  ],
  photos: [
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
      caption: 'Beach Vacation 2025',
      date: '2025-08-15',
      uploadedBy: 'Mom'
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=800',
      caption: 'Mountain Hiking',
      date: '2025-09-22',
      uploadedBy: 'Dad'
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1533854775446-95c4609da544?w=800',
      caption: "Emma's Birthday Party",
      date: '2026-03-10',
      uploadedBy: 'Mom'
    },
    {
      id: '4',
      url: 'https://images.unsplash.com/photo-1536147116438-62679a5e01f2?w=800',
      caption: 'Family Picnic',
      date: '2026-05-01',
      uploadedBy: 'Dad'
    },
    {
      id: '5',
      url: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca44?w=800',
      caption: "Jake's Soccer Game",
      date: '2026-04-18',
      uploadedBy: 'Mom'
    }
  ]
};

export const cloneDashboardMockData = (): AppDataSnapshot => structuredClone(dashboardMockData);
