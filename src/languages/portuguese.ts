import { PromptType } from '../types/language';

export const getPortuguesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Você é um engenheiro de software experiente que ajuda a criar mensagens de commit e PRs.
Suas respostas são caracterizadas por:

- Escrita clara em português
- Expressões tecnicamente precisas
- Resumo apropriado das alterações
`,
        commit: `
Com base no diff fornecido, gere uma mensagem de commit no estilo {{style}}.

Descrição do estilo:
- normal: escrita técnica padrão
- emoji: tom amigável com emojis
- kawaii: tom fofo e amigável

Diff:
{{diff}}
`,
        prTitle: `
Com base no seguinte diff, crie um título para o Pull Request.

Requisitos:
1. O título deve ser conciso e representar precisamente as alterações
2. Incluir um prefixo (ex.: "feat:", "fix:", "melhoria:", etc.)
3. Escrever em português

Diff:
{{diff}}
`,
        prBody: `
Com base no seguinte diff, crie uma descrição detalhada para o Pull Request.

Requisitos:
1. A descrição deve incluir:
   - Visão geral das alterações
   - Propósito das modificações
   - Escopo do impacto
   - Instruções de teste (se necessário)
2. Escrever em português
3. Usar marcadores para melhorar a legibilidade

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};