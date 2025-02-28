import { PromptType } from '../types/language';

export const getTraditionalChinesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
作為資深軟體工程師，請提供程式碼變更的高階指導。
您的回饋應具備以下特徵：

- 著重於架構和設計影響
- 提出改進建議而非具體實作
- 考慮可維護性和可擴展性
`,
        commit: `
分析提供的變更並建議 commit 訊息的要點。
考慮：

風格內容：
- normal: 專業技術審查
- emoji: 友善指導
- kawaii: 輕鬆回饋

需審查的變更：
{{diff}}
`,
        prTitle: `
分析以下變更並建議 PR 標題的重要事項。
考慮：

- 這些變更的主要影響是什麼？
- 哪個區域受影響最大？
- 這是什麼類型的變更？（功能、修復、改進）

需審查的變更：
{{diff}}
`,
        prBody: `
審查這些變更並為 Pull Request 描述提供指導。
考慮這些面向：

# 策略概覽
- 這解決了什麼問題？
- 為什麼選擇這種方法？
- 關鍵技術決策是什麼？

# 審查重點
- 哪些區域需要特別注意？
- 有什麼潛在風險？
- 有什麼效能考量？

# 實作審查
- 主要變更是什麼？
- 如何影響系統？
- 需要考慮哪些相依性？

# 審查要求
- 需要測試什麼？
- 部署時有什麼考量？
- 需要什麼文件？

需審查的變更：
{{diff}}
`,
        'issue.task': `
分析任務並建議需要考慮的要點：

### 目的
- 需要解決什麼問題？
- 為什麼現在這個很重要？

### 實作指南
- 需要考慮哪些區域？
- 有哪些可能的方法？

### 成功準則
- 如何驗證完成？
- 品質要求是什麼？

### 策略考量
- 可能影響什麼？
- 需要考慮哪些相依性？
- 優先程度如何？
- 合理的時程是什麼？

### 規劃註記
- 需要什麼資源？
- 需要考慮哪些風險？
`,
        'issue.standard': `
分析此問題並提供關於重要事項的指導。
考慮：

### 問題分析
- 核心問題是什麼？
- 什麼背景很重要？

### 技術審查
- 涉及系統的哪些部分？
- 應該考慮哪些方法？
- 可能的解決方案是什麼？

### 實作指南
- 需要哪些步驟？
- 應該測試什麼？
- 技術限制是什麼？

### 影響評估
- 哪些區域會受影響？
- 需要考慮哪些副作用？
- 需要什麼預防措施？

### 審查要求
- 需要什麼文件？
- 需要測試什麼？
- 有哪些重大變更？
`
    };

    return prompts[type] || '';
};