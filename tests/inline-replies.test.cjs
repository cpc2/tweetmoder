const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const {test} = require('node:test')
const {JSDOM} = require('jsdom')

const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8')
const region = source.slice(source.indexOf('//#region Inline replies'), source.indexOf('//#region CSS'))
const selectorsStart = source.indexOf('const Selectors = {')
const selectors = source.slice(selectorsStart, source.indexOf('\n}', selectorsStart) + 2)

function setup(t) {
  const dom = new JSDOM('<div data-testid="primaryColumn"><section><h1>Timeline</h1><div aria-label="Timeline"><div id="timeline"></div></div></section></div>', {
    url: 'https://x.com/home', runScripts: 'outside-only',
  })
  t.after(() => dom.window.close())
  const window = dom.window
  Object.assign(window, {
    config: {enabled: true, inlineReplies: true, sortReplies: 'relevant'},
    lang: 'en', mobile: false,
    URL_TWEET_BASE_RE: /^\/(\w+)\/status\/(\d+)/,
    getApiHeaders: () => ({'x-csrf-token': 'test-only'}),
    getTweetInfo: () => ({reply_count: 1}),
    getString: () => 'Show more replies',
    isOnIndividualTweetPage: () => /^\/\w+\/status\/\d+/.test(window.location.pathname),
    log() {}, warn() {}, error() {}, scrollBy() {},
    fetch: async () => { throw Error('Unexpected fetch') },
  })
  Object.defineProperty(window, 'currentPagePath', {get: () => window.location.pathname})
  const navigations = []
  window.History_push = target => navigations.push(target)
  vm.runInContext(`${selectors}\n${region}\nthis.api = {
    parseInlineReply, renderTweetText, rememberTweetDetailRequest, fetchInlineReplies,
    getInlineReplies, loadMoreInlineReplies, showMoreInlineReplies,
    createInlineReply, createInlineRepliesContainer, fillInlineReplies,
    toggleInlineReplyTranslation, interceptTimelineTweetClicks,
    restoreTimelineInlineReplies, removeTimelineInlineReplies, onInlineRepliesClick,
    inlineReplies, inlineReplyTweets, inlineReplyTranslations, expandedInlineReplies, expandedTimelinePosts,
    getQuoteConversation, getQuotePreviewTarget, openQuoteReader, closeQuoteReader,
    createQuoteReaderPost, createReaderMedia, getPreviewImageUrl,
    interceptQuoteAndImagePreviews, getHoverImage, showImagePreview, hideImagePreview,
    fetchQuoteList, openQuoteList, loadMoreQuotePosts, backInQuoteReader, addTweetActionButtons,
    toggleAskPanel, getAskPost, renderAskAnswer, interceptAskClicks, askThreads, openAskPanels, askPanelsInReader,
    rememberQuoteSearchRequest, createQuoteListItem,
    askAboutPost, createAskPanel, interceptKeyboardShortcuts, toggleInlineReplyLike, replyToInlineReply,
    get readerState() { return quoteReaderState },
    get imagePreview() { return imagePreview },
  }`, dom.getInternalVMContext())
  return {window, document: window.document, api: window.api, navigations}
}

function tweet(id, parent = '100', overrides = {}) {
  return {
    __typename: 'Tweet', rest_id: id,
    core: {user_results: {result: {
      core: {screen_name: `user${id}`, name: `User ${id}`},
      avatar: {image_url: 'https://example.com/avatar.png'},
    }}},
    legacy: {
      id_str: id, in_reply_to_status_id_str: parent,
      created_at: 'Fri Oct 23 10:00:00 +0000 2026', lang: 'es',
      full_text: `Reply ${id}`, favorite_count: 3, reply_count: 1,
      ...overrides,
    },
  }
}

const item = result => ({item: {itemContent: {tweet_results: {result}}}})
const moduleEntry = (...results) => ({entryId: 'conversationthread-1', content: {items: results.map(item)}})
const cursorEntry = value => ({entryId: 'cursor-bottom-1', content: {cursorType: 'Bottom', value}})
const body = (...entries) => ({data: {threaded_conversation_with_injections_v2: {instructions: [{type: 'TimelineAddEntries', entries}]}}})
const response = data => ({ok: true, json: async () => data})
const flush = () => new Promise(resolve => setImmediate(resolve))

function addTweet(document, id = '100') {
  const article = document.createElement('article')
  article.dataset.testid = 'tweet'
  article.innerHTML = `<a href="/author/status/${id}"><time>Now</time></a><div data-testid="tweetText">Post text</div><button>Reply</button><div role="link">Quote</div>`
  document.querySelector('#timeline').append(article)
  return article
}

function click(window, element, options = {}) {
  const event = new window.MouseEvent('click', {bubbles: true, cancelable: true, button: 0, ...options})
  element.dispatchEvent(event)
  return event
}

test('parses visibility wrappers, modern user fields and long posts', t => {
  const {api} = setup(t)
  const result = tweet('101')
  result.note_tweet = {note_tweet_results: {result: {text: 'A long post', entity_set: {urls: []}}}}
  // As X sends it for posts with limited replies: the inner tweet has no __typename
  delete result.__typename
  const reply = api.parseInlineReply({__typename: 'TweetWithVisibilityResults', limitedActionResults: {}, tweet: result})
  assert.equal(reply.path, '/user101/status/101')
  assert.equal(reply.name, 'User 101')
  assert.equal(reply.text, 'A long post')
  assert.equal(reply.displayTextRange, null)
  assert.equal(api.parseInlineReply({__typename: 'TweetTombstone'}), null)
})

test('renders Unicode entity indices and treats markup as text', t => {
  const {api, document} = setup(t)
  const container = document.createElement('div')
  container.append(api.renderTweetText('😀 @alice &lt;script&gt; https://t.co/m', {
    user_mentions: [{screen_name: 'alice', indices: [2, 8]}],
    media: [{indices: [24, 38]}],
  }, null))
  assert.equal(container.querySelector('a').textContent, '@alice')
  assert.equal(container.querySelector('script'), null)
  assert.equal(container.textContent.trimEnd(), '😀 @alice <script>')
})

test('extracts direct replies from modules, standalone entries and appended modules', async t => {
  const {api, window} = setup(t)
  const data = body(
    moduleEntry(tweet('100', null), tweet('101'), tweet('102', '101'), tweet('103')),
    {entryId: 'tweet-104', content: {itemContent: {tweet_results: {result: tweet('104')}}}},
    {entryId: 'promoted-105', content: {itemContent: {promotedMetadata: {}, tweet_results: {result: tweet('105')}}}},
  )
  data.data.threaded_conversation_with_injections_v2.instructions.push(
    {type: 'TimelineAddToModule', moduleItems: [item(tweet('106'))]},
    {type: 'TimelineReplaceEntry', entry: cursorEntry('next')},
  )
  window.fetch = async () => response(data)
  const result = await api.fetchInlineReplies('100', null)
  assert.deepEqual(Array.from(result.replies, reply => reply.id), ['101', '103', '104', '106'])
  assert.equal(result.cursor, 'next')
})

test('uses captured query settings, requested sort, credentials and cursor', async t => {
  const {api, window} = setup(t)
  api.rememberTweetDetailRequest('https://x.com/i/api/graphql/current/TweetDetail?features=%7B%22flag%22%3Atrue%7D&fieldToggles=%7B%7D')
  window.config.sortReplies = 'recent'
  window.fetch = async (url, options) => {
    const request = new URL(url, window.location.origin)
    const variables = JSON.parse(request.searchParams.get('variables'))
    assert.equal(request.pathname, '/i/api/graphql/current/TweetDetail')
    assert.equal(request.searchParams.get('features'), '{"flag":true}')
    assert.equal(variables.rankingMode, 'Recency')
    assert.equal(variables.cursor, 'next')
    assert.equal(variables.includePromotedContent, false)
    assert.equal(options.credentials, 'include')
    return response(body())
  }
  await api.fetchInlineReplies('100', 'next')
})

test('deduplicates each page and advances through empty pages until the cursor repeats', async t => {
  const {api, window} = setup(t)
  const pages = [
    body(moduleEntry(tweet('101'), tweet('101')), cursorEntry('a')),
    body(moduleEntry(tweet('101')), cursorEntry('b')),
    body(cursorEntry('c')),
    body(moduleEntry(tweet('102')), cursorEntry('c')),
  ]
  let calls = 0
  window.fetch = async () => response(pages[calls++])
  const state = api.getInlineReplies('100', '/author/status/100', 1)
  await flush()
  assert.equal(state.replies.length, 1)
  assert.equal(state.cursor, 'a')
  await api.loadMoreInlineReplies('100')
  assert.equal(state.cursor, 'b')
  await api.loadMoreInlineReplies('100')
  assert.equal(state.cursor, 'c')
  await api.loadMoreInlineReplies('100')
  assert.deepEqual(Array.from(state.replies, reply => reply.id), ['101', '102'])
  assert.equal(state.cursor, null)
})

test('shows five replies at a time before fetching another page', async t => {
  const {api, window} = setup(t)
  let calls = 0
  window.fetch = async () => {
    calls++
    return response(body(moduleEntry(...Array.from({length: 12}, (_, i) => tweet(String(101 + i)))), cursorEntry('next')))
  }
  const state = api.getInlineReplies('100', '/author/status/100', null)
  await flush()
  assert.equal(state.shown, 5)
  api.showMoreInlineReplies('100')
  assert.equal(state.shown, 10)
  api.showMoreInlineReplies('100')
  assert.equal(state.shown, 12)
  assert.equal(calls, 1)
})

test('offers pagination after an empty first page despite a stale reply count', async t => {
  const {api, window, document} = setup(t)
  window.fetch = async () => response(body(cursorEntry('next')))
  const container = api.createInlineRepliesContainer('100', '/author/status/100', 0)
  document.body.append(container)
  await flush()
  assert.equal(container.getAttribute('aria-busy'), 'false')
  assert.equal(container.querySelector('[data-action="more"]').textContent, 'Show more replies')
  assert.doesNotMatch(container.textContent, /No replies/)
})

test('HTTP failures have retry and native navigation fallbacks, and retry succeeds', async t => {
  const {api, window, document} = setup(t)
  window.fetch = async () => ({ok: false, status: 429})
  const container = api.createInlineRepliesContainer('100', '/author/status/100', null)
  document.body.append(container)
  await flush()
  assert.match(container.textContent, /HTTP 429/)
  assert.equal(container.querySelector('a').pathname, '/author/status/100')
  window.fetch = async () => response(body(moduleEntry(tweet('101'))))
  api.showMoreInlineReplies('100')
  await flush()
  assert.equal(api.inlineReplies.get('100').status, 'loaded')
  assert.equal(container.querySelectorAll('.cpftInlineReply').length, 1)
})

test('discarding state prevents an in-flight response from repopulating caches', async t => {
  const {api, window} = setup(t)
  let resolve
  window.fetch = () => new Promise(done => { resolve = done })
  api.getInlineReplies('100', '/author/status/100', null)
  api.removeTimelineInlineReplies()
  resolve(response(body(moduleEntry(tweet('101')))))
  await flush()
  assert.equal(api.inlineReplies.size, 0)
  assert.equal(api.inlineReplyTweets.size, 0)
})

test('timeline text clicks expand and collapse without navigation; native controls are preserved', async t => {
  const {api, window, document, navigations} = setup(t)
  const article = addTweet(document)
  let calls = 0
  window.fetch = async () => { calls++; return response(body(moduleEntry(tweet('101')))) }
  api.interceptTimelineTweetClicks()
  for (const selector of ['button', '[role="link"]']) {
    assert.equal(click(window, article.querySelector(selector)).defaultPrevented, false)
  }
  const text = article.querySelector('[data-testid="tweetText"]')
  for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
    assert.equal(click(window, text, {[modifier]: true}).defaultPrevented, false)
  }
  assert.equal(click(window, text).defaultPrevented, true)
  await flush()
  assert.equal(document.querySelectorAll('.cpftRepliesRoot').length, 1)
  assert.equal(navigations.length, 0)
  click(window, text)
  assert.equal(document.querySelectorAll('.cpftRepliesRoot').length, 0)
  click(window, text)
  assert.equal(calls, 1, 'reopening uses cached replies')
})

test('selected text and the tweet a page is about keep normal click behavior', t => {
  const {api, window, document} = setup(t)
  const article = addTweet(document)
  const text = article.querySelector('[data-testid="tweetText"]')
  api.interceptTimelineTweetClicks()
  const range = document.createRange()
  range.selectNodeContents(text)
  window.getSelection().addRange(range)
  assert.equal(click(window, text).defaultPrevented, false)
  window.getSelection().removeAllRanges()
  // Its replies are already showing below it
  window.history.replaceState({}, '', '/author/status/100')
  assert.equal(click(window, text).defaultPrevented, false)
  assert.equal(document.querySelector('.cpftRepliesRoot'), null)
})

test('replies on a tweet page expand in place like timeline tweets', t => {
  const {api, window, document} = setup(t)
  window.history.replaceState({}, '', '/author/status/100')
  addTweet(document, '100')
  const reply = addTweet(document, '101')
  api.interceptTimelineTweetClicks()
  assert.equal(click(window, reply.querySelector('[data-testid="tweetText"]')).defaultPrevented, true)
  assert.equal(reply.nextElementSibling.classList.contains('cpftRepliesRoot'), true)
  assert.equal(reply.nextElementSibling.dataset.tweetId, '101')
  // Put back after Twitter re-renders the reply
  reply.nextElementSibling.remove()
  api.restoreTimelineInlineReplies(document.querySelector('#timeline'))
  assert.equal(reply.nextElementSibling?.dataset.tweetId, '101')
  assert.equal(window.location.pathname, '/author/status/100')
})

test('nested replies expand and collapse independently from their parent', async t => {
  const {api, window, document} = setup(t)
  const article = addTweet(document)
  window.fetch = async url => {
    const id = JSON.parse(new URL(url, window.location.origin).searchParams.get('variables')).focalTweetId
    return response(body(moduleEntry(tweet(id == '100' ? '101' : '102', id))))
  }
  api.interceptTimelineTweetClicks()
  click(window, article.querySelector('[data-testid="tweetText"]'))
  await flush()
  click(window, document.querySelector('[data-action="toggle"]'))
  await flush()
  assert.equal(document.querySelectorAll('.cpftInlineReply').length, 2)
  const nested = document.querySelector('.cpftInlineReply > .cpftReplies')
  click(window, nested.querySelector(':scope > .cpftInlineRepliesStatus [data-action="collapse"]'))
  assert.equal(document.querySelectorAll('.cpftInlineReply').length, 1)
  assert.equal(api.expandedTimelinePosts.has('100'), true)
  assert.equal(api.expandedInlineReplies.has('101'), false)
})

test('restores virtualized posts and removes replies when a row is recycled', async t => {
  const {api, window, document} = setup(t)
  const article = addTweet(document)
  window.fetch = async () => response(body())
  api.interceptTimelineTweetClicks()
  click(window, article.querySelector('[data-testid="tweetText"]'))
  await flush()
  document.querySelector('.cpftRepliesRoot').remove()
  const timeline = document.querySelector('#timeline')
  api.restoreTimelineInlineReplies(timeline)
  assert.equal(document.querySelector('.cpftRepliesRoot').dataset.tweetId, '100')
  article.querySelector('a').href = '/other/status/200'
  api.restoreTimelineInlineReplies(timeline)
  assert.equal(document.querySelector('.cpftRepliesRoot'), null)
})

test('translations can be hidden and shown without refetching, with text rendered safely', async t => {
  const {api, window, document} = setup(t)
  const reply = api.parseInlineReply(tweet('101'))
  api.inlineReplyTweets.set(reply.id, reply)
  document.body.append(api.createInlineReply(reply))
  let calls = 0
  window.fetch = async () => {
    calls++
    return response({translationState: 'Success', translation: '<img src=x onerror=alert(1)>', localizedSourceLanguage: 'Spanish'})
  }
  await api.toggleInlineReplyTranslation('101')
  // The translation replaces the original text, like X's own translations
  assert.match(document.querySelector('.cpftInlineReplyNote').textContent, /Translated from Spanish · Show original/)
  assert.equal(document.querySelector('.cpftInlineReplyText').textContent, '<img src=x onerror=alert(1)>')
  assert.equal(document.querySelector('.cpftInlineReplyText img'), null)
  await api.toggleInlineReplyTranslation('101')
  assert.equal(document.querySelector('.cpftInlineReplyText').textContent, 'Reply 101')
  assert.equal(document.querySelector('.cpftInlineReplyNote').textContent, 'Show translation')
  await api.toggleInlineReplyTranslation('101')
  assert.equal(calls, 1)
})

test('replies in other languages are translated automatically, once', async t => {
  const {api, window, document} = setup(t)
  window.config.autoTranslateReplies = true
  let requested = []
  window.fetch = async url => {
    requested.push(String(url))
    return response({translationState: 'Success', translation: 'Translated 101', localizedSourceLanguage: 'Spanish'})
  }
  const spanish = api.parseInlineReply(tweet('101'))
  const english = api.parseInlineReply(tweet('102', '100', {lang: 'en'}))
  for (let reply of [spanish, english]) {
    api.inlineReplyTweets.set(reply.id, reply)
    document.body.append(api.createInlineReply(reply))
  }
  assert.equal(document.querySelector('[data-tweet-id="101"] .cpftInlineReplyNote').textContent, 'Translating…')
  await flush()
  await flush()
  assert.equal(requested.length, 1)
  assert.match(requested[0], /tweetId=101,/)
  assert.equal(document.querySelector('[data-tweet-id="101"] .cpftInlineReplyText').textContent, 'Translated 101')
  assert.equal(document.querySelector('[data-tweet-id="102"] .cpftInlineReplyNote'), null)
  // Re-rendering doesn't translate again
  document.body.append(api.createInlineReply(spanish))
  await flush()
  assert.equal(requested.length, 1)
})

test('languages you read are never translated automatically, but can still be translated by hand', async t => {
  const {api, window, document} = setup(t)
  window.config.autoTranslateReplies = true
  window.config.dontTranslateLanguages = 'en, ES,ca'
  let requested = []
  window.fetch = async url => {
    requested.push(String(url))
    return response({translationState: 'Success', translation: 'Translated', localizedSourceLanguage: 'Spanish'})
  }
  const replies = [tweet('101'), tweet('102', '100', {lang: 'ca'}), tweet('103', '100', {lang: 'fr'})].map(api.parseInlineReply)
  for (let reply of replies) {
    api.inlineReplyTweets.set(reply.id, reply)
    document.body.append(api.createInlineReply(reply))
  }
  await flush()
  await flush()
  assert.equal(requested.length, 1)
  assert.match(requested[0], /tweetId=103,/)
  assert.ok(document.querySelector('[data-tweet-id="101"] button[data-action="translate"]'))
})

test('internal links navigate within X while explicit new-tab links keep their target', t => {
  const {api, window, document, navigations} = setup(t)
  const root = document.createElement('div')
  root.addEventListener('click', api.onInlineRepliesClick)
  root.innerHTML = '<a href="/author">Profile</a><a target="_blank" href="/author/status/100">Shared URL</a>'
  document.body.append(root)
  assert.equal(click(window, root.firstElementChild).defaultPrevented, true)
  assert.equal(navigations[0].pathname, '/author')
  assert.equal(click(window, root.lastElementChild).defaultPrevented, false)
  assert.equal(navigations.length, 1)
})

function quotedTweet(id, quotedId = '100', parent = null) {
  const result = tweet(id, parent, {quoted_status_id_str: quotedId, quote_count: 2})
  result.quoted_status_result = {result: tweet(quotedId, null)}
  return result
}

const searchBody = (...entries) => ({data: {search_by_raw_query: {search_timeline: {timeline: {instructions: [{type: 'TimelineAddEntries', entries}]}}}}})

test('retains media and reply references in nested quoted posts without recursing forever', t => {
  const {api} = setup(t)
  const result = quotedTweet('101')
  result.quoted_status_result.result.legacy.in_reply_to_status_id_str = '99'
  result.quoted_status_result.result.legacy.extended_entities = {media: [{type: 'photo', media_url_https: 'https://pbs.twimg.com/media/test.jpg'}]}
  result.quoted_status_result.result.quoted_status_result = {result}
  const parsed = api.parseInlineReply(result)
  assert.equal(parsed.quoted.inReplyToId, '99')
  assert.equal(parsed.quoted.media.length, 1)
  assert.equal(parsed.quoted.quoted.quoted.quoted, null)
})

test('reads a quoted post\'s own quote from nested_quoted_tweet_results', t => {
  const {api} = setup(t)
  const result = quotedTweet('101', '200')
  result.quoted_status_result.result.legacy.quoted_status_id_str = '300'
  result.quoted_status_result.result.nested_quoted_tweet_results = {result: tweet('300', null)}
  const parsed = api.parseInlineReply(result)
  assert.equal(parsed.quoted.quoted.id, '300')
  assert.equal(parsed.quoted.quoteUnavailable, false)
})

test('shows poll results once a poll has ended or you voted, and hides them while you can still vote', t => {
  const {api, document} = setup(t)
  const pollTweet = (values) => {
    const result = tweet('101')
    result.card = {legacy: {name: 'poll3choice_text_only', binding_values: Object.entries(values).map(([key, value]) =>
      ({key, value: typeof value == 'boolean' ? {boolean_value: value} : {string_value: value}}))}}
    return api.parseInlineReply(result)
  }
  const choices = {choice1_label: 'No', choice1_count: '300', choice2_label: 'Yes', choice2_count: '600', choice3_label: 'Other', choice3_count: '100'}
  const ended = pollTweet({...choices, end_datetime_utc: '2026-02-21T01:05:41Z', counts_are_final: true})
  assert.equal(ended.poll.choices.map(choice => choice.label).join(), 'No,Yes,Other')
  let poll = api.createInlineReply(ended).querySelector('.cpftInlineReplyPoll')
  assert.match(poll.textContent, /60%/)
  assert.match(poll.textContent, /Final results/)
  assert.match(poll.querySelector('.cpftPollLeading').textContent, /Yes/)

  const future = new Date(Date.now() + 3 * 3600000).toISOString()
  poll = api.createInlineReply(pollTweet({...choices, end_datetime_utc: future, counts_are_final: false})).querySelector('.cpftInlineReplyPoll')
  assert.doesNotMatch(poll.textContent, /%/)
  assert.match(poll.textContent, /3 hours left/)
  assert.equal(poll.querySelector('a').getAttribute('href'), '/user101/status/101')

  poll = api.createInlineReply(pollTweet({...choices, end_datetime_utc: future, counts_are_final: false, selected_choice: '1'})).querySelector('.cpftInlineReplyPoll')
  assert.match(poll.textContent, /No ✓30%/)
  assert.equal(poll.querySelector('a'), null)

  assert.equal(api.parseInlineReply(tweet('102')).poll, null)
})

test('finds a native quote without an href, preserving links and native controls', t => {
  const {api, window, document} = setup(t)
  const article = addTweet(document)
  const quote = article.querySelector('[role="link"]')
  quote.innerHTML = '<div data-testid="User-Name"><time>Today</time></div><div data-testid="tweetText">Quoted text</div><a href="/person">Profile</a><button>Play</button>'
  window.getTweetInfo = () => ({quoted_status_id_str: '200'})
  const target = api.getQuotePreviewTarget(quote.querySelector('[data-testid="tweetText"]'))
  assert.equal(target.id, '200')
  assert.equal(target.resolveQuote, false)
  assert.equal(api.getQuotePreviewTarget(quote.querySelector('a')), null)
  assert.equal(api.getQuotePreviewTarget(quote.querySelector('button')), null)
  window.getTweetInfo = () => null
  assert.equal(api.getQuotePreviewTarget(quote).resolveQuote, 1)
})

test('a quote inside a quote opens its own level, not the other one', t => {
  const {api, window, document} = setup(t)
  const article = addTweet(document)
  const outer = article.querySelector('[role="link"]')
  outer.innerHTML = '<div data-testid="User-Name"><time>Today</time></div><div data-testid="tweetText">Outer text</div>' +
    '<div role="link"><div data-testid="User-Name"><a href="/inner/status/300"><time>Yesterday</time></a></div><div data-testid="tweetText">Inner text</div></div>'
  const inner = outer.querySelector('[role="link"]')
  // Without cached post info, the outer quote must not borrow the inner quote's link
  window.getTweetInfo = () => null
  assert.equal(api.getQuotePreviewTarget(outer.querySelector('[data-testid="tweetText"]')).resolveQuote, 1)
  assert.equal(api.getQuotePreviewTarget(inner.querySelector('[data-testid="tweetText"]')).id, '300')
  // With cached info, each level follows the chain of quoted posts
  window.getTweetInfo = id => ({100: {quoted_status_id_str: '200'}, 200: {quoted_status_id_str: '300'}})[id]
  assert.equal(api.getQuotePreviewTarget(outer.querySelector('[data-testid="tweetText"]')).id, '200')
  assert.equal(api.getQuotePreviewTarget(inner.querySelector('[data-testid="tweetText"]')).id, '300')
})

test('quoted video surfaces reach native playback handlers while the card still opens the reader', async t => {
  const {api, window, document} = setup(t)
  window.config.quoteTweetPreview = true
  window.getTweetInfo = () => ({quoted_status_id_str: '200'})
  window.fetch = async () => response(body(moduleEntry(tweet('200', null))))
  const quote = addTweet(document).querySelector('[role="link"]')
  quote.innerHTML = `<div data-testid="User-Name"><time>Today</time></div>
    <div data-testid="tweetText">Quoted text</div>
    <div data-testid="tweetPhoto"><div data-testid="previewInterstitial"><img alt="Video poster"><button data-testid="playButton">Play</button></div></div>
    <div data-testid="videoComponent"><div data-testid="videoPlayer"><video></video><div class="player-surface"></div></div></div>`
  api.interceptTimelineTweetClicks()
  api.interceptQuoteAndImagePreviews()
  let nativeClicks = 0
  for (const media of quote.querySelectorAll('[data-testid="tweetPhoto"], [data-testid="videoComponent"]')) {
    media.addEventListener('click', () => { nativeClicks++ })
  }
  const surfaces = quote.querySelectorAll('[data-testid="tweetPhoto"], [data-testid="previewInterstitial"], img, button, [data-testid="videoComponent"], [data-testid="videoPlayer"], video, .player-surface')
  for (const surface of surfaces) {
    assert.equal(click(window, surface).defaultPrevented, false)
    assert.equal(api.readerState, null)
  }
  assert.equal(nativeClicks, surfaces.length)
  for (const surface of [quote.querySelector('[data-testid="tweetText"]'), quote]) {
    assert.equal(click(window, surface).defaultPrevented, true)
    await flush()
    assert.equal(api.readerState.id, '200')
    assert.equal(api.readerState.status, 'loaded')
    api.closeQuoteReader()
  }
})

test('builds only the ancestor chain of the selected post', async t => {
  const {api, window} = setup(t)
  window.fetch = async () => response(body(moduleEntry(tweet('98', null), tweet('99', '98'), tweet('100', '99'), tweet('101'), tweet('999', null))))
  const conversation = await api.getQuoteConversation('100', new window.AbortController().signal)
  assert.deepEqual(Array.from(conversation.ancestors, post => post.id), ['98', '99'])
  assert.equal(conversation.tweet.id, '100')
})

test('reader shows conversation context, full photos and controlled video without navigating', async t => {
  const {api, window, document, navigations} = setup(t)
  window.config.quoteTweetPreview = true
  const result = quotedTweet('100', '90', '99')
  result.legacy.extended_entities = {media: [
    {type: 'photo', media_url_https: 'https://pbs.twimg.com/media/test?format=jpg&name=small', ext_alt_text: 'Detailed screenshot'},
    {type: 'video', media_url_https: 'https://pbs.twimg.com/media/poster.jpg', video_info: {variants: [{content_type: 'video/mp4', bitrate: 832000, url: 'https://video.twimg.com/movie.mp4'}]}},
  ]}
  window.fetch = async () => response(body(moduleEntry(tweet('99', null), result, tweet('101'))))
  await api.openQuoteReader({id: '100', path: '/user100/status/100'})
  assert.match(document.querySelector('#cpftQuoteReader').textContent, /Earlier in this conversation/)
  assert.equal(document.querySelectorAll('.cpftReaderPost').length, 3)
  assert.match(document.querySelector('.cpftReaderPhoto img').src, /name=large/)
  assert.equal(document.querySelector('video').controls, true)
  assert.equal(document.querySelector('video').hasAttribute('autoplay'), false)
  assert.equal(navigations.length, 0)
  assert.equal(window.location.pathname, '/home')
  assert.equal(api.inlineReplies.get('100').replies[0].id, '101')
})

test('missing parent context provides a link to continue earlier in the conversation', async t => {
  const {api, window, document} = setup(t)
  window.config.quoteTweetPreview = true
  window.fetch = async () => response(body(moduleEntry(tweet('100', '99'))))
  await api.openQuoteReader({id: '100', path: '/user100/status/100'})
  const button = document.querySelector('[data-reader-action="open"]')
  assert.equal(button.dataset.tweetId, '99')
})

test('resolves an href-less quote through its owner when the normalized entity is missing', async t => {
  const {api, window} = setup(t)
  window.config.quoteTweetPreview = true
  window.fetch = async url => {
    const id = JSON.parse(new URL(url, window.location.origin).searchParams.get('variables')).focalTweetId
    return response(body(moduleEntry(id == '100' ? quotedTweet('100', '200') : tweet('200', null))))
  }
  await api.openQuoteReader({id: '100', path: '/owner/status/100'}, {resolveQuote: true})
  assert.equal(api.readerState.id, '200')
  assert.equal(api.readerState.status, 'loaded')
})

test('closing the reader cancels pending work and never reopens it on completion', async t => {
  const {api, window, document} = setup(t)
  window.config.quoteTweetPreview = true
  let resolve
  window.fetch = () => new Promise(done => { resolve = done })
  const loading = api.openQuoteReader({id: '100', path: '/user/status/100'})
  api.closeQuoteReader()
  resolve(response(body(moduleEntry(tweet('100', null)))))
  await loading
  assert.equal(document.querySelector('#cpftQuoteReader'), null)
  assert.equal(api.readerState, null)
})

test('a slower earlier post cannot replace the reader after a later selection', async t => {
  const {api, window} = setup(t)
  window.config.quoteTweetPreview = true
  let finishFirst
  window.fetch = async url => {
    const id = JSON.parse(new URL(url, window.location.origin).searchParams.get('variables')).focalTweetId
    if (id == '100') return new Promise(done => { finishFirst = done })
    return response(body(moduleEntry(tweet('200', null))))
  }
  const first = api.openQuoteReader({id: '100', path: '/user/status/100'})
  await api.openQuoteReader({id: '200', path: '/user/status/200'})
  finishFirst(response(body(moduleEntry(tweet('100', null)))))
  await first
  assert.equal(api.readerState.id, '200')
  assert.equal(api.readerState.status, 'loaded')
})

test('quote search uses the captured operation, cursor and authenticated session', async t => {
  const {api, window} = setup(t)
  api.rememberQuoteSearchRequest('https://x.com/i/api/graphql/current/SearchTimeline?features=%7B%22test%22%3Atrue%7D')
  window.fetch = async (url, options) => {
    const request = new URL(url, window.location.origin)
    const variables = JSON.parse(request.searchParams.get('variables'))
    assert.equal(request.pathname, '/i/api/graphql/current/SearchTimeline')
    assert.equal(variables.rawQuery, 'quoted_tweet_id:100 OR url:"status/100/video" OR url:"status/100/photo"')
    assert.equal(variables.product, 'Latest')
    assert.equal(variables.cursor, 'page2')
    assert.equal(options.credentials, 'include')
    return response(searchBody())
  }
  await api.fetchQuoteList('100', 'page2', new window.AbortController().signal)
})

test('quote lists exclude unrelated posts and promoted entries', async t => {
  const {api, window} = setup(t)
  const promoted = item(quotedTweet('104'))
  promoted.item.itemContent.promotedMetadata = {}
  window.fetch = async () => response(searchBody({entryId: 'module', content: {items: [item(quotedTweet('101')), item(quotedTweet('102', '999')), item(tweet('103')), promoted]}}, cursorEntry('next')))
  const result = await api.fetchQuoteList('100', null, new window.AbortController().signal)
  assert.deepEqual(Array.from(result.quotes, quote => quote.id), ['101'])
  assert.equal(result.cursor, 'next')
})

test('quote list pagination deduplicates results, crosses empty pages, and stops repeated cursors', async t => {
  const {api, window, document} = setup(t)
  window.config.quoteTweetPreview = true
  const pages = [
    searchBody(moduleEntry(quotedTweet('101'), quotedTweet('101')), cursorEntry('a')),
    searchBody(cursorEntry('b')),
    searchBody(moduleEntry(quotedTweet('102')), cursorEntry('b')),
  ]
  let calls = 0
  window.fetch = async () => response(pages[calls++])
  api.openQuoteList({id: '100', path: '/user/status/100'})
  await flush()
  await api.loadMoreQuotePosts()
  assert.equal(api.readerState.cursor, 'b')
  await api.loadMoreQuotePosts()
  assert.deepEqual(Array.from(api.readerState.quotes, quote => quote.id), ['101', '102'])
  assert.equal(api.readerState.cursor, null)
  assert.equal(document.querySelectorAll('.cpftQuoteListItem').length, 2)
  assert.equal(document.querySelector('.cpftQuoteListItem .cpftInlineReplyQuote'), null)
})

test('Back restores the quote list and scroll position without fetching it again', async t => {
  const {api, window, document} = setup(t)
  window.config.quoteTweetPreview = true
  let searches = 0
  window.fetch = async url => {
    if (url.includes('SearchTimeline')) { searches++; return response(searchBody(moduleEntry(quotedTweet('101')))) }
    return response(body(moduleEntry(quotedTweet('101'))))
  }
  api.openQuoteList({id: '100', path: '/user/status/100'})
  await flush()
  document.querySelector('.cpftQuoteReaderBody').scrollTop = 123
  await api.openQuoteReader({id: '101', path: '/user101/status/101'})
  api.backInQuoteReader()
  assert.equal(api.readerState.mode, 'quotes')
  assert.equal(document.querySelector('.cpftQuoteReaderBody').scrollTop, 123)
  assert.equal(searches, 1)
})

/** A native tweet with an action bar like X's: reply ... bookmark/share */
function addTweetWithActions(document, id = '100') {
  const article = addTweet(document, id)
  const group = document.createElement('div')
  group.setAttribute('role', 'group')
  group.innerHTML = '<div><button data-testid="reply">0</button></div><div><button data-testid="like">0</button></div><div class="bookmark-share"></div>'
  article.append(group)
  return {article, group}
}

test('quote buttons join the action bar only for posts with quotes and survive row recycling without duplication', t => {
  const {api, window, document} = setup(t)
  window.config.quoteTweetPreview = true
  window.config.hideQuoteTweetMetrics = false
  const {article, group} = addTweetWithActions(document)
  window.getTweetInfo = id => ({quote_count: id == '100' ? 12 : 0})
  api.addTweetActionButtons(document)
  api.addTweetActionButtons(document)
  assert.equal(article.querySelectorAll('[data-cpft-quotes]').length, 1)
  assert.equal(article.querySelector('[data-cpft-quotes]').textContent, '12')
  assert.equal(group.lastElementChild.className, 'bookmark-share', 'the button goes before bookmark and share')
  assert.equal(article.querySelector('[data-cpft-quotes]').closest('[role="group"]'), group)
  window.config.hideQuoteTweetMetrics = true
  api.addTweetActionButtons(document)
  assert.equal(article.querySelector('[data-cpft-quotes]').textContent, '')
  article.querySelector('a').href = '/other/status/200'
  api.addTweetActionButtons(document)
  assert.equal(article.querySelector('[data-cpft-quotes]'), null)
  assert.equal(article.querySelector('.cpftTweetExtraActions'), null)
})

/** Answers ask requests the way content.js relays the helper's response */
function answerAskRequests(window, respond) {
  const requests = []
  window.postMessage = (data) => {
    if (data?.type != 'cpftAskRequest') return
    requests.push(data)
    Promise.resolve(respond(data)).then(response => {
      window.dispatchEvent(new window.MessageEvent('message', {data: {type: 'cpftAskResponse', requestId: data.requestId, ...response}, source: window}))
    })
  }
  return requests
}

test('the ask button sends the post, its context and media, and shows the answer below the post', async t => {
  const {api, window, document} = setup(t)
  window.config.askAboutPosts = true
  api.interceptAskClicks()
  api.interceptTimelineTweetClicks()
  const {article} = addTweetWithActions(document)
  const focal = tweet('100', '90', {
    full_text: '@user90 wait is this real https://t.co/a https://t.co/m',
    display_text_range: [8, 55],
    entities: {
      urls: [{url: 'https://t.co/a', expanded_url: 'https://example.com/news', indices: [27, 41]}],
      media: [{url: 'https://t.co/m', indices: [42, 56]}],
    },
    in_reply_to_screen_name: 'user90',
    extended_entities: {media: [{type: 'video', media_url_https: 'https://pbs.twimg.com/thumb.jpg', video_info: {duration_millis: 8000, variants: [
      {content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/a.m3u8'},
      {content_type: 'video/mp4', bitrate: 2176000, url: 'https://video.twimg.com/hi.mp4'},
      {content_type: 'video/mp4', bitrate: 256000, url: 'https://video.twimg.com/lo.mp4'},
    ]}}]},
  })
  focal.card = {legacy: {binding_values: [{key: 'title', value: {string_value: 'Big news'}}]}}
  window.fetch = async () => response(body(moduleEntry(tweet('90', null), focal, tweet('101'))))
  const requests = answerAskRequests(window, () => ({answer: 'It refers to **this** [story](https://example.com/s).\n- one\n- two', model: 'gpt-6-luna'}))
  window.getTweetInfo = () => ({})
  api.addTweetActionButtons(document)
  const button = article.querySelector('[data-cpft-ask]')
  assert.ok(button, 'the ask button is in the action bar')
  click(window, button)
  assert.match(article.querySelector('.cpftAskPanel').textContent, /Looking into this tweet/)
  await flush(); await flush(); await flush()
  assert.equal(requests.length, 1)
  // postMessage serializes the context, which also drops the vm's prototypes
  const {post, ancestors, replies} = JSON.parse(JSON.stringify(requests[0].request.context))
  assert.equal(post.text, 'wait is this real https://example.com/news')
  assert.equal(post.replyingTo, '@user90')
  assert.deepEqual(post.card, {title: 'Big news', description: null, domain: null})
  assert.deepEqual(post.media, [{type: 'video', imageUrl: 'https://pbs.twimg.com/thumb.jpg', videoUrl: 'https://video.twimg.com/lo.mp4', durationMs: 8000}])
  assert.deepEqual(ancestors.map(ancestor => ancestor.url), ['https://x.com/user90/status/90'])
  assert.deepEqual(replies.map(reply => reply.text), ['Reply 101'])
  const panel = article.querySelector('.cpftAskPanel')
  assert.match(panel.querySelector('.cpftAskMeta').textContent, /gpt-6-luna/)
  assert.equal(panel.querySelector('strong').textContent, 'this')
  assert.equal(panel.querySelector('a').getAttribute('target'), '_blank')
  assert.equal(panel.querySelectorAll('li').length, 2)
  assert.equal(button.classList.contains('cpftActive'), true)
  // Clicking the answer doesn't open the post or its replies
  click(window, panel.querySelector('p'))
  assert.equal(document.querySelector('.cpftRepliesRoot'), null)
  // The ask button toggles the panel without asking again
  click(window, button)
  assert.equal(article.querySelector('.cpftAskPanel'), null)
  click(window, button)
  assert.ok(article.querySelector('.cpftAskPanel .cpftAskAnswer'))
  assert.equal(requests.length, 1)
})

test('ask errors explain how to install the helper and can be retried', async t => {
  const {api, window, document} = setup(t)
  window.config.askAboutPosts = true
  api.interceptAskClicks()
  const {article} = addTweetWithActions(document)
  window.fetch = async () => response(body(moduleEntry(tweet('100', null))))
  let fail = true
  answerAskRequests(window, () => fail ? {error: 'Specified native messaging host not found.'} : {answer: 'Fine now', model: 'gpt-6-luna'})
  window.getTweetInfo = () => ({})
  api.addTweetActionButtons(document)
  click(window, article.querySelector('[data-cpft-ask]'))
  await flush(); await flush(); await flush()
  assert.match(article.querySelector('.cpftAskStatus').textContent, /Couldn't start the ask helper \(Specified native messaging host not found\.\)\. Run npm run ask-helper:install/)
  fail = false
  click(window, article.querySelector('[data-ask-action="retry"]'))
  await flush(); await flush(); await flush()
  assert.equal(article.querySelector('.cpftAskAnswer').textContent, 'Fine now')
})

test('answers only link to web pages and never render markup', t => {
  const {api} = setup(t)
  const answer = api.renderAskAnswer('[bad](javascript:alert(1)) <img src=x onerror=alert(1)> https://example.com/a.')
  assert.equal(answer.querySelector('img'), null)
  assert.deepEqual([...answer.querySelectorAll('a')].map(a => a.getAttribute('href')), ['https://example.com/a'])
})

test('reply cards get an ask button whose answer stays inside the card', async t => {
  const {api, window, document} = setup(t)
  window.config.askAboutPosts = true
  const reply = api.parseInlineReply(tweet('101'))
  api.inlineReplyTweets.set(reply.id, reply)
  const card = api.createInlineReply(reply)
  document.body.append(card)
  assert.ok(card.querySelector('.cpftInlineReplyActions [data-cpft-ask]'))
  api.openAskPanels.add('101')
  api.askThreads.set('101', {turns: [{question: null, status: 'loaded', deep: false, answer: 'Context', model: 'gpt-6-luna'}]})
  const updated = api.createInlineReply(reply)
  assert.equal(updated.querySelector('.cpftAskAnswer').textContent, 'Context')
})

test('reader video controls and sensitive-media reveal do not toggle replies', t => {
  const {api, window, document} = setup(t)
  const result = tweet('101')
  result.legacy.possibly_sensitive = true
  result.legacy.extended_entities = {media: [{type: 'photo', media_url_https: 'https://pbs.twimg.com/media/test.jpg'}]}
  const post = api.createQuoteReaderPost(api.parseInlineReply(result))
  post.addEventListener('click', api.onInlineRepliesClick)
  document.body.append(post)
  const reveal = post.querySelector('.cpftReaderReveal')
  assert.ok(reveal)
  assert.equal(api.getHoverImage(post.querySelector('.cpftReaderPhoto img')), null)
  click(window, reveal)
  assert.equal(post.querySelector('.cpftReaderSensitive'), null)
  assert.equal(api.expandedInlineReplies.has('101'), false)
  const video = document.createElement('video')
  post.querySelector('.cpftInlineReplyMain').append(video)
  click(window, video)
  assert.equal(api.expandedInlineReplies.has('101'), false)
})

test('hover recognizes post photos but ignores avatars, videos and blurred content', t => {
  const {api, document} = setup(t)
  document.body.insertAdjacentHTML('beforeend', '<img id="avatar" src="https://pbs.twimg.com/profile_images/a.jpg"><div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a?name=small"></div><a class="cpftInlineReplyMediaItem" href="/u/status/1/video/1"><img src="https://pbs.twimg.com/media/b"></a>')
  assert.equal(api.getHoverImage(document.querySelector('#avatar')), null)
  assert.ok(api.getHoverImage(document.querySelector('[data-testid="tweetPhoto"] img')))
  assert.equal(api.getHoverImage(document.querySelector('.cpftInlineReplyMediaItem img')), null)
  document.querySelector('[data-testid="tweetPhoto"]').style.filter = 'blur(24px)'
  assert.equal(api.getHoverImage(document.querySelector('[data-testid="tweetPhoto"] img')), null)
  assert.match(api.getPreviewImageUrl('https://pbs.twimg.com/media/a?format=jpg&name=small'), /name=orig/)
  assert.equal(api.getPreviewImageUrl('javascript:alert(1)'), null)
  assert.equal(api.getPreviewImageUrl(undefined), null)
})

test('leaving a thumbnail cancels its pending hover preview; touch does not start one', t => {
  const {api, window, document} = setup(t)
  window.config.hoverImagePreview = true
  const photo = document.createElement('div')
  photo.dataset.testid = 'tweetPhoto'
  photo.innerHTML = '<img src="https://pbs.twimg.com/media/a?name=small">'
  document.body.append(photo)
  api.interceptQuoteAndImagePreviews()
  const touch = new window.MouseEvent('pointerover', {bubbles: true})
  Object.defineProperty(touch, 'pointerType', {value: 'touch'})
  photo.dispatchEvent(touch)
  assert.equal(api.imagePreview, null)
  photo.dispatchEvent(new window.MouseEvent('pointerover', {bubbles: true}))
  assert.ok(api.imagePreview)
  photo.dispatchEvent(new window.MouseEvent('pointerout', {bubbles: true, relatedTarget: document.body}))
  assert.equal(api.imagePreview, null)
})

test('quote search uses the loaded native query ID and transaction generator', async t => {
  const {api, window} = setup(t)
  const signed = []
  function runtime(id) {
    if (id == 'transaction') return {generate: async function(host, requestPath, method) {
      signed.push({host, requestPath, method})
      return 'native-transaction'
    }}
    return {queryId: 'current-query-id', operationName: 'SearchTimeline'}
  }
  runtime.m = {
    transaction: function() { /* rweb_client_transaction_id_enabled x-client-transaction-id */ },
    search: function() { return {operationName:'SearchTimeline'} },
  }
  const chunks = []
  chunks.push = value => { value[2](runtime) }
  window.webpackChunk_twitter_responsive_web = chunks
  window.fetch = async (url, options) => {
    assert.match(url, /current-query-id\/SearchTimeline/)
    assert.equal(options.headers['x-client-transaction-id'], 'native-transaction')
    return response(searchBody())
  }
  await api.fetchQuoteList('100', null, new window.AbortController().signal)
  assert.equal(signed[0].requestPath, '/graphql/current-query-id/SearchTimeline')
  assert.equal(signed[0].method, 'GET')
})

test('keyboard focus can preview a photo after focus scrolling and Escape dismisses it', async t => {
  const {api, window, document} = setup(t)
  window.config.hoverImagePreview = true
  document.body.insertAdjacentHTML('beforeend', '<a id="photo-link" href="/u/status/1/photo/1"><div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a?name=small"></div></a>')
  api.interceptQuoteAndImagePreviews()
  document.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Tab', bubbles: true}))
  document.querySelector('#photo-link').focus()
  window.dispatchEvent(new window.Event('scroll'))
  await new Promise(resolve => setTimeout(resolve, 40))
  assert.ok(api.imagePreview)
  document.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
  assert.equal(api.imagePreview, null)
})

test('quote lists include native media shares while rejecting unrelated lookalike links', async t => {
  const {api, window} = setup(t)
  window.fetch = async () => response(searchBody(moduleEntry(
    tweet('101', null, {entities: {urls: [{expanded_url: 'https://x.com/source/status/100/video/1'}]}}),
    tweet('102', null, {entities: {urls: [{expanded_url: 'https://example.com/source/status/100/video/1'}]}}),
    tweet('103', null, {entities: {urls: [{expanded_url: 'https://x.com/source/status/1000/photo/1'}]}}),
  )))
  const result = await api.fetchQuoteList('100', null, new window.AbortController().signal)
  assert.deepEqual(Array.from(result.quotes, post => post.id), ['101'])
})

test('turning off timeline replies can preserve the reader’s post and translation caches', t => {
  const {api} = setup(t)
  api.inlineReplyTweets.set('100', api.parseInlineReply(tweet('100', null)))
  api.inlineReplyTranslations.set('100', {status: 'loaded', shown: true, text: 'Translation'})
  api.removeTimelineInlineReplies({clearCache: false})
  assert.equal(api.inlineReplyTweets.has('100'), true)
  assert.equal(api.inlineReplyTranslations.has('100'), true)
})

test('unplayed native video posters are never offered as enlarged images', t => {
  const {api, document} = setup(t)
  document.body.insertAdjacentHTML('beforeend', `
    <div data-testid="tweetPhoto" id="poster-url"><img src="https://pbs.twimg.com/amplify_video_thumb/123/img/poster?format=jpg"></div>
    <div data-testid="tweetPhoto" id="poster-ui"><div data-testid="previewInterstitial"><img src="https://pbs.twimg.com/media/poster.jpg"><button data-testid="playButton">Play</button></div></div>
    <div data-testid="videoComponent"><div data-testid="tweetPhoto" id="poster-parent"><img src="https://pbs.twimg.com/media/poster.jpg"></div></div>
    <div data-testid="tweetPhoto" id="real-photo"><img src="https://pbs.twimg.com/media/photo.jpg"></div>
  `)
  for (const id of ['poster-url', 'poster-ui', 'poster-parent']) {
    assert.equal(api.getHoverImage(document.querySelector(`#${id} img`)), null, id)
  }
  assert.ok(api.getHoverImage(document.querySelector('#real-photo img')))
})

test('multiple reader photos use one thumbnail grid and each keeps its original hover source', t => {
  const {api, document} = setup(t)
  for (const count of [2, 3, 4]) {
    const result = tweet('100', null, {extended_entities: {media: Array.from({length: count}, (_, i) => ({
      type: 'photo', media_url_https: `https://pbs.twimg.com/media/photo${i}.jpg`, ext_alt_text: `Screenshot ${i + 1}`,
      original_info: {width: 1000, height: 2000},
    }))}})
    const media = api.createReaderMedia(api.parseInlineReply(result))
    document.body.append(media)
    assert.equal(media.querySelectorAll('.cpftReaderPhotoGrid').length, 1)
    assert.equal(media.querySelector('.cpftReaderPhotoGrid').dataset.photoCount, String(count))
    assert.equal(media.querySelectorAll('.cpftReaderPhotoGrid > a').length, count)
    for (const [i, image] of Array.from(media.querySelectorAll('img')).entries()) {
      assert.equal(image.closest('a').pathname, `/user100/status/100/photo/${i + 1}`)
      assert.ok(api.getHoverImage(image))
      assert.match(api.getPreviewImageUrl(image.src), /name=orig/)
    }
    media.remove()
  }
})

test('opening a quoted post expands its initial replies without a second request', async t => {
  const {api, window, document} = setup(t)
  window.config.quoteTweetPreview = true
  let requests = 0
  window.fetch = async () => { requests++; return response(body(moduleEntry(tweet('100', null), tweet('101'), tweet('102')))) }
  await api.openQuoteReader({id: '100', path: '/user100/status/100'})
  assert.equal(api.expandedInlineReplies.has('100'), true)
  assert.equal(document.querySelectorAll('.cpftReaderFocus > .cpftReaderPost > .cpftReplies > .cpftInlineReply').length, 2)
  assert.equal(requests, 1)
  const card = api.createQuoteListItem(api.readerState.conversation.tweet)
  assert.equal(card.querySelector(':scope > .cpftReplies'), null, 'list results stay compact')
  assert.equal(card.querySelector('button[data-action="toggle"]'), null)
})

test('returning to a reader view preserves an explicit reply collapse', async t => {
  const {api, window, document} = setup(t)
  window.config.quoteTweetPreview = true
  window.fetch = async url => {
    const id = JSON.parse(new URL(url, window.location.origin).searchParams.get('variables')).focalTweetId
    return response(body(moduleEntry(tweet(id, null), tweet(`${id}1`, id))))
  }
  await api.openQuoteReader({id: '100', path: '/user100/status/100'})
  click(window, document.querySelector('.cpftReaderFocus > .cpftReaderPost > .cpftInlineReplyTweet button[data-action="toggle"]'))
  assert.equal(api.expandedInlineReplies.has('100'), false)
  await api.openQuoteReader({id: '200', path: '/user200/status/200'})
  api.backInQuoteReader()
  await flush()
  assert.equal(api.readerState.id, '100')
  assert.equal(api.expandedInlineReplies.has('100'), false)
})

test('follow-up questions send the earlier answers, and Think harder re-asks with the stronger model', async t => {
  const {api, window, document} = setup(t)
  window.config.askAboutPosts = true
  api.interceptAskClicks()
  const {article} = addTweetWithActions(document)
  let detailRequests = 0
  window.fetch = async () => { detailRequests++; return response(body(moduleEntry(tweet('100', null)))) }
  const requests = answerAskRequests(window, ({request}) => ({
    answer: request.deep ? 'Deep answer' : request.question ? `Answer to ${request.question}` : 'First answer',
    model: request.deep ? 'gpt-6.1-sol' : 'gpt-6-luna',
  }))
  window.getTweetInfo = () => ({})
  api.addTweetActionButtons(document)
  click(window, article.querySelector('[data-cpft-ask]'))
  await flush(); await flush(); await flush()
  const form = article.querySelector('.cpftAskFollowUp')
  form.querySelector('input').value = 'who is that?'
  form.dispatchEvent(new window.Event('submit', {bubbles: true, cancelable: true}))
  await flush(); await flush()
  assert.equal(requests.length, 2)
  assert.equal(requests[1].request.question, 'who is that?')
  assert.deepEqual(JSON.parse(JSON.stringify(requests[1].request.history)), [{question: null, answer: 'First answer'}])
  assert.equal(detailRequests, 1, 'follow-ups reuse the post context')
  let panel = article.querySelector('.cpftAskPanel')
  assert.equal(panel.querySelector('.cpftAskQuestion').textContent, 'who is that?')
  assert.deepEqual([...panel.querySelectorAll('.cpftAskAnswer')].map(a => a.textContent), ['First answer', 'Answer to who is that?'])
  // Think harder replaces the latest answer
  click(window, panel.querySelector('[data-ask-action="deeper"]'))
  assert.match(article.querySelector('.cpftAskPanel').textContent, /Thinking harder/)
  await flush(); await flush()
  assert.equal(requests[2].request.deep, true)
  assert.equal(requests[2].request.question, 'who is that?')
  panel = article.querySelector('.cpftAskPanel')
  assert.deepEqual([...panel.querySelectorAll('.cpftAskAnswer')].map(a => a.textContent), ['First answer', 'Deep answer'])
  assert.match([...panel.querySelectorAll('.cpftAskMeta')].pop().textContent, /gpt-6\.1-sol/)
  assert.equal(panel.querySelector('[data-ask-action="deeper"]'), null, 'already asked the stronger model')
})

test('asking about a timeline post can show the post and answer in the reader instead', async t => {
  const {api, window, document} = setup(t)
  Object.assign(window.config, {askAboutPosts: true, askOpenInReader: true, quoteTweetPreview: true})
  api.interceptAskClicks()
  const {article} = addTweetWithActions(document)
  window.fetch = async () => response(body(moduleEntry(tweet('100', null), tweet('101'))))
  answerAskRequests(window, () => ({answer: 'Reader answer', model: 'gpt-6-luna'}))
  window.getTweetInfo = () => ({})
  api.addTweetActionButtons(document)
  click(window, article.querySelector('[data-cpft-ask]'))
  await flush(); await flush(); await flush(); await flush()
  const reader = document.querySelector('#cpftQuoteReader')
  assert.ok(reader, 'the reader opened')
  assert.equal(reader.querySelector('#cpftQuoteReaderTitle').textContent, 'What\'s this about?')
  assert.equal(reader.querySelector('.cpftReaderFocus .cpftAskAnswer').textContent, 'Reader answer')
  assert.equal(article.querySelector('.cpftAskPanel'), null, 'not also shown below the timeline post')
  // Closing the reader closes its answer
  api.closeQuoteReader()
  assert.equal(api.openAskPanels.has('100'), false)
})

test('inline replies like with Twitter\'s mutation and transaction header, and undo on failure', async t => {
  const {api, window, document} = setup(t)
  window.config.inlineReplyActions = true
  const modules = {
    tx: function() { /* rweb_client_transaction_id_enabled x-client-transaction-id */ },
    fav: function() { /* operationName:"FavoriteTweet" */ },
    unfav: function() { /* operationName:"UnfavoriteTweet" */ },
  }
  const runtime = id => ({
    tx: {generate: async function(host, requestPath, method) { return `tx ${method} ${requestPath}` }},
    fav: {queryId: 'FAV'}, unfav: {queryId: 'UNFAV'},
  })[id]
  runtime.m = modules
  const chunks = []
  chunks.push = entry => entry[2](runtime)
  window.webpackChunk_twitter_responsive_web = chunks
  const reply = api.parseInlineReply(tweet('101', '100', {favorite_count: 3, favorited: false}))
  api.inlineReplyTweets.set(reply.id, reply)
  const root = document.createElement('div')
  root.addEventListener('click', api.onInlineRepliesClick)
  root.append(api.createInlineReply(reply))
  document.body.append(root)
  const calls = []
  window.fetch = async (url, options) => { calls.push({url, options}); return response({data: {favorite_tweet: 'Done'}}) }
  click(window, root.querySelector('[data-action="like"]'))
  assert.equal(root.querySelector('.cpftLike').classList.contains('cpftLiked'), true, 'updates straight away')
  await flush(); await flush()
  assert.equal(calls[0].url, '/i/api/graphql/FAV/FavoriteTweet')
  assert.equal(calls[0].options.method, 'POST')
  assert.equal(calls[0].options.headers['x-client-transaction-id'], 'tx POST /graphql/FAV/FavoriteTweet')
  assert.deepEqual(JSON.parse(calls[0].options.body), {variables: {tweet_id: '101'}, queryId: 'FAV'})
  assert.equal(reply.likeCount, 4)
  // A failed unlike puts the like back
  window.fetch = async () => ({ok: false, status: 403, json: async () => ({errors: [{message: 'Nope'}]})})
  click(window, root.querySelector('[data-action="like"]'))
  await flush(); await flush()
  assert.equal(reply.liked, true)
  assert.equal(reply.likeCount, 4)
  assert.equal(root.querySelector('.cpftLike').classList.contains('cpftLiked'), true)
})

test('replying opens Twitter\'s composer in a popup, keeping the timeline', t => {
  const {api, window, document} = setup(t)
  window.config.inlineReplyActions = true
  const opened = []
  window.open = (...args) => opened.push(args)
  const reply = api.parseInlineReply(tweet('101'))
  api.inlineReplyTweets.set(reply.id, reply)
  const root = document.createElement('div')
  root.addEventListener('click', api.onInlineRepliesClick)
  root.append(api.createInlineReply(reply))
  document.body.append(root)
  click(window, root.querySelector('[data-action="reply"]'))
  assert.equal(opened[0][0], '/intent/post?in_reply_to=101')
  assert.match(opened[0][2], /popup/)
})

test('keyboard shortcuts toggle replies, move between them and ask, but not while typing', async t => {
  const {api, window, document} = setup(t)
  Object.assign(window.config, {keyboardShortcuts: true, askAboutPosts: true})
  api.interceptKeyboardShortcuts()
  window.HTMLElement.prototype.scrollIntoView = () => {}
  // jsdom has no layout, so every card counts as visible
  Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', {get() { return document.body }, configurable: true})
  const replies = ['101', '102'].map(id => api.parseInlineReply(tweet(id)))
  const root = document.createElement('div')
  root.className = 'cpftReplies'
  for (const reply of replies) {
    api.inlineReplyTweets.set(reply.id, reply)
    root.append(api.createInlineReply(reply))
  }
  document.body.append(root)
  const key = (element, keyName) => {
    const event = new window.KeyboardEvent('keydown', {key: keyName, bubbles: true, cancelable: true})
    element.dispatchEvent(event)
    return event
  }
  const card = id => document.querySelector(`.cpftInlineReply[data-tweet-id="${id}"] > .cpftInlineReplyTweet`)
  card('101').focus()
  assert.equal(key(card('101'), 'j').defaultPrevented, true)
  assert.equal(document.activeElement, card('102'))
  window.fetch = async () => response(body(moduleEntry(tweet('103', '102'))))
  key(card('102'), 'e')
  assert.equal(api.expandedInlineReplies.has('102'), true)
  assert.equal(document.activeElement, card('102'), 'focus stays on the replaced card')
  answerAskRequests(window, () => ({answer: 'About 102'}))
  key(card('102'), 'a')
  assert.equal(api.openAskPanels.has('102'), true)
  // Typing in a text box is left alone
  const input = document.createElement('input')
  card('102').append(input)
  assert.equal(key(input, 'j').defaultPrevented, false)
})

test('a pending photo preview survives small scrolls while the photo stays under the pointer', async t => {
  const {api, window, document} = setup(t)
  Object.assign(window.config, {hoverImagePreview: true})
  api.interceptQuoteAndImagePreviews()
  const photo = document.createElement('div')
  photo.dataset.testid = 'tweetPhoto'
  photo.innerHTML = '<img src="https://pbs.twimg.com/media/photo.jpg?format=jpg&name=small">'
  document.body.append(photo)
  photo.getBoundingClientRect = () => ({left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100})
  photo.querySelector('img').dispatchEvent(new window.MouseEvent('pointerover', {bubbles: true, clientX: 50, clientY: 50}))
  assert.ok(api.imagePreview, 'preview pending')
  window.dispatchEvent(new window.Event('scroll'))
  assert.ok(api.imagePreview, 'still pending after a scroll that left the photo under the pointer')
  photo.getBoundingClientRect = () => ({left: 0, top: 200, right: 100, bottom: 300, width: 100, height: 100})
  window.dispatchEvent(new window.Event('scroll'))
  assert.equal(api.imagePreview, null, 'cancelled once the photo scrolled away')
})

test('opening a timeline post in the reader does not expand its replies in the timeline after scrolling', async t => {
  const {api, window, document} = setup(t)
  Object.assign(window.config, {askAboutPosts: true, askOpenInReader: true, quoteTweetPreview: true})
  api.interceptAskClicks()
  const {article} = addTweetWithActions(document)
  window.fetch = async () => response(body(moduleEntry(tweet('100', null), tweet('101'))))
  answerAskRequests(window, () => ({answer: 'Reader answer'}))
  window.getTweetInfo = () => ({})
  api.addTweetActionButtons(document)
  click(window, article.querySelector('[data-cpft-ask]'))
  await flush(); await flush(); await flush(); await flush()
  assert.ok(document.querySelector('#cpftQuoteReader .cpftReaderFocus .cpftReplies'), 'the reader shows its replies')
  // Scrolling makes Twitter re-render timeline rows, which restores expanded posts
  api.restoreTimelineInlineReplies(document.querySelector('#timeline'))
  assert.equal(document.querySelector('#timeline .cpftRepliesRoot'), null)
})
