import type { GroupCatalog, Timetable, University } from './types'

const ROOT = 'https://raw.githubusercontent.com/vlustin/timetable-data/main'
const IDS = new Set(['moscow-rut-miit', 'saint-petersburg-spbgu'])
const oldIds: Record<string, string> = { 'rut-miit': 'moscow-rut-miit', spbu: 'saint-petersburg-spbgu', spbgu: 'saint-petersburg-spbgu' }

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${ROOT}/${path}`, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Не удалось загрузить данные (${response.status})`)
  return response.json() as Promise<T>
}

export async function getUniversities(): Promise<University[]> {
  const data = await getJson<{ universities: University[] }>('universities.json')
  return data.universities.map(university => ({ ...university, id: oldIds[university.id] ?? university.id }))
    .filter(university => IDS.has(university.id))
}

export async function getGroups(universityId: string): Promise<GroupCatalog> {
  if (!IDS.has(universityId)) throw new Error('Неизвестный вуз')
  if (import.meta.env.DEV && universityId === 'moscow-rut-miit') {
    const response = await fetch(`/__local-data/${universityId}/groups.json`, { cache: 'no-store' })
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) return response.json() as Promise<GroupCatalog>
  }
  const data = await getJson<GroupCatalog>(`${universityId}/groups.json`)
  if (data.schemaVersion !== 2 || !Array.isArray(data.institutes)) throw new Error('Каталог групп ещё не обновлён. Попробуйте позже.')
  return data
}

export async function getTimetable(universityId: string, groupId: string): Promise<Timetable> {
  if (!IDS.has(universityId) || !/^[\w-]+$/.test(groupId)) throw new Error('Некорректная группа')
  if (import.meta.env.DEV && universityId === 'moscow-rut-miit') {
    const response = await fetch(`/__local-data/${universityId}/timetables/${groupId}.json`, { cache: 'no-store' })
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) return response.json() as Promise<Timetable>
  }
  return getJson<Timetable>(`${universityId}/timetables/${groupId}.json`)
}
