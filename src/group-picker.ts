import { state } from './state'
import type { Group } from './types'

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })
const normalize = (value: string) => value.trim().toLocaleLowerCase('ru').replace(/[–—]/g, '-').replace(/\s+/g, '')

export function sortedGroups(groups: Group[]): Group[] {
  const order = new Map(state.institutes.map((institute, index) => [institute.id, index]))
  return [...groups].sort((a, b) => (order.get(a.instituteId) ?? 999) - (order.get(b.instituteId) ?? 999) || a.course - b.course || collator.compare(a.name, b.name))
}
export function groupDescription(group: Group): string {
  const institute = state.institutes.find(item => item.id === group.instituteId)
  return `${institute?.shortName || group.instituteId} · ${group.course} курс`
}
export function searchGroups(query: string): Group[] {
  const term = normalize(query)
  return term ? sortedGroups(state.groups.filter(group => normalize(group.name).includes(term))) : []
}
export function searchResults(): string {
  if (!state.search.trim()) return ''
  const matches = searchGroups(state.search)
  return `<p class="search-count" role="status">${matches.length ? `Найдено: ${matches.length}` : 'Группа не найдена'}</p>${matches.slice(0, 40).map(group => `<button type="button" data-group="${esc(group.id)}" class="search-result"><strong>${esc(group.name)}</strong><span>${esc(groupDescription(group))}</span></button>`).join('')}${matches.length > 40 ? '<p class="search-count">Уточните поиск, чтобы увидеть остальные группы</p>' : ''}`
}
export function alignGroupFilters(): void {
  const group = state.groups.find(item => item.id === state.groupId)
  if (group) { state.instituteFilter = group.instituteId; state.courseFilter = String(group.course) }
}
export function groupPicker(): string {
  const filtered = sortedGroups(state.groups.filter(group => (!state.instituteFilter || group.instituteId === state.instituteFilter) && (!state.courseFilter || group.course === Number(state.courseFilter))))
  const courses = [...new Set(state.groups.filter(group => !state.instituteFilter || group.instituteId === state.instituteFilter).map(group => group.course))].sort((a, b) => a - b)
  const buckets = new Map<string, Group[]>()
  for (const group of filtered) { const label = groupDescription(group); buckets.set(label, [...(buckets.get(label) || []), group]) }
  return `<section class="group-picker" aria-label="Выбор группы"><label class="search-label">Найти группу<input id="group-search" type="search" autocomplete="off" placeholder="Например, СЖД-341" value="${esc(state.search)}" aria-controls="group-results" /></label><div id="group-results" class="search-results">${searchResults()}</div><div class="selectors group-selectors"><label>Институт<select id="institute"><option value="">Все институты</option>${state.institutes.map(item => `<option value="${esc(item.id)}" ${item.id === state.instituteFilter ? 'selected' : ''}>${esc(item.shortName)} — ${esc(item.name)}</option>`).join('')}</select></label><label>Курс<select id="course"><option value="">Все курсы</option>${courses.map(course => `<option value="${course}" ${String(course) === state.courseFilter ? 'selected' : ''}>${course} курс</option>`).join('')}</select></label><label class="group-select-label">Группа<select id="group"><option value="">Выберите группу</option>${[...buckets].map(([label, groups]) => `<optgroup label="${esc(label)}">${groups.map(group => `<option value="${esc(group.id)}" ${group.id === state.groupId ? 'selected' : ''}>${esc(group.name)}</option>`).join('')}</optgroup>`).join('')}</select></label></div></section>`
}
