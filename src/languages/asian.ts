import { MessageStyle } from '../types/messageStyle';

export const getAsianPrompt = (type: string): string => {
    const prompts = {
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
        pr: `
以下の差分に基づいて、Pull Requestのタイトルと説明文を生成してください。

以下の点に注意してください：
1. タイトルは簡潔で変更内容を適切に表現
2. 説明文には以下を含める：
   - 変更の概要
   - 変更の目的
   - 影響範囲
   - テスト方法（必要な場合）
3. 日本語で書く

差分：
{{diff}}
`
    };

    return prompts[type as keyof typeof prompts] || '';
};