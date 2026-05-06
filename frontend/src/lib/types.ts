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

export interface ExamGoal {
  id: string;
  name: string;
  date: string;
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

export interface UserPublicProfile {
  userId: string;
  bio: string;
  location: string;
  education: string;
  occupation: string;
  targetExam: string;
  targetCollege: string;
}

export interface UserPreferences {
  userId: string;
  preferredStudyTime: string;
  defaultSessionMinutes: number;
  breakMinutes: number;
  pomodoroCycles: number;
  studyLevel: string;
  weeklyGoalHours: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  reminderNotifications: boolean;
  marketingNotifications: boolean;
  /** When true, StrategyDashboard nav and `/strategy-dashboard` are enabled for this account (API: `showStrategyPage`). */
  showStrategyPage: boolean;
}

export interface UserPrivacySettings {
  userId: string;
  profilePublic: boolean;
  showStats: boolean;
  showLeaderboard: boolean;
}

export interface PublicProfileStats {
  totalMinutes: number;
  totalSessions: number;
  activeDays: number;
  avgSessionMinutes: number;
  longestSession: number;
  thisWeekMinutes: number;
  friendCount: number;
}

export interface PublicProfileView {
  user: {
    id: string;
    email: string;
    fullName: string;
    username: string;
    avatarUrl?: string;
  };
  profile: UserPublicProfile;
  privacy: UserPrivacySettings;
  stats?: PublicProfileStats;
}

export interface PublicProfileOverview {
  totalMinutes: number;
  totalSessions: number;
  activeDays: number;
  avgSessionMinutes: number;
  longestSession: number;
  thisWeekMinutes: number;
  friendCount: number;
  currentStreakDays: number;
  maxStreakDays: number;
  weeklyGoalHours: number;
  avgMood: number;
}

export interface PublicProfileSessionEntry {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  durationMin: number;
  mood: string;
  startedAt: string;
}

export interface PublicProfileInsightBucket {
  dateKey: string;
  minutes: number;
}

export interface PublicProfileInsightSubject {
  subjectId: string;
  subjectName: string;
  minutes: number;
}

export interface PublicProfileInsightsPayload {
  dailyMinutes: PublicProfileInsightBucket[];
  weeklyMinutes: PublicProfileInsightBucket[];
  subjectBreakdown: PublicProfileInsightSubject[];
  peakHourLocal: number;
  peakHourMinutes: number;
  bestDayDateKey: string;
  bestDayMinutes: number;
  mostStudiedSubject: string;
}

export interface PublicProfileDetails {
  user: {
    id: string;
    email: string;
    fullName: string;
    username: string;
    avatarUrl?: string;
  };
  profile: UserPublicProfile;
  privacy: UserPrivacySettings;
  canViewDetails: boolean;
  overview?: PublicProfileOverview;
  sessions?: PublicProfileSessionEntry[];
  sessionsTotal: number;
  sessionsHasMore: boolean;
  insights?: PublicProfileInsightsPayload;
  heatmap?: Record<string, number>;
}

export interface FriendUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  friendshipStatus: "none" | "incoming" | "outgoing" | "friends";
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  username: string;
  weeklyMinutes: number;
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
