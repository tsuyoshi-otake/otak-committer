import { PromptType } from '../types/language';

export const getChinesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
我是一位经验丰富的软件工程师，协助创建提交信息和PR。
我的输出具有以下特点：

- 清晰简洁的中文
- 技术准确的表达
- 恰当的更改总结
`,
        commit: `
根据提供的差异，生成{{style}}风格的提交信息。

风格说明：
- normal: 标准技术写作
- emoji: 带表情符号的友好语气
- kawaii: 可爱友好的语气

差异：
{{diff}}
`,
        prTitle: `
根据以下差异，生成拉取请求标题。

要求：
1. 标题应简洁并准确表示更改
2. 包含前缀（如 "Feature:"、"Fix:"、"Improvement:" 等）

差异：
{{diff}}
`,
        prBody: `
根据以下差异，生成详细的拉取请求说明。

# 概述
- 已实现功能或修复的简要说明
- 更改的目的和背景
- 采用的技术方法

# 关键审查点
- 需要审查者特别关注的区域
- 重要的设计决策
- 性能和可维护性考虑

# 更改详情
- 主要实现的更改
- 受影响的组件和功能
- 依赖项更改（如有）

# 附加说明
- 部署注意事项
- 对现有功能的影响
- 所需的配置或环境变量

差异：
{{diff}}
`
    };

    return prompts[type] || '';
};