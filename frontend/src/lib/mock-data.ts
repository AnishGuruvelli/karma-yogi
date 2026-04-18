import type { Subject, Session, Goal, UserProfile } from './types';

export const mockSubjects: Subject[] = [
  { id: 's1', name: 'QUANT', color: 'green', createdAt: '2026-03-01' },
  { id: 's2', name: 'DILR', color: 'cyan', createdAt: '2026-03-01' },
  { id: 's3', name: 'VARC', color: 'orange', createdAt: '2026-03-05' },
];

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d;
};

export const mockSessions: Session[] = [
  { id: '1', subjectId: 's1', topic: 'Pnc modern maths', duration: 40, startTime: '15:00', endTime: '15:40', date: fmt(daysAgo(0)), moodRating: 2, isManualLog: false },
  { id: '2', subjectId: 's2', topic: 'Data', duration: 61, startTime: '21:25', endTime: '22:26', date: fmt(daysAgo(1)), moodRating: 4, isManualLog: false },
  { id: '3', subjectId: 's2', topic: 'Data charts', duration: 100, startTime: '18:12', endTime: '19:52', date: fmt(daysAgo(1)), moodRating: 3, isManualLog: false },
  { id: '4', subjectId: 's2', topic: 'Data interpretation', duration: 180, startTime: '20:19', endTime: '23:19', date: fmt(daysAgo(2)), moodRating: 3, isManualLog: false },
  { id: '5', subjectId: 's1', topic: 'Coordinate geometry', duration: 81, startTime: '15:13', endTime: '16:34', date: fmt(daysAgo(2)), moodRating: 3, isManualLog: false },
  { id: '6', subjectId: 's1', topic: 'Geometry', duration: 45, startTime: '12:02', endTime: '12:47', date: fmt(daysAgo(2)), moodRating: 3, isManualLog: true },
  { id: '7', subjectId: 's1', topic: 'Algebra basics', duration: 20, startTime: '10:00', endTime: '10:20', date: fmt(daysAgo(3)), moodRating: 2, isManualLog: false },
  { id: '8', subjectId: 's1', topic: 'Number systems', duration: 43, startTime: '14:00', endTime: '14:43', date: fmt(daysAgo(4)), moodRating: 4, isManualLog: false },
  { id: '9', subjectId: 's1', topic: 'Arithmetic', duration: 39, startTime: '11:00', endTime: '11:39', date: fmt(daysAgo(5)), moodRating: 3, isManualLog: false },
  { id: '10', subjectId: 's1', topic: 'Percentages', duration: 23, startTime: '09:00', endTime: '09:23', date: fmt(daysAgo(5)), moodRating: 3, isManualLog: false },
  { id: '11', subjectId: 's1', topic: 'Profit & Loss', duration: 29, startTime: '16:00', endTime: '16:29', date: fmt(daysAgo(6)), moodRating: 4, isManualLog: false },
  { id: '12', subjectId: 's1', topic: 'Time & Work', duration: 37, startTime: '18:00', endTime: '18:37', date: fmt(daysAgo(6)), moodRating: 4, isManualLog: false },
  { id: '13', subjectId: 's1', topic: 'Speed Distance', duration: 30, startTime: '10:00', endTime: '10:30', date: fmt(daysAgo(7)), moodRating: 3, isManualLog: false },
  { id: '14', subjectId: 's1', topic: 'Averages', duration: 60, startTime: '14:00', endTime: '15:00', date: fmt(daysAgo(7)), moodRating: 3, isManualLog: true },
  { id: '15', subjectId: 's1', topic: 'Ratio Proportion', duration: 45, startTime: '11:00', endTime: '11:45', date: fmt(daysAgo(8)), moodRating: 3, isManualLog: false },
  { id: '16', subjectId: 's1', topic: 'Mixtures', duration: 35, startTime: '15:00', endTime: '15:35', date: fmt(daysAgo(9)), moodRating: 2, isManualLog: false },
  { id: '17', subjectId: 's1', topic: 'Progressions', duration: 50, startTime: '09:30', endTime: '10:20', date: fmt(daysAgo(10)), moodRating: 3, isManualLog: false },
  { id: '18', subjectId: 's1', topic: 'Quadratic equations', duration: 55, startTime: '16:00', endTime: '16:55', date: fmt(daysAgo(11)), moodRating: 3, isManualLog: false },
  { id: '19', subjectId: 's1', topic: 'Inequalities', duration: 40, startTime: '12:00', endTime: '12:40', date: fmt(daysAgo(12)), moodRating: 3, isManualLog: false },
  { id: '20', subjectId: 's1', topic: 'Functions', duration: 65, startTime: '10:00', endTime: '11:05', date: fmt(daysAgo(13)), moodRating: 4, isManualLog: false },
  { id: '21', subjectId: 's1', topic: 'Logarithms', duration: 30, startTime: '14:00', endTime: '14:30', date: fmt(daysAgo(14)), moodRating: 3, isManualLog: false },
  { id: '22', subjectId: 's1', topic: 'Sets & Venn', duration: 48, startTime: '17:00', endTime: '17:48', date: fmt(daysAgo(15)), moodRating: 3, isManualLog: false },
  { id: '23', subjectId: 's1', topic: 'Probability basics', duration: 42, startTime: '11:00', endTime: '11:42', date: fmt(daysAgo(16)), moodRating: 3, isManualLog: false },
  { id: '24', subjectId: 's1', topic: 'Permutations', duration: 38, startTime: '09:00', endTime: '09:38', date: fmt(daysAgo(17)), moodRating: 4, isManualLog: false },
  { id: '25', subjectId: 's1', topic: 'Combinations', duration: 33, startTime: '15:00', endTime: '15:33', date: fmt(daysAgo(18)), moodRating: 3, isManualLog: false },
];

export const mockGoal: Goal = {
  id: 'g1',
  targetHours: 20,
  currentProgress: 0.7,
};

export const mockUser: UserProfile = {
  id: 'u1',
  name: 'Anish',
  currentStreak: 13,
  lastActiveDate: fmt(today),
};
