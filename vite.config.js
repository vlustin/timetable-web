import { defineConfig } from 'vite'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Local parser output is visible in development before publishing timetable-data.
const dataRoot = fileURLToPath(new URL('../timetable-data/', import.meta.url))
export default defineConfig({
  plugins: [{
    name: 'local-timetable-data',
    configureServer(server) {
      server.middlewares.use('/__local-data', async (request, response, next) => {
        const relative = (request.url || '').split('?')[0].replace(/^\//, '')
        if (!/^moscow-rut-miit\/(?:groups\.json|timetables\/[\w-]+\.json)$/.test(relative)) { next(); return }
        try {
          const content = await readFile(path.join(dataRoot, relative), 'utf8')
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(content)
        } catch { next() }
      })
    },
  }],
})
