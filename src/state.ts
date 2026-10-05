import type { Entry, Group, Timetable, University, View } from './types'

const KEY = 'timetable-selection-v1'
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') as { universityId?: string; groupId?: string } } catch { return {} } })()
export const state: {
  universities: University[]; groups: Group[]; timetable: Timetable | null;
  universityId: string; groupId: string; date: Date; view: View;
  loading: boolean; error: string;
} = {
  universities: [], groups: [], timetable: null,
  universityId: saved.universityId || '', groupId: saved.groupId || '',
  date: new Date(), view: 'events', loading: false, error: '',
}

export function saveSelection() {
  localStorage.setItem(KEY, JSON.stringify({ universityId: state.universityId, groupId: state.groupId }))
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function fromKey(key: string): Date { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
export function monday(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() - (result.getDay() + 6) % 7)
  return result
}
export function shift(date: Date, days: number): Date { const result = new Date(date); result.setDate(result.getDate() + days); return result }

export function weekParity(date: Date, timetable: Timetable): 'odd' | 'even' {
  const semester = timetable.semester
  if (!semester) return 'odd'
  const start = monday(fromKey(semester.startDate))
  const current = monday(date)
  const weeks = Math.round((Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 604800000)
  return weeks % 2 === 0 ? semester.firstWeekParity : semester.firstWeekParity === 'odd' ? 'even' : 'odd'
}

export function entriesFor(date: Date, timetable: Timetable): Entry[] {
  const key = dayKey(date)
  const weekday = (date.getDay() + 6) % 7 + 1
  const withinSemester = !timetable.semester || (key >= timetable.semester.startDate && key <= timetable.semester.endDate)
  const lessons = withinSemester ? timetable.lessons?.[weekParity(date, timetable)] || [] : []
  const regular = lessons.filter(entry => entry.date === key || (!entry.date && (entry.weekdayNumber ?? entry.dayOfWeek) === weekday))
  const exceptions = (timetable.exceptions || []).filter(entry => entry.date === key)
  const events = (timetable.events || []).filter(entry => entry.date === key)
  return [...regular, ...exceptions, ...events].sort((a, b) => (a.startTime || a.time || '').localeCompare(b.startTime || b.time || '', 'ru'))
}

export function selectedGroup(): Group | undefined { return state.groups.find(group => group.id === state.groupId) }

export function availableDate(timetable: Timetable): Date | null {
  const dates = [...(timetable.events || []), ...(timetable.exceptions || [])]
    .map(entry => entry.date).filter((date): date is string => !!date).sort()
  if (dates.length) return fromKey(dates.find(date => date >= dayKey(new Date())) || dates[0])
  if (timetable.semester && ((timetable.lessons?.odd.length || 0) + (timetable.lessons?.even.length || 0) > 0)) return fromKey(timetable.semester.startDate)
  return null
}

export function openAvailableDate(timetable: Timetable) {
  const semester = timetable.semester
  const key = dayKey(state.date)
  const hasWeekEntries = Array.from({ length: 7 }, (_, index) => entriesFor(shift(monday(state.date), index), timetable)).some(entries => entries.length)
  if (!hasWeekEntries && (!semester || key < semester.startDate || key > semester.endDate)) {
    const date = availableDate(timetable)
    if (date) state.date = date
  }
}
