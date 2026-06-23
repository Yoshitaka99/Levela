export const chatbotKnowledgeCategories = [
  "ステータス",
  "決済",
  "Lステップ操作",
  "その他",
] as const;

export type ChatbotKnowledgeCategory =
  (typeof chatbotKnowledgeCategories)[number];

export type ChatbotKnowledgeSource = {
  id: string;
  category: ChatbotKnowledgeCategory;
  title: string;
  sourceTitle: string;
  url: string;
  provider: "notion" | "tldv";
  tags: string[];
  content: string;
  notes?: string[];
};

export type ChatbotKnowledgeSearchResult = ChatbotKnowledgeSource & {
  score: number;
  excerpts: string[];
};

export const chatbotKnowledgeSources: ChatbotKnowledgeSource[] = [
  {
    id: "status-seated",
    category: "ステータス",
    title: "着座ステータス",
    sourceTitle: "着座ステータス",
    url: "https://app.notion.com/p/f5566ab3bdd083e6ae7b81bfbcb5e67e",
    provider: "notion",
    tags: ["着座", "飛び", "事前キャンセル", "リスケ", "日程調整", "担当者変更", "重複予約", "無効アポ"],
    content: [
      "面談に着座した場合は「着座」。",
      "一度日程変更になったお客様が、その後の面談に着座した場合は「日程変更→着座」。担当者変更後の面談で着座した場合も含む。",
      "事前連絡なく面談に参加しなかった場合は「飛び」。面談開始後10分は待機し、次の予定が詰まっていない場合は15分待機する。追い連絡後も参加・返信がない場合に判断する。10分未満で離脱した場合は飛び判定不可。",
      "面談開始前にお客様からキャンセル連絡があった場合は「事前キャンセル」。",
      "Zoom入室後すぐにキャンセル希望となった場合は「【その場】事前キャンセル」。商談動画提出必須。",
      "面談前に日程変更依頼があり、新日程を調整中なら「リスケ／再日程調整中」。",
      "Zoom入室後、面談中にリスケ希望となった場合は「【その場】リスケ／日程調整中」。商談動画提出必須。",
      "日程変更後、新しい面談日時が確定していれば「日程調整済」。",
      "リスケ調整中だったが最終連絡から3日以上返信がない場合は「日程調整中 → 返信なし」。",
      "着座後すぐに口頭で日程変更を希望し日時が確定している場合は「【その場】日程調整済」。",
      "着座後すぐに日程変更希望となり、日程調整中だったが3日返信がない場合は「【その場】日程調整→返信なし」。",
      "担当営業が変更になった場合は「担当者変更」。日程調整リンク送付で自動的に担当者が変わった場合も含む。",
      "同一顧客の予約が重複している場合は「重複予約」。顧客管理シート内で同名アポがあるか目視必須。",
      "予約後すぐ、目安2時間以内にキャンセルまたはブロックされた場合は「無効アポ」。",
      "営業側の都合で面談実施できなかった場合は「営業マン都合キャンセル」。例: 寝坊、面談忘れ、体調不良。",
    ].join("\n"),
  },
  {
    id: "status-after-session",
    category: "ステータス",
    title: "実施後ステータス",
    sourceTitle: "実施後ステータス",
    url: "https://app.notion.com/p/35b66ab3bdd0820588ef81647873d98e",
    provider: "notion",
    tags: ["成約", "成約予定", "保留", "失注", "クーリングオフ", "MLM失注"],
    content: [
      "初回Zoom内で決済まで終了し、入金確認まで完了した場合は「成約」。入金未完了なら成約予定へ。",
      "契約書締結済みだが未入金の場合は「成約予定（契あり）」。契約書締結まで進んでいない場合は保留。入金確認後は「予定→成約」へ変更。",
      "契約書締結済みでライフティ審査結果待ちの場合は「成約予定（ライフティ）」。",
      "成約予定だった方の入金が確認できた場合は「予定 → 成約」。口頭の支払い報告のみでは変更しない。",
      "初回Zoom内で保留になった場合は「保留」。必ず次回アクション日・保留理由を記載し、保留のまま放置しない。",
      "保留だった方が後日契約・入金した場合は「保留 → 成約」。入金確認完了後に変更。",
      "保留だった方が最終的に入会を辞退した場合は「保留 → 失注」。辞退意思が確認できた時点で変更し、失注理由を記載。",
      "契約書締結後に入金できなかった場合は「成約予定 → 失注」。音信不通や入金目処なしの場合、速やかに変更。",
      "初回Zoom内で失注した場合は「失注」。失注理由をしっかり記載。",
      "入金完了後、法定期間内8日以内にクーリングオフ申請があった場合は「クーリングオフ」。入金前にクーリングオフ申し出があった場合は「予定→失注」。",
      "ネットワークビジネス販売目的のインスタ運用希望で断った場合は「MLM失注」。証明動画提出必須。",
    ].join("\n"),
  },
  {
    id: "status-other",
    category: "ステータス",
    title: "その他ステータス",
    sourceTitle: "その他ステータス",
    url: "https://app.notion.com/p/58d66ab3bdd082c8ad6e01a283e00a4b",
    provider: "notion",
    tags: ["成約予定NA", "支払方法", "失注理由", "保留理由", "次回振込", "次回カード決済"],
    content: [
      "データをもとに分析するため、正確な内容を記載する。",
      "成約予定NAの内訳: 次回振込（要資金準備）、次回振込（手続き待ち）、次回カード決済（上限額up）、次回カード決済（新規作成）、次回カード決済（エラーにより再決済）、次回入金作業。",
      "次回振込（要資金準備）: 株や証券の解約、給料日待ちなど、資金準備ができ次第の決済。",
      "次回振込（手続き待ち）: 入金予定日が決まっている場合。",
      "次回カード決済（上限額up）: カード限度額の増枠申請中。",
      "次回カード決済（新規作成）: カード新規作成中。",
      "次回カード決済（エラーにより再決済）: システムエラーでその場で決済できなかった場合。",
      "次回入金作業: 決済のための再商談日が確定している場合。",
      "成約予定日は着金予定日を記入する。決着日（成約or失注）は着金した日付を記載する。",
      "支払方法: 一括（振込）、一括（カード）、一括（振込＋カード）、一括（カード複数枚）、ライフティ払い。",
      "失注理由詳細は具体的に記載する。同じ金額アウトでも、本当にお金がない場合と、金額を出す勇気が出なかった場合では原因が異なる。",
      "第三者アウトも、旦那相談で反対された背景を自責で捉えて詳細化する。保留は基本的に失注なので放置しない。",
    ].join("\n"),
    notes: ["画像付きの選択肢説明はOCR検索にも取り込み済み。"],
  },
  {
    id: "status-appointment-notes",
    category: "ステータス",
    title: "アポ追加注意事項",
    sourceTitle: "注意【必ず見て】",
    url: "https://app.notion.com/p/42866ab3bdd0838eb3af818668c5de0a",
    provider: "notion",
    tags: ["アポ追加", "顧客管理シート", "名前入力", "重複予約", "日程調整済", "成約"],
    content: [
      "ステータスミスは数値ズレや対応漏れの原因になるため、ルールを統一する。",
      "顧客管理シートに顧客の名前がない場合は、顧客管理シートのアポ追加フォームから必ず登録する。登録漏れは集計漏れ・売上漏れの原因になるため「後でやる」は禁止。",
      "アポ追加フォームの名前は、カレンダーに登録されている正式名で入力する。LINE名、ニックネーム、絵文字付きの名前はNG。顧客管理シートとの照合ミスを防ぐため。",
      "同じ顧客が複数登録されている場合は1つのレコードのみで管理し、2つ以上ある場合は他を「重複予約」へ変更する。数値の重複計上を防ぐ。",
      "日程調整済みの放置は禁止。同じ顧客が出てきた場合、他は重複予約。日程調整済のまま放置せず、必ずステータス変更する。",
      "見送り連絡が来たら保留のままにせず、速やかに「保留→失注」へ変更する。",
      "着金前に成約へ変更しない。成約の定義は入金確認完了。契約書のみ締結、支払い予定、振込予定、カード増枠待ち、ライフティ審査待ちは成約ではない。",
      "契約書締結済は「成約予定（契あり）」、ライフティ審査待ちは「成約予定（ライフティ）」。払うと言っているだけで成約にしない。",
      "ステータスは自己判断で変更せず、迷った場合は必ず確認する。",
    ].join("\n"),
    notes: ["画像付き操作例あり。署名付き画像URLは保存対象外。"],
  },
  {
    id: "status-no-show-flow",
    category: "ステータス",
    title: "未着座フロー",
    sourceTitle: "未着座フロー",
    url: "https://app.notion.com/p/a2166ab3bdd08218a5eb01136163df29",
    provider: "notion",
    tags: ["未着座", "遅刻", "日程変更", "追い連絡", "待機"],
    content: [
      "顧客都合で商談開始時刻から10分以上経過しても入室がない場合、営業担当者は日程変更を提案できる。次に商談が詰まっていない場合は最低15分待機する。",
      "開始時刻から10分、次が詰まっていなければ15分経過した時点で、入室が確認できないこと、トラブル有無、5分ほど待つこと、都合が悪い場合は日程調整する旨を丁寧に連絡する。",
      "さらに5分、次が詰まっていなければ10分待機し、開始から合計10分または15分経過しても連絡・入室がない場合は日程変更を提案する。",
      "日程変更提案では、別日程で調整したい旨と日程調整リンクを送り、不明点があれば連絡してもらう。",
      "顧客から返信があった場合は速やかに日程調整を完了する。",
      "顧客を責める表現は使わず、相手の事情に配慮する。独断でキャンセル扱いにせず、必ず日程変更の提案を行う。",
    ].join("\n"),
  },
  {
    id: "status-faq",
    category: "ステータス",
    title: "よくある質問",
    sourceTitle: "よくある質問",
    url: "https://app.notion.com/p/da266ab3bdd08214a5bb812291b22108",
    provider: "notion",
    tags: ["その場ステータス", "証明動画", "運転中", "キャンセル"],
    content: [
      "商談に運転中で参加され、商談が実施できず日程変更になり、その後返信がなくキャンセルとなった場合、通常は「着座 / 失注」。失注理由に詳細を記載する。",
      "上記ケースで証明動画を提出している場合は「【その場】日程変更 → 返信なし」。",
      "商談に着席後、口頭でキャンセルの旨を伝えられた場合、通常は「着座 / 失注」。着座した事実があるため事前キャンセルにはならない。",
      "上記ケースで証明動画を提出している場合は「【その場】事前キャンセル」。",
      "【その場】ステータスは証明動画を提出している場合のみ使用可能。証明動画がない場合は「着座 / 失注」とし、失注理由を記載する。",
    ].join("\n"),
  },
  {
    id: "payment-method",
    category: "決済",
    title: "決済方法",
    sourceTitle: "決済の種類",
    url: "https://app.notion.com/p/a5366ab3bdd08386886f81efd3993067",
    provider: "notion",
    tags: ["銀行振込", "クレジットカード", "特別決済", "ライフティ", "イレギュラー決済"],
    content: [
      "決済の種類は、銀行振込一括、クレジットカード一括払い、特別決済、ライフティ、イレギュラー決済。",
      "銀行振込一括は振込手数料がお客様負担。",
      "クレジットカード一括払いは、あとから分割。クレカの枠があるか事前確認する。",
      "特別決済では、ベーシックの場合は入会金無料。コミットの場合は入会金5万円がかかる。",
      "ライフティは無職・専業主婦の場合は通らない。",
      "イレギュラー決済は他に手段がなくなった場合のみ。注意点が多いためNotion本体で確認する。",
    ].join("\n"),
    notes: ["各決済方法の画像説明はOCR検索にも取り込み済み。"],
  },
  {
    id: "payment-contract-work",
    category: "決済",
    title: "契約作業",
    sourceTitle: "契約作業〜入金対応",
    url: "https://app.notion.com/p/f7766ab3bdd082a1aaf60164ab5e0562",
    provider: "notion",
    tags: ["契約", "入金", "クラウドサイン", "入会フォーム", "特別決済", "銀行振込", "ライフティ"],
    content: [
      "受講コースが決まったら、SnsClub【勉強会参加者限定】LINEに決済リンクを送る。",
      "お客様にリンクをタップしてもらうと、運営LINE追加画面に自動で切り替わるため、そのまま追加してもらう。",
      "運営LINEへ自動メッセージが送信されるため、お客様に名前とメールアドレスを送ってもらう。",
      "受け取った情報を元に契約書を作成する。クラウドサイン操作はNotion本体のマニュアルを確認する。",
      "契約書作成では、契約コースに応じてテンプレートを選択し、コースが間違っていないことを確認する。契約者メールアドレス・氏名、契約日、契約担当者、自社印などを入力する。",
      "カード決済では、お支払い回数は必ず1回。分割希望の場合は、お客様自身でカード会社の後から分割を利用してもらう。",
      "決済完了後は自動で入会フォームが送信される。必ず入会フォームを入力することをお客様に伝える。",
      "システムエラーで決済完了しても入会フォームが送信されない場合は、Discordの決済完了通知を確認する。通知が確認できない場合は担当者に確認し、確認が取れたら手動で入会フォーム送付可。",
      "特別決済（銀行振込＋カード）では、後から分割対応、割賦枠を必ず確認する。クレカ利用枠表を参照する。",
      "特別決済ではクレジットカード決済を先に行い、Discordの決済完了通知を確認したうえで銀行振込へ進む。WEB送金の場合はその場で入金してもらう。振込手数料はお客様負担。",
      "振込明細の写真を運営LINEに送ってもらい、確認次第、入会フォームを送信する。",
      "ライフティは別途マニュアル・解説動画参照。決済イレギュラー対応もNotion本体参照。",
    ].join("\n"),
    notes: [
      "本文内にログインID・パスワード等の認証情報が含まれていたため、ローカルナレッジには保存していません。",
      "画像付き手順はOCR検索にも取り込み済み。詳細操作はNotion本体を参照。",
    ],
  },
  {
    id: "payment-contract-faq",
    category: "決済",
    title: "契約時よくある質問",
    sourceTitle: "契約&決済よくある質問",
    url: "https://app.notion.com/p/90766ab3bdd082a0946e0149bb9fb0e6",
    provider: "notion",
    tags: ["会社契約", "受講人数", "イレギュラー決済", "契約書", "黄色の記入欄", "銀行振込"],
    content: [
      "会社契約の場合、契約書は会社名義でOK。最後の住所と名前の欄には会社住所、会社名＋担当者名を記載する。",
      "1契約で受講可能なのは本人含め2名まで。代表者1名の名前を契約書に記入する。",
      "イレギュラー決済で「この商品はリピート購入できません。」と出た場合は、別のメールアドレスで入力してもらう。他のメールアドレスがなければ新しく作ってもらう。",
      "契約書の黄色の記入欄が消えた場合は、契約書上部の入力欄を必要な場所へ移動し、入力者を選択する。",
      "クレカ一括で決済後、後から銀行振込にしたいと言われた場合、入会金は無料にならない。",
    ].join("\n"),
    notes: ["画像付き説明はOCR検索にも取り込み済み。"],
  },
  {
    id: "payment-cooling-off",
    category: "決済",
    title: "クーリングオフについて",
    sourceTitle: "クーリングオフ対応",
    url: "https://app.notion.com/p/2fd66ab3bdd0838ea56c8105f56a7f4f",
    provider: "notion",
    tags: ["クーリングオフ", "入金前", "入金後", "ライフティ", "失注"],
    content: [
      "入金前クーリングオフはCS報告不要。運営LINEの対応マークをクーリングオフ完了に変更する。",
      "入金前クーリングオフでは、顧客管理シートのステータスを「成約予定→失注」へ変更する。",
      "入金後クーリングオフもCS報告は不要。ただしSnsClub【勉強会参加者限定】LINEに連絡があった場合は、お客様にSnsClub運営LINEへ問い合わせるよう案内する。",
      "入金後クーリングオフでは、顧客管理シートのステータスを「クーリングオフ」に更新する。",
      "ライフティのクーリングオフは、承認前なら管理画面の顧客画面で「店舗都合キャンセル」をクリック。承認後なら「解約申込」をクリック。お客様側の特段対応はなし。",
    ].join("\n"),
    notes: ["画像付き操作説明はOCR検索にも取り込み済み。"],
  },
  {
    id: "payment-contract-document-questions",
    category: "決済",
    title: "契約書についてお客様より質問があった場合",
    sourceTitle: "契約書について質問があった場合",
    url: "https://app.notion.com/p/a5566ab3bdd082e78c25014dcc4b6414",
    provider: "notion",
    tags: ["契約書", "質問", "GPT図", "回答文"],
    content: [
      "契約書関連の質問には、社内支援ツール「GPT図」を使って回答文を自動生成できる。",
      "使用方法: お客様からの質問内容を入力し、該当コースを選択し、自動生成された回答文を確認する。必要に応じて文章トーンを選択し、顧客属性や関係性に合わせる。",
      "自動生成文はそのまま使用可能だが、ケースに応じて最終確認を行う。トーン選択を必ず実施する。",
      "GPT図は補助的手段であり、最終責任は担当者にある。回答の標準化と業務効率化のため活用推奨。",
      "GPTsリンクと説明動画はNotion本体に掲載。",
    ].join("\n"),
  },
  {
    id: "lstep-reservation-change",
    category: "Lステップ操作",
    title: "予約変更",
    sourceTitle: "予約キャンセル・予約変更方法",
    url: "https://app.notion.com/p/99466ab3bdd083d6a943815e9678fdfd",
    provider: "notion",
    tags: ["予約変更", "予約キャンセル", "リマインド", "アクションの実行", "担当者変更", "Lステップ"],
    content: [
      "予約キャンセルは削除で処理する。キャンセル機能は管理画面が煩雑になるため使用しない。削除後はリマインド通知を必ず停止する。",
      "キャンセル・変更時は、カレンダー画面から詳細を開き、右上の編集アイコンから操作する。変更なら日時・担当者を修正して保存。キャンセルなら削除。",
      "削除後はプロフィール画面で予約中表示とリマインドが残っていないか確認し、タイムラインでもリマインド通知が残っていないか確認する。",
      "予約変更では、詳細 → カレンダー予約 → 詳細 → 編集。時間・日付を変更し、終了時間は「終了時間から設定」にチェックして自動で1.5時間後に設定する。空き枠を必ず確認する。",
      "予約変更時は「アクションの実行」を必ず「実行する」にする。忘れるとZoomリンクが古いままになったり一部処理が不完全になる。",
      "予約更新後は個別トークを確認し、リマインドの扱いを判断する。挨拶リマインドは送信済みならキャンセル、未送信ならキャンセル不要。",
      "「スクラブ個別相談を設定中」リマインダーはキャンセル禁止。Zoomリンクや直前リマインド送信が止まるため。",
      "自分で対応できない日程変更では、現在の予約を削除し、Lステップで対象者のタグから【セミナー】個別相談予約完了のチェックを外す。忘れるとお客様が送付カレンダーを開けない。",
      "お客様には日程変更用カレンダーを送り、本日中の再予約を依頼する。日程により担当者が変わる可能性を伝える。",
      "やむを得ない営業担当者変更では、営業日程調整部屋で呼びかけ、担当者が見つかり次第Lステップで予約枠の担当営業を変更する。Zoomリンクが変わらないことがあるため、その場合は手動で送る。",
    ].join("\n"),
    notes: ["Loom解説動画と画像付き手順あり。画像付き手順はOCR検索にも取り込み済み。"],
  },
  {
    id: "lstep-day-trouble-flow",
    category: "Lステップ操作",
    title: "当日トラブルフロー",
    sourceTitle: "当日トラブル時のフロー（厳守）",
    url: "https://app.notion.com/p/dc666ab3bdd082d3919901516b417ac7",
    provider: "notion",
    tags: ["当日トラブル", "代打", "体調不良", "前商談", "遅刻", "日程変更"],
    content: [
      "当日商談対応ができなくなった場合、体調不良・やむを得ない事情による日程変更自体は許容されるが、まず担当者変更募集用スレッドで代打を最優先で募集する。",
      "当日商談開始1時間前の場合は、代打募集と同時に顧客へ連絡する。体調不良により対応が難しいこと、代わりに対応可能な担当者を探していること、見つからなければ日程相談することを謝罪とともに伝える。",
      "代打が見つからなかった場合のみ、顧客へ日程変更を依頼する。顧客から返信があった場合、6時間以内に日程調整リンクを送付。24時間未返信でリマインド、2日後・3日後も再リマインド。",
      "上記対応を怠った場合はマイナス1万円。寝坊、飲みすぎ、体調管理ミス、私情・言い訳の説明はNG。理由は体調不良までで止める。",
      "前の商談が押しそうな場合は、開始時刻前に必ず顧客へ事前連絡する。連絡なしで開始時刻を過ぎることは禁止。日程変更になった場合は対応フロー①を適用。",
      "顧客が商談開始時刻に10分以上遅れた場合、次に商談が詰まっていなければ最低15分待機。10分または15分経過時点で確認メッセージを送り、さらに待機後、連絡・入室がなければ日程変更を提案する。",
      "顧客を責める表現は使わず、丁寧に相手の事情へ配慮する。独断でキャンセル扱いにせず、日程変更を提案する。",
    ].join("\n"),
  },
  {
    id: "lstep-minutes-generation",
    category: "Lステップ操作",
    title: "議事録生成方法",
    sourceTitle: "面談後作業（必ず）",
    url: "https://app.notion.com/p/8f266ab3bdd083c4a23b0138972132a7",
    provider: "notion",
    tags: ["議事録", "面談後作業", "顧客管理シート", "入会フォーム", "tl;dv"],
    content: [
      "面談後作業では、まず顧客管理シートをすぐ更新する。",
      "議事録は必ず送る。簡単に議事録を生成する方法としてtl;dvの会議URLが掲載されている。",
      "着金後の入会フォーム送付まで忘れずに行う。",
      "tl;dv本文自体はNotion本文ではなく外部会議URLのため、文字起こし本文を検索対象にするには別途エクスポートが必要。",
    ].join("\n"),
    notes: ["tl;dv URL: https://tldv.io/app/meetings/6a0db192bae7a900137c16b0/"],
  },
  {
    id: "other-consultation",
    category: "その他",
    title: "不明事項の相談先",
    sourceTitle: "不明事項の相談先・相談方法",
    url: "https://app.notion.com/p/1cb66ab3bdd082448552013d141b6c61",
    provider: "notion",
    tags: [
      "相談",
      "相談先",
      "誰",
      "メンション",
      "顧客管理シート",
      "クラウドサイン",
      "Lステップ",
      "決済",
      "緊急",
      "システムエラー",
    ],
    content: [
      "顧客管理シートのバグ・不具合は営業MGと営業管理部/人事へ相談。",
      "クラウドサインのバグ・不具合、その他システムエラー全般は担当者へ相談。",
      "Lステップ関連の質問はLステップ担当へ相談。",
      "決済周りのイレギュラー対応は営業統括とSnsClub CSチームへ相談。",
      "お客様情報の共有や運営に関する質問はSnsClub運営とSnsClub CSチームへ相談。",
      "緊急で即座に回答が必要な場合はSnsClub運営、秘書、担当者、営業統括、営業MGへ相談。",
      "営業マニュアルに関する質問やお客様への返答で困った場合はチームマネージャーへ相談。",
      "クレジットカード決済、決済リンク発行、アポ追加フォーム発行は営業管理部/人事へ相談。",
      "最低限の運用ルール: 事実は営業お知らせ、相談は営業連絡部屋、手続きは営業報告、承認はMG、イベントはオフライン営業、問い合わせログは営業お問い合わせ。",
      "依頼は基本テンプレで行う。緊急時は期限と理由を明示する。顧客情報は必要最小限にし、完了後は対応済・日付・担当を追記する。",
    ].join("\n"),
    notes: ["具体的なメンション名はNotion本体参照。"],
  },
];

type SearchOptions = {
  category?: ChatbotKnowledgeCategory;
  limit?: number;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function createSearchTerms(query: string) {
  const normalizedQuery = normalize(query);
  const baseTerms = normalizedQuery
    .replace(/[！？?!。、,，.．「」『』（）()【】\[\]：:]/g, " ")
    .split(
      /\s+|について|とは|どこ|どれ|どの|どう|なに|何|です|ます|する|した|して|場合|とき|時|の|を|は|が|に|で|へ|や|も|から|まで|なら/g
    )
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  return [...new Set([normalizedQuery, ...baseTerms])].filter(Boolean);
}

function createExcerpts(source: ChatbotKnowledgeSource, terms: string[]) {
  const lines = source.content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (terms.length === 0) return lines.slice(0, 3);

  const matched = lines.filter((line) => {
    const normalizedLine = normalize(line);
    return terms.some((term) => normalizedLine.includes(term));
  });

  return (matched.length > 0 ? matched : lines).slice(0, 4);
}

export function searchChatbotKnowledgeSources(
  query: string,
  options: SearchOptions = {}
): ChatbotKnowledgeSearchResult[] {
  const normalizedQuery = normalize(query);
  const terms = createSearchTerms(query);
  const limit = options.limit ?? 5;

  const ranked = chatbotKnowledgeSources
    .filter((source) => !options.category || source.category === options.category)
    .map((source) => {
      const searchableValues = [
        source.category,
        source.title,
        source.sourceTitle,
        source.provider,
        source.content,
        ...(source.notes ?? []),
        ...source.tags,
      ];
      const haystack = normalize(searchableValues.join(" "));

      const directScore =
        normalizedQuery && haystack.includes(normalizedQuery) ? 12 : 0;
      const reverseScore =
        normalizedQuery &&
        [source.title, source.sourceTitle, ...source.tags].some((value) =>
          normalizedQuery.includes(normalize(value))
        )
          ? 10
          : 0;
      const termScore = terms.reduce(
        (score, term) => score + (haystack.includes(term) ? 3 : 0),
        0
      );
      const titleScore =
        normalizedQuery &&
        [source.title, source.sourceTitle].some(
          (title) =>
            normalize(title).includes(normalizedQuery) ||
            normalizedQuery.includes(normalize(title))
        )
          ? 8
          : 0;

      const score = directScore + reverseScore + termScore + titleScore;

      return {
        ...source,
        score,
        excerpts: createExcerpts(source, terms),
      };
    })
    .filter((source) => source.score > 0 || !normalizedQuery)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return ranked.slice(0, limit);
}

export function getKnowledgeSourceCounts() {
  return chatbotKnowledgeCategories.map((category) => ({
    category,
    count: chatbotKnowledgeSources.filter((source) => source.category === category)
      .length,
  }));
}
