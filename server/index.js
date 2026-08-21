import { load } from './store.js'
import { createApp } from './app.js'

const PORT = Number(process.env.PORT) || 4173

await load()

// '::' binds dual-stack (IPv6 plus IPv4-mapped), not IPv6-only. Railway's
// edge proxy reaches the container over IPv6, so the previous '0.0.0.0'
// bind made every public request 502 with "Application failed to respond"
// even though the container was healthy and listening.
createApp().listen(PORT, '::', () => {
  // The "localhost:4173" substring is load-bearing: it is what
  // lighthouserc.json's startServerReadyPattern waits for.
  console.log(`Ausflex server listening on http://localhost:${PORT}`)
})
