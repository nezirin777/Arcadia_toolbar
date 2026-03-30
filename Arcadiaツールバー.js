// ==UserScript==
// @name           ArcadiaToolBar
// @namespace      ArcadiaToolBar
// @description    小説の体裁を操作できるバーがＰＯＰしてくれます。(Arcadia専用)
// @include        http://www.mai-net.net/bbs/*
// @include        http://mai-net.ath.cx/bbs/*

// @version        2.63

// ==/UserScript==
/*


*/
(function () {
	// ―――――――――　各機能のユーザーカスタマイズ　―――――――――
	// 各機能のon/off設定―――――――――

	// 小説や各記事閲覧時―
	var flg_bar    = 'on'		// 体裁変更バーを埋め込む              onで動作、offで機能停止
	var flg_ind    = 'on';		// 目次を固定位置に埋め込み            onで動作、offで機能停止
	var flg_nex    = 'on';		// 歯抜け記事のエラー画面を回避        onで動作、offで機能停止
	var flg_rmj    = 'on';		// メイン板の荒らし記事を不可視化      onで動作、offで機能停止

	var flg_rub    = 'off';		// Firefoxでもルビ振りが可能に         onで動作、offで機能停止
	var flg_ru2    = '125%';	//   ↑ルビの縦位置調整                フォントの種類に依存


	// SSリスト一覧画面――
	var flg_all    = 'on';		// 全話・感想板への直リン埋め込み      onで動作、offで機能停止  on推奨、広告不可視とか使えなくなる
	var flg_kij    = 'off';		// 業者広告・短編SSを不可視にする      onで動作、offで機能停止
	var flg_xxx    = '1';		//   ↑と連動                          3だと３話以下は不可視化
	var flg_hih    = 'off';		// 行の高さや文字色を適当に修正        onで動作、offで機能停止

	var flg_ppv    = 'off';		// ＰＶ÷記事数で表示する              onで動作、offで機能停止
	var flg_dpv    = 'off';		// ＰＶ÷記事数が低いSSを不可視        onで動作、offで機能停止
	var flg_bpv    = '500';		//   ↑と連動                          100だと100以下は不可視
	var flg_own    = 'on';		// 製作者の個人的なリンク最適化        onで動作、offで機能停止  下の■■でさらに個別にon/off設定が可能

	var flg_mouseover = "off";

	// 感想掲示板の閲覧時―
	var flg_lin    = 'on';		// ページリンクリストの埋め込み        onで動作、offで機能停止
	var flg_u_d    = 'on';		// レス順を降順↑から昇順↓に変更      onで動作、offで機能停止  ＮＧワードあぼーん機能付属
	var flg_day    = 'on';		// 日付を日本語仕様に直す              onで動作、offで機能停止
	var flg_fon    = 'off';		// 行の高さや文字色を適当に修正        onで動作、offで機能停止


	// 捜索掲示板の閲覧時―
	var flg_src    = 'on';		// 捜索板に検索バーを埋め込む          onで動作、offで機能停止
	var flg_seb    = 'none';	// 検索フォームバーの初期表示          blockで最初から表示、noneで非表示


	// 各掲示板へ書き込み―
	var flg_wit    = 'off';       // 入力履歴を使わずパスを自動入力    onで動作、offで機能停止
	var wit_nam    = 'ねじりん';          // 　自分の名前
	var wit_tri    = 'eclipse';          // 　トリップ
	var wit_pas    = '5550';          // 　パスワード

	// 小説部分のデフォルトのスタイル―――
	var defwidth     = '90%';        // テーブルの幅  サイト指定の基本値は90%
	var defheight    = '150%';        // 行の高さ      サイト指定の基本値は150%
	var defsize      = '100%';        // 文字サイズ    サイト指定の基本値は80%      設定すると、文字数が極端に多い場合に重くなる
	var deffamily    = '';        	// 文字の種類    サイト指定の基本値はなし     設定すると、文字数が極端に多い場合に重くなる
	var defcolor     = '#000000';        // 文字の色      サイト指定の基本値は#666666
	var defbgcolor   = '#FFF7D4';        // テーブルの色  サイト指定の基本値は#FFF7D4

	// 小説読み込み時の自動実行――――――
	var aut_kuu    = 'on';			// 連続空行の圧縮             onで自動実行、offで実行しない
	var aut_ind    = 'off';			// 行頭を１字字下げ           onで自動実行、offで実行しない
	var aut_kai    = 'off';			// 段落途中改行の禁止         onで自動実行、offで実行しない
	var aut_gen    = 'off';			// 原稿作法準拠に色々変換     onで自動実行、offで実行しない
	var aut_rub    = 'off';			// ルビを青空文庫形式に変換   onで自動実行、offで実行しない
	var aut_jib    = 'on';			// 地文と会話文の間に空行挿入 onで自動実行、offで実行しない
	var aut_fon    = 'off';			// フォントの強制解除         onで自動実行、offで実行しない
	var aut_wbr    = 'on';			// テーブル横幅破壊を回避     onで自動実行、offで実行しない


	// 記事一覧でお気に入り登録（濃赤）――
	var okini    =     'ここにお気に作品名・作者名をコピペ';
		okini 	+= '|'+'Muv-Luv Unlimited　～終焉の銀河から～';  //山崎ヨシマサ
		okini 	+= '|'+'ちょっとだけ、やさぐれフェイトさん';  //熊雑草 チラ 完結
		okini 	+= '|'+'嵐を呼ぶ園児、外史へ立つ';  //ＭＲＺ
		okini 	+= '|'+'紐糸日記'; //しこたま
		okini 	+= '|'+'Muv－Luv　Interfering';  //光樹	エタ？
		okini 	+= '|'+'真・恋姫†夢想　とんでも外史';  //ジャミゴンズ	エタ？
		okini 	+= '|'+'天使を憐れむ歌';  //エンキドゥ
		okini 	+= '|'+'魔法少女リリカルなのは 心の渇いた吸血鬼';  //デモア
		okini 	+= '|'+'リリカルなのはSts異伝';  //やみなべ 完結
		okini 	+= '|'+'魔法先生フェイま';  //kuboっち チラ
		okini 	+= '|'+'Liberating Night'; //G３10４@the rookie writer  Fateセイバー→ソルジャー	エタ
		okini 	+= '|'+'もう一度ナデシコへ';  //メランド	エタ
		okini 	+= '|'+'マブラヴ　～限りなき旅路～';  //いい気分！	エタ
		okini 	+= '|'+'怠惰な操り少女';  //ＫＹＯ 完結 HPあり
		okini 	+= '|'+'真・恋姫†無双～愛雛恋華伝～'; //槇村
		okini 	+= '|'+'こんなレオはどうだろう';  //酒好き27号 チラ	エタ
		okini 	+= '|'+'超銀河英雄大戦'; //行 マブラヴXスパロボとか 完結
		okini 	+= '|'+'終末の時より（ゼロの使い魔×ラグナロクオンライン）';  //Alcruts	エタ
		okini 	+= '|'+'七ツ夜と魔法';  //モンテスＱ	完結
		okini 	+= '|'+'史上最凶の殺人鬼'; //えそら エタ
		okini 	+= '|'+'フェイトちゃんがんばる';  //むだーい エタ
		okini 	+= '|'+'マブラヴＡＬＴＥＲＮＡＴＩＶＥ　修羅';  //ヤルダバ	完結
		okini 	+= '|'+'【完結】ユーノくんの受難';  //空の狐
		okini 	+= '|'+'ドラゴンボールとネギまクロスもの';  //kuro	エタ
		okini 	+= '|'+'マブラヴ　ヴァーサス';  //ひげ面 アカガネIn	エタ
		okini 	+= '|'+'魔導師・長谷川千雨';  //GSZ 完結
		okini 	+= '|'+'IF GOD';  //鈴木チェロ  ヒカルの碁	完結
		okini 	+= '|'+'Ratio in Lyrical　（×ガオガイガー）';  //	ゆめうつつ エタ
		okini 	+= '|'+'Nobilie Caedes'; //(月姫+ネギま)  //778 エタ
		okini 	+= '|'+'仮面ライダーカリス（ネギま×仮面ライダー剣）';  //ＷＥＥＤ
		okini 	+= '|'+'処女はお姉さまを愛している';  //uppers	チラ	エタ?
		okini 	+= '|'+'月君　月の姫、空の世界、そして花咲く人は君【月姫×CCさくら】';    //23  完結
		okini 	+= '|'+'殺人貴と魔法少女達';  //タツノオトシゴ エタ
		okini 	+= '|'+'どっかの世界の……フェイトさん？';  //くえる  エタ';
		okini 	+= '|'+'～Green Blood ～';  //(なのは×仮面ライダー剣)  //春  完結
		okini 	+= '|'+'Muv-Luv ALTERNATIVE ～復讐の守護者～　';  //舞天死  完結
		okini 	+= '|'+'ゼロの征服王';  //ゼロの使い魔×Fate/Zero  //ルキ  完結
		okini 	+= '|'+'DIS - ALTERNATIVE';  //第3次スパロボα　クロス  //突撃兵159 エタ
		okini 	+= '|'+'Fate/the transmigration of the soul';  //セイバー未来に転生  //ルクセンーブルグ  完結
		okini 	+= '|'+'マブラヴオルタネイティヴ（偽）';  //USO800  完結
		okini 	+= '|'+'夜神粧裕の場合 【デスノート二次】';	//久能宗治	完結
		okini 	+= '|'+'【習作】Alternative　その答えは';	//ゲイヴン	チラ	エタ
		okini 	+= '|'+'Servant of Moonlight　'; //[月姫×ゼロの使い魔] youll エタ
		okini 	+= '|'+'千雨の夢'; //メル
		okini 	+= '|'+'高町なのはの受難';  //ＫＹＯ チラ 完結 HPあり
		okini 	+= '|'+'東方永醒剣～Imperishable Brave.'; //紅蓮丸
		okini 	+= '|'+'リリカルマジック';  //GDI とらハのなのはと入れ替わり	完結
		okini 	+= '|'+'過去と未来を繋ぐ者たち';   //イチジク
		okini 	+= '|'+'【習作】麻帆良在住、葛木メディアでございますっ！';	//夏色 / 冬霞
		okini 	+= '|'+'GANTZからの使い魔～いってくだちい～（ゼロ魔×GANTZ）'; //アンドレ
		okini 	+= '|'+'雪風と風の旅人';		//サイ・ナミカタ
		okini 	+= '|'+'Ｍｕｖ－Ｌｕｖ×ＡＣシリーズ　人類の未来と世界を守るために';	//きりたんぽ	チラ
		okini 	+= '|'+'あんこたっぷり千雨ちゃん';		//ちゃくらさん チラ	エタ
		okini   += '|'+'マブラヴ オルタジェネレーション';		//ジェネ
		okini   += '|'+'とある未元の神の左手';		//しろこんぶ チラ
		okini   += '|'+'プリズマミヤコ\\(TYPE-MOON二次\\)';		//夕	チラ
		okini   += '|'+'【SOS】毎日変な夢をみる件について【誰か助けて】';	//マブラヴ	矢柄
		okini   += '|'+'夜の鈴を';		//魔法使いの夜		中村成志
		okini   += '|'+'Muv-Luv dark night Fes';		//マブラヴ		シギ
		okini   += '|'+'【完結】Fate stay Magica（Fate×まどか☆マギカ';
		okini   += '|'+'【習作】麻帆良に現れた聖杯の少女の物語（旧題・七騎士を纏う者';
		okini   += '|'+'マブラヴで無双する（マブラヴ・オリ主・最強）'; 		//完結  くわ  チラ
		okini   += '|'+'とある幻想の弾幕遊戯';
		okini   += '|'+'定食屋「あまつか」（エヴァ＆ナデシコ）';		//チラ	エタ
		okini   += '|'+'チラ裏　巣ドラ短編\\(ｵﾘｷｬﾗ有り？\\)15禁';		//チラ
		okini   += '|'+'\\[ネタ\\]　八神さんちのメタルスライム（リリカル×ＤＱ）';		//チラ	エタ
		okini   += '|'+'【短編】 パルフェ妄想文（パルフェ　〜ショコラ second brew〜）';		//チラ
		okini   += '|'+'\\[完結]\\[習作]恭也参戦（リリカルなのは 一部設定とらハ）';		//チラ
		okini   += '|'+'高町なのはの幼馴染（全裸）';
		okini   += '|'+'【習作】プリズマミヤコ(TYPE-MOON、プリズマイリヤ二次)';		//チラ
		okini   += '|'+'マブラヴ＋ＳＲＷ　α　アフター';
		okini   += '|'+'【習作】麻帆良に現れた聖杯の少女の物語（ネギま！・ラブひな×Fate）';	//チラ
		okini   += '|'+'魔法先生ネギま！351.5時間目的な逆行物の導入だけを書いてみた';
		okini   += '|'+'燕は乙女を求めるか';
		okini   += '|'+'Muv-Luv×ACシリーズ　人類の未来と世界を守るために';
		okini   += '|'+'召喚　カレイドルビー';
		okini   += '|'+'replay（STEINS;GATE（シュタインズゲート\\)長編SS\\）';
		okini   += '|'+'魔女の娘達';
		okini   += '|'+'【完結】真・恋姫†無双ＳＳ～馬超伝～';
		okini   += '|'+'ライブラは風に乗って';
		okini   += '|'+'わたしのかんがえたかっこいいるいずさま';
		okini   += '|'+'マブラヴ～青空を愛した男～';
		okini   += '|'+'千雨が狼に犯されながら狼になった後、狼をぶち殺す話。';
		okini   += '|'+'			';
		okini   += '|'+'			';

	// 記事一覧で準お気に入り登録（薄赤）―
	var jiten    =     'ここに準お気に作品名作者名をコピペ';
		jiten 	+= '|'+'異界の扉は⇒一方通行　『ゼロ魔×禁書』';  //もぐきゃん	エタ
		jiten 	+= '|'+'とある家電と魔法少女　（なのは×禁書目録）';  //冷蔵庫	エタ
		jiten 	+= '|'+'タケルちゃんの逆襲';  //ごじゃっぺ	エタ
		jiten 	+= '|'+'［習作］夜天通行（リリカル×禁書）';  //ベクトル	チラ	エタ
		jiten 	+= '|'+'あたしの兄貴がこんなにモテるわけがない';  //石・丸
		jiten 	+= '|'+'チート救援部隊への就職';  //風鳴刹影	チラ	エタ
		jiten 	+= '|'+'とある殺人貴-the dark six-';  //ナパーム  エタ チラ
		jiten 	+= '|'+'魔法独身リリカルなのは';  //定彼 チラ
		jiten 	+= '|'+'うちに駄フェイトが来て';  //定彼 ちら
		jiten 	+= '|'+'リリカルホロウＡ’s';  //福岡	エタ
		jiten 	+= '|'+'新ゲッターAlternative';  //mitsuki	エタ
		jiten 	+= '|'+'あいとゆうきと、ふしぎなめいじ。';  //マブラヴ×ゼロの使い魔  //茶太郎 エタ チラ
		jiten 	+= '|'+'第９７管理外世界は恐ろしい所一度はおいで';  //いそはち チラ エタ
		jiten 	+= '|'+'貴方は私でお前は俺で';  //マゼラヴッ！  //いぶりす	削除？
		jiten 	+= '|'+'Layが使い魔（エヴァンゲリオン×ゼロの使い魔）';	//リプ	エタ
		jiten 	+= '|'+'ドラえもん　のび太の聖杯戦争奮闘記';  //青空の木陰
		jiten 	+= '|'+'蟠桃の木の精霊';  //気のせい	ネギま	エタ
		jiten 	+= '|'+'究極（リリカル）！！変態仮面';  //str	エタ
		jiten 	+= '|'+'ヤムチャ　in　Ｈ×Ｈ';  //アズマ	完結
		jiten 	+= '|'+'ヒナタを本気で幸せにするシナリオ';  //林檎  エタ
		jiten 	+= '|'+'はぐりんの大冒険？';  //オタオタ  エタ
		jiten 	+= '|'+'オルタ道場（Muv-Luvギャグ）';  //春夜  本編完結
		jiten 	+= '|'+'魔法少女リリカルなのは　SRWOGｓｔｓ';  //ロン  エタ
		jiten 	+= '|'+'正義の吸血鬼（ネギま×型月）';  //宵月  エタ
		jiten 	+= '|'+'リリカルにゃのは';  //黒猫エリカ
		jiten 	+= '|'+'～魔術師と死神～';  //エドワード チラ エタ
		jiten 	+= '|'+'ちーとはじめました';  //ちーたー
		jiten 	+= '|'+'『狂気の科学者とその仲間達奮闘記　旅情編』';  //Ａ．Ｋ  エタ
		jiten 	+= '|'+'管理世界に武術の達人を放りこんでみた';  //柿の種  エタ
		jiten 	+= '|'+'国取りドラゴン';  //PUL  エタ
		jiten 	+= '|'+'Muv-Luv ALTERNATIVE ORIGINAL GENERATION';  //アルト  エタ
		jiten 	+= '|'+'【完結】Sweet songs and Desperate fights《史上最強の弟子ケンイチ';  //	やみなべ
		jiten 	+= '|'+'選択と蒼天';  //（マブラヴオルタ＋ナデシコ）  //seccd	エタ
		jiten 	+= '|'+'手のひらサイズなマテリアルミニ';  //細川  エタ
		jiten 	+= '|'+'Muv-Luv AL Eternal Flame';  //夢のカケラ  エタ
		jiten 	+= '|'+'迷宮恋姫';  //えいぼん  完結
		jiten 	+= '|'+'魔法少女リリカルなのは　with自由気ままな黒猫';  //ショージ  エタ
		jiten 	+= '|'+'魔法少女リリカルなのは　GOLD KING （Fate×なのは）';  //ランスカンダル  エタ
		jiten 	+= '|'+'after world';  //Muv-Luv　[another&after world]  //小清水  完結
		jiten 	+= '|'+'君が主で忍が俺で（NARUTO×君が主で執事が俺で';  //掃除当番  エタ
		jiten 	+= '|'+'Muv-Luv Alternative Rebirth';  //駆動式  エタ
		jiten 	+= '|'+'リリカルギア【完結】（StS×メタルギアソリッド）';  //にぼ
		jiten 	+= '|'+'桜通りの殺人鬼（ネギま×メルブラＡＡ）';  //猫トースト  エタ
		jiten 	+= '|'+'マブラヴ ～新たなる旅人～ 夜の果て';  //ドリアンマン
		jiten 	+= '|'+'日本武尊';  //カーノン  エタ
		jiten 	+= '|'+'のための補完';  //dragonfly  完結
		jiten 	+= '|'+'麻帆良に落ちた敗北者';  //ばきお //異世界の龍がネギまに  エタ
		jiten 	+= '|'+'つよきす　再構成';  //応援団長  エタ
		jiten 	+= '|'+'Overs System -誰がための英雄-';  //マブラヴ  //shibamura  エタ
		jiten 	+= '|'+'MUV_LUV　おれのりんね';  //捻木  エタ
		jiten 	+= '|'+'ドラゴンクエスト５　宿命の聖母';  //航海長  完結
		jiten 	+= '|'+'新世紀エヴァンゲリオンFINAL　～勇気と共に～';  //SIN  エタ
		jiten 	+= '|'+'とーたる・オルタネイティヴ';  //よんごーごー  エタ
		jiten 	+= '|'+'Zero and heroic king';  //ゼロの使い魔×Ｆａｔe  //river  エタ
		jiten 	+= '|'+'Muv-Luv　勇気の証明定理';  //ワイズマン  エタ
		jiten 	+= '|'+'Muv-Luv Alternative　夢の続き';  //ブロンド生茶  エタ
		jiten 	+= '|'+'Muv-Luv　Idea that';   //Idea that doesn't intersect  //ぷり  完結
		jiten 	+= '|'+'黒と赤の主従';  //銀  黒セイバー+アチャ(ギルが弟)
		jiten 	+= '|'+'真剣で悟空と闘いなさい';	//柿の種
		jiten 	+= '|'+'ドラゴンクエストⅤ －刻を越えて－'; //恭	チラ	エタ
		jiten 	+= '|'+'千雨をチルノにしてみた'; //川岸新兎 チラ	エタ
		jiten 	+= '|'+'ヒカルの碁～新棋聖降臨～';		//A.T.	チラ	削除？
		jiten 	+= '|'+'これはひどいオルタネイティヴ';		//Ｓｈｉｎｊｉ
		jiten 	+= '|'+'多分ﾏﾌﾞﾗｳﾞ';		//神無
		jiten 	+= '|'+'マブラヴオルタネイティヴ『掴み取る未来』';		//ファントム
		jiten   += '|'+'Muv-Luv dark night Fas';		//シギ
		jiten   += '|'+'エヴァちゃん短編集【ネギま】';		//シーロ	チラ
		jiten   += '|'+'消えそうな命、2つ【DB×ゼロ魔】';		//ローシ チラ
		jiten   += '|'+'ネギ天　（天上天下→ネギま！）';		//小山の少将 チラ	エタ
		jiten   += '|'+'真・残骸†無双';		//ぽむぽむ地蔵 チラ	エタ
		jiten   += '|'+'魔法先生カズま！ （ネギま×スクライド）';	//仙水獏 チラ	エタ
		jiten   += '|'+'使い魔ドラゴン　（現実→巣作りドラゴン×ゼロの使い魔）';	//ブラストマイア チラ	エタ
		jiten   += '|'+'題名未定（ｓｒｗα３→エヴァ）多分ネタ。';		//凰雅 チラ	エタ
		jiten   += '|'+'DQ5ハーレム伝説';	//KIN チラ	エタ
		jiten   += '|'+'Fortitude（ネギま！×スクライド）';		//ぽんちょ チラ	エタ
		jiten   += '|'+'長谷川千雨の約束（ネギま！　千雨主人公）';	//una チラ	エタ
		jiten   += '|'+'【一発ネタ】ＴＡＳ娘さんがＢＥＴＡと戦うようです【マブラヴ】';	//Shinji チラ	エタ
		jiten   += '|'+'【短編】【一発ネタ】舞台の真ん中へ（ゼロ魔×ネギま！）';		//チラ
		jiten   += '|'+'リリカルなのはRPG（魔法少女リリカルなのは→スーパーマリオRPG/あくまでネタ）';		//チラ
		jiten   += '|'+'フェネクスの冒険記　【オリ主】【ネタ＋気分】【Muv-Luv マブラヴ】';		//チラ
		jiten   += '|'+'【完結】第四次聖杯戦争が十年ずれ込んだら 8/3 完結';
		jiten   += '|'+'定彼';
		jiten   += '|'+'【一発ネタ】メフィラスの食卓【マブラヴ】';		//チラ
		jiten   += '|'+'【ネタ】　一方通行のレベルを5.5ぐらいにしてみた。';		//チラ
		jiten   += '|'+'【一発ネタ】ルイズさんがチートな使い魔を召喚したらさらにチートになりました';
		jiten   += '|'+'【ネタ】美醜逆転戦記りりかるオリ主';		//チラ
		jiten   += '|'+'【ネタ】ルイズがチ○コを召喚しました';		//チラ
		jiten   += '|'+'			';
		jiten   += '|'+'			';
		jiten   += '|'+'			';

	// 一応みてる―――――記事一覧で下記題名のものを強調表示（薄赤）
	var itiou	 =     'ここに一応見てる作品名をコピペ';
		itiou 	+= '|'+'マブラヴ　オルタネイティヴ　ＭＡＤ　ＬＯＯＰ';  //緋城
		itiou 	+= '|'+'不死の子猫に祝福を（エヴァ主人公・本編再構成）';  //ランブル
		itiou 	+= '|'+'『一刃の風』';  //オルタ分岐→冥夜ルート  //折口　氷	エタ
		itiou 	+= '|'+'Ｂｅｙｏｎｄ　ｔｈｅ　ｆａｔｅ';  //KIE	エタ
		itiou 	+= '|'+'カラカラメグル';  //空の狐 なのは
		itiou 	+= '|'+'立派な魔法使いと真なる魔法使い';  //くに	エタ
		itiou 	+= '|'+'みんなで、ゼーレを倒そう！';  //ふたば草明	エタ
		itiou 	+= '|'+'中身がおっさんな武';  //つぇ	エタ
		itiou   += '|'+'			';
		itiou   += '|'+'			';
		itiou   += '|'+'			';
		itiou   += '|'+'			';
		itiou   += '|'+'			';
		itiou   += '|'+'			';
		itiou   += '|'+'			';

	// 記事一覧画面で作品を不可視化――――
	var dasaku   =     'ここにＮＧな作品名・作者名をコピペ';
		dasaku 	+= '|'+'AAA品物の専門の商店';
		dasaku 	+= '|'+'d5840ce4';
		dasaku 	+= '|'+'98jp.';
		dasaku 	+= '|'+'パートナーを見つけませんか';
		dasaku 	+= '|'+'Ｐ．Ｃ．Ｓ‐nds‐';
		dasaku 	+= '|'+'うんこ';
		dasaku 	+= '|'+'クリっと栗';
		dasaku 	+= '|'+'佐賀県のヤリ';
		dasaku 	+= '|'+'スカトロ沖地震';
		dasaku 	+= '|'+'ＳＭパートナーをみつけませんか？';
		dasaku 	+= '|'+'マジコン';
		dasaku 	+= '|'+'山本 慧子';
		dasaku 	+= '|'+'ACE3DS';
		dasaku  += '|'+'現金化相談';
		dasaku  += '|'+'			';


	// 感想板のＮＧワード（あぼーん）―――
	var NG       =     'ここにＮＧネーム・ワードをコピペ';
		NG      += '|'+'			';
		NG      += '|'+'			';
		NG      += '|'+'			';


	// ↑作品・文字列登録の記入例――――― ★★★★半角記号のコピペは危険。ただし記号の直前に「\\」を入れれば普通に認識★★★★
	//  okini   += '|'+'無限の縫製';		// 記入例 「無限の縫製」という文字列を含む場合、作品テーブルの背景を赤く強調。
	//  okini   += '|'+'123456'+'&amp;n=0&';// 記入例 記事No.123456の作品テーブルの背景を赤く強調。
	//  dasaku  += '|'+'駄文\\(？\\)です';	// 記入例 「駄文(？)です」という文字列を含む場合、その作品を自動で不可視にする。半角記号注意。


	// ――――――　各機能のユーザーカスタマイズ（ここまで）　――――――


	// ―――――――――――　アドレスによる分岐　――――――――――――

	// 旧アドレス（mai-net.ath.cx）回避――
	if (location.hostname == "mai-net.ath.cx") { location.assign("http://www.mai-net.net/" + location.href.slice(22)); }


	// 各種分岐――――――――――――――
	var flg_sam='off';
	var local = location.href;
	var losch = location.search;
	var ulsub = losch.substring(5,8);
	if      (location.pathname=='/bbs/sst/sst.php')        { var ulnam ='novels'; }
	else if (local.match(/file/))                          { var ulnam ='novels'; }
	else if (location.pathname=='/bbs/sss/sss.php')        { var ulnam ='search'; }
	else if (location.pathname=='/bbs/mainbbs/mainbbs.php'){ var ulnam ='mainbb'; }
	else if (local.match(/javascript\/Arsample3\.htm/))    { var ulnam ='novels'; var ulsub = 'dum'; var flg_sam='on'; losch='act=all_msg&cate=all&all=99999';}
	else if (local.match(/javascript\/Arsample1\.htm/))    { var ulnam ='novels'; var ulsub = 'lis'; var flg_sam='on'; losch='act=list&cate=all&page=1';}
	else                                                   { var ulnam ='others'; var ulsub = 'oth'; losch='act=list&cate=all&page=1';}



	// ――――――――――　サンプル用の設定書き換え　――――――――――
	if (flg_sam == 'on') {
		var flg_own    = 'on';		// 製作者の個人的なリンク最適化   onで動作、offで機能停止
		var flg_xxx    = '3';		// 　↑と連動                 3だと３話以下は不可視化
		var flg_ppv    = 'on';		// ＰＶ÷記事数で表示する         onで動作、offで機能停止
		var aut_wbr    = 'on';		// テーブル横幅破壊を回避     onで自動実行、offで実行しない
			jiten   += '|'+'リリカルなのは';
			jiten   += '|'+'咲-Saki-';
	}

	// ――――――――　お気に入り＋ＮＧ登録の誤作動防止　――――――――
	okini   += '|'+'終端☆☆作品終端';
	jiten   += '|'+'終端☆☆作品終端';
	itiou   += '|'+'終端☆☆作品終端';
	dasaku  += '|'+'終端ＮＧ作品終端';
	NG      += '|'+'終端ＮＧ感想終端';
	okini  =  okini.replace(/([　 \s]*\|[　 \s]*){2,}/img,'|');
	jiten  =  jiten.replace(/([　 \s]*\|[　 \s]*){2,}/img,'|');
	itiou  =  itiou.replace(/([　 \s]*\|[　 \s]*){2,}/img,'|');
	dasaku = dasaku.replace(/([　 \s]*\|[　 \s]*){2,}/img,'|');
	NG     =     NG.replace(/([　 \s]*\|[　 \s]*){2,}/img,'|');


	// ―――――――――　自動で名前・パスワード入力　――――――――――
	if (flg_wit=='on'){
		var kkinput = document.getElementsByTagName('input');
		for (var i=0;i<kkinput.length;i++){
			if ((kkinput[i].name == 'name')||(kkinput[i].name == 'iname')) {
				kkinput[i].defaultValue = wit_nam;
			} else if ((kkinput[i].name == 'trip')||(kkinput[i].name == 'itrip')) {
				kkinput[i].defaultValue = wit_tri;
			} else if ((kkinput[i].name == 'password')||(kkinput[i].name == 'ipass')) {
				kkinput[i].defaultValue = wit_pas;
			}
		}
	}


	// ―――――――――　メイン板の荒らし？の不可視化　―――――――――
	if ((ulnam == 'mainbb')&&(ulsub == 'dum')&&(flg_rmj=='on')) {
		var gyousya_table = document.getElementsByTagName('table');
		for (var i=4;i<gyousya_table.length;i++){
			var gyousya_td = gyousya_table[i].getElementsByTagName('td');
				if ((gyousya_td[0].innerHTML.match(/>[A-Za-z]{10,}</))&&(gyousya_td[0].className == 'bgb')) { gyousya_table[i].style.display = 'none' ;}
		}
		var gyousya_a = document.getElementById('table').getElementsByTagName('a');
		for (var i=0;i<gyousya_a.length;i++){
			if (gyousya_a[i].innerHTML.match(/[A-Za-z]{10,}/)) { gyousya_a[i].style.display = 'none' ;}
		}
	} //if ((ulnam == 'mainbb')&&(ulsub = 'dum')) {


	// ――――――――――　記事一覧画面での自動整形　――――――――――
	if ((ulnam=='novels') && ( (ulsub=='lis') || (ulsub=='sea'))) {//sea=検索画面
		if(ulsub=='lis'){
			var SStable = document.getElementsByTagName('table');
			var SStr = document.getElementsByTagName('tr');

			var x=2;
			if(local.match(/cate=18/)){x = 1;}

			var td1 = '<td style="vertical-align:top;"><table id="ssmenu" cellspacing="0" cellpadding="3" class="brdr"><tbody><tr class="bga"><td style="border-bottom: 1px solid #aaaacc; border-top: 1px solid #aaaacc;">'+ SStr[x].firstElementChild.innerHTML + '</td></tr><tr class="bgc"><td class="ssmenu_link">'+ SStr[x+1].firstElementChild.innerHTML + '</table></td>' ;

			SStr[x].firstElementChild.remove();
			SStr[x+1].firstElementChild.remove();

			var table2 = '<table id="new_sstable" cellspacing="0"><tbody><tr>' + td1 + '<td id="table" width="100%"><table width="100%" cellpadding="3" cellspacing="1" class="brdr">' + SStable[x].innerHTML +'</table></td></tr></tbody></table>' ;

			SStable[x].remove();
			SStable[x-1].insertAdjacentHTML('afterend', table2);
		}

		if(document.getElementById("table") != null){
			var SStr = document.getElementById("table").getElementsByTagName('tr');
		} else {
			var SStr = document.getElementsByTagName("table")[2].getElementsByTagName('tr');
		}

		for (var i=0;i<SStr.length;i++){
			var SStr_i = SStr[i];
			// リストにてお気に入りマークをつける―
			// 行間とか適当修正――
			if (flg_hih == 'on'){  SStr_i.style.lineHeight = 1.5 ; SStr_i.style.fontFamily = deffamily; SStr_i.style.color = "#333"; }

			// お気に入り―――――
			//if (SStr_i.innerHTML.match(okini)) { SStr_i.style.backgroundColor = "#FFb490"; }
			if (SStr_i.innerHTML.match(okini)) { SStr_i.style.setProperty('background-color', '#491233', 'important');}


			// 準お気に入り――――
			//if (SStr_i.innerHTML.match(jiten)) { SStr_i.style.backgroundColor = "#FFd9b6"; }
			if (SStr_i.innerHTML.match(jiten)) { SStr_i.style.setProperty('background-color', '#493759', 'important');}

			// ――――――――一応見てる―――――――――
			//if (SStr_i.innerHTML.match(itiou)) { SStr_i.style.backgroundColor = "#ffefc0"; }
			if (SStr_i.innerHTML.match(itiou)) { SStr_i.style.setProperty('background-color', '#494D63', 'important');}

			// ＮＧ作品――――――
			if (SStr_i.innerHTML.match(dasaku)) { if (3<i) { SStr_i.style.display = "none"; } }

			// 全話・感想板の直リン――――――――
			if((SStr_i.className=='bgc')&&(flg_all=='on')){
				// 各小説の記事リスト――
				if (! local.match(/cate=tiraura/)) {
					// 要素の取得と整理―――――
					var linka = SStr_i.innerHTML.split(/&amp;all=|&amp;n=0&amp;count=1">/);
					var linkq = SStr_i.getElementsByTagName('b').length - 3;
					var linkk = SStr_i.getElementsByTagName('b').length - 2;
					var linkp = SStr_i.getElementsByTagName('b').length - 1;
					var SSb = SStr_i.getElementsByTagName('b')[linkq];
					var SSk = SStr_i.getElementsByTagName('b')[linkk];
					var SSp = SStr_i.getElementsByTagName('b')[linkp];
					var xx1 = new Number(SSb.innerHTML.replace(/<\/?[^>]+>/gi, ''));
					//var yy1 = new Number(SSk.innerHTML.replace(/<\/?[^>]+>/gi, ''));
					var zz1 = Math.floor (new Number(SSp.innerHTML.replace(/<\/?[^>]+>/gi, ''))/ xx1);
					// 一定以下の話数を不可視――
					if ((xx1-1<flg_xxx)&&(i>3)&&(flg_kij=='on')) {SStr_i.style.display = "none";}
					// 全件一括表示の直リン―――
					SSb.innerHTML= '<a href="/bbs/sst/sst.php?act=all_msg&cate=all&all=' + linka[1] + '" TARGET="_blank">' + SSb.innerHTML + '</a>';
					// 感想掲示板への直リン―――
					SSk.innerHTML= '<a href="/bbs/sst/sst.php?act=impression&cate=all&no=' + linka[1] + '&page=1" TARGET="_blank">' + SSk.innerHTML + '</a>';
					// ＰＶを記事数で割る――――
					if (flg_ppv=='on'){SSp.innerHTML= zz1; SStr_i.getElementsByTagName('td')[SStr_i.getElementsByTagName('td').length - 2].style.textAlign = "right";}
					// 低いＰＶ／記事は不可視――
					if ((flg_dpv=='on')&&(zz1<flg_bpv)&&(i>3)){SStr_i.style.display = "none";}

				// チラシの裏記事リスト―
				//} else if ((SStr[0].innerHTML.match(/記事/))&&(document.getElementById("ssmenu").innerHTML.match(/MENU/))) {
				} else {
					// 要素の取得と整理―――――
					var linka = SStr_i.innerHTML.split(/&amp;all=|&amp;n=0&amp;count=1">/);
					var linkp = SStr_i.getElementsByTagName('b').length - 1;
					var SSp = SStr_i.getElementsByTagName('b')[linkp];
					var xx1 = new Number(SSp.innerHTML.replace(/<\/?[^>]+>/gi, ''));
					// 全件一括表示の直リン―――
					SSp.innerHTML= '<a href="/bbs/sst/sst.php?act=all_msg&cate=all&all=' + linka[1] + '" TARGET="_blank">' + SSp.innerHTML + '</a>';
					// 感想掲示板への直リン―――
					var tdimp = document.createElement('td');
						tdimp.setAttribute('align', 'center')
						tdimp.innerHTML = '<a href="/bbs/sst/sst.php?act=impression&cate=all&no=' + linka[1] + '&page=1" TARGET="_blank">？</a>';
					SStr_i.insertBefore(tdimp, SStr_i.lastChild);
				}
			} // if((document.getElementsByTagName('tr')[i].className=='bgc')&&(flg_all=='on')){

		} // for (var i=0;i<SStr.length;i++){

		if (ulsub=='lis'){
			// チラ裏感想直リン仕上―
			//if((SStr[0].innerHTML.match(/感想/) == null)&&(flg_all=='on')&&(SStr[0].innerHTML.match(/記事/))&&(document.getElementById("ssmenu").innerHTML.match(/MENU/))){
			if ( (flg_all=='on') && (local.match(/cate=tiraura/)) ) {
				var tdimp = document.createElement('td');
					tdimp.setAttribute('nowrap', '')
					tdimp.setAttribute('align', 'center')
					tdimp.innerHTML = '感想';
				SStr[0].insertBefore(tdimp, SStr[0].lastChild);
			}

			// リンクの個人的最適化――――――――  上の「製作者の個人的なリンク最適化」のonで全体が動作。行先頭に//を入れると機能をオフ。■■
			if (flg_own=='on'){
				//document.getElementsByTagName('table')[2].innerHTML=document.getElementsByTagName('table')[2].innerHTML
				document.getElementById("new_sstable").innerHTML=document.getElementById('new_sstable').innerHTML

				.replace(/act=18attention/ig,'act=list&cate=18&page=1')         // 警告ページをスルーして直接ＸＸＸ板へリンクする。
				//.replace(/テスト板/ig,'')                                       // テスト板へのリンクを削除。位置的に間違って行きやすいから。
				//.replace(/^(<b>\[ お買い物 \]：)[\s\S]*(<hr>)$/im,'')           // 左下のメッセージスクロールを削除する。
				//.replace(/&amp;count=1"/ig,'" TARGET="_blank"')                 // ＳＳを開くときは必ず新しいタブで。カウンタは回さない確認用。
				.replace(/&amp;count=1"/ig,'&amp;count=1" TARGET="_blank"')     // ＳＳを開くときは必ず新しいタブで。
				.replace(/sss.php"/ig,'sss.php?act=list&cate=all&page=1"')      // 捜索掲示板へ注意書きを挟まず、「全て」へ跳ぶ。
				.replace(/mainbbs.php"/ig,'mainbbs.php?act=list&cate=all&page=1"')      // メイン掲示板へ注意書きを挟まず、「全て」へ跳ぶ。
				//.replace(/<\/?b>/ig,'')                                         // 題名などの太文字を全て普通のフォントに戻す。
			;}

			// 不可視化解除ボタン――
			var trblock = function () {  for (var i=0;i<SStr.length;i++){ SStr[i].style.display = ""; } }
			var tableEl = document.getElementById("table");
			var spnblock = document.createElement('span');
					spnblock.setAttribute('style', 'border:solid 1px #666; position:absolute;top:-30px; right:0px; cursor:pointer; padding:2px 8px; font-size:12px;')
					spnblock.title = 'もう一度不可視にしたい場合はページの再読み込みが必要です';
					spnblock.innerHTML = '作品不可視化の解除';
			tableEl.setAttribute('style', 'position:relative ;')
			tableEl.appendChild(spnblock);
			spnblock.addEventListener("click", trblock,true);
		}

		if (flg_mouseover == "on"){
			// ＳＳリストテーブル色変更――――――
			function onMouseOver_tr(){
					for (var i = 0; i < this.getElementsByTagName('td').length; i++){
						var td = this.getElementsByTagName('td')[i];
							td.id = td.style.backgroundColor;
							td.style.backgroundColor = '#808080';
					}
			}

			function onMouseOut_tr(){
					for (var i = 0; i < this.getElementsByTagName('td').length; i++){
						var td = this.getElementsByTagName('td')[i];
						td.style.backgroundColor = td.id;
					}
			}

			var tabtr = document.getElementById("table").getElementsByTagName('tr');
			for (var i = 0; i < tabtr.length; i++){
				if (tabtr[i].className=='bgc') {
					tabtr[i].addEventListener("mouseover",onMouseOver_tr,true);
					tabtr[i].addEventListener("mouseout",onMouseOut_tr,true);
				}
			}
		}


	} // if ((ulnam=='novels') && ( (ulsub=='lis') || (ulsub=='sea'))) {

	// ―――――――　記事一覧画面での自動整形（ここまで）　―――――――

	// ―――――――――――　感想画面での自動整形　―――――――――――
	if (ulsub=='imp'){
		var dddimp = document.getElementsByTagName('table')[1];

		// リンクから本文に戻るとエラー――――
		//var dddaaa = document.getElementsByTagName('center');
		//for (var i=0;i<dddaaa.length;i++){
		//	if (dddaaa[i].innerHTML.match(/作品本文に戻る/)) {
		//		dddaaa[i].innerHTML=dddaaa[i].innerHTML.replace(/"><b>作品本文に戻る/ig,'&n=0#kiji"><b>作品本文に戻る');
		//	}
		//}

		// ページリンクリストの生成――――――
		if (flg_lin=='on'){

			// 各情報のの取得―――
			var kansousuu = dddimp.innerHTML.split(/\[|\]/);
			var address = location.search.split(/no=|&page=/);
			var kanaaa = ((kansousuu[1]-1) - (kansousuu[1]-1) % 20)/ 20 + 1 + (address[2] - 0);

			// リンクリストの定義―
			var list  = '<table width="100%"><tr>';
				list += '<td noWrap align="left" style="vertical-align:top;">過去←　</td><td align="center">';

			for(i=(kanaaa-1);i>0;i--){
				var kanbbb = Math.max((kansousuu[1]-20*([i]-(address[2] - 1))+1) , 1);
				kanbbb = kanbbb.toString().padStart(4,'0') ;

				if (i == address[2]) { list += '[' + kanbbb + '-]&nbsp; '; continue; }  //現在表示しているページはリンクを付けない
				list += '<a href="/bbs/sst/sst.php?act=impression&cate=all&no=' + address[1];
				list += '&page=' + [i] + '">[' + kanbbb + '-]</a>&nbsp; ';
			} // for(i=(kanaaa-1);i>0;i--){
				list += '</td><td noWrap align="right" style="vertical-align:bottom;">　→最新</td></tr></table>';

			// リンクリスト書込み―
			dddimp.innerHTML=dddimp.innerHTML
				.replace(/<table width="100%">/ig,list+'<table width="100%">')
				.replace(/次の20件/ig,'')
				.replace(/前の20件/ig,'');

		} // if (flg_lin=='on'){

		// 感想の順序入れ替え　降順→昇順―――
		if (flg_u_d=='on'){
			dddimp.innerHTML=dddimp.innerHTML.replace(/<hr>/ig,'○●●z○');  //Opera
			var kansou = dddimp.innerHTML.split('○●●z○');
			var nk = kansou.length;

			var kansouhtml = kansou[0] + '<hr>';
			for(i=nk-2;i>0;i--){
				if (kansou[i].match(NG)) {
					kansouhtml += '|∀･)<br><hr>';
				} else {
					kansouhtml += kansou[i] + '<hr>';
				}
			}
			kansouhtml += kansou[nk-1];

			dddimp.innerHTML=kansouhtml;

		} // if (flg_u_d=='on'){


		// 感想の日付の表記スタイル変更――――
		if (flg_day=='on'){
			dddimp.innerHTML=dddimp.innerHTML
			.replace(/\(Mon/ig,'(月').replace(/\(Tue/ig,'(火').replace(/\(Wed/ig,'(水')
			.replace(/\(Thu/ig,'(木').replace(/\(Fri/ig,'(金').replace(/\(Sat/ig,'(土').replace(/\(Sun/ig,'(日')
			.replace(/\/Jan/ig,'/01').replace(/\/Feb/ig,'/02').replace(/\/Mar/ig,'/03').replace(/\/Apr/ig,'/04')
			.replace(/\/May/ig,'/05').replace(/\/Jun/ig,'/06').replace(/\/Jul/ig,'/07').replace(/\/Aug/ig,'/08')
			.replace(/\/Sep/ig,'/09').replace(/\/Oct/ig,'/10').replace(/\/Nov/ig,'/11').replace(/\/Dec/ig,'/12');
		}

		// 変更内容の書き込み―――――――――
		document.getElementsByTagName('table')[1].innerHTML=dddimp.innerHTML;

		// 文字色・行の高さ調整――――――――
		if (flg_fon=='on'){
			var all_td = document.getElementsByTagName('td');
			for(i=0;i<all_td.length;i++){ all_td[i].style.lineHeight = 1.5 ; all_td[i].style.color = "#222222"};
		}


	} // if (ulsub=='imp'){

	// ――――――――　感想画面での自動整形（ここまで）　――――――――


	// ――――――――――――　検索バーの埋め込み　―――――――――――
	if ((flg_src=='on')&&(ulnam=='search')){

		// 検索バーの要素作成―――――――――
		var seach = '<form method="get" action="/bbs/sst/sst.php" target="_blank" style="margin:0;padding:0;">'
			+ '<span style="border:1px solid #000000;cursor: pointer;" '
			+ '               onclick="document.getElementById(\'seaid\').style.display=\'none\'" title="検索バーを閉じる">×</span>'
			+ '    <input type="hidden" name="act" value="search">'
			+ '    <input type="hidden" name="page" value="1">'
			+ '    <select name="cate" title="検索オプション(Arcadia)" style="width:106px;">'
			+ '        <option value="all" selected>検索場所：全て</option>'
			+ '        <option value="tiraura">チラシの裏</option>'
			+ '        <option value="eva">エヴァ</option>'
			+ '        <option value="nade">ナデシコ</option>'
			+ '        <option value="akamatu">赤松健</option>'
			+ '        <option value="type-moon">TYPE-MOON</option>'
			+ '        <option value="muv-luv">Muv-Luv</option>'
			+ '        <option value="ff">スクエニ</option>'
			+ '        <option value="sammon">サモンナイト</option>'
			+ '        <option value="toraha">とらハ</option>'
			+ '        <option value="gs">椎名高志</option>'
			+ '        <option value="naruto">ナルト</option>'
			+ '        <option value="zero">ゼロ魔</option>'
			+ '        <option value="HxH">HxH</option>'
			+ '        <option value="original">オリジナル</option>'
			+ '        <option value="etc">その他</option>'
			+ '        <option value="18">ＸＸＸ</option>'
			+ '    </select> '
			+ '    <input type="text" name="words" size="45" value="" title="検索ワード入力"> '
			+ '    <input type="submit" value="Arcadia内でSS検索" style="width:120px;font-size:12px;" title="Arcadia内でSS検索">'
			+ '</form>'

			+ '<form method="get" target="_blank" style="margin:0;padding:0;">'
			+ '    <select name="order" title="検索オプション(小説家になろう系)" style="width:125px;">'
			+ '         <option label="新着順" value="new" selected="selected">新着順</option>'
			+ '         <option label="おまかせ順" value="notorder">おまかせ順</option>'
			+ '         <option label="週間ユニーク順" value="weekly">週間ユニーク順</option>'
			+ '         <option label="お気に入り順" value="favnovelcnt">お気に入り順</option>'
			+ '         <option label="レビューの多い順" value="reviewcnt">レビューの多い順</option>'
			+ '         <option label="総合評価の高い順" value="hyoka">総合評価の高い順</option>'
			+ '         <option label="評価者数の多い順" value="hyokacnt">評価者数の多い順</option>'
			+ '         <option label="文字数の多い順" value="lengthdesc">文字数の多い順</option>'
			+ '         <option label="古い順" value="old">古い順</option>'
			+ '    </select> '
			+ '    <input type="text" name="word" size="45" value="" title="検索ワード入力"> '
			+ '    <input type="submit" value="なろうでSS検索" formaction="http://yomou.syosetu.com/search.php" '
			+ '                style="width:120px;font-size:12px;" title="小説家になろうでＳＳ検索">'
			+ '</form>'
			+ '<form method="get" action="https://syosetu.org/search/" target="_blank" style="margin:0;padding:0;">'
			+ '    <select name="order" title="スペース" style="width:125px;"></select>'
			+ '    <input type="text" name="word" size="45" value="" title="検索ワード入力"> '
			+ '    <input type="hidden" name="mode" value="search"> '
			+ '    <input type="submit" value="ハーメルンでSS検索"  '
			+ '                style="width:120px;font-size:12px;" title="ハーメルンでSS検索">'
			+ '</form>';


		// 検索バーの埋め込み―――――――――
		var wtable = document.createElement('span');
			wtable.setAttribute('style', 'border:1px solid #000000; top:2px; left:2px; padding:3px 5px; cursor: pointer; display:block; position:fixed;')
			wtable.id = 'seaiz';
			wtable.title = '検索バーの表示／非表示';
			wtable.innerHTML = 'search';
		document.body.appendChild(wtable);

		var vtable = document.createElement('span');
			vtable.setAttribute('style', 'border:1px solid #000000; top:2px; left:2px; padding:2px; position:fixed; background-color:#eee;')
			vtable.id = 'seaid';
			vtable.style.display = flg_seb;
			vtable.innerHTML = seach;
		document.body.appendChild(vtable);


		// イベント定義の埋め込み―――――――
		var ser_d  = function () {
			if (document.getElementById('seaid').style.display=='block') {
				document.getElementById('seaid').style.display='none';
			} else {
				document.getElementById('seaid').style.display='block';
			}
		}
		wtable.addEventListener("click",ser_d,true);
		document.body.addEventListener("dblclick",ser_d,true);

	} // if ((flg_src=='on')&&(ulnam=='search')){

	// ―――――――――　検索バーの埋め込み（ここまで）　――――――――


	// ―――――――――　各記事閲覧時に様々な機能を追加　――――――――
	if ((ulsub=='dum')||(ulsub=='all')||((ulsub=='sea')&&(ulnam=='search'))){

		// ―――――――――――　歯抜け記事のエラー対策　――――――――――
		if (flg_nex=='on'){
			if (location.search.match(/&n=/)){
				var addrr = location.search.split(/&n=|#kiji|&count=1/);
				var SStable = document.getElementById('table');
				var SStr = SStable.getElementsByTagName('tr');
				for (var i=0;i<SStr.length;i++){ if (SStr[i].innerHTML.match('n=' + addrr[1])) { break } }

				if (SStr[i+2] == null) {
					var nextlink = 'ここが最終記事になっています';
					var dddd = document.getElementsByTagName('table');
					for(i=0;i<dddd.length;i++){
						if(dddd[i].className == 'brdr'){
							dddd[i].innerHTML = dddd[i].innerHTML
							.replace(/(n=[0-9]{1,3}#kiji">)次を表示する/ig, '$1');
						}
					}
				} else {
					var nextlink = String(SStr[i+1].innerHTML.match(/\[\d{1,3}?\]/)).slice(1,-1);
					var dddd = document.getElementsByTagName('table');
					for(i=0;i<dddd.length;i++){
						if(dddd[i].className == 'brdr'){
							dddd[i].innerHTML = dddd[i].innerHTML
							.replace(/n=[0-9]{1,3}#kiji">次を表示する/ig, 'n=' + nextlink + '#kiji">次を表示する');
						}
					}
				}
				if (location.search.match(/&n=0/) == null){ location.hash = "kiji"; }
				var v = 1;
			} // if (location.search.match(/&n=/)){
		} // if (flg_nex=='on'){


		// ――――――――――　デフォルトの体裁（詳細）　――――――――――

		// 読み込み時のスタイル変更――――――
		if (defwidth != '') {
			var dddd = document.getElementsByClassName('brdr');
			for(i=0;i<dddd.length;i++){
				dddd[i].style.width = defwidth;
			}
		}

		if (defheight != '') {
			var dddd  = document.getElementsByTagName('p');
			for(i=0;i<dddd.length;i++){
				dddd[i].style.lineHeight = defheight;
			}
			var dddd  = document.getElementsByTagName('blockquote');
			for(i=0;i<dddd.length;i++){
				dddd[i].getElementsByTagName('div')[0].style.lineHeight = defheight;
			}
		}

		//var dddd  = document.getElementsByTagName('td');
		var dddd = document.getElementsByClassName('bgc');
		for(i=0;i<dddd.length;i++){
			if (defsize    != '') { dddd[i].style.fontSize = defsize; }
			if (deffamily  != '') { dddd[i].style.fontFamily = deffamily; }
			if (defcolor   != '') { dddd[i].style.color = defcolor; }
			if (defbgcolor != '') { dddd[i].style.backgroundColor = defbgcolor; }
		}

		// スタイルシートの定義――――――――

		// 体裁バー本体――――
		var dST = ' '
			+ '#tableind td{ font-size:13px !important;}'
			+ '.scroll     { filter:alpha(opacity=4); -moz-opacity: 0.04; opacity: 0.04; font-family:\'ＭＳ ゴシック\'; color:#000000; }'
			+ '.spn_inp  { margin:5px 7px 5px 0px; line-height:250%; font-size:12px; color:#000; }'
			+ '.spn_sel    { margin:5px 2px 0px 0px; line-height:250%; font-size:12px; color:#000; }'
			+ '.spn_sel select{ font-size:13px; }'
			+ '.bar_sel    { width:60px; border:1px solid #000; word-break: normal; word-wrap: normal;}'
			+ '.bar_bas    { position:fixed; top:2px; right:2px; border:1px solid #000; line-height:250%; '
			+             '  background:#ddd; color:#000; font-size:12px; display:none; padding:18px 14px 18px 20px; text-align:right; }'
			+ '.bar_swh    { position:fixed; top:2px; right:2px; border:1px solid #000; font-size:12px; float:left; padding:3px 5px; text-align:center; }'
			+ '.ind_swh    { position:fixed; top:2px; left:2px;  border:1px solid #000; font-size:12px; float:left; padding:3px 5px; display:block; }'
			+ '.ind_ind    { position:fixed; top:2px; left:2px;  border:1px solid #000; float:left; padding:3px 5px; display:none; '
			+             '  z-index:10; overflow-y:scroll; overflow-x:auto; background-color:#fff; }'
		; // var dST

		// FireFoxのルビ表示用―
		if (flg_rub == 'on'){
			dST += 'ruby, rcr   { display:inline-table; text-align:center; vertical-align:text-bottom; line-height:' + flg_ru2 + '; }'
			+ 'ruby>rb, rcr>rb { line-height:' + flg_ru2 + '; }'
			+ 'ruby>rp, rcr>rp { top:0px; left:-70px; position:fixed;}'
			+ 'ruby>rt, rcr>rt { display:table-header-group; font-size:60%; line-height:100%; letter-spacing:1px; }';
		};

		// スタイルシート埋込―
		var dstyle = document.createElement('style');
			dstyle.innerHTML = dST;
		document.getElementsByTagName('head')[0].appendChild(dstyle);

		// ―――――――――　デフォルトの体裁（ここまで）　―――――――――

		// ―――――――――――――　AutoPagerize　―――――――――――――
		var flg_autpage = "off";
		if (flg_autpage == "on"){
			document.body.addEventListener('AutoPagerize_DOMNodeInserted',function(evt){
				var node = evt.target;
				var requestURL = evt.newValue;
				var parentNode = evt.relatedNode;


				// 歯抜け記事のエラー回避―――――――
				if (flg_nex=='on'){
					for (var i=0;i<SStr.length;i++){ if (SStr[i].innerHTML.match('n=' + addrr[1])) { break } }
					v = v+1;
					if (SStr[i+1+v] == null) {
						nextlink = 'ここが最終記事になっています';
						node.innerHTML = node.innerHTML.replace(/(n=\d{1,3}#kiji.+?)次を表示する/ig, '$1');
					} else {
						nextlink = String(SStr[i+v].innerHTML.match(/\[\d{1,3}?\]/)).slice(1,-1);
						node.innerHTML = node.innerHTML.replace(/n=\d{1,3}#kiji.+?次を表示する/ig, 'n=' + nextlink + '#kiji">次を表示する');
					}
				} // if (flg_nex=='on'){

				// 体裁バーの引継ぎ――――――――――
				fnc_au2(node);
				var cccc  = node.getElementsByTagName('blockquote'); fnc_aut(cccc);

			}, false);
		}

		// ――――――――――　インデックスをポップアップ　―――――――――
		if ((flg_ind == 'on')&&(ulnam == 'novels')) {

			// インデックスの要素取得―――――――
			if (losch.match(/&n=[0-9]/)) {
				var index = document.getElementById('table').innerHTML;
				index = index.replace(/<\/?b>/ig, '').replace(/%">([^\n])/ig, '%" noWrap>$1');
				document.getElementsByTagName('title')[0].innerHTML = document.getElementById('table').getElementsByTagName('a')[0].innerHTML;
				var dddd = document.getElementsByClassName('bgb');
			} else if (losch.match(/&all=/)) {
				var date = new Array()
					date = document.body.innerHTML.match(/Date: [\d\/ :]{16}/g);
				//var dddd = document.getElementsByTagName('td'), index  = ' ', m = 0;
				var dddd = document.getElementsByClassName('bgb'), index  = ' ', m = 0;

				document.getElementsByTagName('title')[0].innerHTML = dddd[0].getElementsByTagName('font')[0].innerHTML;

				//ページ内ジャンプできるようにタグ付け
				for(i=0;i<dddd.length;i++){
					var linktt = dddd[i].getElementsByTagName('font')[0].innerHTML;
					dddd[i].getElementsByTagName('font')[0].innerHTML = '<A name="' + m + '"></A>' + dddd[i].getElementsByTagName('font')[0].innerHTML;
					index += '<tr style="padding:10px;"><td noWrap>[' + m + '] </td><td><A href="#'+ m + '">' +  linktt +'</A></td>'
						+ '<td noWrap> ' + date[m].slice(6) + '</td></tr>' ;
					m++;
				}
			} // if (location.search.match(/&n=[0-9]/)) {


			// インデックスの埋め込み―――――――
			var inbtn = '<span" title="インデックスをポップアップ" style="font-size:12px;cursor:pointer;">Index</span>';
			var wheight = window.innerHeight - 200 + 'px';

			var otable = document.createElement('span');
				otable.id = 'seaiz';
				otable.className = 'ind_swh';
				otable.innerHTML = inbtn;
			document.body.appendChild(otable);

			var ptable = document.createElement('iflame');
				ptable.id = 'tableind';
				ptable.className = 'ind_ind';
				ptable.style.maxHeight = wheight;
				ptable.style.backgroundColor = "#222";
				ptable.innerHTML = '<table style="margin:8px;font-family:' + deffamily + ';background-color:#222;">' + index + '</table>';
			document.body.insertBefore(ptable, document.body.firstChild);


			// ファイル名用文字列生成――――――――

			// 題名と作者名取得――
			var tthref = location.href.replace(/all_msg/, 'dump') + '&n=0';
			var linktt = dddd[0].getElementsByTagName('font')[0].innerHTML;
			var ttname = document.getElementsByTagName('tt')[0].innerHTML.split(/Name: |◆/);

			// ファイル名埋め込み―
			var gtable = document.createElement('span');
				gtable.style.position = 'absolute';
				gtable.style.top = '-150px';
				gtable.style.left = '2px';
				gtable.innerHTML = tthref + '<br>(未読) [' + ttname[1] + '] ' + linktt + '<br><br><br>';
			document.body.insertBefore(gtable, document.body.firstChild);


			// イベント定義の埋め込み―――――――

			// 呼び出し用の関数――
			var ind_n  = function () {document.getElementById('tableind').style.display='block';}
			var ind_f  = function () {document.getElementById('tableind').style.display='none';}
			var ind_d  = function () {
				if (document.getElementById('tableind').style.display=='block') {
					document.getElementById('tableind').style.display='none';
				} else {
					document.getElementById('tableind').style.display='block';
				}
			}

			// イベント埋め込み――
			otable.addEventListener("mouseover",ind_n,true);
			ptable.addEventListener("mouseover",ind_n,true);
			ptable.addEventListener("mouseout",ind_f,true);


		} // if ((flg_ind == 'on')&&(location.search.match(/&n=0/) == null))

		// ―――――――　インデックスをポップアップ（ここまで）　――――――


		// ―――――――――　小説閲覧時に体裁バーの埋め込み　――――――――
		if (flg_bar == 'on') {

			// スタイルシートの選択項目――――――  数値を変更したり、行の追加も可能。好みの値が無ければ自分でカスタマイズして下さい。
			// 横幅――――――――
			var str_wid = 'Width <select id="id_wid" name="B1" class="bar_sel">'
				+ '<option value="' + defwidth + '" selected>標準</option>'
				+ '<option value="60%">60%</option>'
				+ '<option value="65%">65%</option>'
				+ '<option value="70%">70%</option>'
				+ '<option value="75%">75%</option>'
				+ '<option value="80%">80%</option>'
				+ '<option value="85%">85%</option>'
				+ '<option value="90%">90%\<</option>'
				+ '<option value="95%">95%</option>'
				+ '<option value="100%">100%</option>'
				+ '</select>';

			// 行間の高さ――――――
			var str_hei = 'Height <select id="id_hei" name="B2" class="bar_sel">'
				+ '<option value="' + defheight + '" selected>標準</option>'
				+ '<option value="100%">100%</option>'
				+ '<option value="125%">125%</option>'
				+ '<option value="150%">150%\<</option>'
				+ '<option value="175%">175%</option>'
				+ '<option value="200%">200%</option>'
				+ '<option value="225%">225%</option>'
				+ '<option value="250%">250%</option>'
				+ '<option value="275%">275%</option>'
				+ '<option value="300%">300%</option>'
				+ '</select>';

			// フォントサイズ――――
			var str_siz = 'Size <select id="id_siz" name="B3" class="bar_sel">'
				+ '<option value="' + defsize + '" selected>標準</option>'
				+ '<option value="75%">75%</option>'
				+ '<option value="80%">80%\<</option>'
				+ '<option value="85%">85%</option>'
				+ '<option value="90%">90%</option>'
				+ '<option value="95%">95%</option>'
				+ '<option value="100%">100%</option>'
				+ '<option value="110%">110%</option>'
				+ '<option value="120%">120%</option>'
				+ '<option value="130%">130%</option>'
				+ '<option value="140%">140%</option>'
				+ '<option value="150%">150%</option>'
				+ '</select>';

			// フォント種類―――――
			var str_fce = 'Face <select id="id_fce" name="B4" class="bar_sel">'
				+ '<option value="' + deffamily + '" selected>標準</option>'
				+ '<option value="" disabled>＜――固定幅――＞</option>'
				+ '<option value="メイリオ">メイリオ</option>'
				+ '<option value="Osaka-Mono">Osaka－等幅</option>'
				+ '<option value="ＭＳ ゴシック">ＭＳ ゴシック</option>'
				+ '<option value="ＭＳ 明朝">ＭＳ 明朝</option>'
				+ '<option value="S2G海フォント">S2G海フォント</option>'
				+ '<option value="" disabled>＜――可変幅――＞</option>'
				+ '<option value="MeiryoKe_PGothic">MeiryoKe_PGothic</option>'
				+ '<option value="Hiragino Kaku Gothic Pro">ヒラギノ角ゴ Pro</option>'
				+ '<option value="Osaka">Osaka</option>'
				+ '<option value="ＭＳ Ｐゴシック">ＭＳ Ｐゴシック</option>'
				+ '<option value="ＭＳ Ｐ明朝">ＭＳ Ｐ明朝</option>'
				+ '<option value="S2GP海フォント">S2GP海フォント</option>'
				+ '</select>';

			// フォント色――――――
			var str_clr = 'Color <select id="id_clr" name="B5" class="bar_sel">'
				+ '<option value="' + defcolor + '" selected>標準</option>'
				+ '<option value="#000000" style="background-color:#000000;"></option>'
				+ '<option value="#333333" style="background-color:#333333;"></option>'
				+ '<option value="#666666" style="background-color:#666666;"></option>'
				+ '<option value="#999999" style="background-color:#999999;"></option>'
				+ '<option value="#bbbbbb" style="background-color:#bbbbbb;"></option>'
				+ '<option value="#dddddd" style="background-color:#dddddd;"></option>'
				+ '<option value="#ffffff" style="background-color:#ffffff;"></option>'
				+ '<option value="#007700" style="background-color:#007700;"></option>'
				+ '<option value="#000077" style="background-color:#000077;"></option>'
				+ '<option value="#770000" style="background-color:#770000;"></option>'
				+ '</select>';

			// 背景色――――――――
			var str_tcl = 'Tcolor <select id="id_tcl" name="B6" class="bar_sel">'
				+ '<option value="' + defbgcolor + '" selected>標準</option>'
				+ '<option value="#ffffff" style="background-color:#ffffff;"></option>'
				+ '<option value="#dddddd" style="background-color:#dddddd;"></option>'
				+ '<option value="#bbbbbb" style="background-color:#bbbbbb;"></option>'
				+ '<option value="#999999" style="background-color:#999999;"></option>'
				+ '<option value="#666666" style="background-color:#666666;"></option>'
				+ '<option value="#333333" style="background-color:#333333;"></option>'
				+ '<option value="#000000" style="background-color:#000000;"></option>'
				+ '<option value="#E2E2FF" style="background-color:#E2E2FF;"></option>'
				+ '<option value="#FFE2FF" style="background-color:#FFE2FF;"></option>'
				+ '<option value="#E2FFE2" style="background-color:#E2FFE2;"></option>'
				+ '<option value="#77AAAA" style="background-color:#77AAAA;"></option>'
				+ '</select>';


			// ―――――――――　関数の定義　―――――――――
			// 横幅―――――――――
			var fnc_wid = function (value) {
				var dddd = document.getElementsByTagName('table');
				for(i=0;i<dddd.length;i++){ if(dddd[i].className == 'brdr'){
					dddd[i].style.width = document.getElementById('id_wid').value;
				} }
				document.getElementById('id_wid').blur();
			}

			// 行間の高さ――――――
			var fnc_hei = function (value) {
				var dddd  = document.getElementsByTagName('p');
				for(i=0;i<dddd.length;i++){ dddd[i].style.lineHeight = document.getElementById('id_hei').value;};
				var dddd  = document.getElementsByTagName('blockquote');
				for(i=0;i<dddd.length;i++){
					dddd[i].getElementsByTagName('div')[0].style.lineHeight = document.getElementById('id_hei').value;
				}
				document.getElementById('id_hei').blur();
			}

			// フォントサイズ――――
			var fnc_siz = function (value) {
				var dddd  = document.getElementsByTagName('td');
				for(i=0;i<dddd.length;i++){ if(dddd[i].className == 'bgc'){
					dddd[i].style.fontSize = document.getElementById('id_siz').value;
				} }
				document.getElementById('id_siz').blur();
			}

			// フォント種類―――――
			var fnc_fce = function (value) {
				var dddd  = document.getElementsByTagName('td');
				for(i=0;i<dddd.length;i++){ if(dddd[i].className == 'bgc'){
					dddd[i].style.fontFamily = document.getElementById('id_fce').value;
				} }
				document.getElementById('id_fce').blur();
			}

			// フォント色――――――
			var fnc_clr = function (value) {
				var dddd  = document.getElementsByTagName('td');
				for(i=0;i<dddd.length;i++){ if(dddd[i].className == 'bgc'){
					dddd[i].style.color = document.getElementById('id_clr').value;
				} }
				document.getElementById('id_clr').blur();
			}

			// 背景色――――――――
			var fnc_tcl = function (value) {
				var dddd  = document.getElementsByTagName('td');
				for(i=0;i<dddd.length;i++){ if(dddd[i].className == 'bgc'){
					dddd[i].style.backgroundColor = document.getElementById('id_tcl').value;
				} }
				document.getElementById('id_tcl').blur();
			}

			// 空行無視―――――――
			var fnc_kuu = function (dddd) {
				var dddd  = document.getElementsByTagName('blockquote');
				if (document.getElementById('id_kuu').checked) {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/(<br>)+　*<br>　*<br>/ig,'<xxx></xxx><br><br>');
					}
				} else {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/<xxx><\/xxx>/ig, '<br>');
					}
				}
			} // fnc_kuu(dddd);

			// 行頭インデント――――
			var fnc_ind = function (dddd) {
				var dddd  = document.getElementsByTagName('blockquote');
				if (document.getElementById('id_ind').checked) {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/<br> *([^　 ＜【「『《≪（\(\｢<※])/ig, '<br>　<zzz></zzz>$1');
					}
				} else {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/　<zzz><\/zzz>/ig, '');
					}
				}
			} // fnc_ind(dddd);

			// 途中改行禁止―――――
			var fnc_kai = function (dddd) {
				var dddd  = document.getElementsByTagName('blockquote');
				if (document.getElementById('id_kai').checked) {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/([^。\.\, 」”’》』\)）】≫＞>｣…―・！？\!\?])<br>/ig, '$1<yyy></yyy>');
					}
				} else {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/<yyy><\/yyy>/ig, '<br>');
					}
				}
			} // fnc_kai(dddd);

			// 原稿作法準拠―――――
			var fnc_gen = function (dddd) {
				var dddd  = document.getElementsByTagName('blockquote');
				if (document.getElementById('id_gen').checked) {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/。([」』）》\)｣＞】])/ig, '<mmm></mmm>$1')
							.replace(/　([＜【「『《≪（\(｢※])/ig, '<kkk></kkk>$1')
							.replace(/。　/ig, '。<kkk></kkk>')
							.replace(/－－/ig, '<nnn>――</nnn>')
							.replace(/[･・]{2,3}/ig, '<nnn>……</nnn>').replace(/(<nnn>……<\/nnn>)[･・]/ig, '$1')
							.replace(/\.{2,3}/ig, '…').replace(/…\./ig, '…')
							.replace(/([！？♪\!\?])([^！？♪\!\?a　」』）》\)｣】≫＞\-<])/ig, '$1<nnn>　</nnn>$2');
					}
				} else {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/<mmm><\/mmm>/ig, '。')
							.replace(/<kkk><\/kkk>/ig, '　')
							.replace(/<nnn>　<\/nnn>/ig, '')
							.replace(/<nnn>――<\/nnn>/ig, '－－')
							.replace(/<nnn>……<\/nnn>/ig, '・・・');
					}
				}
			} // fnc_gen(dddd);

			// ルビを青空文庫変換――
			var fnc_rub = function (dddd) {
				var dddd  = document.getElementsByTagName('blockquote');
				if (document.getElementById('id_rub').checked) {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/([^p].\n?)《/ig, '$1<rrr>＜</rrr>')
							.replace(/([^p].)》/ig, '$1<rrr>＞</rrr>')
							.replace(/｜?<ruby>(<rb>)?([^<>]+)(<\/rb>)?(<rp>)?([^<>])?(<\/rp>)?(<rt>)?([^<>]+)(<\/rt>)?(<rp>)?([^<>])?(<\/rp>)?(<\/ruby>)?/img,
							'｜<rcr><rb>$2</rb><rp>《</rp><rt>$8</rt><rp>》</rp></rcr>');
					}
				} else {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/<rrr>＜<\/rrr>/ig, '《')
							.replace(/<rrr>＞<\/rrr>/ig, '》')
							.replace(/<\/rcr>/ig, '</ruby>')
							.replace(/｜(<rcr>)/ig, '<ruby>');
					}
				}
			} // fnc_rub(dddd);

			// フォント解除―――――
			var fnc_fon = function (dddd) {
				var dddd  = document.getElementsByTagName('blockquote');
				if (document.getElementById('id_fon').checked) {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/font/ig,'fomt');
					}
				} else {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/fomt/ig,'font');
					}
				}
			} // fnc_fon(dddd);

			// 連続記号分割―――――
			var fnc_wbr = function (dddd) {
				var dddd  = document.getElementsByTagName('blockquote');
				if (document.getElementById('id_wbr').checked) {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/(.)(\1{6})/ig, '$1$2<wbr>');
					}
				} else {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/<wbr>/ig, '');
					}
				}
			} // fnc_wbr(dddd);

			// 空行挿入―――――――
			var fnc_jib = function (dddd) {
				var dddd  = document.getElementsByTagName('blockquote');
				if (document.getElementById('id_jib').checked) {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML
							.replace(/([^」』）》≫\)｣＞】>])<br>([＜【「『《≪（\(｢])/ig, '$1<ooo><br></ooo><br>$2')
							.replace(/([」』）》≫\)｣＞】])<br>([^＜【「『《≪（\(｢<])/ig, '$1<ooo><br></ooo><br>$2');
					}
				} else {
					for(i=0;i<dddd.length;i++){
						dddd[i].innerHTML=dddd[i].innerHTML.replace(/<ooo><br><\/ooo>/ig, '');
					}
				}
			} // fnc_jib(dddd);

			// AutoPagerize―――――――
			var fnc_au2 = function (node) {
				var dddd = document.getElementsByTagName('table');
				for(i=0;i<dddd.length;i++){ if(dddd[i].className == 'brdr'){
					dddd[i].style.width = document.getElementById('id_wid').value;
				} }
				var dddd = node.getElementsByTagName('td');
				for(i=0;i<dddd.length;i++){ if(dddd[i].className == 'bgc'){
					dddd[i].style.fontSize =   document.getElementById('id_siz').value;
					dddd[i].style.fontFamily = document.getElementById('id_fce').value;
					dddd[i].style.color =      document.getElementById('id_clr').value;
					dddd[i].style.backgroundColor = document.getElementById('id_tcl').value;
				} }

				var dddd = node.getElementsByTagName('blockquote');
				for(i=0;i<dddd.length;i++){
					if (document.getElementById('id_hei').value =='') {
						dddd[i].getElementsByTagName('div')[0].style.lineHeight = defheight;
						for(g=0;g<dddd[i].getElementsByTagName('p').length;g++){
							dddd[i].getElementsByTagName('p')[g].style.lineHeight = defheight;
						}
					} else {
						dddd[i].getElementsByTagName('div')[0].style.lineHeight = document.getElementById('id_hei').value;
						for(g=0;g<dddd[i].getElementsByTagName('p').length;g++){
							dddd[i].getElementsByTagName('p')[g].style.lineHeight = document.getElementById('id_hei').value;
						}
					}
				}

			} // fnc_au2();


			var fnc_aut = function (cccc) {
				for(i=0;i<cccc.length;i++){

					if (document.getElementById('id_kuu')) { if (document.getElementById('id_kuu').checked) {
						cccc[i].innerHTML=cccc[i].innerHTML.replace(/(<br>)+　*<br>　*<br>/ig,'<xxx></xxx><br><br>');
					} }

					if (document.getElementById('id_kai')) { if (document.getElementById('id_kai').checked) {
						cccc[i].innerHTML=cccc[i].innerHTML.replace(/([^。\.\, 」”’》』\)）】≫＞>｣…―・！？\!\?])<br>/ig, '$1<yyy></yyy>');
					} }

					if (document.getElementById('id_ind')) { if (document.getElementById('id_ind').checked) {
						cccc[i].innerHTML=cccc[i].innerHTML.replace(/<br> *([^　 ＜【「『《≪（\(\｢<※])/ig, '<br>　<zzz></zzz>$1');
					} }

					if (document.getElementById('id_gen')) { if (document.getElementById('id_gen').checked) {
						cccc[i].innerHTML=cccc[i].innerHTML
							.replace(/。([」』）》\)｣＞】])/ig, '<mmm></mmm>$1')
							.replace(/　([＜【「『《≪（\(｢※])/ig, '<kkk></kkk>$1')
							.replace(/。　/ig, '。<kkk></kkk>')
							.replace(/－－/ig, '<nnn>――</nnn>')
							.replace(/[･・]{2,3}/ig, '<nnn>……</nnn>').replace(/(<nnn>……<\/nnn>)[･・]/ig, '$1')
							.replace(/\.{2,3}/ig, '…').replace(/…\./ig, '…')
							.replace(/([！？♪\!\?])([^！？♪\!\?a　」』）》\)｣】≫＞\-<])/ig, '$1<nnn>　</nnn>$2');
					} }

					if (document.getElementById('id_rub')) { if (document.getElementById('id_rub').checked) {
						cccc[i].innerHTML=cccc[i].innerHTML
							.replace(/([^p].\n?)《/ig, '$1<rrr>＜</rrr>')
							.replace(/([^p].)》/ig, '$1<rrr>＞</rrr>')
							.replace(/｜?<ruby>(<rb>)?([^<>]+)(<\/rb>)?(<rp>)?([^<>])?(<\/rp>)?(<rt>)?([^<>]+)(<\/rt>)?(<rp>)?([^<>])?(<\/rp>)?(<\/ruby>)?/img,
							'｜<rcr><rb>$2</rb><rp>《</rp><rt>$8</rt><rp>》</rp></rcr>');
					} }

					if (document.getElementById('id_jib')) { if (document.getElementById('id_jib').checked) {
						cccc[i].innerHTML=cccc[i].innerHTML
							.replace(/([^」』）》≫\)｣＞】>])<br>([＜【「『《≪（\(｢])/ig, '$1<ooo><br></ooo><br>$2')
							.replace(/([」』）》≫\)｣＞】])<br>([^＜【「『《≪（\(｢<])/ig, '$1<ooo><br></ooo><br>$2');
					} }

					if (document.getElementById('id_fon')) { if (document.getElementById('id_fon').checked) {
						cccc[i].innerHTML=cccc[i].innerHTML.replace(/font/ig,'fomt');
					} }

					if (document.getElementById('id_wbr')) { if (document.getElementById('id_wbr').checked) {
						cccc[i].innerHTML=cccc[i].innerHTML.replace(/(.)(\1{6})/ig, '$1$2<wbr>');
					} }

				}
		 	} // fnc_aut(dddd);


			// 体裁バーの各ブロック生成――――――

			// スタイルシート系――
			var dom_wid = document.createElement('span');
				dom_wid.setAttribute('class', 'spn_sel')
				dom_wid.title = 'テーブルの横幅';
				dom_wid.innerHTML = str_wid + '<br>';

			var dom_hei = document.createElement('span');
				dom_hei.setAttribute('class', 'spn_sel')
				dom_hei.title = '行間の高さ';
				dom_hei.innerHTML = str_hei + '<br>';

			var dom_siz = document.createElement('span');
				dom_siz.setAttribute('class', 'spn_sel')
				dom_siz.title = 'フォントサイズ';
				dom_siz.innerHTML = str_siz + '<br>';

			var dom_fce = document.createElement('span');
				dom_fce.setAttribute('class', 'spn_sel')
				dom_fce.title = 'フォントの種類';
				dom_fce.innerHTML = str_fce + '<br>';

			var dom_clr = document.createElement('span');
				dom_clr.setAttribute('class', 'spn_sel')
				dom_clr.title = 'フォント色';
				dom_clr.innerHTML = str_clr + '<br>';

			var dom_tcl = document.createElement('span');
				dom_tcl.setAttribute('class', 'spn_sel')
				dom_tcl.title = '背景色';
				dom_tcl.innerHTML = str_tcl;


			// 改行操作系―――――
			var dom_kuu = document.createElement('span');
				dom_kuu.setAttribute('class', 'spn_inp')
				dom_kuu.title = '無駄な空行を圧縮します';
				dom_kuu.innerHTML = '<input id="id_kuu" type=checkbox name="C1">空行';

			var dom_ind = document.createElement('span');
				dom_ind.setAttribute('class', 'spn_inp')
				dom_ind.title = '段落の頭を字下げします';
				dom_ind.innerHTML = '<input id="id_ind" type=checkbox name="C2">行頭';

			var dom_kai = document.createElement('span');
				dom_kai.setAttribute('class', 'spn_inp')
				dom_kai.title = '段落途中の改行を無視します(精度悪し)';
				dom_kai.innerHTML = '<input id="id_kai" type=checkbox name="C3">途改';

			var dom_gen = document.createElement('span');
				dom_gen.setAttribute('class', 'spn_inp')
				dom_gen.title = '原稿作法準拠のものへと整形します';
				dom_gen.innerHTML = '<input id="id_gen" type=checkbox name="C4">定型';

			var dom_rub = document.createElement('span');
				dom_rub.setAttribute('class', 'spn_inp')
				dom_rub.title = 'ルビを青空文庫形式に変換します';
				dom_rub.innerHTML = '<input id="id_rub" type=checkbox name="C5"><span style="font-family:meiryo,monospace;">ルビ</span>';

			var dom_fon = document.createElement('span');
				dom_fon.setAttribute('class', 'spn_inp')
				dom_fon.title = '作者指定のフォントを強制解除します';
				dom_fon.innerHTML = '<input id="id_fon" type=checkbox name="C7">字解';

			var dom_wbr = document.createElement('span');
				dom_wbr.setAttribute('class', 'spn_inp')
				dom_wbr.title = '連続文字によるテーブル横幅破壊の回避';
				dom_wbr.innerHTML = '<input id="id_wbr" type=checkbox name="C8">連字';

			var dom_jib = document.createElement('span');
				dom_jib.setAttribute('class', 'spn_inp')
				dom_jib.title = '会話文と地の文の間に空行を挿みます';
				dom_jib.innerHTML = '<input id="id_jib" type=checkbox name="C9">挿行';


			// 外枠など―――――――
			var dom_sp1 = document.createElement('br');
				dom_sp1.setAttribute('clear', 'all')
				dom_sp1.innerHTML = '';

			var dom_sp2 = document.createElement('br');
				dom_sp2.setAttribute('clear', 'all')
				dom_sp2.innerHTML = '';

			var dom_sp3 = document.createElement('br');
				dom_sp3.setAttribute('clear', 'all')
				dom_sp3.innerHTML = '';

			var dom_hr1 = document.createElement('span');
				dom_hr1.innerHTML = '<hr style="margin:15px;">';

			var S_bar = document.createElement('span');
				S_bar.setAttribute('class', 'bar_swh')
				S_bar.innerHTML = 'display';

			var U_bar = document.createElement('span');
				U_bar.setAttribute('class', 'bar_bas')
				U_bar.setAttribute('id', 'ase')
				U_bar.innerHTML = ' ';

			// 体裁バーのデザイン――――――――― カスタマイズ非推奨
			U_bar.insertBefore(dom_wid, U_bar.lastChild); // テーブルの横幅
			U_bar.insertBefore(dom_hei, U_bar.lastChild); // 行間の高さ
			U_bar.insertBefore(dom_siz, U_bar.lastChild); // フォントサイズ
			U_bar.insertBefore(dom_fce, U_bar.lastChild); // フォントの種類
			U_bar.insertBefore(dom_clr, U_bar.lastChild); // フォント色
			U_bar.insertBefore(dom_tcl, U_bar.lastChild); // 背景色

			U_bar.insertBefore(dom_hr1, U_bar.lastChild); //   ― 区切り線 ―

			U_bar.insertBefore(dom_kuu, U_bar.lastChild); // 連続空行圧縮ボタン
			U_bar.insertBefore(dom_rub, U_bar.lastChild); // ルビの青空文庫対応化
			U_bar.insertBefore(dom_sp1, U_bar.lastChild); //   ―― 改行 ――
			U_bar.insertBefore(dom_ind, U_bar.lastChild); // 行頭インデントボタン
			U_bar.insertBefore(dom_jib, U_bar.lastChild); // 空行挿入ボタン
			U_bar.insertBefore(dom_sp2, U_bar.lastChild); //   ―― 改行 ――
			U_bar.insertBefore(dom_kai, U_bar.lastChild); // 途中改行禁止ボタン
			U_bar.insertBefore(dom_fon, U_bar.lastChild); // フォント解除ボタン
			U_bar.insertBefore(dom_sp3, U_bar.lastChild); //   ―― 改行 ――
			U_bar.insertBefore(dom_gen, U_bar.lastChild); // 原稿作法準拠ボタン
			U_bar.insertBefore(dom_wbr, U_bar.lastChild); // 連続文字分解ボタン

			// 体裁バー本体の埋め込み―――――――
			document.body.appendChild(S_bar);
			document.body.appendChild(U_bar);

			// イベント定義の埋め込み―――――――

			// 呼び出し用の関数――
			var swi_n  = function () {document.getElementById('ase').style.display='block';}
			var swi_f  = function (event) {
				var e = event.toElement || event.relatedTarget;
				if (e.parentNode == this || e == this) {return;}
				document.getElementById('ase').style.display='none';
			}
			var swi_d  = function () {
				if (document.getElementById('ase').style.display=='block') {
					document.getElementById('ase').style.display='none';
				} else {
					document.getElementById('ase').style.display='block';
				}
			}

			// イベント埋め込み――
			S_bar.addEventListener("mouseover",swi_n,true);
			U_bar.addEventListener("mouseover",swi_n,true);
			U_bar.addEventListener("mouseout",swi_f,true);
			document.body.addEventListener("dblclick",swi_d,true);

			if (dom_wid) { dom_wid.addEventListener("change",fnc_wid,true);}
			if (dom_hei) { dom_hei.addEventListener("change",fnc_hei,true);}
			if (dom_siz) { dom_siz.addEventListener("change",fnc_siz,true);}
			if (dom_fce) { dom_fce.addEventListener("change",fnc_fce,true);}
			if (dom_clr) { dom_clr.addEventListener("change",fnc_clr,true);}
			if (dom_tcl) { dom_tcl.addEventListener("change",fnc_tcl,true);}

			if (dom_kuu) { dom_kuu.addEventListener("click", fnc_kuu,true);}
			if (dom_ind) { dom_ind.addEventListener("click", fnc_ind,true);}
			if (dom_kai) { dom_kai.addEventListener("click", fnc_kai,true);}
			if (dom_gen) { dom_gen.addEventListener("click", fnc_gen,true);}
			if (dom_rub) { dom_rub.addEventListener("click", fnc_rub,true);}
			if (dom_fon) { dom_fon.addEventListener("click", fnc_fon,true);}
			if (dom_wbr) { dom_wbr.addEventListener("click", fnc_wbr,true);}
			if (dom_jib) { dom_jib.addEventListener("click", fnc_jib,true);}


			// 改行系の自動実行――――――――――
			if ((document.getElementById('id_kuu'))&&(aut_kuu == 'on')) { document.getElementById('id_kuu').checked = 'true'; fnc_kuu(dddd); } // 空行圧縮
			if ((document.getElementById('id_kai'))&&(aut_kai == 'on')) { document.getElementById('id_kai').checked = 'true'; fnc_kai(dddd); } // 途中改行の禁止
			if ((document.getElementById('id_ind'))&&(aut_ind == 'on')) { document.getElementById('id_ind').checked = 'true'; fnc_ind(dddd); } // 行頭インデント
			if ((document.getElementById('id_gen'))&&(aut_gen == 'on')) { document.getElementById('id_gen').checked = 'true'; fnc_gen(dddd); } // 原稿作法準拠
			if ((document.getElementById('id_rub'))&&(aut_rub == 'on')) { document.getElementById('id_rub').checked = 'true'; fnc_rub(dddd); } // ルビを青空文庫形式に
			if ((document.getElementById('id_jib'))&&(aut_jib == 'on')) { document.getElementById('id_jib').checked = 'true'; fnc_jib(dddd); } // 空行の挿入
			if ((document.getElementById('id_fon'))&&(aut_fon == 'on')) { document.getElementById('id_fon').checked = 'true'; fnc_fon(dddd); } // フォントの強制解除
			if ((document.getElementById('id_wbr'))&&(aut_wbr == 'on')) { document.getElementById('id_wbr').checked = 'true'; fnc_wbr(dddd); } // 連続文字の分解

		} // if (flg_bar == 'on') {

		// ――――――　小説閲覧時に体裁バーの埋め込み（ここまで）　―――――


		// ――――――　各記事閲覧時に様々な機能を追加（ここまで）　―――――
	} // if ((ulsub=='dum')||(ulsub=='all')||((ulsub=='sea')&&(ulnam=='search'))){


})();
