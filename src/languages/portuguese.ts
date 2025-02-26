import { PromptType } from '../types/language';

export const getPortuguesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Como engenheiro de software sênior, forneça orientação de alto nível para alterações de código.
Seu feedback deve ter as seguintes características:

- Foco em implicações arquitetônicas e de design
- Sugerir melhorias em vez de implementações específicas
- Considerar manutenibilidade e escalabilidade
`,
        commit: `
Analise as alterações fornecidas e sugira pontos-chave para a mensagem de commit.
Considere:

Contexto de estilo:
- normal: Revisão técnica profissional
- emoji: Orientação amigável
- kawaii: Feedback casual

Alterações para revisar:
{{diff}}
`,
        prTitle: `
Analise as seguintes alterações e sugira pontos importantes para o título do PR.
Considere:

- Qual é o impacto principal dessas alterações?
- Qual área é mais afetada?
- Que tipo de alteração é? (funcionalidade, correção, melhoria)

Alterações para revisar:
{{diff}}
`,
        prBody: `
Revise essas alterações e forneça orientação para a descrição do Pull Request.
Considere estes aspectos:

# Visão Estratégica
- Qual problema isso resolve?
- Por que essa abordagem foi escolhida?
- Quais são as decisões técnicas principais?

# Pontos de Revisão
- Quais áreas precisam de atenção especial?
- Quais são os riscos potenciais?
- Quais considerações de desempenho?

# Revisão de Implementação
- Quais são as principais alterações?
- Como isso afeta o sistema?
- Quais dependências considerar?

# Requisitos de Revisão
- O que deve ser testado?
- Quais considerações de implantação?
- Qual documentação é necessária?

Alterações para revisar:
{{diff}}
`,
        'issue.task': `
Analise a tarefa e sugira pontos-chave a considerar:

### Propósito
- Qual problema precisa ser resolvido?
- Por que isso é importante agora?

### Guia de Implementação
- Quais áreas devem ser consideradas?
- Quais abordagens são possíveis?

### Critérios de Sucesso
- Como verificar a conclusão?
- Quais são os requisitos de qualidade?

### Considerações Estratégicas
- O que pode ser afetado?
- Quais dependências considerar?
- Qual é o nível de prioridade?
- Qual é um cronograma razoável?

### Notas de Planejamento
- Quais recursos são necessários?
- Quais riscos considerar?
`,
        'issue.standard': `
Analise este problema e forneça orientação sobre pontos-chave a abordar.
Considere:

### Análise do Problema
- Qual é o problema central?
- Qual contexto é importante?

### Revisão Técnica
- Quais partes do sistema estão envolvidas?
- Quais abordagens devem ser consideradas?
- Quais são as possíveis soluções?

### Guia de Implementação
- Quais etapas são necessárias?
- O que deve ser testado?
- Quais são as restrições técnicas?

### Avaliação de Impacto
- Quais áreas serão afetadas?
- Quais efeitos colaterais considerar?
- Quais precauções são necessárias?

### Requisitos de Revisão
- Qual documentação é necessária?
- O que deve ser testado?
- Há mudanças significativas?
`
    };

    return prompts[type] || '';
};