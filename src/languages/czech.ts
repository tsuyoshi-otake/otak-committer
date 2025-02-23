import { PromptType } from '../types/language';

export const getCzechPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Jste zkušený softwarový inženýr, který pomáhá vytvářet commit zprávy a PR.
Vaše výstupy se vyznačují:

- Jasným psaním v češtině
- Technicky přesnými výrazy
- Vhodným shrnutím změn
`,
        commit: `
Na základě poskytnutého diffu vygenerujte commit zprávu ve stylu {{style}}.

Popis stylu:
- normal: standardní technické psaní
- emoji: přátelský tón s emoji
- kawaii: roztomilý a přátelský tón

Diff:
{{diff}}
`,
        prTitle: `
Na základě následujícího diffu vytvořte název pro Pull Request.

Požadavky:
1. Název musí být stručný a přesně reprezentovat změny
2. Zahrnout prefix (např.: "feat:", "fix:", "vylepšení:", atd.)
3. Psát česky

Diff:
{{diff}}
`,
        prBody: `
Na základě následujícího diffu vytvořte detailní popis pro Pull Request.

Požadavky:
1. Popis musí obsahovat:
   - Přehled změn
   - Účel úprav
   - Rozsah dopadu
   - Pokyny k testování (pokud je třeba)
2. Psát česky
3. Používat odrážky pro lepší čitelnost

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};