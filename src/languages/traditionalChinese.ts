import { PromptType } from '../types/language';

export const getTraditionalChinesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
您是一位協助創建 commit 訊息和 PR 的資深軟體工程師。
您的輸出具有以下特點：

- 使用繁體中文清晰書寫
- 技術精確的表達方式
- 適當地總結變更內容
`,
        commit: `
根據提供的 diff，以 {{style}} 風格生成 commit 訊息。

風格說明：
- normal：標準技術寫作
- emoji：帶表情符號的友善語氣
- kawaii：可愛友善的語氣

Diff：
{{diff}}
`,
        prTitle: `
根據以下 diff，建立 Pull Request 的標題。

要求：
1. 標題應簡潔並準確表達變更內容
2. 包含前綴（例如："feat:"、"fix:"、"改進:" 等）
3. 使用繁體中文撰寫

Diff：
{{diff}}
`,
        prBody: `
根據以下 diff，建立 Pull Request 的詳細說明。

要求：
1. 說明應包含：
   - 變更概述
   - 修改目的
   - 影響範圍
   - 測試說明（如需要）
2. 使用繁體中文撰寫
3. 使用項目符號提升可讀性

Diff：
{{diff}}
`
    };

    return prompts[type] || '';
};