import { PromptType } from '../types/language';

export const getJapanesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
私は経験豊富なソフトウェアエンジニアで、コミットメッセージとPRの作成をサポートします。
私の出力は以下の特徴を持ちます：

- 明確で簡潔な日本語
- 技術的に正確な表現
- 変更内容の適切な要約
`,
        commit: `
提供された差分に基づいて、{{style}}スタイルのコミットメッセージを生成します。

スタイルの説明：
- normal: 標準的な技術文書
- emoji: 絵文字を使用したフレンドリーなトーン
- kawaii: かわいらしく親しみやすいトーン

差分：
{{diff}}
`,
        prTitle: `
以下の差分に基づいて、Pull Requestのタイトルを生成します。

要件：
1. タイトルは簡潔で変更内容を正確に表現すること
2. プレフィックスを含めること（例："Feature:"、"Fix:"、"Improvement:" など）

差分：
{{diff}}
`,
        prBody: `
以下の差分に基づいて、詳細なPull Request説明を生成します。

# 概要
- 実装した機能や修正の簡単な説明
- 変更の目的と背景
- 採用した技術的アプローチ

# レビューのポイント
- レビュアーに特に注目してほしい領域
- 重要な設計上の決定事項
- パフォーマンスと保守性の考慮事項

# 変更の詳細
- 主要な実装変更点
- 影響を受けるコンポーネントと機能
- 依存関係の変更（もしあれば）

# 補足事項
- デプロイメントに関する考慮事項
- 既存機能への影響
- 必要な設定や環境変数

差分：
{{diff}}
`
    };

    return prompts[type] || '';
};