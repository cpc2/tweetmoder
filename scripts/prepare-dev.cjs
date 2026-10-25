// Prepare an unpacked Chromium extension with an identifiable development name.
// This only writes generated, ignored files; release manifests stay unchanged.
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const options = fs.readFileSync(path.join(root, 'options.html'), 'utf8')
fs.writeFileSync(path.join(root, 'browser_action.html'), options.replace('<body>', '<body class="browserAction">'))
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.mv3.json'), 'utf8'))
manifest.name = 'Tweetmoder (Dev)'
manifest.version_name = `${manifest.version} dev`
// "Ask about this post" talks to a local helper (see ask-helper/install.cjs)
manifest.permissions = [...new Set([...(manifest.permissions || []), 'nativeMessaging'])]
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`Ready to load unpacked: ${root}`)
console.log(`Development extension: ${manifest.name}`)
