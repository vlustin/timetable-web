import './style.css'
import { getGroups, getTimetable } from './api'
import { availableDate, fromKey, openAvailableDate, saveSelection, shift, state } from './state'
import { render } from './ui'
import type { View } from './types'
import { alignGroupFilters, searchResults } from './group-picker'

function closeSheet() {
  const action = state.overlay === 'calendar' ? 'open-calendar' : 'open-groups'
  state.overlay = null; render()
  document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.focus()
}
let request = 0
async function loadTimetable() {
  const current = ++request
  state.error = ''
  state.timetable = null
  if (!state.universityId || !state.groupId) { state.loading = false; render(); return }
  state.loading = true; render()
  try {
    const result = await getTimetable(state.universityId, state.groupId)
    if (current === request) { state.timetable = result; openAvailableDate(result) }
  }
  catch (error) { if (current === request) state.error = error instanceof Error ? error.message : 'Не удалось загрузить расписание' }
  finally { if (current === request) { state.loading = false; render() } }
}
async function loadGroups() {
  const current = ++request
  state.groups = []; state.timetable = null; state.error = ''; state.loading = !!state.universityId; render()
  if (!state.universityId) { state.loading = false; render(); return }
  try {
    const catalog = await getGroups(state.universityId)
    if (current !== request) return
    state.groups = catalog.groups
    state.institutes = catalog.institutes
    if (!state.groups.some(group => group.id === state.groupId)) state.groupId = ''
    alignGroupFilters()
    saveSelection()
    await loadTimetable()
  } catch (error) { if (current === request) { state.loading = false; state.error = error instanceof Error ? error.message : 'Не удалось загрузить группы'; render() } }
}
async function init() {
  state.loading = true; render()
  try {
    state.universityId = 'moscow-rut-miit'
    await loadGroups()
  } catch (error) { state.loading = false; state.error = error instanceof Error ? error.message : 'Не удалось загрузить группы'; render() }
}
document.addEventListener('change', event => {
  const target = event.target as HTMLSelectElement
  if (target.id === 'institute') { state.instituteFilter = target.value; state.courseFilter = ''; render() }
  if (target.id === 'course') { state.courseFilter = target.value; render() }
  if (target.id === 'group' && target.value) { state.screen = 'home'; state.overlay = null; state.groupId = target.value; alignGroupFilters(); saveSelection(); void loadTimetable() }
})
document.addEventListener('input', event => {
  const input = event.target as HTMLInputElement
  if (input.id !== 'group-search') return
  state.search = input.value
  document.querySelector('#group-results')!.innerHTML = searchResults()
})
document.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button')
  if (!button) return
  if (button.dataset.group) { state.overlay = null; state.screen = 'home'; state.groupId = button.dataset.group; state.search = ''; alignGroupFilters(); saveSelection(); void loadTimetable() }
  if (button.dataset.date) { state.date = fromKey(button.dataset.date); state.overlay = null; render() }
  if (button.dataset.view) { state.view = button.dataset.view as View; render() }
  if (button.dataset.action === 'prev') { state.date = shift(state.date, -7); render() }
  if (button.dataset.action === 'next') { state.date = shift(state.date, 7); render() }
  if (button.dataset.action === 'today') { state.date = new Date(); render() }
  if (button.dataset.action === 'available' && state.timetable) {
    const date = availableDate(state.timetable)
    if (date) { state.date = date; render() }
  }
  if (button.dataset.action === 'open-groups') { state.overlay = 'groups'; state.search = ''; render() }
  if (button.dataset.action === 'close-sheet') closeSheet()
  if (button.dataset.action === 'open-calendar') { state.overlay = 'calendar'; state.calendarMonth = new Date(state.date.getFullYear(), state.date.getMonth(), 1); render() }
  if (button.dataset.action === 'calendar-prev') { state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1); render() }
  if (button.dataset.action === 'calendar-next') { state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1); render() }
  if (button.dataset.action === 'calendar-today') { state.date = new Date(); state.overlay = null; render() }
  if (button.dataset.screen === 'home' || button.dataset.screen === 'settings') { state.screen = button.dataset.screen; render() }
  const theme = button.dataset.themeChoice
  if (theme === 'system' || theme === 'light' || theme === 'dark') { state.theme = theme; localStorage.setItem('timetable-theme', theme); render() }
  if (button.dataset.action === 'retry') void init()
})
document.addEventListener('cancel', event => {
  if (event.target instanceof HTMLDialogElement) { event.preventDefault(); closeSheet() }
}, true)
void init()
if ('serviceWorker' in navigator) window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js') })
