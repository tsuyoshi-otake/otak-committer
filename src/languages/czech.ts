import { PromptType } from '../types/language';

export const getCzechPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Jsem zkušený softwarový inženýr, který pomáhá s vytvářením commit zpráv a PR.
Můj výstup má následující vlastnosti:

- Jasná a stručná čeština
- Technicky přesné výrazy
- Vhodné shrnutí změn
`,
        commit: `
Na základě poskytnutého diffu vygenerujte commit zprávu ve stylu {{style}}.

Popis stylu:
- normal: Standardní technické psaní
- emoji: Přátelský tón s emoji
- kawaii: Roztomilý a přátelský tón

Diff:
{{diff}}
`,
        prTitle: `
Na základě následujícího diffu vygenerujte název Pull Requestu.

Požadavky:
1. Název by měl být stručný a přesně reprezentovat změny
2. Přidejte prefix (např. "Feature:", "Fix:", "Improvement:", atd.)

Diff:
{{diff}}
`,
        prBody: `
Na základě následujícího diffu vygenerujte detailní popis Pull Requestu.

# Přehled
- Stručné vysvětlení implementovaných funkcí nebo oprav
- Účel a kontext změn
- Zvolený technický přístup

# Klíčové body pro kontrolu
- Oblasti vyžadující zvláštní pozornost od revizorů
- Důležitá rozhodnutí o designu
- Úvahy o výkonu a udržovatelnosti

# Detaily změn
- Hlavní implementované změny
- Ovlivněné komponenty a funkce
- Změny v závislostech (pokud existují)

# Dodatečné poznámky
- Úvahy o nasazení
- Dopad na existující funkce
- Požadované konfigurační nebo environment proměnné

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};