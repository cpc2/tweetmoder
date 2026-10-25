// Registers the "Ask about this post" native messaging host for the unpacked
// development extension in Chrome, Brave and Edge (current Windows user only).
//
//   npm run ask-helper:install                      find the extension's id
//   npm run ask-helper:install -- --id <extension>  use a specific id
//   npm run ask-helper:install -- --uninstall       remove the registration
const {execFileSync, execSync} = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const HOST_NAME = 'com.cpft.ask'
const root = path.resolve(__dirname, '..')
const manifestPath = path.join(__dirname, `${HOST_NAME}.json`)
const browsers = {
  Chrome: {registry: 'Software\\Google\\Chrome', data: 'Google/Chrome/User Data'},
  Brave: {registry: 'Software\\BraveSoftware\\Brave-Browser', data: 'BraveSoftware/Brave-Browser/User Data'},
  Edge: {registry: 'Software\\Microsoft\\Edge', data: 'Microsoft/Edge/User Data'},
}

function registryKey(browser) {
  return `HKCU\\${browsers[browser].registry}\\NativeMessagingHosts\\${HOST_NAME}`
}

/** Finds ids of unpacked extensions loaded from this folder in any profile. */
function findExtensionIds() {
  let ids = new Set()
  let localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  for (let {data} of Object.values(browsers)) {
    let userData = path.join(localAppData, data)
    if (!fs.existsSync(userData)) continue
    for (let profile of fs.readdirSync(userData)) {
      for (let file of ['Secure Preferences', 'Preferences']) {
        try {
          let prefs = JSON.parse(fs.readFileSync(path.join(userData, profile, file), 'utf8'))
          for (let [id, settings] of Object.entries(prefs.extensions?.settings || {})) {
            if (settings.path && path.resolve(settings.path).toLowerCase() == root.toLowerCase()) ids.add(id)
          }
        } catch {}
      }
    }
  }
  return [...ids]
}

function which(command) {
  try {
    return execFileSync('where', [command], {encoding: 'utf8'}).split(/\r?\n/).find(line => line.endsWith('.exe')) || null
  } catch {
    return null
  }
}

function findCodexScript() {
  let candidates = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js'),
  ]
  try {
    let globalRoot = execSync('npm root -g', {encoding: 'utf8'}).trim()
    candidates.push(path.join(globalRoot, '@openai', 'codex', 'bin', 'codex.js'))
  } catch {}
  return candidates.find(file => fs.existsSync(file)) || null
}

function uninstall() {
  for (let browser of Object.keys(browsers)) {
    try {
      execFileSync('reg', ['delete', registryKey(browser), '/f'], {stdio: 'ignore'})
      console.log(`Removed ${browser} registration`)
    } catch {}
  }
}

function install() {
  if (process.platform != 'win32') throw new Error('This installer only supports Windows')
  let args = process.argv.slice(2)
  let ids = args.flatMap((arg, index) => arg == '--id' ? [args[index + 1]] : [])
  if (ids.length == 0) ids = findExtensionIds()
  if (ids.length == 0) {
    throw new Error('Load this folder as an unpacked extension first, or pass --id <extension id> (shown on the browser\'s extensions page)')
  }

  let codexScript = findCodexScript()
  if (!codexScript) throw new Error('Codex CLI not found. Install it with npm install -g @openai/codex')

  let configPath = path.join(__dirname, 'config.json')
  let existing = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {}
  let config = {
    model: 'gpt-6-luna',
    reasoningEffort: 'low',
    // Codex's fast mode, if your plan gets it
    serviceTier: 'fast',
    ...existing,
    node: process.execPath,
    codexScript,
    ffmpeg: which('ffmpeg'),
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')

  // The browser launches this, so it can't rely on PATH
  let batPath = path.join(__dirname, 'host.bat')
  fs.writeFileSync(batPath, `@echo off\r\n"${process.execPath}" "%~dp0host.cjs" %*\r\n`)

  fs.writeFileSync(manifestPath, JSON.stringify({
    name: HOST_NAME,
    description: 'Tweetmoder: Ask about this post',
    path: batPath,
    type: 'stdio',
    allowed_origins: ids.map(id => `chrome-extension://${id}/`),
  }, null, 2) + '\n')

  for (let browser of Object.keys(browsers)) {
    execFileSync('reg', ['add', registryKey(browser), '/ve', '/t', 'REG_SZ', '/d', manifestPath, '/f'], {stdio: 'ignore'})
  }

  console.log(`Registered ${HOST_NAME} for Chrome, Brave and Edge`)
  console.log(`Extension ids: ${ids.join(', ')}`)
  console.log(`Model: ${config.model} (${config.reasoningEffort} reasoning), edit ${configPath} to change it`)
  console.log(config.ffmpeg ? `Video frames: ${config.ffmpeg}` : 'ffmpeg not found: videos will only send their thumbnail')
  console.log('Reload the extension, then use the ? button under a post.')
}

try {
  if (process.argv.includes('--uninstall')) uninstall()
  else install()
} catch (e) {
  console.error(e.message)
  process.exitCode = 1
}
