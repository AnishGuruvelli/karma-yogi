export interface Subject {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  subjectId: string;
  topic: string;
  duration: number; // minutes
  startTime: string;
  endTime: string;
  date: string;
  moodRating: number; // 1-5
  isManualLog: boolean;
}

export interface Goal {
  id: string;
  targetHours: number;
  currentProgress: number; // hours
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string;
  phone: string;
  currentStreak: number;
  lastActiveDate: string;
}

export const MOOD_EMOJIS: Record<number, string> = {
  1: '😞',
  2: '😐',
  3: '😊',
  4: '🌟',
  5: '🤩',
};

export const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  cyan: { bg: 'bg-neon-cyan/20', border: 'border-l-neon-cyan', text: 'text-neon-cyan' },
  green: { bg: 'bg-neon-green/20', border: 'border-l-neon-green', text: 'text-neon-green' },
  orange: { bg: 'bg-neon-orange/20', border: 'border-l-neon-orange', text: 'text-neon-orange' },
  pink: { bg: 'bg-neon-pink/20', border: 'border-l-neon-pink', text: 'text-neon-pink' },
  purple: { bg: 'bg-neon-purple/20', border: 'border-l-neon-purple', text: 'text-neon-purple' },
};
