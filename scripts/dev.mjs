import { spawn } from 'node:child_process'

const node = process.execPath
const children = [
  spawn(node, ['--env-file=.env', 'server/index.mjs'], { stdio: 'inherit', shell: false }),
  spawn(node, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit', shell: false }),
]

const stop = () => children.forEach((child) => child.kill('SIGTERM'))
process.on('SIGINT', () => { stop(); process.exit(0) })
process.on('SIGTERM', () => { stop(); process.exit(0) })
children.forEach((child) => child.on('exit', (code) => { if (code && code !== 0) process.exitCode = code }))
