export interface University { id: string; name: string }
export interface Institute { id: string; name: string; shortName: string }
export interface Group { id: string; name: string; institute?: string; instituteId: string; course: number }
export interface GroupCatalog { schemaVersion: number; institutes: Institute[]; groups: Group[] }
export interface Entry {
  id?: string; date?: string; weekdayNumber?: number; dayOfWeek?: number;
  startTime?: string; endTime?: string; time?: string; kind?: string;
  category?: string; subject?: string; teacher?: string; room?: string;
  address?: string; subgroup?: string; note?: string; isOnline?: boolean;
}
export interface Timetable {
  universityId: string; groupId: string; group: string;
  semester?: { startDate: string; endDate: string; firstWeekParity: 'odd' | 'even' };
  events: Entry[]; lessons: { odd: Entry[]; even: Entry[] };
  exceptions?: Entry[];
}
export type View = 'events' | 'feed'
