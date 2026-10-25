// Native messaging host for "Ask about this post". The browser starts this
// process for each request, sends one message with the post's context, and
// gets back an explanation written by Codex (with web search enabled).
//
// Install it with `npm run ask-helper:install`, which writes config.json,
// host.bat and the native messaging manifest next to this file.
const {spawn} = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const {buildAskConversation, flattenAskConversation} = require('../ask-prompt.js')

const CONFIG_PATH = path.join(__dirname, 'config.json')
const LOG_PATH = path.join(__dirname, 'host.log')
const MEDIA_HOSTS = new Set(['pbs.twimg.com', 'video.twimg.com'])
const MAX_IMAGES = 8
const MAX_VIDEO_BYTES = 40 * 1024 * 1024
const VIDEO_FRAMES = [0.1, 0.35, 0.6, 0.85]
const CODEX_TIMEOUT_MS = 150_000
// Codex runs with no shell or app tools: post contents are untrusted, so it
// only gets web search and the images we attach.
const DISABLED_FEATURES = [
  'shell_tool', 'unified_exec', 'apps', 'plugins', 'remote_plugin', 'browser_use',
  'browser_use_external', 'computer_use', 'image_generation', 'in_app_browser',
  'multi_agent', 'goals',
]

function log(...args) {
  try {
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${args.join(' ')}\n`)
  } catch {}
}

function readConfig() {
  let config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  return {model: 'gpt-6-luna', reasoningEffort: 'low', ...config}
}

/** Reads one length-prefixed native message from stdin. */
function readMessage() {
  return new Promise((resolve, reject) => {
    let chunks = []
    let size = 0
    process.stdin.on('data', chunk => {
      chunks.push(chunk)
      size += chunk.length
      let buffer = Buffer.concat(chunks, size)
      if (buffer.length < 4) return
      let length = buffer.readUInt32LE(0)
      if (buffer.length < 4 + length) return
      process.stdin.pause()
      try {
        resolve(JSON.parse(buffer.subarray(4, 4 + length).toString('utf8')))
      } catch (e) {
        reject(e)
      }
    })
    process.stdin.on('end', () => reject(new Error('stdin closed before a message was received')))
  })
}

function writeMessage(message) {
  let json = Buffer.from(JSON.stringify(message), 'utf8')
  let header = Buffer.alloc(4)
  header.writeUInt32LE(json.length, 0)
  process.stdout.write(Buffer.concat([header, json]))
}

/** @param {string} url */
function isMediaUrl(url) {
  try {
    let parsed = new URL(url)
    return parsed.protocol == 'https:' && MEDIA_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

async function download(url, file, maxBytes) {
  if (!isMediaUrl(url)) throw new Error(`refusing to download ${url}`)
  let response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  let length = Number(response.headers.get('content-length') || 0)
  if (length > maxBytes) throw new Error(`${url} is too large`)
  let buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length > maxBytes) throw new Error(`${url} is too large`)
  fs.writeFileSync(file, buffer)
}

function run(command, args, {input, timeoutMs, cwd} = {}) {
  return new Promise((resolve, reject) => {
    let child = spawn(command, args, {cwd, windowsHide: true})
    let stdout = ''
    let stderr = ''
    let timer = setTimeout(() => {
      // Codex starts a native binary, so stop the whole process tree
      if (process.platform == 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {windowsHide: true})
      else child.kill('SIGKILL')
      reject(new Error(`${path.basename(command)} timed out`))
    }, timeoutMs ?? 60_000)
    child.stdout.on('data', data => stdout += data)
    child.stderr.on('data', data => stderr += data)
    child.on('error', e => { clearTimeout(timer); reject(e) })
    child.on('close', code => {
      clearTimeout(timer)
      if (code == 0) resolve(stdout)
      else reject(new Error(`${path.basename(command)} exited with ${code}: ${(stderr || stdout).trim().slice(-500)}`))
    })
    if (input != null) child.stdin.end(input)
    else child.stdin.end()
  })
}

/**
 * Downloads photos and samples frames from videos, in order of importance:
 * the post, its quoted post, then the posts it replies to.
 * @returns {Promise<{file: string, label: string}[]>}
 */
async function prepareImages(context, dir, config) {
  let posts = [
    ['the tweet', context.post],
    ['the quoted tweet', context.post?.quoted],
    ...(context.ancestors || []).slice(-2).reverse().map(post => ['an earlier tweet in the conversation', post]),
  ].filter(([, post]) => post)
  let images = []
  for (let [owner, post] of posts) {
    for (let [index, media] of (post.media || []).entries()) {
      if (images.length >= MAX_IMAGES) return images
      let base = path.join(dir, `media-${images.length + 1}`)
      try {
        if (media.videoUrl && config.ffmpeg && media.durationMs > 0) {
          let video = `${base}.mp4`
          await download(media.videoUrl, video, MAX_VIDEO_BYTES)
          for (let fraction of VIDEO_FRAMES) {
            if (images.length >= MAX_IMAGES) break
            let seconds = (media.durationMs / 1000) * fraction
            let file = `${base}-${Math.round(fraction * 100)}.jpg`
            await run(config.ffmpeg, ['-v', 'error', '-ss', seconds.toFixed(2), '-i', video, '-frames:v', '1', '-vf', 'scale=768:-2', '-y', file], {timeoutMs: 30_000})
            let time = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
            images.push({file, label: `frame at ${time} of ${media.type == 'animated_gif' ? 'GIF' : 'video'} ${index + 1} in ${owner}`})
          }
        } else if (media.imageUrl) {
          let url = new URL(media.imageUrl)
          url.searchParams.set('name', 'medium')
          let file = `${base}.jpg`
          await download(url.toString(), file, 10 * 1024 * 1024)
          images.push({file, label: media.videoUrl ? `thumbnail of video ${index + 1} in ${owner}` : `photo ${index + 1} in ${owner}`})
        }
      } catch (e) {
        log('media error', e.message)
      }
    }
  }
  return images
}

/**
 * @param {{context: any, history?: any[], question?: string | null, extraInstructions?: string}} request
 * @param {{label: string}[]} images
 */
function buildPrompt(request, images) {
  return flattenAskConversation(buildAskConversation({...request, imageLabels: images.map(image => image.label)}))
}

/** Model names and settings from the extension end up in Codex's arguments */
const SAFE_SETTING_RE = /^[\w.:-]{1,64}$/

/**
 * @param {{context: any, history?: any[], question?: string | null, extraInstructions?: string,
 *   model?: string, reasoningEffort?: string, serviceTier?: string | null, search?: boolean}} request
 */
async function ask(request) {
  let config = readConfig()
  // The extension's settings choose the model; config.json is the fallback
  let model = SAFE_SETTING_RE.test(request.model || '') ? request.model : config.model
  let effort = SAFE_SETTING_RE.test(request.reasoningEffort || '') ? request.reasoningEffort : config.reasoningEffort
  let serviceTier = request.serviceTier === undefined ? config.serviceTier : request.serviceTier
  if (serviceTier && !SAFE_SETTING_RE.test(serviceTier)) serviceTier = null
  let dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpft-ask-'))
  try {
    let images = await prepareImages(request.context, dir, config)
    let output = path.join(dir, 'answer.md')
    let args = [
      config.codexScript,
      ...(request.search !== false ? ['--search'] : []),
      'exec',
      '-m', model,
      '-c', `model_reasoning_effort="${effort}"`,
      // Codex's fast mode, sent to the API as the "priority" tier
      ...(serviceTier ? ['-c', `service_tier="${serviceTier}"`] : []),
      '--ignore-user-config',
      '--ignore-rules',
      '--skip-git-repo-check',
      '--ephemeral',
      '-s', 'read-only',
      ...DISABLED_FEATURES.flatMap(feature => ['--disable', feature]),
      '-C', dir,
      '-o', output,
      // Read the prompt from stdin, before -i, which takes multiple values
      '-',
      ...images.flatMap(image => ['-i', image.file]),
    ]
    let started = Date.now()
    await run(config.node, args, {input: buildPrompt(request, images), timeoutMs: CODEX_TIMEOUT_MS, cwd: dir})
    let answer = fs.readFileSync(output, 'utf8').trim()
    if (!answer) throw new Error('Codex returned an empty answer')
    return {answer, model, images: images.length, elapsedMs: Date.now() - started}
  } finally {
    fs.rmSync(dir, {recursive: true, force: true})
  }
}

async function main() {
  let message
  try {
    message = await readMessage()
    if (message?.type == 'ping') {
      writeMessage({ok: true, model: readConfig().model})
      return
    }
    if (message?.type != 'ask' || !message.context?.post) throw new Error('Invalid request')
    let result = await ask(message)
    log('answered', message.context.post.url, `${result.elapsedMs}ms`, `${result.images} images`)
    writeMessage(result)
  } catch (e) {
    log('error', e.stack || e.message)
    writeMessage({error: e.message})
  }
}

module.exports = {buildPrompt, isMediaUrl, prepareImages}

if (require.main === module) {
  main().finally(() => setTimeout(() => process.exit(0), 50))
}
