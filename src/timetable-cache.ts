import type { Timetable } from './types'

const KEY = 'timetable-last-schedule-v1'

export function readCachedTimetable(universityId: string, groupId: string): Timetable | null {
  if (!groupId) return null
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!value || value.universityId !== universityId || value.groupId !== groupId || typeof value.group !== 'string') return null
    const lists = [value.events, value.exceptions || [], value.lessons?.odd || [], value.lessons?.even || []]
    if (!lists.every(list => Array.isArray(list) && list.every(entry => entry && typeof entry === 'object' && !Array.isArray(entry)))) return null
    if (value.semester && (typeof value.semester.startDate !== 'string' || typeof value.semester.endDate !== 'string' || !['odd', 'even'].includes(value.semester.firstWeekParity))) return null
    return value as Timetable
  } catch { return null }
}

export function cacheTimetable(timetable: Timetable): void {
  try { localStorage.setItem(KEY, JSON.stringify(timetable)) } catch { /* Loading still works when storage is unavailable or full. */ }
}
