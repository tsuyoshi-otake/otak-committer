import { PromptType } from '../types/language';

export const getChinesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
您是一位经验丰富的软件工程师，协助项目的提交消息和PR创建。
您的输出具有以下特点：

- 简洁明了的中文
- 技术上准确的表达
- 适当总结变更内容
`,
        commit: `
根据提供的差异，生成{{style}}风格的提交消息。

风格说明：
- normal: 常规技术写作风格
- emoji: 包含表情符号的友好风格
- kawaii: 可爱友好的语气

差异：
{{diff}}
`,
        prTitle: `
根据以下差异，生成Pull Request标题。

要求：
1. 标题应简洁并准确表达更改内容
2. 使用中文编写
3. 包含前缀（例如："功能："、"修复："、"改进："等）

差异：
{{diff}}
`,
        prBody: `
根据以下差异，生成Pull Request详细说明。

要求：
1. 说明应包括：
   - 更改概述
   - 更改目的
   - 影响范围
   - 测试方法（如需要）
2. 使用中文编写
3. 使用项目符号提高可读性

差异：
{{diff}}
`
    };

    return prompts[type] || '';
};