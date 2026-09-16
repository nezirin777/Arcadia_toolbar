# 公開用・合成HTMLフィクスチャ

このディレクトリのHTMLは、ArcadiaツールバーのDOM互換性確認に使うための合成データです。
登場する作品名、投稿者名、本文、感想、ID、日時はすべて架空であり、保存ページから転載していません。

生の保存HTMLは、特定利用者の作品本文や投稿情報を含むため `参考HTML/` に置き、`.gitignore` によりGit管理から除外します。

## 対応表

| フィクスチャ | 再現する画面 |
| --- | --- |
| `ss-list.html` | SS投稿掲示板の一覧 |
| `ss-list-18.html` | 18禁SS掲示板の一覧 |
| `ss-list-chiraura.html` | チラシの裏の一覧 |
| `ss-article-first.html` | SS単話表示・第1話 |
| `ss-article-middle.html` | SS単話表示・中間話 |
| `ss-article-last.html` | SS単話表示・最終話 |
| `ss-article-formatting.html` | SS本文の体裁整形5機能 |
| `ss-article-all.html` | SS全話表示 |
| `impression.html` | 感想ページ |
| `main-list.html` | メイン掲示板の一覧 |
| `main-article.html` | メイン掲示板の記事 |
| `search-list.html` | 捜索掲示板の一覧 |
| `search-article.html` | 捜索掲示板の記事 |

## 残している互換境界

- 掲示板ごとのtable位置と `id="table"`、`bga`、`bgb`、`bgc`、`brdr` class
- `sst.php` / `main.php` / `search.php` のURLと `act`、`cate`、`all`、`n` パラメータ
- 単話の前話・次話リンクと本文の `blockquote`
- 感想一覧の入れ子table、`hr`、編集・削除・投稿フォーム
- 掲示板記事の返信フォーム

これらは開発時の検証資料であり、配布用Userscriptへ結合するソースではありません。
