// ==UserScript==
// @name                     ArcadiaToolBar
// @namespace            ArcadiaToolBar
// @description        小説の体裁を操作できるバーがＰＯＰしてくれます。(Arcadia専用)
// @include                http://www.mai-net.net/bbs/*
// @include                http://mai-net.ath.cx/bbs/*
// @version                3.00
// ==/UserScript==

// 機能設定の定義

const CONFIG = deepFreeze({
    // 閲覧機能
    viewer: {
        styleBar: true,  // 体裁変更バーの埋め込み
        fixedIndex: true,  // 目次の固定位置埋め込み
        skipErrorPage: true,  // 歯抜け記事のエラー画面回避
    },
    // SSリスト設定
    ssList: {
        directLinks: true,  // 全話・感想板への直リンク
        hideAdsShort: false,  // 広告・短編SSの非表示
        adsThreshold: 1,  // 広告判定閾値
        adjustLineHeight: true,  // 行高・文字色の修正
        showPvRatio: false,  // PV÷記事数表示
        hideLowPv: false,  // 低PV率SS非表示
        pvThreshold: 500,  // PV率閾値

        skipXXXWarning: true,       // XXX板の警告をスキップ
        removeTestBoard: true,      // テスト板リンクを削除
        openSSInNewTab: true,        // SSを常に新しいタブで開く
        skipSearchWarning: true,     // 捜索掲示板の注意書きをスキップ
        skipMainWarning: true,       // メイン掲示板の注意書きをスキップ
    },
    // 掲示板設定
    board: {
        embedPageLinks: true,  // 感想ページリンクリスト埋め込み
        sortDesc: true,  // レス順を降順に
        japaneseDate: true,  // 日本語日付表示
        adjustStyle: false,  // 行高・文字色の修正
        searchBar: true,  // 検索バー埋め込み
        hideSpam: true,  // メイン板の荒らし記事不可視化
    },
    // 投稿設定
    posting: {
        autoFill: false,  // 投稿情報の自動入力
        userInfo: {
            name: 'ねじりん',
            tripcode: 'eclipse',
            password: '5550'
        }
    },
    // スタイル設定
    style: {
        width: '90%',
        lineHeight: '150%',
        fontSize: '100%',
        fontFamily: '',
        themes: {
            light: {
                color: '#000000',
                backgroundColor: '#FFF7D4'
            },
            dark: {
                color: '#FFFFFF',
                backgroundColor: '#2a2620'
            }
        }
    },
    // 自動実行設定
    autoExecute: {
        spacing: true,  // 無駄な空行を圧縮
        indent: false,  // 段落の頭を字下げ
        linebreak: false,  // 段落途中の改行を無視
        wordWrap: true,  // 連続文字によるテーブル横幅破壊の回避
        insertspace: true   // 会話と地の文の間に空行挿入
    },
    // お気に入り設定
    favorites: {
        primary: [
        ],
        secondary: [
        ],
        watching: [
        ],
        blocked: [
        ],
    },
});

function deepFreeze(obj) {
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Object.isFrozen(obj[key])) {
            deepFreeze(obj[key]);
        }
    });
    return Object.freeze(obj);
}

//検索バー
class NovelSearchBar {
    static #SEARCH_CONFIGS = {
        // 共通設定
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
                { name: 'page', value: '1' }
            ],
            options: {
                name: 'cate',
                default: 'all',
                items: [
                    { value: 'all', label: '検索場所：全て' },
                    { value: 'tiraura', label: 'チラシの裏' },
                    { value: 'eva', label: 'エヴァ' },
                    { value: 'nade', label: 'ナデシコ' },
                    { value: 'akamatu', label: '赤松健' },
                    { value: 'type-moon', label: 'TYPE-MOON' },
                    { value: 'muv-luv', label: 'Muv-Luv' },
                    { value: 'ff', label: 'スクエニ' },
                    { value: 'sammon', label: 'サモンナイト' },
                    { value: 'toraha', label: 'とらハ' },
                    { value: 'gs', label: '椎名高志' },
                    { value: 'naruto', label: 'ナルト' },
                    { value: 'zero', label: 'ゼロ魔' },
                    { value: 'HxH', label: 'HxH' },
                    { value: 'original', label: 'オリジナル' },
                    { value: 'etc', label: 'その他' },
                    { value: '18', label: 'ＸＸＸ' }
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
                    { value: 'new', label: '新着順' },
                    { value: 'notorder', label: 'おまかせ順' },
                    { value: 'weekly', label: '週間ユニーク順' },
                    { value: 'favnovelcnt', label: 'お気に入り順' },
                    { value: 'reviewcnt', label: 'レビューの多い順' },
                    { value: 'hyoka', label: '総合評価の高い順' },
                    { value: 'hyokacnt', label: '評価者数の多い順' },
                    { value: 'lengthdesc', label: '文字数の多い順' },
                    { value: 'old', label: '古い順' }
                ],
            },
        },
        hameln: {
            action: 'https://syosetu.org/search/',
            buttonText: 'ハーメルンで検索',
            hiddenInputs: [{ name: 'mode', value: 'search' }],
        },
    };

    #container;              // 検索バーのコンテナ要素
    #searchPanel;            // 検索パネルの要素
    #toggleButton;           // 検索バーの表示/非表示を切り替えるボタン
    #isInitialized = false;  // 初期化済みフラグ
    #formCache = new Map();  // 検索フォームのキャッシュ

    // コンストラクタ: 設定を受け取り、イミュータブル化して初期化
    constructor(config) {
        this.config = Object.freeze({ ...config }); // 設定を読み取り専用に
        this.#container = null;
        this.#searchPanel = null;
        this.#toggleButton = null;
    }

    // 検索フォームのHTMLを生成する共通メソッド
    #createSearchForm(type) {
        if (this.#formCache.has(type)) return this.#formCache.get(type);

        const baseConfig = NovelSearchBar.#SEARCH_CONFIGS.base;
        const config = { ...baseConfig, ...NovelSearchBar.#SEARCH_CONFIGS[type] };
        if (!config) return '';

        const hiddenInputs = config.hiddenInputs
            .map(({ name, value }) => `<input type="hidden" name="${name}" value="${value}">`)
            .join('');

        const optionsHTML = config.options ? `
            <select name="${config.options.name}" class="search-select" title="検索オプション">
                ${config.options.items.map(opt =>
                    `<option value="${opt.value}"${opt.value === config.options.default ? ' selected' : ''}>${opt.label}</option>`
                ).join('')}
            </select>
        ` : '';

        const formHTML = `
            <form method="${config.method}" action="${config.action}" target="${config.target}" class="search-form">
                ${hiddenInputs}
                ${optionsHTML}
                <input type="text" name="${config.searchParam}" class="search-input" title="検索ワード入力">
                <button type="submit" class="search-button">${config.buttonText}</button>
            </form>
        `;

        this.#formCache.set(type, formHTML);
        return formHTML;
    }

    // 検索パネルの表示/非表示を切り替え
    #toggleSearchPanel = () => {
        if (!this.#searchPanel) return; // パネルが未生成なら何もしない
        this.#searchPanel.style.display = this.#searchPanel.style.display === 'block' ? 'none' : 'block';
    }

    // イベントハンドリングをデバウンス処理で制限
    #debounce(func, wait = 400) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait); // 指定時間後に実行
        };
    }

    // DOM要素を生成しイベントリスナーを一括設定
    #initializeDOM() {
        if (this.#container) return;

        const fragment = document.createDocumentFragment();
        this.#container = document.createElement('div');
        this.#container.className = 'search-bar-container';

        this.#toggleButton = document.createElement('button');
        this.#toggleButton.className = 'search-toggle-button';
        this.#toggleButton.textContent = '検索';
        this.#toggleButton.title = '検索バーの表示／非表示';

        this.#searchPanel = document.createElement('div');
        this.#searchPanel.className = 'search-bar-panel';
        this.#searchPanel.innerHTML = `
            <button class="close-button" title="検索バーを閉じる">×</button>
            ${this.#createSearchForm('arcadia')}
            ${this.#createSearchForm('narou')}
            ${this.#createSearchForm('hameln')}
        `;

        this.#container.append(this.#toggleButton, this.#searchPanel);
        fragment.appendChild(this.#container);

        this.#toggleButton.addEventListener('click', this.#toggleSearchPanel);
        const closeButton = this.#searchPanel.querySelector('.close-button');
        closeButton?.addEventListener('click', this.#toggleSearchPanel);

        const debouncedSubmit = this.#debounce((e) => {
            const input = e.target.querySelector('.search-input');
            if (!input?.value.trim()) {
                e.preventDefault();
                return;
            }
        }, 400);

        this.#searchPanel.querySelectorAll('.search-form').forEach(form => {
            form.addEventListener('submit', debouncedSubmit);
        });

        requestAnimationFrame(() => document.body.appendChild(fragment));
    }

    // 検索バーを初期化
    init() {
        if (this.#isInitialized || !this.config?.board?.searchBar) return; // 初期化済みまたは設定無効ならスキップ

        try {
            this.#initializeDOM(); // DOM生成とイベント設定を実行
            if (!NovelSearchBarStyles.isInitialized()) NovelSearchBarStyles.init();
            this.#isInitialized = true; // 初期化完了フラグを立てる
        } catch (error) {
            console.error('NovelSearchBar initialization failed:', {
                message: error.message,
                stack: error.stack
            });
            alert('検索バーの初期化に失敗しました。詳細はコンソールを確認してください。'); // ユーザーへのフィードバックを追加
        }
    }
}

//検索バースタイル設定
class NovelSearchBarStyles {
    static #styleElement = null;
    static #isInitialized = false;
    static init() {
        if (this.#styleElement) return;

        this.#styleElement = document.createElement('style');
        this.#styleElement.id = 'novel-search-styles';
        this.#styleElement.textContent = `
            /* ベーステーマ（ライト） */
            :root {
                /* 共通変数 */
                --search-button-primary: #007bff;
                --search-button-primary-hover: #0056b3;
                --search-close-hover: #dc3545;
                --search-shadow: rgba(0,0,0,0.1);
                /* ライトテーマ（デフォルト） */
                --search-bg: #ffffff;
                --search-text: #333333;
                --search-border: #dee2e6;
                --search-button-bg: #f8f9fa;
                --search-button-hover: #e9ecef;
                --search-input-bg: #ffffff;
                --search-input-border: #ced4da;
            }
            :root[data-theme="dark"] {
                /* ダークテーマの差分のみ */
                --search-bg: #1a1a1a;
                --search-text: #e0e0e0;
                --search-border: #444444;
                --search-button-bg: #2a2a2a;
                --search-button-hover: #3d3d3d;
                --search-input-bg: #2a2a2a;
                --search-input-border: #444444;
            }
            .search-bar-container {
                position: fixed;
                top: 60px;
                left: 20px;
                z-index: 1000;
                font-family: Arial, sans-serif;
            }
            .search-toggle-button {
                background-color: var(--search-button-bg);
                border: 1px solid var(--search-border);
                border-radius: 4px;
                padding: 6px 12px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
                color: var(--search-text);
            }
            .search-toggle-button:hover {
                background-color: var(--search-button-hover);
            }
            .search-bar-panel {
                display: none;
                background-color: var(--search-bg);
                border: 1px solid var(--search-border);
                border-radius: 4px;
                padding: 12px;
                box-shadow: 0 2px 4px var(--search-shadow);
                width: 600px;
                color: var(--search-text);
                max-height: 70vh;
                overflow-y: auto;
            }
            .search-form {
                margin-bottom: 8px;
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .search-form:last-child {
                margin-bottom: 0;
            }
            .search-select, .search-input {
                padding: 4px;
                border: 1px solid var(--search-input-border);
                border-radius: 4px;
                font-size: 14px;
                background-color: var(--search-input-bg);
                color: var(--search-text);
            }
            .search-input {
                flex-grow: 1;
                padding: 4px 8px;
            }
            .search-button {
                padding: 4px 12px;
                background-color: var(--search-button-primary);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s ease;
            }
            .search-button:hover {
                background-color: var(--search-button-primary-hover);
            }
            .close-button {
                position: absolute;
                top: 8px;
                right: 8px;
                cursor: pointer;
                padding: 4px 8px;
                border: none;
                background: none;
                font-size: 16px;
                color: var(--search-text);
            }
            .close-button:hover {
                color: var(--search-close-hover);
            }
        `;
        document.head.appendChild(this.#styleElement);
        this.#isInitialized = true;
    }
    static isInitialized() {
        return this.#isInitialized;
    }
}

// リストページのフォーマッター
class ListFormatter {
    #isInitialized = false; // 初期化済みフラグ
    #tableCache = null; // テーブルキャッシュ用プロパティ

    constructor(config, pageType = 'ssList') {
        this.config = config || {}; // 設定オブジェクトを受け取り、デフォルトで空オブジェクト
        this.pageType = pageType; // 'ssList' または 'mainList'
        this.pageInfo = this.#getPageInfo(); // ページ情報を初期化
        this.currentTheme = localStorage.getItem('ss-theme') || 'light'; // 現在のテーマを設定、デフォルトは'light'
        this.favoritePatterns = this.#loadOrInitFavoritePatterns(); // お気に入りパターンをキャッシュから読み込みまたは初期化
    }

    static #linkPatterns = {
        skipXXXWarning: { pattern: /act=18attention/ig, replacement: 'act=list&cate=18&page=1', target: 'href' },
        removeTestBoard: { pattern: /テスト板/ig, replacement: '', target: 'text' },
        openSSInNewTab: { pattern: /(count=1)/ig, replacement: '$1', attr: 'target', value: '_blank', target: 'href' },
        skipSearchWarning: { pattern: /sss\.php/ig, replacement: 'sss.php?act=list&cate=all&page=1', target: 'href' },
        skipMainWarning: { pattern: /mainbbs\.php/ig, replacement: 'mainbbs.php?act=list&cate=all&page=1', target: 'href' },
    };

    // ページ情報を取得
    #getPageInfo() {
        const params = new URLSearchParams(window.location.search);
        if (this.pageType === 'ssList') {
            return {
                isCategory18: params.get('cate') === '18',// 18禁カテゴリ判定
                isChiraura: params.get('cate') === 'tiraura',// チラ裏カテゴリ判定
                islist: params.get('act') === 'list'// リストページ判定
            };
        }
        return { islist: params.get('act') === 'list' }; // メインページはシンプルに
    }

    // キャッシュされたテーブルを取得
    #getTable() {
        return this.#tableCache || (this.#tableCache = document.getElementById(this.pageType === 'ssList' ? 'sslist_table' : 'mainlist_table'));
    }

    // 永続キャッシュを読み込み、なければ初期化
    #loadOrInitFavoritePatterns() {
        const cached = JSON.parse(localStorage.getItem('favorite_patterns_cache') || '{}');
        if (Object.keys(cached).length > 0) {
            const patterns = Object.fromEntries(
                Object.entries(cached).map(([type, pattern]) => [
                    type,
                    pattern?.source?.trim() ? new RegExp(pattern.source, pattern.flags || 'i') : null
                ])
            );
            if (Object.values(patterns).some(p => p instanceof RegExp)) return patterns;
        }
        const favorites = JSON.parse(localStorage.getItem('arcadia_favorites') || '{}') || this.config.favorites || {};
        const patterns = this.#generatePatterns(favorites);
        localStorage.setItem('favorite_patterns_cache', JSON.stringify(
            Object.fromEntries(
                Object.entries(patterns).map(([type, pattern]) => [
                    type,
                    pattern ? { source: pattern.source, flags: pattern.flags } : null
                ])
            )
        ));
        return patterns;
    }

    // お気に入りとNGパターンを生成
    #generatePatterns(favorites) {
        const defaultFavorites = { primary: [], secondary: [], watching: [], blocked: [] };
        const normalizedFavorites = { ...defaultFavorites, ...favorites };
        return Object.fromEntries(
            ['primary', 'secondary', 'watching', 'blocked'].map(type => {
                const items = (normalizedFavorites[type] || [])
                    .reduce((acc, item) => {
                        const title = (typeof item === 'string' ? item : item?.title)?.trim();
                        if (title) acc.push(this.#escapeRegExp(title));
                        return acc;
                    }, []);
                return [type, items.length ? new RegExp(items.join('|'), 'i') : null];
            })
        );
    }

    // 特殊文字をエスケープ
    #escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // キャッシュを更新（リスト変更時用）
    #updateFavoritePatterns() {
        const favorites = JSON.parse(localStorage.getItem('arcadia_favorites') || '{}') || this.config.favorites || {};
        const patterns = this.#generatePatterns(favorites);
        localStorage.setItem('favorite_patterns_cache', JSON.stringify(
            Object.fromEntries(
                Object.entries(patterns).map(([type, pattern]) => [
                    type,
                    pattern ? { source: pattern.source, flags: pattern.flags } : null
                ])
            )
        ));
        this.favoritePatterns = patterns;
        this.#refreshTable();
    }

    // メインテーブルを再構築
    #reconstructTable() {
        if (this.pageType === 'ssList') {
            return this.#reconstructSsListTable();
        } else {
            return this.#reconstructMainListTable();
        }
    }

    // ssList専用：従来の安定した横並びレイアウトを維持
    #reconstructSsListTable() {
        const tables = document.getElementsByTagName('table');
        // ssListでは通常2番目（0-based）がリストテーブル（広告やヘッダーの後）
        const tableIndex = this.pageInfo.isCategory18 ? 1 :2

        if (tables.length <= tableIndex || !tables[tableIndex]) {
            console.warn('ssList: リストテーブルが見つかりませんでした (index 2)');
            alert('リストテーブルの構築に失敗しました。');
            return false;
        }

        const rows = document.getElementsByTagName('tr');
        let menuHtml = '';

        if (this.pageInfo.islist && rows.length > tableIndex + 1 && rows[tableIndex + 1].firstElementChild) {
            menuHtml = this.#createMenu(rows[tableIndex + 1].firstElementChild.innerHTML);
            rows[tableIndex].firstElementChild?.remove();
            rows[tableIndex + 1].firstElementChild?.remove();
        }

        const newTable = `
            <table id="new_sstable" class="ss-main-table">
                <tbody>
                    <tr>
                        <td class="ss-menu-cell">${menuHtml}</td>
                        <td class="ss-list-table-cell">
                            <table id="sslist_table" class="sslist_table brdr">${tables[tableIndex].innerHTML}</table>
                        </td>
                    </tr>
                </tbody>
            </table>`;

        // 挿入位置：リストテーブルの前のテーブル（通常は広告やヘッダー）の後
        const targetTable = tables[tableIndex - 1] || tables[tableIndex].parentElement;
        if (targetTable) {
            tables[tableIndex].remove(); // 元テーブル削除
            targetTable.insertAdjacentHTML('afterend', newTable);
        } else {
            // フォールバック：bodyの最後に追加
            document.body.insertAdjacentHTML('beforeend', newTable);
        }

        this.#tableCache = document.getElementById('sslist_table');
        return true;
    }

    // mainList専用：インデックスに依存しない安全な方法
    #reconstructMainListTable() {
        const mainListTable = Array.from(document.getElementsByTagName('table')).find(table =>
            table.id === 'table' ||
            (table.classList.contains('brdr') &&
            ['90%', '100%'].includes(table.getAttribute('width')) &&
            table.cellPadding === '3' &&
            table.cellSpacing === '1')
        );

        if (!mainListTable) {
            console.warn('mainList: メインリストテーブルが見つかりませんでした');
            alert('リストテーブルの構築に失敗しました。ページを再読み込みしてください。');
            return false;
        }

        const newTable = `
            <table id="new_maintable" class="main-main-table">
                <tbody>
                    <tr>
                        <td class="main-list-table-cell">
                            <table id="mainlist_table" class="mainlist_table brdr">${mainListTable.innerHTML}</table>
                        </td>
                    </tr>
                </tbody>
            </table>`;

        mainListTable.insertAdjacentHTML('afterend', newTable);
        mainListTable.remove();

        this.#tableCache = document.getElementById('mainlist_table');
        return true;
    }


    // メニューテーブルを生成（SSページのみ）
    #createMenu(content) {
        if (this.pageType !== 'ssList') return '';
        return `
            <table id="ssmenu" class="ss-menu-table brdr">
                <tbody>
                    <tr class="bga"><td class="ss-menu-header"><b>MENU</b></td></tr>
                    <tr class="bgc"><td class="ssmenu_link">${content}</td></tr>
                </tbody>
            </table>`;
    }

    #processRowsInChunks(rows, chunkSize = 20) {
        const chunks = [];
        for (let i = 0; i < rows.length; i += chunkSize) {
            chunks.push(rows.slice(i, i + chunkSize));
        }
        let chunkIndex = 0;
        const processNextChunk = () => {
            if (chunkIndex >= chunks.length) return;
            chunks[chunkIndex].forEach((row, idx) => this.#processRow(row, chunkIndex * chunkSize + idx));
            chunkIndex++;
            requestAnimationFrame(processNextChunk);
        };
        requestAnimationFrame(processNextChunk);
    }

    // 行のスタイルとリンクを一括処理
    #processRow(row, index) {
        const tdSecond = row.querySelector('td:nth-child(2)');
        if (!tdSecond) return;

        const titleElement = tdSecond.querySelector('b a') || tdSecond.querySelector('a') || tdSecond.querySelector('b');
        const content = titleElement?.textContent.trim() || row.textContent.trim();
        if (!content) return;

        // 基本スタイル適用
        row.classList.toggle('list-base-style', this.config.ssList?.adjustLineHeight);

        // お気に入り/NG適用（共通）
        const favoriteTypes = ['primary', 'secondary', 'watching', 'blocked'];
        for (const type of favoriteTypes) {
            const className = type === 'blocked' ? 'list-blocked' : `list-favorite-${type}`;
            const shouldApply = this.favoritePatterns[type] && this.favoritePatterns[type].test(content);
            row.classList.toggle(className, shouldApply);
        }

        // SSページ特有の直リンク処理
        if (this.pageType === 'ssList' && row.classList.contains('bgc') && this.config.ssList?.directLinks) {
            const linkMatch = row.innerHTML.match(/&(?:amp;)?all=([^&"]+)/);
            if (!linkMatch) return;

            const articleId = linkMatch[1];
            const bElements = Array.from(row.getElementsByTagName('b'));
            if (!bElements.length) return;

            const isChiraura = this.pageInfo.islist && this.pageInfo.isChiraura;
            const lastIndex = bElements.length - 1;

            if (isChiraura) {
                bElements[lastIndex].innerHTML = this.#createLink('all_msg', articleId, bElements[lastIndex].innerHTML);
                if (!row.querySelector('td [href*="impression"]')) {
                    const tdImpression = document.createElement('td');
                    tdImpression.align = 'center';
                    tdImpression.innerHTML = this.#createLink('impression', articleId, '？', '&page=1');
                    row.insertBefore(tdImpression, row.lastChild);
                }
            } else {
                const counts = this.#extractCounts(bElements);
                if (this.#shouldHideRow(counts, index)) {
                    row.style.display = 'none';
                    return;
                }

                const indices = { article: lastIndex - 2, impression: lastIndex - 1, pv: lastIndex };
                if (indices.article >= 0 && indices.impression >= 0) {
                    bElements[indices.article].innerHTML = this.#createLink('all_msg', articleId, bElements[indices.article].innerHTML);
                    bElements[indices.impression].innerHTML = this.#createLink('impression', articleId, bElements[indices.impression].innerHTML, '&page=1');
                }
                if (this.config.ssList.showPvRatio && indices.pv >= 0) {
                    bElements[indices.pv].innerHTML = `${counts.perArticle}/1記事`;
                    const tdElements = row.getElementsByTagName('td');
                    if (tdElements.length >= 2) tdElements[tdElements.length - 2].style.textAlign = 'right';
                }
            }
        }
    }

    // 行を非表示にするか判定（SSページのみ）
    #shouldHideRow(counts, index) {
        if (this.pageType !== 'ssList') return false;
        const isAdShort = this.config.ssList.hideAdsShort && counts.article - 1 < this.config.ssList.adsThreshold && index > 3;
        const isLowPv = this.config.ssList.hideLowPv && counts.perArticle < this.config.ssList.pvThreshold;
        return isAdShort || isLowPv;
    }

    // PVカウントを取得（SSページのみ）
    #extractCounts(bElements) {
        if (this.pageType !== 'ssList') return { article: 0, pv: 0, perArticle: 0 };
        const countIndex = bElements.length - 3;
        const pvIndex = bElements.length - 1;
        const articleCount = Number(bElements[countIndex]?.innerHTML.replace(/<\/?[^>]+>/gi, '') || 0);
        const pvCount = Number(bElements[pvIndex]?.innerHTML.replace(/<\/?[^>]+>/gi, '') || 0);
        return {
            article: articleCount,
            pv: pvCount,
            perArticle: articleCount > 0 ? Math.floor(pvCount / articleCount) : 0
        };
    }

    // リンクを生成（SSページのみ）
    #createLink(type, articleId, content, extraParams = '') {
        if (this.pageType !== 'ssList') return content;
        return `<a href="/bbs/sst/sst.php?act=${type}&cate=all&${type === 'all_msg' ? 'all' : 'no'}=${articleId}${extraParams}" target="_blank">${content}</a>`;
    }

    // 不可視化解除ボタン/チラ裏で感想カラムを追加
    #postProcessTable() {
        const table = this.#getTable();
        if (!table) return;

        const fragment = document.createDocumentFragment();
        const button = document.createElement('button');
        button.className = 'list-unhide-button';
        button.title = 'もう一度不可視にしたい場合はページの再読み込みが必要です';
        button.textContent = '作品不可視化の解除';
        button.addEventListener('click', () => {
            this.#handleUnhide();
            button.disabled = true;
        });
        table.classList.add(this.pageType === 'ssList' ? 'ss-list-table' : 'main-list-table');
        fragment.appendChild(button);
        table.appendChild(fragment);

        if (this.pageInfo.isChiraura && this.pageInfo.islist && this.config.ssList?.directLinks) {
            const firstRow = table.querySelector('tr:not(.impression-added)');
            if (firstRow) {
                const tdImp = document.createElement('td');
                tdImp.setAttribute('nowrap', '');
                tdImp.align = 'center';
                tdImp.innerHTML = '感想';
                firstRow.insertBefore(tdImp, firstRow.lastChild);
                firstRow.classList.add('impression-added');
            }
        }

        table.appendChild(fragment);
    }

    // 不可視化を解除
    #handleUnhide() {
        const table = this.#getTable();
        if (table) table.querySelectorAll('tr.list-blocked').forEach(row => row.classList.remove('list-blocked'));
    }

    // リンクを最適化（SSページのみ）
    #optimizeLinks() {
        if (this.pageType !== 'ssList') return;
        const table = document.getElementById('new_sstable');
        if (!table) return;
        const activeFlags = Object.keys(this.config.ssList || {}).filter(flag => this.config.ssList[flag]);
        if (!activeFlags.length) return;

        const activePatterns = Object.entries(ListFormatter.#linkPatterns)
            .filter(([flag]) => activeFlags.includes(flag))
            .reduce((acc, [_, spec]) => {
                acc[spec.target] = acc[spec.target] || [];
                acc[spec.target].push(spec);
                return acc;
            }, {});

        const links = table.querySelectorAll('a[href*="sst.php"], a[href*="sss.php"], a[href*="mainbbs.php"]');
        links.forEach(link => {
            let href = link.getAttribute('href');
            let text = link.innerHTML;

            activePatterns.href?.forEach(({ pattern, replacement, attr, value }) => {
                if (pattern.test(href)) {
                    href = href.replace(pattern, replacement);
                    link.setAttribute('href', href);
                    if (attr) link.setAttribute(attr, value);
                }
            });
            activePatterns.text?.forEach(({ pattern, replacement }) => {
                if (pattern.test(text)) {
                    text = text.replace(pattern, replacement);
                    link.innerHTML = text;
                }
            });
        });
    }

    // 設定を最新に更新（CONFIG変更時用）
    #refreshConfig() {
        const storedConfig = JSON.parse(localStorage.getItem('arcadia_config'));
        if (storedConfig) this.config = storedConfig;
    }

    // テーブルを再描画（キャッシュ更新後に呼ぶ）
    #refreshTable() {
        const table = this.#getTable();
        if (!table) return;
        Array.from(table.querySelectorAll('tr')).forEach((row, index) => row && this.#processRow(row, index));
    }

    #handleEvents = (e) => {
        if (e.type === 'storage') {
            if (e.key === 'arcadia_config') this.#refreshConfig();
            if (e.key === 'arcadia_favorites') this.#updateFavoritePatterns();
            if (e.key === 'ss-theme') this.currentTheme = localStorage.getItem('ss-theme') || 'light';
        } else if (e.type === 'favorites-updated') {
            this.#updateFavoritePatterns();
        }
    };

    init() {
        if (this.#isInitialized) return;
        if (!this.pageInfo.islist) return;
        try {
            if (!ListStyles.isInitialized()) ListStyles.init();
            const updates = [() => this.#reconstructTable()];
            requestAnimationFrame(() => {
                updates.forEach(update => update());
                const table = this.#getTable();
                if (!table) {
                    console.warn(`Table #${this.pageType === 'ssList' ? 'sslist_table' : 'mainlist_table'} not found after reconstruction.`);
                    alert('リストテーブルの構築に失敗しました。ページを再読み込みしてください。');
                    return; // テーブルがない場合は後続処理をスキップ
                }
                const rows = Array.from(table.querySelectorAll('tr'));
                this.#processRowsInChunks(rows); // チャンク処理に変更
                this.#postProcessTable();
                if (this.pageType === 'ssList') this.#optimizeLinks();
                this.#isInitialized = true;
            });

            window.addEventListener('storage', this.#handleEvents);
            window.addEventListener('favorites-updated', this.#handleEvents);
            window.addEventListener('unload', () => {
                window.removeEventListener('storage', this.#handleEvents);
                window.removeEventListener('favorites-updated', this.#handleEvents);
            }, { once: true });
        } catch (error) {
            console.error('Formatting failed:', {
                message: error.message,
                stack: error.stack,
                pageInfo: this.pageInfo,
                config: this.config
            });
        }
    }
}

// SSリストページのスタイル設定
class ListStyles {
    static #styleElement = null;
    static #isInitialized = false;

    static init() {
        if (this.#styleElement) return;
        this.#styleElement = document.createElement('style');
        this.#styleElement.id = 'ss-list-styles';
        this.#styleElement.textContent = `
            :root {
                .list-base-style {
                    line-height: var(--ss-line-height, 2.0);
                    font-family: var(--ss-font-family, 'inherit');
                }
                /* SSページ用 */
                .ss-main-table {
                    border-spacing: 0;
                    border: 0px;
                    margin: 0 auto;
                    width: 100%;
                }
                .ss-list-table-cell {
                    width: 100%;
                    padding: 0;
                }
                .sslist_table {
                    width: 100%;
                    border-spacing: 1px;
                }
                .ss-menu-cell {
                    vertical-align: top;
                    padding: 0;
                    width: 160px;
                }
                .ss-menu-table {
                    border-spacing: 1px;
                    width: 160px;
                }
                .ss-menu-header {
                    text-align: center;
                }
                /* メインページ用 */
                .main-main-table {
                    border-spacing: 0;
                    border: 0px;
                    margin: 0 auto;
                    width: 80%;
                }
                .main-list-table-cell {
                    width: 100%;
                    padding: 0;
                }
                .mainlist_table {
                    width: 100%;
                    border-spacing: 1px;
                }
                /* 共通スタイル */
                .bga { height: 30px !important; }
                .ss-list-table, .main-list-table {
                    position: relative;
                }
                .list-unhide-button {
                    position: absolute;
                    top: -30px;
                    right: 0;
                    border: 1px solid var(--ss-border-color);
                    padding: 2px 8px;
                    font-size: 14px;
                    background-color: var(--ss-button-bg, #f0f0f0);
                    color: var(--ss-button-text, #333) !important;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                .list-unhide-button:hover {
                    background-color: var(--ss-hover-bg);
                }
                .list-unhide-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .list-blocked {
                    display: none;
                }
            }
        `;
        document.head.appendChild(this.#styleElement);
        this.#isInitialized = true;
    }

    static isInitialized() {
        return this.#isInitialized;
    }
}

// 感想ページのフォーマッター
class CommentPageFormatter {
    #commentCountCache = null;          // コメント数のキャッシュ
    #isInitialized = false;             // 初期化済みフラグ
    #pageLinksCache = new Map();        // ページリンクのキャッシュ

    constructor(config) {
        this.config = config || { board: { sortDesc: true } };
        this.commentTable = document.getElementsByTagName('table')[1];
        this.pageInfo = this.#getPageInfo();
    }

    static #DATE_MAPPINGS = {
        days: { 'Mon': '月', 'Tue': '火', 'Wed': '水', 'Thu': '木', 'Fri': '金', 'Sat': '土', 'Sun': '日' },
        months: { '/Jan': '/01', '/Feb': '/02', '/Mar': '/03', '/Apr': '/04', '/May': '/05', '/Jun': '/06',
                  '/Jul': '/07', '/Aug': '/08', '/Sep': '/09', '/Oct': '/10', '/Nov': '/11', '/Dec': '/12' }
    };

    // URLパラメータからページ情報を取得
    #getPageInfo() {
        const params = new URLSearchParams(window.location.search);
        return { articleId: params.get('no'), currentPage: parseInt(params.get('page'), 10) || 1 };
    }

    // コメント数をキャッシュから取得、初回はHTMLから抽出
    #getCommentCount() {
        if (this.#commentCountCache === null) {
            const match = this.commentTable.innerHTML.match(/\[(\d+)\]/);
            this.#commentCountCache = match ? parseInt(match[1], 10) : 0;
        }
        return this.#commentCountCache;
    }

    // コンテンツを処理してページネーションとコメントを配置
    #processContent() {
        const fragment = document.createDocumentFragment();

        const tableClone = this.commentTable.cloneNode(true);
        if (this.config.board.sortDesc) this.#reverseComments(tableClone);
        if (this.config.board.japaneseDate) this.#formatDates(tableClone);
        tableClone.classList.add('ss-comment-table');

        if (this.config.board.embedPageLinks) {
            const pagination = this.#createPagination();
            if (pagination) {
                fragment.appendChild(pagination.cloneNode(true)); // 上部ページネーション
                const td = tableClone.querySelector('tbody td');
                const writeForm = td?.querySelector('form[action="/bbs/sst/sst.php"][method="post"]:has(input[name="act"][value="write_impression"])');
                if (writeForm) {
                    // 既存のページリンクを削除（新しいページネーション挿入前）
                    td.querySelectorAll('a[href*="page"]').forEach(link => link.remove());
                    const bottomPagination = pagination.cloneNode(true);
                    td.insertBefore(bottomPagination, writeForm); // 下部ページネーション
                }
            }
        }

        fragment.appendChild(tableClone);
        return fragment;
    }

    // ページネーションリンクを生成
    #createPagination() {
        const totalComments = this.#getCommentCount();
        if (!totalComments) return null;

        const totalPages = Math.ceil(totalComments / 20);
        const startPage = this.pageInfo.currentPage + totalPages - 1;
        const cacheKey = `${this.pageInfo.articleId}-${this.pageInfo.currentPage}-${totalPages}-${totalComments}`; // articleIdを追加
        if (!this.#pageLinksCache.has(cacheKey)) {
            const links = Array.from({ length: startPage }, (_, i) => {
                const page = startPage - i;
                const startComment = Math.max(totalComments - 20 * (page - (this.pageInfo.currentPage - 1)) + 1, 1);
                const formattedNumber = startComment.toString().padStart(4, '0');
                return page === this.pageInfo.currentPage
                    ? `[${formattedNumber}-]`
                    : `<a href="${this.#getPageUrl(page)}">[${formattedNumber}-]</a>`;
            }).join('  ');
            this.#pageLinksCache.set(cacheKey, links);
        }

        const table = document.createElement('table');
        table.className = 'ss-pagination-table';
        const row = table.insertRow();
        row.innerHTML = `
            <td class="ss-pagination-past">過去←</td>
            <td class="ss-pagination-links">${this.#pageLinksCache.get(cacheKey)}</td>
            <td class="ss-pagination-latest">→最新</td>
        `;
        return table;
    }

    // 指定ページのURLを生成
    #getPageUrl(pageNumber) {
        const url = new URL('/bbs/sst/sst.php', window.location.origin);
        const params = { act: 'impression', cate: 'all', no: this.pageInfo.articleId, page: pageNumber.toString() };
        Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
        return url.toString();
    }

    // コメントの順序を反転
    #reverseComments(table) {
        const td = table.querySelector('tbody td');
        if (!td || !td.querySelectorAll('hr:not([width])').length) return;

        let contentHtml = td.innerHTML;

        // <hr> を一時置換して分割
        contentHtml = contentHtml.replace(/<hr>/gi, '○●●z○');
        const blocks = contentHtml.split('○●●z○');

        // 逆順処理
        let reversedHtml = blocks[0] + '<hr>';
        for (let i = blocks.length - 2; i > 0; i--) {
            reversedHtml += blocks[i] + '<hr>';
        }
        reversedHtml += blocks[blocks.length - 1];

        // 最初のブロック
        const finalHtml = reversedHtml;
        td.innerHTML = finalHtml;
    }

    // 日付を日本語形式にフォーマット
    #formatDates(node) {
        const { days, months } = CommentPageFormatter.#DATE_MAPPINGS;
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
            acceptNode: n => /[(]?(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[)]?|\/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(n.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        }, false);
        let currentNode;
        while ((currentNode = walker.nextNode())) {
            let text = currentNode.textContent;
            text = text.replace(/\((Mon|Tue|Wed|Thu|Fri|Sat|Sun)\)/g, (_, day) => `(${days[day]})`);
            text = text.replace(/\/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/g, month => months[month]);
            currentNode.textContent = text;
        }
    }

    // 初期化処理
    init() {
        if (this.#isInitialized) return;
        try {
            if (!CommentPageStyles.isInitialized()) CommentPageStyles.init();
            const fragment = this.#processContent();
            this.commentTable.innerHTML = '';
            this.commentTable.appendChild(fragment);
            this.#isInitialized = true;
        } catch (error) {
            console.error('Error formatting comments:', error);
        }
    }
}

// コメントページのスタイル設定
class CommentPageStyles {
    static #styleElement = null;
    static #isInitialized = false;

    static init() {
        if (this.#styleElement) return;
        const styleSheet = `
            .ss-comment-table { width: 100%; border-spacing: 0; }
            .ss-pagination-table { width: 100%; border-spacing: 0; }
            .ss-pagination-past { white-space: nowrap; text-align: left; vertical-align: top; padding: 0 5px; }
            .ss-pagination-links { text-align: center; white-space: normal; word-wrap: break-word; padding: 0 5px; }
            .ss-pagination-latest { white-space: nowrap; text-align: right; vertical-align: bottom; padding: 0 5px; }
            @media (max-width: 600px) { .ss-pagination-links { font-size: 12px; padding: 2px; } }
            @media (max-width: 400px) { .ss-pagination-links a { font-size: 10px; padding: 1px; }}
        `;
        this.#styleElement = document.createElement('style');
        this.#styleElement.id = 'comment-page-styles';
        this.#styleElement.textContent = styleSheet;
        document.head.appendChild(this.#styleElement);
        this.#isInitialized = true;
    }

    static isInitialized() {
        return this.#isInitialized;
    }
}

// 歯抜け記事のエラー対策
class ArticleGapHandler {
    #searchParams;          // URL検索パラメータ
    #currentArticle;        // 現在の記事番号
    #isEnabled ;      // 機能が有効か
    #isInitialized = false; // 初期化済みフラグ

    constructor(config) {
        this.#searchParams = new URLSearchParams(window.location.search);
        this.#currentArticle = this.#searchParams.get('n');
        this.#isEnabled = config.viewer.skipErrorPage
    }

    // ハンドラー実行の判定
    #shouldHandle() {
        return this.#isEnabled &&
            typeof this.#currentArticle === 'string' &&
            this.#currentArticle.length > 0 &&
            !this.#searchParams.has('count');
    }

    // 前後の記事番号を1パスで検索
    #findAdjacentArticles() {
        const table = document.querySelector('#table');
        if (!table) return { prev: null, next: null };

        const rows = Array.from(table.getElementsByTagName('tr'));
        let prev = null, next = null, currentIndex = -1;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.innerHTML.includes(`n=${this.#currentArticle}`)) {
                currentIndex = i;
                prev = i > 0 ? this.#extractNumber(rows[i - 1]) : null;
                next = i + 1 < rows.length ? this.#extractNumber(rows[i + 1]) : null;
                break;
            }
        }

        return currentIndex === -1 ? { prev: null, next: null } : { prev, next };
    }

    // 記事番号を抽出する共通関数
    #extractNumber(row) {
        const match = row.innerHTML.match(/\[(\d{1,3})\]/);
        return match ? match[1] : null;
    }

    // ナビゲーションリンクを更新
    #updateNavigationLinks({ prev, next }) {
        const baseUrl = new URL(window.location.href);
        baseUrl.hash = 'kiji';

        // 上部と下部のリンクを一度に取得
        const allLinks = document.querySelectorAll('.brdr a[href*="#kiji"], div[align="right"] a[href*="#kiji"]');
        this.#updateLinks(allLinks, prev, next, baseUrl);
    }

    #updateLinks(links, prev, next, baseUrl) {
        const updateLink = (link, target, text, activeClass, inactiveClass, inactiveText) => {
            if (target) {
                baseUrl.searchParams.set('n', target);
                link.href = baseUrl.toString();
                link.className = activeClass;
                link.textContent = text;
            } else {
                link.href = '#kiji';
                link.className = inactiveClass;
                link.textContent = inactiveText;
            }
        };

        links.forEach(link => {
            if (link.textContent.includes('前を表示する')) {
                updateLink(link, prev, '前を表示する', 'ss-prev-link', 'ss-no-prev', '前の記事はありません');
            } else if (link.textContent.includes('次を表示する')) {
                updateLink(link, next, '次を表示する', 'ss-next-link', 'ss-no-next', '次の記事はありません');
            }
        });
    }

    // ハンドラーの初期化処理
    init() {
        if (!this.#shouldHandle() || this.#isInitialized) return;

        try {
            if (!ArticleGapStyles.isInitialized()) ArticleGapStyles.init();
            const adjacentArticles = this.#findAdjacentArticles();
            if (adjacentArticles.prev !== null || adjacentArticles.next !== null) {
                this.#updateNavigationLinks(adjacentArticles);
            }
            // URLハッシュの更新
            window.location.hash = 'kiji';
            this.#isInitialized = true;
        } catch (error) {
            console.error('Article navigation handling failed:', error.message);
        }
    }
}

// 歯抜け記事のエラー対策のcss
class ArticleGapStyles {
    static #styleElement = null;
    static #isInitialized = false;


    static init() {
        if (this.#styleElement) return;
        const styleSheet = `
            .ss-next-link, .ss-prev-link {
                color: var(--ss-link-color, #0066cc);
                text-decoration: none;
            }
            .ss-next-link:hover, .ss-prev-link:hover {
                text-decoration: underline;
            }
            .ss-no-next, .ss-no-prev {
                color: var(--ss-text-color, #888888);
                font-style: italic;
            }
        `;
        this.#styleElement = document.createElement('style');
        this.#styleElement.id = 'article-gap-styles';
        this.#styleElement.textContent = styleSheet;
        document.head.appendChild(this.#styleElement);
        this.#isInitialized = true;
    }
    static isInitialized() {
        return this.#isInitialized;
    }
}

// 目次ポップアップ機能を管理するクラス
class IndexPopupHandler {
    #isInitialized = false; // 初期化状態の追跡
    constructor(config = {}) {
        this.config = {
            fontFamily: config.fontFamily || '',
            maxHeightOffset: 200,
            animationDuration: 300,
            hideDelay: 300,
            ...config
        };

        this.state = {
            isVisible: false,
            hideTimeout: null
        };
        this.pageInfo = this.#getPageInfo();
        this.#initElements();
        this.#bindHandlers();
        this.elements.panel = null;
    }

    // 基本スタイルを動的に生成
    #generateBaseStyles() {
        const transitionDuration = `${this.config.animationDuration}ms`;
        return `
            /* ライトテーマ（デフォルト） */
            :root[data-theme="light"] {
                --index-bg: #fff7d4; /* デフォルト値 */
                --index-text: #333333;
                --index-border: #aaaacc;
                --index-button-bg: #ddddff;
                --index-button-text: #333333;
                --index-button-hover: #ffe4b5;
                --index-link: #0066cc;
                --index-link-visited: #551A8B;
                --index-shadow: rgba(0, 0, 0, 0.3);
            }

            /* ダークテーマ */
            :root[data-theme="dark"] {
                --index-bg: #2a2620;
                --index-text: #e0e0e0;
                --index-border: #444444;
                --index-button-bg: #20203d;
                --index-button-text: #ffffff;
                --index-button-hover: #3d3630;
                --index-link: #88bbff;
                --index-link-visited: #00CCCC;
                --index-shadow: rgba(0, 0, 0, 0.5);
            }

            #seaiz {
                position: fixed;
                top: 0px;
                left: 20px;
                padding: 8px 16px;
                background-color: var(--index-button-bg);
                color: var(--index-button-text);
                border: 1px solid var(--index-border);
                border-radius: 4px;
                cursor: pointer;
                z-index: 1000;
                transition: background-color 0.2s ease;
                font-size: 12px; /* StyleManagerStyles から移行 */
            }

            #seaiz:hover {
                background-color: var(--index-button-hover);
                opacity: 1;
            }

            #tableind {
                position: fixed;
                top: 30px;
                left: 5px;
                padding: 3px 5px;
                background-color: var(--index-bg);
                color: var(--index-text);
                border: 1px solid var(--index-border);
                border-radius: 5px;
                box-shadow: 0 2px 10px var(--index-shadow);
                z-index: 10;
                overflow-y: scroll;
                overflow-x: auto;
                opacity: 0;
                transform: translateY(-10px);
                transition: opacity ${transitionDuration} ease, transform ${transitionDuration} ease;
                display: none;
            }

            #tableind td {
                font-size: 13px !important;
            }

            #tableind a {
                color: var(--index-link);
                text-decoration: none;
            }

            #tableind a:visited {
                color: var(--index-link-visited);
            }

            #tableind a:hover {
                text-decoration: underline;
            }
        `;
    }

    // 要素の初期化
    #initElements() {
        this.elements = {
            title: document.getElementsByTagName('title')[0],
            bgbElements: document.getElementsByClassName('bgb')
        };
        this.pageInfo = this.#getPageInfo();
    }

    // イベントハンドラーのバインド
    #bindHandlers() {
        this.boundHandlers = {
            showPanel: this.#showPanel.bind(this),
            hidePanel: this.#hidePanel.bind(this),
            togglePanel: this.#togglePanel.bind(this),
            handleKeyPress: this.#handleKeyPress.bind(this),
            handleResize: this.#handleResize.bind(this)
        };
    }

    // ページ情報の取得
    #getPageInfo() {
        const params = new URLSearchParams(window.location.search);
        return {
            isSingleArticle: params.get('act') === 'dump',
            isAllArticles: params.get('act') === 'all_msg',
            url: window.location.href
        };
    }

    // インデックスの生成
    #generateIndex() {
        return this.pageInfo.isSingleArticle
            ? this.#generateSingleArticleIndex()
            : this.pageInfo.isAllArticles
                ? this.#generateAllArticlesIndex()
                : '';
    }

    // 単一記事用のインデックス生成
    #generateSingleArticleIndex() {
        const tableElement = document.getElementById('table');
        if (!tableElement) return '';

        this.elements.title.innerHTML = tableElement.getElementsByTagName('a')[0].innerHTML;
        return tableElement.innerHTML
            .replace(/<\/?b>/ig, '')
            .replace(/%">([^\n])/ig, '%" noWrap>$1');
    }

    // 全記事用のインデックス生成
    #generateAllArticlesIndex() {
        const { bgbElements } = this.elements;
        const dates = document.body.innerHTML.match(/Date: [\d\/ :]{16}/g) || [];
        const fragment = document.createDocumentFragment();

        if (bgbElements[0]?.getElementsByTagName('font')[0]) {
            this.elements.title.innerHTML = bgbElements[0].getElementsByTagName('font')[0].innerHTML;
        }

        Array.from(bgbElements).forEach((element, i) => {
            const fontElement = element.getElementsByTagName('font')[0];
            if (!fontElement) return;

            const linkTitle = fontElement.innerHTML;
            fontElement.innerHTML = `<A name="${i}"></A>${linkTitle}`;
            const date = dates[i] ? dates[i].slice(6) : '';

            const tr = document.createElement('tr');
            tr.style.padding = '10px';
            tr.innerHTML = `
                <td noWrap>[${i}]</td>
                <td><A href="#${i}">${linkTitle}</A></td>
                <td noWrap>${date}</td>
            `;
            fragment.appendChild(tr);
        });

        const table = document.createElement('table');
        table.appendChild(fragment);
        return table.outerHTML;
    }

    // パネル表示
    #showPanel() {
        if (this.state.hideTimeout) {
            clearTimeout(this.state.hideTimeout);
        }

        const panel = this.elements.panel || document.getElementById('tableind');
        if (panel && !this.state.isVisible) {
            panel.style.display = 'block';
            requestAnimationFrame(() => {
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            });
            this.state.isVisible = true;
        }
    }

    // パネル非表示
    #hidePanel() {
        const panel = this.elements.panel || document.getElementById('tableind');
        if (panel && this.state.isVisible) {
            this.state.hideTimeout = setTimeout(() => {
                panel.style.opacity = '0';
                panel.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    panel.style.display = 'none';
                    this.state.isVisible = false;
                }, this.config.animationDuration);
            }, this.config.hideDelay);
        }
    }

    // パネル表示切り替え
    #togglePanel() {
        this.state.isVisible ? this.#hidePanel() : this.#showPanel();
    }

    // キーボードショートカット処理
    #handleKeyPress(event) {
        if (event.key === 'i' && event.ctrlKey) {
            event.preventDefault();
            this.#togglePanel();
        }
    }

    // リサイズ処理
    #handleResize() {
        if (this.elements.panel) {
            this.elements.panel.style.maxHeight = `${window.innerHeight - this.config.maxHeightOffset}px`;
        }
    }

    // UI要素の作成
    #createUI(index) {
        this.#addStyles();
        return {
            button: this.#createButton(),
            panel: this.#createPanel(index)
        };
    }

    // スタイルの追加
    #addStyles() {
        if (!document.getElementById('index-popup-styles')) {
            const style = document.createElement('style');
            style.id = 'index-popup-styles';
            style.textContent = this.#generateBaseStyles();
            document.head.appendChild(style);
        }
    }

    // ボタンの作成
    #createButton() {
        const button = document.createElement('button');
        const attrs = {
            id: 'seaiz',
            className: 'ind_swh',
            title: 'インデックスをポップアップ (Ctrl+I)',
            innerHTML: 'Index',
            'aria-label': 'インデックスを表示',
            'aria-expanded': 'false',
            'aria-controls': 'tableind'
        };
        Object.assign(button, attrs);
        return button;
    }

    // パネルの作成
    #createPanel(index) {
        const panel = document.createElement('div');
        const attrs = {
            id: 'tableind',
            className: 'ind_ind',
            innerHTML: `<table>${index}</table>`,
            role: 'dialog',
            'aria-label': 'インデックス'
        };
        Object.assign(panel, attrs);
        panel.style.maxHeight = `${window.innerHeight - this.config.maxHeightOffset}px`;
        return panel;
    }

    // クリーンアップ処理
    destroy() {
        document.removeEventListener('keydown', this.boundHandlers.handleKeyPress);
        window.removeEventListener('resize', this.boundHandlers.handleResize);
        ['seaiz', 'tableind'].forEach(id => {
            document.getElementById(id)?.remove();
        });
    }

    // 初期化処理
    init() {
        if (this.#isInitialized) return; // 重複防止
        try {
            const index = this.#generateIndex();
            if (!index) return;

            const { button, panel } = this.#createUI(index);
            this.elements.panel = panel;

            button.addEventListener('mouseover', this.boundHandlers.showPanel);
            button.addEventListener('click', this.boundHandlers.togglePanel);
            panel.addEventListener('mouseover', this.boundHandlers.showPanel);
            panel.addEventListener('mouseout', this.boundHandlers.hidePanel);
            document.addEventListener('keydown', this.boundHandlers.handleKeyPress);
            window.addEventListener('resize', this.boundHandlers.handleResize);

            document.body.appendChild(button);
            document.body.insertBefore(panel, document.body.firstChild);
            this.#isInitialized = true;
        } catch (error) {
            console.error('Index popup initialization failed:', error.message);
        }
    }

}

//小説閲覧時にスタイルセレクトバー埋め込み
//&それらに付随する関数群など
class StyleControlBar {
    #isInitialized = false;
    #observer;
    constructor(config) {
        this.config = config;
        this.currentTheme = this.#getCurrentTheme();
        this.defaultSettings = {
            width: config.style.width,
            lineHeight: config.style.lineHeight,    // 'height' -> 'lineHeight'
            fontSize: config.style.fontSize,       // 'size' -> 'fontSize'
            fontFamily: config.style.fontFamily,   // 'family' -> 'fontFamily'（既に一致）
            color: config.style.themes[this.currentTheme].color,
            backgroundColor: config.style.themes[this.currentTheme].backgroundColor
        };
        this.autoExecuteSettings = config.autoExecute;
        this.cachedElements = {};
        this.storageKey = 'style-control-bar-settings';
        this.STYLE_BAR_ID = 'style-control-bar';
        this.SWITCH_CLASS = 'bar_swh';
        this.RESET_BUTTON_ID = 'reset-button';
        this.cachedElements = { content: document.querySelector('blockquote') };

        this.#setupThemeObserver();
    }

    static #STYLE_MAP = {
        'width': { prop: 'width', selector: 'table.brdr' },
        'lineHeight': { prop: 'line-height', selector: 'td.bgc' },
        'fontSize': { prop: 'font-size', selector: 'td.bgc' },
        'fontFamily': { prop: 'font-family', selector: 'td.bgc' },
        'color': { prop: 'color', selector: 'td.bgc' },
        'backgroundColor': { prop: 'background-color', selector: '.brdr td.bgc' }
    };

    static #FORMAT_RULES = {
            'spacing': {
                applyPattern: /(<br>)+　*<br>　*<br>/ig,
                applyReplacement: '<xxx></xxx><br><br>',
                removePattern: /<xxx><\/xxx>/ig,
                removeReplacement: '<br>'
            },
            'indent': {
                applyPattern: /<br> *([^　 ＜【「『《≪（\(\｢<※])/ig,
                applyReplacement: '<br>　<zzz></zzz>$1',
                removePattern: /　<zzz><\/zzz>/ig,
                removeReplacement: ''
            },
            'linebreak': {
                applyPattern: /([^。\.\, 」"'》』\)）】≫＞>｣…―・！？\!\?])<br>/ig,
                applyReplacement: '$1<yyy></yyy>',
                removePattern: /<yyy><\/yyy>/ig,
                removeReplacement: '<br>'
            },
            'wbrake': {
                applyPattern: /(.)(\1{6})/ig,
                applyReplacement: '$1$2<wbr>',
                removePattern: /<wbr>/ig,
                removeReplacement: ''
            },
            'insertspace': {
                applyPatterns: [
                    { pattern: /([^」』）》≫\)｣＞】>])<br>([＜【「『《≪（\(｢])/ig, replacement: '$1<ooo><br></ooo><br>$2' },
                    { pattern: /([」』）》≫\)｣＞】])<br>([^＜【「『《≪（\(｢<])/ig, replacement: '$1<ooo><br></ooo><br>$2' }
                ],
                removePattern: [{ pattern: /<ooo><br><\/ooo>/ig, replacement: '' }]
            }
    };

    // 現在のテーマを取得するプライベートメソッド
    #getCurrentTheme() {
        return localStorage.getItem('ss-theme') || 'light';
    }

    // テーマが変更されたときの処理
    #handleThemeChange() {
        const newTheme = this.#getCurrentTheme();
        if (newTheme === this.currentTheme) return;

        this.currentTheme = newTheme;
        const themeSettings = this.config.style.themes[newTheme];
        this.defaultSettings.color = themeSettings.color;
        this.defaultSettings.backgroundColor = themeSettings.backgroundColor;

        const updateSelect = (id, styleType) => {
            const select = document.getElementById(id);
            if (select?.value === 'standard') {
                select.options[0].style[styleType] = this.defaultSettings[styleType];
                select.options[0].textContent = `[標準: ${this.defaultSettings[styleType]}]`;
                this.#applyStyle(styleType, this.defaultSettings[styleType]);
            }
        };

        updateSelect('style-color', 'color');
        updateSelect('style-backgroundColor', 'backgroundColor');
        this.#saveSettings();
    }

    // テーマ変更を検出するためのMutationObserverを設定
    #setupThemeObserver() {
        this.#observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    this.#handleThemeChange();
                    break;
                }
            }
        });
        this.#observer.observe(document.documentElement, { attributes: true });
    }

    // セレクトボックスのデフォルトオプションを更新するヘルパーメソッド
    #generatePercentageOptions(start, step, length, extraStepAfter = null) {
        return Array.from({ length }, (_, i) => {
            const baseValue = start + i * step;
            const value = extraStepAfter && i > extraStepAfter ? baseValue + (i - extraStepAfter) * 5 : baseValue;
            return { value: `${value}%`, label: `${value}%` };
        });
    }

    // 選択肢の定義を生成
    #getSelectOptions() {
        return {
            width: this.#generatePercentageOptions(60, 5, 9),
            lineHeight: this.#generatePercentageOptions(100, 25, 9),
            fontSize: this.#generatePercentageOptions(75, 5, 11, 5),
            fontFamily: [
                { value: "", label: "＜――固定幅――＞" },
                { value: "メイリオ", label: "メイリオ" },
                { value: "Osaka-Mono", label: "Osaka－等幅" },
                { value: "ＭＳ ゴシック", label: "ＭＳ ゴシック" },
                { value: "ＭＳ 明朝", label: "ＭＳ 明朝" },
                { value: "S2G海フォント", label: "S2G海フォント" },
                { value: "", label: "＜――可変幅――＞" },
                { value: "MeiryoKe_PGothic", label: "MeiryoKe_PGothic" },
                { value: "Hiragino Kaku Gothic Pro", label: "ヒラギノ角ゴ Pro" },
                { value: "Osaka", label: "Osaka" },
                { value: "ＭＳ Ｐゴシック", label: "ＭＳ Ｐゴシック" },
                { value: "ＭＳ Ｐ明朝", label: "ＭＳ Ｐ明朝" },
                { value: "S2GP海フォント", label: "S2GP海フォント" }
            ],
            colors: [
                { value: "#000000", label: "黒", style: { color: "#000000" } },
                { value: "#333333", label: "濃灰", style: { color: "#333333" } },
                { value: "#666666", label: "灰", style: { color: "#666666" } },
                { value: "#999999", label: "薄灰", style: { color: "#999999" } },
                { value: "#bbbbbb", label: "明灰", style: { color: "#bbbbbb" } },
                { value: "#dddddd", label: "淡灰", style: { color: "#dddddd" } },
                { value: "#ffffff", label: "白", style: { color: "#ffffff", backgroundColor: "#000000" } },
                { value: "#007700", label: "緑", style: { color: "#007700" } },
                { value: "#000077", label: "青", style: { color: "#000077" } },
                { value: "#770000", label: "赤", style: { color: "#770000" } }
            ],
            bgColors: [
                { value: "#ffffff", label: "白", style: { backgroundColor: "#ffffff" } },
                { value: "#dddddd", label: "淡灰", style: { backgroundColor: "#dddddd" } },
                { value: "#bbbbbb", label: "明灰", style: { backgroundColor: "#bbbbbb" } },
                { value: "#999999", label: "薄灰", style: { backgroundColor: "#999999" } },
                { value: "#666666", label: "灰", style: { backgroundColor: "#666666", color: "#ffffff" } },
                { value: "#333333", label: "濃灰", style: { backgroundColor: "#333333", color: "#ffffff" } },
                { value: "#000000", label: "黒", style: { backgroundColor: "#000000", color: "#ffffff" } },
                { value: "#E2E2FF", label: "淡青", style: { backgroundColor: "#E2E2FF" } },
                { value: "#FFE2FF", label: "淡紅", style: { backgroundColor: "#FFE2FF" } },
                { value: "#E2FFE2", label: "淡緑", style: { backgroundColor: "#E2FFE2" } },
                { value: "#77AAAA", label: "青緑", style: { backgroundColor: "#77AAAA" } }
            ]
        };
    }

    // DOM要素を生成するヘルパー関数（新規追加）
    #createElement(tag, props = {}, children = []) {
        const element = document.createElement(tag);
        Object.assign(element, props);
        children.forEach(child => element.append(child));
        return element;
    }

    // セレクトボックスを生成するプライベートメソッド
    #createSelect(id, title, options, defaultValue) {
        const select = document.createElement('select');
        select.id = id;
        select.className = 'bar_sel';

        // 標準オプションの追加
        const defaultOption = document.createElement('option');
        defaultOption.value = 'standard';
        defaultOption.selected = true;
        defaultOption.textContent = `標準: ${defaultValue}`;
        if (id === 'style-color') defaultOption.style.color = defaultValue;
        else if (id === 'style-backgroundColor') defaultOption.style.backgroundColor = defaultValue;

        select.appendChild(defaultOption);

        // その他のオプションの追加
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.style) Object.assign(option.style, opt.style);
            select.appendChild(option);
        });

        // コンテナの作成
        const container = document.createElement('span');
        container.className = 'spn_sel';
        container.title = title;
        container.append(`${title} `, select, document.createElement('br'));

        return container;
    }

    // チェックボックスを生成するプライベートメソッド
    #createCheckbox(id, label, title, defaultChecked = false) {
        const input = this.#createElement('input', {
            type: 'checkbox',
            id,
            checked: defaultChecked
        });

        return this.#createElement('span', {
            className: 'spn_inp',
            title
        }, [input, label]);
    }

    // スタイルを適用するプライベートメソッド
    #applyProperty(type, key, value) {
        if (type === 'style') {
            const style = StyleControlBar.#STYLE_MAP[key];
            if (!style) return;
            this.cachedElements[`${key}-elements`] = this.cachedElements[`${key}-elements`] || document.querySelectorAll(style.selector);
            const elements = this.cachedElements[`${key}-elements`];
            if (elements.length === 0) return;
            const isColorRelated = ['backgroundColor', 'color'].includes(key);
            elements.forEach(el => {
                if (isColorRelated && value !== this.defaultSettings[key]) {
                    el.style.removeProperty('backgroundColor');
                    el.style.removeProperty('color');
                }
                el.style.setProperty(style.prop, value, 'important');
            });
        } else if (type === 'format') {
            const rule = StyleControlBar.#FORMAT_RULES[key];
            if (!rule || !this.cachedElements.content) return;
            const applyPatterns = (text, patterns) =>
                patterns.reduce((acc, { pattern, replacement }) => acc.replace(pattern, replacement), text);
            this.cachedElements.content.innerHTML = ['insertspace'].includes(key)
                ? (value ? applyPatterns(this.cachedElements.content.innerHTML, rule.applyPatterns) : applyPatterns(this.cachedElements.content.innerHTML, rule.removePatterns))
                : (value ? this.cachedElements.content.innerHTML.replace(rule.applyPattern, rule.applyReplacement) : this.cachedElements.content.innerHTML.replace(rule.removePattern, rule.removeReplacement));
        }
    }

    #applyStyle(styleType, value) { this.#applyProperty('style', styleType, value); }
    #applyFormatting(formatType, enabled) { this.#applyProperty('format', formatType, enabled); }

    // 変更イベントを処理するプライベートメソッド
    #handleChange(event) {
        const target = event.target;
        if (!target.id || (!target.matches('select') && !target.matches('input[type="checkbox"]'))) return;

        try {
            if (target.matches('select')) {
                const styleType = target.id.replace('style-', '');
                const value = target.value === 'standard' ? this.defaultSettings[styleType] : target.value;
                this.#applyStyle(styleType, value);
            } else if (target.matches('input[type="checkbox"]')) {
                const formatType = target.id.replace('format-', '');
                this.#applyFormatting(formatType, target.checked);
            }
            this.#saveSettings();
        } catch (error) {
            console.error('Error handling change:', error);
        }
    }

    // スイッチボタンのクリック処理
    #handleSwitchClick() {
        const styleBar = this.styleBar || document.getElementById(this.STYLE_BAR_ID);
        const switchElement = document.querySelector(`.${this.SWITCH_CLASS}`);
        if (styleBar && switchElement) {
            const isVisible = styleBar.style.display === 'block';
            styleBar.style.display = isVisible ? 'none' : 'block';
            switchElement.textContent = isVisible ? '開く' : '閉じる';
        }
    }

    // リセットボタンのクリック処理
    #handleReset() {
        try {
            // すべてのセレクトボックスをデフォルト値に戻す
            document.querySelectorAll(`#${this.STYLE_BAR_ID} select`).forEach(select => {
                select.selectedIndex = 0; // 最初のオプション（標準）を選択
                const styleType = select.id.replace('style-', '');
                const value = this.defaultSettings[styleType];
                select.options[0].textContent = `標準: ${value}`; // リセット時に標準値表示を更新
                this.#applyStyle(styleType, value);
            });

            // すべてのチェックボックスをデフォルト値に戻す
            document.querySelectorAll(`#${this.STYLE_BAR_ID} input[type="checkbox"]`).forEach(checkbox => {
                const formatType = checkbox.id.replace('format-', '');
                const defaultChecked = this.autoExecuteSettings[formatType] || false;
                checkbox.checked = defaultChecked;
                this.#applyFormatting(formatType, defaultChecked);
            });

            this.#saveSettings();

            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Error resetting settings:', error);
        }
    }

    // イベントリスナーを設定するプライベートメソッド
    #setupEventListeners() {
        const bar = document.getElementById(this.STYLE_BAR_ID);
        const switchElement = document.querySelector(`.${this.SWITCH_CLASS}`);
        if (!bar || !switchElement) {
            console.warn('Required elements not found');
            return;
        }

        this.eventListeners = {
            barChange: (e) => this.#handleChange(e),
            switchClick: () => this.#handleSwitchClick(),
            barClick: (e) => {
                if (e.target.id === this.RESET_BUTTON_ID) this.#handleReset();
            }
        };

        bar.addEventListener('change', this.eventListeners.barChange);
        switchElement.addEventListener('click', this.eventListeners.switchClick);
        bar.addEventListener('click', this.eventListeners.barClick);
    }

    // 自動実行設定を適用するプライベートメソッド
    #applyAutoExecuteSettings() {
        Object.entries(this.autoExecuteSettings).forEach(([setting, enabled]) => {
            if (enabled) {
                const checkbox = document.getElementById(`format-${setting}`);
                if (checkbox) {
                    checkbox.checked = true;
                    this.#applyFormatting(setting, true);
                }
            }
        });
    }

    #processElements(selector, callback) {
        document.querySelectorAll(selector).forEach(element => callback(element));
    }

    #processSettings(selector, callback, targetObj) {
        this.#processElements(selector, element => {
            const key = element.id.replace(/^(style|format)-/, '');
            callback(element, key, targetObj);
        });
    }

    // 設定を保存するメソッド
    #saveSettings() {
        try {
            const settings = { styles: {}, formats: {}, theme: this.currentTheme };
            this.#processSettings(`#${this.STYLE_BAR_ID} select[id^="style-"]`, (select, key, obj) => obj[key] = select.value, settings.styles);
            this.#processSettings(`#${this.STYLE_BAR_ID} input[id^="format-"]`, (checkbox, key, obj) => obj[key] = checkbox.checked, settings.formats);
            localStorage.setItem(this.storageKey, JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    // 設定を読み込むメソッド
    #loadSettings() {
        try {
            const savedSettingsJSON = localStorage.getItem(this.storageKey);
            if (!savedSettingsJSON) return false;
            const savedSettings = JSON.parse(savedSettingsJSON);
            if (savedSettings.theme !== this.currentTheme) {
                savedSettings.styles.color = 'standard';
                savedSettings.styles.backgroundColor = 'standard';
            }

            if (savedSettings.styles) {
                this.#processSettings(`#${this.STYLE_BAR_ID} select[id^="style-"]`, (select, styleType) => {
                    const value = savedSettings.styles[styleType];
                    if (Array.from(select.options).some(opt => opt.value === value)) {
                        select.value = value;
                        const styleValue = value === 'standard' ? this.defaultSettings[styleType] : value;
                        select.options[0].textContent = `[標準: ${this.defaultSettings[styleType]}]`;
                        this.#applyStyle(styleType, styleValue);
                    }
                }, {});
            }

            if (savedSettings.formats) {
                this.#processSettings(`#${this.STYLE_BAR_ID} input[id^="format-"]`, (checkbox, formatType) => {
                    checkbox.checked = savedSettings.formats[formatType];
                    this.#applyFormatting(formatType, checkbox.checked);
                }, {});
            }
            return true;
        } catch (error) {
            console.error('Error loading settings:', error);
            return false;
        }
    }

    // クリーンアップ用のメソッド（新規追加）
    destroy() {
        const bar = document.getElementById(this.STYLE_BAR_ID);
        const switchElement = document.querySelector(`.${this.SWITCH_CLASS}`);
        if (this.eventListeners) {
            bar?.removeEventListener('change', this.eventListeners.barChange);
            switchElement?.removeEventListener('click', this.eventListeners.switchClick);
            bar?.removeEventListener('click', this.eventListeners.barClick);
        }
        if (this.#observer) {
            this.#observer.disconnect(); // オブザーバーを切断
        }
        bar?.remove();
        switchElement?.remove();
        this.#isInitialized = false;
    }

    // コントロールバーを初期化するパブリックメソッド
    init() {
        if (this.#isInitialized) return; // 重複防止
        try {
            if (!StyleControlBarStyles.isInitialized()) StyleControlBarStyles.init();
            // コントロールバーの作成
            const bar = this.#createElement('div', { id: this.STYLE_BAR_ID, className: 'bar_bas' });
            const barSwitch = this.#createElement('div', { className: this.SWITCH_CLASS, textContent: '開く' });

            // スタイル設定の追加
            const options = this.#getSelectOptions();
            const fragment = document.createDocumentFragment();

            const styleControls = [
                this.#createSelect('style-width', '横幅', options.width, this.defaultSettings.width),
                this.#createSelect('style-lineHeight', '行間', options.lineHeight, this.defaultSettings.lineHeight),
                this.#createSelect('style-fontSize', '文字サイズ', options.fontSize, this.defaultSettings.fontSize),
                this.#createSelect('style-fontFamily', 'フォント', options.fontFamily, this.defaultSettings.fontFamily),
                this.#createSelect('style-color', '文字色', options.colors, this.defaultSettings.color),
                this.#createSelect('style-backgroundColor', '背景色', options.bgColors, this.defaultSettings.backgroundColor)
            ];

            // フォーマット設定の追加
            const formatControls = [
                this.#createCheckbox('format-spacing', '空行', '空行を整理します', this.autoExecuteSettings.spacing),
                this.#createCheckbox('format-indent', '行頭', '段落の頭を下げます', this.autoExecuteSettings.indent),
                document.createElement('br'),
                this.#createCheckbox('format-linebreak', '改行', '不要な改行を削除します', this.autoExecuteSettings.linebreak),
                this.#createCheckbox('format-wbrake', '連字', 'テーブル横幅破壊の回避', this.autoExecuteSettings.wbrake),
                document.createElement('br'),
                this.#createCheckbox('format-insertspace', '挿行', '会話文と地の文の間に空行挿入', this.autoExecuteSettings.insertspace)
            ];

            // リセットボタンの作成
            const resetButton = this.#createElement('button', { id: this.RESET_BUTTON_ID, className: 'reset-button', textContent: 'デフォルトに戻す' });

            // フラグメントに要素を追加して一括DOM操作
            [...styleControls, ...formatControls, this.#createElement('br'), resetButton].forEach(control => fragment.appendChild(control));
            bar.appendChild(fragment);

            requestAnimationFrame(() => {
                document.body.appendChild(barSwitch);
                document.body.appendChild(bar);
                this.styleBar = bar;
                this.#setupEventListeners();

                const settingsLoaded = this.#loadSettings();
                if (!settingsLoaded) {
                    this.#applyAutoExecuteSettings();
                    Object.entries(this.defaultSettings).forEach(([styleType, value]) => this.#applyStyle(styleType, value));
                }
                this.#isInitialized = true;
            });
        } catch (error) {
            console.error('StyleControlBar initialization failed:', error);
        }
    }
}

// スタイルコントロールバーのスタイル設定クラス
class StyleControlBarStyles {
    static #styleElement = null;
    static #isInitialized = false;

    static init() {
        if (this.#styleElement) return; // 既にインジェクト済みならスキップ
        const styleSheet = `
            /* テーマごとのCSS変数定義 */
            :root[data-theme="light"] {
                --scb-bar-bg: var(--ss-list-bg, #fff7d4);
                --scb-text: var(--ss-text-color, #333333);
                --scb-border: var(--ss-border-color, #aaaacc);
                --scb-select-bg: var(--ss-input-bg, #ffffff);
                --scb-select-text: var(--ss-input-text, #333333);
                --scb-hover-bg: var(--ss-hover-bg, #ffe4b5);
                --scb-switch-bg: var(--ss-header-bg, #ddddff);
                --scb-switch-text: var(--ss-header-text, #333333);
            }

            :root[data-theme="dark"] {
                --scb-bar-bg: var(--ss-list-bg, #2a2620);
                --scb-text: var(--ss-text-color, #e0e0e0);
                --scb-border: var(--ss-border-color, #444444);
                --scb-select-bg: var(--ss-input-bg, #333333);
                --scb-select-text: var(--ss-input-text, #ffffff);
                --scb-hover-bg: var(--ss-hover-bg, #3d3630);
                --scb-switch-bg: var(--ss-header-bg, #20203d);
                --scb-switch-text: var(--ss-header-text, #ffffff);
            }

            /* コントロールバーの本体 */
            .bar_bas {
                position: fixed;
                top: 90px; /* 元: 2px、レイアウト調整済み */
                right: 20px; /* 元: 2px、調整済み */
                padding: 10px; /* 元: 18px 14px 18px 20px、簡略化 */
                background-color: var(--scb-bar-bg); /* --ss-button-bg を置き換え */
                border: 1px solid var(--scb-border); /* --ss-border-color を置き換え */
                border-radius: 4px;
                z-index: 999;
                display: none;
                color: var(--scb-text); /* --ss-button-text を置き換え */
                width: 120px;
                line-height: 250%; /* StyleManagerStyles から移行 */
                font-size: 12px; /* StyleManagerStyles から移行 */
                text-align: right; /* StyleManagerStyles から移行 */
            }

            /* スイッチボタン */
            .bar_swh {
                position: fixed;
                top: 50px; /* 元: 2px、調整済み */
                right: 20px; /* 元: 2px、調整済み */
                padding: 8px 16px; /* 元: 3px 5px、調整済み */
                background-color: var(--scb-switch-bg); /* 新規追加 */
                color: var(--scb-switch-text); /* 新規追加 */
                border: 1px solid var(--scb-border); /* --ss-border-color を置き換え */
                border-radius: 4px;
                cursor: pointer;
                z-index: 1000;
                transition: background-color 0.2s ease;
                font-size: 12px; /* StyleManagerStyles から移行 */
            }

            .bar_swh:hover {
                background-color: var(--scb-hover-bg);
            }

            /* セレクトボックス */
            .bar_sel {
                background-color: var(--scb-select-bg);
                color: var(--scb-select-text);
                border: 1px solid var(--scb-border); /* --ss-border-color を置き換え */
                border-radius: 3px;
                padding: 2px;
                margin: 2px;
                width: 120px;
                word-break: normal;
                word-wrap: normal;
                font-size: 13px;
            }

            /* セレクトボックスコンテナ */
            .spn_sel {
                display: inline-block;
                margin: 2px 4px; /* 元: 5px 2px 0 0、調整済み */
                color: var(--scb-text); /* --ss-text-color を置き換え */
                width: 100%;
                line-height: 250%; /* StyleManagerStyles から移行 */
                font-size: 12px; /* StyleManagerStyles から移行 */
            }
            .bar_sel option {
                background-color: inherit; /* デフォルトはセレクトの背景を引き継ぐ */
                color: inherit; /* デフォルトはセレクトの文字色を引き継ぐ */
            }
            /* チェックボックスコンテナ */
            .spn_inp {
                display: inline-block;
                margin: 2px 4px; /* 元: 5px 7px 5px 0、調整済み */
                color: var(--scb-text); /* --ss-text-color を置き換え */
                line-height: 250%; /* StyleManagerStyles から移行 */
                font-size: 12px; /* StyleManagerStyles から移行 */
            }

            .spn_inp input[type="checkbox"] {
                margin-right: 4px;
                vertical-align: middle;
            }

            /* その他の補助スタイル */
            .style-controls {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                margin-bottom: 10px;
            }

            .format-controls {
                border-top: 1px solid var(--scb-border);
                padding-top: 10px;
                margin-top: 5px;
            }

            .reset-button {
                background-color: var(--scb-switch-bg);
                color: var(--scb-switch-text);
                border: 1px solid var(--scb-border);
                border-radius: 4px;
                padding: 4px 8px;
                margin: 4px;
                cursor: pointer;
                font-size: 12px;
            }

            .reset-button:hover {
                background-color: var(--scb-hover-bg);
            }
        `;

        this.#styleElement = document.createElement('style');
        this.#styleElement.id = 'style-control-bar-styles';
        this.#styleElement.textContent = styleSheet;
        document.head.appendChild(this.#styleElement);
        this.#isInitialized = true;
    }
    static isInitialized() {
        return this.#isInitialized;
    }

}

// お気に入り管理CSS
class FavoritesManagerStyles {
    static #styleElement = null;
    static #isInitialized = false;

    static init() {
        if (this.#isInitialized) return;
        const styleSheet = `
            :root {
                --fm-bg-color: #ffffff;
                --fm-text-color: #333333;
                --fm-header-bg: #4CAF50;
                --fm-header-text: #ffffff;
                --fm-border-color: #ddd;
                --fm-shadow-color: rgba(0, 0, 0, 0.15);
                --fm-hover-bg: #f8f9fa;
                --fm-form-bg: #f8f9fa;
                --fm-input-border: #ddd;
            }
            :root[data-theme="dark"] {
                --fm-bg-color: #1a1a1a;
                --fm-text-color: #e0e0e0;
                --fm-header-bg: #2e7d32;
                --fm-header-text: #ffffff;
                --fm-border-color: #444444;
                --fm-shadow-color: rgba(0, 0, 0, 0.3);
                --fm-hover-bg: #2a2a2a;
                --fm-form-bg: #2a2a2a;
                --fm-input-border: #444444;
            }
            .fm-container {
                position: fixed;
                top: 60px;
                right: 20px;
                width: 470px;
                max-height: 85vh;
                background: var(--fm-bg-color);
                border-radius: 16px;
                box-shadow: 0 8px 32px var(--fm-shadow-color);
                display: none;
                flex-direction: column;
                overflow-y: auto;
                font-family: "Segoe UI", "Hiragino Sans", sans-serif;
                color: var(--fm-text-color);
                z-index: 1100;
            }
            .fm-header {
                background: var(--fm-header-bg);
                padding: 4px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .fm-close-button {
                background: none;
                border: none;
                font-size: 14px;
                color: var(--fm-header-text);
                cursor: pointer;
            }
            .fm-form-section {
                padding: 4px;
                background: var(--fm-form-bg);
                border-bottom: 1px solid var(--fm-border-color);
            }
            .fm-jump-buttons {
                display: flex;
                gap: 8px;
                justify-content: center;
                padding: 8px;
            }
            .fm-button {
                border: none;
                cursor: pointer;
                font-size: 14px;
                border-radius: 5px;
                padding: 8px;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            .fm-button:hover {
                transform: translateY(-1px);
            }
            .fm-toggle-button { /* お気に入り管理画面を開くボタン用 */
                background: #4CAF50;
                color: white;
                position: fixed;
                top: 50px;
                right: 20px;
                z-index: 900;
                padding: 8px 16px;
                border-radius: 5px;
                border: 1px solid var(--se-border-color);
                transition: all 0.2s ease;

            }
            .fm-button.primary {
                background: #4CAF50;
                color: white;
            }
            .fm-button.secondary {
                background: #2196F3;
                color: white;
            }
            .fm-button.watching {
                background: #FF9800;
                color: white;
            }
            .fm-button.export {
                background: #2196F3;
                color: white;
            }
            .fm-button.import {
                background: #FF9800;
                color: white;
            }
            .fm-button.remove {
                background: #dc3545;
                color: white;
                border: none;
                padding: 2px 5px;
                border-radius: 3px;
                cursor: pointer;
                display: none;
            }
            .fm-search, .fm-select, .fm-input, .fm-textarea {
                padding: 4px 12px;
                border: 1px solid var(--fm-input-border);
                border-radius: 8px;
                font-size: 14px;
                background: var(--fm-bg-color);
                color: var(--fm-text-color);
                box-sizing: border-box;
            }
            .fm-search {
                width: 100%;
                margin-bottom: 10px;
            }
            .fm-search.active {
                background: #fff3cd;
            }
            :root[data-theme="dark"] .fm-search.active {
                background: #d4a017;
            }
            .fm-select {
                margin-right: 5px;
            }
            .fm-input {
                width: calc(100% - 70px);
            }
            .fm-textarea.memo {
                height: 30px;
                width: 100%;
                margin-top: 5px;
            }
            .fm-textarea.io {
                width: 100%;
                height: 100px;
                margin-top: 10px;
                display: none;
                font-family: monospace;
            }
            .fm-list {
                list-style: none;
                padding: 0;
                margin: 10px 0;
                max-height: 350px;
                overflow-y: auto;
            }
            .fm-category-header {
                padding: 5px;
                background: var(--fm-form-bg);
                font-weight: bold;
                border-bottom: 1px solid var(--fm-border-color);
            }
            ul.fm-list li.fm-item {
                padding: 5px;
                border-bottom: 1px solid var(--fm-border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: var(--fm-bg-color);
            }
            ul.fm-list li.fm-item:hover {
                background: var(--fm-hover-bg) !important;
            }
            ul.fm-list li.fm-item:hover .fm-button.remove {
                display: block !important;
            }
            .fm-item-title {
                flex-grow: 1;
                margin-right: 10px;
            }
        `;
        this.#styleElement = document.createElement('style');
        this.#styleElement.textContent = styleSheet;
        document.head.appendChild(this.#styleElement);
        this.#isInitialized = true;
    }
    static isInitialized() {
        return this.#isInitialized;
    }
}

// お気に入り管理のUIを生成・更新するクラス
class FavoritesUIBuilder {
    #CATEGORY_CONFIG;

    // カテゴリ設定を受け取り初期化
    constructor(categoryConfig) {
        this.#CATEGORY_CONFIG = categoryConfig;
    }

    // お気に入り管理画面のDOM要素を生成
    createUI(manager) {
        const container = document.createElement('div');
        container.id = 'favorites-manager';
        container.className = 'fm-container';
        container.innerHTML = `
            <div class="fm-header">
                <h2 style="margin: 0; font-size: 14px;">お気に入り管理</h2>
                <button id="close-favorites" class="fm-close-button">✖</button>
            </div>
            <div class="fm-form-section">
                <div class="fm-jump-buttons">
                    ${Object.keys(this.#CATEGORY_CONFIG).map(category => `
                        <button class="fm-button ${category}" data-category="${category}">
                            ${this.#CATEGORY_CONFIG[category].icon} ${this.#CATEGORY_CONFIG[category].name}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="fm-form-section">
                <div style="position: relative;">
                    <input type="text" id="search-favorites" class="fm-search" placeholder="検索...">
                    <button id="clear-search" class="fm-button" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); padding: 0 5px; display: none;">✖</button>
                </div>
                <select id="favorite-category" class="fm-select">
                    ${Object.entries(this.#CATEGORY_CONFIG).map(([key, config]) => `
                        <option value="${key}">${config.name}</option>
                    `).join('')}
                </select>
                <input type="text" id="new-favorite" class="fm-input" placeholder="タイトルまたはNGワードを入力">
                <button id="add-favorite" class="fm-button primary">追加</button>
                <textarea id="new-favorite-memo" class="fm-textarea memo" placeholder="メモを入力（お気に入りのみ）" ${manager.searchState.term ? 'style="display: none;"' : ''}></textarea>
                <div id="favorites-list-container"></div>
                <div class="fm-io-buttons">
                    <button id="export-favorites" class="fm-button export">エクスポート</button>
                    <button id="import-favorites" class="fm-button import">インポート</button>
                </div>
                <textarea id="export-text" class="fm-textarea io" style="display: none;" placeholder="エクスポートデータ"></textarea>
                <textarea id="import-text" class="fm-textarea io" style="display: none;" placeholder="以下のように入力してください:\n## 最重要お気に入り\n- タイトル1 // メモ1\n- タイトル2\n## NGワード\n- NGワード1\n- NGワード2"></textarea>
            </div>
        `;

        const listContainer = container.querySelector('#favorites-list-container');
        listContainer.appendChild(this.#renderFavoritesList(manager.favorites, manager.searchState.results));
        return container;
    }

    // お気に入りリストのDOMを生成
    #renderFavoritesList(favorites, searchResults) {
        const displayData = searchResults || favorites;
        const ul = document.createElement('ul');
        ul.className = 'fm-list';

        const hasItems = Object.entries(displayData).some(([_, items]) => items?.length > 0);
        if (!hasItems) {
            const li = document.createElement('li');
            li.className = 'fm-item';
            li.textContent = '一致する項目なし';
            ul.appendChild(li);
            return ul;
        }

        Object.entries(displayData).forEach(([category, items]) => {
            if (!items?.length) return;

            const header = document.createElement('li');
            header.className = 'fm-category-header';
            header.id = `category-${category}`;
            header.textContent = this.#CATEGORY_CONFIG[category].name;
            ul.appendChild(header);

            items.forEach(item => {
                const li = document.createElement('li');
                li.className = 'fm-item';

                const titleSpan = document.createElement('span');
                titleSpan.className = 'fm-item-title';
                titleSpan.textContent = `${this.#CATEGORY_CONFIG[category].icon} ${category === 'blocked' ? item : item.title}${category !== 'blocked' && item.memo ? ` (${item.memo})` : ''}`;

                const removeButton = document.createElement('button');
                removeButton.className = 'fm-button remove';
                removeButton.dataset.category = category;
                removeButton.dataset.title = category === 'blocked' ? item : item.title;
                removeButton.textContent = '削除';

                li.append(titleSpan, removeButton);
                ul.appendChild(li);
            });
        });

        return ul;
    }

    // お気に入りリストを更新
    refreshList(manager) {
        const container = document.getElementById('favorites-manager');
        if (!container) return;

        const listContainer = container.querySelector('#favorites-list-container');
        if (!listContainer) return;

        const oldList = listContainer.querySelector('.fm-list');
        const scrollTop = oldList?.scrollTop || 0;
        const newList = this.#renderFavoritesList(manager.favorites, manager.searchState.results);

        if (oldList) {
            oldList.replaceWith(newList);
        } else {
            listContainer.appendChild(newList);
        }

        requestAnimationFrame(() => newList.scrollTop = scrollTop);
    }

    // 検索UIを更新
    updateSearchUI(manager) {
        const container = document.getElementById('favorites-manager');
        if (!container) return;

        const searchInput = container.querySelector('#search-favorites');
        const clearButton = container.querySelector('#clear-search');
        if (searchInput && clearButton) {
            searchInput.value = manager.searchState.term;
            const isSearching = manager.searchState.term.trim();
            searchInput.classList.toggle('active', isSearching);
            clearButton.style.display = isSearching ? 'block' : 'none';
        }
    }
}

// お気に入りデータを管理するクラス
class FavoritesManager {
    #isInitialized = false; // 初期化済みフラグ
    #CATEGORY_CONFIG = { // カテゴリ設定
        primary: { name: '最重要お気に入り', color: '#4CAF50', icon: '📚' },
        secondary: { name: 'お気に入り', color: '#2196F3', icon: '🔖' },
        watching: { name: 'ウォッチ中', color: '#FF9800', icon: '👀' },
        blocked: { name: 'NGワード', color: '#dc3545', icon: '🚫' }
    };
    #handleEscKey; // ESCキーイベントハンドラー
    #uiBuilder; // UI生成インスタンス
    #searchIndex = null; // 検索インデックス

    // 設定を受け取り初期化
    constructor(config = {}) {
        this.config = { favorites: { primary: [], secondary: [], watching: [], blocked: [] }, ...config };
        this.favorites = this.#getFavorites();
        this.searchState = { term: '', results: null };
        this.#uiBuilder = new FavoritesUIBuilder(this.#CATEGORY_CONFIG);
        this.#buildSearchIndex();
    }

    // ローカルストレージからお気に入りデータを取得
    #getFavorites() {
        try {
            const storedData = localStorage.getItem('arcadia_favorites');
            if (!storedData) {
                console.info('No favorites in localStorage, using defaults');
                return { ...this.config.favorites };
            }

            const parsedData = JSON.parse(storedData);
            if (!parsedData || typeof parsedData !== 'object') {
                throw new Error('Invalid favorites format');
            }

            const validatedFavorites = {};
            Object.keys(this.#CATEGORY_CONFIG).forEach(category => {
                validatedFavorites[category] = Array.isArray(parsedData[category])
                    ? parsedData[category].filter(item =>
                        category === 'blocked' ? typeof item === 'string' : item?.title && typeof item === 'object')
                    : this.config.favorites[category].slice();
            });

            return validatedFavorites;
        } catch (error) {
            console.error('Failed to load favorites:', error);
            return { ...this.config.favorites };
        }
    }

    // お気に入りデータをローカルストレージに保存
    #saveFavorites(favorites) {
        try {
            if (!favorites || typeof favorites !== 'object') throw new Error('Invalid favorites data');
            localStorage.setItem('arcadia_favorites', JSON.stringify(favorites));
            this.favorites = { ...favorites };
            this.config.favorites = this.favorites;
            window.dispatchEvent(new Event('favorites-updated'));
            this.#buildSearchIndex();
        } catch (error) {
            console.error('FavoritesManager: Failed to save favorites:', error.message);
        }
    }

    // 検索用インデックスを構築
    #buildSearchIndex() {
        this.#searchIndex = Object.entries(this.favorites).reduce((index, [category, items]) => {
            items.forEach(item => {
                const key = category === 'blocked' ? item : item.title;
                index[key] = index[key] || [];
                index[key].push({ category, item });
                if (category !== 'blocked' && item.memo) {
                    index[item.memo] = index[item.memo] || [];
                    index[item.memo].push({ category, item });
                }
            });
            return index;
        }, {});
    }

    // お気に入りデータを検索
    #performSearch(term) {
        this.searchState.term = term;
        if (!term) {
            this.searchState.results = null;
            this.#refreshUI();
            return;
        }

        const trimmedTerm = term.trim().toLowerCase(); // 大文字小文字を無視し、前後の空白を除去
        const results = { primary: [], secondary: [], watching: [], blocked: [] };

        // 正規表現の代わりにシンプルな文字列マッチングを使用
        Object.entries(this.#searchIndex).forEach(([key, matches]) => {
            if (key.toLowerCase().includes(trimmedTerm)) {
                matches.forEach(({ category, item }) => {
                    if (!results[category].includes(item)) results[category].push(item);
                });
            }
        });

        this.searchState.results = results;
        this.#refreshUI();
    }

    // お気に入りデータをテキスト形式でエクスポート
    #exportFavorites() {
        const exportArea = document.getElementById('export-text');
        const importArea = document.getElementById('import-text');
        if (!exportArea || !importArea) {
            console.warn('Export/import text areas missing');
            alert('エクスポートに失敗しました。UI要素が見つかりません。');
            return;
        }

        try {
            const text = Object.entries(this.favorites)
                .filter(([_, items]) => items.length)
                .map(([category, items]) => `## ${this.#CATEGORY_CONFIG[category].name}\n${items.map(item => `- ${category === 'blocked' ? item : item.title}${category !== 'blocked' && item.memo ? ` // ${item.memo}` : ''}`).join('\n')}`).join('\n\n');

            importArea.style.display = 'none';
            exportArea.style.display = 'block';
            exportArea.value = `# お気に入り一覧\n\n${text}`;
            exportArea.select();

            if (!document.execCommand('copy')) throw new Error('Copy failed');
            alert('お気に入りリストをクリップボードにコピーしました');
            exportArea.scrollIntoView({ behavior: 'smooth', block: 'end' });
            requestAnimationFrame(() => {
                const container = document.querySelector('.fm-container');
                if (container) container.scrollTop += exportArea.offsetHeight + 10;
            });
        } catch (error) {
            console.error('Export failed:', error);
            alert('エクスポートに失敗しました。クリップボードへのコピーができませんでした。');
        }
    }

    // テキストからお気に入りデータをインポート
    #importFavorites() {
        const importArea = document.getElementById('import-text');
        if (!importArea) {
            console.warn('FavoritesManager: Import text area not found');
            return;
        }
        const text = importArea.value.trim();
        const placeholderText = importArea.getAttribute('placeholder').trim();
        if (!text || text === placeholderText) {
            alert('インポートするテキストを入力してください');
            return;
        }

        try {
            const favorites = { primary: [], secondary: [], watching: [], blocked: [] };
            let currentCategory = null;
            const lines = text.split('\n');
            let invalidCount = 0;

            for (const [index, line] of lines.entries()) { // forEach から for...of に変更で軽量化
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
                if (trimmedLine.startsWith('## ')) {
                    const categoryName = trimmedLine.slice(3);
                    currentCategory = Object.keys(this.#CATEGORY_CONFIG)
                        .find(key => this.#CATEGORY_CONFIG[key].name === categoryName);
                    if (!currentCategory) {
                        console.warn(`FavoritesManager: Invalid category at line ${index + 1}: ${trimmedLine}`);
                        invalidCount++;
                    }
                } else if (trimmedLine.startsWith('- ') && currentCategory) {
                    const content = trimmedLine.slice(2).trim();
                    if (!content) {
                        invalidCount++;
                        continue;
                    }
                    if (currentCategory === 'blocked') {
                        favorites[currentCategory].push(content);
                    } else {
                        const [title, memo = ''] = content.split(' // ').map(s => s.trim());
                        if (title) favorites[currentCategory].push({ title, memo });
                        else invalidCount++;
                    }
                } else if (trimmedLine.startsWith('- ')) {
                    console.warn(`FavoritesManager: No category for item at line ${index + 1}: ${trimmedLine}`);
                    invalidCount++;
                }
            }

            const totalItems = Object.values(favorites).reduce((sum, items) => sum + items.length, 0);
            this.#saveFavorites(favorites);
            importArea.value = '';
            importArea.style.display = 'none';
            alert(`お気に入りリストをインポートしました（${totalItems}件）${invalidCount ? `\n${invalidCount}行の不正データがスキップされました` : ''}`);
            this.#refreshUI();
        } catch (error) {
            console.error('FavoritesManager: Import failed:', error.message);
            alert('インポートの処理中にエラーが発生しました。');
            this.#refreshUI();
        }
    }

    // 関数を遅延実行するデバウンス処理
    #debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    // UIイベントハンドラーを設定
    #setupEventHandlers() {
        const container = document.getElementById('favorites-manager');
        if (!container) return;

        const handlers = {
            click: (e) => {
                const target = e.target;
                if (target.matches('#close-favorites')) {
                    container.style.display = 'none';
                } else if (target.matches('#add-favorite')) {
                    const titleInput = container.querySelector('#new-favorite');
                    const memoInput = container.querySelector('#new-favorite-memo');
                    const categorySelect = container.querySelector('#favorite-category');
                    const title = titleInput.value.trim();
                    const memo = memoInput.value.trim();
                    const category = categorySelect.value;
                    if (title) {
                        if (category === 'blocked') {
                            if (!this.favorites.blocked.includes(title)) this.favorites.blocked.push(title);
                        } else {
                            this.favorites[category].push({ title, memo });
                        }
                        this.searchState.results = null;
                        this.#saveFavorites(this.favorites);
                        titleInput.value = '';
                        memoInput.value = '';
                        this.#refreshUI();
                    }
                } else if (target.matches('#clear-search')) {
                    const searchInput = container.querySelector('#search-favorites');
                    searchInput.value = '';
                    this.searchState.term = '';
                    this.searchState.results = null;
                    searchInput.classList.remove('active');
                    container.querySelector('#clear-search').style.display = 'none';
                    this.#refreshUI();
                } else if (target.matches('#export-favorites')) {
                    this.#exportFavorites();
                } else if (target.matches('#import-favorites')) {
                    const exportArea = container.querySelector('#export-text');
                    const importArea = container.querySelector('#import-text');
                    if (!exportArea || !importArea) return;
                    if (importArea.style.display === 'none') {
                        exportArea.style.display = 'none';
                        importArea.style.display = 'block';
                        importArea.focus();
                        importArea.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        requestAnimationFrame(() => {
                            if (container) container.scrollTop += importArea.offsetHeight + 10;
                        });
                    } else {
                        this.#importFavorites();
                    }
                } else if (target.matches('.fm-button.remove')) {
                    const { category, title } = target.dataset;
                    if (category === 'blocked') {
                        this.favorites[category] = this.favorites[category].filter(item => item !== title);
                    } else {
                        this.favorites[category] = this.favorites[category].filter(item => item.title !== title);
                    }
                    this.searchState.term.trim() ? this.#performSearch(this.searchState.term) : this.#saveFavorites(this.favorites);
                    this.#refreshUI();
                } else if (target.matches('.fm-jump-buttons .fm-button')) {
                    const category = target.dataset.category;
                    const section = container.querySelector(`#category-${category}`);
                    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            },
            input: {
                '#search-favorites': this.#debounce((e) => {
                    const value = e.target.value;
                    this.#performSearch(value);
                    container.querySelector('#clear-search').style.display = value.trim() ? 'block' : 'none';
                }, 500)
            }
        };

        container.addEventListener('click', handlers.click);
        const searchInput = container.querySelector('#search-favorites');
        if (searchInput) searchInput.addEventListener('input', handlers.input['#search-favorites']);
    }

    // UIを更新
    #refreshUI() {
        const container = document.getElementById('favorites-manager');
        if (!container) return;
        this.#uiBuilder.refreshList(this);
        this.#uiBuilder.updateSearchUI(this);
    }

    // お気に入りボタンを追加し管理画面を表示
    init() {
        if (this.#isInitialized) return;

        const initialize = () => {
            if (!document.body) {
                setTimeout(initialize, 100);
                return;
            }
            if (typeof FavoritesManagerStyles?.init === 'function') FavoritesManagerStyles.init();

            const button = document.createElement('button');
            button.textContent = 'お気に入り';
            button.className = 'fm-toggle-button';
            button.onclick = () => {
                let container = document.getElementById('favorites-manager');
                if (!container) {
                    container = this.#uiBuilder.createUI(this);
                    document.body.appendChild(container);
                    this.#setupEventHandlers();
                    document.removeEventListener('keydown', this.#handleEscKey);
                    this.#handleEscKey = (e) => {
                        if (e.key === 'Escape' && container?.style.display === 'block') {
                            const searchInput = container.querySelector('#search-favorites');
                            const clearButton = container.querySelector('#clear-search');
                            if (searchInput) {
                                searchInput.value = '';
                                this.searchState.term = '';
                                this.searchState.results = null;
                                searchInput.classList.remove('active');
                                if (clearButton) clearButton.style.display = 'none';
                                this.#refreshUI();
                            }
                        }
                    };
                    document.addEventListener('keydown', this.#handleEscKey);
                    container.style.display = 'block';
                } else {
                    container.style.display = container.style.display === 'none' ? 'block' : 'none';
                }
            };
            document.body.appendChild(button);
            this.#isInitialized = true;
        };

        initialize();
    }
}

// スタイルとテーマを統合的に管理するクラス
class StyleThemeManager {
    #isInitialized = false; // 初期化済みフラグ
    #config;
    #currentTheme;
    #themeButton;
    #themeStates = {
        light: { next: 'dark', icon: '🌙' },
        dark: { next: 'light', icon: '☀️' },
        'high-contrast': { next: 'light', icon: '🌞' }
    };

    constructor(config) {
        this.#config = this.#loadConfig(config);
        this.#currentTheme = localStorage.getItem('ss-theme') || this.#detectPreferredTheme();
        this.#themeButton = null;
    }

    getCurrentTheme() {
        return this.#currentTheme;
    }

    // localStorageからCONFIGを読み込み、デフォルトとマージ
    #loadConfig(defaultConfig) {
        const storedConfig = localStorage.getItem('arcadia_config');
        return storedConfig ? { ...defaultConfig, ...JSON.parse(storedConfig) } : defaultConfig;
    }

    // ユーザーの優先テーマを検知（アクセシビリティ対応）
    #detectPreferredTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // 共通スタイル
    static get #commonStyles() {
        return `
            body { background-color: var(--ss-body-bg); color: var(--ss-text-color); font-family: var(--ss-font-family); font-size: var(--ss-font-size); line-height: var(--ss-line-height); }
            .content-wrapper { width: var(--ss-width); margin: 0 auto; }
            a { color: var(--ss-link-color); text-decoration: none; }
            a:visited { color: var(--ss-visited-link-color); }
            a:hover { text-decoration: underline; }
            .ss-list-table-cell tr.bgc { transition: background-color 0.2s ease; }
            .main-list-table-cell tr.bgc { transition: background-color 0.2s ease; }
            input[type="text"] { background-color: var(--ss-input-bg); color: var(--ss-input-text); border: 1px solid var(--ss-input-border); padding: 4px; border-radius: 3px; }
            input[type="submit"] { background-color: var(--ss-button-bg); color: var(--ss-button-text); border: 1px solid var(--ss-input-border); padding: 4px 12px; border-radius: 3px; cursor: pointer; transition: background-color 0.2s ease; }
            input[type="submit"]:hover { background-color: var(--ss-hover-bg); color: var(--ss-hover-text); }
            .theme-toggle { position: fixed; top: 10px; right: 20px; padding: 8px 16px; background-color: var(--ss-hover-bg); color: var(--ss-hover-text); border: 1px solid var(--ss-border-color); border-radius: 4px; cursor: pointer; z-index: 1000; transition: background-color 0.2s ease; }
            .theme-toggle:hover { background-color: var(--list-favorite-primary); }
        `;
    }

    // テーマ別スタイルを生成
    #generateThemeStyles() {
        const { light, dark } = this.#config.style.themes;
        return `
            :root { transition: --ss-body-bg 0.3s ease, --ss-text-color 0.3s ease; }
            :root[data-theme="light"] {
                --ss-body-bg: #ffffff;
                --ss-text-color: ${light.color || '#333333'};
                --ss-link-color: #0066cc;
                --ss-visited-link-color: #551A8B;
                --ss-list-bg: #fff7d4;
                --ss-hover-bg: #ffe4b5;
                --ss-hover-text: #333333;
                --list-favorite-primary: #ffe0e9;
                --list-favorite-secondary: #e6e0ff;
                --list-favorite-watching: #e0e8ff;
                --list-favorite-primary-hover: #ffc6d9;
                --list-favorite-secondary-hover: #d1c6ff;
                --list-favorite-watching-hover: #c6d5ff;
                --ss-border-color: #aaaacc;
                --ss-header-bg: #ddddff;
                --ss-header-text: #333333;
                --ss-menu-bg: #fff7d4;
                --ss-menu-link: #0066cc;
                --ss-menu-link-hover: #003366;
                --ss-input-bg: #ffffff;
                --ss-input-text: #333333;
                --ss-input-border: #aaaacc;
                --ss-button-bg: #ddddff;
                --ss-button-text: #333333;
                --ss-hr-color: #aaaacc;
            }
            :root[data-theme="dark"] {
                --ss-body-bg: ${dark.backgroundColor || '#1a1a1a'};
                --ss-text-color: ${dark.color || '#e0e0e0'};
                --ss-link-color: #88bbff;
                --ss-visited-link-color: #00CCCC;
                --ss-list-bg: #2a2620;
                --ss-hover-bg: #3d3630;
                --ss-hover-text: #ffffff;
                --list-favorite-primary: #6b1849;
                --list-favorite-secondary: #634c7a;
                --list-favorite-watching: #5a6084;
                --list-favorite-primary-hover: #7c1f56;
                --list-favorite-secondary-hover: #735d8b;
                --list-favorite-watching-hover: #6b7195;
                --ss-border-color: #444444;
                --ss-header-bg: #20203d;
                --ss-header-text: #ffffff;
                --ss-menu-bg: #2a2620;
                --ss-menu-link: #88bbff;
                --ss-menu-link-hover: #aaccff;
                --ss-input-bg: #333333;
                --ss-input-text: #ffffff;
                --ss-input-border: #555555;
                --ss-button-bg: #2a2a4d;
                --ss-button-text: #ffffff;
                --ss-hr-color: #444444;
            }
            :root[data-theme="high-contrast"] {
                --ss-body-bg: #000000;
                --ss-text-color: #ffffff;
                --ss-link-color: #ffff00;
                --ss-visited-link-color: #ff00ff;
                --ss-list-bg: #000000;
                --ss-hover-bg: #333333;
                --ss-hover-text: #ffffff;
                --list-favorite-primary: #ff4444;
                --list-favorite-secondary: #4444ff;
                --list-favorite-watching: #44ff44;
                --list-favorite-primary-hover: #ff6666;
                --list-favorite-secondary-hover: #6666ff;
                --list-favorite-watching-hover: #66ff66;
                --ss-border-color: #ffffff;
                --ss-header-bg: #000000;
                --ss-header-text: #ffffff;
                --ss-menu-bg: #000000;
                --ss-menu-link: #ffff00;
                --ss-menu-link-hover: #ffcc00;
                --ss-input-bg: #000000;
                --ss-input-text: #ffffff;
                --ss-input-border: #ffffff;
                --ss-button-bg: #333333;
                --ss-button-text: #ffffff;
                --ss-hr-color: #ffffff;
            }
            .ss-list-table-cell, .bgc, .brdr .bgc { background-color: var(--ss-list-bg) !important; color: var(--ss-text-color) !important; }
            .main-list-table-cell, .bgc, .brdr .bgc { background-color: var(--ss-list-bg) !important; color: var(--ss-text-color) !important; }
            td.bga,tr.bga td, .bgb, .bgb * { background-color: var(--ss-header-bg) !important; color: var(--ss-header-text) !important; border: 1px solid var(--ss-border-color); border-width: 1px 0; font-weight: bold; }
            .ss-list-table-cell tr.bgc:hover td { background-color: var(--ss-hover-bg) !important; color: var(--ss-hover-text) !important; }
            .ss-list-table-cell tr.bgc.list-favorite-primary td { background-color: var(--list-favorite-primary) !important; }
            .ss-list-table-cell tr.bgc.list-favorite-secondary td { background-color: var(--list-favorite-secondary) !important; }
            .ss-list-table-cell tr.bgc.list-favorite-watching td { background-color: var(--list-favorite-watching) !important; }
            .ss-list-table-cell tr.bgc.list-favorite-primary:hover td { background-color: var(--list-favorite-primary-hover) !important; }
            .ss-list-table-cell tr.bgc.list-favorite-secondary:hover td { background-color: var(--list-favorite-secondary-hover) !important; }
            .ss-list-table-cell tr.bgc.list-favorite-watching:hover td { background-color: var(--list-favorite-watching-hover) !important; }
            .main-list-table-cell tr.bgc:hover td { background-color: var(--ss-hover-bg) !important; color: var(--ss-hover-text) !important; }
            .main-list-table-cell tr.bgc.list-favorite-primary td { background-color: var(--list-favorite-primary) !important; }
            .main-list-table-cell tr.bgc.list-favorite-secondary td { background-color: var(--list-favorite-secondary) !important; }
            .main-list-table-cell tr.bgc.list-favorite-watching td { background-color: var(--list-favorite-watching) !important; }
            .main-list-table-cell tr.bgc.list-favorite-primary:hover td { background-color: var(--list-favorite-primary-hover) !important; }
            .main-list-table-cell tr.bgc.list-favorite-secondary:hover td { background-color: var(--list-favorite-secondary-hover) !important; }
            .main-list-table-cell tr.bgc.list-favorite-watching:hover td { background-color: var(--list-favorite-watching-hover) !important; }
            td.bgc { background-color: var(--ss-menu-bg) !important; color: var(--ss-text-color) !important; }
        `;
    }

    // カスタムスタイルを生成
    #generateCustomStyles() {
        const { fontFamily, fontSize, lineHeight, width } = this.#config.style;
        return `
            :root {
                --ss-font-family: ${fontFamily || 'inherit'};
                --ss-font-size: ${fontSize || '100%'};
                --ss-line-height: ${lineHeight || '150%'};
                --ss-width: ${width || '90%'};
            }
        `;
    }

    // スタイルを初期化
    #initStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = StyleThemeManager.#commonStyles + this.#generateThemeStyles() + this.#generateCustomStyles();
        document.head.appendChild(styleEl);

        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            if (e.matches) this.#currentTheme = 'high-contrast';
            this.#applyTheme();
        });
    }

    // テーマを適用（統合メソッド）
    #applyTheme() {
        document.documentElement.setAttribute('data-theme', this.#currentTheme);
        if (this.#themeButton) this.#themeButton.textContent = this.#themeStates[this.#currentTheme].icon;

        const root = document.documentElement;
        const styles = {
            '--ss-body-bg': this.#currentTheme === 'light' ? '#ffffff' :
                           this.#currentTheme === 'dark' ? this.#config.style.themes.dark.backgroundColor || '#1a1a1a' :
                           '#000000',
            '--ss-text-color': this.#currentTheme === 'light' ? this.#config.style.themes.light.color || '#333333' :
                             this.#currentTheme === 'dark' ? this.#config.style.themes.dark.color || '#e0e0e0' :
                             '#ffffff',
            '--ss-font-family': this.#config.style.fontFamily || 'inherit',
            '--ss-font-size': this.#config.style.fontSize || '100%',
            '--ss-line-height': this.#config.style.lineHeight || '150%',
            '--ss-width': this.#config.style.width || '90%'
        };

        Object.entries(styles).forEach(([key, value]) => root.style.setProperty(key, value));
    }

    // テーマ切り替えボタンを追加
    #addThemeToggle() {
        this.#themeButton = document.createElement('button');
        this.#themeButton.className = 'theme-toggle';
        this.#themeButton.id = 'theme-toggle-button';
        this.#themeButton.textContent = this.#themeStates[this.#currentTheme].icon;
        this.#themeButton.addEventListener('click', () => this.toggleTheme());
        document.body.appendChild(this.#themeButton);
    }

    // テーマを切り替え
    toggleTheme() {
        this.#currentTheme = this.#themeStates[this.#currentTheme].next;
        localStorage.setItem('ss-theme', this.#currentTheme);
        requestAnimationFrame(() => this.#applyTheme());
    }

    // 色を検証
    #validateColor(color, defaultValue) {
        return /^#[0-9A-F]{6}$/i.test(color) || CSS.supports('color', color) ? color : defaultValue;
    }

    // スタイル設定を更新（リアルタイム反映＋永続性確保）
    updateStyles(newStyles) {
        this.#config.style = { ...this.#config.style, ...newStyles };
        const validatedConfig = {
            ...this.#config,
            style: {
                ...this.#config.style,
                themes: {
                    light: { ...this.#config.style.themes.light, color: this.#validateColor(this.#config.style.themes.light.color, '#333333') },
                    dark: {
                        ...this.#config.style.themes.dark,
                        backgroundColor: this.#validateColor(this.#config.style.themes.dark.backgroundColor, '#1a1a1a'),
                        color: this.#validateColor(this.#config.style.themes.dark.color, '#e0e0e0')
                    }
                }
            }
        };
        this.#config = validatedConfig;
        localStorage.setItem('arcadia_config', JSON.stringify(this.#config));
        this.#applyTheme();
    }

    init() {
        if (this.#isInitialized) return;
        this.#initStyles();
        this.#addThemeToggle();
        this.#applyTheme();
        this.#isInitialized  = true;
    }

}

// コンフィグエディターのCSS管理
class SettingsEditorStyles {
    static #styleElement = null;

    static init() {
        if (this.#styleElement) return;

        const styleSheet = `
            :root {
                --se-bg-color: var(--ss-body-bg, #ffffff);
                --se-text-color: var(--ss-text-color, #333333);
                --se-header-bg: #4CAF50;
                --se-header-text: var(--ss-text-color, #ffffff);
                --se-border-color: var(--ss-border-color, #ddd);
                --se-shadow-color: rgba(0, 0, 0, 0.15);
                --se-hover-bg: var(--ss-hover-bg, #f8f9fa);
            }
            :root[data-theme="dark"] {
                --se-bg-color: var(--ss-body-bg, #1a1a1a);
                --se-text-color: var(--ss-text-color, #e0e0e0);
                --se-header-bg: #2e7d32;
                --se-border-color: var(--ss-border-color, #444444);
                --se-shadow-color: rgba(0, 0, 0, 0.3);
                --se-hover-bg: var(--ss-hover-bg, #2a2a2a);
            }
            :root[data-theme="high-contrast"] {
                --se-bg-color: var(--ss-body-bg, #000000);
                --se-text-color: var(--ss-text-color, #ffffff);
                --se-header-bg: #000000;
                --se-border-color: var(--ss-border-color, #ffffff);
                --se-shadow-color: rgba(255, 255, 255, 0.3);
                --se-hover-bg: var(--ss-hover-bg, #333333);
            }
            .se-container { position: fixed; top: 60px; left: 20px; width: 470px; max-height: 80vh; background: var(--se-bg-color); border-radius: 16px; box-shadow: 0 8px 32px var(--se-shadow-color); display: flex; flex-direction: column; z-index: 1100; overflow-y: auto; }
            .se-buttons-container { position: sticky; top: 40px; background: var(--se-bg-color); z-index: 1; padding: 4px 0; border-bottom: 1px solid var(--se-border-color); }
            .se-fixed-header { position: sticky; top: 0; background: var(--se-header-bg); color: var(--se-header-text); z-index: 1; padding: 8px 20px; height: 25px; }
            .se-header { display: flex; justify-content: space-between; align-items: center; }
            .se-title { margin: 0; font-size: 16px; font-weight: 500; }
            .se-close-button { background: none; border: none; font-size: 16px; color: var(--se-header-text); cursor: pointer; padding: 0 8px; }
            .se-form-section.buttons { display: flex; flex-direction: row; gap: 16px; justify-content: center; padding: 4px 0; margin-top: 0; }
            .se-form-section { padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
            .se-lists-container { flex: 1; overflow-y: auto; padding: 8px; background: var(--se-bg-color); }
            .se-category { margin-bottom: 12px; border-radius: 8px; background: var(--se-bg-color); box-shadow: 0 2px 4px var(--se-shadow-color); }
            .se-category-header { padding: 8px 12px; border-bottom: 1px solid var(--se-border-color); background: var(--se-bg-color); cursor: pointer; }
            .se-category-title { font-size: 16px; margin: 0; color: var(--se-text-color); }
            .se-form-grid { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
            .se-form-grid label { flex: 1; text-align: left; color: var(--se-text-color); font-size: 14px; cursor: help; }
            .se-form-grid input[type="checkbox"], .se-form-grid input[type="text"], .se-form-grid input[type="password"] { width: auto; padding: 4px; border: 1px solid var(--se-border-color); border-radius: 4px; background: var(--se-bg-color); color: var(--se-text-color); }
            .se-form-grid input[type="checkbox"] { margin-left: 8px; }
            .se-button { border: none; cursor: pointer; font-size: 14px; border-radius: 5px; padding: 6px 12px; font-weight: 500; transition: all 0.2s ease; min-width: 80px; max-width: 120px; min-height: 32px; }
            .se-button:hover { transform: translateY(-1px); }
            .se-button-primary { background-color: #27ae60; color: white; }
            .se-button-danger { background-color: #dc3545; color: white; }
            .se-form-section h4 { margin: 8px 0 4px; font-size: 14px; color: var(--se-text-color); }
            .se-settings-button { position: fixed; top: 10px; left: 20px; background: none; border: 1px solid var(--se-border-color); font-size: 16px; color: var(--se-text-color); cursor: pointer; padding: 8px 0px; border-radius: 5px; z-index: 1200; transition: all 0.2s ease; }
            .se-settings-button:hover { background-color: var(--se-hover-bg); transform: translateY(-1px); }
        `;

        this.#styleElement = document.createElement('style');
        this.#styleElement.textContent = styleSheet;
        document.head.appendChild(this.#styleElement);
    }

}

//コンフィグを動的に管理するクラス
class ConfigManager {
    #defaultConfig;
    #storageKey;

    constructor(defaultConfig) {
        // デフォルトコンフィグとストレージキーを初期化
        this.#defaultConfig = JSON.parse(JSON.stringify(defaultConfig));
        this.#storageKey = 'arcadia_config';
    }

    // ローカルストレージからコンフィグを読み込み
    loadConfig() {
        const storedConfig = localStorage.getItem(this.#storageKey);
        if (storedConfig) {
            return JSON.parse(storedConfig);
        }
        return JSON.parse(JSON.stringify(this.#defaultConfig));
    }

    // コンフィグをローカルストレージに保存
    saveConfig(config) {
        localStorage.setItem(this.#storageKey, JSON.stringify(config));
    }

    // コンフィグをリセット
    resetConfig() {
        localStorage.removeItem(this.#storageKey);
        return JSON.parse(JSON.stringify(this.#defaultConfig));
    }

    // 編集可能なフィールドを返す
    getEditableFields() {
        return {
            viewer: {
                displayName: '閲覧設定',
                fields: [
                    { id: 'styleBar', label: 'スタイル設定バー表示', type: 'checkbox', value: true, description: 'スタイル変更バーを埋め込みます' },
                    { id: 'fixedIndex', label: '目次埋め込み', type: 'checkbox', value: true, description: '目次ポップアップを上部に埋め込みます' },
                    { id: 'skipErrorPage', label: '抜け記事エラー回避', type: 'checkbox', value: true, description: '歯抜け記事のエラー画面をスキップします' },
                ]
            },
            ssList: {
                displayName: '記事一覧での設定',
                fields: [
                    { id: 'hideSpam', label: 'スパム非表示', type: 'checkbox', value: true, description: 'メイン板の荒らし記事を非表示にします' },
                    { id: 'hideAdsShort', label: '広告・短編非表示', type: 'checkbox', value: false, description: '広告や短編SSを非表示にします' },
                    { id: 'adsThreshold', label: '広告閾値', type: 'number', value: 1, description: '広告と判定する記事数の閾値' },
                    { id: 'showPvRatio', label: 'PV÷記事数表示', type: 'checkbox', value: false, description: 'PV÷記事数の比率を表示します' },
                    { id: 'hideLowPv', label: '低PV率非表示', type: 'checkbox', value: false, description: '低PV率のSSを非表示にします' },
                    { id: 'pvThreshold', label: 'PV閾値', type: 'number', value: 500, description: 'PV率の閾値（単位: PV/記事）' },
                    { id: 'directLinks', label: '全話・感想直リンク', type: 'checkbox', value: true, description: '全話と感想板への直接リンクを追加します' },
                    { id: 'skipXXXWarning', label: 'XXX板警告スキップ', type: 'checkbox', value: true, description: 'XXX板の警告をスキップします' },
                    { id: 'removeTestBoard', label: 'テスト板リンク削除', type: 'checkbox', value: true, description: 'テスト板リンクを削除します' },
                    { id: 'openSSInNewTab', label: 'SSを新タブで開く', type: 'checkbox', value: true, description: 'SSを常に新しいタブで開きます' },
                    { id: 'skipSearchWarning', label: '捜索掲示板警告スキップ', type: 'checkbox', value: true, description: '捜索掲示板の注意書きをスキップします' },
                    { id: 'skipMainWarning', label: 'メイン掲示板警告スキップ', type: 'checkbox', value: true, description: 'メイン掲示板の注意書きをスキップします' }
                ]
            },
            board: {
                displayName: '感想ページ/メイン・捜索掲示板設定',
                fields: [
                    { id: 'embedPageLinks', label: '感想ページにリンク埋め込み', type: 'checkbox', value: true, description: '感想ページにページリンクを埋め込みます' },
                    { id: 'sortDesc', label: '感想順を降順に', type: 'checkbox', value: true, description: '感想を新しい順に並べます' },
                    { id: 'japaneseDate', label: '日本語日付表示', type: 'checkbox', value: true, description: '日付を日本語形式で表示します' },
                    { id: 'adjustStyle', label: '行高・文字色修正', type: 'checkbox', value: false, description: '行の高さと文字色を調整します' },
                    { id: 'searchBar', label: 'メイン/捜索板検索バー埋め込み', type: 'checkbox', value: true, description: 'メイン/捜索板に検索バーを追加します' }
                ]
            },
            posting: {
                displayName: '投稿設定',
                fields: [
                    { id: 'autoFill', label: '自動入力', type: 'checkbox', value: false, description: '投稿情報を自動で入力します' }
                ],
                userInfo: [
                    { id: 'name', label: '名前', type: 'text', value: 'ねじりん', description: '投稿時の表示名' },
                    { id: 'tripcode', label: 'トリップ', type: 'text', value: 'eclipse', description: '投稿者の認証用トリップコード' },
                    { id: 'password', label: 'パスワード', type: 'password', value: '5550', description: '投稿編集用のパスワード' }
                ]
            },
            style: {
                displayName: 'デフォルトスタイル設定',
                fields: [
                    { id: 'width', label: '幅', type: 'text', value: '90%', description: 'ページの幅（%またはpx）' },
                    { id: 'lineHeight', label: '行間', type: 'text', value: '150%', description: '行の高さ（%単位）' },
                    { id: 'fontSize', label: '文字サイズ', type: 'text', value: '100%', description: 'フォントサイズ（%単位）' }
                ],
                themes: {
                    light: [
                        { id: 'color', label: '文字色', type: 'text', value: '#000000', description: 'ライトテーマのテキスト色（カラーコード）' },
                        { id: 'backgroundColor', label: '背景色', type: 'text', value: '#FFF7D4', description: 'ライトテーマの背景色（カラーコード）' }
                    ],
                    dark: [
                        { id: 'color', label: '文字色', type: 'text', value: '#FFFFFF', description: 'ダークテーマのテキスト色（カラーコード）' },
                        { id: 'backgroundColor', label: '背景色', type: 'text', value: '#2a2620', description: 'ダークテーマの背景色（カラーコード）' }
                    ]
                }
            },
            autoExecute: {
                displayName: 'デフォルト自動実行設定',
                fields: [
                    { id: 'spacing', label: '空行圧縮', type: 'checkbox', value: true, description: '無駄な空行を圧縮します' },
                    { id: 'indent', label: '段落頭を字下げ', type: 'checkbox', value: false, description: '段落の先頭を字下げします' },
                    { id: 'linebreak', label: '段落途中の改行無視', type: 'checkbox', value: false, description: '段落内の改行を無視します' },
                    { id: 'wordWrap', label: '横幅破壊回避', type: 'checkbox', value: true, description: '連続文字によるテーブル崩れを防ぎます' },
                    { id: 'insertspace', label: '会話と地の文の間に空行挿入', type: 'checkbox', value: true, description: '会話と地の文の間に空行を追加します' }
                ]
            }
        };
    }
}

// コンフィグを設定するクラス
class SettingsEditor {
    #configManager;             // コンフィグ管理インスタンス
    #currentConfig;             // 現在のコンフィグ
    #styleThemeManager;         // スタイルテーマ管理インスタンス
    #isInitialized = false;     // 多重起動防止フラグ

    // コンストラクタ: コンフィグマネージャーとスタイルテーママネージャーを初期化
    constructor(configManager, styleThemeManager = window.styleThemeManager || null) {
        this.#configManager = configManager;
        this.#currentConfig = this.#configManager.loadConfig();
        this.#styleThemeManager = styleThemeManager;
    }

    // 設定画面のUIを作成
    #createSettingsUI() {
        const container = document.createElement('div');
        container.id = 'settings-editor';
        container.className = 'se-container';
        container.innerHTML = `
            <div class="se-fixed-header">
                <div class="se-header">
                    <h2 class="se-title">設定編集</h2>
                    <button id="close-settings" class="se-close-button">✖</button>
                </div>
            </div>
            <div class="se-buttons-container">
                <div class="se-form-section buttons">
                    <button class="se-button se-button-primary" data-action="save">保存</button>
                    <button class="se-button se-button-danger" data-action="reset">リセット</button>
                </div>
            </div>
            <div class="se-lists-container"></div>
        `;

        const content = container.querySelector('.se-lists-container');
        const editableFields = this.#configManager.getEditableFields();
        Object.entries(editableFields).forEach(([category, categoryData]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'se-category';
            categoryDiv.innerHTML = `
                <div class="se-category-header" data-category="${category}">
                    <h3 class="se-category-title">${categoryData.displayName} ▶</h3>
                </div>
                <div class="se-form-section" style="display: none;"></div>
            `;

            const section = categoryDiv.querySelector('.se-form-section');
            if (categoryData.fields) {
                categoryData.fields.forEach(field => section.appendChild(this.#createField(field, category)));
            }
            if (categoryData.userInfo) {
                const subHeader = document.createElement('h4');
                subHeader.textContent = 'ユーザーデータ';
                section.appendChild(subHeader);
                categoryData.userInfo.forEach(field => section.appendChild(this.#createField(field, `${category}.userInfo`)));
            }
            if (categoryData.themes) {
                Object.entries(categoryData.themes).forEach(([themeName, themeFields]) => {
                    const subHeader = document.createElement('h4');
                    subHeader.textContent = themeName === 'light' ? 'ライトテーマ' : 'ダークテーマ';
                    section.appendChild(subHeader);
                    themeFields.forEach(field => section.appendChild(this.#createField(field, `${category}.themes.${themeName}`)));
                });
            }
            content.appendChild(categoryDiv);
        });

        return container;
    }

    // 設定項目のフィールドを作成
    #createField(field, category) {
        const div = document.createElement('div');
        div.className = 'se-form-grid';
        const fullPath = `${category}.${field.id}`;
        const value = this.#getNestedValue(this.#currentConfig, fullPath);

        div.innerHTML = `
            <label for="${fullPath.replace(/\./g, '-')}" title="${field.description || ''}">${field.label}</label>
            <input id="${fullPath.replace(/\./g, '-')}" data-path="${fullPath}"
                   type="${field.type === 'checkbox' ? 'checkbox' : field.type === 'password' ? 'password' : 'text'}"
                   ${field.type === 'checkbox' ? `checked="${this.#validateInput(value, 'checkbox', field.value)}"` : `value="${this.#validateInput(value, field.type, field.value)}"`}
                   ${field.type === 'number' ? 'min="0"' : ''}>
        `;
        return div;
    }

    // ネストされたオブジェクトから値を取得
    #getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    // ネストされたオブジェクトに値を設定
    #setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            current[parts[i]] = current[parts[i]] || {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }

    // 入力値のバリデーションを実施
    #validateInput(input, type, defaultValue) {
        if (type === 'checkbox') return typeof input === 'boolean' ? input : defaultValue;
        if (type === 'number') {
            const num = parseInt(input, 10);
            return !isNaN(num) && num >= 0 ? num : defaultValue;
        }
        if (type === 'text' || type === 'password') {
            if (input && typeof input === 'string') {
                if (input.startsWith('#') && !/^#[0-9A-F]{6}$/i.test(input)) return defaultValue;
                return input;
            }
            return defaultValue;
        }
        return defaultValue;
    }

    // カテゴリの展開/折りたたみトグル
    #toggleCategory(header) {
        const section = header.nextElementSibling;
        const category = header.dataset.category;
        const title = header.querySelector('.se-category-title');
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
        title.textContent = `${this.#configManager.getEditableFields()[category].displayName} ${section.style.display === 'none' ? '▶' : '▼'}`;
    }

    // イベントハンドラを設定
    #setupEventHandlers() {
        const editor = document.getElementById('settings-editor');
        if (!editor) return;

        editor.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('se-close-button')) {
                editor.style.display = 'none';
            } else if (target.dataset.action === 'save') {
                const newConfig = JSON.parse(JSON.stringify(this.#currentConfig));
                editor.querySelectorAll('input').forEach(input => {
                    const path = input.dataset.path;
                    const value = input.type === 'checkbox' ? input.checked :
                                 input.type === 'number' ? parseInt(input.value, 10) : input.value;
                    this.#setNestedValue(newConfig, path, value);
                });
                this.#configManager.saveConfig(newConfig);
                this.#currentConfig = newConfig;
                alert('設定を保存しました。ページをリロードして反映してください。');
            } else if (target.dataset.action === 'reset') {
                this.#currentConfig = this.#configManager.resetConfig();
                this.#refreshUI();
                alert('設定をリセットしました。ページをリロードして反映してください。');
            } else if (target.closest('.se-category-header')) {
                const header = target.closest('.se-category-header');
                this.#toggleCategory(header);
            }
        });

        editor.addEventListener('input', (e) => {
            const input = e.target;
            if (!input.dataset.path) return;
            const path = input.dataset.path;
            const type = input.type === 'checkbox' ? 'checkbox' : input.type === 'number' ? 'number' : 'text';
            const defaultValue = this.#getNestedValue(this.#configManager.getEditableFields(), path.split('.').slice(0, -1).join('.') + '.' + path.split('.').pop()).value;
            const value = this.#validateInput(
                input.type === 'checkbox' ? input.checked : input.value,
                type,
                defaultValue
            );
            if (input.type === 'checkbox') input.checked = value;
            else input.value = value;
            this.#setNestedValue(this.#currentConfig, path, value);
        });
    }

    // UIを再描画
    #refreshUI() {
        const editor = document.getElementById('settings-editor');
        if (!editor) return;

        // 最新の設定を反映
        this.#currentConfig = this.#configManager.loadConfig();
        editor.querySelectorAll('.se-form-grid input').forEach(input => {
            const path = input.dataset.path;
            const value = this.#getNestedValue(this.#currentConfig, path);
            if (input.type === 'checkbox') input.checked = value;
            else input.value = value;
        });
    }

    // 初期化処理を実行（多重起動防止）
    init() {
        if (this.#isInitialized) return;
        SettingsEditorStyles.init();

        const button = document.createElement('button');
        button.textContent = '⚙️ 設定';
        button.className = 'se-settings-button';
        if (!document.body) return;

        button.onclick = () => {
            // ページ読み込み時に最新の設定を取得
            this.#currentConfig = this.#configManager.loadConfig();
            let editor = document.getElementById('settings-editor');
            if (!editor) {
                editor = this.#createSettingsUI();
                editor.style.display = 'none';
                document.body.appendChild(editor);
                this.#setupEventHandlers();
            }
            editor.style.display = editor.style.display === 'none' ? 'block' : 'none';
            this.#refreshUI(); // 表示時に UI を最新状態に更新
            SettingsEditorStyles.updateStyles(this.#styleThemeManager?.getCurrentTheme() || document.documentElement.getAttribute('data-theme') || 'light');
        };

        document.body.appendChild(button);
        this.#isInitialized = true;
    }
}

// スパムフィルタリングクラス
class SpamFilter {
    #spamPattern = />[A-Za-z]{10,}</;        // 10文字以上の連続英字（HTMLタグ内）
    #spamLinkPattern = /[A-Za-z]{10,}/;      // 10文字以上の連続英字（リンクテキスト）

    constructor(config) {
        this.config = config;
    }

    hideSpamPosts(batchUpdates) {
        if (!this.config.board.hideSpam) return;

        const updates = [];
        // #table内の投稿行（tr.bgc）を対象に
        document.querySelectorAll('#table tr.bgc').forEach(row => {
            // タイトル部分のリンクを取得
            const link = row.querySelector('td:nth-child(3) b a'); // 3列目がタイトル
            if (link) {
                const linkText = link.textContent; // リンクのテキスト
                const linkHTML = link.innerHTML;   // リンクのHTML（タグ含む）

                // スパム判定: リンクテキストまたはHTMLに10文字以上の連続英字が含まれる場合
                if (this.#spamPattern.test(linkHTML) || this.#spamLinkPattern.test(linkText)) {
                    updates.push(() => row.style.display = 'none'); // 行全体を非表示
                }
            }
        });

        // バッチ処理でDOM更新を実行
        batchUpdates(updates);
    }
}

// フォーム自動入力クラス
class FormFiller {
    #inputMappings = {
        'name': ['name', 'iname'],
        'tripcode': ['trip', 'itrip'],
        'password': ['password', 'ipass']
    };

    constructor(config) {
        this.config = config;
    }

    autoFillForms(batchUpdates) {
        if (!this.config.posting.autoFill) return;
        const updates = [];
        document.querySelectorAll('input').forEach(input => {
            for (const [infoKey, nameAttrs] of Object.entries(this.#inputMappings)) {
                if (nameAttrs.includes(input.name)) {
                    updates.push(() => input.defaultValue = this.config.posting.userInfo[infoKey]);
                    break;
                }
            }
        });
        batchUpdates(updates); // パフォーマンス最適化のためにバッチ処理を利用
    }
}

// 掲示板システムの機能を管理する統合クラス
class BoardManager {
    // プライベートプロパティ
    #isInitialized = false; // 初期化フラグを追加
    #configManager;
    #spamFilter;
    #formFiller;
    #routes = new Map();

    constructor(config) {
        // クラスレベルでインスタンスを保持
        this.#configManager = new ConfigManager(config); // 設定管理を初期化
        const currentConfig = this.#configManager.loadConfig();
        this.#spamFilter = new SpamFilter(currentConfig); // スパムフィルタを初期化
        this.#formFiller = new FormFiller(currentConfig); // フォーム自動入力を初期化

        // ルートを動的に登録
        this.#registerRoute('novels', '/bbs/sst/sst.php', {
            list: this.#initNovelListPage.bind(this),
            search: this.#initNovelListPage.bind(this),
            dump: this.#initDumpPage.bind(this),
            all_msg: this.#initDumpPage.bind(this),
            impression: this.#initImpressionPage.bind(this)
        });
        this.#registerRoute('search', '/bbs/sss/sss.php', { '*': this.#initSearchPage.bind(this) });
        this.#registerRoute('mainbb', '/bbs/mainbbs/mainbbs.php', { '*': this.#initSearchPage.bind(this) });

        // 設定変更のリスナーをセットアップ
        this.#setupConfigListener();
    }

    // DOM更新をバッチ処理
    #batchDOMUpdates(updates) {
        requestAnimationFrame(() => {
            updates.forEach(update => update());
        });
    }

    // 設定変更を監視して反映
    #setupConfigListener() {
        window.addEventListener('storage', this.#handleConfigChange);
    }

    #handleConfigChange = (e) => {
        if (e.key === 'arcadia_config') {
            const newConfig = this.#configManager.loadConfig();
            this.#spamFilter.config = newConfig;
            this.#formFiller.config = newConfig;
            alert('設定が更新されました。ページをリロードして反映してください。');
        }
    };

    // ページを再初期化
    #refreshPage() {
        const params = new URLSearchParams(location.search);
        const subType = params.get('act') || '*';
        const pageType = this.#getPageType(location.pathname);
        if (pageType) this.#executeHandler(pageType, subType);
    }

    // 旧ドメインのリダイレクトを確認
    #checkRedirect() {
        if (location.hostname === 'mai-net.ath.cx') {
            const newUrl = `http://www.mai-net.net${location.pathname}${location.search}${location.hash}`;
            location.assign(newUrl);
            return true;
        }
        return false;
    }

    // ページタイプを判定
    #getPageType(pathname) {
        if (location.href.includes('file')) return 'novels';
        for (const [type, { path }] of this.#routes.entries()) {
            if (pathname === path) return type; // 完全一致を確認
        }
        return null;
    }

    #registerRoute(type, path, handlers) {
        this.#routes.set(type, { path, handlers });
    }

    // ハンドラを実行
    #executeHandler(pageType, subType) {
        try {
            const route = this.#routes.get(pageType);
            const handler = route.handlers[subType] || route.handlers['*'];
            if (!handler) return;

            const currentConfig = this.#configManager.loadConfig();
            new StyleThemeManager(currentConfig).init();
            handler(currentConfig);
        } catch (error) {
            console.error('初期化エラー:', error);
        }
    }

    // 小説一覧ページ
    #initNovelListPage(config) {
        new ListFormatter(config, 'ssList').init();              // SSリストの整形（直リンク追加、非表示処理など）
        new FavoritesManager(config).init();             // お気に入り管理機能を初期化
        new SettingsEditor(this.#configManager).init();         // 設定エディターを初期化（設定変更UI）
    }

    // 感想ページ
    #initImpressionPage(config) {
        new CommentPageFormatter(config).init();         // 感想ページの整形（ページネーション、コメント反転など）
        this.#formFiller.autoFillForms(this.#batchDOMUpdates.bind(this)); // フォームに自動入力
    }

    // 捜索/メイン掲示板
    #initSearchPage(config) {
        new SettingsEditor(this.#configManager).init();         // 設定エディターを初期化（設定変更UI）
        new ListFormatter(config, 'mainList').init();              // MAIN/捜索掲示板リストの整
        new NovelSearchBar(config).init();               // 検索バーを初期化（Arcadia、なろう、ハーメルン対応）
        new FavoritesManager(config).init();             // お気に入り管理機能を初期化
        this.#spamFilter.hideSpamPosts(this.#batchDOMUpdates.bind(this)); // スパム投稿を非表示
        this.#formFiller.autoFillForms(this.#batchDOMUpdates.bind(this)); // フォームに自動入力
    }

    // 記事閲覧ページ
    #initDumpPage(config) {
        new StyleControlBar(config).init();              // スタイルコントロールバーを初期化（動的UI）
        new ArticleGapHandler(config).init();            // 歯抜け記事のエラー対策を初期化
        new IndexPopupHandler().init();                         // 目次ポップアップ機能を初期化
    }

    init() {
        if (this.#isInitialized) return; // 多重実行を防止
        setTimeout(() => { // 0ms遅延で非同期化
            if (this.#checkRedirect()) return;

            const params = new URLSearchParams(location.search);
            const pathname = location.pathname;
            const subType = params.get('act') || '*';

            const pageType = this.#getPageType(pathname);
            if (!pageType) {
                console.log('未対応のページタイプ:', pathname);
                return;
            }

            // 検索パラメータを保存
            const currentConfig = this.#configManager.loadConfig();
            currentConfig.searchParm = params;
            this.#configManager.saveConfig(currentConfig);

            this.#executeHandler(pageType, subType);
        }, 0);
        this.#isInitialized = true;
    }

}

// 使用例
const boardManager = new BoardManager(CONFIG);
boardManager.init();
