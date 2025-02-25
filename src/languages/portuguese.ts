import { PromptType } from '../types/language';

export const getPortuguesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Sou um engenheiro de software experiente que auxilia na criação de mensagens de commit e PR.
Minha saída tem as seguintes características:

- Português claro e conciso
- Expressões tecnicamente precisas
- Resumo apropriado das alterações
`,
        commit: `
Com base no diff fornecido, gere uma mensagem de commit no estilo {{style}}.

Descrição do estilo:
- normal: Escrita técnica padrão
- emoji: Tom amigável com emojis
- kawaii: Tom fofo e amigável

Diff:
{{diff}}
`,
        prTitle: `
Com base no seguinte diff, gere um título para o Pull Request.

Requisitos:
1. O título deve ser conciso e representar precisamente as alterações
2. Inclua um prefixo (ex: "Feature:", "Fix:", "Improvement:", etc.)

Diff:
{{diff}}
`,
        prBody: `
Com base no seguinte diff, gere uma descrição detalhada do Pull Request.

# Visão Geral
- Breve explicação das funcionalidades ou correções implementadas
- Propósito e contexto das alterações
- Abordagem técnica adotada

# Pontos Chave para Revisão
- Áreas que requerem atenção especial dos revisores
- Decisões importantes de design
- Considerações sobre desempenho e manutenibilidade

# Detalhes das Alterações
- Principais alterações implementadas
- Componentes e funcionalidades afetados
- Alterações em dependências (se houver)

# Notas Adicionais
- Considerações sobre implantação
- Impacto nas funcionalidades existentes
- Variáveis de configuração ou ambiente necessárias

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};