// `yarn dev` needs two processes: vite for the SPA, Express for /api and
// /uploads. Run vite alone and the proxy just logs "http proxy error:
// /api/content ECONNREFUSED" into the noise of an HMR session while the page
// renders with no vans, no gallery and no tours — a failure that reads like a
// frontend bug. Supervising both here means the API cannot be forgotten.
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:net'

const API_PORT = 3001

const children = []

function run(name, args, env) {
  const child = spawn('yarn', args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  children.push(child)

  child.on('exit', (code, signal) => {
    // One half of the pair is useless without the other, so the first exit
    // takes the whole session down rather than leaving a half-broken dev
    // server that looks like it is working.
    if (shuttingDown) return
    console.error(`\n[dev] ${name} exited (${signal ?? code}) — stopping the other process.`)
    stop(code ?? 1)
  })

  return child
}

let shuttingDown = false

function stop(code) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill('SIGTERM')
  process.exit(code)
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stop(0))
}

// Ask lsof who is on the port so the error can name the process instead of
// making the reader go find it.
function portOwner(port) {
  try {
    const out = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpc'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return { pid: out.match(/^p(\d+)/m)?.[1], command: out.match(/^c(.+)$/m)?.[1] }
  } catch {
    return {}
  }
}

// A second `yarn dev` — another terminal, a leftover background job — is the
// ordinary way this script fails, and vite hides it: vite shrugs and takes
// 5174, then Express dies on EADDRINUSE and drags the session down with a
// stack trace out of node:net that reads like the API crashed rather than
// like the API is already running. Bind the port ourselves first and say so.
function portIsTaken(port) {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', (err) => resolve(err.code === 'EADDRINUSE'))
    probe.once('listening', () => probe.close(() => resolve(false)))
    probe.listen(port)
  })
}

if (await portIsTaken(API_PORT)) {
  const { pid, command } = portOwner(API_PORT)
  const owner = pid ? `${command ?? 'a process'} (pid ${pid})` : 'another process'
  console.error(
    [
      ``,
      `[dev] port ${API_PORT} is already served by ${owner}, so the API cannot start.`,
      `      That is almost always a \`yarn dev\` still running in another terminal`,
      `      or a background job — switch to it, or free the port and retry:`,
      ``,
      pid ? `        kill ${pid}` : `        lsof -nP -iTCP:${API_PORT} -sTCP:LISTEN`,
      ``,
    ].join('\n'),
  )
  process.exit(1)
}

run('api', ['node', '--env-file=.env', 'server/index.js'], { PORT: '3001', DATA_DIR: './.data' })
run('web', ['vite'], {})
