import { availableDate, dayKey, entriesFor, fromKey, monday, selectedGroup, shift, state, weekParity } from './state'
import type { Entry } from './types'
import { groupDescription, groupPicker } from './group-picker'

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
function icon(name: string): string {
  const paths: Record<string, string> = {
    appearance: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"/>',
    down: '<path d="m6 9 6 6 6-6"/>', left: '<path d="m15 6-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-12 4h.01m3 0h.01m3 0h.01m-6 3h.01m3 0h.01"/>',
    book: '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z"/><path d="M12 6v14"/>',
    flask: '<path d="M9 3h6m-5 0v7L4 19a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2l-6-9V3M7 15h10"/>',
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
  return [...new Set(value.split(/[,;]+/).map(name => name.trim().replace(/\s+/g, ' ')).filter(Boolean))].join(', ')
}
export function cleanKind(value = ''): string {
  return [...new Set(value.split(/[,;]+/).map(part => part.trim()).filter(Boolean))].join(', ')
}
function lessonIcon(kind: string): string {
  if (/лабор|lab/i.test(kind)) return 'flask'
  if (/практ|семинар|practice|seminar/i.test(kind)) return 'pencil'
  if (/лекц|lecture/i.test(kind)) return 'book'
  return 'calendar'
}
function card(entry: Entry, feed = false): string {
  const kind = cleanKind(entry.kind || entry.category || 'Занятие')
  const symbol = icon(lessonIcon(kind))
  const time = [entry.startTime, entry.endTime].filter(Boolean).join(' — ') || entry.time || 'Время не указано'
  const variants = entry.variants || [entry]
  const details = variants.map(variant => {
    const teacher = teacherName(variant.teacher)
    const place = [variant.isOnline ? 'Онлайн' : variant.room && `Аудитория ${variant.room}`, variant.address].filter(Boolean).join(' · ')
    const content = `${variant.subgroup ? `<p class="subgroup-label">${esc(variant.subgroup)}</p>` : ''}${teacher ? `<p>${esc(teacher)}</p>` : ''}${place ? `<p>${esc(place)}</p>` : ''}${variant.note && variant.note !== kind ? `<p class="note">${esc(variant.note)}</p>` : ''}`
    return variants.length > 1 ? `<div class="subgroup-details">${content}</div>` : content
  }).join('')
  if (feed) return `<article class="feed-card glass"><span class="feed-symbol">${symbol}</span><div class="card-body"><div class="feed-title"><h3>${esc(entry.subject || 'Событие')}</h3><span class="feed-time">${esc(time)}</span></div><span class="badge">${esc(kind)}</span>${details}</div></article>`
  return `<article class="timeline-row"><div class="timeline-body"><div class="lesson-time">${esc(time)}</div><div class="lesson-card glass"><div class="card-body"><h3>${esc(entry.subject || 'Событие')}</h3><div class="lesson-kind">${esc(kind)}</div>${details}</div><span class="card-symbol">${symbol}</span></div></div></article>`
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
  if (state.loading && !state.timetable) return '<div class="message">Загружаем расписание…</div>'
  if (state.error && !state.timetable) return `<div class="message error">${esc(state.error)}<button data-action="retry">Повторить</button></div>`
  if (!state.timetable) return '<div class="message">Найдите или выберите группу, чтобы увидеть расписание.</div>'
  if (state.view === 'feed') {
    const start = monday(state.date)
    return Array.from({ length: 7 }, (_, i) => shift(start, i)).map(date => {
      const items = entriesFor(date, state.timetable!)
      return `<section class="feed-day"><h2>${esc(new Intl.DateTimeFormat('ru', { weekday: 'long', day: 'numeric', month: 'long' }).format(date))}</h2>${items.length ? items.map(entry => card(entry, true)).join('') : '<p class="empty-small">Нет занятий</p>'}</section>`
    }).join('')
  }
  const entries = entriesFor(state.date, state.timetable)
  return entries.length ? entries.map(entry => card(entry)).join('') : '<div class="message"><div class="empty-icon">✦</div><strong>На этот день событий нет</strong><span>Выберите другой день или неделю</span></div>'
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
function themeOptions(): string {
  return `<div class="theme-options glass">${([['system','Авто','appearance'],['light','Светлая','sun'],['dark','Тёмная','moon']] as const).map(([value,label,symbol]) => `<button data-theme-choice="${value}" class="${state.theme === value ? 'selected' : ''}" aria-pressed="${state.theme === value}">${icon(symbol)}<span>${label}</span></button>`).join('')}</div>`
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
  const previousDialog = document.querySelector<HTMLDialogElement>('dialog[open]')
  const sameOverlay = !!previousDialog && previousDialog.dataset.overlay === state.overlay
  const focusedTheme = sameOverlay && document.activeElement instanceof HTMLElement ? document.activeElement.dataset.themeChoice : undefined
  document.documentElement.dataset.theme = state.theme
  const mobileSafariBrowser = CSS.supports('-webkit-touch-callout', 'none')
    && window.matchMedia('(display-mode: browser) and (hover: none) and (pointer: coarse)').matches
  let browserTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!browserTheme) {
    browserTheme = document.createElement('meta')
    browserTheme.name = 'theme-color'
    document.head.append(browserTheme)
  }
  const browserThemeVariable = mobileSafariBrowser ? '--browser-bg' : '--bg-start'
  browserTheme.content = getComputedStyle(document.documentElement).getPropertyValue(browserThemeVariable).trim()
  const app = document.querySelector<HTMLDivElement>('#app')!
  const range = weekRange(state.date)
  const group = selectedGroup()?.name || state.timetable?.group || (state.loading && state.groupId ? 'Загрузка группы…' : 'Выберите группу')
  const dateTitle = `${new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' }).format(state.date)}, ${new Intl.DateTimeFormat('ru', { weekday: 'long' }).format(state.date)}`
  const semester = state.timetable?.semester
  const outsidePeriod = !!semester && (dayKey(state.date) < semester.startDate || dayKey(state.date) > semester.endDate)
  const home = `<header class="app-header"><div class="header-top"><h1><button class="group-heading" data-action="open-groups" aria-label="Сменить группу: ${esc(group)}" aria-haspopup="dialog">${esc(group)}${icon('down')}</button></h1><button class="icon-button theme-trigger glass" data-action="open-theme" aria-label="Настройка темы" aria-haspopup="dialog">${icon(state.theme === 'system' ? 'appearance' : state.theme === 'dark' ? 'moon' : 'sun')}</button></div><p class="screen-subtitle">${state.view === 'events' ? 'События дня' : 'Лента событий'}</p><p class="group-caption">РУТ (МИИТ)${selectedGroup() ? ` · ${esc(groupDescription(selectedGroup()!))}` : ''}</p><div class="tabs" aria-label="Вид расписания"><button data-view="events" class="${state.view === 'events' ? 'selected' : ''}" aria-pressed="${state.view === 'events'}">События</button><button data-view="feed" class="${state.view === 'feed' ? 'selected' : ''}" aria-pressed="${state.view === 'feed'}">Лента</button></div></header><section class="content"><div class="date-heading"><h2>${esc(state.view === 'events' ? dateTitle : range)}</h2><button class="icon-button calendar-trigger" data-action="open-calendar" aria-label="Открыть календарь" aria-haspopup="dialog">${icon('calendar')}</button></div>${state.view === 'events' ? `<div class="week" aria-label="Дни недели">${days()}</div>` : ''}<div class="week-navigation">${weekLink(-7)}<button class="today-button" data-action="today">Сегодня</button>${weekLink(7)}</div>${outsidePeriod ? `<div class="outside-period">${dataPeriod()}</div>` : ''}<div class="schedule">${state.error && state.timetable ? '<p class="empty-small" role="status">Не удалось обновить расписание. Показана сохранённая версия.</p>' : ''}${schedule()}</div><details class="source-details"><summary>Срок действия расписания</summary>${dataPeriod() || '<p>Выберите группу, чтобы увидеть расписание.</p>'}</details></section>`
  app.innerHTML = `<main class="shell">${home}</main>${state.overlay ? `<dialog data-overlay="${state.overlay}" class="sheet ${state.overlay === 'theme' ? 'theme-sheet' : ''}" aria-labelledby="sheet-title">${state.overlay === 'theme' ? '' : '<div class="sheet-handle" aria-hidden="true"></div>'}<header class="sheet-header"><h2 id="sheet-title">${state.overlay === 'groups' ? 'Учебная группа' : state.overlay === 'theme' ? 'Тема' : 'Календарь'}</h2><button class="close-button" data-action="close-sheet" aria-label="Закрыть">${icon('close')}</button></header>${state.overlay === 'groups' ? `<p class="sheet-subtitle">РУТ (МИИТ)</p>${groupPicker()}` : state.overlay === 'theme' ? themeOptions() : calendarSheet()}</dialog>` : ''}`
  if (state.overlay) {
    const dialog = document.querySelector<HTMLDialogElement>('dialog')!
    if (sameOverlay) dialog.style.animation = 'none'
    dialog.showModal()
    if (focusedTheme) dialog.querySelector<HTMLButtonElement>(`[data-theme-choice="${focusedTheme}"]`)?.focus({ preventScroll: true })
  }
}
