# Timeline reader development

The working copy adds a setting next to **Default sorting of replies** to expand
replies beneath a timeline tweet instead of navigating away. The feature is enabled by
default. Each click on **Show more replies** reveals up to five more cached
replies, or fetches another page when the cache is exhausted. Replies with
children can expand recursively. Replies and reader tweets in other languages are
translated automatically into your X language, like X does for timeline tweets,
with **Show original** to switch back (**Automatically translate replies in other
languages**).

The same settings group now also enables these features by default:

- **Open quoted tweets in a reader beside the timeline:** clicking a quote card
  opens the full tweet beneath the sidebar search field. The reader includes
  photo attachments, playable video, nested quoted tweets, replies, translations,
  and earlier conversation context. Its first page of replies is expanded by
  default without a second request. Photos use a compact grid (three photos
  use one tall tile beside two smaller ones), and video players stay compact.
  It opens at the selected tweet; **Earlier
  conversation ↑** reveals the parent context above it. **Back** restores the
  previous tweet or quote list and its scroll position. **Escape** closes it.
- **Quotes buttons:** native timeline tweets with a positive quote count get a
  quote icon and count in their action bar, before bookmark and share. Reader
  tweets and inline replies get the same action when
  appropriate. It opens the available Quote Tweets, newest first, with **Show
  more Quote Tweets** pagination. Click a result or **Read tweet →** to inspect
  its full context, then use **Back** to return to the list. Hidden quote metrics
  remain hidden. X may omit private, deleted or unindexed tweets from the list.
- **Enlarge tweet images on hover:** after a brief hover, the original-resolution
  image appears in a fitted overlay. Moving off the thumbnail, scrolling,
  switching windows, or pressing **Escape** dismisses it. The overlay does not
  capture the pointer. Keyboard users can Tab to a photo for the same preview.
  Touch input, avatars, video thumbnails and unrevealed sensitive media are
  excluded.
- **Use a narrower left navigation panel:** at wide desktop widths, navigation
  uses a 224px column, including the fixed inner navigation, and the reader's
  sidebar can expand to 440px. Search and reader share the same width, with a
  28px gap from the timeline. Existing
  icon-only navigation at smaller widths remains in place. The reader uses a
  floating panel when the sidebar is unavailable, including full-width timelines.

## Ask about this tweet

**Show a ? button to ask AI what a tweet is about** adds a **?** to every tweet's
action bar, inline reply and reader tweet. It's for vagueposts, background on a
situation, jokes and wordplay, translating text in images, and how things work.
For timeline tweets the tweet and its answer open in the reader beside the
timeline, so you can keep scrolling while it loads (**Show answers about timeline
tweets in the reader**); replies and reader tweets answer in place. Each answer
has **Think harder** (asks again with the stronger "Think harder" model),
**Ask again**, and a box for follow-up questions, which reuse the tweet's details
and the earlier answers.

The extension sends the tweet, its quoted tweet, link card, up to six earlier
tweets in the conversation and ten replies to the provider chosen in the options
(**Ask about this tweet (AI)**). The prompt is in `ask-prompt.js`, shared by the
background page and the Codex helper, with an optional **Extra instructions**
setting. The API key and other AI settings stay in the extension: `content.js`
never passes them to the page and ignores page requests to change them.

- **Codex (local helper), the default:** `ask-helper/host.cjs` downloads photos
  (and samples four frames from videos with ffmpeg, if installed), then runs
  `codex exec` with live web search, `gpt-6-luna` at low effort, or
  `gpt-6.1-sol` at medium for **Think harder**. Codex runs in an empty temporary
  folder with a read-only sandbox and its shell, apps, plugins, browser and
  computer-use tools disabled, because tweet text is untrusted. Answers take
  about 10–15 seconds (25 for Think harder) and use your Codex plan.
- **OpenAI API:** the Responses API with the `web_search` tool and image URLs.
- **OpenAI-compatible API:** Chat Completions at any URL, such as OpenRouter,
  Ollama or LM Studio. No web search unless the model does it itself.

Luna misses some wordplay even with the prompt telling it to look: on a Bo
Xilai pun hidden across 稀薄熙来攘往 it gave a grammar explanation at every effort
level, while `gpt-6.1-sol` explained it. That's what **Think harder** is for.
**Use fast mode** asks Codex for its fast tier (`priority` in the API); as of
2026-10-23 OpenAI served the test account's Codex requests on the default tier,
so it had no effect there.

Install the Codex helper once, after the unpacked extension is loaded:

```powershell
npm run prepare-dev
npm run ask-helper:install
```

The installer finds the extension's id in Chrome, Brave and Edge profiles (or
pass `-- --id <id>`), writes `ask-helper/config.json`, `host.bat` and the host
manifest, and registers `com.cpft.ask` under `HKCUSoftware...NativeMessagingHosts`
for each browser (Brave reads Chrome's key). Run it from a normal terminal: a
terminal inside a packaged (MSIX) app, such as the Claude desktop app, writes
to that app's private copy of the registry, which browsers can't see, and the
extension then reports "Specified native messaging host not found". Reload the
extension afterwards. The
model and effort come from the extension's options; `ask-helper/config.json` is
only the fallback. Errors are logged to `ask-helper/host.log`. Remove the
registration with `npm run ask-helper:install -- --uninstall`.

## Inline reply actions and keyboard shortcuts

**Add like and reply buttons to inline replies** puts reply and like buttons in
each reply's action row, with **?** and **Read tweet →** on the same line. Likes
use Twitter's own `FavoriteTweet`/`UnfavoriteTweet` mutations (query ids and
the transaction header come from Twitter's loaded code) and update straight
away, undoing on failure. Reply opens Twitter's composer in a small popup window
so the timeline stays where it is.

**Keyboard shortcuts** avoid Twitter's own keys. On a timeline tweet selected
with j/k: **e** expands its replies, **a** asks about it, **q** opens its quoted
tweet in the reader. On an inline reply: **Enter** or **e** expands its replies,
**j**/**k** move between replies, **l** likes, **r** replies, **a** asks, **o**
opens the tweet, and **Escape** goes back to the timeline tweet.

## Defaults

Defaults match the author's own settings, including these upstream ones:
account location on focused tweets shown, "Always use Latest" off, the "For you"
timeline and view counts shown, retweets left in the timeline, Following sorted
by popular and replies by most liked. Every new feature has its own toggle.

## Prepare and load in Brave

```powershell
npm ci
npm run prepare-dev
```

1. Open `brave://extensions` manually.
2. Temporarily disable **Control Panel for Twitter** or any other Tweetmoder
   install to avoid running two copies against the same page. Their saved
   settings remain in those extensions.
3. Enable **Developer mode**, choose **Load unpacked**, and select this
   repository's folder.
4. The new entry is named **Tweetmoder (Dev)**. Its settings are separate from
   other installs.
5. Refresh the X timeline. The existing X login can be used.

After editing source, reload the development extension on the extensions page
and refresh X. Run `npm run prepare-dev` again after changing `options.html`.
To switch back, disable the development extension and re-enable the original.

## Verification

```powershell
npm test
npm run typecheck
npm run build
npm run lint-mv2
npm run prepare-dev
```

The tests run the production code in a DOM environment with mocked
network responses. They cover response parsing, reply and quote pagination,
quotes nested in quotes, polls, conversation ancestry, photos and video, translations
and automatic translation, sensitive media, native controls, cancelled requests,
native request signing, Back/history, photo previews during scrolling, native
unplayed-video posters, thumbnail grids, default-open replies, recycled timeline
rows, action bar buttons, likes and replies, keyboard shortcuts, and asking:
the request context, follow-ups, Think harder, answers in the reader, answer
rendering, errors, each provider's request, and keeping AI settings from the
page (\`tests/ask-providers.test.cjs\`). The Codex helper was tested live through
Brave's native messaging; liking and the OpenAI providers weren't tested live.

`npm run build` creates MV2 and MV3 ZIPs in `web-ext-artifacts/`. It removes
the generated `manifest.json`, so run `prepare-dev` afterward before loading
the unpacked extension. The MV3 manifest asks for `nativeMessaging` for the
Codex helper; the MV2 (Firefox) one doesn't, so Firefox uses the API providers.

The repository's `web-ext` validator targets Firefox. Its MV3 check reports
unsupported `background.service_worker` and a missing Firefox extension ID
for the existing Chromium manifest. MV2 validation also reports existing
cross-browser API and dynamic HTML warnings. The development preparation
does not change either release manifest.

## Live verification and remaining checks

Verified in the logged-in Brave session: quoted tweets and their attached images
load without navigating the timeline; the user's Austen → flow in example shows
Dominic's parent tweet and its media; quote lists load using the current native
query and request headers; selecting a quote and returning with Back restores
the list; enlarged image previews render over the page. The live layout review
also caught and fixed a native flex-row issue: quote buttons belong inside the
tweet's content column so they cannot squeeze the original tweet horizontally.
Quoted video poster clicks also start native playback without opening the reader;
clicking the surrounding quote's text still opens its conversation in the reader.

Useful additional checks:

- Expand a timeline tweet, confirm the URL remains on the timeline, and page
  through more than five replies.
- Expand a reply's replies, translate a reply in another language, and collapse
  both levels using their bottom controls.
- Check profile, timestamp, quoted tweet, media and modified-click behavior.
- Scroll an expanded tweet out of view and back to check timeline virtualization.
- Change reply sorting or disable inline replies and confirm the old thread
  disappears. Reopen to verify the newly selected sort is requested.
- Check light/dark themes and a narrow viewport.

The default TweetDetail query is refreshed from X's own requests when a native
tweet detail page is opened. Quote lists use SearchTimeline with the same quote
and media-share search expression as the native app. Its current query ID and
transaction-header generator come from the loaded app's Webpack modules; native
search requests also refresh the feature settings. No session tokens or headers
are persisted or sent to another service. X can change these private interfaces;
failures retain a retry action and an **Open** link to the native page.
