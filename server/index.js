import { load } from './store.js'
import { createApp } from './app.js'

const PORT = Number(process.env.PORT) || 4173

await load()

createApp().listen(PORT, '0.0.0.0', () => {
  // The "localhost:4173" substring is load-bearing: it is what
  // lighthouserc.json's startServerReadyPattern waits for.
  console.log(`Ausflex server listening on http://localhost:${PORT}`)
})
