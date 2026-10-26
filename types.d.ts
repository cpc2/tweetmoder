export type Config = {
  enabled: boolean
  debug: boolean
  debugLogTimelineStats: boolean
  version?: 'desktop' | 'mobile'
  // Shared
  addAddMutedWordMenuItem: boolean
  addFocusedTweetAccountLocation: boolean
  // XXX This is now more like "use the Following tab by default"
  alwaysUseLatestTweets: boolean
  bypassAgeVerification: boolean
  darkModeTheme: 'lightsOut' | 'dim'
  defaultToLatestSearch: boolean
  disableHomeTimeline: boolean
  disabledHomeTimelineRedirect: 'notifications' | 'messages'
  disableNflFeatures: boolean
  disableTweetTextFormatting: boolean
  dontUseChirpFont: boolean
  dropdownMenuFontWeight: boolean
  fastBlock: boolean
  followButtonStyle: 'monochrome' | 'themed'
  hideAdsNav: boolean
  hideBookmarkButton: boolean
  hideBookmarkMetrics: boolean
  hideBusinessNav: boolean
  hideCalls: boolean
  hideChatNav: boolean
  hideCommunitiesNav: boolean
  hideComposeTweet: boolean
  hideConnectNav: boolean
  hideCreatorStudioNav: boolean
  hideEditImage: boolean
  hideExplorePageContents: boolean
  hideFollowingMetrics: boolean
  hideForYouTimeline: boolean
  hideGrokNav: boolean
  hideGrokTweets: boolean
  hideHistoryNav: boolean
  hideInlinePrompts: boolean
  hideJobsNav: boolean
  hideLikeMetrics: boolean
  hideListsNav: boolean
  hideManageTimelines: boolean
  hideMetrics: boolean
  hideMoney: boolean
  hideMoreFromThisAuthor: boolean
  // XXX This now controls hiding all "Discover" suggestions
  hideMoreTweets: boolean
  hideNotificationLikes: boolean
  hideNotificationRetweets: boolean
  hideNotifications: 'ignore' | 'badges' | 'hide'
  hideProfileRetweets: boolean
  hideQuoteTweetMetrics: boolean
  hideQuotesFrom: string[]
  hideReplyMetrics: boolean
  hideRetweetMetrics: boolean
  hideSeeNewTweets: boolean
  hideShareTweetButton: boolean
  hideSortRepliesMenu: boolean
  hideSpacesNav: boolean
  hideSubscriptions: boolean
  hideSuggestedContentSearch: boolean
  // XXX This now controls hiding profile header metrics
  hideTotalTweetsMetrics: boolean
  hideTwitterBlueReplies: boolean
  hideTwitterBlueUpsells: boolean
  hideUnavailableQuoteTweets: boolean
  // XXX This now also controls hiding Verified Followers
  hideVerifiedNotificationsTab: boolean
  hideViewActivityLinks: boolean
  hideViews: boolean
  hideWhoToFollowEtc: boolean
  inlineReplies: boolean
  autoTranslateReplies: boolean
  dontTranslateLanguages: string
  askAboutPosts: boolean
  askOpenInReader: boolean
  inlineReplyActions: boolean
  keyboardShortcuts: boolean
  // AI settings, which only the options and background pages see (defaults in ask-prompt.js)
  askProvider?: 'codex' | 'openai' | 'openai-compatible'
  askModel?: string
  askReasoningEffort?: string
  askDeepModel?: string
  askDeepReasoningEffort?: string
  askFastMode?: boolean
  askWebSearch?: boolean
  askApiBaseUrl?: string
  askApiKey?: string
  askExtraInstructions?: string
  quoteTweetPreview: boolean
  hoverImagePreview: boolean
  compactNavigation: boolean
  listRetweets: 'ignore' | 'hide'
  mutableQuoteTweets: boolean
  mutedQuotes: QuotedTweet[]
  quoteTweets: SharedTweetsConfig
  reducedInteractionMode: boolean
  // XXX This now controls all replacement of X brand changes
  replaceLogo: boolean
  restoreLinkHeadlines: boolean
  restoreQuoteTweetsLink: boolean
  restoreOtherInteractionLinks: boolean
  restoreTweetSource: boolean
  retweets: SharedTweetsConfig
  revertMediaCarousel: boolean
  revertProfileTabs: boolean
  revertTwemoji: boolean
  showBlueReplyFollowersCount: boolean
  showBlueReplyFollowersCountAmount: string
  showBookmarkButtonUnderFocusedTweets: boolean
  showPremiumReplyBusiness: boolean
  showPremiumReplyFollowedBy: boolean
  showPremiumReplyFollowing: boolean
  showPremiumReplyGovernment: boolean
  sortFollowing: 'mostRecent' | 'popular' | 'ignore'
  sortReplies: 'relevant' | 'recent' | 'liked'
  tweakQuoteTweetsPage: boolean
  twitterBlueChecks: 'ignore' | 'replace' | 'hide'
  unblurSensitiveContent: boolean
  uninvertFollowButtons: boolean
  // Experiments
  customCss: string
  // Desktop only
  addUserHoverCardAccountLocation: boolean
  fullWidthContent: boolean
  fullWidthMedia: boolean
  hideAccountSwitcher: boolean
  hideExploreNav: boolean
  hideExploreNavWithSidebar: boolean
  hideLiveBroadcasts: boolean
  hideMessagesDrawer: boolean
  hideSidebarContent: boolean
  hideSuggestedFollows: boolean
  hideTimelineTweetBox: boolean
  hideTodaysNews: boolean
  hideWhatsHappening: boolean
  navBaseFontSize: boolean
  navDensity: 'default' | 'comfortable' | 'compact'
  showRelevantPeople: boolean
  // Mobile only
  hideLiveBroadcastBar: boolean
  hideMessagesBottomNavItem: boolean
  preventNextVideoAutoplay: boolean
}

export type Locale = {
  [K in LocaleKey]?: K extends `${string}_FN` ? (arg: any) => string : string
}

export type LocaleFunctionKey = Extract<LocaleKey, `${string}_FN`>

export type LocaleKey =
  | 'ACCOUNT_BASED_IN_FN'
  | 'ADD_ANOTHER_TWEET'
  | 'ADD_MUTED_WORD'
  | 'GROK_ACTIONS'
  | 'HOME'
  | 'LIKES'
  | 'LIVE_ON_X'
  | 'MESSAGES'
  | 'MOST_RELEVANT'
  | 'MUTE_THIS_CONVERSATION'
  | 'POST_ALL'
  | 'POST_UNAVAILABLE'
  | 'PROFILE_SUMMARY'
  | 'QUOTE'
  | 'QUOTES'
  | 'QUOTE_TWEET'
  | 'QUOTE_TWEETS'
  | 'RECENT'
  | 'RELEVANT'
  | 'REPOST'
  | 'REPOSTS'
  | 'RETWEET'
  | 'RETWEETED_BY'
  | 'RETWEETS'
  | 'SHARED'
  | 'SHARED_TWEETS'
  | 'SHOW'
  | 'SHOW_MORE_REPLIES'
  | 'SORT_BY'
  | 'SORT_REPLIES'
  | 'TURN_OFF_QUOTE_TWEETS'
  | 'TURN_OFF_RETWEETS'
  | 'TURN_ON_RETWEETS'
  | 'TWEET'
  | 'TWEETS'
  | 'TWEET_ALL'
  | 'TWEET_INTERACTIONS'
  | 'TWEET_YOUR_REPLY'
  | 'TWITTER'
  | 'UNDO_RETWEET'
  | 'VIEW'
  | 'WHATS_HAPPENING'

export type LocaleStringKey = Exclude<LocaleKey, `${string}_FN`>

export type NamedMutationObserver = MutationObserver & {name: string}

export type Disconnectable = {name: string, disconnect(): void}

export type QuotedTweet = {
  quotedBy: string
  user: string
  time: string
  text?: string
}

export type SharedTweetsConfig = 'separate' | 'hide' | 'ignore'

export type TweetType =
  | 'COMMUNITY_TWEET'
  | 'PINNED_TWEET'
  | 'PROMOTED_TWEET'
  | 'QUOTE_TWEET'
  | 'RETWEET'
  | 'RETWEETED_QUOTE_TWEET'
  | 'TWEET'
  | 'UNAVAILABLE'
  | 'UNAVAILABLE_QUOTE_TWEET'
  | 'UNAVAILABLE_RETWEET'

export type TimelineItemType =
  | TweetType
  | 'BLUE_REPLY'
  | 'BUSINESS_REPLY'
  | 'DISCOVER_MORE_HEADING'
  | 'DISCOVER_MORE_TWEET'
  | 'FOCUSED_TWEET'
  | 'GOVERNMENT_REPLY'
  | 'HEADING'
  | 'INLINE_PROMPT'
  | 'SEE_MORE'
  | 'SHOW_MORE'
  | 'SUBSEQUENT_ITEM'
  | 'UNAVAILABLE'
  | `NOTIFICATION_${NotificationType}`

export type NotificationType = 'AD' | 'FOLLOW' | 'LIKE' | 'RETWEET'

export type TimelineOptions = {
  checkSocialContext?: boolean
  classifyTweets?: boolean
  hideHeadings?: boolean
  isTabbed?: boolean
  isUserTimeline?: boolean
  onTabChanged?: () => void
  onTimelineAppeared?: () => void
  tabbedTimelineContainerSelector?: string
  timelineSelector?: string
}

export type IndividualTweetTimelineOptions = {
  observers: Map<string, Disconnectable>
  seen: WeakMap<Element, IndividualTweetDetails>
}

export type IndividualTweetDetails = {
  itemType: TimelineItemType,
  hidden: boolean | null,
}

export type InlineReply = {
  id: string
  path: string
  inReplyToId: string | null
  inReplyToScreenName: string | null
  screenName: string
  name: string
  avatarUrl: string | null
  createdAt: Date
  lang: string | null
  text: string
  entities: any
  displayTextRange: [number, number] | null
  media: any[]
  possiblySensitive: boolean
  likeCount: number
  liked: boolean
  replyCount: number
  quoteCount: number
  quotedId: string | null
  isTranslatable: boolean
  card: {title: string | null, description: string | null, domain: string | null} | null
  poll: {choices: {label: string, count: number}[], endsAt: Date | null, final: boolean, selected: number | null} | null
  quoted: InlineReply | null
  quoteUnavailable: boolean
}

export type InlineReplies = {
  status: 'loading' | 'loaded' | 'error'
  path: string
  replies: InlineReply[]
  /** The tweet's reply count, if known */
  replyCount: number | null
  shown: number
  cursor: string | null
  fetched: boolean
  error?: string
}

export type InlineReplyTranslation = {
  status: 'loading' | 'loaded' | 'error'
  shown: boolean
  text?: string
  entities?: any
  sourceLanguage?: string
}

export type QuoteConversation = {
  tweet: InlineReply
  ancestors: InlineReply[]
  replies: InlineReply[]
  cursor: string | null
}

export type QuoteReaderState = {
  id: string
  path: string
  /** Header title when not showing a quoted post */
  title?: string
  status: 'loading' | 'loaded' | 'error'
  scrollTop: number
  focusOnLoad?: boolean
  resolveQuote: boolean | number
  conversation?: QuoteConversation
  error?: string
  mode?: 'post' | 'quotes'
  quotes?: InlineReply[]
  cursor?: string | null
  fetched?: boolean
}

/** A question about a post (null for "what is this about?") and its answer */
export type AskTurn = {
  question: string | null
  status: 'loading' | 'loaded' | 'error'
  /** Asked with the stronger "Think harder" model */
  deep: boolean
  answer?: string
  model?: string
  elapsedMs?: number
  error?: string
}

export type AskThread = {
  /** The post's details, kept for follow-up questions */
  context?: {post: AskPost, ancestors: AskPost[], replies: {author: string, text: string}[]}
  turns: AskTurn[]
}

/** Post details sent to the ask helper */
export type AskPost = {
  url: string
  author: string
  createdAt: string | null
  lang: string | null
  replyingTo?: string
  text: string
  translation?: string
  card?: InlineReply['card']
  media: {type: string, imageUrl: string, videoUrl?: string, durationMs?: number, alt?: string}[]
  quoted?: AskPost
}

export type UserInfo = {
  following: boolean
  followedBy: boolean
  followersCount: number
}

export type UserInfoObject = {[index: string]: UserInfo}

export type VerifiedType = 'BLUE' | 'BUSINESS' | 'GOVERNMENT'
