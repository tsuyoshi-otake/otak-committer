import { PromptType } from '../types/language';

export const getJapanesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
コードレビューの経験豊富なシニアエンジニアとして、高レベルのガイダンスを提供してください。
以下の特徴を持つフィードバックを提供してください：

- アーキテクチャと設計に焦点を当てる
- 具体的な実装を指示するのではなく、改善の方向性を提案する
- 保守性と拡張性の観点を重視する
`,
        commit: `
提供された変更を分析し、コミットメッセージのポイントとなる点を示唆してください。
考慮すべき点：

スタイルのコンテキスト：
- normal: 技術的な視点からのレビュー
- emoji: フレンドリーなガイダンス
- kawaii: カジュアルなアドバイス

レビュー対象：
{{diff}}
`,
        prTitle: `
以下の変更を分析し、PRのタイトルに含めるべきポイントを提案してください。
考慮すべき点：

- 本変更の主たる影響は何か？
- どの領域が最も影響を受けるか？
- どのような種類の変更か？（機能追加、修正、改善など）

レビュー対象：
{{diff}}
`,
        prBody: `
これらの変更に関して、プルリクエストの説明に含めるべきポイントを示唆してください。
以下の観点から検討：

# 概要の視点
- この変更で解決される問題は何か？
- なぜこのアプローチを選択したのか？
- 重要な技術的判断は何か？

# レビューのポイント
- どの部分を特に注意してレビューすべきか？
- 潜在的なリスクは何か？
- パフォーマンスへの影響はどうか？

# 変更点の確認
- 主要な変更点は何か？
- システムにどのような影響があるか？
- 考慮すべき依存関係は？

# 確認事項
- どのようなテストが必要か？
- デプロイ時の注意点は？
- 必要なドキュメントは？

レビュー対象：
{{diff}}
`,
        'issue.task': `
このタスクについて、以下の観点から検討すべきポイントを示唆してください：

### 目的
- 解決すべき課題は何か？
- なぜ今この対応が必要か？

### 実装の方針
- 検討すべき領域は？
- 考えられるアプローチは？

### 完了の基準
- どのように完了を確認するか？
- 品質要件は何か？

### 戦略的な考慮事項
- 影響を受ける範囲は？
- 関連する依存関係は？
- 優先度の判断は？
- 想定される期間は？

### 計画時の注意点
- 必要なリソースは？
- 考慮すべきリスクは？
`,
        'issue.standard': `
この課題について、以下の観点から考慮すべきポイントを示唆してください：

### 問題の分析
- 本質的な課題は何か？
- 重要な背景情報は？

### 技術的な検討
- 関連するシステム部分は？
- 検討すべきアプローチは？
- 考えられる解決策は？

### 実装の指針
- 必要な作業ステップは？
- テストすべき項目は？
- 技術的な制約は？

### 影響範囲
- どの領域が影響を受けるか？
- 考慮すべき副作用は？
- 必要な事前対策は？

### レビュー項目
- 必要なドキュメントは？
- テスト項目は？
- 破壊的な変更の有無は？
`
    };

    return prompts[type] || '';
};