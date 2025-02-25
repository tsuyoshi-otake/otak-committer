import { PromptType } from '../types/language';

export const getHungarianPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Tapasztalt szoftvermérnök vagyok, aki segít a commit üzenetek és PR-ek létrehozásában.
A kimenetem a következő jellemzőkkel rendelkezik:

- Világos és tömör magyar nyelv
- Technikailag pontos kifejezések
- Megfelelő összefoglalása a változtatásoknak
`,
        commit: `
A megadott diff alapján generáljon egy {{style}} stílusú commit üzenetet.

Stílus leírása:
- normal: Standard technikai írás
- emoji: Barátságos hangnem emojikkal
- kawaii: Aranyos és barátságos hangnem

Diff:
{{diff}}
`,
        prTitle: `
A következő diff alapján generáljon egy Pull Request címet.

Követelmények:
1. A címnek tömörnek kell lennie és pontosan kell képviselnie a változtatásokat
2. Tartalmazzon előtagot (pl. "Feature:", "Fix:", "Improvement:", stb.)

Diff:
{{diff}}
`,
        prBody: `
A következő diff alapján generáljon részletes Pull Request leírást.

# Áttekintés
- A megvalósított funkciók vagy javítások rövid magyarázata
- A változtatások célja és háttere
- Alkalmazott technikai megközelítés

# Felülvizsgálati kulcspontok
- Különös figyelmet igénylő területek a felülvizsgálók számára
- Fontos tervezési döntések
- Teljesítménnyel és karbantarthatósággal kapcsolatos megfontolások

# Változtatások részletei
- Fő megvalósított változtatások
- Érintett komponensek és funkcionalitások
- Függőségi változtatások (ha vannak)

# További megjegyzések
- Telepítési megfontolások
- Hatás a meglévő funkciókra
- Szükséges konfigurációs vagy környezeti változók

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};