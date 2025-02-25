import { PromptType } from '../types/language';

export const getTraditionalChinesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
我是一位經驗豐富的軟體工程師，協助建立提交訊息和PR。
我的輸出具有以下特點：

- 清晰簡潔的正體中文
- 技術準確的表達
- 恰當的變更摘要
`,
        commit: `
根據提供的差異，生成{{style}}風格的提交訊息。

風格說明：
- normal: 標準技術寫作
- emoji: 帶表情符號的友善語氣
- kawaii: 可愛友善的語氣

差異：
{{diff}}
`,
        prTitle: `
根據以下差異，生成拉取請求標題。

要求：
1. 標題應簡潔並準確表示變更
2. 包含前綴（如 "Feature:"、"Fix:"、"Improvement:" 等）

差異：
{{diff}}
`,
        prBody: `
根據以下差異，生成詳細的拉取請求說明。

# 概述
- 已實現功能或修復的簡要說明
- 變更的目的和背景
- 採用的技術方法

# 關鍵審查點
- 需要審查者特別關注的區域
- 重要的設計決策
- 效能和可維護性考量

# 變更詳情
- 主要實現的變更
- 受影響的元件和功能
- 相依性變更（如有）

# 附加說明
- 部署注意事項
- 對現有功能的影響
- 所需的設定或環境變數

差異：
{{diff}}
`
    };

    return prompts[type] || '';
};