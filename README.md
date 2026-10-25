<p align="center"><img src="icons/icon256.png" width="128" height="128" alt=""></p>

Extension for Twitter (forked from Control Panel for Twitter) with a lot of useful features! Mainly opening replies within the timeline, quote tweets on the side, zooming in images by hovering and getting explanations from AI because there are too many vagueposts or unexplained jokes. And it also has the features the original extension had, of course. If you have any issues or ideas for more features let me know and I'll look into it!

The text below is all automated.

<h1 align="center">Tweetmoder</h1>

<p align="center"><b>Read replies, quoted tweets and polls without leaving the timeline.</b><br>
A fork of <a href="https://github.com/insin/control-panel-for-twitter">Control Panel for Twitter</a> for desktop browsers.</p>


## What it adds

Everything in Control Panel for Twitter, plus:

- **Inline replies:** click a tweet in a timeline and its replies open beneath it. Replies expand into their own replies, five at a time, without the timeline losing its place.
- **Quote reader:** click a quoted tweet, even a quote inside a quote, and it opens in a reader beside the timeline with its photos, video, polls, replies and earlier conversation. **Back** steps through what you've read.
- **Quote Tweets:** a quotes button on tweets opens their Quote Tweets in the reader, newest first.
- **Ask about this tweet:** a **?** button asks AI what a tweet is about. It's for vagueposts, jokes, wordplay, text in images and background on a situation. Answers have **Think harder**, **Ask again** and follow-up questions.
- **Automatic translation** of replies in other languages, using X's own translations.
- **Like and reply** right from inline replies, and **keyboard shortcuts** for all of it.
- **Image previews** that enlarge photos on hover, and a narrower left navigation panel to make room for the reader.

Every addition has its own toggle in the options.

## Install

Tweetmoder isn't in the browser stores, so it's installed from the [releases page](https://github.com/cpc2/tweetmoder/releases).

**Chrome, Edge, Brave and other Chromium browsers**

1. Download `tweetmoder-<version>.mv3.zip` and unzip it into a folder you'll keep.
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`) and turn on **Developer mode**.
3. Choose **Load unpacked** and select the unzipped folder.

If you also use Control Panel for Twitter, turn it off while Tweetmoder is on, so they don't both change the page.

**Firefox:** the `mv2.zip` isn't signed by Mozilla, so Firefox only runs it as a temporary add-on: open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on…** and pick the zip. It's removed when Firefox restarts.

## Ask about this tweet

Choose the AI provider in Tweetmoder's options:

- **OpenAI API:** your OpenAI API key. Uses web search and sees images.
- **OpenAI-compatible API:** any Chat Completions URL, such as OpenRouter, Ollama or LM Studio.
- **Codex (local helper), the default:** uses your ChatGPT plan through OpenAI's [Codex CLI](https://github.com/openai/codex) instead of a paid API key. Windows only, for now. It needs Node.js, and Codex installed and signed in. Then clone this repository and run:

  ```
  node ask-helper/install.cjs --id <Tweetmoder's id from the extensions page>
  ```

  Reload Tweetmoder afterwards. The helper runs Codex in a read-only sandbox with its shell and other tools turned off, because tweets are untrusted text.

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for what's sent where.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for how the additions work, and [CONTRIBUTING.md](CONTRIBUTING.md) for the upstream codebase. `npm test` runs the tests.

## Credits

Tweetmoder is built on [Control Panel for Twitter](https://github.com/insin/control-panel-for-twitter) by Jonny Buchanan. Its many features and options all come from there. Both are released under the [MIT License](LICENSE).
