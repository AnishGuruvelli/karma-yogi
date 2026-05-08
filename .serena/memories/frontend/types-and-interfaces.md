# Karma Yogi Frontend Types

**File:** `/Users/admin/Code/karma-yogi/frontend/src/lib/types.ts`

## Core Domain Types

### Subject
```tsx
export interface Subject {
  id: string;
  name: string;
  color: string; // cyan|green|orange|pink|purple
  icon?: string;
  createdAt: string;
}
```

### Session
```tsx
export interface Session {
  id: string;
  subjectId: string;
  topic: string;
  duration: number; // minutes
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  date: string;      // YYYY-MM-DD
  moodRating: number; // 1-5
  isManualLog: boolean;
}
```

### Goal
```tsx
export interface Goal {
  id: string;
  targetHours: number;
  currentProgress: number; // hours
}
```

### ExamGoal
```tsx
export interface ExamGoal {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}
```

### UserProfile
```tsx
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string;
  phone: string;
  currentStreak: number;
  lastActiveDate: string;
}
```

### UserPublicProfile
```tsx
export interface UserPublicProfile {
  userId: string;
  bio: string;
  location: string;
  education: string;
  occupation: string;
  targetExam: string;
  targetCollege: string;
}
```

### UserPreferences
```tsx
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
  showStrategyPage: boolean; // Enables StrategyDashboard nav + /strategy-dashboard route
}
```

### UserPrivacySettings
```tsx
export interface UserPrivacySettings {
  userId: string;
  profilePublic: boolean;
  showStats: boolean;
  showLeaderboard: boolean;
}
```

## Public Profile Types

### PublicProfileStats
```tsx
export interface PublicProfileStats {
  totalMinutes: number;
  totalSessions: number;
  activeDays: number;
  avgSessionMinutes: number;
  longestSession: number;
  thisWeekMinutes: number;
  friendCount: number;
}
```

### PublicProfileView
```tsx
export interface PublicProfileView {
  user: { id, email, fullName, username, avatarUrl? };
  profile: UserPublicProfile;
  privacy: UserPrivacySettings;
  stats?: PublicProfileStats;
}
```

### PublicProfileOverview
```tsx
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
```

### PublicProfileSessionEntry
```tsx
export interface PublicProfileSessionEntry {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  durationMin: number;
  mood: string;
  startedAt: string;
}
```

### PublicProfileInsightsPayload
```tsx
export interface PublicProfileInsightsPayload {
  dailyMinutes: { dateKey: string; minutes: number }[];
  weeklyMinutes: { dateKey: string; minutes: number }[];
  subjectBreakdown: { subjectId: string; subjectName: string; minutes: number }[];
  peakHourLocal: number;
  peakHourMinutes: number;
  bestDayDateKey: string;
  bestDayMinutes: number;
  mostStudiedSubject: string;
}
```

### PublicProfileDetails
```tsx
export interface PublicProfileDetails {
  user: { id, email, fullName, username, avatarUrl? };
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
```

## Friend Types

### FriendUser
```tsx
export interface FriendUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  friendshipStatus: "none" | "incoming" | "outgoing" | "friends";
}
```

### FriendRequest
```tsx
export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}
```

### LeaderboardEntry
```tsx
export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  username: string;
  weeklyMinutes: number;
}
```

## Utility Constants

### MOOD_EMOJIS
```tsx
export const MOOD_EMOJIS: Record<number, string> = {
  1: '😞',
  2: '😐',
  3: '😊',
  4: '🌟',
  5: '🤩',
};
```

### SUBJECT_COLORS
```tsx
export const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  cyan: { bg: 'bg-neon-cyan/20', border: 'border-l-neon-cyan', text: 'text-neon-cyan' },
  green: { bg: 'bg-neon-green/20', border: 'border-l-neon-green', text: 'text-neon-green' },
  orange: { bg: 'bg-neon-orange/20', border: 'border-l-neon-orange', text: 'text-neon-orange' },
  pink: { bg: 'bg-neon-pink/20', border: 'border-l-neon-pink', text: 'text-neon-pink' },
  purple: { bg: 'bg-neon-purple/20', border: 'border-l-neon-purple', text: 'text-neon-purple' },
};
```

## API Achievement Types

### UserAchievementKey
```tsx
export type UserAchievementKey =
  | 'seven_day_streak'
  | 'fourteen_day_warrior'
  | 'century_club'
  | 'first_session'
  | 'deep_work'
  | 'social_studier'
  | 'subject_master'
  | 'goal_crusher'
  | 'early_bird'
  | 'mock_master';
```

### UserAchievement
```tsx
export interface UserAchievement {
  key: UserAchievementKey;
  earned: boolean;
  earnedAt?: string;
}
```

### StudyStatsSummary
```tsx
export interface StudyStatsSummary {
  totalMinutes: number;
  totalSessions: number;
  avgSessionMinutes: number;
  longestSessionMinutes: number;
  avgMood: number;
  activeDistinctDays: number;
  weekMinutesCurrent: number;
  timezoneUsed: string;
}
```
