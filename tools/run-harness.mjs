import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const url = process.argv[2] || 'file:///private/tmp/rt-harness.html'
const shot = process.argv[3] || ''
const width = Number(process.argv[4] || 1100)
const height = Number(process.argv[5] || 860)
const profileDir = mkdtempSync(join(tmpdir(), 'rt-chrome-'))
const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--user-data-dir=' + profileDir, '--window-size=' + width + ',' + height,
  '--virtual-time-budget=15000', '--run-all-compositor-stages-before-draw']
if (shot) args.push('--screenshot=' + shot)
args.push('--dump-dom', url)
const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] })
let out = ''
let err = ''
child.stdout.on('data', d => { out += d })
child.stderr.on('data', d => { err += d })
child.on('close', () => {
  const title = (out.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '(no title)'
  const log = (out.match(/<pre id="log"[^>]*>([\s\S]*?)<\/pre>/) || [])[1] || ''
  console.log('TITLE: ' + title)
  if (log) console.log(decodeEntities(log))
  if (title !== 'ALL PASS' && !/ALL PASS/.test(title)) console.log('STDERR: ' + err.split('\n').slice(-6).join('\n'))
})
function decodeEntities(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
}
