import { PromptType } from '../types/language';

export const getJapanesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
あなたは経験豊富なソフトウェアエンジニアで、プロジェクトのコミットメッセージやPRの作成を支援します。
以下のような特徴を持つ出力を行います：

- 簡潔で分かりやすい日本語
- 技術的に正確な表現
- 変更内容を適切に要約
`,
        commit: `
提供された差分に基づいて、{{style}}スタイルのコミットメッセージを生成してください。

スタイルの説明：
- normal: 通常の技術的な文体
- emoji: 絵文字を含む親しみやすい文体
- kawaii: かわいらしい口調で親しみやすい文体

差分：
{{diff}}
`,
        prTitle: `
以下の差分に基づいて、Pull Requestのタイトルを生成してください。

注意点：
1. タイトルは簡潔で変更内容を適切に表現すること
2. 日本語で書くこと
3. プレフィックスをつけること（例：「機能追加:」「バグ修正:」「改善:」など）

差分：
{{diff}}
`,
        prBody: `
以下の差分に基づいて、Pull Requestの説明文を生成してください。

注意点：
1. 説明文には以下を含めること：
   - 変更の概要
   - 変更の目的
   - 影響範囲
   - テスト方法（必要な場合）
2. 日本語で書くこと
3. 箇条書きを使って読みやすくすること

差分：
{{diff}}
`
    };

    return prompts[type] || '';
};