# ブラウザ回帰テスト

`browser-runner.html` は、`fixtures/` の合成HTMLへ現行Userscriptを注入して確認する、依存パッケージ不要のテストランナーです。

## 実行方法

1. このリポジトリをApacheなどのHTTPサーバーから配信する。
2. ブラウザで `tests/browser-runner.html` を開く。
3. 「全テスト実行」を押す。
4. すべての行が `OK` になったことを確認する。

`file://` から直接開くと、ブラウザの制限によりUserscript本体を読み込めません。

## 安全性

- 実サイトへ通信しません。
- 作品名、本文、投稿者、IDはすべて合成値です。
- テスト中は同一オリジンのlocalStorageへ検証用設定を一時保存します。
- 実行前の対象キーは退避し、終了時に復元します。
- npm、build、ESModulesは使用しません。
