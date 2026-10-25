import './ask-prompt.js'

const isSafari = location.protocol.startsWith('safari-web-extension:')

const enabledIcons = {
  16: 'icons/icon16.png',
  32: 'icons/icon32.png',
  48: 'icons/icon48.png',
  64: 'icons/icon64.png',
  96: 'icons/icon96.png',
  128: 'icons/icon128.png',
}

const disabledIcons = {
  16: 'icons/icon16-disabled.png',
  32: 'icons/icon32-disabled.png',
  48: 'icons/icon48-disabled.png',
  64: 'icons/icon64-disabled.png',
  96: 'icons/icon96-disabled.png',
  128: 'icons/icon128-disabled.png',
}

function updateToolbarIcon(enabled) {
  let title = chrome.i18n.getMessage(enabled ? 'extensionName' : 'extensionNameDisabled')
  if (chrome.runtime.getManifest().manifest_version == 3) {
    chrome.action.setTitle({title})
    if (!isSafari) {
      chrome.action.setIcon({path: enabled ? enabledIcons : disabledIcons})
    } else {
      chrome.action.setBadgeText({text: enabled ? '' : '⏻'})
    }
  } else {
    chrome.browserAction.setTitle({title})
    chrome.browserAction.setIcon({path: enabled ? enabledIcons : disabledIcons})
  }
}

// Update browser action icon to reflect enabled state
chrome.storage.local.get({enabled: true}, ({enabled}) => {
  updateToolbarIcon(enabled)
})

chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.enabled) {
    updateToolbarIcon(changes.enabled.newValue)
  }
})

//#region Ask about this tweet
const {ASK_DEFAULTS, buildAskConversation} = globalThis.cpftAsk

/**
 * Collects a tweet's images for API providers, which fetch them by URL. Videos
 * send their thumbnail; only the Codex helper samples video frames.
 */
function getAskImages(context) {
  let posts = [context.post, context.post?.quoted, ...(context.ancestors || []).slice(-2).reverse()].filter(Boolean)
  let images = []
  for (let post of posts) {
    for (let media of post.media || []) {
      if (images.length >= 8 || !media.imageUrl) continue
      let url = new URL(media.imageUrl)
      url.searchParams.set('name', 'medium')
      images.push({
        url: url.toString(),
        label: `${media.videoUrl ? 'thumbnail of a video' : 'photo'} in ${post === context.post ? 'the tweet' : post === context.post.quoted ? 'the quoted tweet' : 'an earlier tweet in the conversation'}`,
      })
    }
  }
  return images
}

async function askWithCodex(request, settings, model, reasoningEffort) {
  if (!chrome.runtime.sendNativeMessage) {
    throw new Error('This browser doesn\'t allow the Codex helper (native messaging is unavailable)')
  }
  let response = await chrome.runtime.sendNativeMessage('com.cpft.ask', {
    type: 'ask',
    ...request,
    model,
    reasoningEffort,
    serviceTier: settings.askFastMode ? 'fast' : null,
    search: settings.askWebSearch,
    extraInstructions: settings.askExtraInstructions,
  })
  if (!response) throw new Error('The ask helper returned no response')
  if (response.error) throw new Error(response.error)
  return response
}

async function fetchJson(url, apiKey, body) {
  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey && {authorization: `Bearer ${apiKey}`}),
    },
    body: JSON.stringify(body),
  })
  let text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`HTTP ${response.status} from ${new URL(url).host}`)
  }
  if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status} from ${new URL(url).host}`)
  return data
}

/** OpenAI's Responses API, which can search the web itself */
async function askWithOpenAI(request, settings, model, reasoningEffort) {
  let images = getAskImages(request.context)
  let {instructions, messages} = buildAskConversation({
    ...request,
    extraInstructions: settings.askExtraInstructions,
    imageLabels: images.map(image => image.label),
  })
  let data = await fetchJson(`${settings.askApiBaseUrl.replace(/\/+$/, '')}/responses`, settings.askApiKey, {
    model,
    instructions,
    input: messages.map((message, index) => ({
      role: message.role,
      content: message.role == 'assistant' ? message.text : [
        {type: 'input_text', text: message.text},
        ...(index == 0 ? images.map(image => ({type: 'input_image', image_url: image.url})) : []),
      ],
    })),
    ...(settings.askWebSearch && {tools: [{type: 'web_search'}]}),
    ...(reasoningEffort && {reasoning: {effort: reasoningEffort}}),
    ...(settings.askFastMode && {service_tier: 'priority'}),
    store: false,
  })
  let answer = ''
  let sources = new Map()
  for (let item of data.output || []) {
    if (item.type != 'message') continue
    for (let part of item.content || []) {
      if (part.type != 'output_text') continue
      answer += part.text
      for (let annotation of part.annotations || []) {
        if (annotation.type == 'url_citation') sources.set(annotation.url, annotation.title || new URL(annotation.url).host)
      }
    }
  }
  // Link cited pages which the answer doesn't already link to
  let unlinked = [...sources].filter(([url]) => !answer.includes(url))
  if (unlinked.length > 0) answer += `\n\nSources: ${unlinked.map(([url, title]) => `[${title}](${url})`).join(' · ')}`
  return {answer: answer.trim(), model: data.model || model}
}

/** Any OpenAI-compatible Chat Completions API, such as OpenRouter or a local server */
async function askWithChatCompletions(request, settings, model, reasoningEffort) {
  let images = getAskImages(request.context)
  let {instructions, messages} = buildAskConversation({
    ...request,
    extraInstructions: settings.askExtraInstructions,
    imageLabels: images.map(image => image.label),
  })
  let data = await fetchJson(`${settings.askApiBaseUrl.replace(/\/+$/, '')}/chat/completions`, settings.askApiKey, {
    model,
    messages: [
      {role: 'system', content: instructions},
      ...messages.map((message, index) => ({
        role: message.role,
        content: message.role == 'assistant' || index > 0 ? message.text : [
          {type: 'text', text: message.text},
          ...images.map(image => ({type: 'image_url', image_url: {url: image.url}})),
        ],
      })),
    ],
    ...(reasoningEffort && {reasoning_effort: reasoningEffort}),
  })
  let answer = data.choices?.[0]?.message?.content
  if (typeof answer != 'string' || !answer.trim()) throw new Error('The API returned an empty answer')
  return {answer: answer.trim(), model: data.model || model}
}

/**
 * @param {{context: any, history?: any[], question?: string | null, deep?: boolean}} request
 */
async function answerAsk(request) {
  // Includes the API key, which is never passed to the page
  let settings = {...ASK_DEFAULTS, ...await chrome.storage.local.get(Object.keys(ASK_DEFAULTS))}
  let model = (request.deep ? settings.askDeepModel : settings.askModel).trim()
  let reasoningEffort = (request.deep ? settings.askDeepReasoningEffort : settings.askReasoningEffort) || null
  if (!model) throw new Error('No model is set in the extension\'s AI options')
  let {context, history, question} = request
  let started = Date.now()
  let ask = {codex: askWithCodex, openai: askWithOpenAI, 'openai-compatible': askWithChatCompletions}[settings.askProvider]
  if (!ask) throw new Error(`Unknown AI provider: ${settings.askProvider}`)
  if (settings.askProvider != 'codex' && !settings.askApiBaseUrl) throw new Error('No API URL is set in the extension\'s AI options')
  let result = await ask({context, history, question}, settings, model, reasoningEffort)
  return {elapsedMs: Date.now() - started, ...result}
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type != 'cpftAsk' || sender.id != chrome.runtime.id) return
  answerAsk(message.request).then(sendResponse, (e) => sendResponse({error: e.message || String(e)}))
  // Respond asynchronously
  return true
})
//#endregion
