import type { Session, Subject } from '@/lib/types';

function parseSessionDateTimeMs(session: Session): number {
  const time = session.endTime || session.startTime || '00:00';
  const [hoursStr, minutesStr] = time.split(':');
  const hours = Number.parseInt(hoursStr || '0', 10);
  const minutes = Number.parseInt(minutesStr || '0', 10);
  const safeHours = Number.isFinite(hours) ? hours : 0;
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  const timestamp = new Date(`${session.date}T${String(safeHours).padStart(2, '0')}:${String(safeMinutes).padStart(2, '0')}:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function getLastStudiedSubjectId(sessions: Session[], subjects: Subject[]): string {
  if (subjects.length === 0) return '';
  const validSubjectIds = new Set(subjects.map((s) => s.id));
  const latestSession = sessions
    .filter((s) => validSubjectIds.has(s.subjectId))
    .reduce<Session | null>((latest, current) => {
      if (!latest) return current;
      return parseSessionDateTimeMs(current) > parseSessionDateTimeMs(latest) ? current : latest;
    }, null);
  return latestSession?.subjectId || subjects[0]?.id || '';
}
