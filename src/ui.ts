import { availableDate, dayKey, entriesFor, fromKey, monday, selectedGroup, shift, state, weekParity } from './state'
import type { Entry } from './types'

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
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
function card(entry: Entry): string {
  const kind = cleanKind(entry.kind || entry.category || 'Занятие')
  const teacher = teacherName(entry.teacher)
  const place = [entry.isOnline ? 'Онлайн' : entry.room && `Ауд. ${entry.room}`, entry.address].filter(Boolean).join(' · ')
  return `<article class="card"><div class="card-time">${esc(entry.startTime || entry.time?.split('—')[0]?.trim() || '—')}<span>${esc(entry.endTime || entry.time?.split('—')[1]?.trim() || '')}</span></div><div class="card-body"><span class="badge">${esc(kind)}</span><h3>${esc(entry.subject || 'Событие')}</h3>${teacher ? `<p>${esc(teacher)}</p>` : ''}${place ? `<p>${esc(place)}</p>` : ''}${entry.subgroup ? `<p>${esc(entry.subgroup)}</p>` : ''}${entry.note && entry.note !== kind ? `<p class="note">${esc(entry.note)}</p>` : ''}</div></article>`
}
function days(): string {
  const start = monday(state.date)
  return Array.from({ length: 7 }, (_, index) => {
    const date = shift(start, index)
    const active = dayKey(date) === dayKey(state.date)
    const count = state.timetable ? entriesFor(date, state.timetable).length : 0
    return `<button class="day ${active ? 'active' : ''}" data-date="${dayKey(date)}" aria-pressed="${active}"><span>${esc(weekday.format(date).replace('.', ''))}</span><strong>${date.getDate()}</strong><i class="${count ? 'has-items' : ''}"></i></button>`
  }).join('')
}
function schedule(): string {
  if (state.loading) return '<div class="message">Загружаем расписание…</div>'
  if (state.error) return `<div class="message error">${esc(state.error)}<button data-action="retry">Повторить</button></div>`
  if (!state.timetable) return '<div class="message">Выберите вуз и группу, чтобы увидеть расписание.</div>'
  if (state.view === 'feed') {
    const start = monday(state.date)
    return Array.from({ length: 7 }, (_, i) => shift(start, i)).map(date => {
      const items = entriesFor(date, state.timetable!)
      return `<section class="feed-day"><h2>${esc(new Intl.DateTimeFormat('ru', { weekday: 'long', day: 'numeric', month: 'long' }).format(date))}</h2>${items.length ? items.map(card).join('') : '<p class="empty-small">Нет занятий</p>'}</section>`
    }).join('')
  }
  const entries = entriesFor(state.date, state.timetable)
  return entries.length ? entries.map(card).join('') : '<div class="message"><div class="empty-icon">✦</div><strong>На этот день событий нет</strong><span>Выберите другой день или неделю</span></div>'
}

export function render(): void {
  const app = document.querySelector<HTMLDivElement>('#app')!
  const start = monday(state.date)
  const end = shift(start, 6)
  const range = start.getMonth() === end.getMonth() ? `${start.getDate()}–${end.getDate()} ${month.format(end)}` : `${start.getDate()} ${month.format(start)} – ${end.getDate()} ${month.format(end)}`
  const group = selectedGroup()?.name || state.timetable?.group || 'Выберите группу'
  app.innerHTML = `<main class="shell">
    <header class="topbar"><div class="brand-mark">✦</div><span>МОЁ РАСПИСАНИЕ</span><button class="icon-button" data-action="today" title="Сегодня" aria-label="Сегодня">◎</button></header>
    <section class="hero"><p class="eyebrow">ВАША ГРУППА</p><h1>${esc(group)}</h1><p>${esc(state.universities.find(item => item.id === state.universityId)?.name || 'Расписание университета')}</p></section>
    <section class="selectors"><label>Университет<select id="university"><option value="">Выберите вуз</option>${state.universities.map(item => `<option value="${esc(item.id)}" ${item.id === state.universityId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label><label>Группа<select id="group" ${!state.universityId ? 'disabled' : ''}><option value="">Выберите группу</option>${state.groups.map(item => `<option value="${esc(item.id)}" ${item.id === state.groupId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label></section>
    <section class="content"><div class="section-head"><div><p class="eyebrow">РАСПИСАНИЕ</p><h2>${esc(range)}</h2><span class="year">${start.getFullYear()}${state.timetable ? ` · ${weekParity(state.date, state.timetable) === 'odd' ? 'Нечётная' : 'Чётная'} неделя` : ''}</span></div><div class="arrows"><button data-action="prev" aria-label="Предыдущая неделя">‹</button><button data-action="next" aria-label="Следующая неделя">›</button></div></div>
    ${dataPeriod()}<div class="week" aria-label="Дни недели">${days()}</div><div class="tabs"><button data-view="events" class="${state.view === 'events' ? 'selected' : ''}">События</button><button data-view="feed" class="${state.view === 'feed' ? 'selected' : ''}">Лента</button></div><div class="schedule">${schedule()}</div></section>
    <nav class="dock" aria-label="Навигация"><button data-action="today"><span>⌂</span>Сегодня</button><button data-action="prev"><span>‹</span>Неделя</button><button data-action="next"><span>›</span>Далее</button></nav>
  </main>`
}
