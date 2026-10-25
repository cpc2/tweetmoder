// Tests for the "Ask about this post" background code and content script relay,
// with chrome APIs and fetch mocked.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const {test} = require('node:test')

const root = path.join(__dirname, '..')
const askPrompt = require('../ask-prompt.js')

/**
 * Runs background.js with the given stored settings.
 * @param {{[key: string]: any}} stored
 */
function loadBackground(stored = {}) {
  const listeners = []
  const native = []
  const fetches = []
  const context = {
    URL,
    console,
    location: {protocol: 'chrome-extension:'},
    globalThis: null,
    cpftAsk: askPrompt,
    chrome: {
      i18n: {getMessage: () => ''},
      runtime: {
        id: 'ext',
        getManifest: () => ({manifest_version: 3}),
        onMessage: {addListener: listener => listeners.push(listener)},
        sendNativeMessage: async (host, message) => {
          native.push({host, message})
          return {answer: 'Codex answer', model: message.model}
        },
      },
      action: {setTitle() {}, setIcon() {}, setBadgeText() {}},
      storage: {local: {
        get: (keys, callback) => {
          let values = Object.fromEntries(Object.entries(stored).filter(([key]) => Array.isArray(keys) ? keys.includes(key) : true))
          return callback ? callback({enabled: true, ...values}) : Promise.resolve(values)
        },
        onChanged: {addListener() {}},
      }},
    },
    fetch: async (url, options) => {
      fetches.push({url, options, body: JSON.parse(options.body)})
      return {ok: true, status: 200, text: async () => JSON.stringify(context.nextResponse)}
    },
    nextResponse: null,
  }
  context.globalThis = context
  const source = fs.readFileSync(path.join(root, 'background.js'), 'utf8').replace("import './ask-prompt.js'", '')
  vm.runInNewContext(source, context)
  /** @returns {Promise<any>} */
  const ask = request => new Promise(resolve => {
    listeners[0]({type: 'cpftAsk', request}, {id: 'ext'}, resolve)
  })
  return {ask, native, fetches, context}
}

const context = {
  post: {
    url: 'https://x.com/a/status/1', author: 'A (@a)', createdAt: null, lang: 'en', text: 'wait what',
    media: [{type: 'photo', imageUrl: 'https://pbs.twimg.com/media/x.jpg'}],
  },
  ancestors: [],
  replies: [],
}

test('Codex gets the chosen model, reasoning, fast mode, search and extra instructions', async () => {
  const {ask, native} = loadBackground({askExtraInstructions: 'Be brief'})
  let result = await ask({context, history: [], question: null, deep: false})
  assert.equal(result.answer, 'Codex answer')
  assert.equal(native[0].host, 'com.cpft.ask')
  assert.equal(native[0].message.model, 'gpt-6-luna')
  assert.equal(native[0].message.reasoningEffort, 'low')
  assert.equal(native[0].message.serviceTier, 'fast')
  assert.equal(native[0].message.search, true)
  assert.equal(native[0].message.extraInstructions, 'Be brief')
  await ask({context, history: [], question: null, deep: true})
  assert.equal(native[1].message.model, 'gpt-6.1-sol')
  assert.equal(native[1].message.reasoningEffort, 'medium')
})

test('the OpenAI API gets instructions, images, web search, follow-ups, and links its citations', async () => {
  const {ask, fetches, context: background} = loadBackground({
    askProvider: 'openai', askApiKey: 'sk-test', askModel: 'gpt-test', askFastMode: false,
  })
  background.nextResponse = {model: 'gpt-test', output: [{type: 'message', content: [{
    type: 'output_text', text: 'It is about a launch.',
    annotations: [{type: 'url_citation', url: 'https://example.com/launch', title: 'Launch news'}],
  }]}]}
  let result = await ask({context, history: [{question: null, answer: 'Earlier answer'}], question: 'when?', deep: false})
  let {url, options, body} = fetches[0]
  assert.equal(url, 'https://api.openai.com/v1/responses')
  assert.equal(options.headers.authorization, 'Bearer sk-test')
  assert.equal(body.model, 'gpt-test')
  assert.match(body.instructions, /vaguepost/)
  assert.deepEqual(body.tools, [{type: 'web_search'}])
  assert.deepEqual(body.reasoning, {effort: 'low'})
  assert.equal(body.service_tier, undefined)
  assert.deepEqual(body.input.map(message => message.role), ['user', 'assistant', 'user'])
  assert.equal(body.input[0].content[1].image_url, 'https://pbs.twimg.com/media/x.jpg?name=medium')
  assert.match(body.input[2].content[0].text, /when\?/)
  assert.equal(result.answer, 'It is about a launch.\n\nSources: [Launch news](https://example.com/launch)')
})

test('OpenAI-compatible APIs get a chat completions request at their own URL', async () => {
  const {ask, fetches, context: background} = loadBackground({
    askProvider: 'openai-compatible', askApiBaseUrl: 'http://localhost:11434/v1/', askModel: 'llava', askReasoningEffort: '',
  })
  background.nextResponse = {choices: [{message: {content: 'Local answer'}}]}
  let result = await ask({context, history: [], question: null, deep: false})
  let {url, options, body} = fetches[0]
  assert.equal(url, 'http://localhost:11434/v1/chat/completions')
  assert.equal(options.headers.authorization, undefined, 'no key, no header')
  assert.equal(body.messages[0].role, 'system')
  assert.equal(body.messages[1].content[1].image_url.url, 'https://pbs.twimg.com/media/x.jpg?name=medium')
  assert.equal(body.reasoning_effort, undefined)
  assert.equal(result.answer, 'Local answer')
})

test('API errors come back as messages, not exceptions', async () => {
  const {ask, context: background} = loadBackground({askProvider: 'openai', askApiKey: 'bad'})
  background.fetch = async () => ({ok: false, status: 401, text: async () => JSON.stringify({error: {message: 'Incorrect API key'}})})
  let result = await ask({context, history: [], question: null, deep: false})
  assert.equal(result.error, 'Incorrect API key')
})

test('the content script keeps AI settings away from the page and refuses changes to them', () => {
  const settingsWritten = []
  const stored = {sortReplies: 'liked', askAboutPosts: true, askApiKey: 'sk-secret', askApiBaseUrl: 'https://api.openai.com/v1', askModel: 'm'}
  const elements = []
  const messageListeners = []
  const windowStub = {
    addEventListener: (type, listener) => { if (type == 'message') messageListeners.push(listener) },
    postMessage() {},
  }
  const contextObject = {
    navigator: {userAgent: 'Chrome/150'},
    localStorage: {cpftEnabled: 'false'},
    location: {origin: 'https://x.com'},
    window: windowStub,
    document: {
      documentElement: {append() {}, appendChild: el => elements.push(el)},
      createElement: () => ({}),
    },
    chrome: {
      runtime: {getURL: path => path, sendMessage() {}},
      storage: {
        local: {get: callback => callback({...stored}), set: (changes, callback) => { settingsWritten.push(changes); callback() }},
        onChanged: {addListener() {}, removeListener() {}},
      },
    },
    MutationObserver: class { observe() {} },
  }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'content.js'), 'utf8'), contextObject)
  const injected = JSON.parse(elements.find(el => el.id == 'cpftSettings').innerText)
  assert.equal(injected.sortReplies, 'liked')
  assert.equal(injected.askAboutPosts, true)
  assert.equal('askApiKey' in injected, false)
  assert.equal('askApiBaseUrl' in injected, false)
  assert.equal('askModel' in injected, false)
  // A page script trying to redirect the API key is ignored
  messageListeners[0]({source: windowStub, data: {type: 'cpftConfigChange', changes: {askApiBaseUrl: 'https://evil.example', sortReplies: 'recent'}}})
  assert.deepEqual(JSON.parse(JSON.stringify(settingsWritten)), [{sortReplies: 'recent'}])
})

test('follow-ups are flattened into one prompt for Codex with the earlier answers', () => {
  const conversation = askPrompt.buildAskConversation({
    context, history: [{question: null, answer: 'First'}], question: 'who?', imageLabels: ['photo 1 in the post'],
  })
  const prompt = askPrompt.flattenAskConversation(conversation)
  assert.match(prompt, /<tweet_data>/)
  assert.match(prompt, /1\. photo 1 in the post/)
  assert.match(prompt, /You: First/)
  assert.match(prompt, /The reader asks: who\?$/)
})
