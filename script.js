void function() {

const XMLHttpRequest_open = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = function(method, url) {
  if (!config.enabled) return XMLHttpRequest_open.apply(this, [method, url])

  if (url.includes('/TweetDetail?')) {
    rememberTweetDetailRequest(url)
  }
  if (url.includes('/SearchTimeline?')) rememberQuoteSearchRequest(url)

  if (config.sortReplies != 'relevant' && !userSortedReplies && url.includes('/TweetDetail?')) {
    try {
      let request = new URL(url)
      let params = new URLSearchParams(request.search)
      let variables = JSON.parse(decodeURIComponent(params.get('variables')))
      if (typeof variables?.rankingMode == 'string') {
        let rankingMode = {
          liked: 'Likes',
          recent: 'Recency',
        }[config.sortReplies]
        if (variables.rankingMode != rankingMode) {
          log('sortReplies: forcing sort by', config.sortReplies)
          variables.rankingMode = rankingMode
          params.set('variables', JSON.stringify(variables))
          url = `${request.origin}${request.pathname}?${params.toString()}`
        }
      } else {
        warn('sortReplies: typeof variables.rankingMode is', typeof variables?.rankingMode)
      }
    } catch (e) {
      error('sortReplies: error patching rankingMode', e)
    }
  }
  else if (config.sortFollowing != 'ignore' && !userSortedFollowing && url.includes('/HomeLatestTimeline')) {
    if (method.toUpperCase() == 'GET') {
      try {
        let request = new URL(url)
        let params = new URLSearchParams(request.search)
        let variables = JSON.parse(decodeURIComponent(params.get('variables')))
        if (typeof variables?.enableRanking == 'boolean') {
          let enableRanking = config.sortFollowing == 'popular'
          if (variables.enableRanking != enableRanking) {
            log('sortFollowing: forcing sort by', config.sortFollowing)
            variables.enableRanking = enableRanking
            params.set('variables', JSON.stringify(variables))
            url = `${request.origin}${request.pathname}?${params.toString()}`
          }
        } else {
          warn('sortFollowing: typeof variables.enableRanking is', typeof variables?.enableRanking)
        }
      } catch (e) {
        error('sortFollowing: error patching enableRanking', e)
      }
    } else {
      // @ts-expect-error
      this._method = method.toUpperCase()
      // @ts-expect-error
      this._url = url
    }
  }

  return XMLHttpRequest_open.apply(this, [method, url])
}

const XMLHttpRequest_send = XMLHttpRequest.prototype.send
XMLHttpRequest.prototype.send = function(body) {
  if (
    !config.enabled || typeof body != 'string' || !body ||
    // @ts-expect-error
    this._method != 'POST' || !this._url
  ) return XMLHttpRequest_send.apply(this, [body])

  if (config.sortFollowing != 'ignore' && !userSortedFollowing &&
      // @ts-expect-error
      this._url?.includes('/HomeLatestTimeline')) {
    try {
      let data = JSON.parse(body)
      if (data?.variables != null && typeof data.variables == 'object') {
        let variables = data.variables
        if (typeof variables?.enableRanking == 'boolean') {
          let enableRanking = config.sortFollowing == 'popular'
          if (variables.enableRanking != enableRanking) {
            log('sortFollowing: forcing sort by', config.sortFollowing)
            variables.enableRanking = enableRanking
            body = JSON.stringify(data)
          }
        } else {
          warn('sortFollowing: typeof variables.enableRanking is', typeof variables?.enableRanking)
        }
      }
    } catch (e) {
      error('sortFollowing: error patching enableRanking', e)
    }
  }

  return XMLHttpRequest_send.apply(this, [body])
}

let debug = false

/** @type {boolean} */
let desktop
/** @type {boolean} */
let mobile
let isSafari = navigator.userAgent.includes('Safari/') && !/Chrom(e|ium)\//.test(navigator.userAgent)

/** @type {HTMLHtmlElement} */
let $html
/** @type {HTMLElement} */
let $body
/** @type {HTMLElement} */
let $reactRoot
/** @type {string} */
let lang
/** @type {string} */
let dir
/** @type {boolean} */
let ltr

//#region Default config
/**
 * @type {import("./types").Config}
 */
const config = {
  enabled: true,
  debug: false,
  debugLogTimelineStats: false,
  // Shared
  addAddMutedWordMenuItem: true,
  addFocusedTweetAccountLocation: true,
  alwaysUseLatestTweets: false,
  bypassAgeVerification: true,
  darkModeTheme: 'lightsOut',
  defaultToLatestSearch: false,
  disableHomeTimeline: false,
  disableNflFeatures: true,
  disabledHomeTimelineRedirect: 'notifications',
  disableTweetTextFormatting: false,
  dontUseChirpFont: false,
  dropdownMenuFontWeight: true,
  fastBlock: true,
  followButtonStyle: 'monochrome',
  hideAdsNav: true,
  hideBookmarkButton: false,
  hideBookmarkMetrics: true,
  hideBusinessNav: true,
  hideCalls: false,
  hideChatNav: false,
  hideCommunitiesNav: false,
  hideComposeTweet: false,
  hideConnectNav: true,
  hideCreatorStudioNav: true,
  hideEditImage: true,
  hideExplorePageContents: true,
  hideFollowingMetrics: true,
  hideForYouTimeline: false,
  hideGrokNav: true,
  hideGrokTweets: false,
  hideHistoryNav: false,
  hideInlinePrompts: true,
  hideJobsNav: true,
  hideLikeMetrics: true,
  hideListsNav: false,
  hideManageTimelines: false,
  hideMetrics: false,
  hideMoney: true,
  hideMoreFromThisAuthor: true,
  hideMoreTweets: true,
  hideNotificationLikes: false,
  hideNotificationRetweets: false,
  hideNotifications: 'ignore',
  hideProfileRetweets: false,
  hideQuoteTweetMetrics: true,
  hideQuotesFrom: [],
  hideReplyMetrics: true,
  hideRetweetMetrics: true,
  hideSeeNewTweets: false,
  hideShareTweetButton: false,
  hideSortRepliesMenu: false,
  hideSubscriptions: true,
  hideSuggestedContentSearch: true,
  hideTotalTweetsMetrics: true,
  hideTwitterBlueReplies: false,
  hideTwitterBlueUpsells: true,
  hideUnavailableQuoteTweets: true,
  hideVerifiedNotificationsTab: true,
  hideViewActivityLinks: true,
  hideViews: false,
  hideWhoToFollowEtc: true,
  inlineReplies: true,
  autoTranslateReplies: true,
  dontTranslateLanguages: 'en',
  askAboutPosts: false,
  askOpenInReader: true,
  inlineReplyActions: true,
  keyboardShortcuts: true,
  quoteTweetPreview: true,
  hoverImagePreview: true,
  compactNavigation: true,
  listRetweets: 'ignore',
  mutableQuoteTweets: true,
  mutedQuotes: [],
  quoteTweets: 'ignore',
  reducedInteractionMode: false,
  replaceLogo: true,
  restoreLinkHeadlines: true,
  restoreOtherInteractionLinks: true,
  restoreQuoteTweetsLink: true,
  restoreTweetSource: true,
  retweets: 'ignore',
  revertMediaCarousel: true,
  revertProfileTabs: false,
  revertTwemoji: true,
  showBlueReplyFollowersCount: false,
  showBlueReplyFollowersCountAmount: '1000000',
  showBookmarkButtonUnderFocusedTweets: true,
  showPremiumReplyBusiness: true,
  showPremiumReplyFollowedBy: true,
  showPremiumReplyFollowing: true,
  showPremiumReplyGovernment: true,
  sortFollowing: 'popular',
  sortReplies: 'liked',
  tweakQuoteTweetsPage: true,
  twitterBlueChecks: 'replace',
  unblurSensitiveContent: false,
  uninvertFollowButtons: true,
  // Experiments
  customCss: '',
  // Desktop only
  addUserHoverCardAccountLocation: true,
  fullWidthContent: false,
  fullWidthMedia: true,
  hideAccountSwitcher: false,
  hideExploreNav: true,
  hideExploreNavWithSidebar: true,
  hideLiveBroadcasts: false,
  hideMessagesDrawer: true,
  hideSidebarContent: true,
  hideSpacesNav: false,
  hideSuggestedFollows: false,
  hideTimelineTweetBox: false,
  hideTodaysNews: false,
  hideWhatsHappening: false,
  navBaseFontSize: true,
  navDensity: 'default',
  showRelevantPeople: false,
  // Mobile only
  hideLiveBroadcastBar: false,
  hideMessagesBottomNavItem: false,
  preventNextVideoAutoplay: true,
}
//#endregion

//#region Locales
/**
 * @type {Record<string, import("./types").Locale>}
 */
const locales = {
  'ar-x-fm': {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'الحساب موجود في ' + e.country
    },
    ADD_ANOTHER_TWEET: 'ضافة تغريدة أخرى',
    ADD_MUTED_WORD: 'اضافة كلمة مكتومة',
    GROK_ACTIONS: 'إجراءات Grok',
    HOME: 'الرئيسيّة',
    LIKES: 'الإعجابات',
    LIVE_ON_X: 'بث مباشر على X',
    MOST_RELEVANT: 'الأكثر ملائمة',
    MUTE_THIS_CONVERSATION: 'كتم هذه المحادثه',
    POST_ALL: 'نشر الكل',
    POST_UNAVAILABLE: 'هذا المنشور غير متاح.',
    PROFILE_SUMMARY: 'ملخص الملف الشخصيّ',
    QUOTES: 'اقتباسات',
    QUOTE_TWEET: 'اقتباس التغريدة',
    QUOTE_TWEETS: 'تغريدات اقتباس',
    RECENT: 'الحديثة',
    RELEVANT: 'ذو صلة',
    REPOST: 'إعادة النشر',
    REPOSTS: 'المنشورات المُعاد نشرها',
    RETWEET: 'إعادة التغريد',
    RETWEETED_BY: 'مُعاد تغريدها بواسطة',
    RETWEETS: 'إعادات التغريد',
    SHARED: 'مشترك',
    SHARED_TWEETS: 'التغريدات المشتركة',
    SHOW: 'إظهار',
    SHOW_MORE_REPLIES: 'عرض المزيد من الردود',
    SORT_BY: 'فرز حسب',
    SORT_REPLIES: 'فرز الردود',
    TURN_OFF_QUOTE_TWEETS: 'تعطيل تغريدات اقتباس',
    TURN_OFF_RETWEETS: 'تعطيل إعادة التغريد',
    TURN_ON_RETWEETS: 'تفعيل إعادة التغريد',
    TWEET: 'غرّدي',
    TWEETS: 'التغريدات',
    TWEET_ALL: 'تغريد الكل',
    TWEET_INTERACTIONS: 'تفاعلات التغريدة',
    TWEET_YOUR_REPLY: 'التغريد بردك',
    TWITTER: 'تويتر',
    UNDO_RETWEET: 'التراجع عن التغريدة',
    VIEW: 'عرض',
    WHATS_HAPPENING: 'ماذا يحدث؟',
  },
  ar: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'الحساب موجود في ' + e.country
    },
    ADD_ANOTHER_TWEET: 'ضافة تغريدة أخرى',
    ADD_MUTED_WORD: 'اضافة كلمة مكتومة',
    GROK_ACTIONS: 'إجراءات Grok',
    HOME: 'الرئيسيّة',
    LIKES: 'الإعجابات',
    LIVE_ON_X: 'بث مباشر على X',
    MOST_RELEVANT: 'الأكثر ملائمة',
    MUTE_THIS_CONVERSATION: 'كتم هذه المحادثه',
    POST_ALL: 'نشر الكل',
    POST_UNAVAILABLE: 'هذا المنشور غير متاح.',
    PROFILE_SUMMARY: 'ملخص الملف الشخصيّ',
    QUOTE: 'اقتباس',
    QUOTES: 'اقتباسات',
    QUOTE_TWEET: 'اقتباس التغريدة',
    QUOTE_TWEETS: 'تغريدات اقتباس',
    RECENT: 'الحديثة',
    RELEVANT: 'ذو صلة',
    REPOST: 'إعادة النشر',
    REPOSTS: 'المنشورات المُعاد نشرها',
    RETWEET: 'إعادة التغريد',
    RETWEETED_BY: 'مُعاد تغريدها بواسطة',
    RETWEETS: 'إعادات التغريد',
    SHARED: 'مشترك',
    SHARED_TWEETS: 'التغريدات المشتركة',
    SHOW: 'إظهار',
    SHOW_MORE_REPLIES: 'عرض المزيد من الردود',
    SORT_BY: 'فرز حسب',
    SORT_REPLIES: 'فرز الردود',
    TURN_OFF_QUOTE_TWEETS: 'تعطيل تغريدات اقتباس',
    TURN_OFF_RETWEETS: 'تعطيل إعادة التغريد',
    TURN_ON_RETWEETS: 'تفعيل إعادة التغريد',
    TWEET: 'تغريد',
    TWEETS: 'التغريدات',
    TWEET_ALL: 'تغريد الكل',
    TWEET_INTERACTIONS: 'تفاعلات التغريدة',
    TWEET_YOUR_REPLY: 'التغريد بردك',
    UNDO_RETWEET: 'التراجع عن التغريدة',
    VIEW: 'عرض',
    WHATS_HAPPENING: 'ماذا يحدث؟',
  },
  bg: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Профил, базиран в/ъв ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Добавяне на друг туит',
    ADD_MUTED_WORD: 'Добавяне на заглушена дума',
    GROK_ACTIONS: 'Действия, свързани с Grok',
    HOME: 'Начало',
    LIKES: 'Харесвания',
    LIVE_ON_X: 'На живо в X',
    MOST_RELEVANT: 'Най-подходящи',
    MUTE_THIS_CONVERSATION: 'Заглушаване на разговора',
    POST_ALL: 'Публикуване на всичко',
    POST_UNAVAILABLE: 'Тази публикация не е налична.',
    PROFILE_SUMMARY: 'Резюме на профила',
    QUOTE: 'Цитат',
    QUOTES: 'Цитати',
    QUOTE_TWEET: 'Цитиране на туита',
    QUOTE_TWEETS: 'Туитове с цитат',
    RECENT: 'Скорошни',
    RELEVANT: 'Уместно',
    REPOST: 'Препубликуване',
    REPOSTS: 'Препубликувания',
    RETWEET: 'Ретуитване',
    RETWEETED_BY: 'Ретуитнат от',
    RETWEETS: 'Ретуитове',
    SHARED: 'Споделен',
    SHARED_TWEETS: 'Споделени туитове',
    SHOW: 'Показване',
    SHOW_MORE_REPLIES: 'Показване на още отговори',
    SORT_BY: 'Сортиране по',
    SORT_REPLIES: 'Сортиране на отговорите',
    TURN_OFF_QUOTE_TWEETS: 'Изключване на туитове с цитат',
    TURN_OFF_RETWEETS: 'Изключване на ретуитовете',
    TURN_ON_RETWEETS: 'Включване на ретуитовете',
    TWEET: 'Туит',
    TWEETS: 'Туитове',
    TWEET_ALL: 'Туитване на всички',
    TWEET_INTERACTIONS: 'Интеракции с туит',
    TWEET_YOUR_REPLY: 'туит своя отговор',
    UNDO_RETWEET: 'Отмяна на ретуитването',
    VIEW: 'Преглед',
    WHATS_HAPPENING: 'Какво се случва?',
  },
  bn: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return e.country + '-এর ওপর ভিত্তি করে অ্যাকাউন্ট'
    },
    ADD_ANOTHER_TWEET: 'অন্য টুইট যোগ করুন',
    ADD_MUTED_WORD: 'নীরব করা শব্দ যোগ করুন',
    GROK_ACTIONS: 'Grok কার্যকলাপ',
    HOME: 'হোম',
    LIKES: 'পছন্দ',
    LIVE_ON_X: 'X-এ লাইভ',
    MOST_RELEVANT: 'সবচেয়ে প্রাসঙ্গিক',
    MUTE_THIS_CONVERSATION: 'এই কথা-বার্তা নীরব করুন',
    POST_ALL: 'সবকটি পোস্ট করুন',
    POST_UNAVAILABLE: 'এই পোস্টটি অনুপলভ্য।',
    PROFILE_SUMMARY: 'প্রোফাইল সারসংক্ষেপ',
    QUOTE: 'উদ্ধৃতি',
    QUOTES: 'উদ্ধৃতিগুলো',
    QUOTE_TWEET: 'টুইট উদ্ধৃত করুন',
    QUOTE_TWEETS: 'টুইট উদ্ধৃতিগুলো',
    RECENT: 'সাম্প্রতিক',
    RELEVANT: 'প্রাসঙ্গিক',
    REPOST: 'রিপোস্ট',
    REPOSTS: 'রিপোস্ট',
    RETWEET: 'পুনঃটুইট',
    RETWEETED_BY: 'পুনঃ টুইট করেছেন',
    RETWEETS: 'পুনঃটুইটগুলো',
    SHARED: 'ভাগ করা',
    SHARED_TWEETS: 'ভাগ করা টুইটগুলি',
    SHOW: 'দেখান',
    SHOW_MORE_REPLIES: 'আরও উত্তর দেখান',
    SORT_BY: 'ক্রমানুসার',
    SORT_REPLIES: 'উত্তরগুলো বাছুন',
    TURN_OFF_QUOTE_TWEETS: 'উদ্ধৃতি টুইটগুলি বন্ধ করুন',
    TURN_OFF_RETWEETS: 'পুনঃ টুইটগুলি বন্ধ করুন',
    TURN_ON_RETWEETS: 'পুনঃ টুইটগুলি চালু করুন',
    TWEET: 'টুইট',
    TWEETS: 'টুইটগুলি',
    TWEET_ALL: 'সব টুইট করুন',
    TWEET_INTERACTIONS: 'টুইট ইন্টারেকশন',
    TWEET_YOUR_REPLY: 'আপনার উত্তর টুইট করুন',
    TWITTER: 'টুইটার',
    UNDO_RETWEET: 'পুনঃ টুইট পুর্বাবস্থায় ফেরান',
    VIEW: 'দেখুন',
    WHATS_HAPPENING: 'কি খবর?',
  },
  ca: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Compte ubicat a ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Afegeix un altre tuit',
    ADD_MUTED_WORD: 'Afegeix una paraula silenciada',
    GROK_ACTIONS: 'Accions de Grok',
    HOME: 'Inici',
    LIKES: 'Agradaments',
    LIVE_ON_X: 'En directe a X',
    MOST_RELEVANT: 'El més rellevant',
    MUTE_THIS_CONVERSATION: 'Silencia la conversa',
    POST_ALL: 'Publica-ho tot',
    POST_UNAVAILABLE: 'Aquesta publicació no està disponible.',
    PROFILE_SUMMARY: 'Resum del perfil',
    QUOTE: 'Cita',
    QUOTES: 'Cites',
    QUOTE_TWEET: 'Cita el tuit',
    QUOTE_TWEETS: 'Tuits amb cita',
    RECENT: 'Recents',
    RELEVANT: 'Rellevant',
    REPOST: 'Republicació',
    REPOSTS: 'Republicacions',
    RETWEET: 'Retuit',
    RETWEETED_BY: 'Retuitat per',
    RETWEETS: 'Retuits',
    SHARED: 'Compartit',
    SHARED_TWEETS: 'Tuits compartits',
    SHOW: 'Mostra',
    SHOW_MORE_REPLIES: 'Mostra més respostes',
    SORT_BY: 'Ordena per',
    SORT_REPLIES: 'Ordena les respostes',
    TURN_OFF_QUOTE_TWEETS: 'Desactiva els tuits amb cita',
    TURN_OFF_RETWEETS: 'Desactiva els retuits',
    TURN_ON_RETWEETS: 'Activa els retuits',
    TWEET: 'Tuita',
    TWEETS: 'Tuits',
    TWEET_ALL: 'Tuita-ho tot',
    TWEET_INTERACTIONS: 'Interaccions amb tuits',
    TWEET_YOUR_REPLY: 'Tuita la teva resposta',
    UNDO_RETWEET: 'Desfés el retuit',
    VIEW: 'Mostra',
    WHATS_HAPPENING: 'Què passa?',
  },
  cs: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Účet založen v ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Přidat další Tweet',
    ADD_MUTED_WORD: 'Přidat slovo na seznam skrytých slov',
    GROK_ACTIONS: 'Akce funkce Grok',
    HOME: 'Hlavní stránka',
    LIKES: 'Lajky',
    LIVE_ON_X: 'Živě na platformě X',
    MOST_RELEVANT: 'Nejvíce související',
    MUTE_THIS_CONVERSATION: 'Skrýt tuto konverzaci',
    POST_ALL: 'Postovat vše',
    POST_UNAVAILABLE: 'Tento post není dostupný.',
    PROFILE_SUMMARY: 'Souhrn profilu',
    QUOTE: 'Citace',
    QUOTES: 'Citace',
    QUOTE_TWEET: 'Citovat Tweet',
    QUOTE_TWEETS: 'Tweety s citací',
    RECENT: 'Poslední',
    RELEVANT: 'Související',
    REPOSTS: 'Reposty',
    RETWEET: 'Retweetnout',
    RETWEETED_BY: 'Retweetnuto uživateli',
    RETWEETS: 'Retweety',
    SHARED: 'Sdílený',
    SHARED_TWEETS: 'Sdílené tweety',
    SHOW: 'Zobrazit',
    SHOW_MORE_REPLIES: 'Zobrazit další odpovědi',
    SORT_BY: 'Seřadit podle',
    SORT_REPLIES: 'Seřadit odpovědi',
    TURN_OFF_QUOTE_TWEETS: 'Vypnout tweety s citací',
    TURN_OFF_RETWEETS: 'Vypnout retweety',
    TURN_ON_RETWEETS: 'Zapnout retweety',
    TWEET: 'Tweetovat',
    TWEETS: 'Tweety',
    TWEET_ALL: 'Tweetnout vše',
    TWEET_INTERACTIONS: 'Tweetovat interakce',
    TWEET_YOUR_REPLY: 'Tweetujte svou odpověď',
    UNDO_RETWEET: 'Zrušit Retweet',
    VIEW: 'Zobrazit',
    WHATS_HAPPENING: 'Co se děje?',
  },
  da: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Konto baseret i ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Tilføj endnu et Tweet',
    ADD_MUTED_WORD: 'Tilføj skjult ord',
    GROK_ACTIONS: 'Grok-handlinger',
    HOME: 'Forside',
    LIVE_ON_X: 'Direkte på X',
    MOST_RELEVANT: 'Mest relevante',
    MUTE_THIS_CONVERSATION: 'Skjul denne samtale',
    POST_ALL: 'Post alle',
    POST_UNAVAILABLE: 'Denne post er ikke tilgængelig.',
    PROFILE_SUMMARY: 'Profilresumé',
    QUOTE: 'Citat',
    QUOTES: 'Citater',
    QUOTE_TWEET: 'Citér Tweet',
    QUOTE_TWEETS: 'Citat-Tweets',
    RECENT: 'Nye',
    RETWEETED_BY: 'Retweetet af',
    SHARED: 'Delt',
    SHARED_TWEETS: 'Delte tweets',
    SHOW: 'Vis',
    SHOW_MORE_REPLIES: 'Vis flere svar',
    SORT_BY: 'Sorter efter',
    SORT_REPLIES: 'Sortér svar',
    TURN_OFF_QUOTE_TWEETS: 'Slå Citat-Tweets fra',
    TURN_OFF_RETWEETS: 'Slå Retweets fra',
    TURN_ON_RETWEETS: 'Slå Retweets til',
    TWEET_ALL: 'Tweet alt',
    TWEET_INTERACTIONS: 'Tweet-interaktioner',
    TWEET_YOUR_REPLY: 'Tweet dit svar',
    UNDO_RETWEET: 'Fortryd Retweet',
    VIEW: 'Vis',
    WHATS_HAPPENING: 'Hvad sker der?',
  },
  de: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Account befindet sich in ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Weiteren Tweet hinzufügen',
    ADD_MUTED_WORD: 'Stummgeschaltetes Wort hinzufügen',
    GROK_ACTIONS: 'Grok-Aktionen',
    HOME: 'Startseite',
    LIKES: 'Gefällt mir',
    LIVE_ON_X: 'Live auf X',
    MOST_RELEVANT: 'Besonders relevant',
    MUTE_THIS_CONVERSATION: 'Diese Konversation stummschalten',
    POST_ALL: 'Alle posten',
    POST_UNAVAILABLE: 'Dieser Post ist nicht verfügbar.',
    PROFILE_SUMMARY: 'Kurzprofil',
    QUOTE: 'Zitat',
    QUOTES: 'Zitate',
    QUOTE_TWEET: 'Tweet zitieren',
    QUOTE_TWEETS: 'Zitierte Tweets',
    RECENT: 'Neueste',
    REPOST: 'Reposten',
    RETWEET: 'Retweeten',
    RETWEETED_BY: 'Retweetet von',
    SHARED: 'Geteilt',
    SHARED_TWEETS: 'Geteilte Tweets',
    SHOW: 'Anzeigen',
    SHOW_MORE_REPLIES: 'Mehr Antworten anzeigen',
    SORT_BY: 'Sortieren nach',
    SORT_REPLIES: 'Antworten sortieren',
    TURN_OFF_QUOTE_TWEETS: 'Zitierte Tweets ausschalten',
    TURN_OFF_RETWEETS: 'Retweets ausschalten',
    TURN_ON_RETWEETS: 'Retweets einschalten',
    TWEET: 'Twittern',
    TWEET_ALL: 'Alle twittern',
    TWEET_INTERACTIONS: 'Tweet-Interaktionen',
    TWEET_YOUR_REPLY: 'Twittere deine Antwort',
    UNDO_RETWEET: 'Retweet rückgängig machen',
    VIEW: 'Anzeigen',
    WHATS_HAPPENING: 'Was gibt’s Neues?',
  },
  el: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Λογαριασμός με βάση σε ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Προσθήκη άλλου Tweet',
    ADD_MUTED_WORD: 'Προσθήκη λέξης σε σίγαση',
    GROK_ACTIONS: 'Δράσεις Grok',
    HOME: 'Αρχική σελίδα',
    LIKES: '"Μου αρέσει"',
    LIVE_ON_X: 'Ζωντανά στο X',
    MOST_RELEVANT: 'Πιο σχετική',
    MUTE_THIS_CONVERSATION: 'Σίγαση αυτής της συζήτησης',
    POST_ALL: 'Δημοσίευση όλων',
    POST_UNAVAILABLE: 'Αυτή η ανάρτηση δεν είναι διαθέσιμη.',
    PROFILE_SUMMARY: ' Περίληψη προφίλ',
    QUOTE: 'Παράθεση',
    QUOTES: 'Παραθέσεις',
    QUOTE_TWEET: 'Παράθεση Tweet',
    QUOTE_TWEETS: 'Tweet με παράθεση',
    RECENT: 'Πρόσφατα',
    RELEVANT: 'Σχετικό',
    REPOST: 'Αναδημοσίευση',
    REPOSTS: 'Αναδημοσιεύσεις',
    RETWEETED_BY: 'Έγινε Retweet από',
    RETWEETS: 'Retweet',
    SHARED: 'Κοινόχρηστο',
    SHARED_TWEETS: 'Κοινόχρηστα Tweets',
    SHOW: 'Εμφάνιση',
    SHOW_MORE_REPLIES: 'Εμφάνιση περισσότερων απαντήσεων',
    SORT_BY: 'Ταξινόμηση κατά',
    SORT_REPLIES: 'Ταξινόμηση απαντήσεων',
    TURN_OFF_QUOTE_TWEETS: 'Απενεργοποίηση των tweet με παράθεση',
    TURN_OFF_RETWEETS: 'Απενεργοποίηση των Retweet',
    TURN_ON_RETWEETS: 'Ενεργοποίηση των Retweet',
    TWEETS: 'Tweet',
    TWEET_ALL: 'Δημοσίευση όλων ως Tweet',
    TWEET_INTERACTIONS: 'Αλληλεπιδράσεις με tweet',
    TWEET_YOUR_REPLY: 'Στείλτε την απάντησή σας',
    UNDO_RETWEET: 'Αναίρεση Retweet',
    VIEW: 'Προβολή',
    WHATS_HAPPENING: 'Τι συμβαίνει;',
  },
  en: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Account based in ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Add another Tweet',
    ADD_MUTED_WORD: 'Add muted word',
    GROK_ACTIONS: 'Grok actions',
    HOME: 'Home',
    LIKES: 'Likes',
    LIVE_ON_X: 'Live on X',
    MOST_RELEVANT: 'Most relevant',
    MUTE_THIS_CONVERSATION: 'Mute this conversation',
    POST_ALL: 'Post all',
    POST_UNAVAILABLE: 'This post is unavailable.',
    PROFILE_SUMMARY: 'Profile Summary',
    QUOTE: 'Quote',
    QUOTES: 'Quotes',
    QUOTE_TWEET: 'Quote Tweet',
    QUOTE_TWEETS: 'Quote Tweets',
    RECENT: 'Recent',
    RELEVANT: 'Relevant',
    REPOST: 'Repost',
    REPOSTS: 'Reposts',
    RETWEET: 'Retweet',
    RETWEETED_BY: 'Retweeted by',
    RETWEETS: 'Retweets',
    SHARED: 'Shared',
    SHARED_TWEETS: 'Shared Tweets',
    SHOW: 'Show',
    SHOW_MORE_REPLIES: 'Show more replies',
    SORT_BY: 'Sort by',
    SORT_REPLIES: 'Sort replies',
    TURN_OFF_QUOTE_TWEETS: 'Turn off Quote Tweets',
    TURN_OFF_RETWEETS: 'Turn off Retweets',
    TURN_ON_RETWEETS: 'Turn on Retweets',
    TWEET: 'Tweet',
    TWEETS: 'Tweets',
    TWEET_ALL: 'Tweet all',
    TWEET_INTERACTIONS: 'Tweet interactions',
    TWEET_YOUR_REPLY: 'Tweet your reply',
    TWITTER: 'Twitter',
    UNDO_RETWEET: 'Undo Retweet',
    VIEW: 'View',
    WHATS_HAPPENING: "What's happening?",
  },
  es: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Cuenta con sede en ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Agregar otro Tweet',
    ADD_MUTED_WORD: 'Añadir palabra silenciada',
    GROK_ACTIONS: 'Acciones de Grok',
    HOME: 'Inicio',
    LIKES: 'Me gusta',
    LIVE_ON_X: 'En directo en X',
    MOST_RELEVANT: 'Más relevantes',
    MUTE_THIS_CONVERSATION: 'Silenciar esta conversación',
    POST_ALL: 'Postear todo',
    POST_UNAVAILABLE: 'Este post no está disponible.',
    PROFILE_SUMMARY: 'Resumen del perfil',
    QUOTE: 'Cita',
    QUOTES: 'Citas',
    QUOTE_TWEET: 'Citar Tweet',
    QUOTE_TWEETS: 'Tweets citados',
    RECENT: 'Recientes',
    RELEVANT: 'Relevante',
    REPOST: 'Repostear',
    RETWEET: 'Retwittear',
    RETWEETED_BY: 'Retwitteado por',
    SHARED: 'Compartido',
    SHARED_TWEETS: 'Tweets compartidos',
    SHOW: 'Mostrar',
    SHOW_MORE_REPLIES: 'Mostrar más respuestas',
    SORT_BY: 'Ordenar por',
    SORT_REPLIES: 'Organizar respuestas',
    TURN_OFF_QUOTE_TWEETS: 'Desactivar tweets citados',
    TURN_OFF_RETWEETS: 'Desactivar Retweets',
    TURN_ON_RETWEETS: 'Activar Retweets',
    TWEET: 'Twittear',
    TWEET_ALL: 'Twittear todo',
    TWEET_INTERACTIONS: 'Interacciones con Tweet',
    TWEET_YOUR_REPLY: 'Twittea tu respuesta',
    UNDO_RETWEET: 'Deshacer Retweet',
    VIEW: 'Ver',
    WHATS_HAPPENING: '¿Qué está pasando?',
  },
  eu: {
    ADD_ANOTHER_TWEET: 'Gehitu beste txio bat',
    ADD_MUTED_WORD: 'Gehitu isilarazitako hitza',
    HOME: 'Hasiera',
    LIKES: 'Atsegiteak',
    MUTE_THIS_CONVERSATION: 'Isilarazi elkarrizketa hau',
    QUOTE: 'Aipamena',
    QUOTES: 'Aipamenak',
    QUOTE_TWEET: 'Txioa apaitu',
    QUOTE_TWEETS: 'Aipatu txioak',
    RECENT: 'Azkenak',
    RELEVANT: 'Aipagarria',
    RETWEET: 'Bertxiotu',
    RETWEETED_BY: 'Bertxiotua:',
    RETWEETS: 'Bertxioak',
    SHARED: 'Partekatua',
    SHARED_TWEETS: 'Partekatutako',
    SHOW: 'Erakutsi',
    SHOW_MORE_REPLIES: 'Erakutsi erantzun gehiago',
    SORT_BY: 'Ordenatzeko irizpidea:',
    TURN_OFF_QUOTE_TWEETS: 'Desaktibatu aipatu txioak',
    TURN_OFF_RETWEETS: 'Desaktibatu birtxioak',
    TURN_ON_RETWEETS: 'Aktibatu birtxioak',
    TWEET: 'Txio',
    TWEETS: 'Txioak',
    TWEET_ALL: 'Txiotu guztiak',
    TWEET_INTERACTIONS: 'Txio elkarrekintzak',
    TWEET_YOUR_REPLY: 'Txiotu zure erantzuna',
    UNDO_RETWEET: 'Desegin birtxiokatzea',
    VIEW: 'Ikusi',
    WHATS_HAPPENING: 'Zer gertatzen ari da?',
  },
  fa: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'حساب کاربری واقع در ' + e.country
    },
    ADD_ANOTHER_TWEET: 'افزودن توییت دیگر',
    ADD_MUTED_WORD: 'افزودن واژه خموش‌سازی شده',
    GROK_ACTIONS: 'کنش‌های Grok',
    HOME: 'خانه',
    LIKES: 'پسندها',
    LIVE_ON_X: 'زنده در X',
    MOST_RELEVANT: 'مرتبط‌ترین',
    MUTE_THIS_CONVERSATION: 'خموش‌سازی این گفتگو',
    POST_ALL: 'پست کردن همه',
    POST_UNAVAILABLE: 'این پست دردسترس نیست.',
    PROFILE_SUMMARY: 'خلاصه نمایه',
    QUOTE: 'نقل‌قول',
    QUOTES: 'نقل‌قول‌ها',
    QUOTE_TWEET: 'نقل‌توییت',
    QUOTE_TWEETS: 'نقل‌توییت‌ها',
    RECENT: 'اخیر',
    RELEVANT: 'مربوط',
    REPOST: 'بازپست',
    REPOSTS: 'بازپست',
    RETWEET: 'بازتوییت',
    RETWEETED_BY: 'بازتوییت‌ شد توسط',
    RETWEETS: 'بازتوییت‌ها',
    SHARED: 'مشترک',
    SHARED_TWEETS: 'توییتهای مشترک',
    SHOW: 'نمایش',
    SHOW_MORE_REPLIES: 'نمایش پاسخ‌های بیشتر',
    SORT_BY: 'مرتب‌سازی براساس',
    SORT_REPLIES: 'مرتب‌سازی پاسخ‌ها',
    TURN_OFF_QUOTE_TWEETS: 'غیرفعال‌سازی نقل‌توییت‌ها',
    TURN_OFF_RETWEETS: 'غیرفعال‌سازی بازتوییت‌ها',
    TURN_ON_RETWEETS: 'فعال سازی بازتوییت‌ها',
    TWEET: 'توییت',
    TWEETS: 'توييت‌ها',
    TWEET_ALL: 'توییت به همه',
    TWEET_INTERACTIONS: 'تعاملات توییت',
    TWEET_YOUR_REPLY: 'پاسختان را توییت کنید',
    TWITTER: 'توییتر',
    UNDO_RETWEET: 'لغو بازتوییت',
    VIEW: 'مشاهده',
    WHATS_HAPPENING: 'چه خبر؟',
  },
  fi: {
    ACCOUNT_BASED_IN_FN: function (a) {
      return 'Tilin kotimaa on ' + a.country
    },
    ADD_ANOTHER_TWEET: 'Lisää vielä twiitti',
    ADD_MUTED_WORD: 'Lisää hiljennetty sana',
    GROK_ACTIONS: 'Grok-toiminnat',
    HOME: 'Etusivu',
    LIKES: 'Tykkäykset',
    LIVE_ON_X: 'Livenä X:ssä',
    MOST_RELEVANT: 'Relevanteimmat',
    MUTE_THIS_CONVERSATION: 'Hiljennä tämä keskustelu',
    POST_ALL: 'Julkaise kaikki',
    POST_UNAVAILABLE: 'Tämä julkaisu ei ole saatavilla.',
    PROFILE_SUMMARY: 'Profiilin yhteenveto',
    QUOTE: 'Lainaa',
    QUOTES: 'Lainaukset',
    QUOTE_TWEET: 'Twiitin lainaus',
    QUOTE_TWEETS: 'Twiitin lainaukset',
    RECENT: 'Uusimmat',
    RELEVANT: 'Relevantti',
    REPOST: 'Uudelleenjulkaise',
    REPOSTS: 'Uudelleenjulkaisut',
    RETWEET: 'Uudelleentwiittaa',
    RETWEETED_BY: 'Uudelleentwiitannut',
    RETWEETS: 'Uudelleentwiittaukset',
    SHARED: 'Jaettu',
    SHARED_TWEETS: 'Jaetut twiitit',
    SHOW: 'Näytä',
    SHOW_MORE_REPLIES: 'Näytä lisää vastauksia',
    SORT_BY: 'Lajitteluperuste',
    SORT_REPLIES: 'Lajittele vastaukset',
    TURN_OFF_QUOTE_TWEETS: 'Poista twiitin lainaukset käytöstä',
    TURN_OFF_RETWEETS: 'Poista uudelleentwiittaukset käytöstä',
    TURN_ON_RETWEETS: 'Ota uudelleentwiittaukset käyttöön',
    TWEET: 'Twiittaa',
    TWEETS: 'Twiitit',
    TWEET_ALL: 'Twiittaa kaikki',
    TWEET_INTERACTIONS: 'Twiitin vuorovaikutukset',
    TWEET_YOUR_REPLY: 'Twiittaa vastauksesi',
    UNDO_RETWEET: 'Kumoa uudelleentwiittaus',
    VIEW: 'Näytä',
    WHATS_HAPPENING: 'Missä mennään?',
  },
  fil: {
    ACCOUNT_BASED_IN_FN: function (a) {
      return 'Account na naka-base sa ' + a.country
    },
    ADD_ANOTHER_TWEET: 'Magdagdag ng isa pang Tweet',
    ADD_MUTED_WORD: 'Idagdag ang naka-mute na salita',
    GROK_ACTIONS: 'Mga aksyon ni Grok',
    LIKES: 'Mga Gusto',
    LIVE_ON_X: 'Live sa X',
    MOST_RELEVANT: 'Pinakanauugnay',
    MUTE_THIS_CONVERSATION: 'I-mute ang usapang ito',
    POST_ALL: 'I-post lahat',
    POST_UNAVAILABLE: 'Hindi available ang post na Ito.',
    PROFILE_SUMMARY: 'Buod ng Profile',
    QUOTES: 'Mga Quote',
    QUOTE_TWEET: 'Quote na Tweet',
    QUOTE_TWEETS: 'Mga Quote na Tweet',
    RECENT: 'Kamakailan',
    RELEVANT: 'Nauugnay',
    REPOST: 'I-repost',
    REPOSTS: '(na) Repost',
    RETWEET: 'I-retweet',
    RETWEETED_BY: 'Ni-retweet ni',
    RETWEETS: 'Mga Retweet',
    SHARED: 'Ibinahagi',
    SHARED_TWEETS: 'Mga Ibinahaging Tweet',
    SHOW: 'Ipakita',
    SHOW_MORE_REPLIES: 'Magpakita pa ng mga sagot',
    SORT_BY: 'Isaayos ayon sa',
    SORT_REPLIES: 'I-sort ang mga reply',
    TURN_OFF_QUOTE_TWEETS: 'I-off ang mga Quote na Tweet',
    TURN_OFF_RETWEETS: 'I-off ang Retweets',
    TURN_ON_RETWEETS: 'I-on ang Retweets',
    TWEET: 'Mag-tweet',
    TWEETS: 'Mga Tweet',
    TWEET_ALL: 'I-tweet lahat',
    TWEET_INTERACTIONS: 'Interaksyon sa Tweet',
    TWEET_YOUR_REPLY: 'I-Tweet ang reply mo',
    UNDO_RETWEET: 'Huwag nang I-retweet',
    VIEW: 'Tingnan',
    WHATS_HAPPENING: 'Ano ang nangyayari?',
  },
  fr: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Compte basé dans le pays suivant : ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Ajouter un autre Tweet',
    ADD_MUTED_WORD: 'Ajouter un mot masqué',
    GROK_ACTIONS: 'Actions Grok',
    HOME: 'Accueil',
    LIKES: "J'aime",
    LIVE_ON_X: 'En direct sur X',
    MOST_RELEVANT: 'Les plus pertinentes',
    MUTE_THIS_CONVERSATION: 'Masquer cette conversation',
    POST_ALL: 'Tout poster',
    POST_UNAVAILABLE: "Ce post n'est pas disponible.",
    PROFILE_SUMMARY: 'Résumé du profil',
    QUOTE: 'Citation',
    QUOTES: 'Citations',
    QUOTE_TWEET: 'Citer le Tweet',
    QUOTE_TWEETS: 'Tweets cités',
    RECENT: 'Récents',
    RELEVANT: 'Pertinence',
    RETWEET: 'Retweeter',
    RETWEETED_BY: 'Retweeté par',
    SHARED: 'Partagé',
    SHARED_TWEETS: 'Tweets partagés',
    SHOW: 'Afficher',
    SHOW_MORE_REPLIES: 'Voir plus de réponses',
    SORT_BY: 'Trier par',
    SORT_REPLIES: 'Trier les réponses',
    TURN_OFF_QUOTE_TWEETS: 'Désactiver les Tweets cités',
    TURN_OFF_RETWEETS: 'Désactiver les Retweets',
    TURN_ON_RETWEETS: 'Activer les Retweets',
    TWEET: 'Tweeter',
    TWEET_ALL: 'Tout tweeter',
    TWEET_INTERACTIONS: 'Interactions avec Tweet',
    TWEET_YOUR_REPLY: 'Tweetez votre réponse',
    UNDO_RETWEET: 'Annuler le Retweet',
    VIEW: 'Voir',
    WHATS_HAPPENING: 'Quoi de neuf !',
  },
  ga: {
    ADD_ANOTHER_TWEET: 'Cuir Tweet eile leis',
    ADD_MUTED_WORD: 'Cuir focal balbhaithe leis',
    HOME: 'Baile',
    LIKES: 'Thaitin siad seo le',
    MUTE_THIS_CONVERSATION: 'Balbhaigh an comhrá seo',
    QUOTE: 'Sliocht',
    QUOTES: 'Sleachta',
    QUOTE_TWEET: 'Cuir Ráiteas Leis',
    QUOTE_TWEETS: 'Luaigh Tvuíteanna',
    RECENT: 'Le déanaí',
    RETWEET: 'Atweetáil',
    RETWEETED_BY: 'Atweetáilte ag',
    RETWEETS: 'Atweetanna',
    SHARED: 'Roinnte',
    SHARED_TWEETS: 'Tweetanna Roinnte',
    SHOW: 'Taispeáin',
    SHOW_MORE_REPLIES: 'Taispeáin tuilleadh freagraí',
    SORT_BY: 'Sórtáil de réir',
    TURN_OFF_QUOTE_TWEETS: 'Cas as Luaigh Tvuíteanna',
    TURN_OFF_RETWEETS: 'Cas as Atweetanna',
    TURN_ON_RETWEETS: 'Cas Atweetanna air',
    TWEETS: 'Tweetanna',
    TWEET_ALL: 'Tweetáil gach rud',
    TWEET_INTERACTIONS: 'Idirghníomhaíochtaí le Tweet',
    TWEET_YOUR_REPLY: 'Tweetáil do fhreagra',
    UNDO_RETWEET: 'Cuir an Atweet ar ceal',
    VIEW: 'Breathnaigh',
    WHATS_HAPPENING: 'Cad atá ag tarlú?',
  },
  gl: {
    ADD_ANOTHER_TWEET: 'Engadir outro chío',
    ADD_MUTED_WORD: 'Engadir palabra silenciada',
    HOME: 'Inicio',
    LIKES: 'Gústames',
    MUTE_THIS_CONVERSATION: 'Silenciar esta conversa',
    QUOTE: 'Cita',
    QUOTES: 'Citas',
    QUOTE_TWEET: 'Citar chío',
    QUOTE_TWEETS: 'Chíos citados',
    RECENT: 'Recentes',
    RETWEET: 'Rechouchiar',
    RETWEETED_BY: 'Rechouchiado por',
    RETWEETS: 'Rechouchíos',
    SHARED: 'Compartido',
    SHARED_TWEETS: 'Chíos compartidos',
    SHOW: 'Amosar',
    SHOW_MORE_REPLIES: 'Amosar máis respostas',
    SORT_BY: 'Ordenar por',
    TURN_OFF_QUOTE_TWEETS: 'Desactivar os chíos citados',
    TURN_OFF_RETWEETS: 'Desactivar os rechouchíos',
    TURN_ON_RETWEETS: 'Activar os rechouchíos',
    TWEET: 'Chío',
    TWEETS: 'Chíos',
    TWEET_ALL: 'Chiar todo',
    TWEET_INTERACTIONS: 'Interaccións chío',
    TWEET_YOUR_REPLY: 'Chío a túa responder',
    UNDO_RETWEET: 'Desfacer rechouchío',
    VIEW: 'Ver',
    WHATS_HAPPENING: 'Que está pasando?',
  },
  gu: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'એકાઉન્ટ સ્થિત હોવાનું સ્થાન ' + e.country
    },
    ADD_ANOTHER_TWEET: 'અન્ય ટ્વીટ ઉમેરો',
    ADD_MUTED_WORD: 'જોડાણ અટકાવેલો શબ્દ ઉમેરો',
    GROK_ACTIONS: 'Grok પગલાં',
    HOME: 'હોમ',
    LIKES: 'લાઈક્સ',
    LIVE_ON_X: 'X પર લાઇવ',
    MOST_RELEVANT: 'સૌથી વધુ સુસંગત',
    MUTE_THIS_CONVERSATION: 'આ વાર્તાલાપનું જોડાણ અટકાવો',
    POST_ALL: 'બધા પોસ્ટ કરો',
    POST_UNAVAILABLE: 'આ પોસ્ટ અનુપલબ્ધ છે.',
    PROFILE_SUMMARY: 'પ્રોફાઇલ સારાંશ',
    QUOTE: 'અવતરણ',
    QUOTES: 'અવતરણો',
    QUOTE_TWEET: 'અવતરણની સાથે ટ્વીટ કરો',
    QUOTE_TWEETS: 'અવતરણની સાથે ટ્વીટ્સ',
    RECENT: 'તાજેતરનું',
    RELEVANT: 'સંબંધિત છે',
    REPOST: 'રીપોસ્ટ કરો',
    REPOSTS: 'ફરીથી કરવામાં આવેલી પોસ્ટ',
    RETWEET: 'પુનટ્વીટ',
    RETWEETED_BY: 'આમની દ્વારા પુનટ્વીટ કરવામાં આવી',
    RETWEETS: 'પુનટ્વીટ્સ',
    SHARED: 'સાંજેડેલું',
    SHARED_TWEETS: 'શેર કરેલી ટ્વીટ્સ',
    SHOW: 'બતાવો',
    SHOW_MORE_REPLIES: 'વધુ પ્રત્યુતરો દર્શાવો',
    SORT_BY: 'આની દ્વારા સૉર્ટ કરો',
    SORT_REPLIES: 'પ્રત્યુત્તરોને સૉર્ટ કરો',
    TURN_OFF_QUOTE_TWEETS: 'અવતરણની સાથે ટ્વીટ્સ બંધ કરો',
    TURN_OFF_RETWEETS: 'પુનટ્વીટ્સ બંધ કરો',
    TURN_ON_RETWEETS: 'પુનટ્વીટ્સ ચાલુ કરો',
    TWEET: 'ટ્વીટ',
    TWEETS: 'ટ્વીટ્સ',
    TWEET_ALL: 'બધાને ટ્વીટ કરો',
    TWEET_INTERACTIONS: 'ટ્વીટ ક્રિયાપ્રતિક્રિયાઓ',
    TWEET_YOUR_REPLY: 'તમારા પ્રત્યુત્તરને ટ્વીટ કરો',
    UNDO_RETWEET: 'પુનટ્વીટને પૂર્વવત કરો',
    VIEW: 'જુઓ',
    WHATS_HAPPENING: 'શું થઈ રહ્યું છે?',
  },
  he: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'החשבון נמצא ב-' + e.country
    },
    ADD_ANOTHER_TWEET: 'הוסף ציוץ נוסף',
    ADD_MUTED_WORD: 'הוסף מילה מושתקת',
    GROK_ACTIONS: 'פעולות של Grok',
    HOME: 'דף הבית',
    LIKES: 'הערות "אהבתי"',
    LIVE_ON_X: 'שידור חי ב-X',
    MOST_RELEVANT: 'הכי רלוונטי',
    MUTE_THIS_CONVERSATION: 'להשתיק את השיחה הזאת',
    POST_ALL: 'פרסום הכל',
    POST_UNAVAILABLE: 'פוסט זה אינו זמין.',
    PROFILE_SUMMARY: 'סיכום הפרופיל',
    QUOTE: 'ציטוט',
    QUOTES: 'ציטוטים',
    QUOTE_TWEET: 'ציטוט ציוץ',
    QUOTE_TWEETS: 'ציוצי ציטוט',
    RECENT: 'אחרונים',
    RELEVANT: 'רלוונטי',
    REPOST: 'לפרסם מחדש',
    REPOSTS: 'פרסומים מחדש',
    RETWEET: 'צייץ מחדש',
    RETWEETED_BY: 'צויץ מחדש על־ידי',
    RETWEETS: 'ציוצים מחדש',
    SHARED: 'משותף',
    SHARED_TWEETS: 'ציוצים משותפים',
    SHOW: 'הצג',
    SHOW_MORE_REPLIES: 'הצג תשובות נוספות',
    SORT_BY: 'סנן לפי',
    SORT_REPLIES: 'מיון תשובות',
    TURN_OFF_QUOTE_TWEETS: 'כבה ציוצי ציטוט',
    TURN_OFF_RETWEETS: 'כבה ציוצים מחדש',
    TURN_ON_RETWEETS: 'הפעל ציוצים מחדש',
    TWEET: 'צייץ',
    TWEETS: 'ציוצים',
    TWEET_ALL: 'צייץ הכול',
    TWEET_INTERACTIONS: 'אינטראקציות צייץ',
    TWEET_YOUR_REPLY: 'צייץ התשובה',
    TWITTER: 'טוויטר',
    UNDO_RETWEET: 'ביטול ציוץ מחדש',
    VIEW: 'הצג',
    WHATS_HAPPENING: 'מה קורה?',
  },
  hi: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return e.country + ' में स्थित खाता'
    },
    ADD_ANOTHER_TWEET: 'एक और ट्वीट जोड़ें',
    ADD_MUTED_WORD: 'म्यूट किया गया शब्द जोड़ें',
    GROK_ACTIONS: 'Grok कार्रवाई',
    HOME: 'होम',
    LIKES: 'पसंद',
    LIVE_ON_X: 'X पर लाइव',
    MOST_RELEVANT: 'सर्वाधिक प्रासंगिक',
    MUTE_THIS_CONVERSATION: 'इस बातचीत को म्यूट करें',
    POST_ALL: 'सभी पोस्ट करें',
    POST_UNAVAILABLE: 'यह पोस्ट उपलब्ध नहीं है.',
    PROFILE_SUMMARY: 'प्रोफ़ाइल सारांश',
    QUOTE: 'कोट',
    QUOTES: 'कोट',
    QUOTE_TWEET: 'ट्वीट क्वोट करें',
    QUOTE_TWEETS: 'कोट ट्वीट्स',
    RECENT: 'हाल ही के',
    RELEVANT: 'प्रासंगिक',
    REPOST: 'रीपोस्ट',
    REPOSTS: 'रीपोस्ट्स',
    RETWEET: 'रीट्वीट करें',
    RETWEETED_BY: 'इनके द्वारा रीट्वीट किया गया',
    RETWEETS: 'रीट्वीट्स',
    SHARED: 'साझा किया हुआ',
    SHARED_TWEETS: 'साझा किए गए ट्वीट',
    SHOW: 'दिखाएं',
    SHOW_MORE_REPLIES: 'और अधिक जवाब दिखाएँ',
    SORT_BY: 'इसके अनुसार सॉर्ट करें',
    SORT_REPLIES: 'जवाब सॉर्ट करें',
    TURN_OFF_QUOTE_TWEETS: 'कोट ट्वीट्स बंद करें',
    TURN_OFF_RETWEETS: 'रीट्वीट बंद करें',
    TURN_ON_RETWEETS: 'रीट्वीट चालू करें',
    TWEET: 'ट्वीट करें',
    TWEETS: 'ट्वीट',
    TWEET_ALL: 'सभी ट्वीट करें',
    TWEET_INTERACTIONS: 'ट्वीट इंटरैक्शन',
    TWEET_YOUR_REPLY: 'अपना जवाब ट्वीट करें',
    UNDO_RETWEET: 'रीट्वीट को पूर्ववत करें',
    VIEW: 'देखें',
    WHATS_HAPPENING: 'क्या हो रहा है?',
  },
  hr: {
    ACCOUNT_BASED_IN_FN: function (a) {
      return 'Država računa ' + a.country
    },
    ADD_ANOTHER_TWEET: 'Dodaj drugi Tweet',
    ADD_MUTED_WORD: 'Dodaj onemogućenu riječ',
    GROK_ACTIONS: 'Grokove radnje',
    HOME: 'Naslovnica',
    LIKES: 'Oznake „sviđa mi se”',
    LIVE_ON_X: 'Uživo na platformi X',
    MOST_RELEVANT: 'Najrelevantnije',
    MUTE_THIS_CONVERSATION: 'Isključi zvuk ovog razgovora',
    POST_ALL: 'Objavi sve',
    POST_UNAVAILABLE: 'Ta objava nije dostupna.',
    PROFILE_SUMMARY: 'Sažetak profila',
    QUOTE: 'Citat',
    QUOTES: 'Citati',
    QUOTE_TWEET: 'Citiraj Tweet',
    QUOTE_TWEETS: 'Citirani tweetovi',
    RECENT: 'Nedavno',
    RELEVANT: 'Relevantno',
    REPOST: 'Proslijedi objavu',
    REPOSTS: 'Proslijeđene objave',
    RETWEET: 'Proslijedi tweet',
    RETWEETED_BY: 'Korisnici koji su proslijedili Tweet',
    RETWEETS: 'Proslijeđeni tweetovi',
    SHARED: 'Podijeljeno',
    SHARED_TWEETS: 'Dijeljeni tweetovi',
    SHOW: 'Prikaži',
    SHOW_MORE_REPLIES: 'Prikaži još odgovora',
    SORT_BY: 'Sortiraj prema',
    SORT_REPLIES: 'Sortiraj odgovore',
    TURN_OFF_QUOTE_TWEETS: 'Isključi citirane tweetove',
    TURN_OFF_RETWEETS: 'Isključi proslijeđene tweetove',
    TURN_ON_RETWEETS: 'Uključi proslijeđene tweetove',
    TWEETS: 'Tweetovi',
    TWEET_ALL: 'Tweetaj sve',
    TWEET_INTERACTIONS: 'Interakcije s Tweet',
    TWEET_YOUR_REPLY: 'Tweetajte odgovor',
    UNDO_RETWEET: 'Poništi prosljeđivanje tweeta',
    VIEW: 'Prikaz',
    WHATS_HAPPENING: 'Što se događa?',
  },
  hu: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'A felhasználói fiók tartózkodási helye: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Másik Tweet hozzáadása',
    ADD_MUTED_WORD: 'Elnémított szó hozzáadása',
    GROK_ACTIONS: 'Grok-műveletek',
    HOME: 'Kezdőlap',
    LIKES: 'Kedvelések',
    LIVE_ON_X: 'Élőben az X-en',
    MOST_RELEVANT: 'Legmegfelelőbb',
    MUTE_THIS_CONVERSATION: 'Beszélgetés némítása',
    POST_ALL: 'Az összes közzététele',
    POST_UNAVAILABLE: 'Ez a bejegyzés nem elérhető.',
    PROFILE_SUMMARY: 'Profil összegzése',
    QUOTE: 'Idézés',
    QUOTES: 'Idézések',
    QUOTE_TWEET: 'Tweet idézése',
    QUOTE_TWEETS: 'Tweet-idézések',
    RECENT: 'Legutóbbi',
    RELEVANT: 'Releváns',
    REPOST: 'Újraposztolás',
    REPOSTS: 'Újraposztolások',
    RETWEETED_BY: 'Retweetelte',
    RETWEETS: 'Retweetek',
    SHARED: 'Megosztott',
    SHARED_TWEETS: 'Megosztott tweetek',
    SHOW: 'Megjelenítés',
    SHOW_MORE_REPLIES: 'Több válasz megjelenítése',
    SORT_BY: 'Rendezési szempont',
    SORT_REPLIES: 'Válaszok rendezése',
    TURN_OFF_QUOTE_TWEETS: 'Tweet-idézések kikapcsolása',
    TURN_OFF_RETWEETS: 'Retweetek kikapcsolása',
    TURN_ON_RETWEETS: 'Retweetek bekapcsolása',
    TWEET: 'Tweetelj',
    TWEETS: 'Tweetek',
    TWEET_ALL: 'Tweet küldése mindenkinek',
    TWEET_INTERACTIONS: 'Tweet interakciók',
    TWEET_YOUR_REPLY: 'Tweeteld válaszodat',
    UNDO_RETWEET: 'Retweet visszavonása',
    VIEW: 'Megtekintés',
    WHATS_HAPPENING: 'Mi történik éppen most?',
  },
  id: {
    ACCOUNT_BASED_IN_FN: function (a) {
      return 'Akun berbasis di ' + a.country
    },
    ADD_ANOTHER_TWEET: 'Tambahkan Tweet lain',
    ADD_MUTED_WORD: 'Tambahkan kata kunci yang dibisukan',
    GROK_ACTIONS: 'Tindakan Grok',
    HOME: 'Beranda',
    LIKES: 'Suka',
    LIVE_ON_X: 'Langsung di X',
    MOST_RELEVANT: 'Paling relevan',
    MUTE_THIS_CONVERSATION: 'Bisukan percakapan ini',
    POST_ALL: 'Posting semua',
    POST_UNAVAILABLE: 'Postingan ini tidak tersedia.',
    PROFILE_SUMMARY: 'Ringkasan Profil',
    QUOTE: 'Kutipan',
    QUOTES: 'Kutipan',
    QUOTE_TWEET: 'Kutip Tweet',
    QUOTE_TWEETS: 'Tweet Kutipan',
    RECENT: 'Terkini',
    RELEVANT: 'Relevan',
    REPOST: 'Posting ulang',
    REPOSTS: 'Posting ulang',
    RETWEETED_BY: 'Di-retweet oleh',
    RETWEETS: 'Retweet',
    SHARED: 'Dibagikan',
    SHARED_TWEETS: 'Tweet yang Dibagikan',
    SHOW: 'Tampilkan',
    SHOW_MORE_REPLIES: 'Tampilkan balasan lainnya',
    SORT_BY: 'Urutkan berdasarkan',
    SORT_REPLIES: 'Urutkan balasan',
    TURN_OFF_QUOTE_TWEETS: 'Matikan Tweet Kutipan',
    TURN_OFF_RETWEETS: 'Matikan Retweet',
    TURN_ON_RETWEETS: 'Nyalakan Retweet',
    TWEETS: 'Tweet',
    TWEET_ALL: 'Tweet semua',
    TWEET_INTERACTIONS: 'Interaksi Tweet',
    TWEET_YOUR_REPLY: 'Tweet balasan Anda',
    UNDO_RETWEET: 'Batalkan Retweet',
    VIEW: 'Lihat',
    WHATS_HAPPENING: 'Apa yang sedang hangat dibicarakan?',
  },
  it: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Posizione account: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Aggiungi altro Tweet',
    ADD_MUTED_WORD: 'Aggiungi parola o frase silenziata',
    GROK_ACTIONS: 'Azioni di Grok',
    LIKES: 'Mi piace',
    LIVE_ON_X: 'In diretta su X',
    MOST_RELEVANT: 'Più pertinenti',
    MUTE_THIS_CONVERSATION: 'Silenzia questa conversazione',
    POST_ALL: 'Posta tutto',
    POST_UNAVAILABLE: 'Questo post non è disponibile.',
    PROFILE_SUMMARY: 'Riepilogo del profilo',
    QUOTE: 'Citazione',
    QUOTES: 'Citazioni',
    QUOTE_TWEET: 'Cita Tweet',
    QUOTE_TWEETS: 'Tweet di citazione',
    RECENT: 'Recenti',
    RELEVANT: 'Pertinenza',
    REPOSTS: 'Repost',
    RETWEET: 'Ritwitta',
    RETWEETED_BY: 'Ritwittato da',
    RETWEETS: 'Retweet',
    SHARED: 'Condiviso',
    SHARED_TWEETS: 'Tweet condivisi',
    SHOW: 'Mostra',
    SHOW_MORE_REPLIES: 'Mostra altre risposte',
    SORT_BY: 'Ordina per',
    SORT_REPLIES: 'Ordina risposte',
    TURN_OFF_QUOTE_TWEETS: 'Disattiva i Tweet di citazione',
    TURN_OFF_RETWEETS: 'Disattiva Retweet',
    TURN_ON_RETWEETS: 'Attiva Retweet',
    TWEET: 'Twitta',
    TWEETS: 'Tweet',
    TWEET_ALL: 'Twitta tutto',
    TWEET_INTERACTIONS: 'Interazioni con Tweet',
    TWEET_YOUR_REPLY: 'Twitta la tua risposta',
    UNDO_RETWEET: 'Annulla Retweet',
    VIEW: 'Visualizza',
    WHATS_HAPPENING: "Che c'è di nuovo?",
  },
  ja: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'アカウントの所在地: ' + e.country
    },
    ADD_ANOTHER_TWEET: '別のツイートを追加する',
    ADD_MUTED_WORD: 'ミュートするキーワードを追加',
    GROK_ACTIONS: 'Grokのアクション',
    HOME: 'ホーム',
    LIKES: 'いいね',
    LIVE_ON_X: 'Xでライブ放送する',
    MOST_RELEVANT: '関連性が高い',
    MUTE_THIS_CONVERSATION: 'この会話をミュート',
    POST_ALL: 'すべてポスト',
    POST_UNAVAILABLE: 'このポストは表示できません。',
    PROFILE_SUMMARY: 'プロフィールの要約',
    QUOTE: '引用',
    QUOTES: '引用',
    QUOTE_TWEET: '引用ツイート',
    QUOTE_TWEETS: '引用ツイート',
    RECENT: '最新',
    RELEVANT: '関連性が高い',
    REPOST: 'リポスト',
    REPOSTS: 'リポスト',
    RETWEET: 'リツイート',
    RETWEETED_BY: 'リツイートしたユーザー',
    RETWEETS: 'リツイート',
    SHARED: '共有',
    SHARED_TWEETS: '共有ツイート',
    SHOW: '表示',
    SHOW_MORE_REPLIES: '返信をさらに表示',
    SORT_BY: '並べ替え',
    SORT_REPLIES: '返信を並べ替え',
    TURN_OFF_QUOTE_TWEETS: '引用ツイートをオフにする',
    TURN_OFF_RETWEETS: 'リツイートをオフにする',
    TURN_ON_RETWEETS: 'リツイートをオンにする',
    TWEET: 'ツイートする',
    TWEETS: 'ツイート',
    TWEET_ALL: 'すべてツイート',
    TWEET_INTERACTIONS: 'ツイートの相互作用',
    TWEET_YOUR_REPLY: '返信をツイート',
    UNDO_RETWEET: 'リツイートを取り消す',
    VIEW: '表示する',
    WHATS_HAPPENING: 'いまどうしてる？',
  },
  kn: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return e.country + ' ನಲ್ಲಿ ಆಧಾರಿತ ಖಾತೆ'
    },
    ADD_ANOTHER_TWEET: 'ಮತ್ತೊಂದು ಟ್ವೀಟ್ ಸೇರಿಸಿ',
    ADD_MUTED_WORD: 'ಸದ್ದಡಗಿಸಿದ ಪದವನ್ನು ಸೇರಿಸಿ',
    GROK_ACTIONS: 'Grok ಕ್ರಮಗಳು',
    HOME: 'ಹೋಮ್',
    LIKES: 'ಇಷ್ಟಗಳು',
    LIVE_ON_X: 'X ನಲ್ಲಿ ಲೈವ್',
    MOST_RELEVANT: 'ಅತ್ಯಂತ ಸಂಬಂಧಿತ',
    MUTE_THIS_CONVERSATION: 'ಈ ಸಂವಾದವನ್ನು ಸದ್ದಡಗಿಸಿ',
    POST_ALL: 'ಎಲ್ಲವನ್ನೂ ಪೋಸ್ಟ್ ಮಾಡಿ',
    POST_UNAVAILABLE: 'ಈ ಪೋಸ್ಟ್ ಲಭ್ಯವಿಲ್ಲ.',
    PROFILE_SUMMARY: 'ಪ್ರೊಫೈಲ್ ಸಾರಾಂಶ',
    QUOTE: 'ಕೋಟ್‌',
    QUOTES: 'ಉಲ್ಲೇಖಗಳು',
    QUOTE_TWEET: 'ಟ್ವೀಟ್ ಕೋಟ್ ಮಾಡಿ',
    QUOTE_TWEETS: 'ಕೋಟ್ ಟ್ವೀಟ್‌ಗಳು',
    RECENT: 'ಇತ್ತೀಚಿನ',
    RELEVANT: 'ಸಂಬಂಧಿತ',
    REPOST: 'ಮರುಪೋಸ್ಟ್ ಮಾಡಿ',
    REPOSTS: 'ಮರುಪೋಸ್ಟ್‌ಗಳು',
    RETWEET: 'ಮರುಟ್ವೀಟಿಸಿ',
    RETWEETED_BY: 'ಮರುಟ್ವೀಟಿಸಿದವರು',
    RETWEETS: 'ಮರುಟ್ವೀಟ್‌ಗಳು',
    SHARED: 'ಹಂಚಲಾಗಿದೆ',
    SHARED_TWEETS: 'ಹಂಚಿದ ಟ್ವೀಟ್‌ಗಳು',
    SHOW: 'ತೋರಿಸಿ',
    SHOW_MORE_REPLIES: 'ಇನ್ನಷ್ಟು ಪ್ರತಿಕ್ರಿಯೆಗಳನ್ನು ತೋರಿಸಿ',
    SORT_BY: 'ಈ ರೀತಿ ಆಯೋಜಿಸಿ',
    SORT_REPLIES: 'ಪ್ರತಿಕ್ರಿಯೆಗಳನ್ನು ಆಯೋಜಿಸಿ',
    TURN_OFF_QUOTE_TWEETS: 'ಕೋಟ್ ಟ್ವೀಟ್‌ಗಳನ್ನು ಆಫ್ ಮಾಡಿ',
    TURN_OFF_RETWEETS: 'ಮರುಟ್ವೀಟ್‌ಗಳನ್ನು ಆಫ್ ಮಾಡಿ',
    TURN_ON_RETWEETS: 'ಮರುಟ್ವೀಟ್‌ಗಳನ್ನು ಆನ್ ಮಾಡಿ',
    TWEET: 'ಟ್ವೀಟ್',
    TWEETS: 'ಟ್ವೀಟ್‌ಗಳು',
    TWEET_ALL: 'ಎಲ್ಲಾ ಟ್ವೀಟ್ ಮಾಡಿ',
    TWEET_INTERACTIONS: 'ಟ್ವೀಟ್ ಸಂವಾದಗಳು',
    TWEET_YOUR_REPLY: 'ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ಟ್ವೀಟ್ ಮಾಡಿ',
    UNDO_RETWEET: 'ಮರುಟ್ವೀಟಿಸುವುದನ್ನು ರದ್ದುಮಾಡಿ',
    VIEW: 'ವೀಕ್ಷಿಸಿ',
    WHATS_HAPPENING: 'ಏನು ನಡೆಯುತ್ತಿದೆ?',
  },
  ko: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return '계정 사용자 거주 국가: ' + e.country
    },
    ADD_ANOTHER_TWEET: '다른 트윗 추가하기',
    ADD_MUTED_WORD: '뮤트할 단어 추가하기',
    GROK_ACTIONS: 'Grok 작업',
    HOME: '홈',
    LIKES: '마음에 들어요',
    LIVE_ON_X: 'X 생방송',
    MOST_RELEVANT: '관련도 순서',
    MUTE_THIS_CONVERSATION: '이 대화 뮤트하기',
    POST_ALL: '모두 게시하기',
    POST_UNAVAILABLE: '이 게시물을 볼 수 없습니다.',
    PROFILE_SUMMARY: '프로필 요약',
    QUOTE: '인용',
    QUOTES: '인용',
    QUOTE_TWEET: '트윗 인용하기',
    QUOTE_TWEETS: '트윗 인용하기',
    RECENT: '최근',
    RELEVANT: '관련 있음',
    REPOST: '재게시',
    REPOSTS: '재게시',
    RETWEET: '리트윗',
    RETWEETED_BY: '리트윗함',
    RETWEETS: '리트윗',
    SHARED: '공유된',
    SHARED_TWEETS: '공유 트윗',
    SHOW: '표시',
    SHOW_MORE_REPLIES: '더 많은 답글 보기',
    SORT_BY: '정렬 기준',
    SORT_REPLIES: '답글 정렬하기',
    TURN_OFF_QUOTE_TWEETS: '인용 트윗 끄기',
    TURN_OFF_RETWEETS: '리트윗 끄기',
    TURN_ON_RETWEETS: '리트윗 켜기',
    TWEET: '트윗',
    TWEETS: '트윗',
    TWEET_ALL: '모두 트윗하기',
    TWEET_INTERACTIONS: '트윗 상호작용',
    TWEET_YOUR_REPLY: '답글을 트윗하세요',
    TWITTER: '트위터',
    UNDO_RETWEET: '리트윗 취소',
    VIEW: '보기',
    WHATS_HAPPENING: '무슨 일이 일어나고 있나요?',
  },
  mr: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return e.country + ' मध्ये नोंदणीकृत खाते'
    },
    ADD_ANOTHER_TWEET: 'दुसरे ट्विट सामील करा',
    ADD_MUTED_WORD: 'म्यूट केलेले शब्द सामील करा',
    GROK_ACTIONS: 'Grok कृती',
    HOME: 'होम',
    LIKES: 'पसंती',
    LIVE_ON_X: 'X वर लाइव्ह',
    MOST_RELEVANT: 'सर्वात महत्वाचे',
    MUTE_THIS_CONVERSATION: 'ही चर्चा म्यूट करा',
    POST_ALL: 'सर्व पोस्ट करा',
    POST_UNAVAILABLE: 'हे पोस्ट अनुपलब्ध आहे.',
    PROFILE_SUMMARY: 'प्रोफाइल सारांश',
    QUOTE: 'भाष्य',
    QUOTES: 'भाष्य',
    QUOTE_TWEET: 'ट्विट वर भाष्य करा',
    QUOTE_TWEETS: 'भाष्य ट्विट्स',
    RECENT: 'अलीकडील',
    RELEVANT: 'संबंधित आहे',
    REPOST: 'पुन्हा पोस्ट करा',
    REPOSTS: 'रिपोस्ट',
    RETWEET: 'पुन्हा ट्विट',
    RETWEETED_BY: 'यांनी पुन्हा ट्विट केले',
    RETWEETS: 'पुनर्ट्विट्स',
    SHARED: 'सामायिक',
    SHARED_TWEETS: 'सामायिक ट्विट',
    SHOW: 'दाखवा',
    SHOW_MORE_REPLIES: 'अधिक प्रत्युत्तरे दाखवा',
    SORT_BY: 'यानुसार विभागीत करा',
    SORT_REPLIES: 'प्रत्युत्तरांची क्रमवारी करा',
    TURN_OFF_QUOTE_TWEETS: 'भाष्य ट्विट्स बंद करा',
    TURN_OFF_RETWEETS: 'पुनर्ट्विट्स बंद करा',
    TURN_ON_RETWEETS: 'पुनर्ट्विट्स चालू करा',
    TWEET: 'ट्विट',
    TWEETS: 'ट्विट्स',
    TWEET_ALL: 'सर्व ट्विट करा',
    TWEET_INTERACTIONS: 'ट्वीट इंटरऍक्शन्स',
    TWEET_YOUR_REPLY: 'आपले प्रत्युत्तर ट्विट करा',
    UNDO_RETWEET: 'पुनर्ट्विट पूर्ववत करा',
    VIEW: 'पहा',
    WHATS_HAPPENING: 'ताज्या घडामोडी?',
  },
  ms: {
    ACCOUNT_BASED_IN_FN: function (a) {
      return 'Akaun berpangkalan di ' + a.country
    },
    ADD_ANOTHER_TWEET: 'Tambahkan Tweet lain',
    ADD_MUTED_WORD: 'Tambahkan perkataan yang disenyapkan',
    GROK_ACTIONS: 'Tindakan Grok',
    HOME: 'Laman Utama',
    LIKES: 'Suka',
    LIVE_ON_X: 'Secara Langsung di X',
    MOST_RELEVANT: 'Paling berkaitan',
    MUTE_THIS_CONVERSATION: 'Senyapkan perbualan ini',
    POST_ALL: 'Siarkan semua',
    POST_UNAVAILABLE: 'Siaran ini tidak tersedia.',
    PROFILE_SUMMARY: 'Ringkasan Profil',
    QUOTE: 'Petikan',
    QUOTES: 'Petikan',
    QUOTE_TWEET: 'Petik Tweet',
    QUOTE_TWEETS: 'Tweet Petikan',
    RECENT: 'Terkini',
    RELEVANT: 'Berkaitan',
    REPOST: 'Siaran semula',
    REPOSTS: 'Siaran semula',
    RETWEET: 'Tweet semula',
    RETWEETED_BY: 'Ditweet semula oleh',
    RETWEETS: 'Tweet semula',
    SHARED: 'Dikongsi',
    SHARED_TWEETS: 'Tweet Berkongsi',
    SHOW: 'Tunjukkan',
    SHOW_MORE_REPLIES: 'Tunjukkan lagi balasan',
    SORT_BY: 'Isih Mengikut',
    SORT_REPLIES: 'Isih balasan',
    TURN_OFF_QUOTE_TWEETS: 'Matikan Tweet Petikan',
    TURN_OFF_RETWEETS: 'Matikan Tweet semula',
    TURN_ON_RETWEETS: 'Hidupkan Tweet semula',
    TWEETS: 'Tweet',
    TWEET_ALL: 'Tweet semua',
    TWEET_INTERACTIONS: 'Interaksi Tweet',
    TWEET_YOUR_REPLY: 'Tweet balasan anda',
    UNDO_RETWEET: 'Buat asal Tweet semula',
    VIEW: 'Lihat',
    WHATS_HAPPENING: 'Apakah yang sedang berlaku?',
  },
  nb: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Konto basert i ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Legg til en annen Tweet',
    ADD_MUTED_WORD: 'Skjul nytt ord',
    GROK_ACTIONS: 'Grok-handlinger',
    HOME: 'Hjem',
    LIKES: 'Liker',
    LIVE_ON_X: 'Direkte på X',
    MOST_RELEVANT: 'Mest relevante',
    MUTE_THIS_CONVERSATION: 'Skjul denne samtalen',
    POST_ALL: 'Publiser alle',
    POST_UNAVAILABLE: 'Dette innlegget er utilgjengelig.',
    PROFILE_SUMMARY: 'Profilsammendrag',
    QUOTE: 'Sitat',
    QUOTES: 'Sitater',
    QUOTE_TWEET: 'Sitat-Tweet',
    QUOTE_TWEETS: 'Sitat-Tweets',
    RECENT: 'Nylig',
    REPOST: 'Republiser',
    REPOSTS: 'Republiseringer',
    RETWEETED_BY: 'Retweetet av',
    SHARED: 'Delt',
    SHARED_TWEETS: 'Delte tweets',
    SHOW: 'Vis',
    SHOW_MORE_REPLIES: 'Vis flere svar',
    SORT_BY: 'Sorter etter',
    SORT_REPLIES: 'Sorter svar',
    TURN_OFF_QUOTE_TWEETS: 'Slå av sitat-tweets',
    TURN_OFF_RETWEETS: 'Slå av Retweets',
    TURN_ON_RETWEETS: 'Slå på Retweets',
    TWEET_ALL: 'Tweet alle',
    TWEET_INTERACTIONS: 'Tweet-interaksjoner',
    TWEET_YOUR_REPLY: 'Tweet svaret ditt',
    UNDO_RETWEET: 'Angre Retweet',
    VIEW: 'Vis',
    WHATS_HAPPENING: 'Hva skjer?',
  },
  nl: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Account bevindt zich in ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Nog een Tweet toevoegen',
    ADD_MUTED_WORD: 'Genegeerd woord toevoegen',
    GROK_ACTIONS: 'Grok-acties',
    HOME: 'Startpagina',
    LIKES: 'Vind-ik-leuks',
    LIVE_ON_X: 'Live op X',
    MOST_RELEVANT: 'Meest relevant',
    MUTE_THIS_CONVERSATION: 'Dit gesprek negeren',
    POST_ALL: 'Alles plaatsen',
    POST_UNAVAILABLE: 'Deze post is niet beschikbaar.',
    PROFILE_SUMMARY: 'Profieloverzicht',
    QUOTE: 'Geciteerd',
    QUOTES: 'Geciteerd',
    QUOTE_TWEET: 'Citeer Tweet',
    QUOTE_TWEETS: 'Geciteerde Tweets',
    RETWEET: 'Retweeten',
    RETWEETED_BY: 'Geretweet door',
    SHARED: 'Gedeeld',
    SHARED_TWEETS: 'Gedeelde Tweets',
    SHOW: 'Weergeven',
    SHOW_MORE_REPLIES: 'Meer antwoorden tonen',
    SORT_BY: 'Sorteren op',
    SORT_REPLIES: 'Antwoorden sorteren',
    TURN_OFF_QUOTE_TWEETS: 'Geciteerde Tweets uitschakelen',
    TURN_OFF_RETWEETS: 'Retweets uitschakelen',
    TURN_ON_RETWEETS: 'Retweets inschakelen',
    TWEET: 'Tweeten',
    TWEET_ALL: 'Alles tweeten',
    TWEET_INTERACTIONS: 'Tweet-interacties',
    TWEET_YOUR_REPLY: 'Tweet je antwoord',
    UNDO_RETWEET: 'Retweet ongedaan maken',
    VIEW: 'Bekijken',
    WHATS_HAPPENING: 'Wat gebeurt er?',
  },
  pl: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Kraj konta: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Dodaj kolejnego Tweeta',
    ADD_MUTED_WORD: 'Dodaj wyciszone słowo',
    GROK_ACTIONS: 'Akcje Groka',
    HOME: 'Główna',
    LIKES: 'Polubienia',
    LIVE_ON_X: 'Na żywo w serwisie X',
    MOST_RELEVANT: 'Najtrafniejsze',
    MUTE_THIS_CONVERSATION: 'Wycisz tę rozmowę',
    POST_ALL: 'Opublikuj wszystko',
    POST_UNAVAILABLE: 'Ten wpis jest niedostępny.',
    PROFILE_SUMMARY: 'Podsumowanie profilu',
    QUOTE: 'Cytuj',
    QUOTES: 'Cytaty',
    QUOTE_TWEET: 'Cytuj Tweeta',
    QUOTE_TWEETS: 'Cytaty z Tweeta',
    RECENT: 'Najnowsze',
    RELEVANT: 'Trafne',
    REPOST: 'Podaj dalej wpis',
    REPOSTS: 'Wpisy podane dalej',
    RETWEET: 'Podaj dalej',
    RETWEETED_BY: 'Podane dalej przez',
    RETWEETS: 'Tweety podane dalej',
    SHARED: 'Udostępniony',
    SHARED_TWEETS: 'Udostępnione Tweety',
    SHOW: 'Pokaż',
    SHOW_MORE_REPLIES: 'Pokaż więcej odpowiedzi',
    SORT_BY: 'Sortuj według',
    SORT_REPLIES: 'Sortuj odpowiedzi',
    TURN_OFF_QUOTE_TWEETS: 'Wyłącz tweety z cytatem',
    TURN_OFF_RETWEETS: 'Wyłącz Tweety podane dalej',
    TURN_ON_RETWEETS: 'Włącz Tweety podane dalej',
    TWEETS: 'Tweety',
    TWEET_ALL: 'Tweetnij wszystko',
    TWEET_INTERACTIONS: 'Interakcje na Tweeta',
    TWEET_YOUR_REPLY: 'Tweeta swoją odpowiedź',
    UNDO_RETWEET: 'Cofnij podanie dalej',
    VIEW: 'Wyświetl',
    WHATS_HAPPENING: 'Co się dzieje?',
  },
  pt: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Conta com base em ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Adicionar outro Tweet',
    ADD_MUTED_WORD: 'Adicionar palavra silenciada',
    GROK_ACTIONS: 'Ações do Grok',
    HOME: 'Página Inicial',
    LIKES: 'Curtidas',
    LIVE_ON_X: 'Ao vivo no X',
    MOST_RELEVANT: 'Mais relevante',
    MUTE_THIS_CONVERSATION: 'Silenciar esta conversa',
    POST_ALL: 'Postar tudo',
    POST_UNAVAILABLE: 'Este post está indisponível.',
    PROFILE_SUMMARY: 'Resumo do perfil',
    QUOTE: 'Comentar',
    QUOTES: 'Comentários',
    QUOTE_TWEET: 'Comentar o Tweet',
    QUOTE_TWEETS: 'Tweets com comentário',
    RECENT: 'Recente',
    RELEVANT: 'Relevante',
    REPOST: 'Repostar',
    RETWEET: 'Retweetar',
    RETWEETED_BY: 'Retweetado por',
    SHARED: 'Compartilhado',
    SHARED_TWEETS: 'Tweets Compartilhados',
    SHOW: 'Mostrar',
    SHOW_MORE_REPLIES: 'Mostrar mais respostas',
    SORT_BY: 'Classificar por',
    SORT_REPLIES: 'Ordenar respostas',
    TURN_OFF_QUOTE_TWEETS: 'Desativar Tweets com comentário',
    TURN_OFF_RETWEETS: 'Desativar Retweets',
    TURN_ON_RETWEETS: 'Ativar Retweets',
    TWEET: 'Tweetar',
    TWEET_ALL: 'Tweetar tudo',
    TWEET_INTERACTIONS: 'Interações com Tweet',
    TWEET_YOUR_REPLY: 'Tweetar sua resposta',
    UNDO_RETWEET: 'Desfazer Retweet',
    VIEW: 'Ver',
    WHATS_HAPPENING: 'O que está acontecendo?',
  },
  ro: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Cont din ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Adaugă alt Tweet',
    ADD_MUTED_WORD: 'Adaugă cuvântul ignorat',
    GROK_ACTIONS: 'Acțiuni Grok',
    HOME: 'Pagina principală',
    LIKES: 'Aprecieri',
    LIVE_ON_X: 'În direct pe X',
    MOST_RELEVANT: 'Cele mai relevante',
    MUTE_THIS_CONVERSATION: 'Ignoră această conversație',
    POST_ALL: 'Postează tot',
    POST_UNAVAILABLE: 'Această postare este indisponibilă.',
    PROFILE_SUMMARY: 'Sumarul profilului',
    QUOTE: 'Citat',
    QUOTES: 'Citate',
    QUOTE_TWEET: 'Citează Tweetul',
    QUOTE_TWEETS: 'Tweeturi cu citat',
    RECENT: 'Recente',
    RELEVANT: 'Relevante',
    REPOST: 'Repostează',
    REPOSTS: 'Repostări',
    RETWEET: 'Redistribuie',
    RETWEETED_BY: 'Redistribuit de către',
    RETWEETS: 'Retweeturi',
    SHARED: 'Partajat',
    SHARED_TWEETS: 'Tweeturi partajate',
    SHOW: 'Afișează',
    SHOW_MORE_REPLIES: 'Afișează mai multe răspunsuri',
    SORT_BY: 'Sortează după',
    SORT_REPLIES: 'Sortare răspunsuri',
    TURN_OFF_QUOTE_TWEETS: 'Dezactivează tweeturile cu citat',
    TURN_OFF_RETWEETS: 'Dezactivează Retweeturile',
    TURN_ON_RETWEETS: 'Activează Retweeturile',
    TWEETS: 'Tweeturi',
    TWEET_ALL: 'Dă Tweeturi cu tot',
    TWEET_INTERACTIONS: 'Interacțiuni cu Tweetul',
    TWEET_YOUR_REPLY: 'Dă Tweet cu răspunsul',
    UNDO_RETWEET: 'Anulează Retweetul',
    VIEW: 'Vezi',
    WHATS_HAPPENING: 'Ce se întâmplă?',
  },
  ru: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Страна или регион: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Добавить еще один твит',
    ADD_MUTED_WORD: 'Добавить игнорируемое слово',
    GROK_ACTIONS: 'Действия Grok',
    HOME: 'Главная',
    LIKES: 'Нравится',
    LIVE_ON_X: 'Прямой эфир в X',
    MOST_RELEVANT: 'Наиболее актуальные',
    MUTE_THIS_CONVERSATION: 'Игнорировать эту переписку',
    POST_ALL: 'Опубликовать все',
    POST_UNAVAILABLE: 'Этот пост недоступен.',
    PROFILE_SUMMARY: 'Сводка профиля',
    QUOTE: 'Цитата',
    QUOTES: 'Цитаты',
    QUOTE_TWEET: 'Цитировать',
    QUOTE_TWEETS: 'Твиты с цитатами',
    RECENT: 'Последние',
    RELEVANT: 'Актуально',
    REPOST: 'Сделать репост',
    REPOSTS: 'Репосты',
    RETWEET: 'Ретвитнуть',
    RETWEETED_BY: 'Ретвитнул(а)',
    RETWEETS: 'Ретвиты',
    SHARED: 'Общий',
    SHARED_TWEETS: 'Общие твиты',
    SHOW: 'Показать',
    SHOW_MORE_REPLIES: 'Показать ещё ответы',
    SORT_BY: 'Сортировать по',
    SORT_REPLIES: 'Упорядочить ответы',
    TURN_OFF_QUOTE_TWEETS: 'Отключить твиты с цитатами',
    TURN_OFF_RETWEETS: 'Отключить ретвиты',
    TURN_ON_RETWEETS: 'Включить ретвиты',
    TWEET: 'Твитнуть',
    TWEETS: 'Твиты',
    TWEET_ALL: 'Твитнуть все',
    TWEET_INTERACTIONS: 'Взаимодействие в Твитнуть',
    TWEET_YOUR_REPLY: 'Твитните свой ответ',
    TWITTER: 'Твиттер',
    UNDO_RETWEET: 'Отменить ретвит',
    VIEW: 'Посмотреть',
    WHATS_HAPPENING: 'Что происходит?',
  },
  sk: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Účet sa používa z krajiny ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Pridať ďalší Tweet',
    ADD_MUTED_WORD: 'Pridať stíšené slovo',
    GROK_ACTIONS: 'Akcie Groka',
    HOME: 'Domov',
    LIKES: 'Páči sa',
    LIVE_ON_X: 'Naživo na X',
    MOST_RELEVANT: 'Najrelevantnejšie',
    MUTE_THIS_CONVERSATION: 'Stíšiť túto konverzáciu',
    POST_ALL: 'Uverejniť všetko',
    POST_UNAVAILABLE: 'Tento príspevok je nedostupný.',
    PROFILE_SUMMARY: 'Súhrn profilu',
    QUOTE: 'Citát',
    QUOTES: 'Citáty',
    QUOTE_TWEET: 'Tweet s citátom',
    QUOTE_TWEETS: 'Tweety s citátom',
    RECENT: 'Nedávne',
    RELEVANT: 'Relevantné',
    REPOST: 'Opätovné uverejnenie',
    REPOSTS: 'Opätovné uverejnenia',
    RETWEET: 'Retweetnuť',
    RETWEETED_BY: 'Retweetnuté používateľom',
    RETWEETS: 'Retweety',
    SHARED: 'Zdieľaný',
    SHARED_TWEETS: 'Zdieľané Tweety',
    SHOW: 'Zobraziť',
    SHOW_MORE_REPLIES: 'Zobraziť viac odpovedí',
    SORT_BY: 'Spôsob zoradenia',
    SORT_REPLIES: 'Zoradiť odpovede',
    TURN_OFF_QUOTE_TWEETS: 'Vypnúť tweety s citátom',
    TURN_OFF_RETWEETS: 'Vypnúť retweety',
    TURN_ON_RETWEETS: 'Zapnúť retweety',
    TWEET: 'Tweetnuť',
    TWEETS: 'Tweety',
    TWEET_ALL: 'Tweetnuť všetko',
    TWEET_INTERACTIONS: 'Interakcie s Tweet',
    TWEET_YOUR_REPLY: 'Tweetnite odpoveď',
    UNDO_RETWEET: 'Zrušiť retweet',
    VIEW: 'Zobraziť',
    WHATS_HAPPENING: 'Čo sa deje?',
  },
  sr: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Земља у којој је налог основан: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Додај још један твит',
    ADD_MUTED_WORD: 'Додај игнорисану реч',
    GROK_ACTIONS: 'Grok радње',
    HOME: 'Почетна',
    LIKES: 'Свиђања',
    LIVE_ON_X: 'Уживо на мрежи X',
    MOST_RELEVANT: 'Најважније',
    MUTE_THIS_CONVERSATION: 'Игнориши овај разговор',
    POST_ALL: 'Објави све',
    POST_UNAVAILABLE: 'Ова објава није доступна.',
    PROFILE_SUMMARY: 'Резиме профила',
    QUOTE: 'Цитат',
    QUOTES: 'Цитати',
    QUOTE_TWEET: 'твит са цитатом',
    QUOTE_TWEETS: 'твит(ов)а са цитатом',
    RECENT: 'Недавни',
    RELEVANT: 'Релевантно',
    REPOST: 'Поново објави',
    REPOSTS: 'Понвне објаве',
    RETWEET: 'Ретвитуј',
    RETWEETED_BY: 'Ретвитовано од стране',
    RETWEETS: 'Ретвитови',
    SHARED: 'Подељено',
    SHARED_TWEETS: 'Дељени твитови',
    SHOW: 'Прикажи',
    SHOW_MORE_REPLIES: 'Прикажи још одговора',
    SORT_BY: 'Сортирај по',
    SORT_REPLIES: 'Сортирање одговора',
    TURN_OFF_QUOTE_TWEETS: 'Искључи твит(ов)е са цитатом',
    TURN_OFF_RETWEETS: 'Искључи ретвитове',
    TURN_ON_RETWEETS: 'Укључи ретвитове',
    TWEET: 'Твитуј',
    TWEETS: 'Твитови',
    TWEET_ALL: 'Твитуј све',
    TWEET_INTERACTIONS: 'Интеракције са Твитуј',
    TWEET_YOUR_REPLY: 'Твитуј свој одговор',
    TWITTER: 'Твитер',
    UNDO_RETWEET: 'Опозови ретвит',
    VIEW: 'Погледај',
    WHATS_HAPPENING: 'Шта се дешава?',
  },
  sv: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Konto med bas i ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Lägg till en Tweet till',
    ADD_MUTED_WORD: 'Lägg till ignorerat ord',
    GROK_ACTIONS: 'Grok-åtgärder',
    HOME: 'Hem',
    LIKES: 'Gilla-markeringar',
    LIVE_ON_X: 'Live på X',
    MOST_RELEVANT: 'Mest relevant',
    MUTE_THIS_CONVERSATION: 'Ignorera den här konversationen',
    POST_ALL: 'Lägg upp allt',
    POST_UNAVAILABLE: 'Detta inlägg är inte tillgängligt.',
    PROFILE_SUMMARY: 'Profilöversikt',
    QUOTE: 'Citat',
    QUOTES: 'Citat',
    QUOTE_TWEET: 'Citera Tweet',
    QUOTE_TWEETS: 'Citat-tweets',
    RECENT: 'Senaste',
    REPOST: 'Återpublicera',
    REPOSTS: 'Återpubliceringar',
    RETWEET: 'Retweeta',
    RETWEETED_BY: 'Retweetad av',
    SHARED: 'Delad',
    SHARED_TWEETS: 'Delade tweetsen',
    SHOW: 'Visa',
    SHOW_MORE_REPLIES: 'Visa fler svar',
    SORT_BY: 'Sortera efter',
    SORT_REPLIES: 'Sortera svar',
    TURN_OFF_QUOTE_TWEETS: 'Stäng av citat-tweets',
    TURN_OFF_RETWEETS: 'Stäng av Retweets',
    TURN_ON_RETWEETS: 'Slå på Retweets',
    TWEET: 'Tweeta',
    TWEET_ALL: 'Tweeta allt',
    TWEET_INTERACTIONS: 'Interaktioner med Tweet',
    TWEET_YOUR_REPLY: 'Tweeta ditt svar',
    UNDO_RETWEET: 'Ångra retweeten',
    VIEW: 'Visa',
    WHATS_HAPPENING: 'Vad är det som händer?',
  },
  ta: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return e.country + ' -இல் உள்ள கணக்கு'
    },
    ADD_ANOTHER_TWEET: 'வேறொரு கீச்சைச் சேர்',
    ADD_MUTED_WORD: 'செயல்மறைத்த வார்த்தையைச் சேர்',
    GROK_ACTIONS: 'Grok செயல்கள்',
    HOME: 'முகப்பு',
    LIKES: 'விருப்பங்கள்',
    LIVE_ON_X: 'X -இல் நேரலை',
    MOST_RELEVANT: 'மிகவும் தொடர்புடையவை',
    MUTE_THIS_CONVERSATION: 'இந்த உரையாடலை செயல்மறை',
    POST_ALL: 'எல்லாம் இடுகையிடு',
    POST_UNAVAILABLE: 'இந்த இடுகை கிடைக்கவில்லை.',
    PROFILE_SUMMARY: 'சுயவிவரச் சுருக்கம்',
    QUOTE: 'மேற்கோள்',
    QUOTES: 'மேற்கோள்கள்',
    QUOTE_TWEET: 'ட்விட்டை மேற்கோள் காட்டு',
    QUOTE_TWEETS: 'மேற்கோள் கீச்சுகள்',
    RECENT: 'சமீபத்தியவை',
    RELEVANT: 'பொருத்தமானதாக உள்ளது',
    REPOST: 'மறுஇடுகை',
    REPOSTS: 'மறுஇடுகைகள்',
    RETWEET: 'மறுட்விட் செய்',
    RETWEETED_BY: 'இவரால் மறுட்விட் செய்யப்பட்டது',
    RETWEETS: 'மறுகீச்சுகள்',
    SHARED: 'பகிரப்பட்டது',
    SHARED_TWEETS: 'பகிரப்பட்ட ட்வீட்டுகள்',
    SHOW: 'காண்பி',
    SHOW_MORE_REPLIES: 'மேலும் பதில்களைக் காண்பி',
    SORT_BY: 'இதன்படி வரிசைப்படுத்து:',
    SORT_REPLIES: 'பதில்களை வகைப்படுத்து',
    TURN_OFF_QUOTE_TWEETS: 'மேற்கோள் கீச்சுகளை அணை',
    TURN_OFF_RETWEETS: 'மறுகீச்சுகளை அணை',
    TURN_ON_RETWEETS: 'மறுகீச்சுகளை இயக்கு',
    TWEET: 'ட்விட் செய்',
    TWEETS: 'கீச்சுகள்',
    TWEET_ALL: 'அனைத்தையும் ட்விட் செய்',
    TWEET_INTERACTIONS: 'ட்விட் செய் ஊடாடல்களைக்',
    TWEET_YOUR_REPLY: 'உங்கள் பதிலை ட்விட் செய்யவும்',
    UNDO_RETWEET: 'மறுகீச்சை செயல்தவிர்',
    VIEW: 'காண்பி',
    WHATS_HAPPENING: 'என்ன நிகழ்கிறது?',
  },
  th: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'บัญชีตั้งอยู่ใน ' + e.country
    },
    ADD_ANOTHER_TWEET: 'เพิ่มอีกทวีต',
    ADD_MUTED_WORD: 'เพิ่มคำที่ซ่อน',
    GROK_ACTIONS: 'การดำเนินการของ Grok',
    HOME: 'หน้าแรก',
    LIKES: 'ความชอบ',
    LIVE_ON_X: 'ถ่ายทอดสดบน X',
    MOST_RELEVANT: 'เกี่ยวข้องที่สุด',
    MUTE_THIS_CONVERSATION: 'ซ่อนบทสนทนานี้',
    POST_ALL: 'โพสต์ทั้งหมด',
    POST_UNAVAILABLE: 'โพสต์นี้ไม่สามารถใช้งานได้',
    PROFILE_SUMMARY: 'ข้อมูลส่วนตัวโดยย่อ',
    QUOTE: 'การอ้างอิง',
    QUOTES: 'คำพูด',
    QUOTE_TWEET: 'อ้างอิงทวีต',
    QUOTE_TWEETS: 'ทวีตและคำพูด',
    RECENT: 'ล่าสุด',
    RELEVANT: 'เกี่ยวข้อง',
    REPOST: 'รีโพสต์',
    REPOSTS: 'รีโพสต์',
    RETWEET: 'รีทวีต',
    RETWEETED_BY: 'ถูกรีทวีตโดย',
    RETWEETS: 'รีทวีต',
    SHARED: 'แบ่งปัน',
    SHARED_TWEETS: 'ทวีตที่แชร์',
    SHOW: 'แสดง',
    SHOW_MORE_REPLIES: 'แสดงการตอบกลับเพิ่มเติม',
    SORT_BY: 'เรียงตาม',
    SORT_REPLIES: 'จัดเรียงการตอบกลับ',
    TURN_OFF_QUOTE_TWEETS: 'ปิดทวีตและคำพูด',
    TURN_OFF_RETWEETS: 'ปิดรีทวีต',
    TURN_ON_RETWEETS: 'เปิดรีทวีต',
    TWEET: 'ทวีต',
    TWEETS: 'ทวีต',
    TWEET_ALL: 'ทวีตทั้งหมด',
    TWEET_INTERACTIONS: 'การโต้ตอบของทวีต',
    TWEET_YOUR_REPLY: 'ทวีตการตอบกลับของคุณ',
    TWITTER: 'ทวิตเตอร์',
    UNDO_RETWEET: 'ยกเลิกการรีทวีต',
    VIEW: 'ดู',
    WHATS_HAPPENING: 'มีอะไรเกิดขึ้นบ้าง',
  },
  tr: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Hesabın bulunduğu ülke/bölge: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Başka bir Tweet ekle',
    ADD_MUTED_WORD: 'Sessize alınacak kelime ekle',
    GROK_ACTIONS: 'Grok işlemleri',
    HOME: 'Anasayfa',
    LIKES: 'Beğeni',
    LIVE_ON_X: "X'te Canlı",
    MOST_RELEVANT: 'En alakalı',
    MUTE_THIS_CONVERSATION: 'Bu sohbeti sessize al',
    POST_ALL: 'Tümünü gönder',
    POST_UNAVAILABLE: 'Bu gönderi kullanılamıyor.',
    PROFILE_SUMMARY: 'Profil Özeti',
    QUOTE: 'Alıntı',
    QUOTES: 'Alıntılar',
    QUOTE_TWEET: 'Tweeti Alıntıla',
    QUOTE_TWEETS: 'Alıntı Tweetler',
    RECENT: 'En yeni',
    RELEVANT: 'Alakalı',
    REPOST: 'Yeniden gönder',
    REPOSTS: 'Yeniden gönderiler',
    RETWEETED_BY: 'Retweetleyen(ler):',
    RETWEETS: 'Retweetler',
    SHARED: 'Paylaşılan',
    SHARED_TWEETS: 'Paylaşılan Tweetler',
    SHOW: 'Göster',
    SHOW_MORE_REPLIES: 'Daha fazla yanıt göster',
    SORT_BY: 'Şuna göre sırala:',
    SORT_REPLIES: 'Yanıtları sırala',
    TURN_OFF_QUOTE_TWEETS: 'Alıntı Tweetleri kapat',
    TURN_OFF_RETWEETS: 'Retweetleri kapat',
    TURN_ON_RETWEETS: 'Retweetleri aç',
    TWEET: 'Tweetle',
    TWEETS: 'Tweetler',
    TWEET_ALL: 'Hepsini Tweetle',
    TWEET_INTERACTIONS: 'Tweet etkileşimleri',
    TWEET_YOUR_REPLY: 'Yanıtını Tweetle',
    UNDO_RETWEET: 'Retweeti Geri Al',
    VIEW: 'Görüntüle',
    WHATS_HAPPENING: 'Neler oluyor?',
  },
  uk: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Країна чи регіон: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Додати ще один твіт',
    ADD_MUTED_WORD: 'Додати слово до списку ігнорування',
    GROK_ACTIONS: 'Дії Grok',
    HOME: 'Головна',
    LIKES: 'Вподобання',
    LIVE_ON_X: 'Прямий ефір в X',
    MOST_RELEVANT: 'Найактуальніші',
    MUTE_THIS_CONVERSATION: 'Ігнорувати цю розмову',
    POST_ALL: 'Опублікувати все',
    POST_UNAVAILABLE: 'Цей пост недоступний.',
    PROFILE_SUMMARY: 'Зведення профілю',
    QUOTE: 'Цитата',
    QUOTES: 'Цитати',
    QUOTE_TWEET: 'Цитувати твіт',
    QUOTE_TWEETS: 'Цитовані твіти',
    RECENT: 'Нещодавні',
    RELEVANT: 'Актуальні',
    REPOST: 'Зробити репост',
    REPOSTS: 'Репости',
    RETWEET: 'Ретвітнути',
    RETWEETED_BY: 'Ретвіти',
    RETWEETS: 'Ретвіти',
    SHARED: 'Спільний',
    SHARED_TWEETS: 'Спільні твіти',
    SHOW: 'Показати',
    SHOW_MORE_REPLIES: 'Показати більше відповідей',
    SORT_BY: 'Сортування за',
    SORT_REPLIES: 'Сортувати відповіді',
    TURN_OFF_QUOTE_TWEETS: 'Вимкнути цитовані твіти',
    TURN_OFF_RETWEETS: 'Вимкнути ретвіти',
    TURN_ON_RETWEETS: 'Увімкнути ретвіти',
    TWEET: 'Твіт',
    TWEETS: 'Твіти',
    TWEET_ALL: 'Твітнути все',
    TWEET_INTERACTIONS: 'Взаємодія твітів',
    TWEET_YOUR_REPLY: 'Твітніть відповідь',
    TWITTER: 'Твіттер',
    UNDO_RETWEET: 'Скасувати ретвіт',
    VIEW: 'Переглянути',
    WHATS_HAPPENING: 'Що відбувається?',
  },
  ur: {
    ADD_ANOTHER_TWEET: 'ایک اور ٹویٹ شامل کریں',
    ADD_MUTED_WORD: 'میوٹ شدہ لفظ شامل کریں',
    HOME: 'ہوم',
    LIKES: 'لائک',
    MUTE_THIS_CONVERSATION: 'اس گفتگو کو میوٹ کریں',
    QUOTE: 'نقل کریں',
    QUOTES: 'منقول',
    QUOTE_TWEET: 'ٹویٹ کا حوالہ دیں',
    QUOTE_TWEETS: 'ٹویٹ کو نقل کرو',
    RECENT: 'حالیہ',
    RETWEET: 'ریٹویٹ',
    RETWEETED_BY: 'جنہوں نے ریٹویٹ کیا',
    RETWEETS: 'ریٹویٹس',
    SHARED: 'مشترکہ',
    SHARED_TWEETS: 'مشترکہ ٹویٹس',
    SHOW: 'دکھائیں',
    SHOW_MORE_REPLIES: 'مزید جوابات دکھائیں',
    SORT_BY: 'چھانٹیں بلحاظ',
    TURN_OFF_QUOTE_TWEETS: 'ٹویٹ کو نقل کرنا بند کریں',
    TURN_OFF_RETWEETS: 'ری ٹویٹس غیر فعال کریں',
    TURN_ON_RETWEETS: 'ری ٹویٹس غیر فعال کریں',
    TWEET: 'ٹویٹ',
    TWEETS: 'ٹویٹس',
    TWEET_ALL: 'سب کو ٹویٹ کریں',
    TWEET_INTERACTIONS: 'ٹویٹ تعاملات',
    TWEET_YOUR_REPLY: 'اپنا جواب ٹویٹ کریں',
    TWITTER: 'ٹوئٹر',
    UNDO_RETWEET: 'ری ٹویٹ کو کالعدم کریں',
    VIEW: 'دیکھیں',
    WHATS_HAPPENING: 'کیا ہو رہا ہے؟',
  },
  vi: {
    ACCOUNT_BASED_IN_FN: function (n) {
      return 'Tài khoản ở ' + n.country
    },
    ADD_ANOTHER_TWEET: 'Thêm Tweet khác',
    ADD_MUTED_WORD: 'Thêm từ tắt tiếng',
    GROK_ACTIONS: 'Hành động của Grok',
    HOME: 'Trang chủ',
    LIKES: 'Lượt thích',
    LIVE_ON_X: 'Trực tuyến trên X',
    MOST_RELEVANT: 'Liên quan nhất',
    MUTE_THIS_CONVERSATION: 'Tắt tiếng cuộc trò chuyện này',
    POST_ALL: 'Đăng tất cả',
    POST_UNAVAILABLE: 'Không có bài đăng này.',
    PROFILE_SUMMARY: 'Tóm tắt hồ sơ',
    QUOTE: 'Trích dẫn',
    QUOTES: 'Trích dẫn',
    QUOTE_TWEET: 'Trích dẫn Tweet',
    QUOTE_TWEETS: 'Tweet trích dẫn',
    RECENT: 'Gần đây',
    RELEVANT: 'Có liên quan',
    REPOST: 'Đăng lại',
    REPOSTS: 'Bài đăng lại',
    RETWEET: 'Tweet lại',
    RETWEETED_BY: 'Được Tweet lại bởi',
    RETWEETS: 'Các Tweet lại',
    SHARED: 'Đã chia sẻ',
    SHARED_TWEETS: 'Tweet được chia sẻ',
    SHOW: 'Hiện',
    SHOW_MORE_REPLIES: 'Hiển thị thêm trả lời',
    SORT_BY: 'Sắp xếp theo',
    SORT_REPLIES: 'Sắp xếp câu trả lời',
    TURN_OFF_QUOTE_TWEETS: 'Tắt Tweet trích dẫn',
    TURN_OFF_RETWEETS: 'Tắt Tweet lại',
    TURN_ON_RETWEETS: 'Bật Tweet lại',
    TWEETS: 'Tweet',
    TWEET_ALL: 'Đăng Tweet tất cả',
    TWEET_INTERACTIONS: 'Tương tác Tweet',
    TWEET_YOUR_REPLY: 'Đăng Tweet câu trả lời của bạn',
    UNDO_RETWEET: 'Hoàn tác Tweet lại',
    VIEW: 'Xem',
    WHATS_HAPPENING: 'Chuyện gì đang xảy ra?',
  },
  'zh-Hant': {
    ACCOUNT_BASED_IN_FN: function (e) {
      return '帳戶所在地 ' + e.country
    },
    ADD_ANOTHER_TWEET: '加入另一則推文',
    ADD_MUTED_WORD: '加入靜音文字',
    GROK_ACTIONS: 'Grok 動作',
    HOME: '首頁',
    LIKES: '喜歡的內容',
    LIVE_ON_X: 'X 上的直播',
    MOST_RELEVANT: '最相關',
    MUTE_THIS_CONVERSATION: '將此對話靜音',
    POST_ALL: '全部發佈',
    POST_UNAVAILABLE: '此貼文無法查看。',
    PROFILE_SUMMARY: '個人檔案摘要',
    QUOTE: '引用',
    QUOTES: '引用',
    QUOTE_TWEET: '引用推文',
    QUOTE_TWEETS: '引用的推文',
    RECENT: '最近',
    RELEVANT: '相關',
    REPOST: '轉發',
    REPOSTS: '轉發',
    RETWEET: '轉推',
    RETWEETED_BY: '已被轉推',
    RETWEETS: '轉推',
    SHARED: '共享',
    SHARED_TWEETS: '分享的推文',
    SHOW: '顯示',
    SHOW_MORE_REPLIES: '顯示更多回覆',
    SORT_BY: '排序方式',
    SORT_REPLIES: '將回覆排序',
    TURN_OFF_QUOTE_TWEETS: '關閉引用的推文',
    TURN_OFF_RETWEETS: '關閉轉推',
    TURN_ON_RETWEETS: '開啟轉推',
    TWEET: '推文',
    TWEETS: '推文',
    TWEET_ALL: '推全部內容',
    TWEET_INTERACTIONS: '推文互動',
    TWEET_YOUR_REPLY: '推你的回覆',
    UNDO_RETWEET: '取消轉推',
    VIEW: '查看',
    WHATS_HAPPENING: '有什麼新鮮事？',
  },
  zh: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return '账号所在地 ' + e.country
    },
    ADD_ANOTHER_TWEET: '添加另一条推文',
    ADD_MUTED_WORD: '添加要隐藏的字词',
    GROK_ACTIONS: 'Grok 操作',
    HOME: '主页',
    LIKES: '喜欢',
    LIVE_ON_X: 'X 上的直播',
    MOST_RELEVANT: '最相关',
    MUTE_THIS_CONVERSATION: '隐藏此对话',
    POST_ALL: '全部发帖',
    POST_UNAVAILABLE: '这个帖子不可用。',
    PROFILE_SUMMARY: '个人资料概要',
    QUOTE: '引用',
    QUOTES: '引用',
    QUOTE_TWEET: '引用推文',
    QUOTE_TWEETS: '引用推文',
    RECENT: '最近',
    RELEVANT: '相关',
    REPOST: '转帖',
    REPOSTS: '转帖',
    RETWEET: '转推',
    RETWEETED_BY: '转推者',
    RETWEETS: '转推',
    SHARED: '共享',
    SHARED_TWEETS: '分享的推文',
    SHOW: '显示',
    SHOW_MORE_REPLIES: '显示更多回复',
    SORT_BY: '排序方式',
    SORT_REPLIES: '对回复排序',
    TURN_OFF_QUOTE_TWEETS: '关闭引用推文',
    TURN_OFF_RETWEETS: '关闭转推',
    TURN_ON_RETWEETS: '开启转推',
    TWEET: '推文',
    TWEETS: '推文',
    TWEET_ALL: '全部发推',
    TWEET_INTERACTIONS: '推文互动',
    TWEET_YOUR_REPLY: '发布你的回复',
    UNDO_RETWEET: '撤销转推',
    VIEW: '查看',
    WHATS_HAPPENING: '有什么新鲜事？',
  },
}

/**
 * @param {import("./types").LocaleFunctionKey} key
 */
function getFn(key) {
  return (locales[lang] || locales['en'])[key] || locales['en'][key];
}

/**
 * @param {import("./types").LocaleStringKey} key
 */
function getString(key) {
  return (locales[lang] || locales['en'])[key] || locales['en'][key];
}
//#endregion

//#region Constants
/** @enum {string} */
const PagePaths = {
  ACCESSIBILITY_SETTINGS: '/settings/accessibility',
  ADD_MUTED_WORD: '/settings/add_muted_keyword',
  COMPOSE_TWEET: '/compose/post',
  CONNECT: '/i/connect',
  DISPLAY_SETTINGS: '/settings/display',
  HISTORY: '/i/history',
  HOME: '/home',
  NOTIFICATION_TIMELINE: '/i/timeline',
  PROFILE_SETTINGS: '/settings/profile',
  SEARCH: '/search',
}

/** @enum {string} */
const Selectors = {
  BLOCK_MENU_ITEM: '[data-testid="block"]',
  DESKTOP_TIMELINE_HEADER: 'div[data-testid="primaryColumn"] > div > div:first-of-type',
  MODAL_TIMELINE: 'section > h1 + div[aria-label] > div',
  MOBILE_TIMELINE_HEADER: 'div[data-testid="TopNavBar"]',
  NAV_HOME_LINK: 'a[data-testid="AppTabBar_Home_Link"]',
  PRIMARY_COLUMN: 'div[data-testid="primaryColumn"]',
  PRIMARY_NAV_DESKTOP: 'header nav',
  PRIMARY_NAV_MOBILE: '#layers nav',
  PROMOTED_TWEET_CONTAINER: '[data-testid="placementTracking"]',
  SIDEBAR: 'div[data-testid="sidebarColumn"]',
  SORT_REPLIES_PATH: 'svg path[d="M14 6V3h2v8h-2V8H3V6h11zm7 2h-3.5V6H21v2zM8 16v-3h2v8H8v-3H3v-2h5zm13 2h-9.5v-2H21v2z"]',
  TIMELINE: 'div[data-testid="primaryColumn"] section > h1 + div[aria-label] > div',
  TIMELINE_HEADING: 'h2[role="heading"]',
  TWEET: '[data-testid="tweet"]',
  VERIFIED_TICK: 'svg[data-testid="icon-verified"]',
  X_LOGO_PATH: 'svg path[d="M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456l-5.691 6.714-4.54-6.714H2.359l7.29 10.776L2.25 21.75h2.456l6.035-7.118 4.818 7.118h6.191-.008zM7.739 3.818L18.81 20.182h-2.447L5.29 3.818h2.447z"]',
  X_DARUMA_LOGO_PATH: 'svg path[d="M18.436 1.92h3.403l-7.433 8.495 8.745 11.563h-6.849l-5.363-7.012-6.136 7.012H1.4l7.951-9.088L.96 1.92h7.02l4.848 6.41 5.608-6.41zm-1.194 18.021h1.886L6.958 3.851H4.933l12.308 16.09z"]',
}

/** @enum {string} */
const Svgs = {
  BLUE_LOGO_PATH: 'M16.5 3H2v18h15c3.038 0 5.5-2.46 5.5-5.5 0-1.4-.524-2.68-1.385-3.65-.08-.09-.089-.22-.023-.32.574-.87.908-1.91.908-3.03C22 5.46 19.538 3 16.5 3zm-.796 5.99c.457-.05.892-.17 1.296-.35-.302.45-.684.84-1.125 1.15.004.1.006.19.006.29 0 2.94-2.269 6.32-6.421 6.32-1.274 0-2.46-.37-3.459-1 .177.02.357.03.539.03 1.057 0 2.03-.35 2.803-.95-.988-.02-1.821-.66-2.109-1.54.138.03.28.04.425.04.206 0 .405-.03.595-.08-1.033-.2-1.811-1.1-1.811-2.18v-.03c.305.17.652.27 1.023.28-.606-.4-1.004-1.08-1.004-1.85 0-.4.111-.78.305-1.11 1.113 1.34 2.775 2.22 4.652 2.32-.038-.17-.058-.33-.058-.51 0-1.23 1.01-2.22 2.256-2.22.649 0 1.235.27 1.647.7.514-.1.997-.28 1.433-.54-.168.52-.526.96-.992 1.23z',
  MUTE: '<g><path d="M18 6.59V1.2L8.71 7H5.5C4.12 7 3 8.12 3 9.5v5C3 15.88 4.12 17 5.5 17h2.09l-2.3 2.29 1.42 1.42 15.5-15.5-1.42-1.42L18 6.59zm-8 8V8.55l6-3.75v3.79l-6 6zM5 9.5c0-.28.22-.5.5-.5H8v6H5.5c-.28 0-.5-.22-.5-.5v-5zm6.5 9.24l1.45-1.45L16 19.2V14l2 .02v8.78l-6.5-4.06z"></path></g>',
  PROMOTED_PATH: 'M19.498 3h-15c-1.381 0-2.5 1.12-2.5 2.5v13c0 1.38 1.119 2.5 2.5 2.5h15c1.381 0 2.5-1.12 2.5-2.5v-13c0-1.38-1.119-2.5-2.5-2.5zm-3.502 12h-2v-3.59l-5.293 5.3-1.414-1.42L12.581 10H8.996V8h7v7z',
  RETWEET: '<g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></g>',
  RETWEETS_OFF: '<g><path d="M3.707 21.707l18-18-1.414-1.414-2.088 2.088C17.688 4.137 17.11 4 16.5 4H11v2h5.5c.028 0 .056 0 .084.002l-10.88 10.88c-.131-.266-.204-.565-.204-.882V7.551l2.068 1.93 1.365-1.462L4.5 3.882.068 8.019l1.365 1.462 2.068-1.93V16c0 .871.278 1.677.751 2.334l-1.959 1.959 1.414 1.414zM18.5 9h2v7.449l2.068-1.93 1.365 1.462-4.433 4.137-4.432-4.137 1.365-1.462 2.067 1.93V9zm-8.964 9l-2 2H13v-2H9.536z"></path></g>',
  TWITTER_FEATHER_PLUS_PATH: 'M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-3.082 7.94-7.054C22.79 10.147 23.17 6.359 23 3zm-7 8h-1.5v2H16c.63-.016 1.2-.08 1.72-.188C16.95 15.24 14.68 17 12 17H8.55c.57-2.512 1.57-4.851 3-6.78 2.16-2.912 5.29-4.911 9.45-5.187C20.95 8.079 19.9 11 16 11zM4 9V6H1V4h3V1h2v3h3v2H6v3H4z',
  TWITTER_HOME_ACTIVE_PATH: 'M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z',
  TWITTER_HOME_INACTIVE_PATH: 'M12 9c-2.209 0-4 1.791-4 4s1.791 4 4 4 4-1.791 4-4-1.791-4-4-4zm0 6c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2zm0-13.304L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM19 19.5c0 .276-.224.5-.5.5h-13c-.276 0-.5-.224-.5-.5V8.429l7-4.375 7 4.375V19.5z',
  TWITTER_LOGO_PATH: 'M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z',
  X_HOME_ACTIVE_PATH: 'M10.059 2.593c1.175-.784 2.707-.784 3.882 0l6.5 4.333C21.415 7.575 22 8.668 22 9.838V18.5c0 1.933-1.567 3.5-3.5 3.5h-4.25v-5.25c0-1.243-1.007-2.25-2.25-2.25s-2.25 1.007-2.25 2.25V22H5.5C3.567 22 2 20.433 2 18.5V9.838c0-1.17.585-2.263 1.559-2.912l6.5-4.333z',
  X_HOME_INACTIVE_PATH: 'M20 9.838c0-.502-.25-.97-.668-1.248l-6.5-4.333c-.504-.336-1.16-.336-1.664 0l-6.5 4.333C4.251 8.868 4 9.336 4 9.838V18.5c0 .828.672 1.5 1.5 1.5h3v-3.5c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5V20h3c.828 0 1.5-.672 1.5-1.5V9.838zm2 8.662c0 1.933-1.567 3.5-3.5 3.5h-5v-5.5c0-.829-.672-1.5-1.5-1.5s-1.5.671-1.5 1.5V22h-5C3.567 22 2 20.433 2 18.5V9.838c0-1.17.585-2.263 1.559-2.912l6.5-4.333c1.175-.784 2.707-.784 3.882 0l6.5 4.333C21.415 7.575 22 8.668 22 9.838V18.5z',
  PLUS_PATH: 'M10.938 4.5H9.9c-1.136 0-1.929 0-2.546.05-.605.05-.953.143-1.216.277-.564.288-1.023.747-1.31 1.31-.135.264-.228.612-.277 1.218C4.5 7.97 4.5 8.765 4.5 9.9v4.2c0 1.136 0 1.929.05 2.546.05.605.143.953.277 1.216.288.565.747 1.023 1.31 1.31.264.135.612.228 1.217.277.617.05 1.41.051 2.546.051h4.2c1.136 0 1.929 0 2.545-.05.606-.05.954-.143 1.217-.277.565-.288 1.023-.746 1.31-1.31.135-.264.228-.612.277-1.217.05-.617.051-1.41.051-2.546v-1.037h2V14.1c0 1.103.001 1.992-.058 2.709-.06.728-.185 1.368-.487 1.96-.48.941-1.245 1.707-2.185 2.186-.593.302-1.233.428-1.961.488-.718.058-1.606.057-2.71.057H9.9c-1.103 0-1.991.001-2.709-.058-.728-.06-1.368-.185-1.96-.487-.941-.48-1.707-1.245-2.186-2.185-.302-.593-.428-1.233-.487-1.961-.059-.718-.058-1.606-.058-2.71V9.9c0-1.103-.001-1.991.058-2.709.06-.728.185-1.368.487-1.96.48-.941 1.245-1.707 2.185-2.186.593-.302 1.233-.428 1.961-.487.718-.059 1.606-.058 2.71-.058h1.037v2z',
}

/** @enum {string} */
const Images = {
  TWITTER_FAVICON: 'data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAA0pJREFUWAntVk1oE1EQnnlJbFK3KUq9VJPYWgQVD/5QD0qpfweL1YJQoZAULBRPggp6kB78PQn14kHx0jRB0UO9REVFb1YqVBEsbZW2SbVS0B6apEnbbMbZ6qbZdTempqCHPAjvzcw3P5mdmfcAiquYgX+cAVwu/+5AdDMQnSPCHUhQA0hf+Rxy2OjicIvzm+qnKhito0qpb2wvJhWeJgCPP7oPELeHvdJ1VSGf3eOPnSWga0S0Qo9HxEkEusDBuNjbEca8G291nlBxmgDc/ukuIvAJxI6wr+yKCsq1ewLxQ2lZfpQLo8oQ4ZXdCkfnACrGWpyDCl+oQmVn5xuVPU102e2P3qoJkFOhzVb9S7KSnL5jJs/mI+As01PJFPSlZeFSZZoAGBRXBZyq9lk5NrC+e7pJ5en30c+JWk59pZ5vRDOuhAD381c/H/FKz1SMNgCE16rg505r5TT0uLqme93d0fbq+1SeLSeU83Ke0RHYFPGVPcjQfNDUwIa7M665+dQAEEjZoMwZMcEF9RxIDAgBQ2mCcqJ0Z0b+h4MNbZ4RnyOSDbNmE2iRk5jCNgIIckFoZAs4IgfLGrlKGjkzS16iwj6pV9I4mUvCPf73JVytH9nRJj24QHrqU8NCIWrMaGqAC+Ut/3ZzAS63cx4v2K/x/IvQBOCwWzu5KmJGwEJ5PIgeG9nQBDDcXPpFoDjJ7ThvBC6EZxXWkJG+JgAFwGM4KBAOcibeGCn8FQ/hyajXPmSk+1sACogn4hYk7OdiHDFSWipPkPWSmY6mCzIghEEuxJvcEYUvxIdhX2mvmSHDDPBF9AJRnDZTyp+P40671JYLbxiAohDxSTfQIg4oNxgPzCWPHaWQBViOf2jGqVwBaEaxGbAqOFMrp+SefC8eNhoFIY5lXzpmtnMGUB2IbU3JdIqVW9m5zcxINn/hAYKiIexdaTh4srHKORMAP0b28PNgJyGt5gvHzQVYx91QpVcwpRFl/p63HSR1DLbid1OcTpAJQOG7u+KH+aI5Qwj13IsamU5vkUSIc8uGLDa8OtoivV8U5HcydFLtT7hlSDVy2nfxI2Ibg9awuVU8IeJAOMF5m2B6jFs1tM5R9rS3GRP5uSuiihn4DzPwA7z7GDH+43gqAAAAAElFTkSuQmCC',
  TWITTER_PIP_FAVICON: 'data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALASURBVHgB7VZNchJBFP5eM9FoRWV2WiZmbmBuIJ4g5ASBRWJlRXIC4ASQVUqxCo4QTwDegJzAiYlFXM1YZWmVQD9fQ6YyAwMMGBZW8i2G6e7He1+/3wHuOih4+fWieJhiKsirA0ZbE44fXZUaWDIGBH4/L+UUUB897DMfPf5ermKJUOaRIhTiDlNEBSwZlnkwY2vCuYOEWD/xMrCoKC41utISRlcc3Or2dfnqwHbDcj9X0fbztn9DAHxOoM0xrZILSIBXtR9F0VGKbJIhz7kVi3Lr770yAz4p2iYm188/awVi6lo4Ns4mETEDLz94uTHjIxDDRaWoohhOSjwi/9mKEFjtlKsayAuRM7M2HmFJwCRVIIqLSAAJjS822v0Vaip1E1oKC6XrXtrExjnxnJ6ldoVKFj0+ujywW3FKTTzJoibmAXP+Yt9uBEsrfLbWRelJzS/0B8z4WoKa6zW/1dd83Hlnn0Z0peAQkqNHvNPZi+qIELBWUNU97LLJ4hDESMZSlNmo+b5UTEvC85m0JCipTQREE+BhdzypIwSkLvyn4LKYrEzQkSZCloiyw+xJbnygfxX+VAJrPWnBoC9ixBXdDm4XflD7YajIinFq3L0E45J7fBa3HyEg7mhgeWjPJODu223J/iMsATzhcmp04+ueXTW1OsiD2zIuVfNNLockBAyIkdaaPxHGs3YR0JTQWnGbWkFCQZX5imwCmBoX++nGpONYD1zu2S0a9IN/g3jSNcNnqsy0ww2ZdPJzCKLXWAAy1N6ay2BRAgEcGZ+aqDnaoqdbjw6dhQgYwz1S2xKOQyQ0Phy7vDPr5iH5ITY+elmtpddLFyQzZBTP3xGl3FJ95NzQJ1hiAgMSw5jnJOZvMA/EMBNKSW89kUAAp+45+g+yojRjljL9NoP4GxdLYzk334vy3lYP0HBjhsw97vHf4C/b8RLHAOr+CQAAAABJRU5ErkJggg==',
}

const THEME_BLUE = 'rgb(29, 155, 240)'
const THEME_COLORS = new Map([
  ['blue500', THEME_BLUE],
  ['yellow500', 'rgb(255, 212, 0)'],
  ['magenta500', 'rgb(249, 24, 128)'],
  ['purple500', 'rgb(120, 86, 255)'],
  ['orange500', 'rgb(255, 122, 0)'],
  ['green500', 'rgb(0, 186, 124)'],
])
const HIGH_CONTRAST_LIGHT = new Map([
  ['blue500', 'rgb(0, 56, 134)'],
  ['yellow500', 'rgb(111, 62, 0)'],
  ['magenta500', 'rgb(137, 10, 70)'],
  ['purple500', 'rgb(82, 52, 183)'],
  ['orange500', 'rgb(137, 43, 0)'],
  ['green500', 'rgb(0, 97, 61)'],
])
const HIGH_CONTRAST_DARK = new Map([
  ['blue500', 'rgb(107, 201, 251)'],
  ['yellow500', 'rgb(255, 235, 107)'],
  ['magenta500', 'rgb(251, 112, 176)'],
  ['purple500', 'rgb(172, 151, 255)'],
  ['orange500', 'rgb(255, 173, 97)'],
  ['green500', 'rgb(97, 214, 163)'],
])
// <body> pseudo-selector for pages the full-width content feature works on
const FULL_WIDTH_BODY_PSEUDO = ':is(.Community, .List, .HomeTimeline)'
// Matches any notification count at the start of the title
const TITLE_NOTIFICATION_RE = /^\(\d+\+?\) /
// The Communities nav item takes you to /yourusername/communities
const URL_COMMUNITIES_RE = /^\/[a-zA-Z\d_]{1,20}\/communities(?:\/explore)?\/?$/
const URL_COMMUNITY_RE = /^\/i\/communities\/\d+(?:\/about)?\/?$/
const URL_COMMUNITY_MEMBERS_RE = /^\/i\/communities\/\d+\/(?:members|moderators)\/?$/
const URL_DISCOVER_COMMUNITIES_RE = /^\/i\/communities\/suggested\/?/
const URL_LIST_RE = /\/i\/lists\/\d+\/?$/
const URL_LISTS_RE = /^\/[a-zA-Z\d_]{1,20}\/lists\/?$/
const URL_MEDIA_RE = /\/(?:photo|video)\/\d\/?$/
const URL_MEDIAVIEWER_RE = /^\/[a-zA-Z\d_]{1,20}\/status\/\d+\/mediaviewer$/i
// Matches URLs which show one of the tabs on a user profile page
const URL_PROFILE_RE = /^\/([a-zA-Z\d_]{1,20})(?:\/(affiliates|with_replies|superfollows|highlights|articles|media|likes))?\/?$/
// Matches URLs which show a user's Followers you know / Followers / Following tab
const URL_PROFILE_FOLLOWS_RE = /^\/[a-zA-Z\d_]{1,20}\/(?:verified_followers|follow(?:ing|ers|ers_you_follow)|creator-subscriptions\/subscriptions)\/?$/
/** Matches the start of any individual Tweet URL, capturing the user and id */
const URL_TWEET_BASE_RE = /^\/([a-zA-Z\d_]{1,20})\/status\/(\d+)/
/** Matches the entire URL when viewing an individual Tweet, including optional end slash */
const URL_TWEET_RE = /^\/([a-zA-Z\d_]{1,20})\/status\/(\d+)\/?$/
/** Matches Tweet interactions page URLs, capturing the path segment for the current tab */
const URL_TWEET_INTERACTIONS_RE = /^\/[a-zA-Z\d_]{1,20}\/status\/\d+\/(quotes|retweets|reposts|likes)\/?$/

// The Twitter Media Assist exension adds a new button at the end of the action
// bar (#346).
const TWITTER_MEDIA_ASSIST_BUTTON_SELECTOR = '.tva-download-icon, .tva-modal-download-icon'
//#endregion

//#region Variables
/**
 * The quoted Tweet associated with a caret menu that's just been opened.
 * @type {import("./types").QuotedTweet}
 */
let quotedTweet = null

/** `true` when a 'Block @${user}' menu item was clicked in the last popup. */
let blockMenuItemClicked = false

/** `true` when a 'Block @${user}' menu item was seen in the last popup. */
let blockMenuItemSeen = false

/** `true` if the user has used the Following "Sort by" menu */
let userSortedFollowing = false

/** `true` if the user has used the "Sort replies" menu */
let userSortedReplies = false

/** Notification count in the title (including any spaces), e.g. `'(1) '`. */
let currentNotificationCount = ''

/** The last notification count we hid from the title. */
let hiddenNotificationCount = ''

/**
 * Title of the page features are being applied to.
 *
 * Normally this is document.title without the site suffix or notification
 * count, but we also use it to "navigate" to the virtual Retweets / Shared
 * Tweets tab on Home without changing the URL.
 */
let currentPage = ''

/**
 * URL pathname of the page features are being applied to, even when the URL
 * points to a desktop modal.
 */
let currentPagePath = ''

/**
 * URL pathname from the last handled title change, used to detect subsequent
 * navigation and modal transitions.
 */
let lastUrlPath = ''

/** Whether the URL from the last handled title change was a desktop modal. */
let lastUrlWasModal = false

/**
 * React Native stylesheet rule for the blur filter for sensitive content.
 * @type {CSSStyleRule}
 */
let filterBlurRule = null

/**
 * React Native stylesheet rule for the Chirp font-family.
 * @type {CSSStyleRule}
 */
let fontFamilyRule = null

/** @type {string} */
let fontSize = null

/** @type {Map<string, import("./types").Disconnectable>} */
let globalObservers = new Map()

/** Set to `true` when a Home/Following heading or Home nav link is used. */
let homeNavigationIsBeingUsed = false

/** Set to `true` when the media modal is open on desktop. */
let isDesktopMediaModalOpen = false

/** Set to `true` when the compose tweet modal is open on desktop. */
let isDesktopComposeTweetModalOpen = false

/** @type {HTMLElement} */
let $desktopComposeTweetModalPopup = null

/**
 * Popup container currently being observed, which can survive app re-renders.
 * @type {HTMLElement}
 */
let $popupContainer = null

/**
 * flex-direction on the element wrapping the app is used to determine the
 * current mode (mobile or desktop).
 */
let lastFlexDirection = null

/**
 * Cache for the last page title which was used for the Home timeline.
 * @type {string}
 */
let lastHomeTimelineTitle = null

/**
 * Observers and pending setup to clean up when the current modal changes.
 * @type {Map<string, import("./types").Disconnectable>}
 */
let modalObservers = new Map()

/**
 * `true` after the app has initialised.
 * @type {boolean}
 */
let observingPageChanges = false

/**
 * MutationObservers active on the current page, or anything else we want to
 * clean up when the user moves off the current page.
 * @type {Map<string, import("./types").Disconnectable>}
 */
let pageObservers = new Map()

/** @type {number} */
let selectedHomeTabIndex = -1

/**
 * Title for the fake timeline used to separate out retweets and quote tweets.
 * @type {string}
 */
let separatedTweetsTimelineTitle = null

/**
 * The current "Color" setting.
 * @type {string}
 */
let themeColor = THEME_BLUE

/**
 * `true` when "For you" was the last tab selected on the Home timeline.
 */
let wasForYouTabSelected = false

function isOnAccessibilitySettingsPage() {
  return currentPagePath == PagePaths.ACCESSIBILITY_SETTINGS
}

function isOnCallsPage() {
  return currentPagePath.startsWith('/i/calls')
}

function isOnChatPage() {
  return currentPagePath.startsWith('/i/chat')
}

function isOnCommunitiesPage() {
  return URL_COMMUNITIES_RE.test(currentPagePath)
}

function isOnCommunityPage() {
  return URL_COMMUNITY_RE.test(currentPagePath)
}

function isOnCommunityMembersPage() {
  return URL_COMMUNITY_MEMBERS_RE.test(currentPagePath)
}

function isOnDiscoverCommunitiesPage() {
  return URL_DISCOVER_COMMUNITIES_RE.test(currentPagePath)
}

function isOnDisplaySettingsPage() {
  return currentPagePath == PagePaths.DISPLAY_SETTINGS
}

function isOnExplorePage() {
  return currentPagePath == '/explore' || currentPagePath.startsWith('/explore/')
}

function isOnFollowListPage() {
  return URL_PROFILE_FOLLOWS_RE.test(currentPagePath)
}

function isOnGrokPage() {
  return currentPagePath.startsWith('/i/grok')
}

function isOnHistoryPage() {
  return currentPagePath.startsWith(PagePaths.HISTORY)
}

function isOnIndividualTweetPage() {
  return URL_TWEET_RE.test(currentPagePath)
}

function isOnOwnTweetPage(tweetPath = currentPagePath) {
  let screenName = getUserScreenName()
  return screenName != null && screenName == tweetPath.match(URL_TWEET_BASE_RE)?.[1]
}

function isOnListPage() {
  return URL_LIST_RE.test(currentPagePath)
}

function isOnListsPage() {
  return URL_LISTS_RE.test(currentPagePath)
}

function isOnHomeTimelinePage() {
  return currentPagePath == PagePaths.HOME
}

function isOnComposeTweetPage() {
  return lastUrlPath.startsWith(PagePaths.COMPOSE_TWEET)
}

function isOnNotificationsPage() {
  return currentPagePath.startsWith('/notifications')
}

function isOnPremiumSignupPage() {
  return lastUrlPath.startsWith('/i/premium_sign_up')
}

function isOnProfilePage() {
  let profilePathUsername = currentPagePath.match(URL_PROFILE_RE)?.[1]
  if (!profilePathUsername) return false
  // twitter.com/user and its sub-URLs put @user in the title
  return currentPage.toLowerCase().includes(`${ltr ? '@' : ''}${profilePathUsername.toLowerCase()}${!ltr ? '@' : ''}`)
}

function isOnQuoteTweetsPage() {
  return currentPagePath.match(URL_TWEET_INTERACTIONS_RE)?.[1] == 'quotes'
}

function isOnSearchPage() {
  return currentPagePath.startsWith('/search') || currentPagePath.startsWith('/hashtag/')
}

function isOnSeparatedTweetsTimeline() {
  return currentPage == separatedTweetsTimelineTitle
}

function isOnSettingsPage() {
  return currentPagePath.startsWith('/settings')
}

function shouldHideSidebar() {
  return isOnExplorePage() || isOnDiscoverCommunitiesPage()
}

function shouldShowSeparatedTweetsTab() {
  return config.retweets == 'separate' || config.quoteTweets == 'separate'
}
//#endregion

//#region Utility functions
function addQuestionMark(text, add) {
  if (!add) return text
  return ltr ? `${text}?` : `؟${text}`
}

function addStyle(css = '') {
  let $style = document.createElement('style')
  if (css) {
    $style.textContent = css
  }
  document.head.appendChild($style)
  return $style
}

/**
 * @param {Element} $svg
 */
function blueCheck($svg) {
  if (!$svg) {
    warn('blueCheck was given', $svg)
    return
  }
  $svg.classList.add('cpft_blue_check')
  // Safari doesn't support using `d: path(…)` to replace paths in an SVG, so
  // we have to manually patch the path in it.
  if (isSafari && config.twitterBlueChecks == 'replace') {
    $svg.firstElementChild.firstElementChild.setAttribute('d', Svgs.BLUE_LOGO_PATH)
  }
}

/**
 * @param {Element} $svgPath
 */
function twitterLogo($svgPath) {
  // Safari doesn't support using `d: path(…)` to replace paths in an SVG, so
  // we have to manually patch the path in it.
  $svgPath.setAttribute('d', Svgs.TWITTER_LOGO_PATH)
  $svgPath.classList.add('cpft_logo')
}

/**
 * @param {string} str
 * @returns {string}
 */
function dedent(str) {
  str = str.replace(/^[ \t]*\r?\n/, '')
  let indent = /^[ \t]+/m.exec(str)
  if (indent) str = str.replace(new RegExp('^' + indent[0], 'gm'), '')
  return str.replace(/(\r?\n)[ \t]+$/, '$1')
}

/**
 * @param {Map<string, import("./types").Disconnectable>} observers
 * @param {'global' | 'page' | 'modal'} scope
 */
function disconnectObservers(observers, scope) {
  if (observers.size == 0) return
  log(
    `disconnecting ${observers.size} ${scope} observer${s(observers.size)}`,
    Array.from(observers.keys())
  )
  logObserverDisconnects = false
  for (let observer of observers.values()) observer.disconnect()
  logObserverDisconnects = true
}

/**
 * @param {MutationRecord[]} mutations
 * @param {($el: Node) => boolean | HTMLElement} fn - return `true` to use [$el]
 * as the result, or return a different HTMLElement to use it as the result.
 * @returns {Node | HTMLElement | null}
 */
function findAddedNode(mutations, fn) {
  for (let mutation of mutations) {
    for (let el of mutation.addedNodes) {
      let result = fn(el)
      if (result) {
        return result === true ? el : result
      }
    }
  }
  return null
}

/**
 * @param {Element} $el
 * @param {Element} $ancestor
 */
function getClosestChild($el, $ancestor) {
  let $child = $el
  while ($child && $child.parentElement !== $ancestor) {
    $child = $child.parentElement
  }
  return $child
}

/** Read the URL and underlying page together for navigation decisions. */
function getCurrentRoute() {
  let urlPath = location.pathname
  let history = desktop ? getTopLevelProps()?.history : null
  let isModal = Boolean(history?.getIsModalRoute?.())
  let pagePath = urlPath
  if (isModal) {
    pagePath = history.getLastNonModalLocationPathname?.() || getRenderedPagePath(urlPath)
  }
  return {urlPath, pagePath, isModal}
}

/** @param {string} fallbackPath */
function getRenderedPagePath(fallbackPath) {
  // Direct modal URLs have no previous route, find the rendered fallback page
  let $column = document.querySelector(Selectors.PRIMARY_COLUMN)
  if (!$column) return fallbackPath
  let reactFiberKey = Object.keys($column).find(key => key.startsWith('__reactFiber$'))
  for (let fiber = $column[reactFiberKey], depth = 0; fiber && depth < 50; fiber = fiber.return, depth++) {
    let routePath = (fiber.stateNode?.props || fiber.memoizedProps)?.location?.pathname
    if (typeof routePath == 'string' && routePath != fallbackPath) return routePath
  }
  return fallbackPath
}

/**
 * @param {string} selector
 * @param {{
 *   name?: string
 *   stopIf?: () => boolean
 *   timeout?: number
 *   context?: Document | HTMLElement
 * }?} options
 * @returns {Promise<HTMLElement | null>}
 */
function getElement(selector, {
  name = null,
  stopIf = null,
  timeout = Infinity,
  context = document,
} = {}) {
  return new Promise((resolve) => {
    let startTime = Date.now()
    let rafId
    let timeoutId

    function stop($element, reason) {
      if ($element == null) {
        warn(`stopped waiting for ${name || selector} after ${reason}`)
      }
      else if (Date.now() > startTime) {
        log(`${name || selector} appeared after ${Date.now() - startTime}ms`)
      }
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      resolve($element)
    }

    if (timeout !== Infinity) {
      timeoutId = setTimeout(stop, timeout, null, `${timeout}ms timeout`)
    }

    function queryElement() {
      if (stopIf?.() === true) {
        stop(null, 'stopIf condition met')
        return
      }

      let $element = context.querySelector(selector)
      if ($element) {
        stop($element)
      }
      else {
        rafId = requestAnimationFrame(queryElement)
      }
    }

    queryElement()
  })
}

function getTopLevelProps() {
  if (!$reactRoot?.firstElementChild) {
    warn('React top level props element not available yet')
    return
  }
  let reactPropsKey = Object.keys($reactRoot.firstElementChild).find(key => key.startsWith('__reactProps'))
  if (reactPropsKey) {
    return $reactRoot.firstElementChild[reactPropsKey].children?.props?.children?.props
  } else {
    warn('React props key not found')
  }
}

function getState() {
  let props = getTopLevelProps()
  if (props) {
    let state = props.store?.getState()
    if (state) return state
    warn('React state not found')
  }
}

function getNotificationCount() {
  let state = getState()
  if (!state || !state.badgeCount) {
    warn('could not get notification count from state')
    return 0
  }
  return state.badgeCount.unreadDMCount + state.badgeCount.unreadNTabCount;
}

/**
 * Headers needed to call Twitter's API with the current user's session.
 */
function getApiHeaders() {
  let csrfToken = document.cookie.split('; ').find(c => c.startsWith('ct0='))?.split('=')[1]
  return {
    'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'content-type': 'application/json',
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-client-language': lang,
    ...(csrfToken && {'x-csrf-token': csrfToken}),
  }
}

let accountLocationCache = new Map()

async function getAccountLocation(screenName) {
  if (!accountLocationCache.has(screenName)) {
    let response = await fetch(
      `/i/api/graphql/XRqGa7EeokUU5kppkh13EA/AboutAccountQuery?variables=${encodeURIComponent(JSON.stringify({screenName}))}`,
      {
        credentials: 'include',
        headers: getApiHeaders(),
      }
    )
    if (response.ok) {
      try {
        let body = await response.json()
        accountLocationCache.set(screenName, body.data?.user_result_by_screen_name?.result?.about_profile)
      } catch(e) {
        error('error getting account location for', screenName, e)
      }
    } else {
      error(response.status, 'response getting account location for', screenName)
    }
  }
  return accountLocationCache.get(screenName)
}

function getStateEntities() {
  let state = getState()
  if (state) {
    if (state.entities) return state.entities
    warn('React state entities not found')
  }
}

function getUserScreenName() {
  let state = getState()
  return state?.entities?.users?.entities?.[state?.session?.user_id]?.screen_name
}

function getThemeColorFromState() {
  let localState = getState()?.settings?.local
  let color = localState?.themeColor
  let highContrast = localState?.highContrastEnabled
  $body.classList.toggle('HighContrast', highContrast)
  if (color) {
    if (THEME_COLORS.has(color)) {
      let colors = THEME_COLORS
      if (highContrast) colors = getColorScheme() == 'Default' ? HIGH_CONTRAST_LIGHT : HIGH_CONTRAST_DARK
      return colors.get(color)
    }
    warn(color, 'not found in THEME_COLORS')
  } else {
    warn('could not get settings.local.themeColor from React state')
  }
}

/**
 * Gets cached tweet info from React state.
 */
function getTweetInfo(tweetId) {
  let tweetEntities = getStateEntities()?.tweets?.entities
  if (tweetEntities) {
    let tweetInfo = tweetEntities[tweetId]
    if (!tweetInfo) {
      warn('tweet info not found', tweetId)
    }
    return tweetInfo
  } else {
    warn('tweet entities not found', tweetId)
  }
}

/**
 * Gets cached user info from React state.
 * @returns {import("./types").UserInfoObject}
 */
function getUserInfo() {
  /** @type {import("./types").UserInfoObject} */
  let userInfo = {}
  let userEntities = getStateEntities()?.users?.entities
  if (userEntities) {
    for (let user of Object.values(userEntities)) {
      userInfo[user.screen_name] = {
        following: user.following,
        followedBy: user.followed_by,
        followersCount: user.followers_count,
      }
    }
  } else {
    warn('user entities not found')
  }
  return userInfo
}

/**
 * @param {*} value
 * @returns {value is string}
 */
function isString(value) {
  return Object.getPrototypeOf(value) === String.prototype
}

function log(...args) {
  if (debug) {
    let page = currentPage?.replace(/(\r?\n)+/g, ' ')
    console.log(`${page ? `(${
      page.length < 42 ? page : page.slice(0, 42) + '…'
    })` : ''}`, ...args)
  }
}

function warn(...args) {
  if (debug) {
    console.log(`❗ ${currentPage ? `(${currentPage})` : ''}`, ...args)
  }
}

function error(...args) {
  console.log(`❌ ${currentPage ? `(${currentPage})` : ''}`, ...args)
}

let logObserverDisconnects = true

/**
 * Convenience wrapper for the MutationObserver API:
 * - Observers have associated names
 * - Optional leading call for callback
 * - Observers are stored in a scope map
 * - Observers already in the given scope will be disconnected
 * - MutationObserver options default to `{childList: true}`
 * @param {Node} $target
 * @param {MutationCallback} callback
 * @param {string | {
 *   leading?: boolean
 *   logElement?: boolean
 *   name: string
 *   observers: Map<string, import("./types").Disconnectable>
 *   onDisconnect?: () => void
 * }} nameOrOptions
 * @param {MutationObserverInit} mutationObserverOptions
 * @returns {import("./types").NamedMutationObserver}
 */
function observeElement($target, callback, nameOrOptions, mutationObserverOptions = {childList: true}) {
  // Passing just a name opts out of the rest of the wrapper features
  if (isString(nameOrOptions)) {
    let observer = Object.assign(new MutationObserver(callback), {name: nameOrOptions})
    observer.observe($target, mutationObserverOptions)
    return observer
  }

  let {leading, logElement, name, observers, onDisconnect} = nameOrOptions

  let observer = Object.assign(new MutationObserver(callback), {name})
  let disconnect = observer.disconnect.bind(observer)
  let disconnected = false
  observer.disconnect = () => {
    if (disconnected) return
    disconnected = true
    disconnect()
    onDisconnect?.()
    observers.delete(name)
    if (logObserverDisconnects) {
      log(`disconnected ${name} observer`)
    }
  }

  if (observers.has(name)) {
    log(`disconnecting existing ${name} observer`)
    logObserverDisconnects = false
    observers.get(name).disconnect()
    logObserverDisconnects = true
  }

  observers.set(name, observer)
  if (logElement) {
    log(`observing ${name}`, $target)
  } else {
    log(`observing ${name}`)
  }
  observer.observe($target, mutationObserverOptions)
  if (leading) {
    callback([], observer)
  }
  return observer
}

/**
 * @param {string} page
 * @returns {() => boolean}
 */
function pageIsNot(page) {
  return function() {
    let pageChanged = page != currentPage
    if (pageChanged) {
      log('pageIsNot', {page, currentPage})
    }
    return pageChanged
  }
}

/**
 * @param {string} path
 * @returns {() => boolean}
 */
function pathIsNot(path) {
  return () => path != lastUrlPath
}

/**
 * Register pending modal setup so disconnecting modalObservers cancels it too.
 * @param {string} name
 * @returns {() => boolean}
 */
function registerModalSetup(name) {
  let cancelled = false
  modalObservers.get(name)?.disconnect()
  let setup = {
    name,
    disconnect() {
      cancelled = true
      if (modalObservers.get(name) == setup) modalObservers.delete(name)
    },
  }
  modalObservers.set(name, setup)
  return () => cancelled
}

/**
 * @template T
 * @param {() => T} fn
 */
function run(fn) {
  return fn()
}

/**
 * @param {number} n
 * @returns {string}
 */
function s(n) {
  return n == 1 ? '' : 's'
}

/**
 * @param {Element} $tweetButtonText
 */
function setTweetButtonText($tweetButtonText) {
  let currentText = $tweetButtonText.textContent
  if (currentText == getString('TWEET') || currentText == getString('TWEET_ALL')) return
  $tweetButtonText.textContent = currentText == getString('POST_ALL') ? getString('TWEET_ALL') : getString('TWEET')
}

function storeConfigChanges(changes) {
  window.postMessage({type: 'cpftConfigChange', changes})
}
//#endregion

//#region Global observers
/**
 * Update theme hooks and colours when <body>'s backgroundColor changes.
 */
function observeBodyBackgroundColor() {
  let lastBackgroundColor = null

  observeElement($body, () => {
    let backgroundColor = $body.style.backgroundColor
    if (backgroundColor == lastBackgroundColor) return

    $body.classList.toggle('Default', backgroundColor == 'rgb(255, 255, 255)')
    $body.classList.toggle('LightsOut', backgroundColor == 'rgb(0, 0, 0)' || backgroundColor == 'rgb(5, 5, 5)')

    if (lastBackgroundColor != null) {
      log('Background setting changed')
      // This also updates body.HighContrast
      updateThemeColor()
    }
    styleEmbed.update()
    lastBackgroundColor = backgroundColor
  }, {
    leading: true,
    name: '<body> style attribute for background colour changes',
    observers: globalObservers,
  }, {
    attributes: true,
    attributeFilter: ['style']
  })
}

const styleEmbed = (() => {
  /** @type {Set<{darkModeStyle: HTMLStyleElement, notificationStyle: HTMLStyleElement, rafId: number | null}>} */
  let embeddedStyles = new Set()

  function updateStyles() {
    let media = config.darkModeTheme == 'dim' && $body.classList.contains('LightsOut') ? 'all' : 'not all'
    for (let {darkModeStyle, notificationStyle} of embeddedStyles) {
      darkModeStyle.media = media
      notificationStyle.media = config.hideNotifications != 'ignore' ? 'all' : 'not all'
    }
  }

  /**
   * @param {string} selector
   * @param {string} rootSelector
   * @param {Document | HTMLElement} context
   */
  function styleEmbed(selector, rootSelector, context = document) {
    let darkModeStyle = document.createElement('style')
    darkModeStyle.textContent = dedent(`
      ${rootSelector}[data-theme="dark"] {
        --x-bg-primary: var(--cpft-background);
        --x-bg-secondary: var(--cpft-raised-bg);
        --x-bg-tertiary: var(--cpft-raised-bg);
        --x-bg-modal: var(--cpft-raised-bg);
        --x-bg-sheets: var(--cpft-raised-bg);
        /* Tailwind & shadcn */
        --background: 210 34% 13%;
        --border: 206 16% 26%;
        --color-background: 210 34% 13%;
        --color-gray-50: 213 25% 16%;
        --color-gray-100: 211 34% 24%;
      }
    `)
    let notificationStyle = document.createElement('style')
    notificationStyle.textContent = dedent(`
      [data-testid="xchat-drawer-unread-badge"] {
        display: none !important;
      }
    `)
    let styles = {darkModeStyle, notificationStyle, rafId: null}
    embeddedStyles.add(styles)
    updateStyles()

    function disconnect() {
      if (styles.rafId != null) cancelAnimationFrame(styles.rafId)
      darkModeStyle.remove()
      notificationStyle.remove()
      embeddedStyles.delete(styles)
    }

    function attachStyles() {
      styles.rafId = null
      if (!context.isConnected) {
        disconnect()
        return
      }
      let $host = context.querySelector(selector)
      let $shadowRoot = $host?.shadowRoot
      let $root = $shadowRoot?.querySelector(rootSelector)
      // Wait for the embed, its shadow root and initial render
      if (!$root) {
        styles.rafId = requestAnimationFrame(attachStyles)
        return
      }
      $shadowRoot.append(darkModeStyle, notificationStyle)
    }

    attachStyles()
    return {disconnect}
  }
  styleEmbed.update = updateStyles
  return styleEmbed
})()

/** @param {HTMLElement} $drawerLayer */
function observeChatDrawer($drawerLayer) {
  let selector = '[data-testid="xchatEmbedDrawer"]'
  /** @type {Element | null} */
  let $embed = null
  /** @type {{disconnect()} | null} */
  let styles = null

  return observeElement($drawerLayer, () => {
    let $host = $drawerLayer.querySelector(selector)
    if ($host == $embed) return

    styles?.disconnect()
    $embed = $host
    styles = $embed ? styleEmbed(selector, ':is([data-xchat-root], [data-xchat-portal])', $drawerLayer) : null
  }, {
    leading: true,
    name: 'Chat embed drawer',
    observers: globalObservers,
    onDisconnect() {
      styles?.disconnect()
    },
  })
}

/**
 * @param {HTMLElement} $popup
 */
async function observeDesktopComposeTweetModal($popup) {
  $popup.classList.add('ComposeTweetModal')
  if (!config.replaceLogo) return

  let modalCancelled = registerModalSetup('Compose Tweet modal setup')
  let $firstEditorRoot = await getElement('.DraftEditor-root', {
    context: $popup,
    name: 'Compose Tweet first editor root',
    stopIf: modalCancelled,
  })
  if (!$firstEditorRoot || modalCancelled()) return

  let $tweetButtonText = $popup.querySelector('button[data-testid="tweetButton"] span > span')
  if ($tweetButtonText) {
    setTweetButtonText($tweetButtonText)
  }

  let $container = $firstEditorRoot.closest('div:not([class])')?.parentElement
  if (!$container) {
    warn('could not find container to observe in compose Tweet modal')
    return
  }

  observeElement($container, () => {
    let $editorRoots = $popup.querySelectorAll('.DraftEditor-root')
    $editorRoots.forEach((/** @type {HTMLElement} */ $editorRoot, index) => {
      if (index == 0) return
      $editorRoot.setAttribute('data-placeholder', getString('ADD_ANOTHER_TWEET'))
      observeDesktopTweetEditorPlaceholder($editorRoot, {
        name: `Modal Tweet editor root ${index} (for placeholder)`,
        observers: modalObservers,
      })
    })
  }, {
    leading: true,
    name: 'Compose Tweet modal Tweets container (for Tweets being added or removed)',
    observers: modalObservers,
  })

  // The Tweet button gets moved around when Tweets are added or removed
  observeElement($container, (mutations) => {
    for (let mutation of mutations) {
      for (let $addedNode of mutation.addedNodes) {
        if (!($addedNode instanceof HTMLElement) || $addedNode.nodeName != 'DIV') continue
        let $tweetButtonText = $addedNode.querySelector('button[data-testid="tweetButton"] span > span')
        if ($tweetButtonText) {
          setTweetButtonText($tweetButtonText)
        }
      }
    }
  }, {
    name: 'Compose Tweet modal contents (for Tweet button moving)',
    observers: modalObservers,
  }, {
    childList: true,
    subtree: true,
  })
}

/**
 * The timeline Tweet box is removed when you navigate to a pinned Communities
 * tab and re-added when you navigate to another Home timeline tab.
 */
async function observeDesktopHomeTimelineTweetBox() {
  let $container = await getElement('div[data-testid="primaryColumn"] > div', {
    name: 'Home timeline Tweet box container',
    stopIf: pageIsNot(currentPage),
  })
  if (!$container) return

  /**
   * @param {HTMLElement} $tweetBox
   */
  async function observeTweetBox($tweetBox) {
    $tweetBox.classList.add('TweetBox')

    if (config.replaceLogo) {
      // Restore "What's happening?" placeholder
      let $editorRoot = await getElement('.DraftEditor-root', {
        context: $tweetBox,
        name: 'Tweet box editor root',
        stopIf: pageIsNot(currentPage),
      })
      if (!$editorRoot) return
      observeDesktopTweetEditorPlaceholder($editorRoot, {
        name: 'Tweet editor root (for placeholder)',
        observers: pageObservers,
        placeholder: getString('WHATS_HAPPENING'),
      })
      tweakTweetButton()
    }
  }

  /** @type {HTMLElement} */
  let $timelineTweetBox = $container.querySelector(':scope > div:has([data-testid^="tweetTextarea"]')
  if ($timelineTweetBox) {
    log('Home timeline Tweet box present')
    observeTweetBox($timelineTweetBox)
  }

  observeElement($container, (mutations) => {
    for (let mutation of mutations) {
      for (let $addedNode of mutation.addedNodes) {
        if (!($addedNode instanceof HTMLElement)) continue
        if ($addedNode.querySelector('[data-testid^="tweetTextarea"]')) {
          log('Home timeline Tweet box appeared')
          $timelineTweetBox = $addedNode
          observeTweetBox($timelineTweetBox)
        }
      }
      for (let $removedNode of mutation.removedNodes) {
        if (!($removedNode instanceof HTMLElement)) continue
        if ($removedNode === $timelineTweetBox) {
          log('Home timeline Tweet box removed')
          $timelineTweetBox = null
          pageObservers.get('Tweet box editor root')?.disconnect()
        }
      }
    }
  }, {
    name: 'Home timeline Tweet box container',
    observers: pageObservers,
  })
}

/**
 * @param {HTMLElement} $popup
 */
async function observeDesktopModalTimeline($popup) {
  let modalCancelled = registerModalSetup('media modal setup')
  // Media modals remember if they were previously collapsed, so we could be
  // waiting for the initial timeline to be either rendered or expanded.
  let $initialTimeline = await getElement(Selectors.MODAL_TIMELINE, {
    context: $popup,
    name: 'initial modal timeline',
    stopIf: modalCancelled,
  })

  if ($initialTimeline == null || modalCancelled()) return

  /**
   * @param {HTMLElement} $timeline
   */
  function observeModalTimelineItems($timeline) {
    let seen = new Map()
    observeElement($timeline, () => {
      onIndividualTweetTimelineChange($timeline, {observers: modalObservers, seen})
    }, {
      leading: true,
      name: 'modal timeline',
      observers: modalObservers,
    })

    // If other media in the modal is clicked, the timeline is replaced.
    observeElement($timeline.parentElement, (mutations) => {
      for (let mutation of mutations) {
        for (let $newTimeline of mutation.addedNodes) {
          if (!($newTimeline instanceof HTMLElement)) continue
          log('modal timeline replaced')
          seen = new Map()
          observeElement($newTimeline, () => {
            onIndividualTweetTimelineChange($newTimeline, {observers: modalObservers, seen})
          }, {
            leading: true,
            name: 'modal timeline',
            observers: modalObservers,
          })
        }
      }
    }, {
      name: 'modal timeline parent',
      observers: modalObservers,
    })
  }

  /**
   * @param {HTMLElement} $timeline
   */
  function observeModalTimeline($timeline) {
    // If the inital timeline doesn't have a style attribute it's a placeholder
    if ($timeline.hasAttribute('style')) {
      observeModalTimelineItems($timeline)
    }
    else {
      log('waiting for modal timeline')
      let startTime = Date.now()
      observeElement($timeline.parentElement, (mutations, observer) => {
        for (let mutation of mutations) {
          for (let $addedNode of mutation.addedNodes) {
            if (!($addedNode instanceof HTMLElement)) continue
            if (Date.now() > startTime) {
              log(`modal timeline appeared after ${Date.now() - startTime}ms`, $addedNode)
            }
            observer.disconnect()
            observeModalTimelineItems($addedNode)
          }
        }
      }, {
        name: 'modal timeline parent',
        observers: modalObservers,
      })
    }
  }

  // The modal timeline can be expanded and collapsed
  let $expandedContainer = $initialTimeline.closest('[aria-expanded="true"]')
  observeElement($expandedContainer.parentElement, async (mutations) => {
    if (mutations.some(mutation => mutation.removedNodes.length > 0)) {
      log('modal timeline collapsed')
      modalObservers.get('modal timeline parent')?.disconnect()
      modalObservers.get('modal timeline')?.disconnect()
    }
    else if (mutations.some(mutation => mutation.addedNodes.length > 0)) {
      log('modal timeline expanded')
      let $timeline = await getElement(Selectors.MODAL_TIMELINE, {
        context: $popup,
        name: 'expanded modal timeline',
        stopIf: modalCancelled,
      })
      if ($timeline == null || modalCancelled()) return
      observeModalTimeline($timeline)
    }
  }, {
    name: 'collapsible modal timeline container',
    observers: modalObservers,
  })

  observeModalTimeline($initialTimeline)
}

const observeFavicon = (() => {
  /** @type {HTMLLinkElement} */
  let $shortcutIcon

  async function observeFavicon() {
    $shortcutIcon = /** @type {HTMLLinkElement} */ (await getElement('link[rel~="icon"]', {
      name: 'shortcut icon'
    }))

    observeElement($shortcutIcon, () => {
      let href = $shortcutIcon.href
      if (config.replaceLogo) {
        // Once we replace the favicon, Twitter stops updating it when
        // notification status changes, so this only handles initial switchover
        // to the Twitter version of the icon.
        if (href.startsWith('data:')) return
        let icon = config.hideNotifications != 'ignore' && href.includes('-pip') ? (
          Images.TWITTER_PIP_FAVICON
        ) : (
          // Make ths initial icon URL different so forceUpdate() replaces it
          Images.TWITTER_FAVICON + '?init'
        )
        $shortcutIcon.href = icon
      } else {
        // If we're hiding notifications, detect when Twitter tries to use the
        // pip version and switch back.
        if (config.hideNotifications != 'ignore' && href.includes('-pip')) {
          $shortcutIcon.href = href.replace('-pip', '')
        }
      }
    }, {
      leading: true,
      name: 'shortcut icon href',
      observers: globalObservers,
    }, {
      attributes: true,
      attributeFilter: ['href'],
    })
  }

  observeFavicon.forceUpdate = function(showPip) {
    let href = $shortcutIcon.href
    if (config.replaceLogo) {
      href = config.hideNotifications == 'ignore' && showPip ? (
        Images.TWITTER_PIP_FAVICON
      ) : (
        Images.TWITTER_FAVICON
      )
    } else {
      href = `//abs.twimg.com/favicons/twitter${
        config.hideNotifications == 'ignore' && showPip ? '-pip' : ''
      }.3.ico`
    }
    if (href != $shortcutIcon.href) {
      $shortcutIcon.href = href
    }
  }

  return observeFavicon
})()

/**
 * Twitter displays popups in the #layers element. It also reuses open popups
 * in certain cases rather than creating one from scratch, so we also need to
 * deal with nested popups, e.g. if you hover over the caret menu in a Tweet, a
 * popup will be created to display a "More" tootip and clicking to open the
 * menu will create a nested element in the existing popup, whereas clicking the
 * caret quickly without hovering over it will display the menu in new popup.
 * Use of nested popups can also differ between desktop and mobile, so features
 * need to be mindful of that.
 */
async function observePopups() {
  let $layers = await getElement('#layers', {
    name: 'layers',
  })
  if (!$layers || $layers == $popupContainer) return
  /** @type {HTMLElement | null} */
  let $drawerLayer = null
  /** @type {Map<HTMLElement, {disconnect()} | null>} */
  let nestedObservers = new Map()

  observeElement($layers, () => {
    // The first layer contains persistent overlays, popups are siblings
    let $firstLayer = /** @type {HTMLElement} */ ($layers.firstElementChild)
    if ($firstLayer != $drawerLayer) {
      $drawerLayer = $firstLayer
      if ($drawerLayer) observeChatDrawer($drawerLayer)
    }

    for (let [$popup, observer] of nestedObservers) {
      if ($popup.parentElement != $layers || $popup == $firstLayer) {
        observer?.disconnect()
        nestedObservers.delete($popup)
      }
    }

    // A modal can already be open if we start on its URL
    for (let $popup of $layers.children) {
      if (!($popup instanceof HTMLElement) || $popup == $firstLayer || nestedObservers.has($popup)) continue
      nestedObservers.set($popup, onPopup($popup))
    }
  }, {
    leading: true,
    name: 'popup container',
    observers: globalObservers,
    onDisconnect() {
      $popupContainer = null
      for (let observer of nestedObservers.values()) {
        observer?.disconnect()
      }
      nestedObservers.clear()
    },
  })
  $popupContainer = $layers
}

async function observeReRenderBoundary() {
  let $rerenderBoundary = await getElement('#react-root > div > div')
  observeElement($rerenderBoundary, () => {
    log('app re-rendered')
    observePopups()
    observeSideNavItems()
    if (observingPageChanges) {
      updateThemeColor()
      if (currentPagePath) processCurrentPage()
    }
  }, {
    name: 'app re-render boundary',
    observers: globalObservers,
  })
}

async function observeTitle() {
  let $title = await getElement('title', {name: '<title>'})
  observeElement($title, () => {
    let title = $title.textContent
    if (title.match(/^Intervention for (X|Twitter)$/)) {
      log('Ignoring one sec extension title')
      return
    }
    if (config.replaceLogo && (ltr ? /X$/ : /^(?:\(\d+\+?\) )?X/).test(title)) {
      title = title.replace(ltr ? /X$/ : 'X', getString('TWITTER'))
    }
    if (config.hideNotifications != 'ignore' && TITLE_NOTIFICATION_RE.test(title)) {
      hiddenNotificationCount = TITLE_NOTIFICATION_RE.exec(title)[0]
      title = title.replace(TITLE_NOTIFICATION_RE, '')
    }
    if (title != $title.textContent) {
      document.title = title
      // If Twitter is opened in the background, changing the title might not
      // re-fire the title MutationObserver, preventing the initial page from
      // being processed.
      if (observingPageChanges && !currentPagePath) {
        onTitleChange(title)
      }
      return
    }
    if (observingPageChanges) {
      onTitleChange(title)
    }
  }, {
    leading: true,
    name: '<title>',
    observers: globalObservers,
  })
}

const observeThemeMeta = (() => {
  /** @type {HTMLElement} */
  let $themeMeta
  /** @type {string} */
  let lastDarkModeBg

  function updateContent() {
    let content = $themeMeta?.getAttribute('content')
    if (config.enabled && config.darkModeTheme == 'dim') {
      if (content == '#000000' || content == '#050505') {
        lastDarkModeBg = content
        $themeMeta.setAttribute('content', '#15202b')
      }
    }
    else if (content == '#15202b' && lastDarkModeBg) {
      $themeMeta.setAttribute('content', lastDarkModeBg)
      lastDarkModeBg = null
    }
  }

  async function observeThemeMeta() {
    $themeMeta = await getElement('meta[name="theme-color"]', {
      name: 'theme <meta>',
      context: document.head || document.documentElement,
    })
    observeElement($themeMeta, () => {
      updateContent()
    }, {
      leading: true,
      name: 'theme <meta>',
      observers: globalObservers,
      onDisconnect() {
        updateContent()
      },
    }, {
      attributes: true,
      attributeFilter: ['content'],
    })
  }

  observeThemeMeta.update = function() {
    updateContent()
  }

  return observeThemeMeta
})()
//#endregion

//#region Page observers
async function observeSidebar() {
  let $primaryColumn = await getElement(Selectors.PRIMARY_COLUMN, {name: 'primary column'})
  let $sidebarContainer = $primaryColumn.parentElement
  observeElement($sidebarContainer, async () => {
    let $sidebar = /** @type {HTMLElement} */ ($sidebarContainer.querySelector(Selectors.SIDEBAR))
    log(`sidebar ${$sidebar ? 'appeared' : 'disappeared'}`)
    $body.classList.toggle('Sidebar', Boolean($sidebar))
    if (!$sidebar) {
      if (!config.hideSidebarContent) {
        pageObservers.get('sidebar contents (for Live on X loading)')?.disconnect()
        pageObservers.get("sidebar What's happening timeline")?.disconnect()
      }
      return
    }
    let $sidebarContents = await getElement('div[data-testid="sidebarColumn"] > div > div > div > div > div', {
      name: 'sidebar contents',
      context: $sidebarContainer,
    })
    $sidebarContents.classList.add('SidebarContents')

    // Process blue checks in the sidebar search dropdown
    if (config.twitterBlueChecks != 'ignore' && !isOnSearchPage() && !isOnExplorePage()) {
      observeSearchForm()
    }
    // Process blue checks in the sidebar user box
    if (!config.hideSidebarContent || config.showRelevantPeople && isOnIndividualTweetPage()) {
      void async function() {
        // Avoid false positive from Premium upsells in the sidebar
        let $aside = await getElement('aside[role="complementary"]:not(:has(a:is([href^="/i/premium"], [href^="https://grok.com/imagine"])))', {
          name: 'sidebar aside box',
          context: $sidebar,
          stopIf: pageIsNot(currentPage),
          timeout: 2000,
        })
        if (!$aside) return
        if (config.twitterBlueChecks != 'ignore') processBlueChecks($aside)
        let $container = $aside.parentElement
        while (!$container.nextElementSibling) $container = $container.parentElement
        $container.classList.toggle(
          'SuggestedFollows',
          config.hideSuggestedFollows && !(config.showRelevantPeople && isOnIndividualTweetPage())
        )
      }()
    }
    if (!config.hideSidebarContent && !isOnExplorePage()) {
      // Hide the ad in sidebar What's happening
      void async function() {
        // What's happening has a unique DOM structure we can look for
        let $whatsHappeningTimeline = await getElement('section > div[aria-label] > div', {
          name: "sidebar What's happening timeline",
          context: $sidebar,
          stopIf: pageIsNot(currentPage),
          timeout: 2000,
        })
        if (!$whatsHappeningTimeline) return
        // What's happening loads asynchronously and refreshes every time the
        // page regains refocus.
        observeElement($whatsHappeningTimeline, () => {
          let $firstTrend = $whatsHappeningTimeline.querySelector(':scope > div:has([data-testid="trend"])')
          if ($firstTrend && !$firstTrend.previousElementSibling.classList.contains('HiddenAd')) {
            $firstTrend.previousElementSibling.classList.toggle('HiddenAd', !$firstTrend.previousElementSibling.querySelector('h2'))
          }
        }, {
          name: "sidebar What's happening timeline",
          observers: pageObservers,
        }, {childList: true, subtree: true})
        if (config.hideWhatsHappening) $whatsHappeningTimeline.closest('section').parentElement.classList.add('WhatsHappening')
      }()
    }
    if (!config.hideSidebarContent) {
      // Observe the Live on X section
      void async function() {
        /**
         * @param {HTMLElement} $liveOnX
         * @param {HTMLElement} $heading
         */
        function handleLiveOnX($liveOnX, $heading) {
          $liveOnX.classList.add('LiveBroadcasts')
          if (config.twitterBlueChecks != 'ignore') {
            // XXX This is sometimes too early, observe changes for them appearing?
            processBlueChecks($liveOnX)
          }
          let branding = $heading.getAttribute('data-branding') || 'x'
          if (config.replaceLogo ? branding == 'x' : branding == 'twitter') {
            let $span = $heading.querySelector('span')
            if ($span) {
              $span.textContent = branding == 'x' ? $span.textContent.replace('X', getString('TWITTER')) : getString('TWITTER')
              $heading.setAttribute('data-branding', branding == 'x' ? 'twitter' : 'x')
            }
          }
        }
        // The heading should be available if the component is already loaded
        let $liveOnXHeading = Array.from($sidebar.querySelectorAll('h2')).find((h2) =>
          h2.hasAttribute('data-branding') || h2.textContent == getString('LIVE_ON_X')
        )
        if ($liveOnXHeading) {
          handleLiveOnX($liveOnXHeading.parentElement.parentElement, $liveOnXHeading)
        }
        // The Live on X box can pop in and out of  existence while you're
        // sitting on a page, so always oveserve for it.
        observeElement($sidebarContents, (mutations) => {
          for (let mutation of mutations) {
            for (let $addedNode of mutation.addedNodes) {
              if (!($addedNode instanceof HTMLElement)) continue
              let $heading = $addedNode.querySelector('h2')
              if ($heading?.textContent == getString('LIVE_ON_X')) {
                log('Live on X appeared')
                handleLiveOnX($addedNode, $heading)
                return
              }
            }
          }
        }, {
          name: 'sidebar contents (for Live on X loading)',
          observers: pageObservers,
        })
      }()
    }
  }, {
    leading: true,
    name:'sidebar container',
    observers: pageObservers,
  })
}

function observeSideNavItems() {
  observeSideNavTweetButton()
}

const observeSideNavTweetButton = (() => {
  /** @type {MutationObserver} */
  let observer

  return async function observeSideNavTweetButton() {
    if (observer) {
      observer.disconnect()
      observer = null
    }

    if (!desktop || !config.replaceLogo) return

    // This element is updated when text is added or removed on resize
    let $buttonTextContainer = await getElement('a[data-testid="SideNav_NewTweet_Button"] span', {
      name: 'sidenav tweet button text container',
    })
    observer = observeElement($buttonTextContainer, () => {
      if ($buttonTextContainer.childElementCount > 0) {
        let $buttonText = /** @type {HTMLElement} */ ($buttonTextContainer.querySelector('span > span'))
        if ($buttonText) {
          setTweetButtonText($buttonText)
        } else {
          warn('could not find tweet button text')
        }
      }
      if (isSafari && config.replaceLogo) {
        tweakTweetIcon()
      }
    }, {
      leading: true,
      name: 'sidenav tweet button',
      observers: globalObservers,
    })
  }
})()

async function observeSearchForm() {
  let $searchForm = await getElement('form[role="search"]', {
    name: 'search form',
    stopIf: pageIsNot(currentPage),
    // The sidebar on Profile pages can be really slow
    timeout: 2000,
  })
  if (!$searchForm) return
  let $results =  /** @type {HTMLElement} */ ($searchForm.lastElementChild)
  observeElement($results, () => {
    processBlueChecks($results)
  }, {
    leading: true,
    name: 'search results',
    observers: pageObservers,
  }, {
    childList: true,
    subtree: true,
  })
}

/**
 * @param {string} page
 * @param {import("./types").TimelineOptions?} options
 */
async function observeTimeline(page, options = {}) {
  let {
    isTabbed = false,
    onTabChanged = null,
    onTimelineAppeared = null,
    tabbedTimelineContainerSelector = null,
    timelineSelector = Selectors.TIMELINE,
  } = options

  let $timeline = await getElement(timelineSelector, {
    name: 'initial timeline',
    stopIf: pageIsNot(page),
  })

  if ($timeline == null) return

  /**
   * @param {HTMLElement} $timeline
   */
  function observeTimelineItems($timeline) {
    observeElement($timeline, () => {
      onTimelineChange($timeline, page, options)
    }, {
      leading: true,
      name: 'timeline',
      observers: pageObservers,
    })
    onTimelineAppeared?.()
    if (isTabbed) {
      // When a tab which has been viewed before is revisited, the timeline is
      // replaced.
      observeElement($timeline.parentElement, (mutations) => {
        for (let mutation of mutations) {
          for (let $addedNode of mutation.addedNodes) {
            if (!($addedNode instanceof HTMLElement)) continue
            let $newTimeline = $addedNode
            log('tab changed')
            onTabChanged?.()
            observeElement($newTimeline, () => {
              onTimelineChange($newTimeline, page, options)
            }, {
              leading: true,
              name: 'timeline',
              observers: pageObservers,
            })
          }
        }
      }, {
        name: 'timeline parent',
        observers: pageObservers,
      })
    }
  }

  // If the inital timeline doesn't have a style attribute it's a placeholder
  if ($timeline.hasAttribute('style')) {
    observeTimelineItems($timeline)
  }
  else {
    log('waiting for timeline')
    let startTime = Date.now()
    observeElement($timeline.parentElement, (mutations, observer) => {
      for (let mutation of mutations) {
        for (let $addedNode of mutation.addedNodes) {
          if (!($addedNode instanceof HTMLElement)) continue
          observer.disconnect()
          if (Date.now() > startTime) {
            log(`timeline appeared after ${Date.now() - startTime}ms`, $addedNode)
          }
          observeTimelineItems($addedNode)
        }
      }
    }, {
      name: 'timeline parent',
      observers: pageObservers,
    })
  }

  // On some tabbed timeline pages, the first time a new tab is navigated to,
  // the element containing the timeline is replaced with a loading spinner.
  if (isTabbed && tabbedTimelineContainerSelector) {
    let $tabbedTimelineContainer = document.querySelector(tabbedTimelineContainerSelector)
    if ($tabbedTimelineContainer) {
      let waitingForNewTimeline = false
      observeElement($tabbedTimelineContainer, async (mutations) => {
        // This is going to fire twice on a new tab, as the spinner is added
        // then replaced with the new timeline element.
        if (!mutations.some(mutation => mutation.addedNodes.length > 0) || waitingForNewTimeline) return

        waitingForNewTimeline = true
        let $newTimeline = await getElement(timelineSelector, {
          name: 'new timeline',
          stopIf: pageIsNot(page),
        })
        waitingForNewTimeline = false
        if (!$newTimeline) return

        log('tab changed')
        onTabChanged?.()
        observeTimelineItems($newTimeline)
      }, {
        name: 'tabbed timeline container',
        observers: pageObservers,
      })
    } else {
      warn('tabbed timeline container not found', tabbedTimelineContainerSelector)
    }
  }
}

/**
 * @param {HTMLElement} $editorRoot
 * @param {{
 *   name: string
 *   observers: Map<string, import("./types").Disconnectable>
 *   placeholder?: string
 * }} options
 */
function observeDesktopTweetEditorPlaceholder($editorRoot, {
  name,
  observers,
  placeholder = '',
}) {
  observeElement($editorRoot, () => {
    if ($editorRoot.firstElementChild.classList.contains('public-DraftEditorPlaceholder-root')) {
      let $placeholder = $editorRoot.querySelector('.public-DraftEditorPlaceholder-inner')
      placeholder = $editorRoot.getAttribute('data-placeholder') || placeholder
      if ($placeholder && $placeholder.textContent != placeholder) {
        $placeholder.textContent = placeholder
      }
    }
  }, {leading: true, name, observers})
}

/**
 * @param {string} page
 */
async function observeIndividualTweetTimeline(page) {
  let $timeline = await getElement(Selectors.TIMELINE, {
    name: 'initial individual tweet timeline',
    stopIf: pageIsNot(page),
  })

  if ($timeline == null) return

  /**
   * @param {HTMLElement} $timeline
   */
  function observeTimelineItems($timeline) {
    let seen = new WeakMap()
    observeElement($timeline, () => {
      onIndividualTweetTimelineChange($timeline, {observers: pageObservers, seen})
    }, {
      leading: true,
      name: 'individual tweet timeline',
      observers: pageObservers,
    })
  }

  // If the inital timeline doesn't have a style attribute it's a placeholder
  if ($timeline.hasAttribute('style')) {
    observeTimelineItems($timeline)
  }
  else {
    log('waiting for individual tweet timeline')
    let startTime = Date.now()
    observeElement($timeline.parentElement, (mutations, observer) => {
      for (let mutation of mutations) {
        for (let $addedNode of mutation.addedNodes) {
          if (!($addedNode instanceof HTMLElement)) continue
          if (Date.now() > startTime) {
            log(`individual tweet timeline appeared after ${Date.now() - startTime}ms`, $addedNode)
          }
          observer.disconnect()
          observeTimelineItems($addedNode)
        }
      }
    }, {
      name: 'individual tweet timeline parent',
      observers: pageObservers,
    })
  }
}
//#endregion

//#region Tweak functions
async function addAccountLocationToFocusedTweet($permalinkBar, screenName) {
  if (!config.addFocusedTweetAccountLocation) return
  if ($permalinkBar.hasAttribute('cpft-account-location-added')) return
  if (!screenName) return
  let accountLocation = await getAccountLocation(screenName)
  if (!accountLocation || !accountLocation.account_based_in) return
  let $separator = document.createElement('span')
  $separator.className = 'AccountLocation cpft_separator cpft_text'
  $separator.setAttribute('aria-hidden', 'true')
  $separator.setAttribute('hidden', '')
  $separator.textContent = '·'
  let $locationLabel = document.createElement('span')
  $locationLabel.className = 'AccountLocation cpft_text'
  $locationLabel.setAttribute('hidden', '')
  $locationLabel.textContent = addQuestionMark(accountLocation.account_based_in, !accountLocation.location_accurate)
  $permalinkBar.append($separator, $locationLabel)
  $permalinkBar.setAttribute('cpft-account-location-added', '')
}

/**
 * Add an "Add muted word" menu item after the given link which takes you
 * straight to entering a new muted word (by clicking its way through all the
 * individual screens!).
 * @param {HTMLElement} $link
 * @param {string} linkSelector
 */
async function addAddMutedWordMenuItem($link, linkSelector) {
  log('addAddMutedWordMenuItem: adding "Add muted word" menu item')

  // Wait for the dropdown to appear on desktop
  if (desktop) {
    $link = await getElement(`#layers div[data-testid="Dropdown"] ${linkSelector}`, {
      name: 'rendered menu item (addAddMutedWordMenuItem)',
      timeout: 100,
    })
    if (!$link) return
  }

  let $addMutedWord = /** @type {HTMLElement} */ ($link.parentElement.cloneNode(true))
  $addMutedWord.classList.add('cpft_menu_item')
  $addMutedWord.querySelector('a').href = PagePaths.ADD_MUTED_WORD
  $addMutedWord.querySelector('span').textContent = getString('ADD_MUTED_WORD')
  $addMutedWord.querySelector('svg').innerHTML = Svgs.MUTE
  $addMutedWord.addEventListener('click', (e) => {
    e.preventDefault()
    History_push?.({
      pathname: '/settings/add_muted_keyword',
      hash: '',
      query: {},
      search: '',
    })
    if (desktop) {
      // Dismiss the menu
      let $menuLayer = /** @type {HTMLElement} */ ($link.closest('[role="group"]')?.firstElementChild?.firstElementChild)
      if (!$menuLayer) {
        warn('addAddMutedWordMenuItem: could not find menu layer to dismiss menu')
      }
      $menuLayer?.click()
    }
  })
  $link.parentElement.insertAdjacentElement('beforebegin', $addMutedWord)
}

function addCaretMenuListenerForQuoteTweet($tweet) {
  let $caret = /** @type {HTMLElement} */ ($tweet.querySelector('[data-testid="caret"]'))
  if ($caret && !$caret.dataset.cpftListener) {
    $caret.addEventListener('click', () => {
      quotedTweet = getQuotedTweetDetails($tweet, {getText: true})
    })
    $caret.dataset.cpftListener = 'true'
  }
}

/**
 * @param {HTMLElement} $blockMenuItem
 */
async function addMuteQuotesMenuItems($blockMenuItem) {
  log('mutableQuoteTweets: adding "Mute this conversation" and "Turn off Quote Tweets" menu item')

  // Wait for the menu to render properly on desktop
  if (desktop) {
    $blockMenuItem = await getElement(`:scope > div > div > div > ${Selectors.BLOCK_MENU_ITEM}`, {
      context: $blockMenuItem.parentElement,
      name: 'rendered block menu item',
      timeout: 100,
    })
    if (!$blockMenuItem) return
  }

  let $muteQuotes = /** @type {HTMLElement} */ ($blockMenuItem.previousElementSibling.cloneNode(true))
  $muteQuotes.classList.add('cpft_menu_item')
  $muteQuotes.querySelector('span').textContent = getString('MUTE_THIS_CONVERSATION')
  $muteQuotes.addEventListener('click', (e) => {
    e.preventDefault()
    log('mutableQuoteTweets: muting quotes of a tweet', quotedTweet)
    config.mutedQuotes = config.mutedQuotes.concat(quotedTweet)
    storeConfigChanges({mutedQuotes: config.mutedQuotes})
    processCurrentPage()
    // Dismiss the menu
    let $menuLayer = /** @type {HTMLElement} */ ($blockMenuItem.closest('[role="group"]')?.firstElementChild?.firstElementChild)
    if (!$menuLayer) {
      warn('mutableQuoteTweets: could not find menu layer to dismiss menu')
    }
    $menuLayer?.click()
  })

  if (quotedTweet?.quotedBy) {
    let $toggleQuotes = /** @type {HTMLElement} */ ($blockMenuItem.previousElementSibling.cloneNode(true))
    $toggleQuotes.classList.add('cpft_menu_item')
    $toggleQuotes.querySelector('span').textContent = getString(`TURN_OFF_QUOTE_TWEETS`)
    $toggleQuotes.querySelector('svg').innerHTML = Svgs.RETWEETS_OFF
    $toggleQuotes.addEventListener('click', (e) => {
      e.preventDefault()
      log('mutableQuoteTweets: toggling quotes from', quotedTweet.quotedBy)
      if (config.hideQuotesFrom.includes(quotedTweet.quotedBy)) {
        config.hideQuotesFrom = config.hideQuotesFrom.filter(user => user != quotedTweet.quotedBy)
      } else {
        config.hideQuotesFrom = config.hideQuotesFrom.concat(quotedTweet.quotedBy)
      }
      storeConfigChanges({hideQuotesFrom: config.hideQuotesFrom})
      processCurrentPage()
      // Dismiss the menu
      let $menuLayer = /** @type {HTMLElement} */ ($blockMenuItem.closest('[role="group"]')?.firstElementChild?.firstElementChild)
      if (!$menuLayer) {
        warn('mutableQuoteTweets: could not find menu layer to dismiss menu')
      }
      $menuLayer?.click()
    })
    $blockMenuItem.insertAdjacentElement('beforebegin', $toggleQuotes)
  } else {
    warn('mutableQuoteTweets: quotedBy not available when Tweet menu was opened')
  }

  $blockMenuItem.insertAdjacentElement('beforebegin', $muteQuotes)
}

/**
 * Add a "Turn on/off Retweets" menu item to a List's menu.
 * @param {HTMLElement} $switchMenuItem
 */
async function addToggleListRetweetsMenuItem($switchMenuItem) {
  log('adding "Turn on/off Retweets" menu item')

  // Wait for the menu to render properly on desktop
  if (desktop) {
    $switchMenuItem = await getElement(':scope > div > div > div > [role="menuitem"]', {
      context: $switchMenuItem.parentElement,
      name: 'rendered switch menu item',
      timeout: 100,
    })
    if (!$switchMenuItem) return
  }

  let $toggleRetweets = /** @type {HTMLElement} */ ($switchMenuItem.cloneNode(true))
  $toggleRetweets.classList.add('cpft_menu_item')
  $toggleRetweets.querySelector('span').textContent = getString(`TURN_${config.listRetweets == 'ignore' ? 'OFF' : 'ON'}_RETWEETS`)
  $toggleRetweets.querySelector('svg').innerHTML = config.listRetweets == 'ignore' ? Svgs.RETWEETS_OFF : Svgs.RETWEET
  // Remove subtitle if the cloned menu item has one
  $toggleRetweets.querySelector('div[dir] + div[dir]')?.remove()
  $toggleRetweets.addEventListener('click', (e) => {
    e.preventDefault()
    log('toggling list retweets')
    config.listRetweets = config.listRetweets == 'ignore' ? 'hide' : 'ignore'
    storeConfigChanges({listRetweets: config.listRetweets})
    processCurrentPage()
    // Dismiss the menu
    let $menuLayer = /** @type {HTMLElement} */ ($switchMenuItem.closest('[role="group"]')?.firstElementChild?.firstElementChild)
    if (!$menuLayer) {
      log('could not find menu layer to dismiss menu')
    }
    $menuLayer?.click()
  })

  $switchMenuItem.insertAdjacentElement('beforebegin', $toggleRetweets)
}

/**
 * Redirects away from the Home timeline if we're on it and it's been disabled.
 * @returns {boolean} `true` if redirected as a result of this call
 */
function checkforDisabledHomeTimeline() {
  if (config.disableHomeTimeline && location.pathname == PagePaths.HOME) {
    log(`Home timeline disabled, redirecting to /${config.disabledHomeTimelineRedirect}`)
    let primaryNavSelector = desktop ? Selectors.PRIMARY_NAV_DESKTOP : Selectors.PRIMARY_NAV_MOBILE
    void (async () => {
      let $navLink = await getElement(`${primaryNavSelector} a[href="/${config.disabledHomeTimelineRedirect}"]`, {
        name: `${config.disabledHomeTimelineRedirect} nav link`,
        stopIf: () => location.pathname != PagePaths.HOME,
      })
      if (!$navLink) return
      $navLink.click()
    })()
    return true
  }
}

function checkReactNativeStylesheet() {
  let $style = /** @type {HTMLStyleElement} */ (document.querySelector('style#react-native-stylesheet'))
  if (!$style) {
    warn('React Native stylesheet not found')
    return
  }

  let lastRulesCount = null
  let startTime = Date.now()

  function findRules() {
    for (let rule of $style.sheet.cssRules) {
      if (!(rule instanceof CSSStyleRule)) continue

      if (fontFamilyRule == null &&
          rule.style.fontFamily?.includes('TwitterChirp') &&
          !rule.style.fontFamily.includes('TwitterChirpExtendedHeavy')) {
        fontFamilyRule = rule
        log('found Chirp fontFamily CSS rule in React Native stylesheet', fontFamilyRule)
        configureFont()
      }

      if (filterBlurRule == null && rule.style.filter?.includes('blur(30px)')) {
        filterBlurRule = rule
        log('found filter: blur(30px) rule in React Native stylesheet', filterBlurRule)
        configureDynamicCss()
      }
    }

    let elapsedTime = new Intl.NumberFormat(undefined).format(Date.now() - startTime)
    if (fontFamilyRule == null || filterBlurRule == null) {
      // Stop checking when there are no new rules since the last check
      if (lastRulesCount != $style.sheet.cssRules.length) {
        lastRulesCount = $style.sheet.cssRules.length
        log(`waiting for more React Native stylesheet rules (${lastRulesCount})`)
        setTimeout(findRules, 100)
      } else {
        warn(`stopped waiting for new React Native stylesheet rules after ${elapsedTime}ms (${lastRulesCount} rules)`)
      }
    } else {
      log(`finished checking React Native stylesheet in ${elapsedTime}ms (${lastRulesCount} rules)`)
    }
  }

  findRules()
}

let History_push
let History_replace

function patchHistory() {
  let props = getTopLevelProps()
  if (!props) return
  if (!props.history) return warn('history not found')
  if (!props.history.push) return warn('history.push not found')
  if (props.history.push.patched) return
  History_push = props.history.push
  History_replace = props.history.replace
  props.history.push = function (...args) {
    if (config.enabled && args[0] != null) {
      if (config.hideVerifiedNotificationsTab && typeof args[0] == 'object' && typeof args[0].pathname == 'string') {
        if (args[0].pathname.endsWith('/verified_followers')) {
          log('Redirecting /verified_followers to /followers')
          args[0].pathname = args[0].pathname.replace(/verified_followers$/, 'followers')
        }
      }
    }
    return History_push(...args)
  }
  props.history.push.patched = true
  log('history patched')
}

function interceptMediaButton() {
  document.addEventListener('click', (e) => {
    if (!config.enabled || !config.hideGrokNav) return
    if (!(e.target instanceof Element)) return

    let $button = e.target.closest('button')
    if (!$button) return

    let $fileInput = $button.previousElementSibling
    if (!($fileInput instanceof HTMLInputElement) ||
        $fileInput.dataset.testid != 'fileInput' ||
        $fileInput.type != 'file') {
      return
    }

    log('hideGrok: opening media file picker')
    e.preventDefault()
    e.stopImmediatePropagation()
    $fileInput.click()
  }, true)
}
//#endregion

//#region Inline replies
const INLINE_REPLIES_PAGE_SIZE = 5

/** Clicks on these parts of a timeline tweet keep their default behaviour */
const INLINE_REPLIES_IGNORE_CLICK_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'audio',
  'video',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]',
  '[role="link"]',
  '[data-testid="tweetPhoto"]',
  '[data-testid="videoPlayer"]',
  '[data-testid="card.wrapper"]',
].join(', ')

/** Tweet language codes which aren't a language */
const NON_LANGUAGE_CODES = new Set(['art', 'qam', 'qct', 'qht', 'qme', 'qst', 'und', 'zxx'])

/**
 * The TweetDetail request used to fetch replies. These defaults are updated
 * from Twitter's own requests, so the query id and features keep up with
 * Twitter's changes once you've viewed any tweet.
 */
let tweetDetailRequest = {
  path: '/i/api/graphql/wjV7NuWEsHgTBFfW3zYKzQ/TweetDetail',
  features: '{"rweb_video_screen_enabled":false,"rweb_cashtags_enabled":true,"profile_label_improvements_pcf_label_in_post_enabled":true,"responsive_web_profile_redirect_enabled":true,"rweb_tipjar_consumption_enabled":false,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"premium_content_api_read_enabled":false,"communities_web_enable_tweet_community_results_fetch":true,"c9s_tweet_anatomy_moderator_badge_enabled":true,"responsive_web_grok_analyze_button_fetch_trends_enabled":false,"responsive_web_grok_analyze_post_followups_enabled":true,"rweb_cashtags_composer_attachment_enabled":true,"responsive_web_jetfuel_frame":true,"rweb_sports_post_context_enabled":true,"responsive_web_grok_share_attachment_enabled":true,"responsive_web_grok_annotations_enabled":true,"articles_preview_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"rweb_conversational_replies_downvote_enabled":false,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":true,"content_disclosure_indicator_enabled":true,"content_disclosure_ai_generated_indicator_enabled":true,"responsive_web_grok_show_grok_translated_post":true,"responsive_web_grok_analysis_button_from_backend":true,"post_ctas_fetch_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":false,"responsive_web_nested_quote_preview_enabled":true,"responsive_web_grok_image_annotation_enabled":true,"responsive_web_grok_imagine_annotation_enabled":true,"responsive_web_grok_community_note_auto_translation_is_enabled":true,"responsive_web_enhance_cards_enabled":false}',
  fieldToggles: '{"withPayments":false,"withDmBlocks":false,"withArticleRichContentState":true,"withArticlePlainText":false,"withArticleSummaryText":true,"withArticleVoiceOver":true,"withGrokAnalyze":false,"withDisallowedReplyControls":false}',
}

/**
 * Replies loaded for each tweet id.
 * @type {Map<string, import("./types").InlineReplies>}
 */
let inlineReplies = new Map()

/**
 * Every reply we've loaded, by id.
 * @type {Map<string, import("./types").InlineReply>}
 */
let inlineReplyTweets = new Map()

/**
 * Translations requested for replies, by id.
 * @type {Map<string, import("./types").InlineReplyTranslation>}
 */
let inlineReplyTranslations = new Map()

/**
 * Ids of replies and reader posts whose replies are currently expanded.
 * @type {Set<string>}
 */
let expandedInlineReplies = new Set()

/**
 * Ids of timeline posts whose replies are expanded below them. Kept apart from
 * expandedInlineReplies, so expanding a post in the reader doesn't also expand
 * it in the timeline.
 * @type {Set<string>}
 */
let expandedTimelinePosts = new Set()

/** @param {string} url */
function rememberTweetDetailRequest(url) {
  try {
    let request = new URL(url, location.origin)
    let features = request.searchParams.get('features')
    if (!features) return
    tweetDetailRequest = {
      path: request.pathname,
      features,
      fieldToggles: request.searchParams.get('fieldToggles') || tweetDetailRequest.fieldToggles,
    }
  } catch (e) {
    warn('inlineReplies: error reading TweetDetail request', e)
  }
}

/**
 * @param {string} tag
 * @param {{[key: string]: any}} [props]
 * @param {...any} children
 * @returns {HTMLElement}
 */
function createEl(tag, props = {}, ...children) {
  let $el = document.createElement(tag)
  for (let [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue
    if (key == 'className') {
      $el.className = value
    } else if (key == 'dataset') {
      Object.assign($el.dataset, value)
    } else {
      $el.setAttribute(key, value === true ? '' : value)
    }
  }
  $el.append(...children.flat().filter(child => child != null && child !== false))
  return $el
}

/**
 * Gets the id and path of a timeline tweet from its timestamp link, ignoring
 * any quoted tweet.
 * @param {Element} $tweet
 * @returns {?{id: string, path: string}}
 */
function getTweetPermalink($tweet) {
  for (let $time of $tweet.querySelectorAll('a[href*="/status/"] > time')) {
    let $link = /** @type {HTMLAnchorElement} */ ($time.parentElement)
    if ($link.parentElement.closest('[role="link"]')) continue
    let match = $link.pathname.match(URL_TWEET_BASE_RE)
    if (match) return {id: match[2], path: `/${match[1]}/status/${match[2]}`}
  }
  return null
}

/**
 * Gets a link card's text, which often explains what a post is about.
 * @param {any} card
 * @returns {import("./types").InlineReply['card']}
 */
function parseTweetCard(card) {
  let values = card?.legacy?.binding_values
  if (!Array.isArray(values)) return null
  let get = key => values.find(value => value.key == key)?.value?.string_value
  let title = get('title')
  let description = get('description')
  if (!title && !description) return null
  return {title: title || null, description: description || null, domain: get('vanity_url') || get('domain') || null}
}

/**
 * @param {any} card
 * @returns {import("./types").InlineReply['poll']}
 */
function parseTweetPoll(card) {
  let values = card?.legacy?.binding_values
  if (!/^poll\dchoice/.test(card?.legacy?.name) || !Array.isArray(values)) return null
  let get = key => values.find(value => value.key == key)?.value
  let choices = []
  for (let i = 1; get(`choice${i}_label`); i++) {
    choices.push({label: get(`choice${i}_label`).string_value, count: Number(get(`choice${i}_count`)?.string_value) || 0})
  }
  if (choices.length == 0) return null
  let endsAt = get('end_datetime_utc')?.string_value
  return {
    choices,
    endsAt: endsAt ? new Date(endsAt) : null,
    final: Boolean(get('counts_are_final')?.boolean_value),
    // 1-based, only present once you've voted
    selected: Number(get('selected_choice')?.string_value) || null,
  }
}

/**
 * @param {any} result a tweet result from Twitter's GraphQL API
 * @returns {?import("./types").InlineReply}
 */
function parseInlineReply(result, depth = 0) {
  // The tweet inside a visibility wrapper (e.g. when replies are limited) has
  // no __typename of its own
  if (result?.__typename == 'TweetWithVisibilityResults') result = {__typename: 'Tweet', ...result.tweet}
  if (result?.__typename != 'Tweet' || !result.legacy) return null
  let legacy = result.legacy
  let user = result.core?.user_results?.result
  let screenName = user?.core?.screen_name ?? user?.legacy?.screen_name
  let id = legacy.id_str || result.rest_id
  if (!screenName || !id) return null
  let note = result.note_tweet?.note_tweet_results?.result
  // A quoted post's own quote comes as nested_quoted_tweet_results
  let quotedResult = result.quoted_status_result ?? result.nested_quoted_tweet_results
  let quoted = depth < 3 ? parseInlineReply(quotedResult?.result, depth + 1) : null
  return {
    id,
    path: `/${screenName}/status/${id}`,
    inReplyToId: legacy.in_reply_to_status_id_str ?? null,
    inReplyToScreenName: legacy.in_reply_to_screen_name ?? null,
    screenName,
    name: user?.core?.name ?? user?.legacy?.name ?? screenName,
    avatarUrl: user?.avatar?.image_url ?? user?.legacy?.profile_image_url_https ?? null,
    createdAt: new Date(legacy.created_at),
    lang: legacy.lang ?? null,
    text: note?.text ?? legacy.full_text ?? '',
    entities: note ? note.entity_set : legacy.entities,
    displayTextRange: note ? null : legacy.display_text_range ?? null,
    media: legacy.extended_entities?.media ?? [],
    possiblySensitive: Boolean(legacy.possibly_sensitive),
    likeCount: legacy.favorite_count ?? 0,
    liked: Boolean(legacy.favorited),
    replyCount: legacy.reply_count ?? 0,
    quoteCount: legacy.quote_count ?? 0,
    quotedId: quoted?.id || legacy.quoted_status_id_str || null,
    isTranslatable: Boolean(result.is_translatable),
    card: parseTweetCard(result.card),
    poll: parseTweetPoll(result.card),
    quoted,
    quoteUnavailable: depth < 3 && Boolean(quotedResult && !quoted),
  }
}

/**
 * @param {string} tweetId
 * @param {?string} cursor
 * @param {AbortSignal} [signal]
 * @returns {Promise<{replies: import("./types").InlineReply[], tweets: import("./types").InlineReply[], cursor: ?string}>}
 */
async function fetchInlineReplies(tweetId, cursor, signal) {
  let variables = {
    focalTweetId: tweetId,
    ...(cursor && {cursor, referrer: 'tweet'}),
    with_rux_injections: false,
    rankingMode: {liked: 'Likes', recent: 'Recency'}[config.sortReplies] || 'Relevance',
    includePromotedContent: false,
    withCommunity: true,
    withQuickPromoteEligibilityTweetFields: false,
    withBirdwatchNotes: true,
    withVoice: true,
  }
  let params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: tweetDetailRequest.features,
    fieldToggles: tweetDetailRequest.fieldToggles,
  })
  let response = await fetch(`${tweetDetailRequest.path}?${params}`, {
    credentials: 'include',
    headers: getApiHeaders(),
    signal,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  let body = await response.json()
  let instructions = body.data?.threaded_conversation_with_injections_v2?.instructions
  if (!Array.isArray(instructions)) {
    throw new Error(body.errors?.[0]?.message || 'unexpected response')
  }

  let replies = []
  let tweets = []
  let seen = new Set()
  let nextCursor = null
  for (let instruction of instructions) {
    let entries = instruction.type == 'TimelineAddEntries' ? instruction.entries : (
      instruction.type == 'TimelineReplaceEntry' ? [instruction.entry] : []
    )
    let items = instruction.type == 'TimelineAddToModule' ? instruction.moduleItems || [] : []
    for (let entry of entries || []) {
      let content = entry?.content
      if (!content) continue
      let itemContent = content.itemContent || content
      if (itemContent.cursorType == 'Bottom' || entry.entryId?.startsWith('cursor-bottom-')) {
        nextCursor = itemContent.value ?? null
      }
      items = items.concat(content.items || [{item: {itemContent}}])
    }
    for (let item of items) {
      let content = item.item?.itemContent || item.itemContent
      if (!content || content.promotedMetadata) continue
      let reply = parseInlineReply(content.tweet_results?.result)
      if (reply && !seen.has(reply.id)) {
        tweets.push(reply)
        seen.add(reply.id)
      }
      // Modules can include the focal tweet, ancestors and grandchildren.
      // Show only direct replies, wherever they occur in a module.
      if (reply?.inReplyToId == tweetId) replies.push(reply)
    }
  }
  return {replies, tweets, cursor: nextCursor}
}

/**
 * Gets loaded replies for a tweet, starting to load them if necessary.
 * @param {string} tweetId
 * @param {string} path
 * @param {?number} replyCount
 */
function getInlineReplies(tweetId, path, replyCount) {
  let state = inlineReplies.get(tweetId)
  if (!state) {
    state = {status: 'loaded', path, replies: [], replyCount, shown: 0, cursor: null, fetched: false}
    inlineReplies.set(tweetId, state)
    loadMoreInlineReplies(tweetId)
  }
  return state
}

/** @param {string} tweetId */
async function loadMoreInlineReplies(tweetId) {
  let state = inlineReplies.get(tweetId)
  if (!state || state.status == 'loading') return
  state.status = 'loading'
  renderInlineReplies(tweetId)
  try {
    let previousCursor = state.fetched ? state.cursor : null
    let {replies, cursor} = await fetchInlineReplies(tweetId, previousCursor)
    // A setting change may have discarded this request while it was loading.
    if (inlineReplies.get(tweetId) !== state) return
    let seen = new Set(state.replies.map(reply => reply.id))
    for (let reply of replies) {
      inlineReplyTweets.set(reply.id, reply)
      if (!seen.has(reply.id)) {
        state.replies.push(reply)
        seen.add(reply.id)
      }
    }
    // Filtered or duplicate-only pages can still lead to further replies.
    // A repeated cursor, however, would just fetch the same page forever.
    state.cursor = cursor != previousCursor ? cursor : null
    state.shown = Math.min(state.replies.length, state.shown + INLINE_REPLIES_PAGE_SIZE)
    state.fetched = true
    state.status = 'loaded'
    log('inlineReplies: loaded', replies.length, 'replies to', tweetId)
  } catch (e) {
    if (inlineReplies.get(tweetId) !== state) return
    error('inlineReplies: error loading replies to', tweetId, e)
    state.status = 'error'
    state.error = String(e?.message || e)
  }
  renderInlineReplies(tweetId)
}

/** @param {string} tweetId */
function showMoreInlineReplies(tweetId) {
  let state = inlineReplies.get(tweetId)
  if (!state) return
  if (state.shown < state.replies.length) {
    state.shown = Math.min(state.replies.length, state.shown + INLINE_REPLIES_PAGE_SIZE)
    renderInlineReplies(tweetId)
  } else if (state.cursor || state.status == 'error') {
    loadMoreInlineReplies(tweetId)
  }
}

/**
 * Translates replies in other languages as they're shown, like X does for
 * posts in the timeline. Deferred so cards aren't replaced while rendering.
 * @param {import("./types").InlineReply} reply
 */
function autoTranslateInlineReply(reply) {
  if (!config.autoTranslateReplies || inlineReplyTranslations.has(reply.id) || !isInlineReplyTranslatable(reply)) return
  if (isDontTranslateLanguage(reply.lang)) return
  inlineReplyTranslations.set(reply.id, {status: 'loading', shown: true})
  queueMicrotask(() => {
    inlineReplyTranslations.delete(reply.id)
    toggleInlineReplyTranslation(reply.id)
  })
}

/** @param {string} replyId */
async function toggleInlineReplyTranslation(replyId) {
  let translation = inlineReplyTranslations.get(replyId)
  if (translation?.status == 'loading') return
  if (translation?.status == 'loaded') {
    translation.shown = !translation.shown
    updateInlineReplyCards(replyId)
    return
  }

  translation = {status: 'loading', shown: true}
  inlineReplyTranslations.set(replyId, translation)
  updateInlineReplyCards(replyId)
  try {
    let response = await fetch(
      `/i/api/1.1/strato/column/None/tweetId=${replyId},destinationLanguage=None,translationSource=Some(X),feature=None,timeout=None,onlyCached=None/translation/service/translateTweet`,
      {
        credentials: 'include',
        headers: getApiHeaders(),
      }
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    let body = await response.json()
    if (body.translationState != 'Success') throw new Error(body.translationState || 'translation failed')
    Object.assign(translation, {
      status: 'loaded',
      text: body.translation,
      entities: body.entities,
      sourceLanguage: body.localizedSourceLanguage,
    })
  } catch (e) {
    error('inlineReplies: error translating', replyId, e)
    translation.status = 'error'
  }
  updateInlineReplyCards(replyId)
}

/** @param {string} text */
function unescapeTweetText(text) {
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({
    amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'",
  })[entity])
}

/**
 * Renders tweet text with links for its entities. Entity indices count code
 * points, not UTF-16 code units.
 * @param {string} text
 * @param {any} entities
 * @param {?[number, number]} displayTextRange
 */
function renderTweetText(text, entities, displayTextRange) {
  let chars = Array.from(text)
  let [start, end] = displayTextRange || [0, chars.length]
  /** @type {{indices: [number, number], $el: ?HTMLElement}[]} */
  let items = []
  for (let url of entities?.urls || []) {
    items.push({indices: url.indices, $el: createEl('a', {
      href: url.expanded_url || url.url,
      target: '_blank',
      rel: 'noopener noreferrer',
    }, url.display_url || url.expanded_url || url.url)})
  }
  for (let mention of entities?.user_mentions || []) {
    items.push({indices: mention.indices, $el: createEl('a', {href: `/${mention.screen_name}`}, `@${mention.screen_name}`)})
  }
  for (let hashtag of entities?.hashtags || []) {
    items.push({indices: hashtag.indices, $el: createEl('a', {href: `/hashtag/${encodeURIComponent(hashtag.text)}`}, `#${hashtag.text}`)})
  }
  for (let symbol of entities?.symbols || []) {
    items.push({indices: symbol.indices, $el: createEl('a', {href: `/search?q=${encodeURIComponent(`$${symbol.text}`)}&src=cashtag_click`}, `$${symbol.text}`)})
  }
  // Media links are replaced by the media itself
  for (let media of entities?.media || []) {
    items.push({indices: media.indices, $el: null})
  }
  items = items
    .filter(item => Array.isArray(item.indices) && item.indices[0] >= start && item.indices[1] <= end)
    .sort((a, b) => a.indices[0] - b.indices[0])

  let $fragment = document.createDocumentFragment()
  let pos = start
  for (let {indices: [itemStart, itemEnd], $el} of items) {
    if (itemStart < pos) continue
    $fragment.append(unescapeTweetText(chars.slice(pos, itemStart).join('')))
    if ($el) $fragment.append($el)
    pos = itemEnd
  }
  $fragment.append(unescapeTweetText(chars.slice(pos, end).join('').trimEnd()))
  return $fragment
}

/** @param {Date} date */
function formatInlineReplyTime(date) {
  let seconds = Math.max(0, (Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return date.toLocaleDateString(lang, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() != new Date().getFullYear() && {year: 'numeric'}),
  })
}

/** @param {number} count */
function formatInlineReplyCount(count) {
  try {
    return new Intl.NumberFormat(lang, {notation: 'compact'}).format(count)
  } catch (e) {
    return String(count)
  }
}

/** Replies with a like or unlike request in flight */
let pendingInlineReplyLikes = new Set()

/**
 * Likes or unlikes a reply with the same GraphQL mutation Twitter uses,
 * updating its card straight away.
 * @param {string} replyId
 */
async function toggleInlineReplyLike(replyId) {
  let reply = inlineReplyTweets.get(replyId)
  if (!reply || pendingInlineReplyLikes.has(replyId)) return
  let operation = reply.liked ? 'UnfavoriteTweet' : 'FavoriteTweet'
  let native = getNativePreviewApi()
  let queryId = native?.operations?.[operation]
  if (!queryId) {
    warn(`inlineReplies: ${operation} isn't available, opening the tweet instead`)
    window.open(reply.path, '_blank')
    return
  }
  let liked = !reply.liked
  let update = () => {
    reply.liked = liked
    reply.likeCount = Math.max(0, reply.likeCount + (liked ? 1 : -1))
    updateInlineReplyCards(replyId)
  }
  update()
  pendingInlineReplyLikes.add(replyId)
  try {
    let path = `/i/api/graphql/${queryId}/${operation}`
    let headers = getApiHeaders()
    headers['x-client-transaction-id'] = await native.transaction(location.origin, path.replace(/^\/i\/api/, ''), 'POST')
    let response = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({variables: {tweet_id: replyId}, queryId}),
    })
    let body = await response.json().catch(() => null)
    if (!response.ok || body?.errors?.length) throw new Error(body?.errors?.[0]?.message || `HTTP ${response.status}`)
  } catch (e) {
    error(`inlineReplies: error with ${operation} for`, replyId, e)
    liked = !liked
    update()
  } finally {
    pendingInlineReplyLikes.delete(replyId)
  }
}

/**
 * Opens Twitter's own reply composer in a small window, so the timeline stays
 * where it is.
 * @param {string} replyId
 */
function replyToInlineReply(replyId) {
  window.open(`/intent/post?in_reply_to=${encodeURIComponent(replyId)}`, 'cpftReply', 'popup,width=600,height=560')
}

/**
 * Languages the user reads, listed as codes such as "en, es, ca", are never
 * translated automatically.
 * @param {?string} language
 */
function isDontTranslateLanguage(language) {
  if (!language) return false
  let base = language.split('-')[0].toLowerCase()
  return String(config.dontTranslateLanguages || '').toLowerCase().split(/[^a-z-]+/).some(code => code && code.split('-')[0] == base)
}

/** @param {import("./types").InlineReply} reply */
function isInlineReplyTranslatable(reply) {
  if (reply.isTranslatable) return true
  return Boolean(reply.lang) && !NON_LANGUAGE_CODES.has(reply.lang) && reply.lang != lang?.split('-')[0]
}

/**
 * @param {import("./types").InlineReply} reply
 * @param {{showReplies?: boolean, showAskPanel?: boolean}} [options] answers which belong
 *   in the reader only show there
 */
function createInlineReply(reply, {showReplies = true, showAskPanel = !askPanelsInReader.has(reply.id)} = {}) {
  let isExpanded = showReplies && expandedInlineReplies.has(reply.id)
  let hasReplies = showReplies && (reply.replyCount > 0 || inlineReplies.has(reply.id))
  autoTranslateInlineReply(reply)
  let translation = inlineReplyTranslations.get(reply.id)
  let showTranslation = translation?.status == 'loaded' && translation.shown

  // Like X's own translations: the translated text replaces the original, with
  // a note above it to switch back.
  let $translationNote = null
  if (translation?.status == 'loaded') {
    $translationNote = createEl('div', {className: 'cpftInlineReplyNote'},
      showTranslation && `Translated from ${translation.sourceLanguage} · `,
      createEl('button', {type: 'button', dataset: {action: 'translate'}}, showTranslation ? 'Show original' : 'Show translation'),
    )
  } else if (translation?.status == 'loading') {
    $translationNote = createEl('div', {className: 'cpftInlineReplyNote'}, 'Translating…')
  } else if (translation?.status == 'error') {
    $translationNote = createEl('div', {className: 'cpftInlineReplyNote'},
      'Couldn\'t translate this tweet · ',
      createEl('button', {type: 'button', dataset: {action: 'translate'}}, 'Try again'),
    )
  }

  let toggleLabel = isExpanded ? 'Hide replies' : (
    config.hideReplyMetrics || reply.replyCount == 0
      ? 'Show replies'
      : `${formatInlineReplyCount(reply.replyCount)} ${reply.replyCount == 1 ? 'reply' : 'replies'}`
  )

  return createEl('div', {
    className: `cpftInlineReply${hasReplies ? ' cpftHasReplies' : ''}`,
    dataset: {tweetId: reply.id},
  },
    // Focusable for keyboard shortcuts
    createEl('div', {className: 'cpftInlineReplyTweet', tabindex: config.keyboardShortcuts ? '0' : null},
      createEl('a', {className: 'cpftInlineReplyAvatar', href: `/${reply.screenName}`},
        reply.avatarUrl && createEl('img', {src: reply.avatarUrl, alt: '', loading: 'lazy'}),
      ),
      createEl('div', {className: 'cpftInlineReplyMain'},
        createEl('div', {className: 'cpftInlineReplyHeader'},
          createEl('a', {className: 'cpftInlineReplyName', href: `/${reply.screenName}`, dir: 'auto'}, reply.name),
          createEl('span', {className: 'cpftInlineReplyHandle'}, `@${reply.screenName}`),
          createEl('span', {}, '·'),
          createEl('a', {className: 'cpftInlineReplyTime', href: reply.path, title: reply.createdAt.toLocaleString(lang)}, formatInlineReplyTime(reply.createdAt)),
        ),
        $translationNote,
        createEl('div', {className: 'cpftInlineReplyText', lang: showTranslation ? null : reply.lang, dir: 'auto'},
          showTranslation
            ? renderTweetText(translation.text, translation.entities, null)
            : renderTweetText(reply.text, reply.entities, reply.displayTextRange),
        ),
        reply.media.length > 0 && createEl('div', {
          className: `cpftInlineReplyMedia${reply.possiblySensitive && !config.unblurSensitiveContent ? ' cpftSensitive' : ''}`,
        },
          reply.media.map((media, index) => createEl('a', {
            href: `${reply.path}/${media.type == 'photo' ? 'photo' : 'video'}/${index + 1}`,
            className: 'cpftInlineReplyMediaItem',
          },
            createEl('img', {src: `${media.media_url_https}?name=small`, alt: media.ext_alt_text || '', loading: 'lazy'}),
            media.type != 'photo' && createEl('span', {className: 'cpftInlineReplyPlay'}, '▶'),
          ))
        ),
        reply.poll && createInlineReplyPoll(reply),
        reply.quoted && createEl('a', {className: 'cpftInlineReplyQuote', href: reply.quoted.path, dir: 'auto'},
          createEl('b', {}, `@${reply.quoted.screenName}`), ' ', reply.quoted.text,
        ),
        !reply.quoted && !reply.quoteUnavailable && reply.quotedId && createEl('a', {className: 'cpftInlineReplyQuote', href: `/i/status/${reply.quotedId}`}, 'View quoted tweet →'),
        createEl('div', {className: 'cpftInlineReplyActions'},
          hasReplies && createEl('button', {type: 'button', dataset: {action: 'toggle'}}, toggleLabel),
          config.quoteTweetPreview && reply.quoteCount > 0 && createEl('button', {type: 'button', dataset: {action: 'quotes'}}, config.hideQuoteTweetMetrics ? 'Quotes' : `${formatInlineReplyCount(reply.quoteCount)} Quotes`),
          config.inlineReplyActions && createEl('button', {
            type: 'button', className: 'cpftInlineReplyAction', 'aria-label': 'Reply', title: 'Reply', dataset: {action: 'reply'},
          }, createSvgIcon(REPLY_ICON_PATH)),
          config.inlineReplyActions ? createEl('button', {
            type: 'button',
            className: `cpftInlineReplyAction cpftLike${reply.liked ? ' cpftLiked' : ''}`,
            'aria-label': reply.liked ? 'Unlike' : 'Like',
            'aria-pressed': String(reply.liked),
            title: reply.liked ? 'Unlike' : 'Like',
            dataset: {action: 'like'},
          },
            createSvgIcon(reply.liked ? LIKED_ICON_PATH : LIKE_ICON_PATH),
            !config.hideLikeMetrics && reply.likeCount > 0 && createEl('span', {}, formatInlineReplyCount(reply.likeCount)),
          ) : !config.hideLikeMetrics && reply.likeCount > 0 && createEl('span', {}, `♥ ${formatInlineReplyCount(reply.likeCount)}`),
          !translation && isInlineReplyTranslatable(reply) && createEl('button', {type: 'button', dataset: {action: 'translate'}}, 'Translate tweet'),
          config.askAboutPosts && createAskButton(reply.id, reply.path),
        ),
        showAskPanel && createAskPanel(reply.id),
      ),
    ),
    isExpanded && createInlineRepliesContainer(reply.id, reply.path, reply.replyCount),
  )
}

/** @param {Date} endsAt */
function formatPollTimeLeft(endsAt) {
  let minutes = Math.max(1, Math.round((endsAt.getTime() - Date.now()) / 60000))
  let [count, unit] = minutes < 60 ? [minutes, 'minute'] : minutes < 1440 ? [Math.round(minutes / 60), 'hour'] : [Math.round(minutes / 1440), 'day']
  return `${count} ${unit}${count == 1 ? '' : 's'} left`
}

/**
 * Polls are read-only here. Like X, an open poll's results stay hidden until
 * you've voted, with a link to vote on the post itself.
 * @param {import("./types").InlineReply} reply
 */
function createInlineReplyPoll(reply) {
  let {choices, endsAt, final, selected} = reply.poll
  let total = choices.reduce((sum, choice) => sum + choice.count, 0)
  let open = !final && endsAt != null && endsAt.getTime() > Date.now()
  let showResults = !open || selected != null
  let top = Math.max(...choices.map(choice => choice.count))
  return createEl('div', {className: `cpftInlineReplyPoll${showResults ? ' cpftPollResults' : ''}`},
    choices.map((choice, index) => {
      let percent = total ? Math.round(choice.count / total * 1000) / 10 : 0
      return createEl('div', {
        className: `cpftPollChoice${showResults && total && choice.count == top ? ' cpftPollLeading' : ''}`,
        style: showResults ? `--cpft-poll-percent: ${percent}%` : null,
      },
        createEl('span', {dir: 'auto'}, choice.label, selected == index + 1 && ' ✓'),
        showResults && createEl('span', {}, `${percent}%`),
      )
    }),
    createEl('div', {className: 'cpftInlineReplyPollInfo'},
      `${formatInlineReplyCount(total)} ${total == 1 ? 'vote' : 'votes'} · `,
      open ? [formatPollTimeLeft(endsAt), selected == null && ' · ', selected == null && createEl('a', {href: reply.path}, 'Vote on X')] : 'Final results',
    ),
  )
}

/**
 * @param {string} tweetId
 * @param {string} path
 * @param {?number} replyCount
 */
function createInlineRepliesContainer(tweetId, path, replyCount) {
  let $container = createEl('div', {className: 'cpftReplies', dataset: {tweetId}})
  getInlineReplies(tweetId, path, replyCount)
  fillInlineReplies($container, tweetId)
  return $container
}

/**
 * @param {HTMLElement} $container
 * @param {string} tweetId
 */
function fillInlineReplies($container, tweetId) {
  let state = inlineReplies.get(tweetId)
  $container.replaceChildren()
  if (!state) return

  for (let reply of state.replies.slice(0, state.shown)) {
    $container.append(createInlineReply(reply))
  }

  let hasMore = state.shown < state.replies.length || Boolean(state.cursor)
  let $status = createEl('div', {className: 'cpftInlineRepliesStatus'})
  $container.setAttribute('aria-busy', String(state.status == 'loading'))
  $status.setAttribute('role', 'status')
  $status.setAttribute('aria-live', 'polite')
  if (state.status == 'loading') {
    $status.append('Loading replies…')
  }
  else if (state.status == 'error') {
    $status.append(
      `Couldn't load replies (${state.error}). `,
      createEl('button', {type: 'button', dataset: {action: 'more', tweetId}}, 'Try again'),
      ' · ',
      createEl('a', {href: state.path}, 'Open tweet'),
    )
  }
  else if (hasMore) {
    $status.append(createEl('button', {type: 'button', dataset: {action: 'more', tweetId}}, getString('SHOW_MORE_REPLIES')))
  }
  else if (state.replies.length == 0) {
    $status.append('No replies to show · ', createEl('a', {href: state.path}, 'Open tweet'))
  }
  // Collapse from the bottom of the replies without scrolling back up
  if ($status.childNodes.length > 0) $status.append(' · ')
  $status.append(createEl('button', {type: 'button', dataset: {action: 'collapse'}}, 'Hide replies'))
  $container.append($status)
}

/** @param {string} tweetId */
function renderInlineReplies(tweetId) {
  for (let $container of document.querySelectorAll(`.cpftReplies[data-tweet-id="${tweetId}"]`)) {
    fillInlineReplies(/** @type {HTMLElement} */ ($container), tweetId)
  }
}

/** @param {string} replyId */
function updateInlineReplyCards(replyId) {
  let reply = inlineReplyTweets.get(replyId)
  if (!reply) return
  for (let $reply of document.querySelectorAll(`.cpftInlineReply[data-tweet-id="${replyId}"]`)) {
    $reply.replaceWith($reply.classList.contains('cpftQuoteListItem') ? createQuoteListItem(reply) : $reply.classList.contains('cpftReaderPost')
      ? createQuoteReaderPost(reply, Number(/** @type {HTMLElement} */ ($reply).dataset.quoteDepth || 0))
      : createInlineReply(reply))
  }
}

/**
 * Scrolls back up to an element if collapsing replies left it above the
 * timeline header.
 * @param {Element} $el
 */
function keepInlineRepliesInView($el) {
  if (!$el?.isConnected) return
  let $header = document.querySelector(mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.DESKTOP_TIMELINE_HEADER)
  let headerBottom = Math.max(0, $header?.getBoundingClientRect().bottom ?? 0)
  let top = $el.getBoundingClientRect().top
  if (top < headerBottom) {
    window.scrollBy(0, top - headerBottom)
  }
}

/**
 * @param {Element} $tweet
 * @param {string} tweetId
 * @param {string} path
 */
function addTimelineInlineReplies($tweet, tweetId, path) {
  let $container = createInlineRepliesContainer(tweetId, path, getTweetInfo(tweetId)?.reply_count ?? null)
  $container.classList.add('cpftRepliesRoot')
  let $tweetText = $tweet.querySelector('[data-testid="tweetText"]')
  $container.style.fontFamily = getComputedStyle($tweetText || $tweet).fontFamily
  $container.addEventListener('click', onInlineRepliesClick)
  $tweet.after($container)
}

/**
 * @param {Element} $tweet
 * @param {{id: string, path: string}} permalink
 */
function toggleTimelineInlineReplies($tweet, {id, path}) {
  if (expandedTimelinePosts.has(id)) {
    log('inlineReplies: collapsing', id)
    expandedTimelinePosts.delete(id)
    if ($tweet.nextElementSibling?.classList.contains('cpftRepliesRoot')) {
      $tweet.nextElementSibling.remove()
    }
    keepInlineRepliesInView($tweet)
  } else {
    log('inlineReplies: expanding', id)
    expandedTimelinePosts.add(id)
    addTimelineInlineReplies($tweet, id, path)
  }
}

/**
 * Twitter re-renders timeline items as they scroll in and out of view, so put
 * back any expanded replies which were removed.
 * @param {HTMLElement} $timeline
 */
function restoreTimelineInlineReplies($timeline) {
  if (!config.enabled || !config.inlineReplies) return
  for (let $tweet of $timeline.querySelectorAll(Selectors.TWEET)) {
    let permalink = getTweetPermalink($tweet)
    let $container = /** @type {HTMLElement} */ ($tweet.nextElementSibling)
    if ($container?.classList.contains('cpftRepliesRoot')) {
      if (permalink && $container.dataset.tweetId == permalink.id && expandedTimelinePosts.has(permalink.id)) continue
      // Twitter may recycle the tweet element for a different post.
      $container.remove()
    }
    if (permalink && expandedTimelinePosts.has(permalink.id)) {
      addTimelineInlineReplies($tweet, permalink.id, permalink.path)
    }
  }
}

function removeTimelineInlineReplies({clearCache = true} = {}) {
  expandedTimelinePosts.clear()
  document.querySelectorAll('.cpftRepliesRoot').forEach($el => $el.remove())
  if (clearCache) {
    expandedInlineReplies.clear()
    inlineReplies.clear()
    inlineReplyTweets.clear()
    inlineReplyTranslations.clear()
  }
}

/** @param {MouseEvent} e */
function onInlineRepliesClick(e) {
  if (e.defaultPrevented || e.button != 0 || !(e.target instanceof Element)) return
  let hasModifier = e.ctrlKey || e.metaKey || e.shiftKey || e.altKey

  let $link = /** @type {HTMLAnchorElement} */ (e.target.closest('a[href]'))
  if ($link) {
    // Navigate within the app for internal links
    if ($link.origin == location.origin && $link.target != '_blank' && !hasModifier && History_push) {
      e.preventDefault()
      e.stopPropagation()
      History_push({
        pathname: $link.pathname,
        hash: '',
        query: {},
        search: $link.search,
      })
    }
    return
  }

  let $button = /** @type {HTMLElement} */ (e.target.closest('button[data-action]'))
  let $reply = /** @type {HTMLElement} */ (e.target.closest('.cpftInlineReply'))
  if ($button) {
    e.preventDefault()
    e.stopPropagation()
    let {action} = $button.dataset
    if (action == 'more') {
      showMoreInlineReplies($button.dataset.tweetId)
    } else if (action == 'collapse') {
      let $container = $button.closest('.cpftReplies')
      if ($container.classList.contains('cpftRepliesRoot')) {
        let $tweet = $container.previousElementSibling
        let permalink = $tweet && getTweetPermalink($tweet)
        if (permalink) toggleTimelineInlineReplies($tweet, permalink)
      } else if ($reply) {
        toggleInlineReplyReplies($reply)
      }
    } else if (action == 'translate' && $reply) {
      toggleInlineReplyTranslation($reply.dataset.tweetId)
    } else if (action == 'toggle' && $reply) {
      toggleInlineReplyReplies($reply)
    } else if (action == 'like' && $reply) {
      toggleInlineReplyLike($reply.dataset.tweetId)
    } else if (action == 'reply' && $reply) {
      replyToInlineReply($reply.dataset.tweetId)
    } else if (action == 'quotes' && $reply) {
      let reply = inlineReplyTweets.get($reply.dataset.tweetId)
      if (reply) openQuoteList(reply)
    }
    return
  }

  // Clicking anywhere else on a reply toggles its replies
  if (e.target.closest('button, video, audio, input, select, [contenteditable]')) return
  if (!$reply || !e.target.closest('.cpftInlineReplyTweet')) return
  if (!window.getSelection()?.isCollapsed) return
  e.stopPropagation()
  if (hasModifier) {
    let reply = inlineReplyTweets.get($reply.dataset.tweetId)
    if (reply) window.open(reply.path, '_blank')
    return
  }
  if ($reply.classList.contains('cpftHasReplies')) {
    toggleInlineReplyReplies($reply)
  }
}

/** @param {HTMLElement} $reply */
function toggleInlineReplyReplies($reply) {
  let replyId = $reply.dataset.tweetId
  let collapsing = expandedInlineReplies.has(replyId)
  log(`inlineReplies: ${collapsing ? 'collapsing' : 'expanding'}`, replyId)
  if (collapsing) {
    expandedInlineReplies.delete(replyId)
  } else {
    expandedInlineReplies.add(replyId)
  }
  // Remember where the clicked reply is, as it will be replaced
  let $parent = $reply.parentElement
  let index = Array.prototype.indexOf.call($parent.children, $reply)
  updateInlineReplyCards(replyId)
  if (collapsing) {
    keepInlineRepliesInView($parent.children[index])
  }
}

/**
 * The tweet a tweet's page is about, whose replies the page already shows.
 * @param {{id: string}} permalink
 */
function isFocalTweet(permalink) {
  return isOnIndividualTweetPage() && URL_TWEET_BASE_RE.exec(currentPagePath)?.[2] == permalink.id
}

/**
 * Clicking on a tweet in a timeline, or on a reply on a tweet's page, expands
 * its replies below it instead of navigating to the tweet's page.
 */
function interceptTimelineTweetClicks() {
  document.addEventListener('click', (e) => {
    if (!config.enabled || !config.inlineReplies) return
    if (e.defaultPrevented) return
    if (e.button != 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
    if (!(e.target instanceof Element)) return

    let $tweet = e.target.closest(Selectors.TWEET)
    if (!$tweet || !$tweet.closest(Selectors.TIMELINE)) return
    if (e.target.closest(INLINE_REPLIES_IGNORE_CLICK_SELECTOR)) return
    // Don't toggle when the user is selecting text
    if (!window.getSelection()?.isCollapsed) return

    let permalink = getTweetPermalink($tweet)
    if (!permalink || isFocalTweet(permalink)) return

    e.preventDefault()
    e.stopImmediatePropagation()
    toggleTimelineInlineReplies($tweet, permalink)
  }, true)
}
//#endregion

//#region Quote reader and image previews
/** @type {HTMLElement} */
let $quoteReader = null
/** @type {HTMLElement} */
let $quoteReturnFocus = null
/** @type {import('./types').QuoteReaderState} */
let quoteReaderState = null
let quoteReaderOriginPath = ''
/** @type {import('./types').QuoteReaderState[]} */
let quoteReaderHistory = []
/** @type {AbortController} */
let quoteReaderRequest = null
/** @type {Map<string, import('./types').QuoteConversation>} */
let quoteConversationCache = new Map()

// SearchTimeline is also the endpoint used by Twitter's native quote list.
// Its query id is refreshed whenever the user performs a native search.
let quoteSearchRequest = {path: '/i/api/graphql/BYppgupFFS2yqVmmRNjlsw/SearchTimeline', features: null, fieldToggles: null}
let nativePreviewApi = null

/**
 * Search requires the transaction header generated by Twitter's own client.
 * Reuse its loaded implementation rather than reproducing its rotating logic.
 * This uses the page's existing runtime, as our normalized tweet access does.
 */
function getNativePreviewApi() {
  if (nativePreviewApi) return nativePreviewApi
  let chunks = window['webpackChunk_twitter_responsive_web']
  if (!Array.isArray(chunks) || chunks.push === Array.prototype.push) return null
  let runtime
  chunks.push([[`cpft-reader-${Date.now()}`], {}, require => { runtime = require }])
  if (!runtime?.m) return null
  let transaction
  /** Query ids of the GraphQL operations we call, which change with Twitter's releases */
  let operations = {SearchTimeline: null, FavoriteTweet: null, UnfavoriteTweet: null}
  let wanted = Object.keys(operations).length
  for (let [id, factory] of Object.entries(runtime.m)) {
    let source = String(factory)
    if (source.includes('rweb_client_transaction_id_enabled') && source.includes('x-client-transaction-id')) {
      let exports = runtime(id)
      transaction = Object.values(exports).find(value => typeof value == 'function' && value.constructor.name == 'AsyncFunction' && value.length == 3)
    }
    let name = source.match(/operationName:["'](SearchTimeline|FavoriteTweet|UnfavoriteTweet)["']/)?.[1]
    if (name && !operations[name]) {
      let operation = runtime(id)
      operations[name] = operation.queryId || operation.default?.queryId || null
      if (operations[name]) wanted--
    }
    if (transaction && wanted == 0) break
  }
  if (transaction) nativePreviewApi = {transaction, queryId: operations.SearchTimeline, operations}
  return nativePreviewApi
}

/** @param {string} url */
function rememberQuoteSearchRequest(url) {
  try {
    let request = new URL(url, location.origin)
    quoteSearchRequest = {
      path: request.pathname,
      features: request.searchParams.get('features'),
      fieldToggles: request.searchParams.get('fieldToggles'),
    }
  } catch (e) {
    warn('quoteReader: could not read search query', e)
  }
}

/** @param {string} tweetId @param {?string} cursor @param {AbortSignal} signal */
async function fetchQuoteList(tweetId, cursor, signal) {
  let native = getNativePreviewApi()
  if (native?.queryId) quoteSearchRequest.path = `/i/api/graphql/${native.queryId}/SearchTimeline`
  let headers = getApiHeaders()
  if (native) headers['x-client-transaction-id'] = await native.transaction(location.origin, quoteSearchRequest.path.replace(/^\/i\/api/, ''), 'GET')
  signal?.throwIfAborted()
  let params = new URLSearchParams({
    variables: JSON.stringify({rawQuery: `quoted_tweet_id:${tweetId} OR url:"status/${tweetId}/video" OR url:"status/${tweetId}/photo"`, count: 20, querySource: 'tdqt', product: 'Latest', ...(cursor && {cursor})}),
    features: quoteSearchRequest.features || tweetDetailRequest.features,
    fieldToggles: quoteSearchRequest.fieldToggles || tweetDetailRequest.fieldToggles,
  })
  let response = await fetch(`${quoteSearchRequest.path}?${params}`, {credentials: 'include', headers, signal})
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  let body = await response.json()
  let instructions = body.data?.search_by_raw_query?.search_timeline?.timeline?.instructions
  if (!Array.isArray(instructions)) throw new Error(body.errors?.[0]?.message || 'Could not load Quote Tweets')
  let quotes = []
  let nextCursor = null
  for (let instruction of instructions) {
    let entries = instruction.entries || (instruction.entry ? [instruction.entry] : [])
    let items = instruction.moduleItems || []
    for (let entry of entries) {
      let content = entry.content?.itemContent || entry.content
      if (!content) continue
      if (content.cursorType == 'Bottom' || entry.entryId?.startsWith('cursor-bottom-')) nextCursor = content.value || null
      items = items.concat(entry.content.items || [{item: {itemContent: content}}])
    }
    for (let item of items) {
      let content = item.item?.itemContent || item.itemContent
      if (content?.promotedMetadata) continue
      let quote = parseInlineReply(content?.tweet_results?.result)
      if (!quote) continue
      let sharesMedia = (quote.entities?.urls || []).some(entity => {
        try {
          let url = new URL(entity.expanded_url || entity.unwound_url)
          return /^(?:www\.|mobile\.)?(?:x|twitter)\.com$/.test(url.hostname) && new RegExp(`^/\\w+/status/${tweetId}/(?:photo|video)(?:/\\d+)?/?$`).test(url.pathname)
        } catch { return false }
      })
      if (quote.quotedId == tweetId || sharesMedia) quotes.push(quote)
    }
  }
  return {quotes, cursor: nextCursor}
}

function rememberQuoteReaderView() {
  if (!quoteReaderState) return
  quoteReaderState.scrollTop = $quoteReader?.querySelector('.cpftQuoteReaderBody')?.scrollTop || 0
  quoteReaderHistory.push(quoteReaderState)
  if (quoteReaderHistory.length > 20) quoteReaderHistory.shift()
}

/** @param {{id: string, path: string}} target */
function openQuoteList(target) {
  if (!config.enabled || !config.quoteTweetPreview) return
  rememberQuoteReaderView()
  quoteReaderRequest?.abort()
  hideImagePreview()
  quoteReaderOriginPath = location.pathname
  quoteReaderState = {id: target.id, path: target.path, mode: 'quotes', status: 'loaded', quotes: [], cursor: null, fetched: false, resolveQuote: false, scrollTop: 0}
  loadMoreQuotePosts()
}

async function loadMoreQuotePosts() {
  let state = quoteReaderState
  if (!state || state.mode != 'quotes' || state.status == 'loading') return
  if (state.fetched && !state.cursor && state.status != 'error') return
  state.scrollTop = $quoteReader?.querySelector('.cpftQuoteReaderBody')?.scrollTop || state.scrollTop
  state.status = 'loading'
  quoteReaderRequest?.abort()
  quoteReaderRequest = new AbortController()
  let signal = quoteReaderRequest.signal
  renderQuoteReader()
  try {
    let previousCursor = state.cursor
    let {quotes, cursor} = await fetchQuoteList(state.id, previousCursor, signal)
    if (signal.aborted || quoteReaderState !== state) return
    let seen = new Set(state.quotes.map(quote => quote.id))
    for (let quote of quotes) {
      if (seen.has(quote.id)) continue
      cacheReaderTweet(quote)
      state.quotes.push(quote)
      seen.add(quote.id)
    }
    state.cursor = cursor != previousCursor ? cursor : null
    state.fetched = true
    state.status = 'loaded'
  } catch (e) {
    if (signal.aborted || quoteReaderState !== state) return
    state.status = 'error'
    state.error = e?.message || String(e)
  }
  renderQuoteReader()
}

function backInQuoteReader() {
  hideImagePreview()
  let previous = quoteReaderHistory.pop()
  if (!previous) return
  quoteReaderRequest?.abort()
  if (previous.mode == 'quotes') {
    quoteReaderState = previous
    if (previous.status == 'loading') {
      previous.status = 'loaded'
      loadMoreQuotePosts()
    } else renderQuoteReader()
  } else openQuoteReader(previous, {push: false, resolveQuote: previous.resolveQuote, scrollTop: previous.scrollTop})
}

/** @param {import('./types').InlineReply} tweet */
function createQuoteListItem(tweet) {
  cacheReaderTweet(tweet)
  let $post = createInlineReply(tweet, {showReplies: false})
  $post.classList.add('cpftQuoteListItem')
  let $main = $post.querySelector(':scope > .cpftInlineReplyTweet > .cpftInlineReplyMain')
  $main.querySelector(':scope > .cpftInlineReplyQuote')?.remove()
  $main.querySelector(':scope > .cpftInlineReplyMedia')?.replaceWith(createReaderMedia(tweet))
  // Keep it on one line with the post's other actions
  $main.querySelector(':scope > .cpftInlineReplyActions').append(
    createEl('button', {type: 'button', className: 'cpftReaderReadPost', dataset: {readerAction: 'open', tweetId: tweet.id, path: tweet.path}}, 'Read tweet →'))
  return $post
}

/** @param {import('./types').InlineReply} tweet */
function cacheReaderTweet(tweet) {
  inlineReplyTweets.set(tweet.id, tweet)
  if (tweet.quoted) cacheReaderTweet(tweet.quoted)
}

/**
 * @param {string} tweetId
 * @param {AbortSignal} signal
 * @returns {Promise<import('./types').QuoteConversation>}
 */
async function getQuoteConversation(tweetId, signal) {
  let cached = quoteConversationCache.get(tweetId)
  if (cached) return cached
  let {tweets, replies, cursor} = await fetchInlineReplies(tweetId, null, signal)
  signal.throwIfAborted()
  let byId = new Map(tweets.map(tweet => [tweet.id, tweet]))
  let tweet = byId.get(tweetId)
  if (!tweet) throw new Error('This tweet is unavailable or could not be loaded')
  let ancestors = []
  let seen = new Set([tweetId])
  let parentId = tweet.inReplyToId
  while (parentId && byId.has(parentId) && !seen.has(parentId)) {
    let parent = byId.get(parentId)
    seen.add(parentId)
    ancestors.unshift(parent)
    parentId = parent.inReplyToId
  }
  let conversation = {tweet, ancestors, replies, cursor}
  quoteConversationCache.set(tweetId, conversation)
  // Keep long timeline sessions bounded. Currently open views retain their data.
  if (quoteConversationCache.size > 30) {
    quoteConversationCache.delete(quoteConversationCache.keys().next().value)
  }
  return conversation
}

/**
 * Quote cards have no href on current Twitter, so first use the parent tweet's
 * normalized entity. Media/timestamp links also work without React state.
 * @param {Element} $target
 * @returns {?{id: string, path: string, resolveQuote: boolean | number, source: HTMLElement}}
 */
function getQuotePreviewTarget($target) {
  // Video posters and player surfaces need the same native click handling as
  // their controls, including before X has mounted the actual video element.
  let videoSelector = 'video, [data-testid="videoPlayer"], [data-testid="videoComponent"], [data-testid="previewInterstitial"], [data-testid="playButton"]'
  if ($target.closest(videoSelector) || $target.closest('[data-testid="tweetPhoto"]')?.querySelector(videoSelector)) return null
  let $custom = /** @type {HTMLAnchorElement} */ ($target.closest('a.cpftInlineReplyQuote'))
  if ($custom) {
    let match = $custom.pathname.match(URL_TWEET_BASE_RE)
    return match ? {id: match[2], path: $custom.pathname, resolveQuote: false, source: $custom} : null
  }
  // Respect real links and native controls within a quoted card.
  if ($target.closest('a, button, video, input, [role="button"]')) return null
  let $tweet = $target.closest(Selectors.TWEET)
  if (!$tweet) return null
  let $quote = /** @type {HTMLElement} */ ($target.closest('div[role="link"]'))
  if (!$quote || !$tweet.contains($quote) || !$quote.querySelector('[data-testid="User-Name"] time')) return null
  let owner = getTweetPermalink($tweet)
  if (!owner) return null
  // A quoted post can show its own quoted post inside it, so work out which
  // level was clicked: 1 for the post's quote, 2 for the quote's quote.
  let depth = 0
  for (let $el = /** @type {Element} */ ($quote); $el && $el !== $tweet; $el = $el.parentElement) {
    if ($el.matches('div[role="link"]')) depth++
  }
  let quoteId = null
  for (let id = owner.id, level = 0; id && level < depth; level++) {
    let info = getTweetInfo(id)
    id = info?.quoted_status_id_str || info?.quoted_status?.id_str || null
    quoteId = id
  }
  if (quoteId) return {id: quoteId, path: `/i/status/${quoteId}`, resolveQuote: false, source: $quote}
  // Only use links belonging to this level, not to a quote nested inside it
  let $link = /** @type {HTMLAnchorElement} */ (Array.from($quote.querySelectorAll('a:has(time), a[href*="/photo/"], a[href*="/video/"]'))
    .find($a => $a.closest('div[role="link"]') === $quote))
  let match = $link?.pathname.match(URL_TWEET_BASE_RE)
  if (match) return {id: match[2], path: `/${match[1]}/status/${match[2]}`, resolveQuote: false, source: $quote}
  // If the normalized cache is missing, resolve the quote from its owner.
  return {...owner, resolveQuote: depth, source: $quote}
}

/**
 * @param {{id: string, path: string}} target
 * @param {{push?: boolean, resolveQuote?: boolean | number, scrollTop?: number | null, title?: string}} options
 */
async function openQuoteReader(target, {push = true, resolveQuote = false, scrollTop = null, title} = {}) {
  if (!config.enabled || !config.quoteTweetPreview) return
  quoteReaderOriginPath = location.pathname
  hideImagePreview()
  if (push) rememberQuoteReaderView()
  quoteReaderRequest?.abort()
  quoteReaderRequest = new AbortController()
  let signal = quoteReaderRequest.signal
  let state = {id: target.id, path: target.path, title, status: /** @type {const} */ ('loading'), scrollTop: scrollTop || 0, focusOnLoad: scrollTop == null, resolveQuote}
  quoteReaderState = state
  renderQuoteReader()
  try {
    let conversation = await getQuoteConversation(target.id, signal)
    if (resolveQuote) {
      // true or 1 is the post's quote, 2 is that quote's quote
      let quoted = conversation.tweet
      for (let level = 0; level < Number(resolveQuote); level++) quoted = quoted?.quoted
      if (!quoted) throw new Error('The quoted tweet is unavailable')
      // Show the full detail response for the quoted post, including ancestors.
      conversation = await getQuoteConversation(quoted.id, signal)
    }
    if (signal.aborted || quoteReaderState !== state) return
    for (let post of [conversation.tweet, ...conversation.ancestors, ...conversation.replies]) cacheReaderTweet(post)
    let tweet = conversation.tweet
    // Reuse the initial reply page if the reader's replies are expanded later.
    if (!inlineReplies.has(tweet.id)) {
      inlineReplies.set(tweet.id, {
        status: 'loaded', path: tweet.path,
        replies: Array.from(new Map(conversation.replies.map(reply => [reply.id, reply])).values()),
        replyCount: tweet.replyCount, shown: Math.min(INLINE_REPLIES_PAGE_SIZE, conversation.replies.length),
        cursor: conversation.cursor, fetched: true,
      })
    }
    // The conversation request already contains the first reply page, so show
    // it immediately when selecting a post without making another API call.
    // Back navigation keeps any explicit collapse the user made in that view.
    if (state.focusOnLoad && (tweet.replyCount > 0 || conversation.replies.length > 0 || conversation.cursor)) {
      expandedInlineReplies.add(tweet.id)
    }
    Object.assign(state, {id: tweet.id, path: tweet.path, status: 'loaded', resolveQuote: false, conversation})
  } catch (e) {
    if (signal.aborted || quoteReaderState !== state) return
    Object.assign(state, {status: 'error', error: e?.message || String(e)})
  }
  renderQuoteReader()
}

function closeQuoteReader({restoreFocus = true} = {}) {
  quoteReaderRequest?.abort()
  quoteReaderRequest = null
  quoteReaderState = null
  quoteReaderOriginPath = ''
  quoteReaderHistory = []
  $quoteReader?.remove()
  $quoteReader = null
  // Answers shown in the reader close with it
  for (let tweetId of askPanelsInReader) {
    openAskPanels.delete(tweetId)
    askPanelsInReader.delete(tweetId)
    renderAskPanels(tweetId)
  }
  if (restoreFocus && $quoteReturnFocus?.isConnected) $quoteReturnFocus.focus({preventScroll: true})
  $quoteReturnFocus = null
}

/** @param {string} source @param {string} [size] */
function getPreviewImageUrl(source, size = 'orig') {
  if (typeof source != 'string' || !source) return null
  try {
    let url = new URL(source, location.origin)
    if (!['https:', 'http:'].includes(url.protocol)) return null
    if (url.hostname == 'pbs.twimg.com' && url.pathname.startsWith('/media/')) {
      // Old media URLs encode the size after a colon instead of in the query.
      url.pathname = url.pathname.replace(/:(?:thumb|small|medium|large|orig)$/, '')
      url.searchParams.set('name', size)
    }
    return url.href
  } catch {
    return null
  }
}

/** @param {import('./types').InlineReply} tweet */
function createReaderMedia(tweet) {
  let $media = createEl('div', {className: 'cpftReaderMedia'})
  let photoCount = tweet.media.filter(media => media.type == 'photo').length
  let $photos = createEl('div', {className: 'cpftReaderPhotoGrid', dataset: {photoCount}})
  for (let [index, media] of tweet.media.entries()) {
    let poster = getPreviewImageUrl(media.media_url_https, 'large')
    if (media.type == 'photo') {
      if (!$photos.parentElement) $media.append($photos)
      $photos.append(createEl('a', {className: 'cpftReaderPhoto', href: `${tweet.path}/photo/${index + 1}`, 'aria-label': media.ext_alt_text || `Photo ${index + 1} of ${photoCount}`},
        createEl('img', {src: poster, alt: media.ext_alt_text || 'Tweet image', loading: 'lazy', decoding: 'async', width: media.original_info?.width || media.sizes?.large?.w, height: media.original_info?.height || media.sizes?.large?.h})))
    } else {
      let variants = (media.video_info?.variants || [])
        .filter(variant => variant.content_type == 'video/mp4' && getPreviewImageUrl(variant.url))
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
      let variant = variants.find(variant => variant.bitrate <= 2176000) || variants[variants.length - 1]
      if (variant) {
        $media.append(createEl('video', {
          controls: true, playsinline: true, preload: 'none', poster,
          ...(media.type == 'animated_gif' && {loop: true, muted: true}),
        }, createEl('source', {src: variant.url, type: 'video/mp4'})))
      }
      $media.append(createEl('a', {className: 'cpftReaderMediaFallback', href: `${tweet.path}/video/${index + 1}`}, 'Open video on X ↗'))
    }
  }
  if (tweet.possiblySensitive && !config.unblurSensitiveContent) {
    let $reveal = createEl('button', {type: 'button', className: 'cpftReaderReveal'}, 'Show sensitive media')
    $media.classList.add('cpftReaderSensitive')
    $reveal.addEventListener('click', () => {
      $media.classList.remove('cpftReaderSensitive')
      $reveal.remove()
    })
    $media.prepend($reveal)
  }
  return $media
}

/** @param {import('./types').InlineReply} tweet @param {number} [depth] */
function createQuoteReaderPost(tweet, depth = 0) {
  cacheReaderTweet(tweet)
  let $post = createInlineReply(tweet, {showAskPanel: true})
  $post.classList.add('cpftReaderPost')
  $post.dataset.quoteDepth = String(depth)
  let $main = $post.querySelector(':scope > .cpftInlineReplyTweet > .cpftInlineReplyMain')
  let $media = $main.querySelector(':scope > .cpftInlineReplyMedia')
  if ($media) $media.replaceWith(createReaderMedia(tweet))
  let $quote = $main.querySelector(':scope > .cpftInlineReplyQuote')
  if ($quote && tweet.quoted && depth < 3) {
    $quote.replaceWith(createEl('div', {className: 'cpftReaderEmbeddedQuote'},
      createEl('button', {type: 'button', className: 'cpftReaderContextLink', dataset: {readerAction: 'open', tweetId: tweet.quoted.id, path: tweet.quoted.path}}, 'Quoted tweet ↗'),
      createQuoteReaderPost(tweet.quoted, depth + 1)))
  }
  if (tweet.quoteUnavailable) $main.append(createEl('p', {className: 'cpftReaderNote'}, 'Quoted tweet unavailable'))
  return $post
}

function positionQuoteReader() {
  if (!$quoteReader) return
  let $sidebar = document.querySelector(Selectors.SIDEBAR)
  let rect = $sidebar?.getBoundingClientRect()
  let search = $sidebar?.querySelector('form[role="search"]')?.getBoundingClientRect()
  let anchored = rect && rect.width >= 280 && rect.left >= 0 && rect.right <= innerWidth + 1 && getComputedStyle($sidebar).display != 'none'
  let width = anchored ? rect.width : Math.min(440, innerWidth - 24)
  let top = anchored ? Math.max(12, search?.bottom || 52) + 12 : 64
  top = Math.min(top, Math.max(12, innerHeight - 200))
  Object.assign($quoteReader.style, {
    left: `${anchored ? rect.left : Math.max(12, innerWidth - width - 12)}px`,
    top: `${top}px`, width: `${width}px`, maxHeight: `${innerHeight - top - 12}px`,
  })
  $quoteReader.classList.toggle('cpftReaderFloating', !anchored)
}

function renderQuoteReader() {
  let state = quoteReaderState
  if (!state) return
  let created = !$quoteReader
  if (created) {
    $quoteReader = createEl('aside', {id: 'cpftQuoteReader', role: 'region', 'aria-labelledby': 'cpftQuoteReaderTitle', tabindex: '-1'})
    $quoteReader.addEventListener('click', onQuoteReaderClick)
    document.body.append($quoteReader)
  }
  let $body = createEl('div', {className: 'cpftQuoteReaderBody', 'aria-busy': String(state.status == 'loading')})
  let $header = createEl('div', {className: 'cpftQuoteReaderHeader'},
    // Icons rather than ← and × characters, which fonts don't centre
    createEl('button', {type: 'button', disabled: quoteReaderHistory.length == 0, 'aria-label': 'Back to previous quoted tweet', title: 'Back', dataset: {readerAction: 'back'}}, createSvgIcon(BACK_ICON_PATH)),
    createEl('h2', {id: 'cpftQuoteReaderTitle'}, state.mode == 'quotes' ? 'Quote Tweets' : state.title || 'Quoted tweet'),
    createEl('a', {href: state.mode == 'quotes' ? `${state.path}/quotes` : state.path, target: '_blank', rel: 'noopener noreferrer', className: 'cpftReaderOpen', title: 'Open in a new tab'}, 'Open ↗'),
    createEl('button', {type: 'button', 'aria-label': 'Close quote reader', title: 'Close (Esc)', dataset: {readerAction: 'close'}}, createSvgIcon(CLOSE_ICON_PATH)))
  if (state.mode == 'quotes') {
    $body.append(createEl('p', {className: 'cpftReaderSectionLabel'}, 'Quote Tweets available on X · newest first'))
    for (let quote of state.quotes) $body.append(createQuoteListItem(quote))
    let $footer = createEl('div', {className: 'cpftQuoteListFooter', role: 'status', 'aria-live': 'polite'})
    if (state.status == 'loading') $footer.append('Loading Quote Tweets…')
    else if (state.status == 'error') $footer.append(createEl('p', {}, `Couldn’t load Quote Tweets (${state.error}).`), createEl('button', {type: 'button', dataset: {readerAction: 'more-quotes'}}, 'Try again'))
    else if (state.cursor) {
      if (state.quotes.length == 0) $footer.append(createEl('p', {}, 'No Quote Tweets on this page. Check the next page for more.'))
      $footer.append(createEl('button', {type: 'button', dataset: {readerAction: 'more-quotes'}}, 'Show more Quote Tweets'))
    }
    else $footer.append(state.quotes.length ? 'You’ve reached the end of the available Quote Tweets.' : 'No Quote Tweets available to show.')
    $body.append($footer)
  } else if (state.status == 'loading') {
    $body.append(createEl('div', {className: 'cpftReaderLoading', role: 'status'}, 'Loading quoted tweet…'),
      createEl('div', {className: 'cpftReaderSkeleton', 'aria-hidden': 'true'}))
  } else if (state.status == 'error') {
    $body.append(createEl('div', {className: 'cpftReaderEmpty', role: 'status'},
      createEl('p', {}, state.error),
      createEl('button', {type: 'button', dataset: {readerAction: 'retry'}}, 'Try again'),
      ' · ', createEl('a', {href: state.path, target: '_blank', rel: 'noopener noreferrer'}, 'Open tweet on X ↗')))
  } else {
    let {tweet, ancestors} = state.conversation
    let oldest = ancestors[0] || tweet
    if (oldest.inReplyToId) {
      $body.append(createEl('button', {type: 'button', className: 'cpftReaderContextLink', dataset: {
        readerAction: 'open', tweetId: oldest.inReplyToId,
        path: `/${oldest.inReplyToScreenName || 'i'}/status/${oldest.inReplyToId}`,
      }}, 'View earlier conversation ↑'))
    }
    if (ancestors.length) {
      let $context = createEl('div', {className: 'cpftReaderAncestors'},
        createEl('p', {className: 'cpftReaderSectionLabel'}, 'Earlier in this conversation'))
      for (let ancestor of ancestors) $context.append(createQuoteReaderPost(ancestor))
      $body.append($context)
    }
    let $focus = createEl('div', {className: 'cpftReaderFocus'},
      ancestors.length > 0 && createEl('button', {type: 'button', className: 'cpftReaderContextLink', dataset: {readerAction: 'context-top'}}, 'Earlier conversation ↑'),
      createQuoteReaderPost(tweet))
    $body.append($focus)
  }
  $quoteReader.replaceChildren($header, $body)
  $body.scrollTop = state.scrollTop
  positionQuoteReader()
  if (state.focusOnLoad && state.status == 'loaded') {
    let $focus = /** @type {HTMLElement} */ ($body.querySelector('.cpftReaderFocus'))
    if ($focus) $body.scrollTop = Math.max(0, $focus.offsetTop - $body.offsetTop)
    state.focusOnLoad = false
    state.scrollTop = $body.scrollTop
  }
  if (created) $quoteReader.focus({preventScroll: true})
}

/** @param {MouseEvent} e */
function onQuoteReaderClick(e) {
  if (!(e.target instanceof Element) || e.button != 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
  let $button = /** @type {HTMLElement} */ (e.target.closest('[data-reader-action]'))
  if ($button) {
    e.preventDefault()
    e.stopPropagation()
    let {readerAction, tweetId, path} = $button.dataset
    if (readerAction == 'close') closeQuoteReader()
    else if (readerAction == 'open') openQuoteReader({id: tweetId, path})
    else if (readerAction == 'retry' && quoteReaderState) openQuoteReader(quoteReaderState, {push: false, resolveQuote: quoteReaderState.resolveQuote})
    else if (readerAction == 'back') backInQuoteReader()
    else if (readerAction == 'more-quotes') loadMoreQuotePosts()
    else if (readerAction == 'context-top') $quoteReader.querySelector('.cpftQuoteReaderBody').scrollTop = 0
    return
  }
  let $quoteItem = /** @type {HTMLElement} */ (e.target.closest('.cpftQuoteListItem'))
  if ($quoteItem && !e.target.closest('a, button, video, input') && window.getSelection()?.isCollapsed) {
    let post = inlineReplyTweets.get($quoteItem.dataset.tweetId)
    if (post) { e.stopPropagation(); openQuoteReader(post); return }
  }
  onInlineRepliesClick(e)
}

/** @type {{source: HTMLElement, image: HTMLImageElement, overlay: HTMLElement, timer: ReturnType<typeof setTimeout>} | null} */
let imagePreview = null

/** @type {?{x: number, y: number}} */
let lastPointerPosition = null

/** A photo whose preview was dismissed, which stays closed until the pointer leaves it */
let dismissedPreviewSource = null

/** @param {HTMLElement} $el */
function isUnderPointer($el) {
  if (!lastPointerPosition || !$el.isConnected) return false
  let rect = $el.getBoundingClientRect()
  let {x, y} = lastPointerPosition
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function hideImagePreview() {
  if (!imagePreview) return
  clearTimeout(imagePreview.timer)
  imagePreview.overlay.remove()
  imagePreview = null
}

/** @param {Element} $target @returns {?{source: HTMLElement, image: HTMLImageElement}} */
function getHoverImage($target) {
  let $source = /** @type {HTMLElement} */ ($target.closest('[data-testid="tweetPhoto"], .cpftInlineReplyMediaItem, .cpftReaderPhoto'))
  if (!$source && $target.matches('a[href*="/photo/"]')) $source = $target.querySelector('[data-testid="tweetPhoto"]')
  if (!$source || $source.closest('.cpftSensitive, .cpftReaderSensitive')) return null
  // Twitter also uses tweetPhoto for unplayed video posters. The media URL and
  // native player/interstitial markers distinguish them from actual photos.
  if ($source.closest('[data-testid="videoPlayer"], [data-testid="videoComponent"]') ||
      $source.querySelector('video, [data-testid="previewInterstitial"], [data-testid="playButton"], [data-testid="videoPlayer"]')) return null
  if ($source.classList.contains('cpftInlineReplyMediaItem') && !$source.getAttribute('href')?.includes('/photo/')) return null
  let $image = $source.querySelector('img')
  if (!$image || !getPreviewImageUrl($image.currentSrc || $image.src)) return null
  if (/\/(?:amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb|video_thumb)\//.test($image.currentSrc || $image.src)) return null
  if (Array.from($source.querySelectorAll('img, div')).some($el => getComputedStyle($el).filter.includes('blur('))) return null
  // Do not turn a hover into a way to reveal blurred native media.
  for (let $el = /** @type {Element} */ ($source), i = 0; $el && i < 6; $el = $el.parentElement, i++) {
    if (getComputedStyle($el).filter.includes('blur(')) return null
  }
  return {source: $source, image: $image}
}

/** @param {HTMLElement} source @param {HTMLImageElement} image */
function showImagePreview(source, image) {
  if (imagePreview?.source == source) return
  hideImagePreview()
  let overlay = createEl('div', {id: 'cpftImagePreview', role: 'tooltip', 'aria-label': image.alt || 'Image preview'})
  let preview = {source, image, overlay, timer: null}
  imagePreview = preview
  preview.timer = setTimeout(() => {
    if (imagePreview !== preview) return
    if (!source.isConnected) {
      // X re-rendered the photo under a still pointer, so use the new one
      hideImagePreview()
      let $under = lastPointerPosition && document.elementFromPoint(lastPointerPosition.x, lastPointerPosition.y)
      let target = $under && getHoverImage($under)
      if (target) showImagePreview(target.source, target.image)
      return
    }
    let $image = /** @type {HTMLImageElement} */ (createEl('img', {alt: image.alt || '', decoding: 'async'}))
    $image.addEventListener('load', () => {
      if (imagePreview !== preview || !source.isConnected) return
      let scale = Math.min(1, Math.min(1100, innerWidth - 32) / $image.naturalWidth, (innerHeight - 48) / $image.naturalHeight)
      let width = Math.round($image.naturalWidth * scale)
      let height = Math.round($image.naturalHeight * scale)
      let rect = source.getBoundingClientRect()
      let left = rect.right + 16
      if (left + width + 16 > innerWidth) left = rect.left - width - 32
      if (left < 12) left = (innerWidth - width - 16) / 2
      let top = Math.min(Math.max(12, rect.top + rect.height / 2 - height / 2), innerHeight - height - 28)
      Object.assign(overlay.style, {left: `${Math.max(8, left)}px`, top: `${Math.max(8, top)}px`})
      Object.assign($image.style, {width: `${width}px`, height: `${height}px`})
      overlay.append($image)
      document.body.append(overlay)
    })
    $image.addEventListener('error', () => { if (imagePreview === preview) hideImagePreview() })
    $image.src = getPreviewImageUrl(image.currentSrc || image.src)
  }, 180)
}

function interceptQuoteAndImagePreviews() {
  let keyboardFocus = false
  function previewClick(e) {
    if (!config.enabled || !config.quoteTweetPreview || e.defaultPrevented) return
    if (e.type == 'click' && e.button != 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
    if (e.type == 'keydown' && e.key != 'Enter' && e.key != ' ') return
    if (!(e.target instanceof Element) || !window.getSelection()?.isCollapsed) return
    let $quotesButton = /** @type {HTMLElement} */ (e.target.closest('button[data-cpft-quotes]'))
    let $quotesLink = /** @type {HTMLAnchorElement} */ (e.target.closest('a[href$="/quotes"]'))
    let quotesLinkMatch = $quotesLink?.pathname.match(URL_TWEET_BASE_RE)
    if ($quotesButton || quotesLinkMatch && e.type == 'click' && $quotesLink.target != '_blank') {
      if (e.type == 'keydown') return // Let native buttons synthesize their click.
      e.preventDefault()
      e.stopImmediatePropagation()
      $quoteReturnFocus = $quotesButton || $quotesLink
      openQuoteList($quotesButton ? {id: $quotesButton.dataset.tweetId, path: $quotesButton.dataset.path} : {id: quotesLinkMatch[2], path: $quotesLink.pathname.replace(/\/quotes$/, '')})
      return
    }
    let target = getQuotePreviewTarget(e.target)
    if (!target) return
    e.preventDefault()
    e.stopImmediatePropagation()
    $quoteReturnFocus = target.source
    openQuoteReader(target, {resolveQuote: target.resolveQuote})
  }
  document.addEventListener('click', previewClick, true)
  document.addEventListener('keydown', previewClick, true)
  document.addEventListener('pointerover', e => {
    lastPointerPosition = {x: e.clientX, y: e.clientY}
    if (!config.enabled || !config.hoverImagePreview || e.pointerType == 'touch' || e.buttons || !(e.target instanceof Element)) return
    let target = getHoverImage(e.target)
    if (target && target.source !== dismissedPreviewSource) showImagePreview(target.source, target.image)
  }, true)
  // A pointer that stays still over a photo gets no new pointerover if the
  // preview was cancelled, so moving over a photo without one retries it.
  let lastMoveCheck = 0
  document.addEventListener('pointermove', e => {
    lastPointerPosition = {x: e.clientX, y: e.clientY}
    if (imagePreview || !config.enabled || !config.hoverImagePreview || e.pointerType == 'touch' || e.buttons || !(e.target instanceof Element)) return
    if (e.timeStamp - lastMoveCheck < 150) return
    lastMoveCheck = e.timeStamp
    if (!e.target.closest('[data-testid="tweetPhoto"], .cpftInlineReplyMediaItem, .cpftReaderPhoto')) return
    let target = getHoverImage(e.target)
    if (target && target.source !== dismissedPreviewSource) showImagePreview(target.source, target.image)
  }, {capture: true, passive: true})
  document.addEventListener('pointerout', e => {
    let leaving = $source => !(e.relatedTarget instanceof Node) || !$source.contains(e.relatedTarget)
    if (dismissedPreviewSource && leaving(dismissedPreviewSource)) dismissedPreviewSource = null
    if (imagePreview && leaving(imagePreview.source)) hideImagePreview()
  }, true)
  document.addEventListener('pointerdown', () => {
    keyboardFocus = false
    if (imagePreview) dismissedPreviewSource = imagePreview.source
    hideImagePreview()
  }, true)
  document.addEventListener('focusin', e => {
    if (!keyboardFocus || !config.enabled || !config.hoverImagePreview || !(e.target instanceof Element)) return
    let $focused = e.target
    let target = getHoverImage(e.target)
    if (!target) return
    // Tab may scroll a tall photo into view immediately after focusin. Wait
    // until that scrolling settles so it doesn't cancel the keyboard preview.
    let raf = window.requestAnimationFrame || (callback => setTimeout(callback, 0))
    raf(() => raf(() => {
      if (keyboardFocus && config.enabled && config.hoverImagePreview && document.activeElement === $focused) showImagePreview(target.source, target.image)
    }))
  })
  document.addEventListener('focusout', e => {
    if (imagePreview && (!(e.relatedTarget instanceof Node) || !imagePreview.source.contains(e.relatedTarget))) hideImagePreview()
  })
  document.addEventListener('keydown', e => {
    if (e.key == 'Tab') keyboardFocus = true
    if (e.key != 'Escape') return
    keyboardFocus = false
    if (imagePreview) {
      dismissedPreviewSource = imagePreview.source
      hideImagePreview()
    }
    else if (quoteReaderState) {
      e.preventDefault()
      e.stopPropagation()
      closeQuoteReader()
    }
  })
  window.addEventListener('blur', hideImagePreview)
  document.addEventListener('visibilitychange', () => { if (document.hidden) hideImagePreview() })
  window.addEventListener('scroll', () => {
    // X makes small scroll adjustments while posts load, so a pending preview
    // stays as long as its photo is still under the pointer
    if (imagePreview && (imagePreview.overlay.isConnected || !isUnderPointer(imagePreview.source))) hideImagePreview()
    positionQuoteReader()
  }, true)
  window.addEventListener('resize', () => { hideImagePreview(); positionQuoteReader() })
  addTweetActionButtons(document)
}

function getQuoteAndImagePreviewCss() {
  return `
    #cpftQuoteReader, #cpftImagePreview {
      box-sizing: border-box;
      background: var(--cpft-background, #fff);
      border: 1px solid var(--cpft-border, #cfd9de);
      color: var(--cpft-text-primary, #0f1419);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body.LightsOut :is(#cpftQuoteReader, #cpftImagePreview) { background: var(--cpft-background, #000); }
    #cpftQuoteReader {
      position: fixed;
      z-index: 5;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 18px;
      box-shadow: 0 6px 32px rgb(0 0 0 / 12%);
      font-size: 1rem;
      line-height: 1.45;
      outline: none;
      animation: cpftReaderEnter 140ms ease-out;
    }
    #cpftQuoteReader:focus-visible { outline: 2px solid var(--cpft-theme, ${THEME_BLUE}); outline-offset: 2px; }
    .cpftQuoteReaderHeader {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 8px;
      min-height: 54px;
      padding: 4px 10px;
      border-bottom: 1px solid var(--cpft-border, #cfd9de);
    }
    .cpftQuoteReaderHeader h2 { flex: 1; font-size: 1rem; font-weight: 700; margin: 0; }
    #cpftQuoteReader button {
      font: inherit;
      color: var(--cpft-theme, ${THEME_BLUE});
      background: none;
      border: 0;
      cursor: pointer;
    }
    #cpftQuoteReader a { color: var(--cpft-theme, ${THEME_BLUE}); text-decoration: none; }
    #cpftQuoteReader a:hover { text-decoration: underline; }
    #cpftQuoteReader .cpftQuoteReaderHeader button {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      padding: 0;
      flex-shrink: 0;
      border-radius: 50%;
      color: var(--cpft-text-primary);
      font-size: 24px;
      line-height: 1;
    }
    #cpftQuoteReader .cpftQuoteReaderHeader button:hover { background: var(--cpft-hover-bg); }
    #cpftQuoteReader .cpftQuoteReaderHeader button svg { width: 20px; height: 20px; fill: currentColor; }
    #cpftQuoteReader button:disabled { opacity: 0.25; cursor: default; }
    #cpftQuoteReader :is(button, a):focus-visible { outline: 2px solid var(--cpft-theme, ${THEME_BLUE}); outline-offset: 2px; }
    .cpftQuoteListItem { border-bottom: 1px solid var(--cpft-border); cursor: pointer; }
    .cpftQuoteListItem:hover { background: var(--cpft-hover-bg); }
    #cpftQuoteReader .cpftReaderReadPost { padding: 0; font-size: 0.8667rem; margin-left: auto; }
    .cpftQuoteListFooter { padding: 20px 16px; color: var(--cpft-text-secondary); font-size: 0.8667rem; }
    .cpftReaderOpen { white-space: nowrap; font-size: 0.8667rem; }
    .cpftQuoteReaderBody {
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: var(--cpft-border) transparent;
      padding: 6px 0 12px;
    }
    #cpftQuoteReader .cpftInlineReplyTweet { padding: 12px; gap: 8px; border-radius: 0; }
    #cpftQuoteReader .cpftInlineReplyHeader { flex-wrap: wrap; white-space: normal; gap: 2px 4px; }
    #cpftQuoteReader .cpftInlineReplyHeader a { color: inherit; }
    #cpftQuoteReader .cpftInlineReplyHeader .cpftInlineReplyName { color: var(--cpft-text-primary); }
    #cpftQuoteReader .cpftInlineReplyText { margin-top: 5px; line-height: 1.45; }
    #cpftQuoteReader .cpftInlineReplyActions { margin-top: 10px; }
    #cpftQuoteReader .cpftInlineReply > .cpftReplies { margin-left: 27px; }
    #cpftQuoteReader .cpftReaderPost > .cpftInlineReplyTweet { cursor: default; }
    #cpftQuoteReader .cpftReaderPost > .cpftInlineReplyTweet:hover { background: transparent; }
    .cpftReaderSectionLabel { margin: 8px 12px 2px; color: var(--cpft-text-secondary); font-size: 0.8rem; }
    .cpftReaderAncestors { border-bottom: 1px solid var(--cpft-border); margin-bottom: 4px; }
    .cpftReaderAncestors > .cpftReaderPost { position: relative; }
    .cpftReaderAncestors > .cpftReaderPost::before {
      content: ''; position: absolute; top: 46px; bottom: 0; left: 27px;
      width: 2px; background: var(--cpft-border); pointer-events: none;
    }
    .cpftReaderFocus > .cpftReaderPost > .cpftInlineReplyTweet { padding-top: 16px; }
    .cpftReaderFocus > .cpftReaderPost > .cpftInlineReplyTweet > .cpftInlineReplyMain > .cpftInlineReplyText { font-size: 1.0667rem; }
    .cpftReaderMedia { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; position: relative; }
    .cpftReaderPhotoGrid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: minmax(0, 1fr); gap: 2px; aspect-ratio: 16 / 9;
      width: 100%; max-height: 280px; overflow: hidden;
      border-radius: 12px; border: 1px solid var(--cpft-border);
    }
    .cpftReaderPhotoGrid[data-photo-count="1"] { grid-template-columns: minmax(0, 1fr); }
    .cpftReaderPhotoGrid:not([data-photo-count="1"]):not([data-photo-count="2"]) { grid-template-rows: repeat(2, minmax(0, 1fr)); }
    .cpftReaderPhotoGrid[data-photo-count="3"] > :first-child { grid-row: span 2; }
    .cpftReaderPhoto { display: block; min-width: 0; min-height: 0; line-height: 0; overflow: hidden; }
    .cpftReaderPhoto img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .cpftReaderMedia video { display: block; width: 100%; max-height: 240px; border-radius: 12px; background: #000; }
    .cpftReaderMediaFallback { align-self: flex-start; font-size: 0.8rem; }
    .cpftReaderSensitive > :not(.cpftReaderReveal) { display: none; }
    #cpftQuoteReader .cpftReaderReveal {
      border: 1px solid var(--cpft-border); border-radius: 12px; padding: 20px 12px;
    }
    .cpftReaderEmbeddedQuote { border: 1px solid var(--cpft-border); border-radius: 12px; margin-top: 12px; overflow: hidden; }
    #cpftQuoteReader .cpftReaderEmbeddedQuote .cpftReaderEmbeddedQuote { margin-inline-start: -36px; }
    #cpftQuoteReader .cpftReaderEmbeddedQuote .cpftInlineReplyTweet { padding: 10px; }
    #cpftQuoteReader .cpftReaderContextLink { display: block; font-size: 0.8rem; padding: 10px 12px; text-align: start; }
    .cpftReaderNote { color: var(--cpft-text-secondary); font-size: 0.8667rem; }
    .cpftReaderLoading, .cpftReaderEmpty { padding: 20px 16px; color: var(--cpft-text-secondary); }
    .cpftReaderEmpty p { margin: 0 0 12px; }
    .cpftReaderSkeleton {
      margin: 0 16px 24px; height: 120px; border-radius: 12px;
      background: linear-gradient(100deg, var(--cpft-hover-bg) 35%, var(--cpft-border) 50%, var(--cpft-hover-bg) 65%);
      background-size: 250% 100%; animation: cpftReaderLoading 1.4s infinite;
    }
    #cpftImagePreview {
      position: fixed; z-index: 10001; padding: 8px; border-radius: 14px;
      pointer-events: none; box-shadow: 0 12px 48px rgb(0 0 0 / 35%);
      animation: cpftReaderEnter 100ms ease-out;
    }
    #cpftImagePreview img { display: block; object-fit: contain; border-radius: 7px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); }
    @keyframes cpftReaderEnter { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes cpftReaderLoading { to { background-position: -250% 0; } }
    @media (prefers-reduced-motion: reduce) { #cpftQuoteReader, #cpftImagePreview, .cpftReaderSkeleton { animation: none; } }
  `
}
//#endregion

//#region Ask about this post
const ASK_TIMEOUT_MS = 200_000
const ASK_HELPER_HINT = 'Run npm run ask-helper:install in the extension folder, then reload the extension.'
const ASK_ICON_PATH = 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2v-2zm1-10c-2.2 0-4 1.6-4 3.6h2c0-.9.9-1.6 2-1.6s2 .7 2 1.6c0 .7-.4 1-1.2 1.6-.9.6-1.8 1.4-1.8 2.8v.5h2v-.4c0-.6.4-1 1.2-1.6.9-.7 1.8-1.4 1.8-2.9C16 6.6 14.2 5 12 5z'
const QUOTE_ICON_PATH = 'M4 11.5C4 8.46 6.46 6 9.5 6h.5v2h-.5A3.5 3.5 0 0 0 6 11.5v.5h4v6H4v-6.5zm10 0C14 8.46 16.46 6 19.5 6h.5v2h-.5a3.5 3.5 0 0 0-3.5 3.5v.5h4v6h-6v-6.5z'
const CLOSE_ICON_PATH = 'M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z'
const BACK_ICON_PATH = 'M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z'
const LIKE_ICON_PATH = 'M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z'
const LIKED_ICON_PATH = 'M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z'
const REPLY_ICON_PATH = 'M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z'

/**
 * Questions and answers about each post, by post id.
 * @type {Map<string, import("./types").AskThread>}
 */
let askThreads = new Map()

/**
 * Ids of posts whose answer panel is open.
 * @type {Set<string>}
 */
let openAskPanels = new Set()

/**
 * Posts whose answer shows in the reader beside the timeline rather than
 * below the post, so you can keep scrolling while it loads.
 * @type {Set<string>}
 */
let askPanelsInReader = new Set()

/** @type {Map<string, {resolve: (value: any) => void, reject: (reason: any) => void, timeout: ReturnType<typeof setTimeout>}>} */
let pendingAskRequests = new Map()
let askRequestCount = 0

// The content script relays requests to the extension's background page, which
// calls the AI provider chosen in the options, and posts its response back.
window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.type != 'cpftAskResponse') return
  let pending = pendingAskRequests.get(e.data.requestId)
  if (!pending) return
  pendingAskRequests.delete(e.data.requestId)
  clearTimeout(pending.timeout)
  if (e.data.error) pending.reject(new Error(e.data.error))
  else pending.resolve(e.data)
})

/**
 * @param {{context: any, history: {question: ?string, answer: string}[], question: ?string, deep: boolean}} request
 * @returns {Promise<{answer: string, model?: string, elapsedMs?: number}>}
 */
function requestAskAnswer(request) {
  return new Promise((resolve, reject) => {
    let requestId = `${Date.now()}-${++askRequestCount}`
    let timeout = setTimeout(() => {
      pendingAskRequests.delete(requestId)
      reject(new Error('No answer from the AI provider. Check the extension\'s AI options.'))
    }, ASK_TIMEOUT_MS)
    pendingAskRequests.set(requestId, {resolve, reject, timeout})
    window.postMessage({type: 'cpftAskRequest', requestId, request}, location.origin)
  })
}

/** @param {string} d */
function createSvgIcon(d) {
  let ns = 'http://www.w3.org/2000/svg'
  let $svg = document.createElementNS(ns, 'svg')
  $svg.setAttribute('viewBox', '0 0 24 24')
  $svg.setAttribute('aria-hidden', 'true')
  let $path = document.createElementNS(ns, 'path')
  $path.setAttribute('d', d)
  $path.setAttribute('fill-rule', 'evenodd')
  $svg.append($path)
  return $svg
}

/**
 * The post details the ask helper sends to Codex, with links expanded.
 * @param {import("./types").InlineReply} tweet
 * @param {number} [depth]
 * @returns {import("./types").AskPost}
 */
function getAskPost(tweet, depth = 0) {
  let chars = Array.from(tweet.text)
  let [start, end] = tweet.displayTextRange || [0, chars.length]
  let text = chars.slice(start, end).join('')
  for (let url of tweet.entities?.urls || []) {
    if (url.url && url.expanded_url) text = text.split(url.url).join(url.expanded_url)
  }
  for (let media of tweet.entities?.media || []) {
    if (media.url) text = text.split(media.url).join('')
  }
  let translation = inlineReplyTranslations.get(tweet.id)
  return {
    url: `https://x.com${tweet.path}`,
    author: `${tweet.name} (@${tweet.screenName})`,
    createdAt: Number.isNaN(tweet.createdAt.getTime()) ? null : tweet.createdAt.toISOString(),
    lang: tweet.lang,
    ...(tweet.inReplyToScreenName && {replyingTo: `@${tweet.inReplyToScreenName}`}),
    text: unescapeTweetText(text).trim(),
    ...(translation?.status == 'loaded' && {translation: translation.text}),
    ...(tweet.card && {card: tweet.card}),
    media: tweet.media.map(media => {
      // The smallest video is plenty for sampling a few frames
      let [video] = (media.video_info?.variants || [])
        .filter(variant => variant.content_type == 'video/mp4')
        .sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0))
      return {
        type: media.type,
        imageUrl: media.media_url_https,
        ...(video && {videoUrl: video.url, durationMs: media.video_info?.duration_millis}),
        ...(media.ext_alt_text && {alt: media.ext_alt_text}),
      }
    }),
    ...(tweet.quoted && depth < 2 && {quoted: getAskPost(tweet.quoted, depth + 1)}),
  }
}

/**
 * Asks what a post is about, or a follow-up question about it.
 * @param {string} tweetId
 * @param {{question?: ?string, deep?: boolean, replaceLast?: boolean}} [options] `deep` uses
 *   the stronger model, and `replaceLast` asks the latest question again instead of adding one
 */
async function askAboutPost(tweetId, {question = null, deep = false, replaceLast = false} = {}) {
  let thread = askThreads.get(tweetId)
  if (!thread || !question && !replaceLast) {
    // A new thread keeps the post's context, so asking again doesn't reload it
    thread = {context: thread?.context, turns: []}
    askThreads.set(tweetId, thread)
  }
  if (replaceLast && thread.turns.length > 0) question = thread.turns.pop().question
  /** @type {import("./types").AskTurn} */
  let turn = {question, status: 'loading', deep}
  thread.turns.push(turn)
  renderAskPanels(tweetId)
  try {
    if (!thread.context) {
      let {tweet, ancestors, replies} = await getQuoteConversation(tweetId, new AbortController().signal)
      thread.context = {
        post: getAskPost(tweet),
        ancestors: ancestors.slice(-6).map(ancestor => getAskPost(ancestor)),
        replies: replies.slice(0, 10).map(reply => ({author: `${reply.name} (@${reply.screenName})`, text: getAskPost(reply).text})),
      }
    }
    let history = thread.turns
      .filter(earlier => earlier !== turn && earlier.status == 'loaded')
      .map(earlier => ({question: earlier.question, answer: earlier.answer}))
    let result = await requestAskAnswer({context: thread.context, history, question, deep})
    if (askThreads.get(tweetId) !== thread || !thread.turns.includes(turn)) return
    Object.assign(turn, {status: 'loaded', answer: String(result.answer || ''), model: result.model, elapsedMs: result.elapsedMs})
    log('ask: answered', tweetId, `${result.elapsedMs}ms`)
  } catch (e) {
    if (askThreads.get(tweetId) !== thread || !thread.turns.includes(turn)) return
    error('ask: error asking about', tweetId, e)
    let message = String(e?.message || e)
    // Keep the browser's own error, as several different problems mention the host
    if (/native messaging host/i.test(message)) message = `Couldn't start the ask helper (${message}). ${ASK_HELPER_HINT}`
    Object.assign(turn, {status: 'error', error: message})
  }
  renderAskPanels(tweetId)
}

/**
 * @param {string} tweetId
 * @param {string} path
 * @param {{inReader?: boolean}} [options] show the post and its answer in the
 *   reader beside the timeline, instead of below the post
 */
function toggleAskPanel(tweetId, path, {inReader = false} = {}) {
  let isShowing = openAskPanels.has(tweetId) && (!inReader || quoteReaderState?.id == tweetId)
  if (isShowing) {
    openAskPanels.delete(tweetId)
    askPanelsInReader.delete(tweetId)
    if (inReader) closeQuoteReader()
    renderAskPanels(tweetId)
    return
  }
  openAskPanels.add(tweetId)
  if (inReader) {
    askPanelsInReader.add(tweetId)
    openQuoteReader({id: tweetId, path}, {title: 'What\'s this about?'})
  } else {
    askPanelsInReader.delete(tweetId)
  }
  let thread = askThreads.get(tweetId)
  if (!thread || thread.turns.length == 0 || thread.turns[thread.turns.length - 1].status == 'error') {
    askAboutPost(tweetId, {replaceLast: Boolean(thread?.turns.length)})
  } else {
    renderAskPanels(tweetId)
  }
}

/**
 * @param {string} tweetId
 * @param {string} path
 */
function createAskButton(tweetId, path) {
  let isOpen = openAskPanels.has(tweetId)
  return createEl('button', {
    type: 'button',
    className: `cpftAskButton${isOpen ? ' cpftActive' : ''}`,
    'aria-label': 'Ask what this tweet is about',
    'aria-expanded': String(isOpen),
    title: 'Ask what this tweet is about',
    dataset: {cpftAsk: 'true', tweetId, path},
  }, createSvgIcon(ASK_ICON_PATH))
}

/**
 * Renders inline markdown from an answer: links, bold, italics and code.
 * @param {string} text
 */
function renderAskInline(text) {
  let $fragment = document.createDocumentFragment()
  let pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|`([^`]+)`|(https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"])/g
  let pos = 0
  for (let match of text.matchAll(pattern)) {
    $fragment.append(text.slice(pos, match.index))
    if (match[1]) {
      $fragment.append(createEl('a', {href: match[2], target: '_blank', rel: 'noopener noreferrer'}, match[1]))
    } else if (match[3]) {
      $fragment.append(createEl('strong', {}, match[3]))
    } else if (match[4]) {
      $fragment.append(createEl('em', {}, match[4]))
    } else if (match[5]) {
      $fragment.append(createEl('code', {}, match[5]))
    } else {
      $fragment.append(createEl('a', {href: match[6], target: '_blank', rel: 'noopener noreferrer'}, match[6]))
    }
    pos = match.index + match[0].length
  }
  $fragment.append(text.slice(pos))
  return $fragment
}

/** @param {string} answer */
function renderAskAnswer(answer) {
  let $answer = createEl('div', {className: 'cpftAskAnswer', dir: 'auto'})
  let $list = null
  for (let line of answer.split(/\r?\n/)) {
    let item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/)
    let heading = line.match(/^#{1,6}\s+(.*)$/)
    if (item) {
      if (!$list) $answer.append($list = createEl('ul'))
      $list.append(createEl('li', {}, renderAskInline(item[1])))
      continue
    }
    $list = null
    if (heading) {
      $answer.append(createEl('p', {}, createEl('strong', {}, renderAskInline(heading[1]))))
    } else if (line.trim()) {
      $answer.append(createEl('p', {}, renderAskInline(line.trim())))
    }
  }
  return $answer
}

/** @param {string} tweetId */
function createAskPanel(tweetId) {
  if (!openAskPanels.has(tweetId)) return null
  let turns = askThreads.get(tweetId)?.turns || []
  let last = turns[turns.length - 1]
  let $panel = createEl('div', {className: 'cpftAskPanel', dataset: {tweetId}},
    createEl('div', {className: 'cpftAskHeader'},
      createSvgIcon(ASK_ICON_PATH),
      createEl('span', {className: 'cpftAskTitle'}, 'What\'s this about?'),
      last?.status == 'loaded' && !last.deep && createEl('button', {
        type: 'button',
        title: 'Ask this again with a stronger, slower model',
        dataset: {askAction: 'deeper', tweetId},
      }, 'Think harder'),
      last?.status == 'loaded' && createEl('button', {type: 'button', dataset: {askAction: 'retry', tweetId}}, 'Ask again'),
      createEl('button', {type: 'button', className: 'cpftAskClose', 'aria-label': 'Close', title: 'Close', dataset: {askAction: 'close', tweetId}}, createSvgIcon(CLOSE_ICON_PATH)),
    ),
  )
  for (let turn of turns) {
    if (turn.question) {
      $panel.append(createEl('p', {className: 'cpftAskQuestion', dir: 'auto'}, turn.question))
    }
    if (turn.status == 'loading') {
      $panel.append(createEl('div', {className: 'cpftAskStatus', role: 'status'}, turn.deep
        ? 'Thinking harder… this can take 20–40 seconds.'
        : turn.question ? 'Thinking…' : 'Looking into this tweet… this usually takes 10–30 seconds.'))
    } else if (turn.status == 'error') {
      $panel.append(createEl('div', {className: 'cpftAskStatus', role: 'status'},
        `${turn.error} `,
        turn === last && createEl('button', {type: 'button', dataset: {askAction: 'retry', tweetId}}, 'Try again'),
      ))
    } else {
      $panel.append(
        renderAskAnswer(turn.answer),
        turn.model && createEl('div', {className: 'cpftAskMeta'}, [turn.model, turn.elapsedMs && `${Math.round(turn.elapsedMs / 1000)}s`].filter(Boolean).join(' · ')),
      )
    }
  }
  if (last?.status == 'loaded') {
    let $input = createEl('input', {type: 'text', name: 'question', placeholder: 'Ask a follow-up…', 'aria-label': 'Ask a follow-up question', autocomplete: 'off', dir: 'auto'})
    // Keep typing away from Twitter's own keyboard shortcuts
    $input.addEventListener('keydown', e => e.stopPropagation())
    $panel.append(createEl('form', {className: 'cpftAskFollowUp', dataset: {tweetId}},
      $input,
      createEl('button', {type: 'submit'}, 'Ask'),
    ))
  }
  return $panel
}

/**
 * Gets the action bar of a native tweet, not of a post it quotes.
 * @param {Element} $tweet
 */
function getTweetActionBar($tweet) {
  return /** @type {HTMLElement} */ ($tweet.querySelector('[data-testid="reply"]')?.closest('[role="group"]'))
}

/**
 * Puts a native tweet's answer panel below its action bar, or removes it.
 * @param {Element} $tweet
 * @param {string} tweetId
 */
function syncNativeAskPanel($tweet, tweetId) {
  let $group = getTweetActionBar($tweet)
  let $existing = $tweet.querySelector(`.cpftAskPanel[data-tweet-id="${tweetId}"]`)
  // An answer shown in the reader doesn't also go below the post
  let $panel = config.askAboutPosts && !askPanelsInReader.has(tweetId) ? createAskPanel(tweetId) : null
  if ($panel) {
    $panel.style.fontFamily = getComputedStyle($tweet.querySelector('[data-testid="tweetText"]') || $tweet).fontFamily
  }
  if ($existing) {
    if ($panel) $existing.replaceWith($panel)
    else $existing.remove()
  } else if ($panel && $group) {
    $group.after($panel)
  }
  for (let $button of $tweet.querySelectorAll(`.cpftAskButton[data-tweet-id="${tweetId}"]`)) {
    $button.classList.toggle('cpftActive', openAskPanels.has(tweetId))
    $button.setAttribute('aria-expanded', String(openAskPanels.has(tweetId)))
  }
}

/** @param {string} tweetId */
function renderAskPanels(tweetId) {
  updateInlineReplyCards(tweetId)
  for (let $tweet of document.querySelectorAll(Selectors.TWEET)) {
    if (getTweetPermalink($tweet)?.id == tweetId) syncNativeAskPanel($tweet, tweetId)
  }
}

/**
 * Adds Quotes and "Ask about this tweet" buttons to native tweets' action bars,
 * and puts back open answer panels when Twitter re-renders a tweet.
 * @param {ParentNode} root
 */
function addTweetActionButtons(root) {
  if (!config.enabled) return
  for (let $tweet of root.querySelectorAll(Selectors.TWEET)) {
    let permalink = getTweetPermalink($tweet)
    let $group = getTweetActionBar($tweet)
    let $existing = /** @type {HTMLElement} */ ($tweet.querySelector('.cpftTweetExtraActions'))
    let quoteCount = permalink && config.quoteTweetPreview ? getTweetInfo(permalink.id)?.quote_count || 0 : 0
    let showAsk = Boolean(permalink && config.askAboutPosts)
    if (!permalink || !$group || quoteCount <= 0 && !showAsk) {
      $existing?.remove()
      continue
    }
    let key = [permalink.id, quoteCount, config.hideQuoteTweetMetrics, showAsk].join(':')
    if ($existing?.dataset.key != key || $existing.parentElement !== $group) {
      $existing?.remove()
      $existing = createEl('div', {className: 'cpftTweetExtraActions', dataset: {key}},
        quoteCount > 0 && createEl('button', {
          type: 'button',
          className: 'cpftTweetAction',
          'aria-label': `${quoteCount} Quote Tweets. View Quote Tweets`,
          title: 'View Quote Tweets',
          dataset: {cpftQuotes: 'true', tweetId: permalink.id, path: permalink.path},
        },
          createSvgIcon(QUOTE_ICON_PATH),
          !config.hideQuoteTweetMetrics && createEl('span', {}, formatInlineReplyCount(quoteCount)),
        ),
        showAsk && createAskButton(permalink.id, permalink.path),
      )
      // Before the bookmark and share buttons
      $group.insertBefore($existing, $group.lastElementChild)
    }
    if (showAsk && (openAskPanels.has(permalink.id) || $tweet.querySelector('.cpftAskPanel'))) {
      syncNativeAskPanel($tweet, permalink.id)
    }
  }
}

/** @param {HTMLElement} $ask */
function onAskButton($ask) {
  let {tweetId, path} = $ask.dataset
  // Timeline posts show their answer in the reader beside the timeline, so you
  // can keep scrolling while it loads. Replies and reader posts answer in place.
  let isTimelinePost = Boolean($ask.closest('.cpftTweetExtraActions'))
  toggleAskPanel(tweetId, path, {inReader: isTimelinePost && config.askOpenInReader && config.quoteTweetPreview})
}

function interceptAskClicks() {
  document.addEventListener('click', (e) => {
    if (!config.enabled || !(e.target instanceof Element)) return
    let $ask = /** @type {HTMLElement} */ (e.target.closest('button[data-cpft-ask]'))
    if ($ask) {
      e.preventDefault()
      e.stopImmediatePropagation()
      if (config.askAboutPosts) onAskButton($ask)
      return
    }
    let $panel = e.target.closest('.cpftAskPanel')
    if (!$panel) return
    // Keep clicks in the answer from opening the post or toggling replies.
    // Links still open, in a new tab.
    e.stopImmediatePropagation()
    let $button = /** @type {HTMLElement} */ (e.target.closest('button[data-ask-action]'))
    if (!$button) return
    e.preventDefault()
    let {askAction, tweetId} = $button.dataset
    let turns = askThreads.get(tweetId)?.turns || []
    let last = turns[turns.length - 1]
    if (askAction == 'close') {
      openAskPanels.delete(tweetId)
      askPanelsInReader.delete(tweetId)
      renderAskPanels(tweetId)
    } else if (askAction == 'retry') {
      // Retry a failed question, or start over
      if (last?.status == 'error') askAboutPost(tweetId, {replaceLast: true, deep: last.deep})
      else askAboutPost(tweetId)
    } else if (askAction == 'deeper') {
      askAboutPost(tweetId, {replaceLast: true, deep: true})
    }
  }, true)
  document.addEventListener('submit', (e) => {
    let $form = e.target instanceof HTMLFormElement && e.target.matches('.cpftAskFollowUp') ? e.target : null
    if (!$form) return
    e.preventDefault()
    e.stopImmediatePropagation()
    let question = /** @type {HTMLInputElement} */ ($form.elements.namedItem('question')).value.trim()
    if (question) askAboutPost($form.dataset.tweetId, {question})
  }, true)
}

function removeAskPanels() {
  openAskPanels.clear()
  askPanelsInReader.clear()
  document.querySelectorAll('.cpftAskPanel').forEach($el => $el.remove())
  document.querySelectorAll('.cpftAskButton.cpftActive').forEach($el => $el.classList.remove('cpftActive'))
}
//#endregion

//#region Keyboard shortcuts
/**
 * Shortcuts for posts and inline replies. These avoid Twitter's own keys (j, k,
 * l, r, t, s, b, o, n, Enter...), which keep working on native posts.
 */
function interceptKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (!config.enabled || !config.keyboardShortcuts || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
    if (!(e.target instanceof Element)) return
    if (e.target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return
    let $card = /** @type {HTMLElement} */ (e.target.closest('.cpftInlineReply'))
    let handled = $card ? onInlineReplyKey(e, $card) : onTimelinePostKey(e)
    if (handled) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
  }, true)
}

/**
 * @param {KeyboardEvent} e
 * @returns {boolean} whether the key was handled
 */
function onTimelinePostKey(e) {
  let $tweet = e.target instanceof Element ? e.target.closest(Selectors.TWEET) : null
  if (!$tweet || !$tweet.closest(Selectors.TIMELINE) || e.shiftKey) return false
  let permalink = getTweetPermalink($tweet)
  if (!permalink) return false
  if (e.key == 'e' && config.inlineReplies && !isFocalTweet(permalink)) {
    toggleTimelineInlineReplies($tweet, permalink)
    return true
  }
  if (e.key == 'a' && config.askAboutPosts) {
    let $ask = /** @type {HTMLElement} */ ($tweet.querySelector('.cpftTweetExtraActions button[data-cpft-ask]'))
    if ($ask) onAskButton($ask)
    else toggleAskPanel(permalink.id, permalink.path)
    return true
  }
  if (e.key == 'q' && config.quoteTweetPreview) {
    let $quote = $tweet.querySelector('div[role="link"] [data-testid="User-Name"]')
    let target = $quote && getQuotePreviewTarget($quote)
    if (!target) return false
    openQuoteReader(target, {resolveQuote: target.resolveQuote})
    return true
  }
  return false
}

/**
 * @param {KeyboardEvent} e
 * @param {HTMLElement} $card
 * @returns {boolean} whether the key was handled
 */
function onInlineReplyKey(e, $card) {
  let replyId = $card.dataset.tweetId
  let reply = inlineReplyTweets.get(replyId)
  if (!reply) return false
  let key = e.shiftKey ? e.key.toUpperCase() : e.key
  if ((key == 'Enter' || key == 'e') && $card.classList.contains('cpftHasReplies')) {
    toggleInlineReplyReplies($card)
    focusInlineReply(replyId)
  } else if (key == 'j' || key == 'k') {
    // Move between replies in reading order, including nested ones
    let $cards = Array.from(document.querySelectorAll('.cpftInlineReplyTweet[tabindex]'))
      .filter($el => /** @type {HTMLElement} */ ($el).offsetParent != null)
    let index = $cards.indexOf($card.querySelector(':scope > .cpftInlineReplyTweet'))
    let $next = /** @type {HTMLElement} */ ($cards[index + (key == 'j' ? 1 : -1)])
    if (!$next) return false
    $next.focus()
    $next.scrollIntoView({block: 'nearest'})
  } else if (key == 'l' && config.inlineReplyActions) {
    toggleInlineReplyLike(replyId)
    focusInlineReply(replyId)
  } else if (key == 'r' && config.inlineReplyActions) {
    replyToInlineReply(replyId)
  } else if (key == 'a' && config.askAboutPosts) {
    toggleAskPanel(replyId, reply.path)
    focusInlineReply(replyId)
  } else if (key == 'o') {
    History_push?.({pathname: reply.path, hash: '', query: {}, search: ''})
  } else if (key == 'Escape') {
    // Back to the timeline post these replies belong to
    let $tweet = /** @type {HTMLElement} */ ($card.closest('.cpftRepliesRoot')?.previousElementSibling)
    if (!$tweet) return false
    $tweet.focus()
  } else {
    return false
  }
  return true
}

/**
 * Cards are replaced when they change, so focus the new one.
 * @param {string} replyId
 */
function focusInlineReply(replyId) {
  /** @type {HTMLElement} */ (document.querySelector(`.cpftInlineReply[data-tweet-id="${replyId}"] > .cpftInlineReplyTweet`))?.focus({preventScroll: true})
}

//#endregion

//#region CSS
const configureCss = (() => {
  let $style

  return function configureCss() {
    if (!config.enabled) {
      log('removing main stylesheet')
      $style?.remove()
      $style = null
      return
    }

    let cssRules = [`
      .cpft_font_family, .cpft_text {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .cpft_separator {
        padding: 0 4px;
      }
      .cpft_text {
        color: var(--cpft-text-secondary);
      }
    `]
    let hideCssSelectors = [
      '.HiddenTweet',
      '.HiddenTweet + [role="separator"]',
      '.HiddenAd',
      // Hide promoted trends
      `[data-testid="trend"]:has(path[d="${Svgs.PROMOTED_PATH}"])`,
    ]
    let menuRole = `[role="${desktop ? 'menu' : 'dialog'}"]`

    // Theme colours for custom UI items
    cssRules.push(`
      body.Default {
        --cpft-active-bg: rgb(239, 243, 244);
        --cpft-border: rgb(239, 243, 244);
        --cpft-hover-bg: rgb(247, 249, 249);
        --cpft-menu-hover-bg: rgba(0, 0, 0, 0.03);
        --cpft-tab-hover-backdrop: rgba(15, 20, 25, 0.1);
        --cpft-text-primary: rgb(15, 20, 25);
        --cpft-text-secondary: rgb(83, 100, 113);
      }
      body.LightsOut {
        --cpft-active-bg: rgb(32, 35, 39);
        --cpft-border: rgb(47, 51, 54);
        --cpft-hover-bg: rgb(22, 24, 28);
        --cpft-menu-hover-bg: rgba(255, 255, 255, 0.03);
        --cpft-tab-hover-backdrop: rgba(231, 233, 234, 0.1);
        --cpft-text-primary: rgb(231, 233, 234);
        --cpft-text-secondary: rgb(113, 118, 123);
      }
      .cpft_menu_item, .cpft_menu_item a {
        background-color: transparent !important;
      }
      .cpft_menu_item:hover {
        background-color: var(--cpft-menu-hover-bg) !important;
        /* The nav menu is still using the old color */
        &:has(> a[href="/settings/add_muted_keyword"]) {
          background-color: var(--cpft-hover-bg) !important;
        }
      }
    `)

    if (config.quoteTweetPreview || config.hoverImagePreview) cssRules.push(getQuoteAndImagePreviewCss())
    if (config.quoteTweetPreview || config.askAboutPosts) {
      cssRules.push(`
        /* Quotes and Ask buttons join the tweet's own action bar */
        .cpftTweetExtraActions {
          display: contents;
        }
        :is(.cpftTweetAction, .cpftTweetExtraActions .cpftAskButton) {
          align-items: center;
          background: none;
          border: none;
          color: var(--cpft-text-secondary, rgb(113, 118, 123));
          cursor: pointer;
          display: flex;
          font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
          gap: 4px;
          min-height: 34px;
          padding: 0;
        }
        .cpftTweetAction {
          flex: 1 1 0;
        }
        .cpftTweetExtraActions .cpftAskButton {
          flex: 0 0 auto;
          margin-right: 12px;
        }
        :is(.cpftTweetAction, .cpftTweetExtraActions .cpftAskButton) svg {
          border-radius: 9999px;
          box-sizing: content-box;
          fill: currentColor;
          height: 18.75px;
          margin: -8px;
          padding: 8px;
          width: 18.75px;
        }
        :is(.cpftTweetAction, .cpftAskButton):is(:hover, :focus-visible, .cpftActive) {
          color: var(--cpft-theme, ${THEME_BLUE});
        }
        :is(.cpftTweetAction, .cpftTweetExtraActions .cpftAskButton):hover svg {
          background-color: rgb(29 155 240 / 10%);
        }
        .cpftTweetAction span {
          margin-left: 4px;
        }
        .cpftInlineReplyActions .cpftAskButton {
          color: var(--cpft-replies-secondary, rgb(113, 118, 123));
          display: inline-flex;
        }
        .cpftInlineReplyActions .cpftAskButton svg {
          fill: currentColor;
          height: 16px;
          width: 16px;
        }
        .cpftAskPanel {
          border: 1px solid var(--cpft-border, rgba(128, 128, 128, 0.3));
          border-radius: 12px;
          color: var(--cpft-text-primary, inherit);
          cursor: auto;
          font-size: 0.9333rem;
          line-height: 1.4;
          margin: 4px 0 12px;
          padding: 10px 12px 12px;
          white-space: normal;
        }
        .cpftAskHeader {
          align-items: center;
          color: var(--cpft-text-secondary, rgb(113, 118, 123));
          display: flex;
          font-size: 0.8667rem;
          gap: 8px;
          margin-bottom: 6px;
        }
        .cpftAskHeader svg {
          fill: var(--cpft-theme, ${THEME_BLUE});
          flex-shrink: 0;
          height: 16px;
          width: 16px;
        }
        .cpftAskTitle {
          flex: 1;
          font-weight: 700;
        }
        :is(.cpftAskHeader, .cpftAskStatus) button {
          background: none;
          border: none;
          color: var(--cpft-theme, ${THEME_BLUE});
          cursor: pointer;
          font: inherit;
          padding: 0;
        }
        :is(.cpftAskHeader, .cpftAskStatus) button:hover {
          text-decoration: underline;
        }
        .cpftAskHeader .cpftAskClose {
          border-radius: 9999px;
          color: var(--cpft-text-secondary, rgb(113, 118, 123));
          display: grid;
          height: 28px;
          margin: -4px -6px -4px 0;
          place-items: center;
          width: 28px;
        }
        .cpftAskHeader .cpftAskClose:hover {
          background-color: var(--cpft-hover-bg, rgba(128, 128, 128, 0.1));
          text-decoration: none;
        }
        .cpftAskHeader .cpftAskClose svg {
          fill: currentColor;
          height: 18px;
          width: 18px;
        }
        .cpftAskQuestion {
          border-top: 1px solid var(--cpft-border, rgba(128, 128, 128, 0.3));
          font-weight: 700;
          margin: 10px 0 6px;
          padding-top: 10px;
        }
        .cpftAskMeta {
          color: var(--cpft-text-secondary, rgb(113, 118, 123));
          font-size: 0.8rem;
          margin-top: 4px;
        }
        .cpftAskFollowUp {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
        .cpftAskFollowUp input {
          background: transparent;
          border: 1px solid var(--cpft-border, rgba(128, 128, 128, 0.3));
          border-radius: 9999px;
          color: inherit;
          flex: 1;
          font: inherit;
          min-width: 0;
          padding: 6px 12px;
        }
        .cpftAskFollowUp input:focus {
          border-color: var(--cpft-theme, ${THEME_BLUE});
          outline: none;
        }
        .cpftAskFollowUp button {
          background-color: var(--cpft-theme, ${THEME_BLUE});
          border: none;
          border-radius: 9999px;
          color: white;
          cursor: pointer;
          font: inherit;
          font-weight: 700;
          padding: 6px 14px;
        }
        .cpftAskStatus {
          color: var(--cpft-text-secondary, rgb(113, 118, 123));
        }
        .cpftAskAnswer :is(p, ul) {
          margin: 0 0 8px;
        }
        .cpftAskAnswer ul {
          padding-left: 20px;
        }
        .cpftAskAnswer li {
          margin: 2px 0;
        }
        .cpftAskAnswer > :last-child {
          margin-bottom: 0;
        }
        .cpftAskAnswer a {
          color: var(--cpft-theme, ${THEME_BLUE});
          overflow-wrap: anywhere;
          text-decoration: none;
        }
        .cpftAskAnswer a:hover {
          text-decoration: underline;
        }
        .cpftAskAnswer code {
          background-color: var(--cpft-hover-bg, rgba(128, 128, 128, 0.1));
          border-radius: 4px;
          font-size: 0.9em;
          padding: 0 3px;
        }
      `)
    }

    if (desktop && config.compactNavigation) {
      cssRules.push(`
        @media (min-width: 1265px) {
          header[role="banner"] > div,
          header[role="banner"] > div > div,
          header[role="banner"] > div > div > div {
            width: 224px !important; max-width: 224px !important;
            box-sizing: border-box; transition: none !important;
          }
          header[role="banner"] nav > :is(a, button) > div { padding: 10px; }
          header[role="banner"] nav > :is(a, button) > div > div:last-child { font-size: 18px; }
          [data-testid="SideNav_NewTweet_Button"] { min-width: 0 !important; width: calc(100% - 20px) !important; }
        }
      `)
    }
    if (desktop && config.quoteTweetPreview && !config.fullWidthContent) {
      cssRules.push(`
        @media (min-width: 1265px) {
          body { --cpft-reader-sidebar-width: clamp(320px, calc(100vw - ${config.compactNavigation ? 884 : 935}px), 440px); }
          body.Sidebar main[role="main"] > div {
            width: calc(628px + var(--cpft-reader-sidebar-width)) !important;
            justify-content: flex-start !important; column-gap: 28px;
          }
          ${Selectors.SIDEBAR} {
            width: var(--cpft-reader-sidebar-width) !important;
            margin-left: 0 !important; margin-right: 0 !important;
          }
          ${Selectors.SIDEBAR} > div > div:has(.SidebarContents),
          ${Selectors.SIDEBAR} .SidebarContents,
          ${Selectors.SIDEBAR} .SidebarContents > div:has(form[role="search"]) {
            width: var(--cpft-reader-sidebar-width) !important;
            max-width: var(--cpft-reader-sidebar-width) !important;
          }
        }
      `)
    }

    if (config.inlineReplies || config.quoteTweetPreview) {
      cssRules.push(`
        .cpftReplies {
          --cpft-replies-line: var(--cpft-border, rgba(128, 128, 128, 0.3));
          --cpft-replies-primary: var(--cpft-text-primary, inherit);
          --cpft-replies-secondary: var(--cpft-text-secondary, rgb(113, 118, 123));
          --cpft-replies-link: var(--cpft-theme, ${THEME_BLUE});
          border-left: 2px solid var(--cpft-replies-line);
          color: var(--cpft-replies-primary);
          font-size: 1rem;
          line-height: 1.3333;
        }
        /* Line up with the centre of the parent tweet's avatar */
        .cpftRepliesRoot {
          margin: 0 16px 12px 35px;
        }
        .cpftInlineReply > .cpftReplies {
          margin-left: 27px;
        }
        .cpftInlineReply.cpftHasReplies > .cpftInlineReplyTweet {
          cursor: pointer;
        }
        .cpftInlineReply.cpftHasReplies > .cpftInlineReplyTweet:hover {
          background-color: var(--cpft-hover-bg, rgba(128, 128, 128, 0.08));
        }
        .cpftInlineReplyTweet {
          border-radius: 0 12px 12px 0;
          display: flex;
          gap: 8px;
          padding: 8px 8px 8px 12px;
        }
        .cpftInlineReplyAvatar {
          /* Only the picture opens the profile, not the empty column under it */
          align-self: flex-start;
          flex-shrink: 0;
        }
        .cpftInlineReplyAvatar img {
          border-radius: 9999px;
          display: block;
          height: 32px;
          width: 32px;
        }
        .cpftInlineReplyMain {
          flex: 1;
          min-width: 0;
        }
        .cpftInlineReplyHeader {
          align-items: baseline;
          color: var(--cpft-replies-secondary);
          display: flex;
          font-size: 0.9333rem;
          gap: 4px;
          overflow: hidden;
          white-space: nowrap;
        }
        .cpftInlineReplyHeader a {
          color: inherit;
          text-decoration: none;
        }
        .cpftInlineReplyHeader a:hover {
          text-decoration: underline;
        }
        .cpftInlineReplyHeader .cpftInlineReplyName {
          color: var(--cpft-replies-primary);
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cpftInlineReplyHandle {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cpftInlineReplyTime {
          flex-shrink: 0;
        }
        .cpftInlineReplyText {
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }
        :is(.cpftInlineReplyText, .cpftInlineRepliesStatus) a {
          color: var(--cpft-replies-link);
          text-decoration: none;
        }
        :is(.cpftInlineReplyText, .cpftInlineRepliesStatus) a:hover {
          text-decoration: underline;
        }
        .cpftInlineReplyNote {
          color: var(--cpft-replies-secondary);
          font-size: 0.8667rem;
          white-space: normal;
        }
        .cpftInlineReplyMedia {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }
        .cpftInlineReplyMediaItem {
          display: block;
          position: relative;
        }
        .cpftInlineReplyMediaItem img {
          border: 1px solid var(--cpft-replies-line);
          border-radius: 12px;
          display: block;
          max-height: 180px;
          max-width: 100%;
          object-fit: cover;
        }
        .cpftInlineReplyMedia.cpftSensitive img {
          filter: blur(24px);
        }
        .cpftInlineReplyPlay {
          background-color: rgba(0, 0, 0, 0.6);
          border-radius: 9999px;
          color: white;
          font-size: 14px;
          left: 50%;
          line-height: 36px;
          position: absolute;
          text-align: center;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 36px;
        }
        .cpftInlineReplyQuote {
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          border: 1px solid var(--cpft-replies-line);
          border-radius: 12px;
          color: var(--cpft-replies-primary);
          display: -webkit-box;
          font-size: 0.9333rem;
          margin-top: 8px;
          overflow: hidden;
          padding: 8px 12px;
          text-decoration: none;
        }
        .cpftInlineReplyPoll {
          display: flex;
          flex-direction: column;
          font-size: 0.9333rem;
          gap: 4px;
          margin-top: 8px;
        }
        .cpftPollChoice {
          border: 1px solid var(--cpft-replies-line);
          border-radius: 9999px;
          color: var(--cpft-replies-primary);
          display: flex;
          gap: 8px;
          justify-content: space-between;
          padding: 4px 12px;
        }
        .cpftPollResults .cpftPollChoice {
          background: linear-gradient(to right, var(--cpft-hover-bg, rgba(128, 128, 128, 0.16)) var(--cpft-poll-percent), transparent var(--cpft-poll-percent));
          border-color: transparent;
          border-radius: 6px;
        }
        .cpftPollResults .cpftPollChoice.cpftPollLeading {
          background: linear-gradient(to right, color-mix(in srgb, var(--cpft-theme, ${THEME_BLUE}) 35%, transparent) var(--cpft-poll-percent), transparent var(--cpft-poll-percent));
          font-weight: 700;
        }
        .cpftInlineReplyPollInfo {
          color: var(--cpft-replies-secondary);
          font-size: 0.8667rem;
        }
        .cpftInlineReplyPollInfo a {
          color: var(--cpft-theme, ${THEME_BLUE});
        }
        .cpftInlineReplyActions {
          align-items: center;
          color: var(--cpft-replies-secondary);
          display: flex;
          flex-wrap: wrap;
          font-size: 0.8667rem;
          gap: 4px 16px;
          margin-top: 6px;
        }
        .cpftInlineReplyActions:empty {
          display: none;
        }
        .cpftReplies button {
          background: none;
          border: none;
          color: var(--cpft-replies-link);
          cursor: pointer;
          font: inherit;
          padding: 0;
        }
        .cpftReplies button:hover {
          text-decoration: underline;
        }
        :is(.cpftReplies, #cpftQuoteReader) .cpftInlineReplyAction {
          align-items: center;
          color: var(--cpft-replies-secondary, rgb(113, 118, 123));
          display: inline-flex;
          gap: 4px;
        }
        :is(.cpftReplies, #cpftQuoteReader) .cpftInlineReplyAction:hover {
          color: var(--cpft-replies-link, ${THEME_BLUE});
          text-decoration: none;
        }
        :is(.cpftReplies, #cpftQuoteReader) .cpftInlineReplyAction svg {
          fill: currentColor;
          height: 16px;
          width: 16px;
        }
        :is(.cpftReplies, #cpftQuoteReader) .cpftInlineReplyAction:is(.cpftLiked, .cpftLike:hover) {
          color: rgb(249, 24, 128);
        }
        .cpftInlineReplyTweet:focus-visible {
          outline: 2px solid var(--cpft-replies-link, ${THEME_BLUE});
          outline-offset: -2px;
        }
        .cpftInlineRepliesStatus {
          color: var(--cpft-replies-secondary);
          font-size: 0.9333rem;
          padding: 8px 12px;
        }
      `)
    }

    if (config.darkModeTheme != 'lightsOut') {
      cssRules.push(`
        body.LightsOut {
          background-color: var(--cpft-background) !important;
          scrollbar-color: var(--cpft-border) var(--cpft-hover-bg) !important;

          [data-testid="dm-search-bar"].bg-gray-0,
          :is(.animate-pulse, .motion-safe\\:animate-pulse).bg-gray-100, /* Chat skeletons */
          .r-z32n2g {
            background-color: var(--cpft-active-bg);
          }
          :is([data-testid^="dm-conversation-item-"], [data-radix-popper-content-wrapper]) .bg-gray-0,
          .r-14tof1o {
            background-color: var(--cpft-active-bg-dark);
          }
          [style*="background-color: rgb(0, 0, 0)"] {
            background-color: var(--cpft-background) !important;
          }
          [data-testid="dm-conversation-header"] > div:first-child.absolute > div {
            mask-image: linear-gradient(360deg, transparent 0%, var(--cpft-background) 100%) !important;
          }
          .bg-background,
          .jf-element .j-vdda9x11,
          .r-kemksi {
            background-color: var(--cpft-background);
          }
          .r-gu4em3, /* horizontal border */
          .r-1bnu78o /* thread line */ {
            background-color: var(--cpft-border);
          }
          .r-5zmot {
            background-color: var(--cpft-backdrop);
          }
          .r-cl2sl0 {
            background-color: var(--cpft-raised-bg);
          }
          .r-qo02w8,
          .r-1uusn97 {
            box-shadow: var(--cpft-box-shadow);
          }
          .r-1kqtdi0, /* all */
          .r-1igl3o0, /* bottom */
          .r-2sztyj,  /* top */
          .r-vpktly,  /* bottom (brighter) */
          .r-1roi411  /* input */ {
            border-color: var(--cpft-border);
          }
          .r-g2wdr4,
          .r-cuuowz {
            background-color: var(--cpft-hover-bg);
          }
          [data-testid="dm-conversation-header"] button.bg-gray-0,
          .jf-element .j-cw4uj611 {
            background-color: var(--cpft-hover-bg);
          }
          [data-testid="dm-empty-conversation-state"] .bg-gray-0,
          .r-1hdo0pc {
            background-color: var(--cpft-tab-hover-backdrop);
          }
          .jf-element .j-4t3tug11 {
            color: var(--cpft-text-primary);
          }
          [style*="color: rgb(113, 118, 123);"],
          [data-testid="dm-container"] .\\!text-gray-700:not([data-state="active"]),
          .public-DraftEditorPlaceholder-hasFocus,
          .public-DraftEditorPlaceholder-root {
            color: var(--cpft-text-secondary) !important;
          }
          [data-testid="dm-container"] .text-gray-700,
          [data-testid="dm-message-list"] .text-subtext2,
          .jf-element .j-tibd4011,
          .r-1bwzh9t /* icons */ {
            color: var(--cpft-text-secondary);
          }
          [role="dialog"][id^="radix"] {
            &.bg-gray-0 {
              background-color: var(--cpft-background);
            }
            .text-gray-700 {
              color: var(--cpft-text-secondary);
            }
          }
          .scrollbar-thin-custom {
            scrollbar-color: var(--cpft-border) var(--cpft-hover-bg);
            &::-webkit-scrollbar-thumb {
              background-color: var(--cpft-border);
            }
            &::-webkit-scrollbar-track {
              background: var(--cpft-hover-bg);
            }
          }
        }
        body.LightsOut.HighContrast {
          [style*="background-color: rgb(5, 5, 5)"] {
            background-color: var(--cpft-background) !important;
          }
          .r-16331v6 {
            background-color: var(--cpft-background);
          }
          .r-1wh73dq /* horizontal border */ {
            background-color: var(--cpft-border);
          }
          .r-dgm4ly /* all */ {
            border-color: var(--cpft-border);
          }
        }
      `)
      if (config.darkModeTheme == 'dim') {
        cssRules.push(`
          body.LightsOut {
            /* Theme */
            --cpft-active-bg-dark: rgb(27, 36, 47);
            --cpft-active-bg: rgb(40, 50, 61);
            --cpft-backdrop: rgba(21, 32, 43, .85);
            --cpft-background: rgb(21, 32, 43);
            --cpft-border: rgb(56, 68, 77);
            --cpft-box-shadow: rgba(136, 153, 166, 0.2) 0px 0px 15px, rgba(136, 153, 166, 0.15) 0px 0px 3px 1px;
            --cpft-hover-bg: rgb(30, 39, 50);
            --cpft-raised-bg: rgb(40, 50, 61);
            --cpft-tab-hover-backdrop: rgba(247, 249, 249, 0.1);
            --cpft-tab-hover-bg: rgba(44, 53, 64);
            --cpft-text-primary: rgb(247, 249, 249);
            --cpft-text-secondary: rgb(139, 152, 165);
          }
        `)
      }
    }
    if (config.addFocusedTweetAccountLocation) {
      cssRules.push('.AccountLocation[hidden] { display: inline; }')
    }
    if (config.alwaysUseLatestTweets && config.hideForYouTimeline) {
      cssRules.push(`
        /* Prevent the For you tab container taking up space */
        body.HomeTimeline nav.TimelineTabs div[role="tablist"] > div:first-child {
          flex-grow: 0;
          flex-shrink: 1;
        }
        /* Hide the For you tab link */
        body.HomeTimeline nav.TimelineTabs div[role="tablist"] > div:first-child > [role="tab"] {
          display: none;
        }
      `)
    }
    if (config.disableTweetTextFormatting) {
      cssRules.push(`
        div[data-testid="tweetText"] span {
          font-style: normal;
          font-weight: normal;
        }
      `)
    }
    if (config.dropdownMenuFontWeight) {
      cssRules.push(`
        [data-testid="${desktop ? 'Dropdown' : 'sheetDialog'}"] [role="menuitem"] [dir] {
          font-weight: normal;
        }
      `)
    }
    if (config.hideBookmarkButton) {
      // Under timeline tweets
      hideCssSelectors.push(
        'body:not(.Bookmarks) [data-testid="tweet"][tabindex="0"] [role="group"] > div:has(> button[data-testid$="ookmark"])',
      )
      if (!config.showBookmarkButtonUnderFocusedTweets) {
        // Under the focused tweet
        hideCssSelectors.push(
          '[data-testid="tweet"][tabindex="-1"] [role="group"][id^="id__"] > div:has(> button[data-testid$="ookmark"])',
        )
      }
    }
    if (config.hideCalls) {
      hideCssSelectors.push(`${menuRole} a[href="/i/calls"]`)
    }
    if (config.hideConnectNav) {
      hideCssSelectors.push(`${menuRole} a:is([href$="/i/connect_people"], [href$="/i/follow_people"])`)
    }
    if (config.hideCreatorStudioNav) {
      hideCssSelectors.push(
        `${menuRole} a[href$="/creators/studio"]`,
        // Monetization and Subscriptions items in Settings
        'body.Settings a[href="/settings/monetization"]',
        'body.Settings a[href="/settings/manage_subscriptions"]',
      )
      if (desktop) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_DESKTOP} a[href$="/creators/studio"]`)
      }
    }
    if (config.hideEditImage) {
      let isImagineSelector = ':is([href^="/i/imagine"], [href^="https://grok.com/imagine"], [href^="/i/grok-redirect"])'
      hideCssSelectors.push(
        // Manually-tagged
        '.EditImage',
        // On images in Tweets
        `[data-testid="tweet"] div[aria-labelledby] a${isImagineSelector}`,
        `[data-testid="tweet"] [data-testid="tweetText"] a${isImagineSelector}`,
        // In menus
        `[role="menuitem"]${isImagineSelector}`,
        // In media modal
        `[aria-modal="true"] > div > div:first-of-type a${isImagineSelector}`,
      )
    }
    if (!config.hideExplorePageContents) {
      hideCssSelectors.push(
        // Hide the ad at the top of Explore…
        'body.Explore [data-testid="eventHero"]',
        // …and its floating button
        'body.Explore [data-testid="eventHero"] + div',
      )
    }
    if (config.hideListsNav) {
      hideCssSelectors.push(`${menuRole} a[href$="/lists"]`)
    }
    if (config.hideHistoryNav) {
      hideCssSelectors.push(`${menuRole} a[href$="${PagePaths.HISTORY}"]`)
    }
    if (config.hideCommunitiesNav) {
      hideCssSelectors.push(`${menuRole} a[href$="/communities"]`)
    }
    if (config.hideManageTimelines) {
      hideCssSelectors.push('.ManageTimelines')
    }
    if (config.hideShareTweetButton) {
      hideCssSelectors.push(
        // Under timeline tweets
        `[data-testid="tweet"][tabindex="0"] [role="group"] > div[style]:not(${TWITTER_MEDIA_ASSIST_BUTTON_SELECTOR})`,
        // Under the focused tweet
        `[data-testid="tweet"][tabindex="-1"] [role="group"] > div[style]:not(${TWITTER_MEDIA_ASSIST_BUTTON_SELECTOR})`,
      )
    }
    if (config.hideSortRepliesMenu) {
      hideCssSelectors.push('.SortRepliesMenu')
    }
    if (config.hideMoney) {
      hideCssSelectors.push(
        `${Selectors.PRIMARY_NAV_DESKTOP} a[href="/i/money"]`,
        `${Selectors.PRIMARY_NAV_MOBILE} a[href="/i/money"]`,
        `${menuRole} a[href="/i/money"]`,
        // Money icon and balance buttons beside Edit Profile
        '[data-testid="ownProfilePaymentsButton"]',
        '[data-testid="ownProfilePaymentsButtonWithBalance"]',
      )
    }
    if (config.hideSubscriptions) {
      hideCssSelectors.push(
        // Subscribe buttons in profile (multiple locations)
        'body.Profile [role="button"][style*="border-color: rgb(201, 54, 204)"]',
        // Subscriptions count in profile
        'body.Profile a[href$="/creator-subscriptions/subscriptions"]',
        // Subs tab in profile
        'body.Profile .SubsTab',
        // Subscribe button in focused tweet
        '[data-testid="tweet"][tabindex="-1"] [data-testid$="-subscribe"]',
        // "Subscribe to" dropdown item (desktop)
        '[data-testid="Dropdown"] > [data-testid="subscribe"]',
        // "Subscribe to" menu item (mobile)
        '[data-testid="sheetDialog"] > [data-testid="subscribe"]',
        // "Subscriber" indicator in replies from subscribers
        '[data-testid="tweet"] [data-testid="icon-subscriber"]',
        // Subscriptions tab link in Following/Follows
        `.SubscriptionsTab > [role="tab"]`,
      )
      // Subscriptions tab in Following/Follows
      cssRules.push(`
        .SubscriptionsTab {
          flex: 0;
        }
      `)
    }
    if (config.hideMetrics) {
      configureHideMetricsCss(cssRules, hideCssSelectors)
    }
    if (config.hideMoreTweets) {
      hideCssSelectors.push('.SuggestedContent')
    }
    if (config.hideCommunitiesNav) {
      hideCssSelectors.push(`${menuRole} a[href$="/communities"]`)
    }
    if (config.hideGrokNav) {
      hideCssSelectors.push(
        // In menus
        `${menuRole} a[href="/i/grok"]`,
        // Grok Actions button
        `button[aria-label="${getString('GROK_ACTIONS')}"]`,
        // "Generate image" button in the Tweet editor
        'button[data-testid="grokImgGen"]',
        // Any Grok buttons we manually tag
        '.GrokButton',
        // Grok suggested prompts in Tweets
        '[data-testid="tweet"] [data-testid^="followups_"]',
        '[data-testid="tweet"] [data-testid^="followups_"] + nav',
        // Ask Grok button in Tweets
        '[data-testid="tweet"] a[href="/i/grok"]',
        // Profile Summary button
        `button[aria-label="${getString('PROFILE_SUMMARY')}"]`,
        // Grok summary at the top of search results
        'body.Search [data-testid="primaryColumn"] > div > div:has(> [data-testid="followups_search"])',
        // Install button card in Grok tweets
        '[data-testid="card.wrapper"]:has(> div > a[href="https://itunes.apple.com/app/id6670324846"])',
      )
    }
    if (config.hideBusinessNav) {
      hideCssSelectors.push(`${menuRole} a:is([href^="/i/premium-business"], [href^="/i/verified-orgs-signup"])`)
      if (desktop) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_DESKTOP} a:is([href^="/i/premium-business"], [href^="/i/verified-orgs-signup"])`)
      }
    }
    if (config.hideAdsNav) {
      hideCssSelectors.push(`${menuRole} a:is([href*="ads.twitter.com"], [href*="ads.x.com"])`)
    }
    if (config.hideJobsNav) {
      hideCssSelectors.push(
        // Jobs navigation item
        `${menuRole} a[href="/jobs"]`,
        // Jobs section in profiles
        '.Profile [data-testid="jobs"]',
      )
    }
    if (config.hideViewActivityLinks) {
      hideCssSelectors.push(
        // Manually-tagged View activity link
        '.ViewActivity',
        // View post activity menu item
        `${menuRole} a[href$="/quotes"]`,
      )
    }
    if (config.hideTwitterBlueUpsells) {
      hideCssSelectors.push(
        // Manually-tagged upsells
        '.PremiumUpsell',
        // Premium menu item
        `${menuRole} a[href^="/i/premium_sign_up"]`,
        // Analytics menu item
        `${menuRole} a[href="/i/account_analytics"]`,
        // "Highlight on your profile" on your tweets
        '[role="menuitem"][data-testid="highlightUpsell"]',
        // "Edit" upsell on recent tweets
        '[role="menuitem"][data-testid="editWithPremium"]',
        // Premium item in Settings
        'body.Settings a[href^="/i/premium_sign_up"]',
        // Misc upsells in your own profile
        `.OwnProfile ${Selectors.PRIMARY_COLUMN} a[href^="/i/premium_sign_up"]`,
        // Unlock Analytics button in your own profile
        '.OwnProfile [data-testid="analytics-preview"]',
        // Button in Communities header
        `body.Communities ${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} a:is([href^="/i/premium"], [href^="/i/verified"])`,
        // "This profile is verified" upsell
        '[data-testid="verified_profile_upsell"]',
        // Get Premium Analytics upsell
        '[data-testid="profileAnalyticsUpsell"]',
        // "you aren't verified yet" in Premium user profile
        '[data-testid="verified_profile_visitor_upsell"]',
        // "Upgrade to Premium+ to write longer posts" in Tweet composer
        `${mobile ? 'body.ComposeTweetPage' : ':is(.ComposeTweetModal, .TweetBox)'} [aria-live="polite"][role="status"]:has(a[href^="/i/premium_sign_up"])`,
        // Box in focused Tweet with "Upgrade to Premium+" / "Get Verified" upsell
        '[data-testid="tweet"][tabindex="-1"] [aria-live="polite"][role="status"]:has(a[href^="/i/premium_sign_up"])',
        // Upsell on the Likes tab in your own profile
        `body.OwnProfile ${Selectors.PRIMARY_COLUMN} nav + div:has(a[href^="/i/premium"])`,
      )
      // Hide Highlights and Articles tabs in your own profile if you don't have Premium
      let profileTabsList = `body.OwnProfile:not(.PremiumProfile) ${Selectors.PRIMARY_COLUMN} nav div[role="tablist"]`
      let upsellTabLinks = 'a:is([href$="/highlights"], [href$="/articles"], [href$="/highlights?mx=1"], [href$="/articles?mx=1"])'
      cssRules.push(`
        ${profileTabsList} > div:has(> ${upsellTabLinks}) {
          flex: 0;
        }
        ${profileTabsList} > div > ${upsellTabLinks} {
          display: none;
        }
      `)
    }
    if (config.hideVerifiedNotificationsTab) {
      cssRules.push(`
        .VerifiedFollowersTab {
          flex: 0;
        }
        .VerifiedFollowersTab > [role="tab"] {
          display: none;
        }
      `)
    }
    if (config.hideViews) {
      // "Views" under the focused tweet
      hideCssSelectors.push('.Views')
    }
    if (config.hideWhoToFollowEtc) {
      hideCssSelectors.push(`body.Profile ${Selectors.PRIMARY_COLUMN} aside[role="complementary"]`)
    }
    if (config.reducedInteractionMode) {
      hideCssSelectors.push(
        '[data-testid="tweet"] [role="group"]',
        'body.Tweet [data-testid="tweet"] + div > div [role="group"]',
      )
    }
    if (config.restoreLinkHeadlines) {
      cssRules.push(`
        .cpft_link_headline[hidden] {
          display: block;
          border-top: 1px solid var(--cpft-border);
          padding: 14px;
          line-height: normal;
        }
      `)
      hideCssSelectors.push(
        // Existing headline overlaid on the card
        '.cpft_overlay_headline',
        // From <domain> link after the card
        'div[data-testid="card.wrapper"] + div',
      )
    }
    if (config.restoreQuoteTweetsLink || config.restoreOtherInteractionLinks) {
      cssRules.push(`
        #cpftInteractionLinks[hidden] {
          display: block;
        }
        #cpftInteractionLinks a {
          text-decoration: none;
          color: var(--cpft-text-secondary);
        }
        #cpftInteractionLinks a:hover span:last-child {
          text-decoration: underline;
        }
        #cpftQuoteTweetCount, #cpftRetweetCount, #cpftLikeCount {
          margin-right: 2px;
          font-weight: 700;
          color: var(--cpft-text-primary);
        }
        /* Replaces the "View activity" link under your own tweets */
        .ViewActivity {
          display: none;
        }
      `)
    }
    if (!config.restoreQuoteTweetsLink) {
      hideCssSelectors.push('#cpftQuoteTweetsLink')
    }
    if (!config.restoreOtherInteractionLinks) {
      hideCssSelectors.push('#cpftRetweetsLink', '#cpftLikesLink')
    }
    if (config.restoreTweetSource) {
      cssRules.push('.TweetSource[hidden] { display: inline; }')
    }
    if (config.tweakQuoteTweetsPage) {
      // Hide the quoted tweet, which is repeated in every quote tweet
      hideCssSelectors.push('body.QuoteTweets [data-testid="tweet"] [aria-labelledby] > div:last-child')
    }
    if (config.twitterBlueChecks == 'hide') {
      hideCssSelectors.push('.cpft_blue_check')
    }
    if (config.twitterBlueChecks == 'replace') {
      cssRules.push(`
        :is(${Selectors.VERIFIED_TICK}, svg[data-testid="verificationBadge"]).cpft_blue_check path {
          d: path("${Svgs.BLUE_LOGO_PATH}");
        }
      `)
    }

    if (shouldShowSeparatedTweetsTab()) {
      cssRules.push(`
        /* Sometimes the cloned tab has a hover background color class */
        body:not(.SeparatedTweets) #cpftSeparatedTweetsTab > [role="tab"] {
          background-color: transparent !important;
        }
        body.Desktop #cpftSeparatedTweetsTab:hover,
        body.Mobile:not(.SeparatedTweets) #cpftSeparatedTweetsTab:hover,
        body.Mobile #cpftSeparatedTweetsTab:active {
          background-color: var(--cpft-tab-hover-backdrop) !important;
        }
        body:not(.SeparatedTweets) #cpftSeparatedTweetsTab > [role="tab"] > div > div,
        body.HomeTimeline.SeparatedTweets ${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} nav div[role="tablist"] > div:not(#cpftSeparatedTweetsTab) > [role="tab"] > div > div {
          font-weight: normal !important;
          color: var(--cpft-text-secondary) !important;
        }
        body.SeparatedTweets #cpftSeparatedTweetsTab > [role="tab"] > div > div {
          font-weight: bold;
          color: var(--cpft-text-primary) !important;
        }
        /* Active tab underline */
        body:not(.SeparatedTweets) #cpftSeparatedTweetsTab > [role="tab"] > div > div > div,
        body.HomeTimeline.SeparatedTweets ${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} nav div[role="tablist"] > div:not(#cpftSeparatedTweetsTab) > [role="tab"] > div > div > div {
          height: 0 !important;
        }
        body.SeparatedTweets #cpftSeparatedTweetsTab > [role="tab"] > div > div > div {
          height: 4px !important;
          min-width: 56px;
          width: 100%;
          position: absolute;
          bottom: 0;
          border-radius: 9999px;
        }
        /* Following menu indicator */
        body.HomeTimeline.SeparatedTweets ${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} nav div[role="tablist"] > div:nth-child(2) > [role="tab"] svg {
          display: none;
        }
      `)
    }

    //#region Desktop-only
    if (desktop) {
      if (config.navDensity == 'comfortable' || config.navDensity == 'compact') {
        cssRules.push(`
          header nav > a,
          header nav > div[data-testid="AppTabBar_More_Menu"] {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
        `)
      }
      if (config.navDensity == 'compact') {
        cssRules.push(`
          header nav > a > div,
          header nav > div[data-testid="AppTabBar_More_Menu"] > div {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
        `)
      }
      if (config.hideSeeNewTweets) {
        hideCssSelectors.push(`body.HomeTimeline ${Selectors.PRIMARY_COLUMN} > div > div:first-child > div[style^="transform"]`)
      }
      if (config.hideTimelineTweetBox) {
        hideCssSelectors.push(`body.HomeTimeline ${Selectors.PRIMARY_COLUMN} .TweetBox`)
      }
      if (config.disableHomeTimeline) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_DESKTOP} a[href="/home"]`)
      }
      if (config.hideNotifications != 'ignore') {
        // Hide notification badges and indicators
        hideCssSelectors.push(
          // Notifications & Chat in primary nav
          `${Selectors.PRIMARY_NAV_DESKTOP} > :is(a[href^="/notifications"], a[href="/i/chat"]) div[aria-live]`,
          // Account switcher
          'button[data-testid="SideNav_AccountSwitcher_Button"] > div > div[aria-label]',
          // Account switcher accounts
          '[data-testid="HoverCard"] button[data-testid="UserCell"] div[aria-live]',
        )
        if (config.hideNotifications == 'hide') {
          hideCssSelectors.push(
            // Nav item
            `${Selectors.PRIMARY_NAV_DESKTOP} a[href^="/notifications"]`,
          )
        }
      }
      if (config.fullWidthContent) {
        cssRules.push(`
          /* Use full width when the sidebar is visible */
          body.Sidebar${FULL_WIDTH_BODY_PSEUDO} ${Selectors.PRIMARY_COLUMN},
          body.Sidebar${FULL_WIDTH_BODY_PSEUDO} ${Selectors.PRIMARY_COLUMN} > div:first-child > div:last-child {
            max-width: 990px;
          }
          /* Make the "What's happening" input keep its original width */
          body.HomeTimeline ${Selectors.PRIMARY_COLUMN} > div:first-child > div:nth-of-type(3) div[role="progressbar"] + div {
            max-width: 598px;
          }
          /* Use full width when the sidebar is not visible */
          body:not(.Sidebar)${FULL_WIDTH_BODY_PSEUDO} header[role="banner"] {
            flex-grow: 0;
          }
          body:not(.Sidebar)${FULL_WIDTH_BODY_PSEUDO} main[role="main"] > div {
            width: 100%;
          }
          body:not(.Sidebar)${FULL_WIDTH_BODY_PSEUDO} ${Selectors.PRIMARY_COLUMN} {
            max-width: unset;
            width: 100%;
          }
          body:not(.Sidebar)${FULL_WIDTH_BODY_PSEUDO} ${Selectors.PRIMARY_COLUMN} > div:first-child > div:first-child div,
          body:not(.Sidebar)${FULL_WIDTH_BODY_PSEUDO} ${Selectors.PRIMARY_COLUMN} > div:first-child > div:last-child {
            max-width: unset;
          }
        `)
        if (!config.fullWidthMedia) {
          // Make media & cards keep their original width
          cssRules.push(`
            body${FULL_WIDTH_BODY_PSEUDO} ${Selectors.PRIMARY_COLUMN} ${Selectors.TWEET} > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div[id][aria-labelledby]:not(:empty) {
              max-width: 504px;
            }
          `)
        }
        // Hide the sidebar when present
        hideCssSelectors.push(`body.Sidebar${FULL_WIDTH_BODY_PSEUDO} ${Selectors.SIDEBAR}`)
      }
      if (config.hideAccountSwitcher) {
        cssRules.push(`
          header[role="banner"] > div > div > div > div:last-child {
            flex-shrink: 1 !important;
            align-items: flex-end !important;
          }
        `)
        hideCssSelectors.push(
          '[data-testid="SideNav_AccountSwitcher_Button"] > div:first-child:not(:only-child)',
          '[data-testid="SideNav_AccountSwitcher_Button"] > div:first-child + div',
        )
      }
      if (config.hideExplorePageContents) {
        hideCssSelectors.push(
          // Tabs
          `body.Explore ${Selectors.DESKTOP_TIMELINE_HEADER} nav`,
          // Content
          `body.Explore ${Selectors.TIMELINE}`,
        )
      }
      if (config.hideComposeTweet) {
        hideCssSelectors.push('[data-testid="SideNav_NewTweet_Button"]')
      }
      if (config.hideConnectNav) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_DESKTOP} a[href$="/i/connect_people"]`)
      }
      if (config.hideCalls) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_DESKTOP} a[href="/i/calls"]`)
      }
      if (config.hideChatNav) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_DESKTOP} a[href$="/i/chat"]`)
      }
      if (config.hideGrokNav) {
        hideCssSelectors.push(
          `${Selectors.PRIMARY_NAV_DESKTOP} a[href$="/i/grok"]`,
          // Grok drawer
          'div[data-testid="GrokDrawer"]',
        )
      }
      if (config.hideJobsNav) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_DESKTOP} a[href="/jobs"]`)
      }
      if (config.hideListsNav) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_DESKTOP} a[href$="/lists"]`)
      }
      if (config.hideSpacesNav) {
        hideCssSelectors.push(`${menuRole} a[href="/i/spaces/start"]`)
      }
      if (config.hideTwitterBlueUpsells) {
        hideCssSelectors.push(
          // Nav items
          `${Selectors.PRIMARY_NAV_DESKTOP} a:is([href^="/i/premium"], [href^="/i/verified"])`,
          // Premium link in hovercard
          '[data-testid="HoverCard"] a[href^="/i/premium"]',
        )
        if (!config.hideSidebarContent) {
          hideCssSelectors.push(
            // Upsell in sidebar
            '.SidebarContents > div:has(aside[role="complementary"] a[href^="/i/premium_sign_up"])',
            '.SidebarContents > div:has(> div > div[data-testid="super-upsell-UpsellCardRenderProperties"])',
          )
        }
      }
      if (config.hideGrokNav && !config.hideSidebarContent) {
        hideCssSelectors.push(
          '.SidebarContents > div:has(> aside[role="complementary"] > a[href^="https://grok.com/imagine"])'
        )
      }
      if (config.hideSidebarContent) {
        // Only show the first sidebar item by default
        // Re-show subsequent non-algorithmic sections on specific pages
        cssRules.push(`
          .SidebarContents > div:not(:first-of-type) {
            display: none;
          }
          body.Search .SidebarContents > div:nth-of-type(2) {
            display: block;
          }
          body.Community .SidebarContents > div:nth-of-type(3) {
            display: block;
          }
        `)
        if (config.showRelevantPeople) {
          cssRules.push(`
            body.Tweet .SidebarContents > div:is(:nth-of-type(2), :nth-of-type(3)) {
              display: block;
            }
          `)
        }
        hideCssSelectors.push(`body.HideSidebar ${Selectors.SIDEBAR}`)
      } else {
        if (config.hideLiveBroadcasts) {
          hideCssSelectors.push('.LiveBroadcasts')
        }
        if (config.hideTodaysNews) {
          hideCssSelectors.push('.SidebarContents > div:has(> [data-testid="news_sidebar"])')
        }
        if (config.hideWhatsHappening) {
          hideCssSelectors.push('.WhatsHappening')
        }
        if (config.hideSuggestedFollows) {
          hideCssSelectors.push('.SuggestedFollows')
        }
      }
      if (config.hideShareTweetButton) {
        hideCssSelectors.push(
          // In media modal
          `[aria-modal="true"] div > div:first-of-type [role="group"] > div[style]:not([role]):not(${TWITTER_MEDIA_ASSIST_BUTTON_SELECTOR})`,
        )
      }
      if (config.hideExploreNav) {
        // When configured, hide Explore only when the sidebar is showing, or
        // when on a page full-width content is enabled on.
        let bodySelector = `${config.hideExploreNavWithSidebar ? `body.Sidebar${config.fullWidthContent ? `:not(${FULL_WIDTH_BODY_PSEUDO})` : ''} ` : ''}`
        hideCssSelectors.push(`${bodySelector}${Selectors.PRIMARY_NAV_DESKTOP} a[href="/explore"]`)
      }
      if (config.hideHistoryNav) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_DESKTOP} a[href="${PagePaths.HISTORY}"]`)
      }
      if (config.hideCommunitiesNav) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_DESKTOP} a[href$="/communities"]`)
      }
      if (config.hideMessagesDrawer) {
        cssRules.push(`div[data-testid="chat-drawer-root"] { visibility: hidden; }`)
      }
      if (config.hideViews) {
        hideCssSelectors.push(
          // Under timeline tweets
          '[data-testid="tweet"][tabindex="0"] [role="group"] > div:has(> a[href$="/analytics"])',
          // In media modal
          '[aria-modal="true"] > div > div:first-of-type [role="group"] > div:has(> a[href$="/analytics"])',
        )
      }
      if (config.retweets != 'separate' && config.quoteTweets != 'separate') {
        hideCssSelectors.push('#cpftSeparatedTweetsTab')
      }
    }
    //#endregion

    //#region Mobile only
    if (mobile) {
      if (config.disableHomeTimeline) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_MOBILE} a[href="/home"]`)
      }
      if (config.hideComposeTweet) {
        hideCssSelectors.push('[data-testid="FloatingActionButtons_Tweet_Button"]')
      }
      if (config.hideNotifications != 'ignore') {
        // Hide notification badges and indicators
        hideCssSelectors.push(
          // Notifications & Chat in primary nav
          `${Selectors.PRIMARY_NAV_MOBILE} > :is(a[href^="/notifications"], a[href="/i/chat"]) div[aria-label]`,
          // Account switcher
          `button[data-testid="DashButton_ProfileIcon_Link"] div[aria-label]`,
          // Account switcher accounts
          '[role="dialog"] [data-testid^="UserAvatar-Container"] div[dir]',
        )
        if (config.hideNotifications == 'hide') {
          hideCssSelectors.push(
            // Nav item
            `${Selectors.PRIMARY_NAV_MOBILE} a[href^="/notifications"]`
          )
        }
      }
      if (config.hideLiveBroadcastBar) {
        hideCssSelectors.push(`body.HomeTimeline ${Selectors.MOBILE_TIMELINE_HEADER} + div[style^="transform"]`)
        // Reclaim the height reserved for the bar
        cssRules.push(`
          body.HomeTimeline header[role="banner"] > div[style="height: 162px;"] {
            height: 102px !important;
          }
        `)
      }
      if (config.hideSeeNewTweets) {
        hideCssSelectors.push(`body.HomeTimeline ${Selectors.MOBILE_TIMELINE_HEADER} ~ div[style^="transform"]:last-child`)
      }
      if (config.hideExplorePageContents) {
        // Hide explore page contents so we don't get a brief flash of them
        // before automatically switching the page to search mode.
        hideCssSelectors.push(
          // Tabs
          `body.Explore ${Selectors.MOBILE_TIMELINE_HEADER} > div > div:nth-of-type(2)`,
          // Content
          `body.Explore ${Selectors.TIMELINE}`,
        )
      }
      if (config.hideCalls) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_MOBILE} a[href="/i/calls"]`)
      }
      if (config.hideGrokNav) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_MOBILE} a[href="/i/grok"]`)
      }
      if (config.hideCommunitiesNav) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_MOBILE} a[href$="/communities"]`)
      }
      if (config.hideMessagesBottomNavItem) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_MOBILE} a[href="/i/chat"]`)
      }
      if (config.hideJobsNav) {
        hideCssSelectors.push(`${Selectors.PRIMARY_NAV_MOBILE} a[href="/jobs"]`)
      }
      if (config.hideTwitterBlueUpsells) {
        hideCssSelectors.push(
          `${Selectors.PRIMARY_NAV_MOBILE} a[href^="/i/premium"]`,
          `${Selectors.MOBILE_TIMELINE_HEADER} a[href^="/i/premium"]`,
        )
      }
      if (config.hideShareTweetButton) {
        hideCssSelectors.push(
          // In media viewer and media modal
          `body:is(.MediaViewer, .MobileMedia) [role="group"] > div[style]:not(${TWITTER_MEDIA_ASSIST_BUTTON_SELECTOR})`,
        )
      }
      if (config.hideViews) {
        hideCssSelectors.push(
          // Under timeline tweets
          '[data-testid="tweet"][tabindex="0"] [role="group"] > div:has(> a[href$="/analytics"])',
          // In media viewer and media modal
          'body:is(.MediaViewer, .MobileMedia) [role="group"] > div:has(> a[href$="/analytics"])',
        )
      }
    }
    //#endregion

    if (hideCssSelectors.length > 0) {
      cssRules.push(`
        ${hideCssSelectors.join(',\n')} {
          display: none !important;
        }
      `)
    }

    let css = cssRules.map(dedent).join('\n')
    if ($style == null) {
      $style = addStyle(css)
    } else {
      $style.textContent = css
    }
  }
})()

const configureFeatureFlags = (() => {
  let isTrue
  return function configureFeatureFlags() {
    let props = getTopLevelProps()
    if (!props) return
    let featureSwitches = props?.contextProviderProps?.featureSwitches
    if (!featureSwitches) {
      warn('featureSwitches not found')
      return
    }

    if (!config.enabled) {
      if (isTrue) {
        log('restoring original featureSwitches')
        featureSwitches.isTrue = isTrue
        isTrue = null
      }
      return
    }

    if (isTrue) return

    isTrue = featureSwitches.isTrue
    featureSwitches.isTrue = (flag) => {
      if (config.bypassAgeVerification && flag == 'rweb_age_assurance_flow_enabled') return false
      if (config.disableNflFeatures && flag == 'responsive_web_nfl_enabled') return false
      if (config.revertMediaCarousel && flag == 'rweb_media_carousel_enabled') return false
      if (config.revertProfileTabs && flag == 'responsive_web_profile_redesign_enabled') return false
      if (config.revertTwemoji && flag == 'responsive_web_native_emojis_enabled') return false
      return isTrue(flag)
    }
    log('featureSwitches patched')
  }
})()

function configureFont() {
  if (!fontFamilyRule) {
    warn('no fontFamilyRule found for configureFont to use')
    return
  }

  let hasChirp = fontFamilyRule.style.fontFamily.includes('TwitterChirp')
  if (config.enabled) {
    if (config.dontUseChirpFont) {
      if (hasChirp) {
        fontFamilyRule.style.fontFamily = fontFamilyRule.style.fontFamily.replace(/"?TwitterChirp"?, ?/, '')
        log('dontUseChirpFont: disabled Chirp font')
      }
    }
    else if (!hasChirp) {
      fontFamilyRule.style.fontFamily = `"TwitterChirp", ${fontFamilyRule.style.fontFamily}`
      log(`dontUseChirpFont: re-enabled Chirp font`)
    }
  }
  else if (!hasChirp) {
     fontFamilyRule.style.fontFamily = `"TwitterChirp", ${fontFamilyRule.style.fontFamily}`
     log(`re-enabled Chirp font`)
  }
}

/**
 * @param {string[]} cssRules
 * @param {string[]} hideCssSelectors
 */
function configureHideMetricsCss(cssRules, hideCssSelectors) {
  if (config.hideFollowingMetrics) {
    // User profile hover card and page metrics
    hideCssSelectors.push(
      ':is(#layers, body.Profile) a:is([href$="/following"], [href$="/verified_followers"]) > span:first-child'
    )
    // Fix display of whitespace after hidden metrics
    cssRules.push(
      ':is(#layers, body.Profile) a:is([href$="/following"], [href$="/verified_followers"]) { white-space: pre-line; }'
    )
  }

  if (config.hideTotalTweetsMetrics) {
    // Metrics under username header on profile pages
    hideCssSelectors.push(`
      body.Profile ${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} > div > div:first-of-type h2 + div[dir]
    `)
  }

  let timelineMetricSelectors = [
    config.hideReplyMetrics   && '[data-testid="reply"]',
    config.hideRetweetMetrics && '[data-testid$="retweet"]',
    config.hideLikeMetrics    && '[data-testid$="like"]',
    config.hideBookmarkMetrics && '[data-testid$="bookmark"], [data-testid$="removeBookmark"]',
  ].filter(Boolean).join(', ')

  if (timelineMetricSelectors) {
    cssRules.push(
      `[role="group"] button:is(${timelineMetricSelectors}) span { visibility: hidden; }`
    )
  }

  if (config.hideQuoteTweetMetrics) {
    hideCssSelectors.push('#cpftQuoteTweetCount')
  }
  if (config.hideRetweetMetrics) {
    hideCssSelectors.push('#cpftRetweetCount')
  }
  if (config.hideLikeMetrics) {
    hideCssSelectors.push('#cpftLikeCount')
  }
}

const configureCustomCss = (() => {
  let $style

  return function configureCustomCss() {
    if (config.customCss) {
      $style ??= addStyle('custom')
      $style.textContent = config.customCss
    } else {
      $style?.remove()
    }
  }
})()

/**
 * CSS which depends on anything we need to get from the page.
 */
const configureDynamicCss = (() => {
  let $style

  return function configureDynamicCss() {
    if (!config.enabled) {
      log('removing nav font size stylesheet')
      $style?.remove()
      $style = null
      return
    }

    let cssRules = []

    if (fontSize != null && config.navBaseFontSize) {
      cssRules.push(`
        /* Regular React Native for Web markup */
        ${Selectors.PRIMARY_NAV_DESKTOP} div[dir]:not([aria-live]) span,
        /* New inline style markup */
        ${Selectors.PRIMARY_NAV_DESKTOP} span[style] > span {
          font-size: ${fontSize} !important;
          font-weight: normal !important;
        }
      `)
    }

    if (filterBlurRule != null && config.unblurSensitiveContent) {
      cssRules.push(`
        ${filterBlurRule.selectorText} {
          filter: none !important;
        }
        ${filterBlurRule.selectorText} + div {
          display: none !important;
        }
      `)
    }

    let css = cssRules.map(dedent).join('\n')
    if ($style == null) {
      $style = addStyle(css)
    } else {
      $style.textContent = css
    }
  }
})()
//#endregion

/**
 * Configures – or re-configures – the separated tweets timeline title.
 *
 * If we're currently on the separated tweets timeline and…
 * - …its title has changed, the page title will be changed to "navigate" to it.
 * - …the separated tweets timeline is no longer needed, we'll change the page
 *   title to "navigate" back to the Home timeline.
 *
 * @returns {boolean} `true` if "navigation" was triggered by this call
 */
function configureSeparatedTweetsTimelineTitle() {
  let wasOnSeparatedTweetsTimeline = isOnSeparatedTweetsTimeline()
  let previousTitle = separatedTweetsTimelineTitle

  if (config.retweets == 'separate' && config.quoteTweets == 'separate') {
    separatedTweetsTimelineTitle = getString(config.replaceLogo ? 'SHARED_TWEETS' : 'SHARED')
  } else if (config.retweets == 'separate') {
    separatedTweetsTimelineTitle = getString(config.replaceLogo ? 'RETWEETS' : 'REPOSTS')
  } else if (config.quoteTweets == 'separate') {
    separatedTweetsTimelineTitle = getString(config.replaceLogo ? 'QUOTE_TWEETS' : 'QUOTES')
  } else {
    separatedTweetsTimelineTitle = null
  }

  let titleChanged = previousTitle != separatedTweetsTimelineTitle
  if (wasOnSeparatedTweetsTimeline) {
    if (separatedTweetsTimelineTitle == null) {
      log('moving from separated tweets timeline to Home timeline after config change')
      setTitle(getString('HOME'))
      return true
    }
    if (titleChanged) {
      log('applying new separated tweets timeline title after config change')
      setTitle(separatedTweetsTimelineTitle)
      return true
    }
  } else {
    if (titleChanged && previousTitle != null && lastHomeTimelineTitle == previousTitle) {
      log('updating lastHomeTimelineTitle with new separated tweets timeline title')
      lastHomeTimelineTitle = separatedTweetsTimelineTitle
    }
  }
}

const configureThemeCss = (() => {
  let $style

  return function configureThemeCss() {
    if (!config.enabled) {
      log('removing theme stylesheet')
      $style?.remove()
      $style = null
      return
    }

    let cssRules = []

    if (themeColor != null) {
      cssRules.push(`
        body {
          --cpft-theme: ${themeColor};
        }
      `)
    }

    if (debug) {
      cssRules.push(`
        [data-item-type]::after {
          position: absolute;
          top: 0;
          ${ltr ? 'right': 'left'}: 50px;
          content: attr(data-item-type);
          font-family: ${fontFamilyRule?.style.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial'};
          background-color: rgb(242, 29, 29);
          color: white;
          font-size: 11px;
          font-weight: bold;
          padding: 4px 6px;
          border-bottom-left-radius: 1em;
          border-bottom-right-radius: 1em;
        }
      `)
    }

    // Active tab colour for custom tabs
    if (themeColor != null && shouldShowSeparatedTweetsTab()) {
      cssRules.push(`
        body.SeparatedTweets #cpftSeparatedTweetsTab > [role="tab"] > div > div > div {
          background-color: ${themeColor} !important;
        }
      `)
    }

    if (config.replaceLogo) {
      cssRules.push(`
        ${Selectors.X_LOGO_PATH}, ${Selectors.X_DARUMA_LOGO_PATH} {
          fill: ${THEME_BLUE};
          d: path("${Svgs.TWITTER_LOGO_PATH}");
        }
        .cpft_logo {
          fill: ${THEME_BLUE};
        }
        svg path[d="${Svgs.X_HOME_ACTIVE_PATH}"] {
          d: path("${Svgs.TWITTER_HOME_ACTIVE_PATH}");
        }
        svg path[d="${Svgs.X_HOME_INACTIVE_PATH}"] {
          d: path("${Svgs.TWITTER_HOME_INACTIVE_PATH}");
        }
        /* Replace the edit icon in the Tweet button with the feather */
        :is([data-testid="SideNav_NewTweet_Button"], [data-testid="FloatingActionButtons_Tweet_Button"]) {
          path[d="${Svgs.PLUS_PATH}"] {
            d: path("${Svgs.TWITTER_FEATHER_PLUS_PATH}");
          }
          path[clip-rule="evenodd"] {
            display: none;
          }
        }
        /* Restore theme to Tweet composer icons */
        [data-testid="toolBar"] [role="tablist"] > [role="presentation"],
        [data-testid="toolBar"] [role="tablist"] > [role="presentation"] * {
          filter: none !important;
        }
        [data-testid="toolBar"] [role="tablist"] > [role="presentation"] svg {
          fill: var(--cpft-theme);
        }
      `)
      if (desktop) {
        // Revert the Tweet buttons being made monochrome
        cssRules.push(`
          [data-testid="SideNav_NewTweet_Button"],
          [data-testid="tweetButtonInline"],
          [data-testid="tweetButton"] {
            background-color: ${themeColor} !important;
          }
          [data-testid="SideNav_NewTweet_Button"]:hover,
          [data-testid="tweetButtonInline"]:hover:not(:disabled),
          [data-testid="tweetButton"]:hover:not(:disabled) {
            background-color: ${themeColor.replace(')', ', 80%)')} !important;
          }
          body:is(.LightsOut):not(.HighContrast) [data-testid="SideNav_NewTweet_Button"] > div,
          body:is(.LightsOut):not(.HighContrast) [data-testid="tweetButtonInline"] > div,
          body:is(.LightsOut):not(.HighContrast) [data-testid="tweetButton"] > div,
          body:is(.LightsOut):not(.HighContrast) [data-testid="SideNav_NewTweet_Button"] > div > svg {
            color: rgb(255, 255, 255) !important;
          }
        `)
      }
    }

    if (config.uninvertFollowButtons) {
      // Shared styles for Following and Follow buttons
      cssRules.push(`
        [role="button"][data-testid$="-unfollow"]:not(:hover) {
          border-color: rgba(0, 0, 0, 0) !important;
        }
        [role="button"][data-testid$="-follow"] {
          background-color: rgba(0, 0, 0, 0) !important;
        }
      `)
      if (config.followButtonStyle == 'monochrome' || themeColor == null) {
        cssRules.push(`
          /* Following button */
          body.Default [role="button"][data-testid$="-unfollow"]:not(:hover) {
            background-color: rgb(15, 20, 25) !important;
          }
          body.Default [role="button"][data-testid$="-unfollow"]:not(:hover) > :is(div, span) {
            color: rgb(255, 255, 255) !important;
          }
          body:is(.LightsOut) [role="button"][data-testid$="-unfollow"]:not(:hover) {
            background-color: rgb(255, 255, 255) !important;
          }
          body:is(.LightsOut) [role="button"][data-testid$="-unfollow"]:not(:hover) > :is(div, span) {
            color: rgb(15, 20, 25) !important;
          }
          /* Follow button */
          body.Default [role="button"][data-testid$="-follow"] {
            border-color: rgb(207, 217, 222) !important;
          }
          body:is(.LightsOut) [role="button"][data-testid$="-follow"] {
            border-color: rgb(83, 100, 113) !important;
          }
          body.Default [role="button"][data-testid$="-follow"] > :is(div, span) {
            color: rgb(15, 20, 25) !important;
          }
          body:is(.LightsOut) [role="button"][data-testid$="-follow"] > :is(div, span) {
            color: rgb(255, 255, 255) !important;
          }
          body.Default [role="button"][data-testid$="-follow"]:hover {
            background-color: rgba(15, 20, 25, 0.1) !important;
          }
          body:is(.LightsOut) [role="button"][data-testid$="-follow"]:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
        `)
      }
      if (config.followButtonStyle == 'themed' && themeColor != null) {
        cssRules.push(`
          /* Following button */
          [role="button"][data-testid$="-unfollow"]:not(:hover) {
            background-color: var(--cpft-theme) !important;
          }
          [role="button"][data-testid$="-unfollow"]:not(:hover) > :is(div, span) {
            color: rgb(255, 255, 255) !important;
          }
          /* Follow button */
          [role="button"][data-testid$="-follow"] {
            border-color: var(--cpft-theme) !important;
          }
          [role="button"][data-testid$="-follow"] > :is(div, span) {
            color: var(--cpft-theme) !important;
          }
          [role="button"][data-testid$="-follow"]:hover {
            background-color: var(--cpft-theme) !important;
          }
          [role="button"][data-testid$="-follow"]:hover > :is(div, span) {
            color: rgb(255, 255, 255) !important;
          }
        `)
      }
      if (mobile) {
        cssRules.push(`
          body.MediaViewer [role="button"][data-testid$="follow"] {
            border: none !important;
            background: transparent !important;
          }
          body.MediaViewer [role="button"][data-testid$="follow"] > div {
            color: var(--cpft-theme) !important;
          }
        `)
      }
    }

    let css = cssRules.map(dedent).join('\n')
    if ($style == null) {
      $style = addStyle(css)
    } else {
      $style.textContent = css
    }
  }
})()

function getColorScheme() {
  return {
    'rgb(255, 255, 255)': 'Default',
    'rgb(0, 0, 0)': 'LightsOut',
    'rgb(5, 5, 5)': 'LightsOut',
  }[$body.style.backgroundColor]
}

/**
 * @param {HTMLElement} $tweet
 * @param {?{getText?: boolean}} options
 * @returns {import("./types").QuotedTweet}
 */
 function getQuotedTweetDetails($tweet, options = {}) {
  let {getText = false} = options
  let $quotedByLink = /** @type {HTMLAnchorElement} */ ($tweet.querySelector('[data-testid="User-Name"] a'))
  let $quotedTweet = $tweet.querySelector('div[id^="id__"] > div[dir] > span').parentElement.nextElementSibling
  let $userName = $quotedTweet?.querySelector('[data-testid="User-Name"]')
  let quotedBy = $quotedByLink?.pathname?.substring(1)
  let user = $userName?.querySelector('[tabindex="-1"]')?.textContent
  let time = $userName?.querySelector('time')?.dateTime
  if (!getText) return {quotedBy, user, time}

  let $heading = $quotedTweet?.querySelector(':scope > div > div:first-child')
  let $qtText = $heading?.nextElementSibling?.querySelector('[lang]')
  let text = $qtText && Array.from($qtText.childNodes, node => {
    if (node.nodeType == 1) {
      if (node.nodeName == 'IMG') return /** @type {HTMLImageElement} */ (node).alt
      return node.textContent
    }
    return node.nodeValue
  }).join('')
  return {quotedBy, user, time, text}
}

/**
 * Attempts to determine the type of a timeline Tweet given the element with
 * data-testid="tweet" on it, falling back to TWEET if it doesn't appear to be
 * one of the particular types we care about.
 * @param {HTMLElement} $tweet
 * @param {?boolean} [checkSocialContext]
 * @returns {import("./types").TweetType}
 */
function getTweetType($tweet, checkSocialContext = false) {
  if ($tweet.closest(Selectors.PROMOTED_TWEET_CONTAINER)) {
    return 'PROMOTED_TWEET'
  }
  if ($tweet.querySelector('[data-testid="socialContext"]')) {
    if (checkSocialContext) {
      // Assume social context tweets are Retweets if we're not checking
      let svgPath = $tweet.querySelector('svg path')?.getAttribute('d') ?? ''
      if (svgPath.startsWith('M7.471 21H.472l.029-1.027c.184')) return 'COMMUNITY_TWEET'
      if (svgPath.startsWith('M13 21l-1 2-1-2v-5H4.5v-2.287l')) return 'PINNED_TWEET'
    }
    // Quoted tweets from accounts you blocked or muted are displayed as an
    // <article> with "This Tweet is unavailable."
    if ($tweet.querySelector('article')) {
      return 'UNAVAILABLE_RETWEET'
    }
    // Quoted tweets are preceded by visually-hidden "Quote" text
    if ($tweet.querySelector('div[id^="id__"] > div[dir] > span')?.textContent.includes(getString('QUOTE'))) {
      return 'RETWEETED_QUOTE_TWEET'
    }
    return 'RETWEET'
  }
  // Quoted tweets are preceded by visually-hidden "Quote" text
  if ($tweet.querySelector('div[id^="id__"] > div[dir] > span')?.textContent.includes(getString('QUOTE'))) {
    return 'QUOTE_TWEET'
  }
  // Quoted tweets from accounts you blocked or muted are displayed as an
  // <article> with "This Tweet is unavailable."
  if ($tweet.querySelector('article')) {
    return 'UNAVAILABLE_QUOTE_TWEET'
  }
  return 'TWEET'
}

// Add 1 every time this gets broken: 6
function getVerifiedProps($svg) {
  let propsGetter = (props) => props?.children?.props?.children?.[0]?.[0]?.props
  let $parent = $svg.parentElement.parentElement
  // Verified badge button on the profile screen
  if (isOnProfilePage() && $svg.parentElement.getAttribute('role') == 'button') {
    $parent = $svg.closest('span').parentElement
  }
  // Link variant in "user followed/liked/retweeted" notifications
  else if (isOnNotificationsPage() && $parent.getAttribute('role') == 'link') {
    propsGetter = (props) => {
      let linkChildren = props?.children?.props?.children?.[0]
      return linkChildren?.[linkChildren.length - 1]?.props
    }
  }
  if ($parent.wrappedJSObject) {
    $parent = $parent.wrappedJSObject
  }
  let reactPropsKey = Object.keys($parent).find(key => key.startsWith('__reactProps$'))
  let props = propsGetter($parent[reactPropsKey])
  if (!props) {
    warn('React props not found for', $svg)
  }
  else if (!('isBlueVerified' in props)) {
    warn('isBlueVerified not in React props for', $svg, {props})
  }
  return props
}

/**
 * @param {HTMLElement} $popup
 * @returns {{tookAction: boolean, onPopupClosed?: () => void}}
 */
function handlePopup($popup) {
  let result = {tookAction: false, onPopupClosed: null}

  // Automatically close the Premium sign up popup
  if (desktop && config.hideTwitterBlueUpsells && location.pathname === '/i/premium_sign_up') {
    tweakPremiumSignUpPage()
    result.tookAction = true
    return result
  }

  // Automatically close any sheet dialog which contains a Premium link
  if (desktop && config.hideTwitterBlueUpsells &&
      $popup.querySelector('[data-testid="mask"]') &&
      $popup.querySelector('[data-testid="sheetDialog"]') &&
      $popup.querySelector('a[href^="/i/premium"]')) {
    log('hidePremiumUpsells: automatically closing Premium upsell dialog')
    let mask = /** @type {HTMLElement} */ ($popup.querySelector('[data-testid="mask"]'))
    mask.click()
    result.tookAction = true
    return result
  }

  if (desktop && config.hideEditImage && location.pathname == PagePaths.PROFILE_SETTINGS) {
    log('hideEditImage: profile settings opened')
    tweakProfileSettingsPage()
    result.tookAction = true
    return result
  }

  if (isOnHomeTimelinePage() &&
      config.sortFollowing != 'ignore' &&
      !userSortedFollowing &&
      $popup.innerHTML.includes(`>${getString('SORT_BY')}<`)) {
    // Pinned Communities also have a Sort by menu, which we should ignore
    let isFollowingTabSelected = Boolean(document.querySelector(`${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} nav div[role="tablist"] > div:nth-child(2) > [role="tab"][aria-selected="true"]`))
    if (!isFollowingTabSelected) return result

    log('sortFollowing: Following Sort by menu opened')
    void (async () => {
      // The Following Sort by menu is hydrated asynchronously on desktop
      let $dropdown = await getElement(mobile ? '[data-testid="sheetDialog"]' : '[role="menu"] [data-testid="Dropdown"]', {
        name: 'Rendered Following Sort by dropdown',
        context: $popup,
      })
      let $menuItems =  /** @type {NodeListOf<HTMLElement>} */ ($dropdown.querySelectorAll('div[role="menuitem"]'))
      let $selectedSvg = $popup.querySelector('div[role="menuitem"] svg')
      for (let [index, $menuItem] of $menuItems.entries()) {
        let shouldBeSelected = index == {popular: 0, mostRecent: 1}[config.sortFollowing]
        if (shouldBeSelected) {
          $menuItem.lastElementChild.append($selectedSvg)
        }
        $menuItem.addEventListener('click', () => {
          userSortedFollowing = true
        })
      }
    })()
    result.tookAction = true
    return result
  }

  if (isOnIndividualTweetPage() &&
      config.sortReplies != 'relevant' &&
      !userSortedReplies &&
      $popup.innerHTML.includes(`>${getString('SORT_REPLIES')}<`)) {
    log('sortReplies: Sort replies menu opened')
    void (async () => {
      // The Sort replies menu is hydrated asynchronously
      let $dropdown = await getElement('[role="menu"] [data-testid="Dropdown"]', {
        name: 'Rendered Sort replies dropdown',
        context: $popup,
      })
      let $menuItems =  /** @type {NodeListOf<HTMLElement>} */ ($dropdown.querySelectorAll('div[role="menuitem"]'))
      let $selectedSvg = $popup.querySelector('div[role="menuitem"] svg')
      for (let [index, $menuItem] of $menuItems.entries()) {
        let shouldBeSelected = index == {recent: 1, liked: 2}[config.sortReplies]
        if (shouldBeSelected) {
          $menuItem.lastElementChild.append($selectedSvg)
        }
        $menuItem.addEventListener('click', () => {
          userSortedReplies = true
        })
      }
    })()
    result.tookAction = true
    return result
  }

  if (desktop && !isDesktopComposeTweetModalOpen &&
      location.pathname.startsWith(PagePaths.COMPOSE_TWEET)) {
    log('Compose Tweet modal opened')
    isDesktopComposeTweetModalOpen = true
    $desktopComposeTweetModalPopup = $popup
    observeDesktopComposeTweetModal($popup)
    return {
      tookAction: true,
      onPopupClosed() {
        log('Compose Tweet modal closed')
        isDesktopComposeTweetModalOpen = false
        $desktopComposeTweetModalPopup = null
        disconnectObservers(modalObservers, 'modal')
        // The Tweet button will re-render if the modal was opened to edit
        // multiple Tweets on the Home timeline.
        if (config.replaceLogo && isOnHomeTimelinePage()) {
          tweakTweetButton()
        }
      }
    }
  }

  if (desktop && !isDesktopMediaModalOpen &&
      URL_MEDIA_RE.test(location.pathname)) {
    log('media modal opened')
    isDesktopMediaModalOpen = true
    observeDesktopModalTimeline($popup)
    return {
      tookAction: true,
      onPopupClosed() {
        log('media modal closed')
        isDesktopMediaModalOpen = false
        disconnectObservers(modalObservers, 'modal')
      }
    }
  }

  if (config.replaceLogo) {
    let $retweetDropdownItem = $popup.querySelector('div:is([data-testid="retweetConfirm"], [data-testid="repostConfirm"])')
    if ($retweetDropdownItem) {
      tweakRetweetDropdown($retweetDropdownItem, 'div:is([data-testid="retweetConfirm"], [data-testid="repostConfirm"])', 'RETWEET')
      return {tookAction: true}
    }

    let $unretweetDropdownItem = $popup.querySelector('div:is([data-testid="unretweetConfirm"], [data-testid="unrepostConfirm"])')
    if ($unretweetDropdownItem) {
      tweakRetweetDropdown($unretweetDropdownItem, 'div:is([data-testid="unretweetConfirm"], [data-testid="unrepostConfirm"])', 'UNDO_RETWEET')
      return {tookAction: true}
    }

    let $hoverLabel = $popup.querySelector('span[data-testid="HoverLabel"] > span')
    if ($hoverLabel?.textContent == getString('REPOST')) {
      $hoverLabel.textContent = getString('RETWEET')
    }
  }

  if (isOnListPage()) {
    let $switchSvg = $popup.querySelector(`svg path[d="M3 2h18.61l-3.5 7 3.5 7H5v6H3V2zm2 12h13.38l-2.5-5 2.5-5H5v10z"]`)
    if ($switchSvg) {
      addToggleListRetweetsMenuItem($popup.querySelector(`[role="menuitem"]`))
      return {tookAction: true}
    }
  }

  if (config.mutableQuoteTweets) {
    if (quotedTweet) {
      let $blockMenuItem = /** @type {HTMLElement} */ ($popup.querySelector(Selectors.BLOCK_MENU_ITEM))
      if ($blockMenuItem) {
        addMuteQuotesMenuItems($blockMenuItem)
        result.tookAction = true
        // Clear the quoted tweet when the popup closes
        result.onPopupClosed = () => {
          quotedTweet = null
        }
      } else {
        quotedTweet = null
      }
    }
  }

  if (config.fastBlock) {
    if (blockMenuItemSeen && blockMenuItemClicked && $popup.querySelector('[data-testid="confirmationSheetConfirm"]')) {
      log('fastBlock: fast blocking')
      ;/** @type {HTMLElement} */ ($popup.querySelector('[data-testid="confirmationSheetConfirm"]')).click()
      blockMenuItemSeen = false
      blockMenuItemClicked = false
      result.tookAction = true
    }
    else if ($popup.querySelector(Selectors.BLOCK_MENU_ITEM)) {
      log('fastBlock: preparing for fast blocking')
      blockMenuItemSeen = true
      blockMenuItemClicked = false
      document.addEventListener('click', (e) => {
        if (e.target instanceof Element && e.target.closest(Selectors.BLOCK_MENU_ITEM)) {
          log('fastBlock: block clicked')
          blockMenuItemClicked = true
        }
      }, {capture: true, once: true})
      // Create a nested observer for mobile, as it reuses the menu popup to
      // display the block dialog.
      result.tookAction = !mobile
    }
    else {
      blockMenuItemSeen = false
      blockMenuItemClicked = false
    }
  }

  if (mobile) {
    let $sidebarSettingsLink = $popup.querySelector('a[href$="/settings"]')
    if ($sidebarSettingsLink) {
      getElement('div:has(> a[href^="https://apps.apple.com/app/apple-store/id333903271"])', {
        name: 'get the app link',
        context: $popup,
        timeout: 100,
      }).then($appAd => $appAd?.classList?.add('HiddenAd'))
    }
  }

  if (config.addAddMutedWordMenuItem) {
    let linkSelector = 'a[href$="/settings"]'
    let $link = /** @type {HTMLElement} */ ($popup.querySelector(linkSelector))
    if ($link) {
      addAddMutedWordMenuItem($link, linkSelector)
      result.tookAction = true
    }
  }

  if (config.twitterBlueChecks != 'ignore') {
    // User typeahead dropdown
    let $typeaheadDropdown = /** @type {HTMLElement} */ ($popup.querySelector('div[id^="typeaheadDropdown"]'))
    if ($typeaheadDropdown) {
      log('typeahead dropdown appeared')
      let observer = observeElement($typeaheadDropdown, () => {
        processBlueChecks($typeaheadDropdown)
      }, 'popup typeahead dropdown')
      return {
        tookAction: true,
        onPopupClosed() {
          log('typeahead dropdown closed')
          observer.disconnect()
        }
      }
    }
  }

  if (desktop && (config.hideGrokNav || config.twitterBlueChecks != 'ignore' || config.addUserHoverCardAccountLocation)) {
    // User hovercard popup
    let $hoverCard = /** @type {HTMLElement} */ ($popup.querySelector('[data-testid="HoverCard"]'))
    if ($hoverCard) {
      result.tookAction = true
      getElement('div[data-testid^="UserAvatar-Container"]', {
        context: $hoverCard,
        name: 'user hovercard contents',
        timeout: 500,
      }).then(($contents) => {
        if (!$contents) return
        if (config.hideGrokNav) {
          // Tag Grok "Profile Summary" button
          let $grokButton = $popup.querySelector('[data-testid="HoverCard"] > div > div > div:last-child:has(> button)')
          if ($grokButton) {
            $grokButton.classList.add('GrokButton')
          }
        }
        if (config.twitterBlueChecks != 'ignore') {
          processBlueChecks($popup)
        }
        if (config.addUserHoverCardAccountLocation) {
          let $followingLink = /** @type {HTMLAnchorElement} */ ($popup.querySelector('[href$="/following"]'))
          if (!$followingLink) return
          let screenName = $followingLink.pathname.split('/')[1]
          if (!screenName) return
          getAccountLocation(screenName).then((accountLocation) => {
            if (!accountLocation || !accountLocation.account_based_in) return
            let $insertionPoint = $followingLink.parentElement.parentElement.parentElement
            let fontSizeNum = parseInt(fontSize)
            $insertionPoint?.insertAdjacentHTML('afterend', `<div class="cpft_text" style="margin-top: ${fontSizeNum - 4}px; line-height: ${fontSizeNum + 1}px; font-size: ${fontSizeNum - 1}px;">
  ${addQuestionMark(getFn('ACCOUNT_BASED_IN_FN')({country: accountLocation.account_based_in}), !accountLocation.location_accurate)}
            </div>`)
          })
        }
      })
    }
  }

  // Verified account popup when you press the check button on a profile page
  if (config.twitterBlueChecks == 'replace' && isOnProfilePage()) {
    if (mobile) {
      let $verificationBadge = /** @type {HTMLElement} */ ($popup.querySelector('[data-testid="sheetDialog"] [data-testid="verificationBadge"]'))
      if ($verificationBadge) {
        result.tookAction = true
        let $headerBlueCheck = document.querySelector(`body.Profile ${Selectors.MOBILE_TIMELINE_HEADER} .cpft_blue_check`)
        if ($headerBlueCheck) {
          blueCheck($verificationBadge)
        }
      }
    } else {
      let $hoverCard = /** @type {HTMLElement} */ ($popup.querySelector('[data-testid="HoverCard"]'))
      if ($hoverCard) {
        result.tookAction = true
        getElement(':scope > div > div > div > svg[data-testid="verificationBadge"]', {
          context: $hoverCard,
          name: 'verified account hovercard verification badge',
          timeout: 500,
        }).then(($verificationBadge) => {
          if (!$verificationBadge) return

          let $headerBlueCheck = document.querySelector(`body.Profile ${Selectors.PRIMARY_COLUMN} > div > div:first-of-type h2 .cpft_blue_check`)
          if (!$headerBlueCheck) return

          // Wait for the hovercard to render its contents
          observeElement($popup, (mutations, observer) => {
            blueCheck($popup.querySelector('svg[data-testid="verificationBadge"]'))
            observer.disconnect()
          }, {
            name: 'verified popup render',
            observers: pageObservers,
           }, {
            childList: true,
            subtree: true,
          })
        })
      }
    }
  }

  return result
}

function isBlueVerified($svg) {
  let props = getVerifiedProps($svg)
  return Boolean(props && props.isBlueVerified && !(
    props.verifiedType || (
      props.affiliateBadgeInfo?.userLabelType == 'BusinessLabel' &&
      props.affiliateBadgeInfo?.description == 'X'
    )
  ))
}

/**
 * @returns {import("./types").VerifiedType}
 */
function getVerifiedType($svg) {
  let props = getVerifiedProps($svg)
  if (props) {
    if (props.affiliateBadgeInfo?.userLabelType == 'BusinessLabel' &&
        props.affiliateBadgeInfo?.description == 'X')
      // Ignore Twitter associated checks
      return null
    if (props.verifiedType == 'Business')
      return 'BUSINESS'
    if (props.verifiedType == 'Government')
      return 'GOVERNMENT'
    if (props.isBlueVerified)
      return 'BLUE'
  }
  return null
}

/**
 * Checks if a tweet is preceded by an element creating a vertical reply line.
 * @param {HTMLElement} $tweet
 * @returns {boolean}
 */
function isReplyToPreviousTweet($tweet) {
  let $replyLine = $tweet.firstElementChild?.firstElementChild?.firstElementChild?.firstElementChild?.firstElementChild?.firstElementChild
  if ($replyLine) {
    return getComputedStyle($replyLine).width == '2px'
  }
}

/**
 * @returns {{disconnect()}}
 */
function onPopup($popup) {
  log('popup appeared', $popup, location.pathname)

  // If handlePopup did something, we don't need to observe nested popups
  let {tookAction, onPopupClosed} = handlePopup($popup)
  if (tookAction) {
    return onPopupClosed ? {disconnect: onPopupClosed} : null
  }

  /** @type {HTMLElement} */
  let $nestedPopup

  let nestedObserver = observeElement($popup, (mutations) => {
    for (let mutation of mutations) {
      for (let $addedNode of mutation.addedNodes) {
        if (!($addedNode instanceof HTMLElement)) continue
        log('nested popup appeared', $addedNode)
        $nestedPopup = $addedNode
        onPopupClosed = handlePopup($addedNode).onPopupClosed
      }
      for (let $removedNode of mutation.removedNodes) {
        if (!($removedNode instanceof HTMLElement) || $removedNode !== $nestedPopup) continue
        if (onPopupClosed) {
          log('cleaning up after nested popup removed')
          onPopupClosed()
        }
      }
    }
  }, 'nested popup observer')

  let disconnect = nestedObserver.disconnect.bind(nestedObserver)
  nestedObserver.disconnect = () => {
    if (onPopupClosed) {
      log('cleaning up after nested popup observer disconnected')
      onPopupClosed()
    }
    disconnect()
  }

  return nestedObserver
}

/**
 * @param {HTMLElement} $timeline
 * @param {string} page
 * @param {import("./types").TimelineOptions?} options
 */
function onTimelineChange($timeline, page, options = {}) {
  let startTime = Date.now()
  let {
    checkSocialContext = false,
    classifyTweets = true,
    hideHeadings = true,
    isUserTimeline = false,
  } = options

  let isOnHomeTimeline = isOnHomeTimelinePage()
  let isOnListTimeline = isOnListPage()
  let isOnProfileTimeline = isOnProfilePage()
  let isOnNotificationsTimeline = isOnNotificationsPage()
  let timelineHasSpecificTweetHandling = isOnHomeTimeline || isOnListTimeline || isOnProfileTimeline

  if (config.twitterBlueChecks != 'ignore' && (isUserTimeline || !timelineHasSpecificTweetHandling)) {
    processBlueChecks($timeline)
  }

  if (isSafari && config.replaceLogo && isOnNotificationsTimeline) {
    processTwitterLogos($timeline)
  }

  restoreTimelineInlineReplies($timeline)
  addTweetActionButtons($timeline)

  if (isUserTimeline || !classifyTweets) return

  let itemTypes = {}
  let hiddenItemCount = 0
  let hiddenItemTypes = {}

  /** @type {?boolean} */
  let hidPreviousItem = null
  /** @type {{$item: Element, hideItem?: boolean}[]} */
  let changes = []

  for (let $item of $timeline.children) {
    /** @type {?import("./types").TimelineItemType} */
    let itemType = null
    /** @type {?boolean} */
    let hideItem = null
    /** @type {?HTMLElement} */
    let $tweet = $item.querySelector(Selectors.TWEET)
    /** @type {boolean} */
    let isReply = false
    /** @type {boolean} */
    let isBlueTweet = false

    if ($tweet != null) {
      itemType = getTweetType($tweet, checkSocialContext)
      if (timelineHasSpecificTweetHandling) {
        isReply = isReplyToPreviousTweet($tweet)
        if (isReply && hidPreviousItem != null) {
          hideItem = hidPreviousItem
        } else {
          if (isOnHomeTimeline) {
            hideItem = shouldHideHomeTimelineItem(itemType, page)
            if (config.mutableQuoteTweets && !hideItem && itemType == 'QUOTE_TWEET' && config.hideQuotesFrom.length > 0) {
              let $quotedByLink = /** @type {HTMLAnchorElement} */ ($tweet.querySelector('[data-testid="User-Name"] a'))
              let quotedBy = $quotedByLink?.pathname.substring(1)
              if (quotedBy) {
                hideItem = config.hideQuotesFrom.includes(quotedBy)
              } else {
                warn('hideQuotesFrom: unable to get quote tweet user')
              }
            }
          }
          else if (isOnListTimeline) {
            hideItem = shouldHideListTimelineItem(itemType)
          }
          else if (isOnProfileTimeline) {
            hideItem = shouldHideProfileTimelineItem(itemType)
          }
        }

        if (!hideItem && config.hideGrokTweets && $tweet.querySelector('a[href^="/i/grok/share/"]')) {
          hideItem = true
        }

        if (!hideItem && config.mutableQuoteTweets && (itemType == 'QUOTE_TWEET' || itemType == 'RETWEETED_QUOTE_TWEET')) {
          if (config.mutedQuotes.length > 0) {
            let quotedTweet = getQuotedTweetDetails($tweet)
            hideItem = config.mutedQuotes.some(muted => muted.user == quotedTweet.user && muted.time == quotedTweet.time)
          }
          if (!hideItem) {
            addCaretMenuListenerForQuoteTweet($tweet)
          }
        }

        if (config.twitterBlueChecks != 'ignore') {
          for (let $svg of $tweet.querySelectorAll(Selectors.VERIFIED_TICK)) {
            let isBlueCheck = isBlueVerified($svg)
            if (!isBlueCheck) continue

            blueCheck($svg)

            // Don't count a tweet as blue if the check is in a quoted tweet
            let userProfileLink = $svg.closest('a[role="link"]:not([href^="/i/status"])')
            if (!userProfileLink) continue

            isBlueTweet = true
          }
        }
      }

      if (!hideItem && config.restoreLinkHeadlines) {
        restoreLinkHeadline($tweet)
      }
    }
    else if (isOnNotificationsTimeline) {
      /** @type {?import("./types").NotificationType} */
      let notificationType = null
      let $iconPath = $item.querySelector('[data-testid="notification"] svg path')?.getAttribute('d')
      if ($iconPath) {
        if ($iconPath.startsWith('M18.766 2H7.323l-4.8 12h5.324l')) {
          notificationType = 'AD'
          hideItem = true
        }
        else if ($iconPath.startsWith('M20.884 13.19c-1.351 2.48-4.00')) {
          notificationType = 'LIKE'
          hideItem = config.hideNotificationLikes
        }
        else if ($iconPath.startsWith('M17.863 13.44c1.477 1.58 2.366')) {
          notificationType = 'FOLLOW'
        }
        else if ($iconPath.startsWith('M4.75 3.79l4.603 4.3-1.706 1.8')) {
          notificationType = 'RETWEET'
          hideItem = config.hideNotificationRetweets
        }
      }
      if (notificationType) {
        itemType = `NOTIFICATION_${notificationType}`
      }
    }
    else if (!timelineHasSpecificTweetHandling) {
      if ($item.querySelector(':scope > div > div > div > article')) {
        itemType = 'UNAVAILABLE'
      }
    }

    if (!timelineHasSpecificTweetHandling && !isOnNotificationsTimeline) {
      if (itemType != null) {
        hideItem = shouldHideOtherTimelineItem(itemType)
      }
    }

    // Special handling for non-Tweet timeline items
    if (itemType == null) {
      if ($item.querySelector('[data-testid="inlinePrompt"]')) {
        itemType = 'INLINE_PROMPT'
        hideItem = config.hideInlinePrompts || (
          config.hideTwitterBlueUpsells && Boolean($item.querySelector('a[href^="/i/premium"]'))
        )
      } else if ($item.querySelector(Selectors.TIMELINE_HEADING)) {
        itemType = 'HEADING'
        hideItem = hideHeadings && config.hideWhoToFollowEtc
      }
    }

    if (debug && itemType != null) {
      $item.firstElementChild.setAttribute('data-item-type', `${itemType}${isReply ? ' / REPLY' : ''}${isBlueTweet ? ' / BLUE' : ''}`)
    }

    // Assume a non-identified item following an identified item is related
    if (itemType == null && hidPreviousItem != null && !isOnNotificationsTimeline) {
      hideItem = hidPreviousItem
      itemType = 'SUBSEQUENT_ITEM'
    }

    if (itemType != null) {
      itemTypes[itemType] ||= 0
      itemTypes[itemType]++
    }

    if (hideItem) {
      hiddenItemCount++
      hiddenItemTypes[itemType] ||= 0
      hiddenItemTypes[itemType]++
    }

    if (hideItem != null && $item.firstElementChild) {
      let hidden = $item.firstElementChild.classList.contains('HiddenTweet')
      if (hidden != hideItem) {
        changes.push({$item, hideItem})
      }
    }

    hidPreviousItem = hideItem
  }

  for (let change of changes) {
    change.$item.firstElementChild.classList.toggle('HiddenTweet', change.hideItem)
  }

  if (debug && config.debugLogTimelineStats) {
    log(
      `processed ${$timeline.children.length} timeline item${s($timeline.children.length)} in ${Date.now() - startTime}ms`,
      itemTypes, `hid ${hiddenItemCount}`, hiddenItemTypes
    )
  }
}

/**
 * @param {HTMLElement} $timeline
 * @param {import("./types").IndividualTweetTimelineOptions} options
 */
function onIndividualTweetTimelineChange($timeline, options) {
  let startTime = Date.now()

  let {seen} = options
  let itemTypes = {}
  let hiddenItemCount = 0
  let hiddenItemTypes = {}
  let processedCount = 0

  /** @type {?boolean} */
  let hidPreviousItem
  /** @type {boolean} */
  let hideAllSubsequentItems = false
  /** @type {string} */
  let tweetPath = options.observers == modalObservers ? location.pathname : currentPagePath
  /** @type {?string} */
  let opScreenName = URL_TWEET_BASE_RE.exec(tweetPath)?.[1]?.toLowerCase()
  /** @type {string} */
  let userScreenName = getUserScreenName()
  /** @type {{$item: Element, hideItem?: boolean}[]} */
  let changes = []
  /** @type {import("./types").UserInfoObject} */
  let userInfo = getUserInfo()
  /** @type {?HTMLElement} */
  let $focusedTweet

  let items = Array.from($timeline.children)
  for (let i = 0; i < items.length; i++) {
    let $item = items[i]
    if (seen.has($item) &&
        // Reprocess Discover More Tweets if they were processed before the Discover More heading
        !(hideAllSubsequentItems && seen.get($item).hidden != config.hideMoreTweets)) {
      let details = seen.get($item)
      hidPreviousItem = details.hidden
      // The focused Tweet renders before any Tweets it was a reply to
      if (details.itemType == 'FOCUSED_TWEET') {
        changes = []
        hiddenItemCount = 0
        hiddenItemTypes = {}
      }
      // The Discover More heading renders after Discover more Tweets(?)
      else if (details.itemType == 'DISCOVER_MORE_HEADING') {
        hideAllSubsequentItems = config.hideMoreTweets
      }
      continue
    }

    /** @type {?import("./types").TimelineItemType} */
    let itemType = null
    /** @type {?boolean} */
    let hideItem = null
    /** @type {?HTMLElement} */
    let $tweet = $item.querySelector(Selectors.TWEET)
    /** @type {boolean} */
    let isFocusedTweet = false
    /** @type {boolean} */
    let isReply = false
    /** @type {import("./types").VerifiedType} */
    let tweetVerifiedType = null
    /** @type {?string} */
    let screenName = null
    /** @type {boolean} */
    let isOp = false
    /** @type {boolean} */
    let isUser = false

    if (hideAllSubsequentItems) {
      hideItem = true
      itemType = 'DISCOVER_MORE_TWEET'
    }
    else if ($tweet != null) {
      isFocusedTweet = $tweet.tabIndex == -1
      isReply = isReplyToPreviousTweet($tweet)
      if (isFocusedTweet) {
        itemType = 'FOCUSED_TWEET'
        hideItem = false
        $focusedTweet = $tweet
      } else {
        itemType = getTweetType($tweet)
        if (isReply && hidPreviousItem != null) {
          hideItem = hidPreviousItem
        } else {
          hideItem = shouldHideIndividualTweetTimelineItem(itemType)
        }
      }

      if (!hideItem && config.hideGrokTweets && $tweet.querySelector('a[href^="/i/grok/share/"]')) {
        hideItem = true
      }

      if (!hideItem && (config.twitterBlueChecks != 'ignore' || config.hideTwitterBlueReplies)) {
        for (let $svg of $tweet.querySelectorAll(Selectors.VERIFIED_TICK)) {
          let verifiedType = getVerifiedType($svg)
          if (!verifiedType) continue

          if (config.twitterBlueChecks != 'ignore' && verifiedType == 'BLUE') {
            blueCheck($svg)
          }

          // Don't count a tweet as verified if the check is in a quoted tweet
          let $userProfileLink = /** @type {HTMLAnchorElement} */ ($svg.closest('a[role="link"]:not([href^="/i/status"])'))
          if (!$userProfileLink) continue

          tweetVerifiedType = verifiedType
          screenName = $userProfileLink.href.split('/').pop()
          isOp = screenName.toLowerCase() == opScreenName
          isUser = screenName == userScreenName
        }

        if (tweetVerifiedType &&
            // Don't hide the focused tweet
            !isFocusedTweet &&
            // Replies to the focused tweet don't have the reply indicator
            !isReply &&
            // Don't hide replies by the OP, as it's their thread
            !isOp &&
            // Don't hide replies by the user if they have Premium
            !isUser) {
          itemType = `${tweetVerifiedType}_REPLY`
          if (config.hideTwitterBlueReplies) {
            let user = userInfo[screenName]
            if (!user && config.debugLogTimelineStats) {
              log('hideTwitterBlueReplies: user info not found for', screenName)
            }
            hideItem = !(
              config.showPremiumReplyBusiness && tweetVerifiedType == 'BUSINESS' ||
              config.showPremiumReplyGovernment && tweetVerifiedType == 'GOVERNMENT' ||
              (user != null && (
                config.showPremiumReplyFollowing && user.following ||
                config.showPremiumReplyFollowedBy && user.followedBy ||
                config.showBlueReplyFollowersCount && user.followersCount >= Number(config.showBlueReplyFollowersCountAmount)
              ))
            )
          }
        }
      }

      if (!hideItem && config.restoreLinkHeadlines) {
        restoreLinkHeadline($tweet)
      }
    }
    else {
      let $article = $item.querySelector('article')
      if ($article) {
        // Deleted or private, unless…
        itemType = 'UNAVAILABLE'
        let $button = $article.querySelector('[role="button"]')
        if ($button) {
          if ($button.textContent == getString('SHOW')) {
            itemType = 'SHOW_MORE'
          }
          else if ($button.textContent == getString('VIEW')) {
            // "This Tweet is from an account you (blocked|muted)." with a View button
            hideItem = config.hideUnavailableQuoteTweets
          }
        }
        else if ($article.textContent == getString('POST_UNAVAILABLE')) {
          // Likely blocked or muted
          hideItem = config.hideUnavailableQuoteTweets
        }
      } else {
        // We need to identify "Show more replies" so it doesn't get hidden if the
        // item immediately before it was hidden.
        let $button = $item.querySelector('button[role="button"]')
        if ($button) {
          if ($button?.textContent == getString('SHOW_MORE_REPLIES')) {
            itemType = 'SHOW_MORE'
          }
        }

        // Hide "More From This Author" → Up to 3 Tweets → "See more" link,
        // working backwards from "See more" once it renders.
        if (itemType == null) {
          let $userLink = $item.querySelector(':scope > div > div > a[href^="/i/user/"]')
          if ($userLink) {
            for (let headingOffset = 2; headingOffset <= 4; headingOffset++) {
              if (seen.get(items[i - headingOffset])?.itemType == 'HEADING') {
                itemType = 'SEE_MORE'
                hideItem = config.hideMoreFromThisAuthor
                for (let j = i - headingOffset; j < i; j++) {
                  if (j < 0 || !items[j]?.firstElementChild) continue
                  changes.push({
                    $item: items[j],
                    hideItem: config.hideMoreFromThisAuthor || seen.get(items[j])?.hidden == true,
                  })
                }
                break
              }
            }
          }
        }

        if (itemType == null) {
          let $heading = $item.querySelector(Selectors.TIMELINE_HEADING)
          if ($heading) {
            // Discover More headings have a description next to them
            if ($heading.nextElementSibling &&
                $heading.nextElementSibling.tagName == 'DIV' &&
                $heading.nextElementSibling.getAttribute('dir') != null) {
              itemType = 'DISCOVER_MORE_HEADING'
              hideItem = config.hideMoreTweets
              hideAllSubsequentItems = config.hideMoreTweets
            } else {
              itemType = 'HEADING'
            }
          }
        }
      }
    }

    if (debug && itemType != null) {
      $item.firstElementChild.setAttribute('data-item-type', `${itemType}${isReply ? ' / REPLY' : ''}${isOp ? ' / OP' : ''}`)
    }

    // Assume a non-identified item following an identified item is related
    if (itemType == null && hidPreviousItem != null) {
      hideItem = hidPreviousItem
      itemType = 'SUBSEQUENT_ITEM'
    }

    if (itemType != null) {
      itemTypes[itemType] ||= 0
      itemTypes[itemType]++
    }

    if (hideItem) {
      hiddenItemCount++
      hiddenItemTypes[itemType] ||= 0
      hiddenItemTypes[itemType]++
    }

    if (isFocusedTweet) {
      // Tweets prior to the focused tweet should never be hidden
      changes = []
      hiddenItemCount = 0
      hiddenItemTypes = {}
    }
    else if (hideItem != null && $item.firstElementChild) {
      let hidden = $item.firstElementChild.classList.contains('HiddenTweet')
      if (hidden != hideItem) {
        changes.push({$item, hideItem})
      }
    }

    if (debug && config.debugLogTimelineStats && (itemType == null || hideItem == null)) {
      warn('unhandled timeline item', {$item, itemType, hideItem})
    }

    hidPreviousItem = hideItem
    seen.set($item, {itemType, hidden: hideItem})
    processedCount++
  }

  for (let change of changes) {
    change.$item.firstElementChild.classList.toggle('HiddenTweet', change.hideItem)
  }

  if ($focusedTweet && !seen.has($focusedTweet)) {
    tweakFocusedTweet($focusedTweet, options)
    seen.set($focusedTweet, {itemType: 'FOCUSED_TWEET', hidden: false})
  }

  restoreTimelineInlineReplies($timeline)
  addTweetActionButtons($timeline)

  if (debug && config.debugLogTimelineStats) {
    log(
      `processed ${processedCount} new thread item${s(processedCount)} in ${Date.now() - startTime}ms`,
      itemTypes, `hid ${hiddenItemCount}`, hiddenItemTypes
    )
  }
}

/**
 * Title format (including notification count):
 * - LTR: (3) ${title} / X
 * - RTL: (3) X \ ${title}
 * @param {string} title
 */
function onTitleChange(title) {
  log('title changed', {title, path: location.pathname})
  if (quoteReaderState && location.pathname != quoteReaderOriginPath) {
    closeQuoteReader({restoreFocus: false})
    hideImagePreview()
  }

  if (checkforDisabledHomeTimeline()) return

  // Ignore leading notification counts in titles
  let notificationCount = ''
  if (TITLE_NOTIFICATION_RE.test(title)) {
    notificationCount = TITLE_NOTIFICATION_RE.exec(title)[0]
    title = title.replace(TITLE_NOTIFICATION_RE, '')
  }

  // After we replace the shortcut icon, Twitter stops updating it to add/remove
  // the notifications pip, so we need to manage the pip ourselves.
  if (config.replaceLogo) {
    observeFavicon.forceUpdate(Boolean(notificationCount))
  }

  let route = getCurrentRoute()

  // Ignore Flash of Uninitialised Title when navigating to a page for the first
  // time, except on pages we've identified as not setting a title, including
  // when they're rendered beneath a desktop modal.
  if (!title || title == 'X' || title == getString('TWITTER')) {
    // On mobile, the media viewer sets an empty title
    if (mobile && (URL_MEDIA_RE.test(route.urlPath) || URL_MEDIAVIEWER_RE.test(route.urlPath))) {
      log('viewing media on mobile')
    }
    // On mobile, the Premium sign up page sets an empty title
    else if (mobile && route.urlPath == '/i/premium_sign_up') {
      log('viewing Premium sign up page on mobile')
    }
    // On desktop, the root Settings page sets an empty title when the sidebar
    // is hidden.
    else if (desktop && route.pagePath == '/settings') {
      log('viewing root Settings page')
    }
    // Chat has an empty title
    else if (route.pagePath.startsWith('/i/chat')) {
      log('viewing Chat page')
    }
    else {
      log('ignoring Flash of Uninitialised Title')
      return
    }
  }

  let homeNavigationWasUsed = homeNavigationIsBeingUsed
  homeNavigationIsBeingUsed = false

  // Remove " / Twitter" or "Twitter \ " from the title
  let newPage = title
  if (newPage != 'X' && newPage != getString('TWITTER')) {
    newPage = title.slice(...ltr ? [0, title.lastIndexOf('/') - 1] : [title.indexOf('\\') + 2])
  }

  let hasDesktopModalRouteChanged = lastUrlPath != route.urlPath && (lastUrlWasModal || route.isModal)
  // Closing a modal can rebuild its background without changing the title
  let hasDesktopModalBeenClosed = lastUrlWasModal && !route.isModal
  lastUrlWasModal = route.isModal

  // A modal can change screens without changing the underlying page or title
  if (desktop && lastUrlPath != route.urlPath) {
    handleDesktopModalRouteChange(route.urlPath)
  }

  if (newPage == currentPage && route.pagePath == currentPagePath && !hasDesktopModalBeenClosed) {
    // The History page re-renders everything when you switch tabs
    if (route.urlPath.startsWith(PagePaths.HISTORY) && lastUrlPath != route.urlPath) {
      log('viewing History page')
    } else {
      log(`ignoring duplicate title change`)
      currentNotificationCount = notificationCount
      lastUrlPath = route.urlPath
      return
    }
  }

  // Search terms are shown in the title
  if (lastUrlPath == PagePaths.SEARCH && route.urlPath == PagePaths.SEARCH) {
    log('ignoring title change on Search page')
    currentNotificationCount = notificationCount
    return
  }

  // On desktop, stay on the separated tweets timeline when…
  if (desktop && currentPage == separatedTweetsTimelineTitle &&
      // …the title has changed back to the Home timeline…
      (newPage == getString('HOME')) &&
      // …the Home nav link or Following / Home header _wasn't_ clicked and…
      !homeNavigationWasUsed &&
      (
        // …a desktop modal route changed.
        hasDesktopModalRouteChanged ||
        // …the notification count in the title changed.
        notificationCount != currentNotificationCount
      )) {
    log('ignoring title change on separated tweets timeline')
    currentNotificationCount = notificationCount
    lastUrlPath = route.urlPath
    setTitle(separatedTweetsTimelineTitle)
    if (hasDesktopModalBeenClosed) processCurrentPage(route)
    return
  }

  // Restore display of the separated tweets timelne if it's the last one we
  // saw, and the user navigated back home without using the Home navigation
  // item.
  if (route.urlPath == PagePaths.HOME &&
      lastUrlPath != PagePaths.HOME &&
      !homeNavigationWasUsed &&
      lastHomeTimelineTitle != null &&
      separatedTweetsTimelineTitle != null &&
      lastHomeTimelineTitle == separatedTweetsTimelineTitle) {
    log('restoring display of the separated tweets timeline')
    currentNotificationCount = notificationCount
    lastUrlPath = route.urlPath
    setTitle(separatedTweetsTimelineTitle)
    return
  }

  // Assumption: all non-FOUT, non-duplicate title changes are navigation, which
  // need the page to be re-processed.

  currentPage = newPage
  currentNotificationCount = notificationCount
  lastUrlPath = route.urlPath

  if (route.pagePath == PagePaths.HOME) {
    lastHomeTimelineTitle = currentPage
  }

  log('processing new page')

  processCurrentPage(route)
}

/** @param {string} path */
function handleDesktopModalRouteChange(path) {
  if (!isDesktopComposeTweetModalOpen) return
  // Any sub-screen can replace the editor, including ones outside /compose/post
  if (lastUrlPath == PagePaths.COMPOSE_TWEET && path != PagePaths.COMPOSE_TWEET) {
    log('navigated away from Compose Tweet editor')
    disconnectObservers(modalObservers, 'modal')
  }
  else if (lastUrlPath != PagePaths.COMPOSE_TWEET && path == PagePaths.COMPOSE_TWEET) {
    log('navigated back to Compose Tweet editor')
    observeDesktopComposeTweetModal($desktopComposeTweetModalPopup)
  }
}

/**
 * Processes all Twitter Blue checks inside an element.
 * @param {HTMLElement} $el
 */
function processBlueChecks($el) {
  for (let $svg of $el.querySelectorAll(`${Selectors.VERIFIED_TICK}:not(.cpft_blue_check)`)) {
    if (isBlueVerified($svg)) {
      blueCheck($svg)
    }
  }
}

/**
 * Processes all Twitter logos inside an element.
 */
function processTwitterLogos($el) {
  for (let $svgPath of $el.querySelectorAll(Selectors.X_LOGO_PATH)) {
    twitterLogo($svgPath)
  }
}

function processCurrentPage(route = getCurrentRoute()) {
  // Startup can re-render before the initial page title has been handled
  if (!lastUrlPath) return
  disconnectObservers(pageObservers, 'page')
  currentPagePath = route.pagePath

  // Hooks for styling pages
  if (!$body) $body = document.body
  $body.classList.toggle('Community', isOnCommunityPage())
  $body.classList.toggle('Communities', isOnCommunitiesPage())
  $body.classList.toggle('Explore', isOnExplorePage())
  $body.classList.toggle('HideSidebar', shouldHideSidebar())
  $body.classList.toggle('History', isOnHistoryPage())
  $body.classList.toggle('List', isOnListPage())
  $body.classList.toggle('HomeTimeline', isOnHomeTimelinePage())
  $body.classList.toggle('Notifications', isOnNotificationsPage())
  $body.classList.toggle('Profile', isOnProfilePage())
  if (!isOnProfilePage()) {
    $body.classList.remove('OwnProfile', 'PremiumProfile')
  }
  if (!isOnFollowListPage()) {
    $body.classList.remove('Subscriptions')
  }
  $body.classList.toggle('QuoteTweets', isOnQuoteTweetsPage())
  $body.classList.toggle('Tweet', isOnIndividualTweetPage())
  $body.classList.toggle('Search', isOnSearchPage())
  $body.classList.toggle('Settings', isOnSettingsPage())
  $body.classList.toggle('MobileMedia', mobile && URL_MEDIA_RE.test(location.pathname))
  $body.classList.toggle('MediaViewer', mobile && URL_MEDIAVIEWER_RE.test(location.pathname))
  $body.classList.toggle('ComposeTweetPage', mobile && isOnComposeTweetPage())
  // Always remove this as it's a fake page
  $body.classList.remove('SeparatedTweets')

  if (desktop) {
    if (!isOnCallsPage() && !isOnChatPage() && !isOnGrokPage() && !isOnSettingsPage()) {
      observeSidebar()
    } else {
      $body.classList.remove('Sidebar')
    }
    if (isSafari && config.replaceLogo) {
      tweakDesktopLogo()
    }
  }

  if (isSafari && config.replaceLogo) {
    tweakHomeIcon()
    tweakTweetIcon()
  }

  if (config.twitterBlueChecks != 'ignore' && (isOnSearchPage() || isOnExplorePage())) {
    observeSearchForm()
  }

  if (isOnHomeTimelinePage()) {
    tweakHomeTimelinePage()
  }
  else {
    removeMobileTimelineHeaderElements()
  }

  if (isOnProfilePage()) {
    tweakProfilePage()
  }
  else if (isOnFollowListPage()) {
    tweakFollowListPage()
  }
  else if (isOnIndividualTweetPage()) {
    tweakIndividualTweetPage()
  }
  else if (isOnNotificationsPage()) {
    tweakNotificationsPage()
  }
  else if (isOnSearchPage()) {
    tweakSearchPage()
  }
  else if (URL_TWEET_INTERACTIONS_RE.test(currentPagePath)) {
    tweakTweetEngagementPage()
  }
  else if (isOnListPage()) {
    tweakListPage()
  }
  else if (isOnListsPage()) {
    tweakListsPage()
  }
  else if (isOnExplorePage()) {
    tweakExplorePage()
  }
  else if (isOnHistoryPage()) {
    tweakHistoryPage()
  }
  else if (isOnCommunitiesPage()) {
    tweakCommunitiesPage()
  }
  else if (isOnCommunityPage()) {
    tweakCommunityPage()
  }
  else if (isOnCommunityMembersPage()) {
    tweakCommunityMembersPage()
  }
  else if (isOnCallsPage()) {
    tweakCallsPage()
  }
  else if (isOnChatPage()) {
    tweakChatPage()
  }
  else if (isOnDisplaySettingsPage() || isOnAccessibilitySettingsPage()) {
    tweakDisplaySettingsPage()
  }
  else if (isOnPremiumSignupPage()) {
    tweakPremiumSignUpPage()
  }

  // On mobile, these are pages instead of modals
  if (mobile) {
    if (isOnComposeTweetPage()) {
      tweakMobileComposeTweetPage()
    }
    else if (URL_MEDIAVIEWER_RE.test(lastUrlPath)) {
      tweakMobileMediaViewerPage()
    }
    else if (lastUrlPath.startsWith(PagePaths.PROFILE_SETTINGS)) {
      tweakProfileSettingsPage()
    }
  }
}

/**
 * The mobile version of Twitter reuses heading elements between screens, so we
 * always remove any elements which could be there from the previous page and
 * re-add them later when needed.
 */
function removeMobileTimelineHeaderElements() {
  if (mobile) {
    document.querySelector('#cpftSeparatedTweetsTab')?.remove()
  }
}

/**
 * @param {HTMLElement} $tweet
 */
function restoreLinkHeadline($tweet) {
  let $link = /** @type {HTMLElement} */ ($tweet.querySelector(
    // Exclude Install button cards in Grok tweets
    'div[data-testid="card.layoutLarge.media"] > a[rel][aria-label]:not([href="https://itunes.apple.com/app/id6670324846"])'
  ))
  if ($link && !$link.dataset.headlineRestored) {
    let [site, ...rest] = $link.getAttribute('aria-label').split(' ')
    let headline = rest.join(' ')
    $link.lastElementChild?.classList.add('cpft_overlay_headline')
    $link.insertAdjacentHTML('beforeend', `<div class="cpft_link_headline ${fontFamilyRule?.selectorText?.replace('.', '') || 'cpft_font_family'}" hidden>
      <div style="color: var(--cpft-text-secondary); margin-bottom: 2px;">${site}</div>
      <div style="color: var(--cpft-text-primary)">${headline}</div>
    </div>`)
    $link.dataset.headlineRestored = 'true'
  }
}

/**
 * @param {{
 *   $actionBar: HTMLElement
 *   $focusedTweet: HTMLElement
 *   tweetInfo: any
 *   isOwnTweet: boolean
 *   tweetPath: string
 * }} options
 */
function restoreTweetInteractionsLinks({$actionBar, $focusedTweet, tweetInfo, isOwnTweet, tweetPath}) {
  if (!config.restoreQuoteTweetsLink && !config.restoreOtherInteractionLinks) return

  if (!tweetInfo) {
    warn('restoreTweetInteractionsLinks: focused tweet info not available')
    return
  }

  let shouldDisplayLinks = (
    (config.restoreQuoteTweetsLink && tweetInfo.quote_count > 0) ||
    (config.restoreOtherInteractionLinks && (tweetInfo.retweet_count > 0 || isOwnTweet && tweetInfo.favorite_count > 0))
  )
  let $existingLinks = $focusedTweet.querySelector('#cpftInteractionLinks')
  if (!shouldDisplayLinks || $existingLinks) {
    if (!shouldDisplayLinks) $existingLinks?.remove()
    return
  }

  let tweetLink = tweetPath.match(URL_TWEET_BASE_RE)?.[0]
  $actionBar.insertAdjacentHTML('beforebegin', `
    <div id="cpftInteractionLinks" hidden>
      <div class="${fontFamilyRule?.selectorText?.replace('.', '') || 'cpft_font_family'}" style="padding: 16px 4px; border-top: 1px solid var(--cpft-border); display: flex; gap: 20px;">
        ${tweetInfo.quote_count > 0 ? `<a id="cpftQuoteTweetsLink" class="quoteTweets" href="${tweetLink}/quotes" dir="auto" role="link">
          <span id="cpftQuoteTweetCount">
            ${Intl.NumberFormat(lang, {notation: tweetInfo.quote_count < 10000 ? 'standard' : 'compact', compactDisplay: 'short'}).format(tweetInfo.quote_count)}
          </span>
          <span>${getString(tweetInfo.quote_count == 1 ? (config.replaceLogo ? 'QUOTE_TWEET' : 'QUOTE') : (config.replaceLogo ? 'QUOTE_TWEETS' : 'QUOTES'))}</span>
        </a>` : ''}
        ${tweetInfo.retweet_count > 0 ? `<a id="cpftRetweetsLink" data-tab="2" href="${tweetLink}/retweets" dir="auto" role="link">
          <span id="cpftRetweetCount">
            ${Intl.NumberFormat(lang, {notation: tweetInfo.retweet_count < 10000 ? 'standard' : 'compact', compactDisplay: 'short'}).format(tweetInfo.retweet_count)}
          </span>
          <span>${getString(config.replaceLogo ? 'RETWEETS' : 'REPOSTS')}</span>
        </a>` : ''}
        ${isOwnTweet && tweetInfo.favorite_count > 0 ? `<a id="cpftLikesLink" data-tab="3" href="${tweetLink}/likes" dir="auto" role="link">
          <span id="cpftLikeCount">
            ${Intl.NumberFormat(lang, {notation: tweetInfo.favorite_count < 10000 ? 'standard' : 'compact', compactDisplay: 'short'}).format(tweetInfo.favorite_count)}
          </span>
          <span>${getString('LIKES')}</span>
        </a>` : ''}
      </div>
    </div>
  `)

  let $links = /** @type {NodeListOf<HTMLAnchorElement>} */ ($focusedTweet.querySelectorAll('#cpftInteractionLinks a'))
  for (let $link of $links) {
    $link.addEventListener('click', (e) => {
      e.preventDefault()
      History_push?.({
        pathname: $link.pathname,
        hash: '',
        query: {},
        search: '',
      })
    })
  }
}

/**
 * Sets the page name in <title>, retaining any current notification count.
 * @param {string} page
 */
function setTitle(page) {
  let name = config.replaceLogo ? getString('TWITTER') : 'X'
  let notificationCount = config.hideNotifications != 'ignore' ? (
    ''
  ) : (
    hiddenNotificationCount || currentNotificationCount
  )
  document.title = ltr ? (
    `${notificationCount}${page} / ${name}`
  ) : (
    `${notificationCount}${name} \\ ${page}`
  )
}

/**
 * @param {import("./types").TimelineItemType} type
 * @returns {boolean}
 */
 function shouldHideIndividualTweetTimelineItem(type) {
  switch (type) {
    case 'QUOTE_TWEET':
    case 'RETWEET':
    case 'RETWEETED_QUOTE_TWEET':
    case 'TWEET':
      return false
    case 'UNAVAILABLE_QUOTE_TWEET':
    case 'UNAVAILABLE_RETWEET':
      return config.hideUnavailableQuoteTweets
    default:
      return true
  }
}

/**
 * @param {import("./types").TimelineItemType} type
 * @returns {boolean}
 */
function shouldHideListTimelineItem(type) {
  switch (type) {
    case 'RETWEET':
    case 'RETWEETED_QUOTE_TWEET':
      return config.listRetweets == 'hide'
    case 'UNAVAILABLE_QUOTE_TWEET':
      return config.hideUnavailableQuoteTweets
    case 'UNAVAILABLE_RETWEET':
      return config.hideUnavailableQuoteTweets || config.listRetweets == 'hide'
    default:
      return false
  }
}

/**
 * @param {import("./types").TimelineItemType} type
 * @param {string} page
 * @returns {boolean}
 */
function shouldHideHomeTimelineItem(type, page) {
  switch (type) {
    case 'QUOTE_TWEET':
      return shouldHideSharedTweet(config.quoteTweets, page)
    case 'RETWEET':
      return selectedHomeTabIndex >= 2 ? config.listRetweets == 'hide' : shouldHideSharedTweet(config.retweets, page)
    case 'RETWEETED_QUOTE_TWEET':
      return selectedHomeTabIndex >= 2 ? (
          config.listRetweets == 'hide'
        ) : (
          shouldHideSharedTweet(config.retweets, page) || shouldHideSharedTweet(config.quoteTweets, page)
        )
    case 'COMMUNITY_TWEET':
    case 'TWEET':
      return page == separatedTweetsTimelineTitle
    case 'UNAVAILABLE_QUOTE_TWEET':
      return config.hideUnavailableQuoteTweets || shouldHideSharedTweet(config.quoteTweets, page)
    case 'UNAVAILABLE_RETWEET':
      return config.hideUnavailableQuoteTweets || selectedHomeTabIndex >= 2 ? config.listRetweets == 'hide' : shouldHideSharedTweet(config.retweets, page)
    default:
      return true
  }
}

/**
 * @param {import("./types").TimelineItemType} type
 * @returns {boolean}
 */
function shouldHideProfileTimelineItem(type) {
  switch (type) {
    case 'COMMUNITY_TWEET':
    case 'PINNED_TWEET':
    case 'QUOTE_TWEET':
    case 'TWEET':
      return false
    case 'RETWEET':
    case 'RETWEETED_QUOTE_TWEET':
      return config.hideProfileRetweets
    case 'UNAVAILABLE_QUOTE_TWEET':
      return config.hideUnavailableQuoteTweets
    default:
      return true
  }
}

/**
 * @param {import("./types").TimelineItemType} type
 * @returns {boolean}
 */
 function shouldHideOtherTimelineItem(type) {
  switch (type) {
    case 'COMMUNITY_TWEET':
    case 'QUOTE_TWEET':
    case 'RETWEET':
    case 'RETWEETED_QUOTE_TWEET':
    case 'TWEET':
    case 'UNAVAILABLE':
    case 'UNAVAILABLE_QUOTE_TWEET':
    case 'UNAVAILABLE_RETWEET':
      return false
    default:
      return true
  }
}

/**
 * @param {import("./types").SharedTweetsConfig} config
 * @param {string} page
 * @returns {boolean}
 */
function shouldHideSharedTweet(config, page) {
  switch (config) {
    case 'hide': return true
    case 'ignore': return page == separatedTweetsTimelineTitle
    case 'separate': return page != separatedTweetsTimelineTitle
  }
}

function tweakCallsPage() {
  let styles = styleEmbed('[data-testid="xcallsRemoteHost"]', ':is([data-xcalls-root], [data-xcalls-portal])')
  let name = 'Calls page styles'
  pageObservers.set(name, {
    name,
    disconnect() {
      styles.disconnect()
      pageObservers.delete(name)
    },
  })
}

function tweakChatPage() {
  let styles = styleEmbed('[data-testid="xchatEmbedRoute"]', ':is([data-xchat-root], [data-xchat-portal])')
  let name = 'Chat page styles'
  pageObservers.set(name, {
    name,
    disconnect() {
      styles.disconnect()
      pageObservers.delete(name)
    },
  })
}

async function tweakHistoryPage() {
  if (config.twitterBlueChecks != 'ignore' || config.restoreLinkHeadlines) {
    observeTimeline(currentPage)
  }
}

async function tweakExplorePage() {
  if (!config.hideExplorePageContents) {
    if (config.twitterBlueChecks != 'ignore') {
      observeTimeline(currentPage, {
        classifyTweets: false,
        isTabbed: true,
        tabbedTimelineContainerSelector: 'div[data-testid="primaryColumn"] > div > div:last-child > div',
      })
    }
    return
  }

  let $searchInput = await getElement('input[data-testid="SearchBox_Search_Input"]', {
    name: 'explore page search input',
    stopIf: () => !isOnExplorePage(),
  })
  if (!$searchInput) return

  log('focusing search input')
  $searchInput.focus()

  if (mobile) {
    // The back button appears after the search input is focused on mobile. When
    // you tap it or otherwise navigate back, it's replaced with the slide-out
    // menu button and Explore page contents are shown - we want to skip that.
    let $backButton = await getElement('div[data-testid="app-bar-back"]', {
      name: 'back button',
      stopIf: () => !isOnExplorePage(),
    })
    if (!$backButton) return

    observeElement($backButton.parentElement, (mutations) => {
      for (let mutation of mutations) {
        for (let $addedNode of mutation.addedNodes) {
          if (!($addedNode instanceof HTMLElement)) continue
          if ($addedNode.querySelector('[data-testid="DashButton_ProfileIcon_Link"]')) {
            log('slide-out menu button appeared, going back to skip Explore page')
            history.go(-2)
            return
          }
        }
      }
    }, {
      name: 'back button parent',
      observers: pageObservers,
    })
  }
}

function tweakCommunitiesPage() {
  observeTimeline(currentPage)
}

function tweakCommunityPage() {
  if (config.twitterBlueChecks != 'ignore') {
    observeTimeline(currentPage, {
      classifyTweets: false,
      isTabbed: true,
      tabbedTimelineContainerSelector: `${Selectors.PRIMARY_COLUMN} > div > div:last-child`,
      onTimelineAppeared() {
        // The About tab has static content at the top which can include a check
        if (/\/about\/?$/.test(currentPagePath)) {
          processBlueChecks(document.querySelector(Selectors.PRIMARY_COLUMN))
        }
      }
    })
  }
}

function tweakCommunityMembersPage() {
  if (config.twitterBlueChecks != 'ignore') {
    observeTimeline(currentPage, {
      classifyTweets: false,
      isTabbed: true,
      timelineSelector: 'div[data-testid="primaryColumn"] > div > div:last-child',
    })
  }
}

function tweakDisplaySettingsPage() {
  if (desktop) {
    observeElement($html, () => {
      if (!$html.style.fontSize) return

      if ($html.style.fontSize != fontSize) {
        fontSize = $html.style.fontSize
        log(`<html> fontSize has changed to ${fontSize}`)
        configureDynamicCss()
        observePopups()
        observeSideNavItems()
      }
    }, {
      name: '<html> style attribute for font size changes',
      observers: pageObservers,
    }, {
      attributes: true,
      attributeFilter: ['style']
    })
  }
}

function restoreTweetSource($permalinkBar, tweetInfo) {
  if (!config.restoreTweetSource) return
  if ($permalinkBar.hasAttribute('cpft-tweet-source-restored')) return
  if (!tweetInfo?.source_name) {
    warn('source_name not available in focused tweet info', tweetInfo)
    return
  }
  let $separator = document.createElement('span')
  $separator.className = 'TweetSource cpft_separator cpft_text'
  $separator.setAttribute('aria-hidden', 'true')
  $separator.setAttribute('hidden', '')
  $separator.textContent = '·'
  let $sourceLabel = document.createElement('span')
  $sourceLabel.className = 'TweetSource cpft_text'
  $sourceLabel.setAttribute('hidden', '')
  $sourceLabel.textContent = tweetInfo.source_name
  $permalinkBar.append($separator, $sourceLabel)
  $permalinkBar.setAttribute('cpft-tweet-source-restored', '')
}

/**
 * @param {HTMLElement} $focusedTweet
 * @param {import("./types").IndividualTweetTimelineOptions} options
 */
async function tweakFocusedTweet($focusedTweet, options) {
  log('tweaking focused tweet')
  let {observers} = options
  let $permalinkBar = $focusedTweet.querySelector('div:has(> div > a > time)')
  let tweetPath = $permalinkBar?.querySelector('a:has(> time)')?.getAttribute('href') || (
    observers == modalObservers ? location.pathname : currentPagePath
  )
  let focusedTweetUrlMatch = tweetPath.match(URL_TWEET_BASE_RE)
  let screenName = focusedTweetUrlMatch?.[1]
  let tweetId = focusedTweetUrlMatch?.[2]
  let tweetInfo = getTweetInfo(tweetId)
  let isOwnTweet = isOnOwnTweetPage(tweetPath)

  // Tag View elements and restore Tweet source
  if ($permalinkBar) {
    $permalinkBar.children[1]?.classList.toggle('Views', config.hideViews)
    $permalinkBar.children[2]?.classList.toggle('Views', config.hideViews)
    restoreTweetSource($permalinkBar, tweetInfo)
    addAccountLocationToFocusedTweet($permalinkBar, screenName)
  } else {
    warn('focused tweet permalink bar not found')
  }

  let $actionBar = /** @type {HTMLElement} */ ($focusedTweet.querySelector('div:has(> [role="group"][id^="id__"])'))
  let $underActionBar = $actionBar?.nextElementSibling
  if ($actionBar) {
    $actionBar.id = 'cpftFocusedTweetActionBar'
    restoreTweetInteractionsLinks({$actionBar, $focusedTweet, tweetInfo, isOwnTweet, tweetPath})
  } else {
    warn('focused tweet action bar not found')
  }

  if ($underActionBar) {
    let $sortRepliesButton = $underActionBar.querySelector('button[aria-haspopup="menu"]')
    if ($sortRepliesButton) {
      if (config.hideSortRepliesMenu) {
        getClosestChild($sortRepliesButton, $underActionBar)?.classList.add('SortRepliesMenu')
      }
      // Replace the default Sort replies text with the sort we're applying
      else if (config.sortReplies != 'relevant' && !userSortedReplies) {
        let $buttonText = $sortRepliesButton.querySelector('span')
        if ($buttonText) $buttonText.textContent = {
          liked: getString('LIKES'),
          recent: getString('RECENT'),
        }[config.sortReplies]
      }
    }

    let $viewActivity = $underActionBar.querySelector('a[href$="/quotes"]')
    getClosestChild($viewActivity, $underActionBar)?.classList.add('ViewActivity')
  }

  if (isOwnTweet) {
    if (config.hideTwitterBlueUpsells && !$focusedTweet.hasAttribute('cpft-premium-upsells-tagged')) {
      run(async () => {
        let $premiumUpsell = await getElement('div:has(> div[style] > button ~ div a:is([href="/i/account_analytics"], [href^="/i/premium"]))', {
          context: $focusedTweet,
          name: 'own focused Tweet premium upsell',
          timeout: 500,
          stopIf: pageIsNot(currentPage)
        })
        if (!$premiumUpsell) return
        $premiumUpsell.classList.add('PremiumUpsell')
      })
      $focusedTweet.setAttribute('cpft-premium-upsells-tagged', 'true')
    }
  }

  if (desktop && config.replaceLogo) {
    void async function() {
      let $editorRoot = await getElement('.DraftEditor-root', {
        context: $focusedTweet.parentElement,
        name: 'tweet editor in focused tweet',
        timeout: 1000,
        stopIf: pageIsNot(currentPage)
      })
      if (!$editorRoot) return
      observeDesktopTweetEditorPlaceholder($editorRoot, {
        name: 'tweet editor',
        placeholder: getString('TWEET_YOUR_REPLY'),
        observers,
      })
    }()
  }
}

async function tweakFollowListPage() {
  // Fallback for direct navigation
  if (config.hideVerifiedNotificationsTab && lastUrlPath.endsWith('/verified_followers')) {
    History_replace?.(lastUrlPath.replace(/verified_followers$/, 'followers'))
    return
  }

  if (config.twitterBlueChecks != 'ignore') {
    observeTimeline(currentPage, {
      classifyTweets: false,
    })
  }

  let $followListTabs = await getElement(`${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} nav`, {
    name: 'Follow list tabs',
    stopIf: () => !isOnFollowListPage(),
  })
  if ($followListTabs) {
    let $tabsContainer = $followListTabs.parentElement
    // Tabs <nav> will be replaced when dynamic tabs load
    observeElement($tabsContainer, () => {
      $tabsContainer.querySelector('div:has(> a[href$="/verified_followers"])')?.classList?.add('VerifiedFollowersTab')
      $tabsContainer.querySelector('div:has(> a[href$="/subscriptions"])')?.classList?.add('SubscriptionsTab')
    }, {
      name: 'Follow list tabs container',
      observers: pageObservers,
      leading: true,
    })
  }
}

async function tweakIndividualTweetPage() {
  userSortedReplies = false
  observeIndividualTweetTimeline(currentPage)

  if (config.replaceLogo) {
    (async () => {
      let $headingText = await getElement(`${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} h2 span`, {
        name: 'tweet thread heading',
        stopIf: pageIsNot(currentPage)
      })
      if ($headingText && $headingText.textContent != getString('TWEET')) {
        $headingText.textContent = getString('TWEET')
      }
    })()
  }
}

function tweakListPage() {
  observeTimeline(currentPage, {
    checkSocialContext: true,
    hideHeadings: false,
  })
}

async function tweakListsPage() {
  if (config.hideMoreTweets) {
    // Hide Discover new Lists
    let $showMoreLink = await getElement('a[href="/i/lists/suggested"]', {
      name: 'Show more link',
      stopIf: pageIsNot(currentPage),
    })
    if (!$showMoreLink) return
    let $timelineItem = $showMoreLink.closest('[data-testid="cellInnerDiv"]')
    if (!$timelineItem) {
      warn('could not find timeline item containing Show more link')
      return
    }
    let $timelineItems = $timelineItem.parentElement.children
    let showMoreIndex = Array.prototype.indexOf.call($timelineItems, $timelineItem)
    for (let i = 1; i <= showMoreIndex + 2; i++) {
      $timelineItems[i].classList.add('SuggestedContent')
    }
  }
}

async function tweakDesktopLogo() {
  let $logoPath = await getElement(`h1 ${Selectors.X_LOGO_PATH}, h1 ${Selectors.X_DARUMA_LOGO_PATH}`, {
    name: 'desktop nav logo',
    timeout: 5000,
  })
  if ($logoPath) {
    twitterLogo($logoPath)
  }
}

async function tweakHomeIcon() {
  let $homeIconPath = await getElement(`${Selectors.NAV_HOME_LINK} svg path`, {name: 'Home icon', stopIf: pageIsNot(currentPage)})
  if ($homeIconPath) {
    // Safari doesn't support using `d: path(…)` to replace paths in an SVG, so
    // we have to manually patch the path in it.
    let replacementPath = {
      [Svgs.X_HOME_ACTIVE_PATH]: Svgs.TWITTER_HOME_ACTIVE_PATH,
      [Svgs.X_HOME_INACTIVE_PATH]: Svgs.TWITTER_HOME_INACTIVE_PATH,
    }[$homeIconPath.getAttribute('d')]
    if (replacementPath) {
      $homeIconPath.setAttribute('d', replacementPath)
    }
  }
}

async function tweakTweetIcon() {
  let $iconPath = document.querySelector(`:is([data-testid="SideNav_NewTweet_Button"], [data-testid="FloatingActionButtons_Tweet_Button"]) path[d="${Svgs.PLUS_PATH}"]`)
  if ($iconPath) {
    // Safari doesn't support using `d: path(…)` to replace paths in an SVG, so
    // we have to manually patch the path in it.
    if ($iconPath.getAttribute('d') != Svgs.TWITTER_FEATHER_PLUS_PATH) {
      $iconPath.setAttribute('d', Svgs.TWITTER_FEATHER_PLUS_PATH)
    }
  }
}

/**
 * Restores "Tweet" button text.
 */
async function tweakTweetButton() {
  let $tweetButton = await getElement(`${desktop ? 'div[data-testid="primaryColumn"]': 'main'} button[data-testid^="tweetButton"]`, {
    name: 'tweet button',
    stopIf: pageIsNot(currentPage),
  })
  if ($tweetButton) {
    let $text = $tweetButton.querySelector('span > span')
    if ($text) {
      setTweetButtonText($text)
    } else {
      warn('could not find Tweet button text')
    }
  }
}

function tweakHomeTimelinePage() {
  let $timelineTabs = document.querySelector(`${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} nav`)

  // Hook for styling when on the separated tweets tab
  $body.classList.toggle('SeparatedTweets', isOnSeparatedTweetsTimeline())

  if ($timelineTabs == null) {
    warn('could not find Home timeline tabs')
    return
  }

  let $manageTimelinesButton = $timelineTabs.parentElement.nextElementSibling
  if ($manageTimelinesButton?.querySelector('path[d="M11 11V4h2v7h7v2h-7v7h-2v-7H4v-2h7z"]')) {
    $manageTimelinesButton.classList.add('ManageTimelines')
  } else {
    $manageTimelinesButton = null
  }

  tweakTimelineTabs($timelineTabs)
  if (mobile && isSafari && config.replaceLogo) {
    processTwitterLogos(document.querySelector(Selectors.MOBILE_TIMELINE_HEADER))
  }

  function updateSelectedHomeTabIndex() {
    let $selectedHomeTabLink = $timelineTabs.querySelector('div[role="tablist"] [aria-selected="true"]')
    if ($selectedHomeTabLink) {
      selectedHomeTabIndex = Array.from($selectedHomeTabLink.parentElement.parentElement.children).indexOf($selectedHomeTabLink.parentElement)
      log({selectedHomeTabIndex})
    } else {
      warn('could not find selected Home tab link')
      selectedHomeTabIndex = -1
    }
  }

  updateSelectedHomeTabIndex()

  // If there are pinned lists, the timeline tabs <nav> will be replaced the
  // first time they load in the current session.
  observeElement($timelineTabs.parentElement, (mutations) => {
    let timelineTabsReplaced = mutations.some(mutation => Array.from(mutation.removedNodes).includes($timelineTabs))
    if (timelineTabsReplaced &&
        // On mobile, navigating to a different tabbed screen can switch tabs before the title changes
        isOnHomeTimelinePage()) {
      log('Home timeline tabs replaced')
      $timelineTabs = document.querySelector(`${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} nav`)
      tweakTimelineTabs($timelineTabs)
    }
  }, {
    name: 'timeline tabs nav container',
    observers: pageObservers,
  })

  observeTimeline(currentPage, {
    checkSocialContext: true,
    isTabbed: true,
    onTabChanged: () => {
      updateSelectedHomeTabIndex()
      wasForYouTabSelected = selectedHomeTabIndex == 0
    },
    tabbedTimelineContainerSelector: 'div[data-testid="primaryColumn"] > div > div:last-child',
  })

  if (desktop) {
    observeDesktopHomeTimelineTweetBox()
  }
}

async function tweakMobileComposeTweetPage() {
  if (!config.replaceLogo && config.twitterBlueChecks == 'ignore') return

  function observeUserTypeaheadDropdown($tweetTextareaContainer) {
    if (!$tweetTextareaContainer) {
      warn('could not find Tweet textarea container to observe user dropdown')
      return
    }

    let $dropdownContainer = $tweetTextareaContainer.parentElement.parentElement.parentElement.parentElement
    /** @type {HTMLElement} */
    let $typeaheadDropdown = $dropdownContainer.querySelector(':scope > [id^="typeaheadDropdown"]')
    function observeDropdown() {
      observeElement($typeaheadDropdown, () => {
        processBlueChecks($typeaheadDropdown)
      }, {
        name: 'Tweet box typeahead dropdown',
        observers: pageObservers,
      })
    }
    // If the list was re-rendered to display a dropdown for an additional
    // Tweet, it will already be in the DOM.
    if ($typeaheadDropdown) {
      observeDropdown()
    }
    observeElement($dropdownContainer, (mutations) => {
      for (let mutation of mutations) {
        if ($typeaheadDropdown &&
            mutations.some(mutation => Array.from(mutation.removedNodes).includes($typeaheadDropdown))) {
          pageObservers.get('Tweet box typeahead dropdown')?.disconnect()
          $typeaheadDropdown = null
        }
        for (let $addedNode of mutation.addedNodes) {
          if ($addedNode instanceof HTMLElement &&
              $addedNode.getAttribute('id')?.startsWith('typeaheadDropdown')) {
            $typeaheadDropdown = $addedNode
            observeDropdown()
          }
        }
      }
    }, {
      name:'Tweet box typeahead dropdown container',
      observers: pageObservers,
    })
  }

  let isReply = Boolean(document.querySelector('article[data-testid="tweet"]'))
  if (isReply) {
    // Restore old placeholder in Tweet textarea
    if (config.replaceLogo) {
      let $textarea = /** @type {HTMLTextAreaElement} */ (
        document.querySelector('main div[data-testid^="tweetTextarea"] textarea')
      )
      if ($textarea) {
        $textarea.placeholder = getString('TWEET_YOUR_REPLY')
      } else {
        warn('could not find Tweet textarea')
      }
    }
    // Observe username typeahead dropdown in Tweet box
    if (config.twitterBlueChecks != 'ignore') {
      observeUserTypeaheadDropdown(document.querySelector('main div[data-testid^="tweetTextarea"]'))
    }
  } else {
    let $tweetTextarea =  await getElement('main div[data-testid^="tweetTextarea"]', {
      name: 'first Tweet textarea',
      stopIf: pageIsNot(currentPage),
    })
    if (!$tweetTextarea) return
    let $tweetsContainer = $tweetTextarea.closest('div:not([class])')?.parentElement
    let $tweetButtonText = document.querySelector('main button[data-testid^="tweetButton"] span > span')
    if ($tweetsContainer && $tweetButtonText) {
      // We need to re-apply tweaks every time the child list changes. When
      // you use the username typeahead dropdown in any Tweet box, the list
      // re-renders so it's the only Tweet while the dropdown is open.
      observeElement($tweetsContainer, () => {
        let $containers = document.querySelectorAll('main div[data-testid^="tweetTextarea"]')
        $containers.forEach(($container, index) => {
          if (config.replaceLogo) {
            let $textarea = $container.querySelector('textarea')
            if (index > 0) {
              $textarea.placeholder = getString('ADD_ANOTHER_TWEET')
            }
          }
          if (index == 0 && config.twitterBlueChecks) {
            observeUserTypeaheadDropdown($container)
          }
        })
        // Don't update the Tweet button if the list was re-rendered to display
        // a user dropdown, in which case it will already be in the DOM.
        if (config.replaceLogo && !document.querySelector('main [id^="typeaheadDropdown"]')) {
          $tweetButtonText.textContent = getString($containers.length <= 1 ? 'TWEET' : 'TWEET_ALL')
        }
      }, {
        leading: true,
        name: 'Tweets container',
        observers: pageObservers,
      })
    } else {
      warn('could not find all elements needed to tweak the Compose Tweet page', {$tweetsContainer, $tweetButtonText})
    }
  }
}

async function tweakMobileMediaViewerPage() {
  let $timeline = await getElement('[data-testid="vss-scroll-view"] > div', {
    name: 'media viewer timeline',
    stopIf: () => !URL_MEDIAVIEWER_RE.test(location.pathname),
  })
  if (!$timeline) return

  /** @param {HTMLVideoElement} $video */
  function processVideo($video) {
    if ($video.loop != config.preventNextVideoAutoplay) {
      $video.loop = config.preventNextVideoAutoplay
    }
  }

  // Process initial contents
  let $videos = $timeline.querySelectorAll('video')
  log($videos.length, `initial video${s($videos.length)}`)
  $videos.forEach(processVideo)
  if (config.twitterBlueChecks != 'ignore') {
    processBlueChecks($timeline)
  }

  observeElement($timeline, (mutations) => {
    for (let mutation of mutations) {
      for (let $addedNode of mutation.addedNodes) {
        if (!($addedNode instanceof HTMLElement) || $addedNode.nodeName != 'DIV') continue
        let $video = $addedNode.querySelector('video')
        if ($video) {
          processVideo($video)
        }
        if (config.twitterBlueChecks != 'ignore') {
          let $videoInfo = $addedNode.querySelector('[data-testid^="immersive-tweet-ui-content-container"]')
          if ($videoInfo) {
            processBlueChecks($addedNode)
          }
        }
      }
    }
  }, {
    name: 'media viewer timeline',
    observers: pageObservers,
  }, {childList: true, subtree: true})
}

async function tweakTimelineTabs($timelineTabs) {
  $timelineTabs.classList.add('TimelineTabs')
  let $followingTabLink = /** @type {HTMLElement} */ ($timelineTabs.querySelector('div[role="tablist"] > div:nth-child(2) > [role="tab"]'))
  if (!$followingTabLink) {
    warn('could not find Following tab link')
    return
  }

  if (config.alwaysUseLatestTweets && !document.title.startsWith(separatedTweetsTimelineTitle)) {
    let isForYouTabSelected = Boolean($timelineTabs.querySelector('div[role="tablist"] > div:first-child > [role="tab"][aria-selected="true"]'))
    if (isForYouTabSelected && (!wasForYouTabSelected || config.hideForYouTimeline)) {
      log('switching to Following timeline')
      $followingTabLink.click()
      wasForYouTabSelected = false
    } else {
      wasForYouTabSelected = isForYouTabSelected
    }
  }

  if (shouldShowSeparatedTweetsTab()) {
    let $newTab = /** @type {HTMLElement} */ ($timelineTabs.querySelector('#cpftSeparatedTweetsTab'))
    if ($newTab) {
      log('separated tweets timeline tab already present')
      $newTab.querySelector('span').textContent = separatedTweetsTimelineTitle
    }
    else {
      let $forYouTabLink = /** @type {HTMLElement} */ ($timelineTabs.querySelector('div[role="tablist"] > div:first-child > [role="tab"]'))
      if (!$forYouTabLink) {
        warn('could not find For you tab to clone for separated tweets tab')
        return
      }
      log('inserting separated tweets tab')
      $newTab = /** @type {HTMLElement} */ ($forYouTabLink.parentElement.cloneNode(true))
      $newTab.id = 'cpftSeparatedTweetsTab'
      $newTab.querySelector('span').textContent = separatedTweetsTimelineTitle
      let $link = $newTab.querySelector('[role="tab"]')
      if (!$link) {
        warn('could not find tab link in separated tweets tab')
        return
      }
      $link.removeAttribute('aria-selected')

      // This script assumes navigation has occurred when the document title
      // changes, so by changing the title we fake navigation to a non-existent
      // page representing the separated tweets timeline.
      $link.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!document.title.startsWith(separatedTweetsTimelineTitle)) {
          // The separated tweets tab belongs to the Following tab
          let isFollowingTabSelected = Boolean($timelineTabs.querySelector('div[role="tablist"] > div:nth-child(2) > [role="tab"][aria-selected="true"]'))
          if (!isFollowingTabSelected) {
            log('switching to the Following tab for separated tweets')
            $followingTabLink.click()
          }
          setTitle(separatedTweetsTimelineTitle)
        }
        window.scrollTo({top: 0})
      })
      $followingTabLink.parentElement.insertAdjacentElement('afterend', $newTab)

      // Return to the Home timeline when any other tab is clicked
      $followingTabLink.parentElement.parentElement.addEventListener('click', () => {
        if (location.pathname == PagePaths.HOME && currentPage != getString('HOME')) {
          log('setting title to Home')
          homeNavigationIsBeingUsed = true
          setTitle(getString('HOME'))
        }
      })

      // Return to the Home timeline when the Home nav link is clicked
      let $homeNavLink = await getElement(Selectors.NAV_HOME_LINK, {
        name: 'home nav link',
        stopIf: pathIsNot(lastUrlPath),
      })
      if ($homeNavLink && !$homeNavLink.dataset.cpftListener) {
        $homeNavLink.addEventListener('click', () => {
          homeNavigationIsBeingUsed = true
          if (location.pathname == PagePaths.HOME && currentPage != getString('HOME')) {
            setTitle(getString('HOME'))
          }
        })
        $homeNavLink.dataset.cpftListener = 'true'
      }

      // Click the Home nav link when the Following tab is clicked while on the
      // separated Tweets timeline to switch back to Following without opening
      // the menu.
      $followingTabLink.parentElement.addEventListener('click', (e) => {
        if (currentPage != getString('HOME') && $homeNavLink) {
          e.preventDefault()
          e.stopPropagation()
          log('clicking the Home nav link to return to Following')
          $homeNavLink.click()
        }
      })
    }
  } else {
    removeMobileTimelineHeaderElements()
  }
}

function tweakNotificationsPage() {
  observeTimeline(currentPage, {
    isTabbed: true,
    tabbedTimelineContainerSelector: 'div[data-testid="primaryColumn"] > div > div:last-child',
  })
}

async function tweakPremiumSignUpPage() {
  if (!config.hideTwitterBlueUpsells) return
  let $closeButton = await getElement('[data-testid="app-bar-close"]', {
    name: 'Premium sign up close button',
    stopIf: () => location.pathname != '/i/premium_sign_up',
  })
  if ($closeButton) {
    log('Closing Premium sign up page')
    $closeButton.click()
  }
}

async function tweakProfilePage() {
  let $initialContent = await getElement(desktop ? Selectors.PRIMARY_COLUMN : Selectors.MOBILE_TIMELINE_HEADER, {
    name: 'initial profile content',
    stopIf: pageIsNot(currentPage),
  })
  if (!$initialContent) return

  if (config.twitterBlueChecks != 'ignore') {
    processBlueChecks($initialContent)
  }

  let tab = currentPagePath.match(URL_PROFILE_RE)?.[2] || 'tweets'
  log(`on ${tab} tab`)
  observeTimeline(currentPage, {
    checkSocialContext: tab == 'tweets' || tab == 'with_replies',
    isUserTimeline: tab == 'affiliates'
  })

  getElement('a[href="/settings/profile"]', {
    name: 'edit profile button',
    stopIf: pageIsNot(currentPage),
    timeout: 500,
  }).then($editProfileButton => {
    $body.classList.toggle('OwnProfile', Boolean($editProfileButton))
    if (config.hideTwitterBlueUpsells) {
      // This selector is _extremely_ specific to try to avoid false positives
      getElement(mobile ? (
        '[data-testid="primaryColumn"] > div > div > div > div > div > div > div > div > div:has(> div > div > div > a[href^="/i/premium"])'
      ) : (
        '[data-testid="primaryColumn"] > div > div > div > div > div > div:has(> div > div > div > a[href^="/i/premium"])'
      ), {
        name: "you aren't verified yet premium upsell",
        stopIf: pageIsNot(currentPage),
        timeout: 2000,
      }).then($upsell => {
        if ($upsell) {
          $upsell.classList.add('PremiumUpsell')
        }
      })
    }
  })
  let $headerVerifiedIcon = document.querySelector(`${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.TIMELINE_HEADING} [data-testid="icon-verified"]`)
  $body.classList.toggle('PremiumProfile', Boolean($headerVerifiedIcon))

  if (config.replaceLogo || config.hideSubscriptions) {
    let $profileTabs = await getElement(`${Selectors.PRIMARY_COLUMN} nav`, {
      name: 'profile tabs',
      stopIf: pageIsNot(currentPage),
    })
    if (!$profileTabs) return
    // The Profile tabs <nav> can be replaced
    observeElement($profileTabs.parentElement, async (mutations) => {
      if (mutations.length > 0) {
        let $newProfileTabs = findAddedNode(mutations, ($el) => $el instanceof HTMLElement && $el.tagName == 'NAV')
        if ($newProfileTabs == null) return
        $profileTabs = /** @type {HTMLElement} */ ($newProfileTabs)
      }
      if (config.replaceLogo) {
        let $tweetsTabText = await getElement('[data-testid="ScrollSnap-List"] > [role="presentation"]:first-child div[dir] > span:first-child', {
          context: $profileTabs,
          name: 'Tweets tab text',
          stopIf: pageIsNot(currentPage),
        })
        if ($tweetsTabText && $tweetsTabText.textContent != getString('TWEETS')) {
          $tweetsTabText.textContent = getString('TWEETS')
        }
      }
      if (config.hideSubscriptions) {
        let $subscriptionsTabLink = await getElement('a[href$="/superfollows"]', {
          context: $profileTabs,
          name: 'Subscriptions tab link',
          stopIf: pageIsNot(currentPage),
          timeout: 1000,
        })
        if ($subscriptionsTabLink) {
          $subscriptionsTabLink.parentElement.classList.add('SubsTab')
        }
      }
    }, {
      leading: true,
      name: 'profile tabs',
      observers: pageObservers,
    }, {childList: true})
  }
}

function tweakProfileSettingsPage() {
  getElement('input[type="file"] + button:has(path[d^="M17.084 7.5c0-1.163 0-1.744-.14"])', {
    name: 'profile header button (hideEditImage)',
    timeout: 2000,
  }).then($headerButton => $headerButton?.classList?.add('EditImage'))
  if (desktop) {
    getElement('div:has(> div + button path[d^="M17.084 7.5c0-1.163 0-1.744-.14"])', {
      name: 'profile Edit Photo box (hideEditImage)',
      timeout: 2000,
    }).then($editPhotoBox => $editPhotoBox?.classList?.add('EditImage'))
  }
}

/**
 * @param {Element} $dropdownItem
 * @param {string} dropdownItemSelector
 * @param {import("./types").LocaleStringKey} localeKey
 */
async function tweakRetweetDropdown($dropdownItem, dropdownItemSelector, localeKey) {
  log('tweaking Retweet/Quote Tweet dropdown')

  if (desktop) {
    $dropdownItem = await getElement(`
      #layers div[data-testid="Dropdown"] ${dropdownItemSelector}
    `, {
      name: 'rendered menu item',
      timeout: 100,
    })
    if (!$dropdownItem) return
  }

  let $text = $dropdownItem.querySelector('div[dir] > span')
  if ($text) $text.textContent = getString(localeKey)

  let $quoteTweetText = $dropdownItem.nextElementSibling?.querySelector('div[dir] > span')
  if ($quoteTweetText) $quoteTweetText.textContent = getString('QUOTE_TWEET')
}

function tweakSearchPage() {
  let $searchTabs = document.querySelector(`${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} nav`)
  if ($searchTabs != null) {
    if (config.defaultToLatestSearch) {
      let isTopTabSelected = Boolean($searchTabs.querySelector('div[role="tablist"] > div:nth-child(1) > [role="tab"][aria-selected="true"]'))
      if (isTopTabSelected) {
        log('switching to Latest tab')
        let $latestTab = /** @type {HTMLAnchorElement} */ (
          $searchTabs.querySelector('div[role="tablist"] > div:nth-child(2) > [role="tab"]')
        )
        $latestTab?.click()
      }
    }
  } else {
    warn('could not find Search tabs')
  }

  observeTimeline(currentPage, {
    hideHeadings: config.hideSuggestedContentSearch,
    isTabbed: true,
    tabbedTimelineContainerSelector: 'div[data-testid="primaryColumn"] > div > div:last-child',
  })

  if (desktop) {
    let $emptyFirstSidebarItem = document.querySelector(`.SidebarContents > div:first-child:empty`)
    if ($emptyFirstSidebarItem) {
      log('removing empty first sidebar item from Search sidebar')
      $emptyFirstSidebarItem.remove()
    }
  }
}

function tweakTweetEngagementPage() {
  if (config.replaceLogo) {
    let $headingText = document.querySelector(`${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} h2 span`)
    if ($headingText) {
      if ($headingText.textContent != getString('TWEET_INTERACTIONS')) {
        $headingText.textContent = getString('TWEET_INTERACTIONS')
      }
    } else {
      warn('could not find Post engagement heading')
    }
  }

  let $tabs = document.querySelector(`${mobile ? Selectors.MOBILE_TIMELINE_HEADER : Selectors.PRIMARY_COLUMN} nav`)
  if ($tabs == null) {
    warn('could not find Post engagement tabs')
    return
  }

  if (config.replaceLogo) {
    let $quoteTweetsTabText = $tabs.querySelector('div[role="tablist"] > div:nth-child(1) div[dir] > span')
    if ($quoteTweetsTabText) $quoteTweetsTabText.textContent = getString('QUOTE_TWEETS')
    let $retweetsTabText = $tabs.querySelector('div[role="tablist"] > div:nth-child(2) div[dir] > span')
    if ($retweetsTabText) $retweetsTabText.textContent = getString('RETWEETS')
  }

  if (config.twitterBlueChecks != 'ignore') {
    observeTimeline(currentPage, {classifyTweets: false})
  }
}

function updateThemeColor() {
  let newThemeColor = getThemeColorFromState()
  if (!newThemeColor || newThemeColor == themeColor) return

  log('Color setting changed')
  themeColor = newThemeColor
  configureThemeCss()
}
//#endregion

//#region Main
async function main({processImmediately = false} = {}) {
  // Don't run on non-app URLs served from x.com
  if (location.pathname.startsWith('/account/access') ||
      location.pathname.startsWith('/i/oauth2/authorize') ||
      location.pathname.startsWith('/oauth/authorize') ||
      /^\/([^/]+\/)?(tos|privacy)(\/previous(\/version_\d+)?)?/.test(location.pathname)) {
    log('Not running on', location.pathname)
    return
  }

  if (!config.enabled) return

  // Reset state so initial setup runs again when re-enabled
  currentPage = ''
  currentPagePath = ''
  lastUrlPath = ''
  lastUrlWasModal = false
  observingPageChanges = false
  filterBlurRule = null
  fontFamilyRule = null
  fontSize = null
  lastFlexDirection = null

  observeFavicon()
  observeTitle()
  observeThemeMeta()

  let $appWrapper = await getElement('#layers + div', {name: 'app wrapper'})

  $html = document.querySelector('html')
  $body = document.body
  $reactRoot = document.querySelector('#react-root')
  lang = $html.lang
  dir = $html.dir
  ltr = dir == 'ltr'

  observeElement($appWrapper, () => {
    let flexDirection = getComputedStyle($appWrapper).flexDirection

    mobile = flexDirection == 'column'
    desktop = !mobile

    /** @type {'mobile' | 'desktop'} */
    let version = mobile ? 'mobile' : 'desktop'

    if (version != config.version) {
      log('setting version to', version)
      config.version = version
      // Let the options page know which version is being used
      storeConfigChanges({version})
    }

    if (lastFlexDirection == null) {
      log('initial config', {config, lang, version})

      // One-time setup
      checkReactNativeStylesheet()
      themeColor = getThemeColorFromState() || themeColor
      observeBodyBackgroundColor()
      observeReRenderBoundary()
      patchHistory()
      interceptMediaButton()
      interceptTimelineTweetClicks()
      interceptQuoteAndImagePreviews()
      interceptAskClicks()
      interceptKeyboardShortcuts()
      if (desktop) {
        fontSize = $html.style.fontSize
        if (!fontSize) {
          warn('initial fontSize not set on <html>')
        }
      }

      // Repeatable configuration setup
      configureSeparatedTweetsTimelineTitle()
      configureCss()
      configureDynamicCss()
      configureFeatureFlags()
      configureThemeCss()
      configureCustomCss()
      observePopups()
      observeSideNavItems()

      // Start taking action on page changes
      observingPageChanges = true

      // Replay the initial title after setup if its observer ran before startup
      if ((processImmediately || !currentPagePath) && document.querySelector('title')) {
        processImmediately = false
        onTitleChange(document.title)
      }

      // Remove the loading stylesheet if the content script added one
      let $loadingStylesheet = document.querySelector('style#cpftLoading')
      if ($loadingStylesheet) {
        requestAnimationFrame(() => $loadingStylesheet.remove())
      }
    }
    else if (flexDirection != lastFlexDirection) {
      configChanged({version})
    }

    $body.classList.toggle('Mobile', mobile)
    $body.classList.toggle('Desktop', desktop)

    lastFlexDirection = flexDirection
  }, {
    leading: true,
    name: 'app wrapper class attribute for version changes (mobile ↔ desktop)',
    observers: globalObservers,
  }, {
    attributes: true,
    attributeFilter: ['class']
  })
}

/**
 * @param {Partial<import("./types").Config>} changes
 */
function configChanged(changes) {
  log('config changed', changes)

  if ('enabled' in changes) {
    log(`${changes.enabled ? 'en' : 'dis'}abling extension functionality`)
    if (changes.enabled) {
      // Process the current page if we've just been enabled on it
      main({processImmediately: true})
    } else {
      // These functions have teardowns when disabled
      configureCss()
      configureFeatureFlags()
      configureFont()
      configureDynamicCss()
      configureThemeCss()
      // Manually remove custom UI elements which clone existing elements, as
      // adding a hidden attribute won't hide them by default.
      document.querySelector('#cpftSeparatedTweetsTab')?.remove()
      document.querySelectorAll('.cpft_menu_item').forEach(el => el.remove())
      removeTimelineInlineReplies()
      closeQuoteReader({restoreFocus: false})
      hideImagePreview()
      quoteConversationCache.clear()
      document.querySelectorAll('.cpftTweetExtraActions').forEach($el => $el.remove())
      removeAskPanels()
      disconnectObservers(modalObservers, 'modal')
      disconnectObservers(pageObservers, 'page')
      disconnectObservers(globalObservers, 'global')
    }
    return
  }

  if ('version' in changes) {
    fontSize = desktop ? $html.style.fontSize : null
  }

  if ('inlineReplies' in changes && !config.inlineReplies || 'sortReplies' in changes) {
    removeTimelineInlineReplies({clearCache: 'sortReplies' in changes || !config.quoteTweetPreview})
  }
  if ('quoteTweetPreview' in changes && !config.quoteTweetPreview || 'sortReplies' in changes) {
    closeQuoteReader()
    quoteConversationCache.clear()
  }
  if ('hoverImagePreview' in changes && !config.hoverImagePreview) hideImagePreview()
  if ('askAboutPosts' in changes && !config.askAboutPosts) removeAskPanels()
  if ('quoteTweetPreview' in changes || 'askAboutPosts' in changes || 'hideQuoteTweetMetrics' in changes) {
    addTweetActionButtons(document)
  }
  if ('autoTranslateReplies' in changes && config.autoTranslateReplies || 'dontTranslateLanguages' in changes ||
      'inlineReplyActions' in changes || 'keyboardShortcuts' in changes || 'askAboutPosts' in changes) {
    // Update replies which are already showing
    for (let reply of inlineReplyTweets.values()) {
      if (document.querySelector(`.cpftInlineReply[data-tweet-id="${reply.id}"]`)) updateInlineReplyCards(reply.id)
    }
  }

  // Apply configuration changes
  configureCss()
  if (quoteReaderState) {
    quoteReaderState.scrollTop = $quoteReader?.querySelector('.cpftQuoteReaderBody')?.scrollTop || 0
    renderQuoteReader()
  }
  configureFont()
  configureDynamicCss()
  configureThemeCss()
  configureCustomCss()
  observePopups()
  observeSideNavItems()

  if ('darkModeTheme' in changes) {
    observeThemeMeta.update()
  }
  if ('darkModeTheme' in changes || 'hideNotifications' in changes) {
    styleEmbed.update()
  }
  if ('replaceLogo' in changes || 'hideNotifications' in changes) {
    observeFavicon.forceUpdate(getNotificationCount() > 0)
  }
  // Store the current notification count if hiding notifications was enabled
  if ('hideNotifications' in changes && config.hideNotifications != 'ignore') {
    hiddenNotificationCount = currentNotificationCount
  }

  let navigationTriggered = (
    configureSeparatedTweetsTimelineTitle() ||
    checkforDisabledHomeTimeline()
  )

  if ('hideNotifications' in changes) {
    // Hide or show the notification count in the title. The title will already
    // have been updated if other navigation was triggered.
    if (!navigationTriggered) {
      setTitle(currentPage)
      navigationTriggered = true
    }
    // Clear the stored notification count if hiding notifications was disabled
    if (config.hideNotifications == 'ignore') {
      hiddenNotificationCount = ''
    }
  }

  // Only re-process the current page if navigation wasn't already triggered
  // while applying config changes.
  if (!navigationTriggered) {
    processCurrentPage()
  }
}

// Initial config and config changes are injected into a <script> element
let $settings = /** @type {HTMLScriptElement} */ (document.querySelector('script#cpftSettings'))
if ($settings) {
  try {
    Object.assign(config, JSON.parse($settings.innerText))
  } catch(e) {
    error('error parsing initial settings', e)
  }

  let settingsChangeObserver = new MutationObserver(() => {
    /** @type {Partial<import("./types").Config>} */
    let configChanges
    try {
      configChanges = JSON.parse($settings.innerText)
    } catch(e) {
      error('error parsing incoming settings change', e)
      return
    }

    if ('debug' in configChanges) {
      log('disabling debug mode')
      debug = configChanges.debug
      log('enabled debug mode')
      configureThemeCss()
      return
    }

    Object.assign(config, configChanges)
    configChanged(configChanges)
  })
  settingsChangeObserver.observe($settings, {childList: true})
}

debug = config.debug

main()
//#endregion

}()
