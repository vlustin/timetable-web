import { availableDate, dayKey, entriesFor, fromKey, monday, selectedGroup, shift, state, weekParity } from './state'
import type { Entry } from './types'
import { groupDescription, groupPicker } from './group-picker'

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
function icon(name: string): string {
  const paths: Record<string, string> = {
    down: '<path d="m6 9 6 6 6-6"/>', left: '<path d="m15 6-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-12 4h.01m3 0h.01m3 0h.01m-6 3h.01m3 0h.01"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    settings: '<path d="M18.929 9.130 L19.336 10.441 L21.383 10.514 L21.383 13.486 L19.336 13.559 L18.929 14.870 L18.290 16.085 L19.686 17.584 L17.584 19.686 L16.085 18.290 L14.870 18.929 L13.559 19.336 L13.486 21.383 L10.514 21.383 L10.441 19.336 L9.130 18.929 L7.915 18.290 L6.416 19.686 L4.314 17.584 L5.710 16.085 L5.071 14.870 L4.664 13.559 L2.617 13.486 L2.617 10.514 L4.664 10.441 L5.071 9.130 L5.710 7.915 L4.314 6.416 L6.416 4.314 L7.915 5.710 L9.130 5.071 L10.441 4.664 L10.514 2.617 L13.486 2.617 L13.559 4.664 L14.870 5.071 L16.085 5.710 L17.584 4.314 L19.686 6.416 L18.290 7.915 Z"/><circle cx="12" cy="12" r="3.2"/>',
    pencil: '<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    moon: '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',
    system: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.calendar}</svg>`
}
const weekday = new Intl.DateTimeFormat('ru', { weekday: 'short' })
const month = { format: (date: Date) => new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' }).format(date).replace(/^\d+\s+/, '') }

function dataPeriod(): string {
  const timetable = state.timetable
  if (!timetable) return ''
  const semester = timetable.semester
  const dates = (timetable.events || []).map(entry => entry.date).filter((date): date is string => !!date).sort()
  const start = semester?.startDate || dates[0]
  const end = semester?.endDate || dates.at(-1)
  if (!start || !end) return '<p class="data-period">В источнике пока нет занятий и событий для этой группы.</p>'
  const format = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric' })
  const outside = dayKey(state.date) < start || dayKey(state.date) > end
  return `<div class="data-period"><span>Данные за ${esc(format.format(fromKey(start)))} — ${esc(format.format(fromKey(end)))}${outside ? '. На выбранную дату расписание в источнике отсутствует.' : ''}</span>${outside && availableDate(timetable) ? '<button data-action="available">Открыть доступное расписание</button>' : ''}</div>`
}

export function teacherName(value = ''): string {
  return value.split(/[,;]+/).map(name => {
    const words = name.trim().split(/\s+/)
    return words.length >= 3 && !/\./.test(words[1]) ? `${words[0]} ${words[1][0]}. ${words[2][0]}.` : name.trim()
  }).filter(Boolean).join(', ')
}
export function cleanKind(value = ''): string {
  return [...new Set(value.split(/[,;]+/).map(part => part.trim()).filter(Boolean))].join(', ')
}
function card(entry: Entry, index: number, feed = false): string {
  const kind = cleanKind(entry.kind || entry.category || 'Занятие')
  const teacher = teacherName(entry.teacher)
  const time = [entry.startTime, entry.endTime].filter(Boolean).join(' — ') || entry.time || 'Время не указано'
  const place = [entry.isOnline ? 'Онлайн' : entry.room && `Аудитория ${entry.room}`, entry.address].filter(Boolean).join(' · ')
  const details = `${teacher ? `<p>${esc(teacher)}</p>` : ''}${place ? `<p>${esc(place)}</p>` : ''}${entry.subgroup ? `<p>${esc(entry.subgroup)}</p>` : ''}${entry.note && entry.note !== kind ? `<p class="note">${esc(entry.note)}</p>` : ''}`
  if (feed) return `<article class="feed-card glass"><span class="feed-symbol">${icon('calendar')}</span><div class="card-body"><div class="feed-title"><h3>${esc(entry.subject || 'Событие')}</h3><span class="feed-time">${esc(time)}</span></div><span class="badge">${esc(kind)}</span>${details}</div></article>`
  return `<article class="timeline-row"><div class="timeline-rail" aria-hidden="true"><span>${index + 1}</span><i></i></div><div class="timeline-body"><div class="lesson-time">${esc(time)}</div><div class="lesson-card glass"><div class="card-body"><h3>${esc(entry.subject || 'Событие')}</h3><div class="lesson-kind">${esc(kind)}</div>${details}</div><span class="card-symbol">${icon('pencil')}</span></div></div></article>`
}
function days(): string {
  const start = monday(state.date)
  return Array.from({ length: 7 }, (_, index) => {
    const date = shift(start, index)
    const active = dayKey(date) === dayKey(state.date)
    const count = state.timetable ? entriesFor(date, state.timetable).length : 0
    return `<button class="day ${active ? 'active' : ''}" data-date="${dayKey(date)}" aria-pressed="${active}"><strong>${date.getDate()}</strong><span>${esc(weekday.format(date).replace('.', ''))}</span><i class="${count ? 'has-items' : ''}"></i></button>`
  }).join('')
}
function schedule(): string {
  if (state.loading) return '<div class="message">Загружаем расписание…</div>'
  if (state.error) return `<div class="message error">${esc(state.error)}<button data-action="retry">Повторить</button></div>`
  if (!state.timetable) return '<div class="message">Найдите или выберите группу, чтобы увидеть расписание.</div>'
  if (state.view === 'feed') {
    const start = monday(state.date)
    return Array.from({ length: 7 }, (_, i) => shift(start, i)).map(date => {
      const items = entriesFor(date, state.timetable!)
      return `<section class="feed-day"><h2>${esc(new Intl.DateTimeFormat('ru', { weekday: 'long', day: 'numeric', month: 'long' }).format(date))}</h2>${items.length ? items.map((entry, index) => card(entry, index, true)).join('') : '<p class="empty-small">Нет занятий</p>'}</section>`
    }).join('')
  }
  const entries = entriesFor(state.date, state.timetable)
  return entries.length ? entries.map((entry, index) => card(entry, index)).join('') : '<div class="message"><div class="empty-icon">✦</div><strong>На этот день событий нет</strong><span>Выберите другой день или неделю</span></div>'
}

function calendarSheet(): string {
  const month = state.calendarMonth
  const start = monday(new Date(month.getFullYear(), month.getMonth(), 1))
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const cellCount = Math.ceil(((new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7 + last.getDate()) / 7) * 7
  return `<div class="calendar-heading"><button class="icon-button" data-action="calendar-prev" aria-label="Предыдущий месяц">${icon('left')}</button><h3>${esc(new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' }).format(month))}</h3><button class="icon-button" data-action="calendar-next" aria-label="Следующий месяц">${icon('right')}</button></div><div class="month-grid">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(day => `<span class="month-weekday">${day}</span>`).join('')}${Array.from({ length: cellCount }, (_, i) => {
    const date = shift(start, i)
    const key = dayKey(date)
    const hasEvents = !!state.timetable && entriesFor(date, state.timetable).length > 0
    return `<button class="month-day ${date.getMonth() !== month.getMonth() ? 'outside' : ''} ${key === dayKey(state.date) ? 'active' : ''}" data-date="${key}" aria-label="${esc(new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' }).format(date))}" aria-pressed="${key === dayKey(state.date)}">${date.getDate()}<i class="${hasEvents ? 'has-items' : ''}"></i></button>`
  }).join('')}</div><button class="primary-button calendar-today" data-action="calendar-today">Сегодня</button>`
}
function settings(): string {
  const group = selectedGroup()
  return `<section class="settings-page"><h1>Настройки</h1><p class="screen-subtitle">Учебная группа и внешний вид</p><h2 class="settings-label">Учебная группа</h2><button class="settings-group glass" data-action="open-groups"><span><strong>${esc(group?.name || 'Выберите группу')}</strong><small>${group ? esc(groupDescription(group)) : 'Найдите свою учебную группу'}</small></span>${icon('right')}</button><h2 class="settings-label">Оформление</h2><div class="theme-options glass">${([['system','Как на устройстве','system'],['light','Светлая','sun'],['dark','Тёмная','moon']] as const).map(([value,label,symbol]) => `<button data-theme-choice="${value}" class="${state.theme === value ? 'selected' : ''}" aria-pressed="${state.theme === value}">${icon(symbol)}<span>${label}</span></button>`).join('')}</div><p class="settings-note">Timetable Hub<br>Расписание РУТ (МИИТ)</p></section>`
}

function weekRange(date: Date): string {
  const start = monday(date)
  const end = shift(start, 6)
  return start.getMonth() === end.getMonth() ? `${start.getDate()}–${end.getDate()} ${month.format(end)}` : `${start.getDate()} ${month.format(start)} – ${end.getDate()} ${month.format(end)}`
}
function weekLink(offset: number): string {
  const date = shift(state.date, offset)
  const parity = state.timetable ? (weekParity(date, state.timetable) === 'odd' ? 'Нечётная' : 'Чётная') + ' неделя' : ''
  const next = offset > 0
  return `<button class="week-link ${next ? 'next-week' : 'previous-week'}" data-action="${next ? 'next' : 'prev'}" aria-label="${next ? 'Следующая' : 'Предыдущая'} неделя: ${esc(weekRange(date))}">${next ? '' : icon('left')}<span>${esc(weekRange(date))}${parity ? `<small>${esc(parity)}</small>` : ''}</span>${next ? icon('right') : ''}</button>`
}
export function render(): void {
  document.documentElement.dataset.theme = state.theme
  const app = document.querySelector<HTMLDivElement>('#app')!
  const range = weekRange(state.date)
  const group = selectedGroup()?.name || state.timetable?.group || 'Выберите группу'
  const dateTitle = `${new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' }).format(state.date)}, ${new Intl.DateTimeFormat('ru', { weekday: 'long' }).format(state.date)}`
  const semester = state.timetable?.semester
  const outsidePeriod = !!semester && (dayKey(state.date) < semester.startDate || dayKey(state.date) > semester.endDate)
  const home = `<header class="app-header"><h1><button class="group-heading" data-action="open-groups" aria-label="Сменить группу: ${esc(group)}" aria-haspopup="dialog">${esc(group)}${icon('down')}</button></h1><p class="screen-subtitle">${state.view === 'events' ? 'События дня' : 'Лента событий'}</p><p class="group-caption">РУТ (МИИТ)${selectedGroup() ? ` · ${esc(groupDescription(selectedGroup()!))}` : ''}</p><div class="tabs" aria-label="Вид расписания"><button data-view="events" class="${state.view === 'events' ? 'selected' : ''}" aria-pressed="${state.view === 'events'}">События</button><button data-view="feed" class="${state.view === 'feed' ? 'selected' : ''}" aria-pressed="${state.view === 'feed'}">Лента</button></div></header><section class="content"><div class="date-heading"><h2>${esc(state.view === 'events' ? dateTitle : range)}</h2><button class="icon-button calendar-trigger" data-action="open-calendar" aria-label="Открыть календарь" aria-haspopup="dialog">${icon('calendar')}</button></div>${state.view === 'events' ? `<div class="week" aria-label="Дни недели">${days()}</div>` : ''}<div class="week-navigation">${weekLink(-7)}<button class="today-button" data-action="today">Сегодня</button>${weekLink(7)}</div>${outsidePeriod ? `<div class="outside-period">${dataPeriod()}</div>` : ''}<div class="schedule">${schedule()}</div><details class="source-details"><summary>Срок действия расписания</summary>${dataPeriod() || '<p>Выберите группу, чтобы увидеть расписание.</p>'}</details></section>`
  app.innerHTML = `<main class="shell">${state.screen === 'home' ? home : settings()}<nav class="dock" aria-label="Навигация"><button data-screen="home" class="${state.screen === 'home' ? 'selected' : ''}" aria-current="${state.screen === 'home' ? 'page' : 'false'}">${icon('home')}<span>Главная</span></button><button data-screen="settings" class="${state.screen === 'settings' ? 'selected' : ''}" aria-current="${state.screen === 'settings' ? 'page' : 'false'}">${icon('settings')}<span>Настройки</span></button></nav></main>${state.overlay ? `<dialog class="sheet" aria-labelledby="sheet-title"><div class="sheet-handle" aria-hidden="true"></div><header class="sheet-header"><h2 id="sheet-title">${state.overlay === 'groups' ? 'Учебная группа' : 'Календарь'}</h2><button class="close-button" data-action="close-sheet" aria-label="Закрыть">${icon('close')}</button></header>${state.overlay === 'groups' ? `<p class="sheet-subtitle">РУТ (МИИТ)</p>${groupPicker()}` : calendarSheet()}</dialog>` : ''}`
  if (state.overlay) document.querySelector<HTMLDialogElement>('dialog')!.showModal()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim())
}
