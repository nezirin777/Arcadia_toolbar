
// ==UserScript==
// @name         ArcadiaToolBarNext
// @namespace    ArcadiaToolBarNext
// @description  小説の体裁を操作できるバーがＰＯＰしてくれます。(Arcadia専用) - Next構成版 (修正完了版)
// @include      http://www.mai-net.net/bbs/*
// @include      https://www.mai-net.net/bbs/*
// @include      http://mai-net.ath.cx/bbs/*
// @include      https://mai-net.ath.cx/bbs/*
// @version      5.01
// ==/UserScript==


/* ==================================================
 * ArcadiaToolBarNext — 完成版
 * ==================================================
 * 既存 ArcadiaToolBar v3.00 を「仕様書」として参照しながら
 * 新規構造へ移植した Userscript 単体配布版。
 *
 * 構成概要：
 *   CONFIG           … 既定設定 (deepFreeze)
 *   CORE UTILITIES   … el / ensureStyleElement / debounce /
 *                      throttle / rafChunk / fragment / safeText
 *   CORE MANAGERS    … StorageManager / EventBus / DOMCache
 *   ARCADIA DOM      … ArcadiaDOMParser
 *   MATCHERS         … FavoriteMatcher / NGMatcher
 *   CSS_DEFS         … 全CSSをここに集約（freeze なし・動的追加可）
 *   FEATURES         … ThemeManager / RouteManager /
 *                      NovelSearchBar / ArticleGapHandler /
 *                      CommentRenderer / CommentPageFormatter /
 *                      IndexPopupHandler
 *   RENDERERS        … LinkOptimizer / ListRenderer / TableRebuilder
 *   FEATURES (L3)    … ListFormatter / StyleControlBar /
 *                      SpamFilter / FormFiller /
 *                      FavoritesUIBuilder / FavoritesManager /
 *                      ConfigManager / SettingsEditor
 *   INITIALIZE       … boot() / main()
 *
 * 設計方針：
 *   - Feature は orchestration / init / event hookup のみ
 *   - DOM解析 → ArcadiaDOMParser に集約
 *   - DOM更新 → Renderer に集約
 *   - マッチング → FavoriteMatcher / NGMatcher（部分一致 includes）
 *   - localStorage → StorageManager のみ経由
 *   - イベント → EventBus で Feature 間直接依存を排除
 *   - npm / build / ESModules / SPA 禁止（単体配布維持）
 *
 * 注意：
 *   既存 v3.00 と同時に有効化しないこと（二重初期化が起きる）。
 * ================================================== */

'use strict';

/* ==================================================
 * CONFIG
 * ================================================== */

/**
 * deepFreeze - オブジェクトを再帰的に凍結する
 * @param {object} obj
 * @returns {Readonly<object>}
 */
function deepFreeze(obj) {
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  });
  return Object.freeze(obj);
}

/** アプリケーション既定設定。実行時は必ず StorageManager 経由で読む。 */
const CONFIG = deepFreeze({
  // 閲覧機能
  viewer: {
    styleBar: true,      // 体裁変更バーの埋め込み
    fixedIndex: true,    // 目次の固定位置埋め込み
    skipErrorPage: true, // 歯抜け記事のエラー画面回避
  },
  // SSリスト設定
  ssList: {
    directLinks: true,
    hideAdsShort: false,
    adsThreshold: 1,
    adjustLineHeight: true,
    showPvRatio: false,
    hideLowPv: false,
    pvThreshold: 500,
    skipXXXWarning: true,
    removeTestBoard: true,
    openSSInNewTab: true,
    skipSearchWarning: true,
    skipMainWarning: true,
  },
  // 掲示板設定
  board: {
    embedPageLinks: true,
    sortDesc: true,
    japaneseDate: true,
    adjustStyle: false,
    searchBar: true,
    hideSpam: true,
  },
  // 投稿設定
  posting: {
    autoFill: false,
    userInfo: {
      name: 'ねじりん',
      tripcode: 'eclipse',
      password: '5550',
    },
  },
  // スタイル設定
  style: {
    width: '90%',
    lineHeight: '150%',
    fontSize: '100%',
    fontFamily: '',
    themes: {
      light: { color: '#000000', backgroundColor: '#FFF7D4' },
      dark:  { color: '#FFFFFF', backgroundColor: '#2a2620' },
    },
  },
  // 自動実行設定
  autoExecute: {
    spacing: true,
    indent: false,
    linebreak: false,
    wordWrap: true,
    insertspace: true,
  },
  // お気に入り設定
  favorites: {
    primary: [],
    secondary: [],
    watching: [],
    blocked: [],
  },
});

/* ==================================================
 * CORE UTILITIES
 * ================================================== */

/**
 * el - タグ名・props・子要素からDOM要素を生成するヘルパー
 * @param {string} tag
 * @param {object} [props]
 * @param {...(Node|string|null|undefined)} children
 * @returns {HTMLElement}
 */
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);

  for (const [k, v] of Object.entries(props || {})) {
    if (v == null) continue;
    if (k === 'class')   node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style')   Object.assign(node.style, v);
    else if (k === 'text')    node.textContent = v;
    else if (k === 'htmlFor') node.htmlFor = v;
    else if (k in node)  node[k] = v;
    else node.setAttribute(k, String(v));
  }

  for (const c of children.flat()) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

/**
 * ensureStyleElement - style要素を idで管理する（重複防止）
 * @param {string} styleId
 * @param {string} cssText
 * @returns {HTMLStyleElement}
 */
function ensureStyleElement(styleId, cssText) {
  const existing = document.getElementById(styleId);
  if (existing && existing.tagName === 'STYLE') {
    if (existing.textContent !== cssText) existing.textContent = cssText;
    return existing;
  }
  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = cssText;
  (document.head || document.documentElement).appendChild(styleEl);
  return styleEl;
}

/**
 * debounce - 関数呼び出しを遅延・集約する
 * @param {Function} fn
 * @param {number} delay  ミリ秒
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * throttle - 一定間隔で最大1回だけ関数を呼び出す（先頭実行）
 * @param {Function} fn
 * @param {number} interval  ミリ秒
 * @returns {Function}
 */
function throttle(fn, interval) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * rafChunk - 配列をrAFチャンク処理する
 * @param {ArrayLike} items  処理対象
 * @param {Function}  fn     (item, index) => void
 * @param {number}    [size=40]  1チャンクあたりの件数
 * @returns {void}
 */
function rafChunk(items, fn, size = 40) {
  let i = 0;
  const n = items.length;
  const tick = () => {
    const end = Math.min(i + size, n);
    for (; i < end; i++) fn(items[i], i);
    if (i < n) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * fragment - DocumentFragmentを生成して子要素を追加するヘルパー
 * @param {...(Node|null|undefined)} children
 * @returns {DocumentFragment}
 */
function fragment(...children) {
  const frag = document.createDocumentFragment();
  for (const c of children.flat()) {
    if (c == null) continue;
    frag.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return frag;
}

/**
 * safeText - テキストノードとして安全にテキストを設定する
 * @param {string} s
 * @returns {Text}
 */
function safeText(s) {
  return document.createTextNode(String(s ?? ''));
}

/* ==================================================
 * CORE MANAGERS
 * ================================================== */

/* --------------------------------------------------
 * StorageManager
 * --------------------------------------------------
 * localStorage へのアクセスをここに集約する。
 * 各 Feature は直接 localStorage を触らない。
 * --------------------------------------------------
 * キー一覧：
 *   arcadia_config          - アプリ設定
 *   arcadia_favorites       - お気に入りデータ
 *   ss-theme                - テーマ名 ('light' | 'dark')
 *   style-control-bar-settings - StyleControlBar の状態
 *   favorite_patterns_cache - お気に入り正規表現キャッシュ
 *                             ※ Next版では廃止予定（Matcher側で管理）
 * -------------------------------------------------- */
const StorageManager = (() => {
  const KEYS = Object.freeze({
    config:    'arcadia_config',
    favorites: 'arcadia_favorites',
    theme:     'ss-theme',
    styleBar:  'style-control-bar-settings',
  });

  /**
   * JSON.parse のラッパー。パース失敗時は fallback を返す。
   * @template T
   * @param {string|null} raw
   * @param {T} fallback
   * @returns {T}
   */
  function safeParse(raw, fallback) {
    if (raw == null) return fallback;
    try { return JSON.parse(raw); }
    catch { return fallback; }
  }

  // ---- config ----

  /**
   * 設定を読み込む。
   * stored と defaultConfig を shallow + partial deep merge して返す。
   * （既存 StyleThemeManager.#loadConfig の移植）
   * @param {object} defaultConfig
   * @returns {object}
   */
  function getConfig(defaultConfig) {
    const stored = safeParse(localStorage.getItem(KEYS.config), null);
    if (!stored) return JSON.parse(JSON.stringify(defaultConfig));

    const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
    const merge = (base, over) => isObj(over) ? { ...base, ...over } : base;

    return {
      ...defaultConfig,
      ...stored,
      style: {
        ...(defaultConfig.style || {}),
        ...(isObj(stored.style) ? stored.style : {}),
        themes: {
          ...(defaultConfig.style?.themes || {}),
          ...(isObj(stored.style?.themes) ? stored.style.themes : {}),
          light: merge(defaultConfig.style?.themes?.light || {}, stored.style?.themes?.light),
          dark:  merge(defaultConfig.style?.themes?.dark  || {}, stored.style?.themes?.dark),
        },
      },
      favorites:   merge(defaultConfig.favorites   || {}, stored.favorites),
      autoExecute: merge(defaultConfig.autoExecute || {}, stored.autoExecute),
      viewer:      merge(defaultConfig.viewer       || {}, stored.viewer),
      board:       merge(defaultConfig.board        || {}, stored.board),
      // 修正：ssList と posting のマージ処理漏れを解消
      ssList:      merge(defaultConfig.ssList       || {}, stored.ssList),
      posting:     merge(defaultConfig.posting      || {}, stored.posting),
    };
  }

  /**
   * 設定を保存し、同一タブに変更を通知する。
   * @param {object} config
   */
  function saveConfig(config) {
    localStorage.setItem(KEYS.config, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('arcadia:config-updated', { detail: { config } }));
  }

  /**
   * 設定をリセットし、通知する。
   * @returns {object} defaultConfig のコピー
   */
  function resetConfig(defaultConfig) {
    localStorage.removeItem(KEYS.config);
    window.dispatchEvent(new CustomEvent('arcadia:config-updated', { detail: { config: null, reset: true } }));
    return JSON.parse(JSON.stringify(defaultConfig));
  }

  // ---- favorites ----

  /**
   * お気に入りデータを読み込む。
   * 不正データは除外し、カテゴリを補完して返す。
   * @param {object} defaultFavorites  { primary, secondary, watching, blocked }
   * @returns {object}
   */
  function getFavorites(defaultFavorites) {
    const CATEGORIES = ['primary', 'secondary', 'watching', 'blocked'];
    const raw = safeParse(localStorage.getItem(KEYS.favorites), null);
    if (!raw || typeof raw !== 'object') return { ...defaultFavorites };

    const result = {};
    for (const cat of CATEGORIES) {
      const items = Array.isArray(raw[cat]) ? raw[cat] : (defaultFavorites[cat] || []);
      result[cat] = items.filter(item =>
        cat === 'blocked'
          ? typeof item === 'string'
          : item && typeof item === 'object' && item.title
      );
    }
    return result;
  }

  /**
   * お気に入りデータを保存し、変更を通知する。
   * @param {object} favorites
   */
  function saveFavorites(favorites) {
    localStorage.setItem(KEYS.favorites, JSON.stringify(favorites));
    window.dispatchEvent(new CustomEvent('arcadia:favorites-updated', { detail: { favorites } }));
    window.dispatchEvent(new Event('favorites-updated'));
  }

  // ---- theme ----

  /**
   * 現在のテーマ名を返す。未設定なら OS 設定を見る。
   * @returns {'light'|'dark'}
   */
  function getTheme() {
    const stored = localStorage.getItem(KEYS.theme);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * テーマを保存し、変更を通知する。
   * @param {'light'|'dark'} theme
   */
  function setTheme(theme) {
    localStorage.setItem(KEYS.theme, theme);
    window.dispatchEvent(new CustomEvent('arcadia:theme-updated', { detail: { theme } }));
    // 旧スクリプト互換
    window.dispatchEvent(new StorageEvent('storage', { key: KEYS.theme }));
  }

  // ---- styleBar ----

  /** StyleControlBar の設定を読む */
  function getStyleBarSettings() {
    return safeParse(localStorage.getItem(KEYS.styleBar), null);
  }

  function saveStyleBarSettings(settings) {
    localStorage.setItem(KEYS.styleBar, JSON.stringify(settings));
  }

  function removeStyleBarSettings() {
    localStorage.removeItem(KEYS.styleBar);
  }

  return Object.freeze({
    KEYS,
    getConfig,
    saveConfig,
    resetConfig,
    getFavorites,
    saveFavorites,
    getTheme,
    setTheme,
    getStyleBarSettings,
    saveStyleBarSettings,
    removeStyleBarSettings,
  });
})();

/* --------------------------------------------------
 * EventBus
 * --------------------------------------------------
 * Feature 間の直接依存をなくすための pub/sub バス。
 * window.addEventListener 乱立の代替。
 *
 * 内部イベント名（arcadia: プレフィックス統一）：
 *   arcadia:config-updated
 *   arcadia:favorites-updated
 *   arcadia:theme-updated
 *   arcadia:favorites-changed   ← UI操作でお気に入りが変わった
 *   arcadia:list-rebuilt        ← テーブル再構築完了
 * -------------------------------------------------- */
const EventBus = (() => {
  const listeners = new Map();

  /**
   * イベントを購読する。
   * @param {string}   event
   * @param {Function} handler
   */
  function on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
  }

  /**
   * 購読を解除する。
   * @param {string}   event
   * @param {Function} handler
   */
  function off(event, handler) {
    listeners.get(event)?.delete(handler);
  }

  /**
   * イベントを発火する。
   * @param {string} event
   * @param {*}      [data]
   */
  function emit(event, data) {
    listeners.get(event)?.forEach(fn => {
      try { fn(data); }
      catch (e) { console.error(`[EventBus] handler error (${event}):`, e); }
    });
  }

  /**
   * window CustomEvent を EventBus に中継する。
   * StorageManager が発火する arcadia:* イベントを自動中継。
   */
  function bridgeWindowEvents() {
    const BRIDGE = [
      'arcadia:config-updated',
      'arcadia:favorites-updated',
      'arcadia:theme-updated',
    ];
    for (const name of BRIDGE) {
      window.addEventListener(name, e => emit(name, e.detail));
    }
    // 旧スクリプト互換イベントも中継
    window.addEventListener('favorites-updated', () => emit('arcadia:favorites-updated', {}));
  }

  return Object.freeze({ on, off, emit, bridgeWindowEvents });
})();

/* --------------------------------------------------
 * DOMCache
 * --------------------------------------------------
 * querySelector の多重実行を減らす WeakMap ベースキャッシュ。
 *
 * 使い方：
 *   const cache = new DOMCache();
 *   const td = cache.query(row, 'td:nth-child(2)');
 *
 * テーブル再構築後は cache.clear() でキャッシュを破棄する。
 * （責任者：テーブル再構築を行う Renderer / Formatter）
 * -------------------------------------------------- */
class DOMCache {
  #cache = new WeakMap();

  /**
   * 要素からセレクタに一致する最初の子孫を返す（キャッシュあり）。
   * @param {Element}  root
   * @param {string}   selector
   * @returns {Element|null}
   */
  query(root, selector) {
    if (!root) return null;
    let map = this.#cache.get(root);
    if (!map) { map = new Map(); this.#cache.set(root, map); }
    if (!map.has(selector)) map.set(selector, root.querySelector(selector));
    return map.get(selector);
  }

  /**
   * 特定要素のキャッシュを破棄する。
   * @param {Element} root
   */
  invalidate(root) {
    this.#cache.delete(root);
  }

  clear() {
    this.#cache = new WeakMap();
  }
}

/* ==================================================
 * ARCADIA DOM PARSER
 * ================================================== */

/**
 * ArcadiaDOMParser
 * --------------------------------------------------
 * Arcadia 固有の HTML 構造への依存をここに集中させる。
 * Feature クラスは直接 querySelector でパースしない。
 * parse メソッドの返値だけを使う。
 *
 * 【SS一覧行の構造（参考）】
 * tr.bgc
 *   td [0]: 番号 [NNN]
 *   td [1]: タイトル <b><a>タイトル</a></b>
 *            <b>記事数</b> <b>感想数</b> <b>PV数</b>
 *            直リンク用: a[href*="all=NNN"]
 *
 * 【感想ページの構造（参考）】
 * table[1] > tbody > td
 *   hr (幅なし) でコメントを区切る
 *   form[action="/bbs/sst/sst.php"] が書き込みフォーム
 *
 * ※ DOM構造は Arcadia の HTML を実測して随時更新すること。
 * -------------------------------------------------- */
class ArcadiaDOMParser {
  #domCache;

  // 修正：DOMCache を受け取り、パース処理をキャッシュ化
  constructor(domCache = null) {
    this.#domCache = domCache;
  }

  #query(root, selector) {
    if (this.#domCache) return this.#domCache.query(root, selector);
    return root?.querySelector(selector);
  }

  /**
   * SS一覧の1行をパースして構造化データを返す。
   *
   * @param {HTMLTableRowElement} row  tr.bgc 要素
   * @param {boolean} isChiraura       チラシの裏カテゴリかどうか
   * @returns {SSRowData|null}
   *
   * @typedef {object} SSRowData
   * @property {string}      title          タイトル文字列
   * @property {string|null} articleId      記事ID（all= の値）
   * @property {number}      articleCount   記事数（0なら不明）
   * @property {number}      impressionCount 感想数（0なら不明）
   * @property {number}      pv             PV数（0なら不明）
   * @property {number}      pvPerArticle   PV÷記事数（0なら不明）
   * @property {boolean}     hasDirectLink  直リンク用 all= リンクがあるか
   * @property {Element[]}   bElements      row 内の全 <b> 要素
   */
  parseSSRow(row, isChiraura = false) {
    // タイトルtdの特定: セルインデックスではなく all= リンクを含む td を探す
    //
    // カテゴリ別の実際のセル構造（menuCell抜き取り後）:
    //   チラ裏: cells[0]=NO, cells[1]=タイトル(all=あり), cells[2]=投稿者 ...
    //   通常:   cells[0]=元作品, cells[1]=NO, cells[2]=タイトル(all=あり), ...
    // → インデックスが異なるため「all=を持つtd」を動的に探すのが正解
    const ALL_SEL = 'a[href*="?all="], a[href*="&all="], a[href*="?amp;all="], a[href*="&amp;all="]';
    const aAll = this.#query(row, ALL_SEL);

    const titleTd = aAll?.closest('td') ?? null;
    const titleEl = titleTd ? (this.#query(titleTd, 'b') || this.#query(titleTd, 'a') || titleTd) : null;
    const title   = titleEl?.textContent?.trim() || '';
    if (!title) return null;

    // 記事ID（all= の値）
    let articleId = null;
    if (aAll) {
      const m = (aAll.getAttribute('href') || '').match(/[?&](?:amp;)?all=([^&]+)/);
      if (m) articleId = m[1];
    }

    // <b> 要素群: row 全体から取得
    const bElements = Array.from(row.getElementsByTagName('b'));

    // チラ裏は記事数bのみ / 通常は 記事数・感想数・PV の3つ
    let articleCount = 0, impressionCount = 0, pv = 0;
    if (!isChiraura && bElements.length >= 3) {
      // Arcadia: b[last-2]=記事数, b[last-1]=感想数, b[last]=PV
      articleCount    = this.#toInt(bElements[bElements.length - 3]?.textContent);
      impressionCount = this.#toInt(bElements[bElements.length - 2]?.textContent);
      pv              = this.#toInt(bElements[bElements.length - 1]?.textContent);
    }

    const pvPerArticle = articleCount > 0 ? Math.floor(pv / articleCount) : 0;

    return {
      title,
      articleId,
      articleCount,
      impressionCount,
      pv,
      pvPerArticle,
      hasDirectLink: !!aAll,
      bElements,
      titleTd,  // チラ裏での全話リンク差し替えに使用
    };
  }

  /**
   * メイン/捜捜索掲示板の1行をパースして構造化データを返す。
   *
   * @param {HTMLTableRowElement} row
   * @returns {MainRowData|null}
   *
   * @typedef {object} MainRowData
   * @property {string} title  タイトル文字列
   */
  parseMainRow(row) {
    const tdSecond = row.cells?.[1];
    if (!tdSecond) return null;
    const anchor = this.#query(tdSecond, 'a');
    const title  = anchor?.textContent?.trim() || tdSecond.textContent?.trim() || '';
    if (!title) return null;
    return { title };
  }

  /**
   * 感想ページのテーブルから td（本文セル）を返す。
   * （既存 CommentPageFormatter の #reverseComments / #formatDates の起点）
   *
   * @param {HTMLTableElement} commentTable  document.getElementsByTagName('table')[1]
   * @returns {HTMLTableCellElement|null}
   */
  parseCommentTableCell(commentTable) {
    return this.#query(commentTable, 'tbody td') || null;
  }

  /**
   * 感想ページの td を hr で区切ってコメントブロックに分割する。
   * （既存 #reverseComments のパース部分を分離）
   *
   * hr[width属性なし] をセパレータとして扱う。
   *
   * @param {HTMLTableCellElement} td
   * @returns {Array<Node[]>}  各ブロックのノード配列の配列
   */
  parseCommentBlocks(td) {
    const isTargetHr = n =>
      n && n.nodeType === 1 && n.tagName === 'HR' && !n.hasAttribute('width');

    const blocks = [];
    let cur = [];
    for (const node of Array.from(td.childNodes)) {
      if (isTargetHr(node)) { blocks.push(cur); cur = []; }
      else cur.push(node);
    }
    blocks.push(cur);
    return blocks;
  }

  /**
   * 歯抜け記事ページのナビゲーションリンクを取得する。
   * （既存 ArticleGapHandler.#updateLinks の前処理）
   *
   * @returns {NodeListOf<HTMLAnchorElement>}
   */
  parseArticleNavLinks() {
    return document.querySelectorAll(
      '.brdr a[href*="#kiji"], div[align="right"] a[href*="#kiji"]'
    );
  }

  /**
   * 歯抜け記事ページで前後の記事番号を探す。
   * （既存 ArticleGapHandler.#findAdjacentArticles の移植）
   *
   * @param {string} currentArticle  現在の記事番号
   * @returns {{ prev: string|null, next: string|null }}
   */
  parseAdjacentArticles(currentArticle) {
    const table = this.#query(document, '#table');
    if (!table) return { prev: null, next: null };

    const rows = table.getElementsByTagName('tr');
    const cur  = String(currentArticle);
    const esc  = CSS.escape(cur);

    let currentIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const a = this.#query(rows[i], `a[href*="n=${esc}#kiji"]`)
             || this.#query(rows[i], `a[href*="n=${esc}"]`);
      if (a) { currentIndex = i; break; }
    }
    if (currentIndex === -1) return { prev: null, next: null };

    const extractNo = row => {
      const cell0 = row?.cells?.[0];
      if (!cell0) return null;
      const m = cell0.textContent.match(/\[(\d+)\]/);
      return m ? m[1] : null;
    };

    const scan = (start, step) => {
      for (let j = start, k = 0; j >= 0 && j < rows.length && k < 6; j += step, k++) {
        const n = extractNo(rows[j]);
        if (n) return n;
      }
      return null;
    };

    return {
      prev: scan(currentIndex - 1, -1),
      next: scan(currentIndex + 1, +1),
    };
  }

  /**
   * SS一覧テーブルを DOM から特定して返す。
   * （既存 #reconstructSsListTable の tableIndex ロジックを集約）
   *
   * @param {boolean} isCategory18  18禁カテゴリかどうか
   * @returns {HTMLTableElement|null}
   */
  findSSListTable(isCategory18) {
    const tables = document.getElementsByTagName('table');
    const index  = isCategory18 ? 1 : 2;
    return tables[index] || null;
  }

  /**
   * メイン/捜索掲示板のリストテーブルを DOM から特定して返す。
   * （既存 #reconstructMainListTable の検索ロジックを集約）
   *
   * @returns {HTMLTableElement|null}
   */
  findMainListTable() {
    return (
      this.#query(document, '#table') ||
      Array.from(document.getElementsByTagName('table')).find(t =>
        t.classList.contains('brdr') &&
        ['90%', '100%'].includes(t.getAttribute('width')) &&
        t.cellPadding === '3' &&
        t.cellSpacing === '1'
      ) ||
      null
    );
  }

  /**
   * SS一覧テーブルの先頭行から rowspan 付きメニュー td を抜き出す。
   * （既存 #extractRowspanMenuFromSsListTable の移植）
   *
   * @param {HTMLTableElement} listTable
   * @returns {HTMLTableCellElement|null}
   */
  extractMenuCell(listTable) {
    // ヘッダ行 (tr.bga) の先頭 td を削除
    const headerRow = this.#query(listTable, 'tr.bga');
    if (headerRow?.firstElementChild) headerRow.firstElementChild.remove();

    // rowspan 付きメニュー td を tr.bgc から探して取り外す
    const firstDataRow = Array.from(listTable.querySelectorAll('tr.bgc')).find(tr => {
      const td = tr.firstElementChild;
      return td && td.tagName === 'TD' && td.hasAttribute('rowspan');
    });
    if (!firstDataRow) return null;

    const menuCell = firstDataRow.firstElementChild;
    menuCell.remove();
    return menuCell;
  }

  /** @private */
  #toInt(text) {
    const n = parseInt(text || '0', 10);
    return isNaN(n) ? 0 : n;
  }
}

/* ==================================================
 * MATCHERS
 * ================================================== */

/* --------------------------------------------------
 * FavoriteMatcher
 * --------------------------------------------------
 * お気に入りリストとタイトルを部分一致（includes）で照合する。
 *
 * 【重要】
 * - 部分一致を維持すること（Set による完全一致は禁止）
 * - 正規表現の動的生成は禁止
 * - 大文字・小文字は区別する（現行仕様に準拠）
 *
 * 例:
 *   登録ワード「転生」→「転生したら魔王だった件」にマッチする
 *   登録ワード「転生」→「悪役令嬢」にはマッチしない
 * -------------------------------------------------- */
class FavoriteMatcher {
  #items = new Map();

  /**
   * お気に入りデータをロードする。
   * @param {object} favorites  { primary, secondary, watching, blocked }
   */
  load(favorites) {
    this.#items.clear();
    for (const [category, items] of Object.entries(favorites || {})) {
      if (!Array.isArray(items)) continue;
      const words = category === 'blocked'
        ? items.filter(s => typeof s === 'string' && s.trim())
        : items.map(item => item?.title?.trim()).filter(Boolean);
      this.#items.set(category, words);
    }
  }

  /**
   * 指定カテゴリのいずれかのワードが title に含まれるか判定する。
   * @param {string} title
   * @param {string} category  'primary' | 'secondary' | 'watching' | 'blocked'
   * @returns {boolean}
   */
  match(title, category) {
    const list = this.#items.get(category) || [];
    return list.some(word => title.includes(word));
  }

  /**
   * title がどのカテゴリにマッチするか判定する（優先度順）。
   * blocked → primary → secondary → watching の順で評価する。
   * @param {string} title
   * @returns {'blocked'|'primary'|'secondary'|'watching'|null}
   */
  matchCategory(title) {
    for (const cat of ['blocked', 'primary', 'secondary', 'watching']) {
      if (this.match(title, cat)) return cat;
    }
    return null;
  }
}

/* --------------------------------------------------
 * NGMatcher（別名：ブロックマッチャー）
 * --------------------------------------------------
 * NGワード（blocked カテゴリ）専用の軽量マッチャー。
 * FavoriteMatcher と同じ部分一致ルールを適用する。
 *
 * ListRenderer が行を非表示にする判断に使う。
 * -------------------------------------------------- */
class NGMatcher {
  #words = [];

  /**
   * NGワードリストをロードする。
   * @param {string[]} words
   */
  load(words) {
    this.#words = (words || []).filter(s => typeof s === 'string' && s.trim());
  }

  /**
   * title がいずれかのNGワードを含むか判定する。
   * @param {string} title
   * @returns {boolean}
   */
  isBlocked(title) {
    return this.#words.some(word => title.includes(word));
  }
}

/* ==================================================
 * STYLES (CSS定数)
 * ================================================== */

/**
 * CSS文字列の集約オブジェクト。
 * ensureStyleElement に渡して使う。
 * テーマ変数 (--ss-*) は ThemeManager が定義する。
 */
const CSS_DEFS = {
  /** SS一覧・メイン一覧 共通スタイル */
  list: `
    :root {
      .list-base-style {
        line-height: var(--ss-line-height, 2.0);
        font-family: var(--ss-font-family, inherit);
      }
      .ss-main-table      { border-spacing:0; border:0; margin:0 auto; width:100%; }
      .ss-list-table-cell { width:100%; padding:0; }
      .sslist_table       { width:100%; border-spacing:1px; }
      .ss-menu-cell       { vertical-align:top; padding:0; width:160px; }
      .ss-menu-table      { border-spacing:1px; width:160px; }
      .ss-menu-header     { text-align:center; }
      .main-main-table    { border-spacing:0; border:0; margin:0 auto; width:80%; }
      .main-list-table-cell { width:100%; padding:0; }
      .mainlist_table     { width:100%; border-spacing:1px; }
      .bga                { height:30px !important; }
      .ss-list-table, .main-list-table { position:relative; }
      .list-unhide-button {
        position:absolute; top:-30px; right:0;
        border:1px solid var(--ss-border-color);
        padding:2px 8px; font-size:14px;
        background-color:var(--ss-button-bg,#f0f0f0);
        color:var(--ss-button-text,#333) !important;
        cursor:pointer; transition:background-color 0.2s ease;
      }
      .list-unhide-button:hover    { background-color:var(--ss-hover-bg); }
      .list-unhide-button:disabled { opacity:0.6; cursor:not-allowed; }
      .list-blocked { display:none; }
    }
  `,

  /** 感想ページスタイル */
  comment: `
    .ss-comment-table   { border-spacing:0; }
    .ss-pagination-table { width:100%; border-spacing:0; }
    .ss-pagination-past   { white-space:nowrap; text-align:left; vertical-align:top; padding:0 5px; }
    .ss-pagination-links  { text-align:center; white-space:normal; word-wrap:break-word; padding:0 5px; }
    .ss-pagination-latest { white-space:nowrap; text-align:right; vertical-align:bottom; padding:0 5px; }
    @media (max-width:600px) { .ss-pagination-links { font-size:12px; padding:2px; } }
    @media (max-width:400px) { .ss-pagination-links a { font-size:10px; padding:1px; } }
  `,

  /** 歯抜け記事ナビゲーションスタイル */
  articleGap: `
    .ss-next-link, .ss-prev-link {
      color:var(--ss-link-color,#0066cc); text-decoration:none;
    }
    .ss-next-link:hover, .ss-prev-link:hover { text-decoration:underline; }
    .ss-no-next, .ss-no-prev {
      color:var(--ss-text-color,#888888); font-style:italic;
    }
  `,

  /** IndexPopup スタイル（生成は IndexPopupHandler 内で行う） */
  indexPopupBase: `
    :root[data-theme="light"] {
      --index-bg: #fff7d4; --index-text: #333333;
      --index-border: #aaaacc; --index-button-bg: #ddddff;
      --index-button-text: #333333; --index-button-hover: #ffe4b5;
      --index-link: #0066cc; --index-link-visited: #551A8B;
      --index-shadow: rgba(0,0,0,0.3);
    }
    :root[data-theme="dark"] {
      --index-bg: #2a2620; --index-text: #e0e0e0;
      --index-border: #444444; --index-button-bg: #20203d;
      --index-button-text: #ffffff; --index-button-hover: #3d3630;
      --index-link: #88bbff; --index-link-visited: #00CCCC;
      --index-shadow: rgba(0,0,0,0.5);
    }
    #seaiz {
      position:fixed; top:0; left:20px;
      padding:8px 16px; background-color:var(--index-button-bg);
      color:var(--index-button-text); border:1px solid var(--index-border);
      border-radius:4px; cursor:pointer; z-index:1000;
      transition:background-color 0.2s ease; font-size:12px;
    }
    #seaiz:hover { background-color:var(--index-button-hover); }
    #tableind {
      position:fixed; top:30px; left:5px;
      padding:3px 5px; background-color:var(--index-bg);
      color:var(--index-text); border:1px solid var(--index-border);
      border-radius:5px; box-shadow:0 2px 10px var(--index-shadow);
      z-index:10; overflow-y:scroll; overflow-x:auto;
      opacity:0; transform:translateY(-10px);
      transition:opacity 300ms ease,transform 300ms ease;
      display:none;
      /* 修正：ポップアップの表示幅を安定化 */
      max-width:90vw; width:350px;
    }
    #tableind td { font-size:13px !important; }
    #tableind a  { color:var(--index-link); text-decoration:none; }
    #tableind a:visited { color:var(--index-link-visited); }
    #tableind a:hover   { text-decoration:underline; }
  `,

  /** 検索バースタイル（既存 NovelSearchBarStyles から移植） */
  searchBar: `
    :root {
      --search-button-primary: #007bff; --search-button-primary-hover: #0056b3;
      --search-close-hover: #dc3545;    --search-shadow: rgba(0,0,0,0.1);
      --search-bg: #ffffff;             --search-text: #333333;
      --search-border: #dee2e6;         --search-button-bg: #f8f9fa;
      --search-button-hover: #e9ecef;   --search-input-bg: #ffffff;
      --search-input-border: #ced4da;
    }
    :root[data-theme="dark"] {
      --search-bg: #1a1a1a;           --search-text: #e0e0e0;
      --search-border: #444444;       --search-button-bg: #2a2a2a;
      --search-button-hover: #3d3d3d; --search-input-bg: #2a2a2a;
      --search-input-border: #444444;
    }
    .search-bar-container { position:fixed; top:60px; left:20px; z-index:1000; font-family:Arial,sans-serif; }
    .search-toggle-button {
      background-color:var(--search-button-bg); border:1px solid var(--search-border);
      border-radius:4px; padding:6px 12px; cursor:pointer; font-size:14px;
      transition:all 0.2s ease; color:var(--search-text);
    }
    .search-toggle-button:hover { background-color:var(--search-button-hover); }
    .search-bar-panel { display:none; background-color:var(--search-bg); border:1px solid var(--search-border); border-radius:4px; padding:12px; box-shadow:0 2px 4px var(--search-shadow); width:600px; color:var(--search-text); max-height:70vh; overflow-y:auto; }
    .search-bar-panel.is-open { display:block; }
    .search-form { margin-bottom:8px; display:flex; gap:8px; align-items:center; }
    .search-form:last-child { margin-bottom:0; }
    .search-select, .search-input { padding:4px; border:1px solid var(--search-input-border); border-radius:4px; font-size:14px; background-color:var(--search-input-bg); color:var(--search-text); }
    .search-input { flex-grow:1; padding:4px 8px; }
    .search-button { padding:4px 12px; background-color:var(--search-button-primary); color:white; border:none; border-radius:4px; cursor:pointer; font-size:14px; transition:background-color 0.2s ease; }
    .search-button:hover { background-color:var(--search-button-primary-hover); }
    .close-button { position:absolute; top:8px; right:8px; cursor:pointer; padding:4px 8px; border:none; background:none; font-size:16px; color:var(--search-text); }
    .close-button:hover { color:var(--search-close-hover); }
  `,

  /** テーマ共通 + ライト/ダーク変数定義（既存 StyleThemeManager から移植） */
  theme: `
    :root[data-theme="light"] {
      --ss-body-bg:#ffffff; --ss-text-color:#333333;
      --ss-link-color:#0066cc; --ss-visited-link-color:#551A8B;
      --ss-list-bg:#fff7d4;   --ss-hover-bg:#ffe4b5; --ss-hover-text:#333333;
      --list-favorite-primary:#ffe0e9; --list-favorite-secondary:#e6e0ff; --list-favorite-watching:#e0e8ff;
      --list-favorite-primary-hover:#ffc6d9; --list-favorite-secondary-hover:#d1c6ff; --list-favorite-watching-hover:#c6d5ff;
      --ss-border-color:#aaaacc; --ss-header-bg:#ddddff; --ss-header-text:#333333;
      --ss-menu-bg:#fff7d4; --ss-menu-link:#0066cc; --ss-menu-link-hover:#003366;
      --ss-input-bg:#ffffff; --ss-input-text:#333333; --ss-input-border:#aaaacc;
      --ss-button-bg:#ddddff; --ss-button-text:#333333; --ss-hr-color:#aaaacc;
    }
    :root[data-theme="dark"] {
      --ss-body-bg:#1a1a1a; --ss-text-color:#e0e0e0;
      --ss-link-color:#88bbff; --ss-visited-link-color:#00CCCC;
      --ss-list-bg:#2a2620;   --ss-hover-bg:#3d3630; --ss-hover-text:#ffffff;
      --list-favorite-primary:#6b1849; --list-favorite-secondary:#634c7a; --list-favorite-watching:#5a6084;
      --list-favorite-primary-hover:#7c1f56; --list-favorite-secondary-hover:#735d8b; --list-favorite-watching-hover:#6b7195;
      --ss-border-color:#444444; --ss-header-bg:#20203d; --ss-header-text:#ffffff;
      --ss-menu-bg:#2a2620; --ss-menu-link:#88bbff; --ss-menu-link-hover:#aaccff;
      --ss-input-bg:#333333; --ss-input-text:#ffffff; --ss-input-border:#555555;
      --ss-button-bg:#2a2a4d; --ss-button-text:#ffffff; --ss-hr-color:#444444;
    }
    body { background-color:var(--ss-body-bg); color:var(--ss-text-color); }
    a                { color:var(--ss-link-color); text-decoration:none; }
    a:visited        { color:var(--ss-visited-link-color); }
    a:hover          { text-decoration:underline; }
    .ss-list-table-cell tr.bgc   { transition:background-color 0.2s ease; }
    .main-list-table-cell tr.bgc { transition:background-color 0.2s ease; }
    input[type="text"]   { background-color:var(--ss-input-bg); color:var(--ss-input-text); border:1px solid var(--ss-input-border); padding:4px; border-radius:3px; }
    input[type="submit"] { background-color:var(--ss-button-bg); color:var(--ss-button-text); border:1px solid var(--ss-input-border); padding:4px 12px; border-radius:3px; cursor:pointer; transition:background-color 0.2s ease; }
    input[type="submit"]:hover { background-color:var(--ss-hover-bg); color:var(--ss-hover-text); }
    .theme-toggle { position:fixed; top:10px; right:20px; padding:8px 16px; background-color:var(--ss-hover-bg); color:var(--ss-hover-text); border:1px solid var(--ss-border-color); border-radius:4px; cursor:pointer; z-index:1000; transition:background-color 0.2s ease; }
    .ss-list-table-cell, .bgc, .brdr .bgc { background-color:var(--ss-list-bg) !important; color:var(--ss-text-color) !important; }
    .main-list-table-cell, .bgc, .brdr .bgc { background-color:var(--ss-list-bg) !important; color:var(--ss-text-color) !important; }
    td.bga, tr.bga td, .bgb, .bgb * { background-color:var(--ss-header-bg) !important; color:var(--ss-header-text) !important; border:1px solid var(--ss-border-color); border-width:1px 0; font-weight:bold; }
    .ss-list-table-cell tr.bgc:hover td   { background-color:var(--ss-hover-bg) !important; color:var(--ss-hover-text) !important; }
    .ss-list-table-cell tr.bgc.list-favorite-primary td   { background-color:var(--list-favorite-primary) !important; }
    .ss-list-table-cell tr.bgc.list-favorite-secondary td { background-color:var(--list-favorite-secondary) !important; }
    .ss-list-table-cell tr.bgc.list-favorite-watching td  { background-color:var(--list-favorite-watching) !important; }
    .ss-list-table-cell tr.bgc.list-favorite-primary:hover td   { background-color:var(--list-favorite-primary-hover) !important; }
    .ss-list-table-cell tr.bgc.list-favorite-secondary:hover td { background-color:var(--list-favorite-secondary-hover) !important; }
    .ss-list-table-cell tr.bgc.list-favorite-watching:hover td  { background-color:var(--list-favorite-watching-hover) !important; }
    .main-list-table-cell tr.bgc:hover td   { background-color:var(--ss-hover-bg) !important; color:var(--ss-hover-text) !important; }
    .main-list-table-cell tr.bgc.list-favorite-primary td   { background-color:var(--list-favorite-primary) !important; }
    .main-list-table-cell tr.bgc.list-favorite-secondary td { background-color:var(--list-favorite-secondary) !important; }
    .main-list-table-cell tr.bgc.list-favorite-watching td  { background-color:var(--list-favorite-watching) !important; }
    .main-list-table-cell tr.bgc.list-favorite-primary:hover td   { background-color:var(--list-favorite-primary-hover) !important; }
    .main-list-table-cell tr.bgc.list-favorite-secondary:hover td { background-color:var(--list-favorite-secondary-hover) !important; }
    .main-list-table-cell tr.bgc.list-favorite-watching:hover td  { background-color:var(--list-favorite-watching-hover) !important; }
    td.bgc { background-color:var(--ss-menu-bg) !important; color:var(--ss-text-color) !important; }
  `,

  /** StyleControlBar スタイル */
  styleBar: `
    :root[data-theme="light"] {
      --scb-bar-bg:var(--ss-list-bg,#fff7d4); --scb-text:var(--ss-text-color,#333);
      --scb-border:var(--ss-border-color,#aaaacc); --scb-select-bg:var(--ss-input-bg,#fff);
      --scb-select-text:var(--ss-input-text,#333); --scb-hover-bg:var(--ss-hover-bg,#ffe4b5);
      --scb-switch-bg:var(--ss-header-bg,#ddddff); --scb-switch-text:var(--ss-header-text,#333);
    }
    :root[data-theme="dark"] {
      --scb-bar-bg:var(--ss-list-bg,#2a2620); --scb-text:var(--ss-text-color,#e0e0e0);
      --scb-border:var(--ss-border-color,#444); --scb-select-bg:var(--ss-input-bg,#333);
      --scb-select-text:var(--ss-input-text,#fff); --scb-hover-bg:var(--ss-hover-bg,#3d3630);
      --scb-switch-bg:var(--ss-header-bg,#20203d); --scb-switch-text:var(--ss-header-text,#fff);
    }
    .bar_bas{position:fixed;top:90px;right:20px;padding:10px;background-color:var(--scb-bar-bg);border:1px solid var(--scb-border);border-radius:4px;z-index:999;display:none;color:var(--scb-text);width:120px;line-height:250%;font-size:12px;text-align:right;}
    .bar_swh{position:fixed;top:50px;right:20px;padding:8px 16px;background-color:var(--scb-switch-bg);color:var(--scb-switch-text);border:1px solid var(--scb-border);border-radius:4px;cursor:pointer;z-index:1000;transition:background-color 0.2s ease;font-size:12px;}
    .bar_swh:hover{background-color:var(--scb-hover-bg);}
    .bar_sel{background-color:var(--scb-select-bg);color:var(--scb-select-text);border:1px solid var(--scb-border);border-radius:3px;padding:2px;margin:2px;width:120px;font-size:13px;}
    .spn_sel{display:inline-block;margin:2px 4px;color:var(--scb-text);width:100%;line-height:250%;font-size:12px;}
    .spn_inp{display:inline-block;margin:2px 4px;color:var(--scb-text);line-height:250%;font-size:12px;}
    .spn_inp input[type="checkbox"]{margin-right:4px;vertical-align:middle;}
    .reset-button{background-color:var(--scb-switch-bg);color:var(--scb-switch-text);border:1px solid var(--scb-border);border-radius:4px;padding:4px 8px;margin:4px;cursor:pointer;font-size:12px;}
    .reset-button:hover{background-color:var(--scb-hover-bg);}
  `,

  /** FavoritesManager スタイル */
  favorites: `
    :root{--fm-bg:#fff;--fm-text:#333;--fm-header-bg:#4CAF50;--fm-header-text:#fff;--fm-border:#ddd;--fm-shadow:rgba(0,0,0,.15);--fm-hover:#f8f9fa;--fm-form-bg:#f8f9fa;--fm-input-border:#ddd;}
    :root[data-theme="dark"]{--fm-bg:#1a1a1a;--fm-text:#e0e0e0;--fm-header-bg:#2e7d32;--fm-border:#444;--fm-shadow:rgba(0,0,0,.3);--fm-hover:#2a2a2a;--fm-form-bg:#2a2a2a;--fm-input-border:#444;}
    .fm-container{position:fixed;top:60px;right:20px;width:470px;max-height:85vh;background:var(--fm-bg);border-radius:16px;box-shadow:0 8px 32px var(--fm-shadow);display:none;flex-direction:column;overflow-y:auto;font-family:"Segoe UI","Hiragino Sans",sans-serif;color:var(--fm-text);z-index:1100;}
    .fm-header{background:var(--fm-header-bg);padding:4px 20px;display:flex;justify-content:space-between;align-items:center;}
    .fm-close-button{background:none;border:none;font-size:14px;color:var(--fm-header-text);cursor:pointer;}
    .fm-form-section{padding:4px;background:var(--fm-form-bg);border-bottom:1px solid var(--fm-border);}
    .fm-jump-buttons{display:flex;gap:8px;justify-content:center;padding:8px;}
    .fm-button{border:none;cursor:pointer;font-size:14px;border-radius:5px;padding:8px;font-weight:500;transition:all 0.2s ease;}
    .fm-button:hover{transform:translateY(-1px);}
    .fm-toggle-button{background:#4CAF50;color:white;position:fixed;top:70px;right:20px;z-index:900;padding:8px 16px;border-radius:5px;border:1px solid var(--ss-border-color,#ddd);transition:all 0.2s ease;}
    .fm-button.primary{background:#4CAF50;color:white;}
    .fm-button.secondary{background:#2196F3;color:white;}
    .fm-button.watching{background:#FF9800;color:white;}
    .fm-button.export{background:#2196F3;color:white;}
    .fm-button.import{background:#FF9800;color:white;}
    .fm-button.remove{background:#dc3545;color:white;border:none;padding:2px 5px;border-radius:3px;cursor:pointer;display:none;}
    .fm-search,.fm-select,.fm-input,.fm-textarea{padding:4px 12px;border:1px solid var(--fm-input-border);border-radius:8px;font-size:14px;background:var(--fm-bg);color:var(--fm-text);box-sizing:border-box;}
    .fm-search{width:100%;margin-bottom:10px;}
    .fm-search.active{background:#fff3cd;}
    :root[data-theme="dark"] .fm-search.active{background:#d4a017;}
    .fm-select{margin-right:5px;}
    .fm-input{width:calc(100% - 70px);}
    .fm-textarea.memo{height:30px;width:100%;margin-top:5px;}
    .fm-textarea.io{width:100%;height:100px;margin-top:10px;font-family:monospace;}
    .fm-list{list-style:none;padding:0;margin:10px 0;max-height:350px;overflow-y:auto;}
    .fm-category-header{padding:5px;background:var(--fm-form-bg);font-weight:bold;border-bottom:1px solid var(--fm-border);}
    ul.fm-list li.fm-item{padding:5px;border-bottom:1px solid var(--fm-border);display:flex;justify-content:space-between;align-items:center;background:var(--fm-bg);}
    ul.fm-list li.fm-item:hover{background:var(--fm-hover) !important;}
    ul.fm-list li.fm-item:hover .fm-button.remove{display:block !important;}
    .fm-item-title{flex-grow:1;margin-right:10px;}
  `,

  /** SettingsEditor スタイル */
  settings: `
    :root{--se-bg:var(--ss-body-bg,#fff);--se-text:var(--ss-text-color,#333);--se-header-bg:#4CAF50;--se-border:var(--ss-border-color,#ddd);--se-shadow:rgba(0,0,0,.15);--se-hover:var(--ss-hover-bg,#f8f9fa);}
    :root[data-theme="dark"]{--se-bg:var(--ss-body-bg,#1a1a1a);--se-text:var(--ss-text-color,#e0e0e0);--se-header-bg:#2e7d32;--se-border:var(--ss-border-color,#444);--se-shadow:rgba(0,0,0,.3);--se-hover:var(--ss-hover-bg,#2a2a2a);}
    .se-container{position:fixed;top:60px;left:20px;width:470px;max-height:80vh;background:var(--se-bg);border-radius:16px;box-shadow:0 8px 32px var(--se-shadow);display:flex;flex-direction:column;z-index:1100;overflow-y:auto;}
    .se-fixed-header{position:sticky;top:0;background:var(--se-header-bg);color:#fff;z-index:1;padding:8px 20px;height:25px;}
    .se-header{display:flex;justify-content:space-between;align-items:center;}
    .se-title{margin:0;font-size:16px;font-weight:500;}
    .se-close-button{background:none;border:none;font-size:16px;color:#fff;cursor:pointer;padding:0 8px;}
    .se-buttons-container{position:sticky;top:40px;background:var(--se-bg);z-index:1;padding:4px 0;border-bottom:1px solid var(--se-border);}
    .se-form-section.buttons{display:flex;flex-direction:row;gap:16px;justify-content:center;padding:4px 0;}
    .se-form-section{padding:8px 12px;display:flex;flex-direction:column;gap:6px;}
    .se-lists-container{flex:1;overflow-y:auto;padding:8px;background:var(--se-bg);}
    .se-category{margin-bottom:12px;border-radius:8px;background:var(--se-bg);box-shadow:0 2px 4px var(--se-shadow);}
    .se-category-header{padding:8px 12px;border-bottom:1px solid var(--se-border);background:var(--se-bg);cursor:pointer;}
    .se-category-title{font-size:16px;margin:0;color:var(--se-text);}
    .se-form-grid{display:flex;justify-content:space-between;align-items:center;gap:12px;}
    .se-form-grid label{flex:1;text-align:left;color:var(--se-text);font-size:14px;cursor:help;}
    .se-form-grid input[type="checkbox"],.se-form-grid input[type="text"],.se-form-grid input[type="password"],.se-form-grid input[type="number"]{width:auto;padding:4px;border:1px solid var(--se-border);border-radius:4px;background:var(--se-bg);color:var(--se-text);}
    .se-form-grid input[type="checkbox"]{margin-left:8px;}
    .se-button{border:none;cursor:pointer;font-size:14px;border-radius:5px;padding:6px 12px;font-weight:500;transition:all 0.2s ease;min-width:80px;}
    .se-button:hover{transform:translateY(-1px);}
    .se-button-primary{background:#27ae60;color:white;}
    .se-button-danger{background:#dc3545;color:white;}
    .se-form-section h4{margin:8px 0 4px;font-size:14px;color:var(--se-text);}
    .se-settings-button{position:fixed;top:10px;left:20px;background:none;border:1px solid var(--se-border);font-size:16px;color:var(--se-text);cursor:pointer;padding:8px;border-radius:5px;z-index:1200;transition:all 0.2s ease;}
    .se-settings-button:hover{background-color:var(--se-hover);transform:translateY(-1px);}
  `,
};

/* ==================================================
 * FEATURES
 * ==================================================
 * 各 Feature は orchestration / init / event hookup のみ担当。
 * DOM解析 → parser、マッチング → matcher、
 * DOM更新 → renderer に委譲する。
 *
 * 実装済み：
 *   ThemeManager / RouteManager
 *   NovelSearchBar / ArticleGapHandler
 *   CommentRenderer / CommentPageFormatter
 *   IndexPopupHandler
 * ================================================== */

/* --------------------------------------------------
 * ThemeManager
 * --------------------------------------------------
 * CSS変数によるテーマ切り替えを管理する。
 * StyleThemeManager の後継。
 *
 * 責務：
 *   - テーマ適用 (data-theme 属性)
 *   - トグルボタンの生成と更新
 *   - OS設定 (prefers-color-scheme) の検知
 *   - 設定変更の StorageManager 経由保存と EventBus 通知
 *
 * StyleControlBar が参照するカスタムスタイル
 * (fontFamily / fontSize 等) はここでは扱わない。
 * それらは StyleControlBar が自前で :root 変数を注入する。
 * -------------------------------------------------- */
class ThemeManager {
  #isInitialized = false;
  #current;
  #button = null;

  static #STATES = Object.freeze({
    light: { next: 'dark',  icon: '🌙' },
    dark:  { next: 'light', icon: '☀️' },
  });

  constructor() {
    this.#current = StorageManager.getTheme();
  }

  /** 現在のテーマ名を返す */
  get current() { return this.#current; }

  /** テーマを切り替える */
  toggle() {
    this.#current = ThemeManager.#STATES[this.#current]?.next ?? 'light';
    StorageManager.setTheme(this.#current);
    this.#apply();
  }

  /** テーマを DOM に適用する */
  #apply() {
    document.documentElement.setAttribute('data-theme', this.#current);
    if (this.#button) {
      this.#button.textContent = ThemeManager.#STATES[this.#current]?.icon ?? '🌙';
    }
    EventBus.emit('arcadia:theme-updated', { theme: this.#current });
  }

  init() {
    if (this.#isInitialized) return;

    // CSS変数定義を注入（最優先）
    ensureStyleElement('atb-theme', CSS_DEFS.theme);

    // 現在テーマを適用
    this.#apply();

    // OS設定変更の監視
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      // ユーザーが手動設定していない場合のみOS設定に従う
      if (!localStorage.getItem(StorageManager.KEYS.theme)) {
        this.#current = e.matches ? 'dark' : 'light';
        this.#apply();
      }
    });

    // トグルボタン生成
    this.#button = el('button', {
      class: 'theme-toggle',
      id: 'theme-toggle-button',
      title: 'テーマ切り替え',
      text: ThemeManager.#STATES[this.#current]?.icon ?? '🌙',
    });
    this.#button.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.#button);

    this.#isInitialized = true;
  }
}

/* --------------------------------------------------
 * RouteManager
 * --------------------------------------------------
 * URL から現在のページ種別と act パラメータを判定し、
 * 適切な Feature 起動関数を呼ぶ。
 * BoardManager の #getPageType / #executeHandler の後継。
 *
 * ページ種別：
 *   ssList   … /bbs/sst/sst.php
 *   search   … /bbs/sss/sss.php
 *   mainbb   … /bbs/mainbbs/mainbbs.php
 *
 * act パラメータ：
 *   list         → SS一覧
 *   search       → SS一覧（検索結果）
 *   dump         → 記事閲覧（単話）
 *   all_msg      → 記事閲覧（全話）
 *   impression   → 感想ページ
 *   *（未設定）  → メイン/捜索掲示板はすべてここ
 * -------------------------------------------------- */
class RouteManager {
  static #PATH_MAP = Object.freeze({
    '/bbs/sst/sst.php':       'ssList',
    '/bbs/sss/sss.php':       'search',
    '/bbs/mainbbs/mainbbs.php': 'mainbb',
  });

  /**
   * 現在のページ情報を返す。
   * @returns {{ pageType: string|null, act: string, params: URLSearchParams }}
   */
  static detect() {
    const params   = new URLSearchParams(location.search);
    const pageType = RouteManager.#PATH_MAP[location.pathname] ?? null;
    const act      = params.get('act') ?? '*';
    return { pageType, act, params };
  }

  /**
   * 旧ドメインへのリダイレクトを検知したら転送する。
   * @returns {boolean} リダイレクトした場合 true
   */
  static handleRedirect() {
    if (location.hostname === 'mai-net.ath.cx') {
      location.assign(`http://www.mai-net.net${location.pathname}${location.search}${location.hash}`);
      return true;
    }
    return false;
  }
}

/* --------------------------------------------------
 * NovelSearchBar
 * --------------------------------------------------
 * Arcadia / なろう / ハーメルン 向け検索バーを生成する。
 * 既存実装から移植。DOM生成ロジックのみを担当。
 * -------------------------------------------------- */
class NovelSearchBar {
  /** 各検索エンジンの設定 */
  static #CONFIGS = Object.freeze({
    base: {
      method: 'get',
      target: '_blank',
      searchParam: 'word',
      hiddenInputs: [],
    },
    arcadia: {
      action: '/bbs/sst/sst.php',
      buttonText: 'Arcadia内で検索',
      hiddenInputs: [
        { name: 'act', value: 'search' },
        { name: 'page', value: '1' },
      ],
      options: {
        name: 'cate',
        default: 'all',
        items: [
          { value: 'all',       label: '検索場所：全て' },
          { value: 'tiraura',   label: 'チラシの裏' },
          { value: 'eva',       label: 'エヴァ' },
          { value: 'nade',      label: 'ナデシコ' },
          { value: 'akamatu',   label: '赤松健' },
          { value: 'type-moon', label: 'TYPE-MOON' },
          { value: 'muv-luv',   label: 'Muv-Luv' },
          { value: 'ff',        label: 'スクエニ' },
          { value: 'sammon',    label: 'サモンナイト' },
          { value: 'toraha',    label: 'とらハ' },
          { value: 'gs',        label: '椎名高志' },
          { value: 'naruto',    label: 'ナルト' },
          { value: 'zero',      label: 'ゼロ魔' },
          { value: 'HxH',       label: 'HxH' },
          { value: 'original',  label: 'オリジナル' },
          { value: 'etc',       label: 'その他' },
          { value: '18',        label: 'ＸＸＸ' },
        ],
      },
    },
    narou: {
      action: 'http://yomou.syosetu.com/search.php',
      buttonText: 'なろうで検索',
      options: {
        name: 'order',
        default: 'new',
        items: [
          { value: 'new',         label: '新着順' },
          { value: 'notorder',    label: 'おまかせ順' },
          { value: 'weekly',      label: '週間ユニーク順' },
          { value: 'favnovelcnt', label: 'お気に入り順' },
          { value: 'reviewcnt',   label: 'レビューの多い順' },
          { value: 'hyoka',       label: '総合評価の高い順' },
          { value: 'hyokacnt',    label: '評価者数の多い順' },
          { value: 'lengthdesc',  label: '文字数の多い順' },
          { value: 'old',         label: '古い順' },
        ],
      },
    },
    hameln: {
      action: 'https://syosetu.org/search/',
      buttonText: 'ハーメルンで検索',
      hiddenInputs: [{ name: 'mode', value: 'search' }],
    },
  });

  #isInitialized = false;
  #config;
  #panel = null;
  #toggleBtn = null;

  constructor(config) {
    this.#config = config;
  }

  /** 検索パネルの開閉 */
  #toggle = () => this.#panel?.classList.toggle('is-open');

  /** フォーム要素を生成する（型ごとに1回だけ生成） */
  #buildForm(type) {
    const base = NovelSearchBar.#CONFIGS.base;
    const spec = NovelSearchBar.#CONFIGS[type];
    if (!spec) return null;

    const cfg = { ...base, ...spec };

    const form = el('form', {
      method: cfg.method,
      action: cfg.action,
      target: cfg.target,
      class: 'search-form',
    });

    // hidden inputs
    for (const { name, value } of (cfg.hiddenInputs || [])) {
      form.appendChild(el('input', { type: 'hidden', name, value }));
    }

    // select
    if (cfg.options) {
      const select = el('select', {
        name:  cfg.options.name,
        class: 'search-select',
        title: '検索オプション',
      });
      for (const opt of cfg.options.items) {
        const o = el('option', { value: opt.value, text: opt.label });
        if (opt.value === cfg.options.default) o.selected = true;
        select.appendChild(o);
      }
      form.appendChild(select);
    }

    // text input
    form.appendChild(el('input', {
      type:  'text',
      name:  cfg.searchParam,
      class: 'search-input',
      title: '検索ワード入力',
    }));

    // submit
    form.appendChild(el('button', {
      type:  'submit',
      class: 'search-button',
      text:  cfg.buttonText,
    }));

    // 空入力は送信しない
    form.addEventListener('submit', e => {
      const inp = form.querySelector('.search-input');
      if (!inp?.value?.trim()) e.preventDefault();
    });

    return form;
  }

  init() {
    if (this.#isInitialized || !this.#config?.board?.searchBar) return;

    ensureStyleElement('atb-search-bar', CSS_DEFS.searchBar);

    // トグルボタン
    this.#toggleBtn = el('button', {
      class: 'search-toggle-button',
      title: '検索バーの表示／非表示',
      text:  '検索',
    });
    this.#toggleBtn.addEventListener('click', this.#toggle);

    // パネル
    this.#panel = el('div', { class: 'search-bar-panel' });

    // 閉じるボタン
    const closeBtn = el('button', {
      class: 'close-button',
      title: '検索バーを閉じる',
      type:  'button',
      text:  '×',
    });
    closeBtn.addEventListener('click', this.#toggle);
    this.#panel.appendChild(closeBtn);

    // 各検索フォーム
    for (const type of ['arcadia', 'narou', 'hameln']) {
      const form = this.#buildForm(type);
      if (form) this.#panel.appendChild(form);
    }

    // コンテナをbodyに追加
    const container = el('div', { class: 'search-bar-container' });
    container.append(this.#toggleBtn, this.#panel);

    const mount = () => document.body?.appendChild(container);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
      mount();
    }

    this.#isInitialized = true;
  }
}

/* --------------------------------------------------
 * ArticleGapHandler
 * --------------------------------------------------
 * 歯抜け記事（削除済み記事を飛ばした prev/next ナビ）の
 * エラー画面を回避して前後記事へ直接ジャンプさせる。
 * 既存実装から移植。parser に DOM解析を委譲。
 * -------------------------------------------------- */
class ArticleGapHandler {
  #isInitialized = false;
  #config;
  #parser;

  constructor(config, parser) {
    this.#config = config;
    this.#parser = parser;
  }

  /** 処理が必要なページかどうか判定 */
  #shouldHandle(params) {
    return (
      !!this.#config?.viewer?.skipErrorPage &&
      !!params.get('n') &&
      !params.has('count')
    );
  }

  /** ナビゲーションリンクを前後記事番号で更新 */
  #updateLinks(prev, next) {
    const baseUrl = new URL(location.href);
    baseUrl.hash = 'kiji';

    const links = this.#parser.parseArticleNavLinks();

    links.forEach(link => {
      const text = link.textContent;
      if (text.includes('前を表示する')) {
        this.#setLink(link, prev, '前を表示する', 'ss-prev-link', 'ss-no-prev', '前の記事はありません', baseUrl);
      } else if (text.includes('次を表示する')) {
        this.#setLink(link, next, '次を表示する', 'ss-next-link', 'ss-no-next', '次の記事はありません', baseUrl);
      }
    });
  }

  #setLink(link, target, activeText, activeClass, inactiveClass, inactiveText, baseUrl) {
    if (target) {
      baseUrl.searchParams.set('n', target);
      link.href      = baseUrl.toString();
      link.className = activeClass;
      link.textContent = activeText;
    } else {
      link.href      = '#kiji';
      link.className = inactiveClass;
      link.textContent = inactiveText;
    }
  }

  init() {
    if (this.#isInitialized) return;

    const params         = new URLSearchParams(location.search);
    const currentArticle = params.get('n');
    if (!this.#shouldHandle(params)) return;

    try {
      ensureStyleElement('atb-article-gap', CSS_DEFS.articleGap);

      const { prev, next } = this.#parser.parseAdjacentArticles(currentArticle);
      if (prev !== null || next !== null) {
        this.#updateLinks(prev, next);
      }

      // ハッシュを #kiji に設定（記事先頭へスクロール）
      location.hash = 'kiji';
      this.#isInitialized = true;
    } catch (e) {
      console.error('[ArticleGapHandler] init failed:', e.message);
    }
  }
}

/* --------------------------------------------------
 * CommentRenderer
 * --------------------------------------------------
 * 感想ページの DOM 更新のみを担当する。
 * business logic / parser処理 / localStorage参照 は禁止。
 *
 * 担当：
 *   - コメントブロックの逆順表示
 *   - 日付の日本語化
 *   - ページネーション DOM 生成
 * -------------------------------------------------- */
class CommentRenderer {
  static #DATE_MAP = Object.freeze({
    days: {
      Mon: '月', Tue: '火', Wed: '水', Thu: '木',
      Fri: '金', Sat: '土', Sun: '日',
    },
    months: {
      '/Jan': '/01', '/Feb': '/02', '/Mar': '/03', '/Apr': '/04',
      '/May': '/05', '/Jun': '/06', '/Jul': '/07', '/Aug': '/08',
      '/Sep': '/09', '/Oct': '/10', '/Nov': '/11', '/Dec': '/12',
    },
  });

  /**
   * コメントブロックを逆順に並び替えて td に再挿入する。
   * @param {HTMLTableCellElement} td
   * @param {Array<Node[]>}        blocks  ArcadiaDOMParser.parseCommentBlocks の返値
   */
  reverseComments(td, blocks) {
    if (blocks.length < 2) return;

    const frag = document.createDocumentFragment();
    const append = nodes => nodes.forEach(n => frag.appendChild(n));

    // blocks[0]: ヘッダ部分（変わらず先頭）
    append(blocks[0]);
    frag.appendChild(document.createElement('hr'));

    // blocks[1..n-2] を逆順
    for (let i = blocks.length - 2; i > 0; i--) {
      append(blocks[i]);
      frag.appendChild(document.createElement('hr'));
    }

    // blocks[n-1]: フッタ部分（変わらず末尾）
    append(blocks[blocks.length - 1]);

    td.replaceChildren(frag);
  }

  /**
   * td 内の日付テキストを日本語形式に変換する。
   * @param {HTMLTableCellElement} td
   */
  formatDates(td) {
    const { days, months } = CommentRenderer.#DATE_MAP;
    const re = /[(]?(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[)]?|\/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/;

    const walker = document.createTreeWalker(
      td,
      NodeFilter.SHOW_TEXT,
      { acceptNode: n => re.test(n.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT },
    );

    let node;
    while ((node = walker.nextNode())) {
      node.textContent = node.textContent
        .replace(/\((Mon|Tue|Wed|Thu|Fri|Sat|Sun)\)/g, (_, d) => `(${days[d]})`)
        .replace(/\/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/g, m => months[m]);
    }
  }

  /**
   * ページネーション table 要素を生成して返す。
   * @param {object} opts
   * @param {number} opts.totalComments  コメント総数
   * @param {number} opts.currentPage    現在のページ番号
   * @param {string} opts.articleId      記事ID
   * @returns {HTMLTableElement|null}
   */
  buildPagination({ totalComments, currentPage, articleId }) {
    if (!totalComments) return null;

    const totalPages = Math.ceil(totalComments / 20);
    const startPage  = currentPage + totalPages - 1;

    const table   = el('table', { class: 'ss-pagination-table' });
    const row     = table.insertRow();
    const tdPast  = el('td', { class: 'ss-pagination-past',   text: '過去←' });
    const tdLinks = el('td', { class: 'ss-pagination-links' });
    const tdNew   = el('td', { class: 'ss-pagination-latest', text: '→最新' });

    for (let i = 0; i < startPage; i++) {
      const page         = startPage - i;
      const startComment = Math.max(
        totalComments - 20 * (page - (currentPage - 1)) + 1, 1
      );
      const label = `[${String(startComment).padStart(4, '0')}-]`;

      if (i !== 0) tdLinks.appendChild(safeText('  '));

      if (page === currentPage) {
        tdLinks.appendChild(safeText(label));
      } else {
        tdLinks.appendChild(el('a', {
          href: this.#pageUrl(articleId, page),
          text: label,
        }));
      }
    }

    row.append(tdPast, tdLinks, tdNew);
    return table;
  }

  /** 感想ページの URL を生成する */
  #pageUrl(articleId, page) {
    const url = new URL('/bbs/sst/sst.php', location.origin);
    url.searchParams.set('act',  'impression');
    url.searchParams.set('cate', 'all');
    url.searchParams.set('no',   articleId);
    url.searchParams.set('page', String(page));
    return url.toString();
  }
}

/* --------------------------------------------------
 * CommentPageFormatter
 * --------------------------------------------------
 * 感想ページを整形する Feature。
 * DOM解析は ArcadiaDOMParser、DOM更新は CommentRenderer に委譲。
 * -------------------------------------------------- */
class CommentPageFormatter {
  #isInitialized = false;
  #config;
  #parser;
  #renderer;

  constructor(config, parser) {
    this.#config   = config;
    this.#parser   = parser;
    this.#renderer = new CommentRenderer();
  }

  /** URL から記事ID と現在ページ番号を取得 */
  #getPageInfo() {
    const params = new URLSearchParams(location.search);
    return {
      articleId:   params.get('no'),
      currentPage: parseInt(params.get('page'), 10) || 1,
    };
  }

  /** コメント総数を table テキストから抽出 */
  #extractTotalComments(commentTable) {
    const m = (commentTable.textContent || '').match(/\[(\d+)\]/);
    return m ? parseInt(m[1], 10) : 0;
  }

  init() {
    if (this.#isInitialized) return;

    // 感想ページのテーブルは document 内2番目
    const commentTable = document.getElementsByTagName('table')[1] || null;
    if (!commentTable) return;

    try {
      ensureStyleElement('atb-comment', CSS_DEFS.comment);

      const { articleId, currentPage } = this.#getPageInfo();
      const totalComments = this.#extractTotalComments(commentTable);

      // commentTable 本体を直接加工する
      // （cloneして replaceWith すると <table> 外枠が消えて横幅が破壊されるため）
      commentTable.classList.add('ss-comment-table');

      const td = this.#parser.parseCommentTableCell(commentTable);

      if (td) {
        // コメント逆順
        if (this.#config.board?.sortDesc) {
          const blocks = this.#parser.parseCommentBlocks(td);
          this.#renderer.reverseComments(td, blocks);
        }

        // 日本語日付
        if (this.#config.board?.japaneseDate) {
          this.#renderer.formatDates(td);
        }

        // ページネーション埋め込み
        if (this.#config.board?.embedPageLinks && articleId) {
          const pagination = this.#renderer.buildPagination({
            totalComments,
            currentPage,
            articleId,
          });

          if (pagination) {
            // 書き込みフォームの直前に下部ページネーションを挿入
            const writeForm = Array.from(
              td.querySelectorAll('form[action="/bbs/sst/sst.php"][method="post"]')
            ).find(f => f.querySelector('input[name="act"]')?.value === 'write_impression');

            if (writeForm) {
              // 既存の page リンクを削除
              td.querySelectorAll('a[href*="page"]').forEach(a => a.remove());
              td.insertBefore(pagination.cloneNode(true), writeForm);
            }

            // 上部ページネーションは commentTable の直前に挿入
            // （replaceWith は使わず insertAdjacentElement で外枠を保持）
            commentTable.insertAdjacentElement('beforebegin', pagination);
          }
        }
      }

      this.#isInitialized = true;
    } catch (e) {
      console.error('[CommentPageFormatter] init failed:', e);
    }
  }
}

/* --------------------------------------------------
 * IndexPopupHandler
 * --------------------------------------------------
 * 目次ポップアップを生成・制御する Feature。
 * 既存実装から移植。HTML 生成は el() に統一。
 * -------------------------------------------------- */
class IndexPopupHandler {
  #isInitialized = false;
  #panel = null;
  #isVisible = false;
  #hideTimer = null;
  #resizeRaf = 0;

  static #ANIM_MS  = 300;
  static #HIDE_MS  = 300;
  static #MAX_H_OFFSET = 200;

  /** ページ種別を判定 */
  #getPageInfo() {
    const params = new URLSearchParams(location.search);
    return {
      isSingleArticle: params.get('act') === 'dump',
      isAllArticles:   params.get('act') === 'all_msg',
    };
  }

  // ---- インデックス HTML 生成 ----

  /** 単話ページ用インデックス（tableのinnerHTMLを整形して返す） */
  #buildSingleIndex() {
    const table = document.getElementById('table');
    if (!table) return '';

    // タイトルをページタイトルに反映
    const firstLink = table.getElementsByTagName('a')[0];
    if (firstLink && document.title !== undefined) {
      document.title = firstLink.innerHTML;
    }

    return table.innerHTML
      .replace(/<\/?b>/ig, '')
      .replace(/%">([^\n])/ig, '%" noWrap>$1');
  }

  /** 全話ページ用インデックス（DOM で構築） */
  #buildAllIndex() {
    const bgbs = document.getElementsByClassName('bgb');
    if (!bgbs.length) return '';

    // タイトルをページタイトルに反映
    const firstFont = bgbs[0].getElementsByTagName('font')[0];
    if (firstFont && document.title !== undefined) {
      document.title = firstFont.innerHTML;
    }

    const tbody = document.createElement('tbody');

    for (let i = 0; i < bgbs.length; i++) {
      const bgb     = bgbs[i];
      const fontEl  = bgb.getElementsByTagName('font')[0];
      if (!fontEl) continue;

      // アンカーを先頭に挿入（重複防止）
      if (!bgb.querySelector(`a[name="${i}"]`)) {
        const anchor  = document.createElement('a');
        anchor.name   = String(i);
        bgb.insertAdjacentElement('afterbegin', anchor);
      }

      const linkTitle = fontEl.textContent?.trim() || fontEl.innerHTML;

      // 日付を bgb に続く bgc の tt[Date:] から抽出
      let date = '';
      const nextTr = bgb.closest('tr')?.nextElementSibling;
      const bgcTd  = nextTr?.querySelector('td.bgc') ?? nextTr?.querySelector('td');
      if (bgcTd) {
        for (const tt of bgcTd.getElementsByTagName('tt')) {
          const t = tt.textContent || '';
          if (t.includes('Date:')) {
            date = t.replace('Date:', '').trim();
            break;
          }
        }
      }

      const tr = el('tr', {},
        el('td', { nowrap: '', text: `[${i}]` }),
        el('td', {},
          el('a', { href: `#${i}`, text: linkTitle })
        ),
        el('td', { nowrap: '', text: date }),
      );
      tbody.appendChild(tr);
    }

    return tbody.innerHTML;
  }

  // ---- パネル開閉 ----

  #show() {
    clearTimeout(this.#hideTimer);
    if (!this.#panel || this.#isVisible) return;
    this.#panel.style.display = 'block';
    requestAnimationFrame(() => {
      this.#panel.style.opacity   = '1';
      this.#panel.style.transform = 'translateY(0)';
    });
    this.#isVisible = true;
  }

  #hide() {
    if (!this.#panel || !this.#isVisible) return;
    this.#hideTimer = setTimeout(() => {
      this.#panel.style.opacity   = '0';
      this.#panel.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (this.#panel) this.#panel.style.display = 'none';
        this.#isVisible = false;
      }, IndexPopupHandler.#ANIM_MS);
    }, IndexPopupHandler.#HIDE_MS);
  }

  #toggle() {
    this.#isVisible ? this.#hide() : this.#show();
  }

  // ---- UI 構築 ----

  #buildButton() {
    const btn = el('button', {
      id:    'seaiz',
      class: 'ind_swh',
      title: 'インデックスをポップアップ (Ctrl+I)',
      text:  'Index',
    });
    btn.setAttribute('aria-label',    'インデックスを表示');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'tableind');
    return btn;
  }

  #buildPanel(indexHtml) {
    const panel = el('div', {
      id:    'tableind',
      class: 'ind_ind',
    });
    panel.setAttribute('role',       'dialog');
    panel.setAttribute('aria-label', 'インデックス');
    panel.style.maxHeight = `${window.innerHeight - IndexPopupHandler.#MAX_H_OFFSET}px`;

    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    tbody.innerHTML = indexHtml;
    table.appendChild(tbody);
    panel.appendChild(table);

    return panel;
  }

  // ---- イベントハンドラ ----

  #onKeyDown = e => {
    if (e.key === 'i' && e.ctrlKey) { e.preventDefault(); this.#toggle(); }
  };

  #onResize = () => {
    if (!this.#panel) return;
    if (this.#resizeRaf) cancelAnimationFrame(this.#resizeRaf);
    this.#resizeRaf = requestAnimationFrame(() => {
      this.#panel.style.maxHeight =
        `${window.innerHeight - IndexPopupHandler.#MAX_H_OFFSET}px`;
      this.#resizeRaf = 0;
    });
  };

  init() {
    if (this.#isInitialized) return;

    const { isSingleArticle, isAllArticles } = this.#getPageInfo();

    let indexHtml = '';
    if (isSingleArticle)  indexHtml = this.#buildSingleIndex();
    else if (isAllArticles) indexHtml = this.#buildAllIndex();
    if (!indexHtml) return;

    try {
      ensureStyleElement('atb-index-popup', CSS_DEFS.indexPopupBase);

      const button = this.#buildButton();
      this.#panel  = this.#buildPanel(indexHtml);

      // ボタンイベント
      button.addEventListener('mouseover', () => this.#show());
      button.addEventListener('click',     () => this.#toggle());

      // パネルイベント
      this.#panel.addEventListener('mouseover', () => this.#show());
      this.#panel.addEventListener('mouseout',  () => this.#hide());

      // グローバルイベント
      document.addEventListener('keydown', this.#onKeyDown);
      window.addEventListener('resize',   this.#onResize);

      document.body.appendChild(button);
      document.body.insertBefore(this.#panel, document.body.firstChild);

      this.#isInitialized = true;
    } catch (e) {
      console.error('[IndexPopupHandler] init failed:', e.message);
    }
  }

  destroy() {
    document.removeEventListener('keydown', this.#onKeyDown);
    window.removeEventListener('resize',   this.#onResize);
    document.getElementById('seaiz')?.remove();
    document.getElementById('tableind')?.remove();
  }
}

/* ==================================================
 * RENDERERS
 * ================================================== */

/* --------------------------------------------------
 * LinkOptimizer
 * --------------------------------------------------
 * SS一覧テーブル内のリンクを設定に従い書き換える。
 * （既存 ListFormatter.#optimizeLinks から分離）
 * -------------------------------------------------- */
class LinkOptimizer {
  static #RULES = Object.freeze([
    { flag: 'skipXXXWarning',    target: 'href', pattern: /act=18attention/i,   replacement: 'act=list&cate=18&page=1' },
    { flag: 'removeTestBoard',   target: 'text', pattern: /テスト板/i,            replacement: '' },
    { flag: 'openSSInNewTab',    target: 'attr', attrName: 'target', attrValue: '_blank', pattern: /(count=1)/i },
    { flag: 'skipSearchWarning', target: 'href', pattern: /sss\.php$/i,          replacement: 'sss.php?act=list&cate=all&page=1' },
    { flag: 'skipMainWarning',   target: 'href', pattern: /mainbbs\.php$/i,      replacement: 'mainbbs.php?act=list&cate=all&page=1' },
  ]);

  #activeRules;

  constructor(ssListConfig) {
    this.#activeRules = LinkOptimizer.#RULES.filter(r => ssListConfig?.[r.flag]);
  }

  optimize(tableRoot) {
    if (!tableRoot || !this.#activeRules.length) return;
    const links = tableRoot.querySelectorAll(
      'a[href*="sst.php"], a[href*="sss.php"], a[href*="mainbbs.php"]'
    );
    links.forEach(link => {
      let href = link.getAttribute('href') || '';
      for (const rule of this.#activeRules) {
        if (rule.target === 'href') {
          if (rule.pattern.test(href)) {
            href = href.replace(rule.pattern, rule.replacement);
            link.setAttribute('href', href);
          }
        } else if (rule.target === 'text') {
          // 修正：textContent 直接代入によるDOM破壊を防止するヘルパーを呼ぶ
          this.#replaceTextNodes(link, rule.pattern, rule.replacement);
        } else if (rule.target === 'attr') {
          if (rule.pattern.test(href)) {
            link.setAttribute(rule.attrName, rule.attrValue);
          }
        }
      }
    });
  }

  // 修正：追加された安全なテキストノード専用置換ヘルパー
  #replaceTextNodes(node, pattern, replacement) {
    if (node.nodeType === 3) { // Text Node
      if (pattern.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(pattern, replacement);
      }
    } else {
      for (const child of Array.from(node.childNodes)) {
        this.#replaceTextNodes(child, pattern, replacement);
      }
    }
  }
}

/* --------------------------------------------------
 * ListRenderer
 * --------------------------------------------------
 * SS一覧・メイン一覧の各行に対する DOM 更新のみを担当する。
 * 禁止: localStorage参照 / regex判定 / business logic / parser処理 / matcher処理
 * -------------------------------------------------- */
class ListRenderer {
  #config;
  #domCache;

  constructor(config, domCache) {
    this.#config   = config;
    this.#domCache = domCache;
  }

  applyFavoriteClass(row, matchedCategory) {
    row.classList.remove('list-blocked','list-favorite-primary','list-favorite-secondary','list-favorite-watching');
    if (!matchedCategory) return;
    if (matchedCategory === 'blocked') row.classList.add('list-blocked');
    else row.classList.add(`list-favorite-${matchedCategory}`);
  }

  applyBaseStyle(row) {
    row.classList.toggle('list-base-style', !!this.#config.ssList?.adjustLineHeight);
  }

  applyDirectLinks(row, rowData, isChiraura) {
    if (!this.#config.ssList?.directLinks) return;
    if (!rowData.hasDirectLink || !rowData.articleId) return;
    if (!row.classList.contains('bgc')) return;
    const { articleId, bElements } = rowData;

    if (isChiraura) {
      // 記事数 <b>（bElements[-1]）をall_msgリンクに差し替える（v3準拠）
      // チラ裏: b[0]=タイトルb(dumpリンク含む), b[-1]=記事数b("N")
      // 記事数の数字がクリックで全話ページに飛ぶリンクになる
      const bLast = bElements[bElements.length - 1];
      if (bLast) {
        const nodes = Array.from(bLast.childNodes);
        bLast.replaceChildren(this.#createLink('all_msg', articleId, nodes));
      }
      // 修正：DOMCache を活用し不要なDOMクエリを排除
      if (!this.#domCache.query(row, '.impression-cell')) {
        const tdImp = el('td', { align: 'center', class: 'impression-cell' });
        tdImp.appendChild(this.#createLink('impression', articleId, '？', '&page=1'));
        row.insertBefore(tdImp, row.lastElementChild);
      }
    } else {
      const lastIdx = bElements.length - 1;
      const artIdx  = lastIdx - 2;
      const impIdx  = lastIdx - 1;
      if (artIdx >= 0) {
        const bArt  = bElements[artIdx];
        const nodes = Array.from(bArt.childNodes);
        bArt.replaceChildren(this.#createLink('all_msg', articleId, nodes));
      }
      if (impIdx >= 0) {
        const bImp  = bElements[impIdx];
        const nodes = Array.from(bImp.childNodes);
        bImp.replaceChildren(this.#createLink('impression', articleId, nodes, '&page=1'));
      }
    }
  }

  applyPvRatio(row, rowData) {
    if (!this.#config.ssList?.showPvRatio) return;
    const { bElements, pvPerArticle } = rowData;
    const pvIdx = bElements.length - 1;
    if (pvIdx < 0) return;
    bElements[pvIdx].textContent = `${pvPerArticle}/1記事`;
    const cells = row.cells;
    if (cells.length >= 2) cells[cells.length - 2].style.textAlign = 'right';
  }

  appendUnhideButton(table, pageType) {
    table.classList.add(pageType === 'ssList' ? 'ss-list-table' : 'main-list-table');
    const btn = el('button', {
      class: 'list-unhide-button',
      title: 'もう一度不可視にしたい場合はページの再読み込みが必要です',
      text:  '作品不可視化の解除',
    });
    btn.addEventListener('click', () => {
      table.querySelectorAll('tr.list-blocked').forEach(row => {
        row.classList.remove('list-blocked');
        row.style.display = '';
      });
      btn.disabled = true;
    });
    table.appendChild(btn);
  }

  appendImpressionHeader(table) {
    // 修正：DOMCache を活用してテーブル内の先頭行を取得
    const firstRow = this.#domCache.query(table, 'tr:not(.impression-added)');
    if (!firstRow) return;
    const tdImp = el('td', { nowrap: '' });
    tdImp.setAttribute('align', 'center');
    tdImp.textContent = '感想';
    firstRow.insertBefore(tdImp, firstRow.lastElementChild);
    firstRow.classList.add('impression-added');
  }

  #createLink(type, articleId, contentOrNodes, extraParams = '') {
    const a = el('a', {
      href:   `/bbs/sst/sst.php?act=${type}&cate=all&${type === 'all_msg' ? 'all' : 'no'}=${articleId}${extraParams}`,
      target: '_blank',
    });
    if (Array.isArray(contentOrNodes)) a.append(...contentOrNodes);
    else a.textContent = String(contentOrNodes ?? '');
    return a;
  }
}

/* --------------------------------------------------
 * TableRebuilder
 * --------------------------------------------------
 * SS一覧 / メイン一覧テーブルを新構造に再構築する。
 * DOM操作のみ担当。
 * -------------------------------------------------- */
class TableRebuilder {
  #parser;
  constructor(parser) { this.#parser = parser; }

  rebuildSSList(isCategory18) {
    const listTable = this.#parser.findSSListTable(isCategory18);
    if (!listTable) { console.warn('[TableRebuilder] SS一覧テーブルが見つかりません'); return null; }

    const menuCell = this.#parser.extractMenuCell(listTable);
    listTable.id        = 'sslist_table';
    listTable.className = 'sslist_table brdr';

    const tdMenu = el('td', { class: 'ss-menu-cell' });
    if (menuCell) {
      const menuTable = el('table', { id: 'ssmenu', class: 'ss-menu-table brdr' });
      const mTbody    = document.createElement('tbody');
      const trHead    = el('tr', { class: 'bga' }, el('td', { class: 'ss-menu-header' }, el('b', { text: 'MENU' })));
      const trBody    = el('tr', { class: 'bgc' });
      const tdBody    = el('td', { class: 'ssmenu_link' });
      tdBody.append(...Array.from(menuCell.childNodes));
      trBody.appendChild(tdBody);
      mTbody.append(trHead, trBody);
      menuTable.appendChild(mTbody);
      tdMenu.appendChild(menuTable);
    }

    const tdList = el('td', { class: 'ss-list-table-cell' });
    tdList.appendChild(listTable);

    const outer = el('table', { id: 'new_sstable', class: 'ss-main-table' });
    const tbody = document.createElement('tbody');
    const tr    = document.createElement('tr');
    tr.append(tdMenu, tdList);
    tbody.appendChild(tr);
    outer.appendChild(tbody);

    const tables   = document.getElementsByTagName('table');
    const refIdx   = isCategory18 ? 0 : 1;
    const refTable = tables[refIdx];
    if (refTable?.parentNode) refTable.parentNode.insertBefore(outer, refTable.nextSibling);
    else document.body.appendChild(outer);

    return document.getElementById('sslist_table');
  }

  rebuildMainList() {
    const mainTable = this.#parser.findMainListTable();
    if (!mainTable) { console.warn('[TableRebuilder] メインリストテーブルが見つかりません'); return null; }

    const origParent = mainTable.parentNode;
    const origNext   = mainTable.nextSibling;
    mainTable.id        = 'mainlist_table';
    mainTable.className = 'mainlist_table brdr';

    const td    = el('td', { class: 'main-list-table-cell' });
    td.appendChild(mainTable);
    const tr    = document.createElement('tr');
    tr.appendChild(td);
    const tbody = document.createElement('tbody');
    tbody.appendChild(tr);
    const outer = el('table', { id: 'new_maintable', class: 'main-main-table' });
    outer.appendChild(tbody);

    if (origParent) origParent.insertBefore(outer, origNext);
    else document.body.appendChild(outer);

    return document.getElementById('mainlist_table');
  }
}

/* ==================================================
 * FEATURES (続き)
 * ================================================== */

/* --------------------------------------------------
 * ListFormatter
 * --------------------------------------------------
 * SS一覧 / メイン一覧ページの orchestration のみ担当。
 * DOM解析→parser / テーブル再構築→TableRebuilder /
 * 行DOM更新→ListRenderer / リンク書き換え→LinkOptimizer /
 * マッチング→FavoriteMatcher / NGMatcher
 * -------------------------------------------------- */
class ListFormatter {
  #isInitialized = false;
  #config; #pageType; #parser; #favMatcher; #ngMatcher;
  #rebuilder; #renderer; #optimizer; #domCache; #pageInfo;

  constructor(config, pageType, parser, favMatcher, ngMatcher) {
    this.#config     = config;
    this.#pageType   = pageType;
    this.#domCache   = new DOMCache();
    // 修正：Parserに同一の DOMCache を注入し、キャッシュ機能を集約
    this.#parser     = new ArcadiaDOMParser(this.#domCache);
    this.#favMatcher = favMatcher;
    this.#ngMatcher  = ngMatcher;
    this.#rebuilder  = new TableRebuilder(this.#parser);
    this.#renderer   = new ListRenderer(config, this.#domCache);
    this.#optimizer  = new LinkOptimizer(config.ssList);
    this.#pageInfo   = this.#detectPageInfo();
  }

  #detectPageInfo() {
    const params = new URLSearchParams(location.search);
    return {
      isCategory18: params.get('cate') === '18',
      isChiraura:   params.get('cate') === 'tiraura',
      isList:       params.get('act') === 'list' || params.get('act') === 'search',
    };
  }

  #shouldHide(rowData, index) {
    if (this.#pageType !== 'ssList') return false;
    const cfg   = this.#config.ssList;
    const isAd  = cfg.hideAdsShort && rowData.articleCount - 1 < cfg.adsThreshold && index > 3;
    const isLow = cfg.hideLowPv && rowData.pvPerArticle < cfg.pvThreshold;
    return isAd || isLow;
  }

  #processRow(row, index) {
    const rowData = this.#pageType === 'ssList'
      ? this.#parser.parseSSRow(row, this.#pageInfo.isChiraura)
      : this.#parser.parseMainRow(row);
    if (!rowData) return;

    this.#renderer.applyBaseStyle(row);

    if (this.#ngMatcher.isBlocked(rowData.title)) {
      this.#renderer.applyFavoriteClass(row, 'blocked');
      return;
    }

    const cat = this.#favMatcher.matchCategory(rowData.title);
    this.#renderer.applyFavoriteClass(row, cat === 'blocked' ? null : cat);

    if (this.#pageType === 'ssList' && row.classList.contains('bgc')) {
      if (this.#shouldHide(rowData, index)) { row.style.display = 'none'; return; }
      this.#renderer.applyDirectLinks(row, rowData, this.#pageInfo.isChiraura);
      this.#renderer.applyPvRatio(row, rowData);
    }
  }

  #postProcess(table) {
    this.#renderer.appendUnhideButton(table, this.#pageType);
    if (this.#pageType === 'ssList' && this.#pageInfo.isChiraura &&
        this.#pageInfo.isList && this.#config.ssList?.directLinks) {
      this.#renderer.appendImpressionHeader(table);
    }
  }

  #onFavoritesUpdated = () => {
    const table = document.getElementById(
      this.#pageType === 'ssList' ? 'sslist_table' : 'mainlist_table'
    );
    if (!table) return;
    this.#domCache.clear();
    Array.from(table.rows).forEach((row, i) => this.#processRow(row, i));
  };

  init() {
    if (this.#isInitialized) return;
    if (!this.#pageInfo.isList) return;
    ensureStyleElement('atb-list', CSS_DEFS.list);
    requestAnimationFrame(() => {
      const table = this.#pageType === 'ssList'
        ? this.#rebuilder.rebuildSSList(this.#pageInfo.isCategory18)
        : this.#rebuilder.rebuildMainList();
      if (!table) { console.warn(`[ListFormatter] テーブル再構築失敗 (${this.#pageType})`); return; }
      rafChunk(table.rows, (row, i) => this.#processRow(row, i));
      this.#postProcess(table);
      if (this.#pageType === 'ssList') {
        const outer = document.getElementById('new_sstable');
        if (outer) this.#optimizer.optimize(outer);
      }
      EventBus.on('arcadia:favorites-updated', this.#onFavoritesUpdated);
      this.#isInitialized = true;
    });
  }
}

/* --------------------------------------------------
 * StyleControlBar
 * --------------------------------------------------
 * 記事閲覧ページのスタイル変更バー。
 * orchestration + DOM構築 + 設定保存を担当。
 * -------------------------------------------------- */
class StyleControlBar {
  #isInitialized = false;
  #config;
  #currentTheme;
  #defaults;
  #observer;
  #originalHTML = null; // 修正：退避用プロパティを新設

  static #STYLE_MAP = Object.freeze({
    width:           { prop: 'width',           selector: 'table.brdr' },
    lineHeight:      { prop: 'line-height',      selector: 'td.bgc' },
    fontSize:        { prop: 'font-size',        selector: 'td.bgc' },
    fontFamily:      { prop: 'font-family',      selector: 'td.bgc' },
    color:           { prop: 'color',            selector: 'td.bgc' },
    backgroundColor: { prop: 'background-color', selector: '.brdr td.bgc' },
  });

  static #FORMAT_RULES = Object.freeze({
    spacing: {
      applyPattern:  /(<br>)+　*<br>　*<br>/ig,
      applyReplace:  '<xxx></xxx><br><br>',
    },
    indent: {
      applyPattern:  /<br> *([^　 ＜【「『《≪（\(\｢<※])/ig,
      applyReplace:  '<br>　<zzz></zzz>$1',
    },
    linebreak: {
      applyPattern:  /([^。\.\, 」"'》』\)）】≫＞>｣…―・！？\!\?])<br>/ig,
      applyReplace:  '$1<yyy></yyy>',
    },
    wordWrap: {
      applyPattern:  /(.)(\1{6})/ig,
      applyReplace:  '$1$2<wbr>',
    },
    insertspace: {
      applyPatterns: [
        { pattern: /([^」』）》≫\)｣＞】>])<br>([＜【「『《≪（\(｢])/ig, replacement: '$1<ooo><br></ooo><br>$2' },
        { pattern: /([」』）》≫\)｣＞】])<br>([^＜【「『《≪（\(｢<])/ig,  replacement: '$1<ooo><br></ooo><br>$2' },
      ],
    },
  });

  constructor(config) {
    this.#config       = config;
    this.#currentTheme = StorageManager.getTheme();
    this.#defaults     = this.#buildDefaults();
  }

  #buildDefaults() {
    const theme = this.#config.style.themes[this.#currentTheme] || {};
    return {
      width:           this.#config.style.width,
      lineHeight:      this.#config.style.lineHeight,
      fontSize:        this.#config.style.fontSize,
      fontFamily:      this.#config.style.fontFamily,
      color:           theme.color           || '#000000',
      backgroundColor: theme.backgroundColor || '#FFF7D4',
    };
  }

  #applyStyle(key, value) {
    const map = StyleControlBar.#STYLE_MAP[key];
    if (!map) return;
    const isColor = ['color', 'backgroundColor'].includes(key);
    document.querySelectorAll(map.selector).forEach(e => {
      if (isColor && value === this.#defaults[key]) e.style.removeProperty(map.prop);
      else e.style.setProperty(map.prop, value, 'important');
    });
  }

  // 修正：退避したHTMLデータを使い、オンになっている設定のみを一方向かつ安全に再適用
  #applyFormats() {
    const content = document.querySelector('blockquote');
    if (!content || this.#originalHTML === null) return;

    const bar = document.getElementById('style-control-bar');
    if (!bar) return;

    let html = this.#originalHTML;

    for (const [key, rule] of Object.entries(StyleControlBar.#FORMAT_RULES)) {
      const cb = bar.querySelector(`#format-${key}`);
      const saved = StorageManager.getStyleBarSettings();
      const enabled = cb ? cb.checked : (saved ? !!saved.formats?.[key] : !!this.#config.autoExecute[key]);

      if (enabled) {
        if (key === 'insertspace') {
          html = rule.applyPatterns.reduce((acc, { pattern, replacement }) => acc.replace(pattern, replacement), html);
        } else {
          html = html.replace(rule.applyPattern, rule.applyReplace);
        }
      }
    }

    if (content.innerHTML !== html) {
      content.innerHTML = html;
    }
  }

  #saveSettings() {
    const bar = document.getElementById('style-control-bar');
    if (!bar) return;
    const s = { styles: {}, formats: {}, theme: this.#currentTheme };
    bar.querySelectorAll('select[id^="style-"]').forEach(sel => { s.styles[sel.id.replace('style-', '')] = sel.value; });
    bar.querySelectorAll('input[id^="format-"]').forEach(cb  => { s.formats[cb.id.replace('format-', '')] = cb.checked; });
    StorageManager.saveStyleBarSettings(s);
  }

  #loadSettings() {
    const saved = StorageManager.getStyleBarSettings();
    if (!saved) return false;
    if (saved.theme !== this.#currentTheme) {
      saved.styles.color = 'standard';
      saved.styles.backgroundColor = 'standard';
    }
    const bar = document.getElementById('style-control-bar');
    if (!bar) return false;
    Object.entries(saved.styles || {}).forEach(([key, val]) => {
      const sel = bar.querySelector(`#style-${key}`);
      if (!sel) return;
      if (Array.from(sel.options).some(o => o.value === val)) {
        sel.value = val;
        this.#applyStyle(key, val === 'standard' ? this.#defaults[key] : val);
        sel.options[0].textContent = `[標準: ${this.#defaults[key]}]`;
      }
    });
    Object.entries(saved.formats || {}).forEach(([key, val]) => {
      const cb = bar.querySelector(`#format-${key}`);
      if (cb) cb.checked = val;
    });
    this.#applyFormats();
    return true;
  }

  #pctOptions(start, step, count) {
    return Array.from({ length: count }, (_, i) => ({ value: `${start + i * step}%`, label: `${start + i * step}%` }));
  }

  #buildSelect(id, title, options, defaultValue) {
    const select = el('select', { id, class: 'bar_sel' });
    const defOpt = el('option', { value: 'standard', text: `標準: ${defaultValue}` });
    defOpt.selected = true;
    if (id === 'style-color')           defOpt.style.color = defaultValue;
    if (id === 'style-backgroundColor') defOpt.style.backgroundColor = defaultValue;
    select.appendChild(defOpt);
    for (const opt of options) {
      const o = el('option', { value: opt.value, text: opt.label });
      if (opt.style) Object.assign(o.style, opt.style);
      select.appendChild(o);
    }
    const wrap = el('span', { class: 'spn_sel', title });
    wrap.append(`${title} `, select, document.createElement('br'));
    return wrap;
  }

  #buildCheckbox(id, label, title, checked) {
    const input = el('input', { type: 'checkbox', id });
    input.checked = !!checked;
    const lbl = el('label', { htmlFor: id, text: label });
    return el('span', { class: 'spn_inp', title }, input, lbl);
  }

  #buildBar() {
    const d = this.#defaults;
    const COLOR_OPTS = [
      { value: '#000000', label: '黒',   style: { color: '#000000' } },
      { value: '#333333', label: '濃灰', style: { color: '#333333' } },
      { value: '#666666', label: '灰',   style: { color: '#666666' } },
      { value: '#999999', label: '薄灰', style: { color: '#999999' } },
      { value: '#bbbbbb', label: '明灰', style: { color: '#bbbbbb' } },
      { value: '#dddddd', label: '淡灰', style: { color: '#dddddd' } },
      { value: '#ffffff', label: '白',   style: { color: '#ffffff', backgroundColor: '#000000' } },
      { value: '#007700', label: '緑',   style: { color: '#007700' } },
      { value: '#000077', label: '青',   style: { color: '#000077' } },
      { value: '#770000', label: '赤',   style: { color: '#770000' } },
    ];
    const BG_OPTS = [
      { value: '#ffffff', label: '白',   style: { backgroundColor: '#ffffff' } },
      { value: '#dddddd', label: '淡灰', style: { backgroundColor: '#dddddd' } },
      { value: '#bbbbbb', label: '明灰', style: { backgroundColor: '#bbbbbb' } },
      { value: '#999999', label: '薄灰', style: { backgroundColor: '#999999' } },
      { value: '#666666', label: '灰',   style: { backgroundColor: '#666666', color: '#ffffff' } },
      { value: '#333333', label: '濃灰', style: { backgroundColor: '#333333', color: '#ffffff' } },
      { value: '#000000', label: '黒',   style: { backgroundColor: '#000000', color: '#ffffff' } },
      { value: '#E2E2FF', label: '淡青', style: { backgroundColor: '#E2E2FF' } },
      { value: '#FFE2FF', label: '淡紅', style: { backgroundColor: '#FFE2FF' } },
      { value: '#E2FFE2', label: '淡緑', style: { backgroundColor: '#E2FFE2' } },
      { value: '#77AAAA', label: '青緑', style: { backgroundColor: '#77AAAA' } },
    ];
    const FONT_OPTS = [
      { value: '',                          label: '＜――固定幅――＞' },
      { value: 'メイリオ',                   label: 'メイリオ' },
      { value: 'Osaka-Mono',               label: 'Osaka－等幅' },
      { value: 'ＭＳ ゴシック',              label: 'ＭＳ ゴシック' },
      { value: 'ＭＳ 明朝',                label: 'ＭＳ 明朝' },
      { value: '',                          label: '＜――可変幅――＞' },
      { value: 'MeiryoKe_PGothic',         label: 'MeiryoKe_PGothic' },
      { value: 'Hiragino Kaku Gothic Pro',  label: 'ヒラギノ角ゴ Pro' },
      { value: 'Osaka',                    label: 'Osaka' },
      { value: 'ＭＳ Ｐゴシック',            label: 'ＭＳ Ｐゴシック' },
      { value: 'ＭＳ Ｐ明朝',              label: 'ＭＳ Ｐ明朝' },
    ];
    const ae  = this.#config.autoExecute;
    const bar = el('div', { id: 'style-control-bar', class: 'bar_bas' });
    bar.append(
      this.#buildSelect('style-width',          '横幅',       this.#pctOptions(60, 5, 9),   d.width),
      this.#buildSelect('style-lineHeight',      '行間',       this.#pctOptions(100, 25, 9), d.lineHeight),
      this.#buildSelect('style-fontSize',        '文字サイズ', this.#pctOptions(75, 5, 11),  d.fontSize),
      this.#buildSelect('style-fontFamily',      'フォント',   FONT_OPTS,                    d.fontFamily),
      this.#buildSelect('style-color',           '文字色',     COLOR_OPTS,                   d.color),
      this.#buildSelect('style-backgroundColor', '背景色',     BG_OPTS,                      d.backgroundColor),
      this.#buildCheckbox('format-spacing',     '空行', '空行を整理します',           ae.spacing),
      this.#buildCheckbox('format-indent',      '行頭', '段落の頭を下げます',         ae.indent),
      document.createElement('br'),
      this.#buildCheckbox('format-linebreak',   '改行', '不要な改行を削除します',     ae.linebreak),
      this.#buildCheckbox('format-wordWrap',    '連字', 'テーブル横幅破壊の回避',     ae.wordWrap),
      document.createElement('br'),
      this.#buildCheckbox('format-insertspace', '挿行', '会話と地の文の間に空行挿入', ae.insertspace),
      document.createElement('br'),
      el('button', { id: 'reset-button', class: 'reset-button', text: 'デフォルトに戻す' }),
    );
    return bar;
  }

  #setupEvents(bar, swh) {
    bar.addEventListener('change', e => {
      const t = e.target;
      if (t.matches('select')) {
        const key = t.id.replace('style-', '');
        this.#applyStyle(key, t.value === 'standard' ? this.#defaults[key] : t.value);
      } else if (t.matches('input[type="checkbox"]')) {
        this.#applyFormats();
      }
      this.#saveSettings();
    });
    bar.addEventListener('click', e => {
      if (e.target.id !== 'reset-button') return;
      bar.querySelectorAll('select').forEach(sel => {
        sel.selectedIndex = 0;
        const key = sel.id.replace('style-', '');
        sel.options[0].textContent = `標準: ${this.#defaults[key]}`;
        this.#applyStyle(key, this.#defaults[key]);
      });
      bar.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const key = cb.id.replace('format-', '');
        cb.checked = !!this.#config.autoExecute[key];
      });
      this.#applyFormats();
      StorageManager.removeStyleBarSettings();
    });
    swh.addEventListener('click', () => {
      const open = bar.style.display === 'block';
      bar.style.display = open ? 'none' : 'block';
      swh.textContent   = open ? '開く' : '閉じる';
    });
    this.#observer = new MutationObserver(() => {
      const newTheme = StorageManager.getTheme();
      if (newTheme === this.#currentTheme) return;
      this.#currentTheme = newTheme;
      this.#defaults = this.#buildDefaults();
      ['color', 'backgroundColor'].forEach(key => {
        const sel = bar.querySelector(`#style-${key}`);
        if (!sel) return;
        sel.options[0].textContent = `[標準: ${this.#defaults[key]}]`;
        if (sel.value === 'standard') this.#applyStyle(key, this.#defaults[key]);
      });
      this.#saveSettings();
    });
    this.#observer.observe(document.documentElement, { attributes: true });
  }

  init() {
    if (this.#isInitialized || !this.#config.viewer?.styleBar) return;

    // 修正：初期化段階でプレーンなオリジナルのHTMLを完全退避
    const content = document.querySelector('blockquote');
    if (content) {
      this.#originalHTML = content.innerHTML;
    }

    ensureStyleElement('atb-style-bar', CSS_DEFS.styleBar);
    requestAnimationFrame(() => {
      const swh = el('div', { class: 'bar_swh', text: '開く' });
      const bar = this.#buildBar();
      document.body.appendChild(swh);
      document.body.appendChild(bar);
      this.#setupEvents(bar, swh);
      const loaded = this.#loadSettings();
      if (!loaded) {
        this.#applyFormats();
        Object.entries(this.#defaults).forEach(([key, val]) => this.#applyStyle(key, val));
      }
      this.#isInitialized = true;
    });
  }

  destroy() { this.#observer?.disconnect(); }
}

/* --------------------------------------------------
 * SpamFilter  /  FormFiller
 * -------------------------------------------------- */
class SpamFilter {
  static #LONG_ALPHA = /[A-Za-z]{15,}/; // 修正：英字連続の文字条件をより厳しく
  static #URL_ISH    = /(https?:\/\/|www\.)/i;
  #config;
  constructor(config) { this.#config = config; }
  run() {
    if (!this.#config?.board?.hideSpam) return;
    const updates = [];
    document.querySelectorAll('#table tr.bgc').forEach(row => {
      const link = row.querySelector('a');
      if (!link) return;
      const text  = (link.textContent || '').trim();
      if (!text) return;
      const alphaCount = (text.match(/[A-Za-z]/g) || []).length;
      const ratio = alphaCount / Math.max(text.length, 1);

      // 修正：URL有無を必須要件に加味し、二次創作の英語タイトル誤爆を防ぐ
      const isSpam = (SpamFilter.#URL_ISH.test(text) && ratio > 0.5) ||
                     (SpamFilter.#LONG_ALPHA.test(text) && ratio > 0.85);

      if (isSpam) updates.push(() => { row.style.display = 'none'; });
    });
    if (updates.length) requestAnimationFrame(() => updates.forEach(fn => fn()));
  }
}

class FormFiller {
  static #INPUT_MAP = Object.freeze({ name: ['name','iname'], tripcode: ['trip','itrip'], password: ['password','ipass'] });
  #config;
  constructor(config) { this.#config = config; }
  run() {
    if (!this.#config?.posting?.autoFill) return;
    const userInfo = this.#config?.posting?.userInfo;
    if (!userInfo) return;
    const updates = [];
    document.querySelectorAll('input').forEach(input => {
      const name = input.name;
      if (!name) return;
      for (const [key, names] of Object.entries(FormFiller.#INPUT_MAP)) {
        if (!names.includes(name)) continue;
        const v = userInfo[key];
        if (v == null) break;
        updates.push(() => { input.defaultValue = v; if (!input.value) input.value = v; });
        break;
      }
    });
    if (updates.length) requestAnimationFrame(() => updates.forEach(fn => fn()));
  }
}

/* --------------------------------------------------
 * FavoritesUIBuilder
 * -------------------------------------------------- */
class FavoritesUIBuilder {
  static #CC = Object.freeze({
    primary:   { name: '最重要お気に入り', icon: '📚' },
    secondary: { name: 'お気に入り',       icon: '🔖' },
    watching:  { name: 'ウォッチ中',       icon: '👀' },
    blocked:   { name: 'NGワード',         icon: '🚫' },
  });

  static get CATEGORY_CONFIG() { return this.#CC; }

  static createUI(manager) {
    const CC = FavoritesUIBuilder.#CC;
    const container = el('div', { id: 'favorites-manager', class: 'fm-container' });

    const header = el('div', { class: 'fm-header' },
      el('h2', { style: { margin: '0', fontSize: '14px' }, text: 'お気に入り管理' }),
      el('button', { id: 'close-favorites', class: 'fm-close-button', type: 'button', text: '✖' }),
    );
    const jumpWrap = el('div', { class: 'fm-form-section' },
      el('div', { class: 'fm-jump-buttons' },
        ...Object.entries(CC).map(([cat, cfg]) =>
          el('button', { class: `fm-button ${cat}`, dataset: { category: cat }, type: 'button',
                         text: `${cfg.icon} ${cfg.name}` })
        )
      )
    );
    const searchInput = el('input', { type: 'text', id: 'search-favorites', class: 'fm-search', placeholder: '検索...' });
    const clearBtn    = el('button', { id: 'clear-search', class: 'fm-button', type: 'button', text: '✖' });
    clearBtn.style.cssText = 'position:absolute;right:5px;top:50%;transform:translateY(-50%);padding:0 5px;display:none;';
    const searchBox   = el('div', { style: { position: 'relative' } }, searchInput, clearBtn);
    const catSelect   = el('select', { id: 'favorite-category', class: 'fm-select' },
      ...Object.entries(CC).map(([key, cfg]) => el('option', { value: key, text: cfg.name }))
    );
    const newFavInput = el('input', { type: 'text', id: 'new-favorite', class: 'fm-input', placeholder: 'タイトルまたはNGワードを入力' });
    const addBtn      = el('button', { id: 'add-favorite', class: 'fm-button primary', type: 'button', text: '追加' });
    const memoTa      = el('textarea', { id: 'new-favorite-memo', class: 'fm-textarea memo', placeholder: 'メモを入力（お気に入りのみ）' });
    const listWrap    = el('div', { id: 'favorites-list-container' });
    listWrap.appendChild(FavoritesUIBuilder.#buildList(manager.favorites, manager.searchResults));
    const ioButtons   = el('div', { class: 'fm-io-buttons' },
      el('button', { id: 'export-favorites', class: 'fm-button export', type: 'button', text: 'エクスポート' }),
      el('button', { id: 'import-favorites', class: 'fm-button import', type: 'button', text: 'インポート' }),
    );
    const exportTa = el('textarea', { id: 'export-text', class: 'fm-textarea io', placeholder: 'エクスポートデータ' });
    exportTa.style.display = 'none';
    const importTa = el('textarea', {
      id: 'import-text', class: 'fm-textarea io',
      placeholder: '## 最重要お気に入り\n- タイトル1 // メモ1\n## NGワード\n- NGワード1',
    });
    importTa.style.display = 'none';
    const formSection = el('div', { class: 'fm-form-section' },
      searchBox, catSelect, newFavInput, addBtn, memoTa, listWrap, ioButtons, exportTa, importTa
    );
    container.append(header, jumpWrap, formSection);
    return container;
  }

  static #buildList(favorites, searchResults) {
    const CC   = FavoritesUIBuilder.#CC;
    const data = searchResults ?? favorites;
    const ul   = el('ul', { class: 'fm-list' });
    const hasItems = Object.values(data).some(arr => arr?.length > 0);
    if (!hasItems) { ul.appendChild(el('li', { class: 'fm-item', text: '一致する項目なし' })); return ul; }
    for (const [cat, items] of Object.entries(data)) {
      if (!items?.length) continue;
      ul.appendChild(el('li', { class: 'fm-category-header', id: `category-${cat}`, text: CC[cat]?.name ?? cat }));
      for (const item of items) {
        const title  = cat === 'blocked' ? item : item.title;
        const memo   = cat !== 'blocked' && item.memo ? ` (${item.memo})` : '';
        const li     = el('li', { class: 'fm-item' });
        const span   = el('span', { class: 'fm-item-title', text: `${CC[cat]?.icon ?? ''} ${title}${memo}` });
        const delBtn = el('button', { class: 'fm-button remove', type: 'button', dataset: { category: cat, title }, text: '削除' });
        li.append(span, delBtn);
        ul.appendChild(li);
      }
    }
    return ul;
  }

  static refreshList(manager) {
    const wrap = document.getElementById('favorites-list-container');
    if (!wrap) return;
    const old  = wrap.querySelector('.fm-list');
    const next = FavoritesUIBuilder.#buildList(manager.favorites, manager.searchResults);
    const top  = old?.scrollTop ?? 0;
    if (old) old.replaceWith(next); else wrap.appendChild(next);
    requestAnimationFrame(() => { next.scrollTop = top; });
  }
}

/* --------------------------------------------------
 * FavoritesManager
 * -------------------------------------------------- */
class FavoritesManager {
  #isInitialized = false;
  #config;
  favorites     = {};
  searchResults = null;
  #searchTerm   = '';

  constructor(config) {
    this.#config   = config;
    this.favorites = StorageManager.getFavorites(config.favorites);
  }

  #save() { StorageManager.saveFavorites(this.favorites); }

  #add(category, title, memo = '') {
    if (!title) return;
    if (category === 'blocked') {
      if (!this.favorites.blocked.includes(title)) this.favorites.blocked.push(title);
    } else {
      this.favorites[category].push({ title, memo });
    }
    this.#save();
    this.searchResults = null;
  }

  #remove(category, title) {
    if (category === 'blocked') this.favorites.blocked = this.favorites.blocked.filter(w => w !== title);
    else this.favorites[category] = this.favorites[category].filter(i => i.title !== title);
    this.#save();
    if (this.#searchTerm) this.#search(this.#searchTerm);
    else this.searchResults = null;
  }

  /** 部分一致検索 — FavoriteMatcher / NGMatcher と同じ includes ルール */
  #search(term) {
    this.#searchTerm = term;
    if (!term.trim()) { this.searchResults = null; return; }
    const t      = term.toLowerCase();
    const result = { primary: [], secondary: [], watching: [], blocked: [] };
    for (const [cat, items] of Object.entries(this.favorites)) {
      for (const item of items) {
        const s = cat === 'blocked' ? item : item.title;
        if (String(s).toLowerCase().includes(t)) result[cat].push(item);
      }
    }
    this.searchResults = result;
  }

  #export() {
    const CC   = FavoritesUIBuilder.CATEGORY_CONFIG;
    const text = Object.entries(this.favorites)
      .filter(([, items]) => items.length)
      .map(([cat, items]) => {
        const lines = items.map(item =>
          cat === 'blocked' ? `- ${item}` : `- ${item.title}${item.memo ? ` // ${item.memo}` : ''}`
        ).join('\n');
        return `## ${CC[cat]?.name ?? cat}\n${lines}`;
      }).join('\n\n');
    const ta = document.getElementById('export-text');
    const im = document.getElementById('import-text');
    if (!ta || !im) return;
    im.style.display = 'none';
    ta.style.display = 'block';
    ta.value = `# お気に入り一覧\n\n${text}`;
    ta.select();
    try { document.execCommand('copy'); } catch { /* 無視 */ }
    ta.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  #import(text) {
    const CC        = FavoritesUIBuilder.CATEGORY_CONFIG;
    const nameToKey = Object.fromEntries(Object.entries(CC).map(([k, v]) => [v.name, k]));
    const result    = { primary: [], secondary: [], watching: [], blocked: [] };
    let curCat      = null;
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith('## ')) { curCat = nameToKey[line.slice(3)] ?? null; }
      else if (line.startsWith('- ') && curCat) {
        const content = line.slice(2).trim();
        if (!content) continue;
        if (curCat === 'blocked') result.blocked.push(content);
        else {
          const [title, memo = ''] = content.split(' // ').map(s => s.trim());
          if (title) result[curCat].push({ title, memo });
        }
      }
    }
    this.favorites = result;
    this.#save();
    this.searchResults = null;
    FavoritesUIBuilder.refreshList(this);
  }

  #setupEvents(container) {
    const debouncedSearch = debounce(term => {
      this.#search(term);
      FavoritesUIBuilder.refreshList(this);
      const inp    = container.querySelector('#search-favorites');
      const clrBtn = container.querySelector('#clear-search');
      if (inp)    inp.classList.toggle('active', !!term.trim());
      if (clrBtn) clrBtn.style.display = term.trim() ? 'block' : 'none';
    }, 300);

    container.addEventListener('click', e => {
      const t = e.target;
      if (t.matches('#close-favorites'))   { container.style.display = 'none'; return; }
      if (t.matches('#add-favorite')) {
        const title = container.querySelector('#new-favorite')?.value?.trim() ?? '';
        const memo  = container.querySelector('#new-favorite-memo')?.value?.trim() ?? '';
        const cat   = container.querySelector('#favorite-category')?.value ?? 'primary';
        if (title) {
          this.#add(cat, title, memo);
          const ni = container.querySelector('#new-favorite');
          const mi = container.querySelector('#new-favorite-memo');
          if (ni) ni.value = '';
          if (mi) mi.value = '';
          FavoritesUIBuilder.refreshList(this);
        }
        return;
      }
      if (t.matches('#clear-search')) {
        const inp = container.querySelector('#search-favorites');
        if (inp) inp.value = '';
        this.searchResults = null; this.#searchTerm = '';
        t.style.display = 'none';
        container.querySelector('#search-favorites')?.classList.remove('active');
        FavoritesUIBuilder.refreshList(this);
        return;
      }
      if (t.matches('#export-favorites')) { this.#export(); return; }
      if (t.matches('#import-favorites')) {
        const ta = container.querySelector('#import-text');
        const ea = container.querySelector('#export-text');
        if (!ta) return;
        if (ta.style.display === 'none') {
          if (ea) ea.style.display = 'none';
          ta.style.display = 'block'; ta.focus();
        } else { this.#import(ta.value.trim()); ta.style.display = 'none'; }
        return;
      }
      if (t.matches('.fm-button.remove')) {
        this.#remove(t.dataset.category, t.dataset.title);
        FavoritesUIBuilder.refreshList(this);
        return;
      }
      if (t.matches('.fm-jump-buttons .fm-button')) {
        container.querySelector(`#category-${t.dataset.category}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    container.querySelector('#search-favorites')?.addEventListener('input', e => debouncedSearch(e.target.value));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && container.style.display !== 'none' && this.#searchTerm) {
        const inp = container.querySelector('#search-favorites');
        if (inp) inp.value = '';
        this.searchResults = null; this.#searchTerm = '';
        FavoritesUIBuilder.refreshList(this);
      }
    });
  }

  init() {
    if (this.#isInitialized) return;
    ensureStyleElement('atb-favorites', CSS_DEFS.favorites);
    const toggleBtn = el('button', { class: 'fm-toggle-button', text: 'お気に入り' });
    toggleBtn.addEventListener('click', () => {
      let container = document.getElementById('favorites-manager');
      if (!container) {
        container = FavoritesUIBuilder.createUI(this);
        document.body.appendChild(container);
        this.#setupEvents(container);
      }
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
    });
    document.body.appendChild(toggleBtn);
    this.#isInitialized = true;
  }
}

/* --------------------------------------------------
 * ConfigManager
 * -------------------------------------------------- */
class ConfigManager {
  #defaultConfig;
  constructor(defaultConfig) { this.#defaultConfig = JSON.parse(JSON.stringify(defaultConfig)); }
  load()  { return StorageManager.getConfig(this.#defaultConfig); }
  save(c) { StorageManager.saveConfig(c); }
  reset() { return StorageManager.resetConfig(this.#defaultConfig); }

  getEditableFields() {
    return {
      viewer: {
        displayName: '閲覧設定',
        fields: [
          { id: 'styleBar',      label: 'スタイル設定バー表示', type: 'checkbox', value: true },
          { id: 'fixedIndex',    label: '目次埋め込み',          type: 'checkbox', value: true },
          { id: 'skipErrorPage', label: '抜け記事エラー回避',    type: 'checkbox', value: true },
        ],
      },
      ssList: {
        displayName: '記事一覧での設定',
        fields: [
          { id: 'directLinks',       label: '全話・感想直リンク',      type: 'checkbox', value: true },
          { id: 'hideAdsShort',      label: '広告・短編非表示',        type: 'checkbox', value: false },
          { id: 'adsThreshold',      label: '広告閾値',                type: 'number',   value: 1 },
          { id: 'showPvRatio',       label: 'PV÷記事数表示',          type: 'checkbox', value: false },
          { id: 'hideLowPv',         label: '低PV率非表示',            type: 'checkbox', value: false },
          { id: 'pvThreshold',       label: 'PV閾値',                  type: 'number',   value: 500 },
          { id: 'skipXXXWarning',    label: 'XXX板警告スキップ',       type: 'checkbox', value: true },
          { id: 'removeTestBoard',   label: 'テスト板リンク削除',       type: 'checkbox', value: true },
          { id: 'openSSInNewTab',    label: 'SSを新タブで開く',         type: 'checkbox', value: true },
          { id: 'skipSearchWarning', label: '捜索掲示板警告スキップ',   type: 'checkbox', value: true },
          { id: 'skipMainWarning',   label: 'メイン掲示板警告スキップ', type: 'checkbox', value: true },
        ],
      },
      board: {
        displayName: '感想ページ/掲示板設定',
        fields: [
          { id: 'embedPageLinks', label: '感想ページにリンク埋め込み', type: 'checkbox', value: true },
          { id: 'sortDesc',       label: '感想順を降順に',             type: 'checkbox', value: true },
          { id: 'japaneseDate',   label: '日本語日付表示',             type: 'checkbox', value: true },
          { id: 'adjustStyle',    label: '行高・文字色修正',           type: 'checkbox', value: false },
          { id: 'searchBar',      label: '検索バー埋め込み',           type: 'checkbox', value: true },
          { id: 'hideSpam',       label: 'スパム非表示',               type: 'checkbox', value: true },
        ],
      },
      posting: {
        displayName: '投稿設定',
        fields: [{ id: 'autoFill', label: '自動入力', type: 'checkbox', value: false }],
        userInfo: [
          { id: 'name',     label: '名前',       type: 'text',     value: 'ねじりん' },
          { id: 'tripcode', label: 'トリップ',   type: 'text',     value: 'eclipse' },
          { id: 'password', label: 'パスワード', type: 'password', value: '5550' },
        ],
      },
      style: {
        displayName: 'デフォルトスタイル設定',
        fields: [
          { id: 'width',      label: '幅',        type: 'text', value: '90%' },
          { id: 'lineHeight', label: '行間',       type: 'text', value: '150%' },
          { id: 'fontSize',   label: '文字サイズ', type: 'text', value: '100%' },
        ],
        themes: {
          light: [
            { id: 'color',           label: '文字色', type: 'text', value: '#000000' },
            { id: 'backgroundColor', label: '背景色', type: 'text', value: '#FFF7D4' },
          ],
          dark: [
            { id: 'color',           label: '文字色', type: 'text', value: '#FFFFFF' },
            { id: 'backgroundColor', label: '背景色', type: 'text', value: '#2a2620' },
          ],
        },
      },
      autoExecute: {
        displayName: 'デフォルト自動実行設定',
        fields: [
          { id: 'spacing',     label: '空行圧縮',           type: 'checkbox', value: true },
          { id: 'indent',      label: '段落頭を字下げ',     type: 'checkbox', value: false },
          { id: 'linebreak',   label: '段落途中の改行無視', type: 'checkbox', value: false },
          { id: 'wordWrap',    label: '横幅破壊回避',       type: 'checkbox', value: true },
          { id: 'insertspace', label: '空行挿入',           type: 'checkbox', value: true },
        ],
      },
    };
  }
}

/* --------------------------------------------------
 * SettingsEditor
 * -------------------------------------------------- */
class SettingsEditor {
  #isInitialized = false;
  #configManager;
  #currentConfig;

  constructor(configManager) {
    this.#configManager = configManager;
    this.#currentConfig = configManager.load();
  }

  #get(path) { return path.split('.').reduce((o, k) => o?.[k], this.#currentConfig); }

  #set(path, value) {
    const parts = path.split('.');
    let cur = this.#currentConfig;
    for (let i = 0; i < parts.length - 1; i++) { cur[parts[i]] ??= {}; cur = cur[parts[i]]; }
    cur[parts.at(-1)] = value;
  }

  #findFieldDef(path) {
    const editable = this.#configManager.getEditableFields();
    const [cat, second, third, fourth] = path.split('.');
    const catData = editable[cat];
    if (!catData) return null;
    if (second === 'themes' && third && fourth) return catData.themes?.[third]?.find(f => f.id === fourth) ?? null;
    if (second === 'userInfo' && third) return catData.userInfo?.find(f => f.id === third) ?? null;
    return catData.fields?.find(f => f.id === second) ?? null;
  }

  #buildField(field, category) {
    const path   = `${category}.${field.id}`;
    const idAttr = path.replace(/\./g, '-');
    const raw    = this.#get(path);
    const value  = this.#validate(raw, field.type, field.value);
    const input  = el('input', {
      id:   idAttr,
      type: field.type === 'checkbox' ? 'checkbox' : field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text',
      dataset: { path },
    });
    if (field.type === 'checkbox') input.checked = !!value;
    else input.value = String(value ?? '');
    if (field.type === 'number') input.min = '0';
    const label = el('label', { htmlFor: idAttr, title: field.description ?? '', text: field.label });
    return el('div', { class: 'se-form-grid' }, label, input);
  }

  #buildUI() {
    const container = el('div', { id: 'settings-editor', class: 'se-container' });
    const fixedHeader = el('div', { class: 'se-fixed-header' },
      el('div', { class: 'se-header' },
        el('h2', { class: 'se-title', text: '設定編集' }),
        el('button', { id: 'close-settings', class: 'se-close-button', type: 'button', text: '✖' }),
      )
    );
    const buttonsContainer = el('div', { class: 'se-buttons-container' },
      el('div', { class: 'se-form-section buttons' },
        el('button', { class: 'se-button se-button-primary', dataset: { action: 'save' },  type: 'button', text: '保存' }),
        el('button', { class: 'se-button se-button-danger',  dataset: { action: 'reset' }, type: 'button', text: 'リセット' }),
      )
    );
    const lists    = el('div', { class: 'se-lists-container' });
    const editable = this.#configManager.getEditableFields();
    for (const [catKey, catData] of Object.entries(editable)) {
      const catDiv  = el('div', { class: 'se-category' });
      const header  = el('div', { class: 'se-category-header', dataset: { category: catKey } },
        el('h3', { class: 'se-category-title', text: `${catData.displayName} ▶` })
      );
      const section = el('div', { class: 'se-form-section', style: { display: 'none' } });
      for (const f of (catData.fields ?? [])) section.appendChild(this.#buildField(f, catKey));
      if (catData.userInfo) {
        section.appendChild(el('h4', { text: 'ユーザーデータ' }));
        for (const f of catData.userInfo) section.appendChild(this.#buildField(f, `${catKey}.userInfo`));
      }
      if (catData.themes) {
        for (const [thName, thFields] of Object.entries(catData.themes)) {
          section.appendChild(el('h4', { text: thName === 'light' ? 'ライトテーマ' : 'ダークテーマ' }));
          for (const f of thFields) section.appendChild(this.#buildField(f, `${catKey}.themes.${thName}`));
        }
      }
      catDiv.append(header, section);
      lists.appendChild(catDiv);
    }
    container.append(fixedHeader, buttonsContainer, lists);
    return container;
  }

  #validate(value, type, defaultValue) {
    if (type === 'checkbox') return typeof value === 'boolean' ? value : defaultValue;
    if (type === 'number') { const n = parseInt(value, 10); return !isNaN(n) && n >= 0 ? n : defaultValue; }
    if (typeof value === 'string') {
      if (value.startsWith('#') && !/^#[0-9A-F]{6}$/i.test(value)) return defaultValue;
      return value;
    }
    return defaultValue;
  }

  #setupEvents(editor) {
    editor.addEventListener('click', e => {
      const t = e.target;
      if (t.matches('#close-settings')) { editor.style.display = 'none'; return; }
      if (t.dataset.action === 'save') {
        this.#currentConfig = this.#configManager.load();
        editor.querySelectorAll('input[data-path]').forEach(input => {
          const path = input.dataset.path;
          const def  = this.#findFieldDef(path);
          const type = def?.type ?? (input.type === 'checkbox' ? 'checkbox' : input.type === 'number' ? 'number' : 'text');
          const raw  = type === 'checkbox' ? input.checked : input.value;
          this.#set(path, this.#validate(raw, type, def?.value));
        });
        this.#configManager.save(this.#currentConfig);
        alert('設定を保存しました。ページをリロードして反映してください。');
        return;
      }
      if (t.dataset.action === 'reset') {
        this.#currentConfig = this.#configManager.reset();
        this.#refreshUI(editor);
        alert('設定をリセットしました。ページをリロードして反映してください。');
        return;
      }
      const catHeader = t.closest('.se-category-header');
      if (catHeader) {
        const section = catHeader.nextElementSibling;
        const title   = catHeader.querySelector('.se-category-title');
        const catKey  = catHeader.dataset.category;
        const catName = this.#configManager.getEditableFields()[catKey]?.displayName ?? '';
        const open    = section.style.display !== 'none';
        section.style.display = open ? 'none' : 'block';
        if (title) title.textContent = `${catName} ${open ? '▶' : '▼'}`;
      }
    });
    editor.addEventListener('input', e => {
      const input = e.target;
      if (!input.dataset.path) return;
      const def = this.#findFieldDef(input.dataset.path);
      if (!def) return;
      const raw = def.type === 'checkbox' ? input.checked : input.value;
      const val = this.#validate(raw, def.type, def.value);
      if (def.type === 'checkbox') input.checked = !!val;
      else input.value = val;
      this.#set(input.dataset.path, val);
    });
  }

  #refreshUI(editor) {
    this.#currentConfig = this.#configManager.load();
    editor.querySelectorAll('input[data-path]').forEach(input => {
      const val = this.#get(input.dataset.path);
      if (input.type === 'checkbox') input.checked = !!val;
      else input.value = String(val ?? '');
    });
  }

  init() {
    if (this.#isInitialized) return;
    ensureStyleElement('atb-settings', CSS_DEFS.settings);
    const btn = el('button', { class: 'se-settings-button', text: '⚙️ 設定' });
    btn.addEventListener('click', () => {
      this.#currentConfig = this.#configManager.load();
      let editor = document.getElementById('settings-editor');
      if (!editor) {
        editor = this.#buildUI();
        editor.style.display = 'none';
        document.body.appendChild(editor);
        this.#setupEvents(editor);
      }
      editor.style.display = editor.style.display === 'none' ? 'block' : 'none';
      this.#refreshUI(editor);
    });
    document.body.appendChild(btn);
    this.#isInitialized = true;
  }
}

/* ==================================================
 * INITIALIZE
 * ================================================== */

/**
 * boot - 各ページ種別に応じた Feature を起動する
 */
function boot(ctx) {
  const { config, parser, favMatcher, ngMatcher, themeManager } = ctx;
  const { pageType, act } = RouteManager.detect();
  if (!pageType) return;

  themeManager.init();

  // ---- ssList (/bbs/sst/sst.php) ----
  if (pageType === 'ssList') {
    if (act === 'list' || act === 'search') {
      new ListFormatter(config, 'ssList', parser, favMatcher, ngMatcher).init();
      new FavoritesManager(config).init();
      new SettingsEditor(ctx.configManager).init();
    }
    if (act === 'dump' || act === 'all_msg') {
      if (config.viewer?.styleBar)      new StyleControlBar(config).init();
      if (config.viewer?.skipErrorPage) new ArticleGapHandler(config, parser).init();
      if (config.viewer?.fixedIndex)    new IndexPopupHandler().init();
    }
    if (act === 'impression') {
      new CommentPageFormatter(config, parser).init();
      new FormFiller(config).run();
    }
  }

  // ---- search / mainbb ----
  if (pageType === 'search' || pageType === 'mainbb') {
    new ListFormatter(config, 'mainList', parser, favMatcher, ngMatcher).init();
    if (config.board?.searchBar) new NovelSearchBar(config).init();
    new FavoritesManager(config).init();
    new SettingsEditor(ctx.configManager).init();
    new SpamFilter(config).run();
    new FormFiller(config).run();
  }
}

/**
 * main - エントリーポイント
 */
function main() {
  if (RouteManager.handleRedirect()) return;

  EventBus.bridgeWindowEvents();

  const configManager = new ConfigManager(CONFIG);
  const config        = configManager.load();
  const domCache      = new DOMCache(); // 修正：共通のDOMCacheを生成してParserに注入
  const parser        = new ArcadiaDOMParser(domCache);
  const favMatcher    = new FavoriteMatcher();
  const ngMatcher     = new NGMatcher();
  const themeManager  = new ThemeManager();

  const favorites = StorageManager.getFavorites(config.favorites);
  favMatcher.load(favorites);
  ngMatcher.load(favorites.blocked);

  EventBus.on('arcadia:favorites-updated', data => {
    const updated = data?.favorites ?? StorageManager.getFavorites(config.favorites);
    favMatcher.load(updated);
    ngMatcher.load(updated.blocked);
  });

  boot({ config, parser, favMatcher, ngMatcher, themeManager, configManager });

  console.info('[ArcadiaToolBarNext] v4.00 boot OK');
}

/* --------------------------------------------------
 * 起動
 * --------------------------------------------------
 * booted フラグで main() の二重呼び出しを防ぐ。
 * bfcache 復帰（pageshow）でも再起動しない。
 * （Arcadia は SPA ではないため bfcache 復帰後の
 *   再実行は不要と判断。必要なら flag を外すこと。）
 * -------------------------------------------------- */
let booted = false;

function safeBoot() {
  if (booted) return;
  booted = true;
  main();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeBoot, { once: true });
} else {
  safeBoot();
}

window.addEventListener('pageshow', e => {
  if (e.persisted) safeBoot();
}, { once: true });
