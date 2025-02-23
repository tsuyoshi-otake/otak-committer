import { PromptType } from '../types/language';

export const getHungarianPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Ön egy tapasztalt szoftvermérnök, aki segít a commit üzenetek és PR-ek létrehozásában.
Kimeneteit a következők jellemzik:

- Világos fogalmazás magyar nyelven
- Technikailag pontos kifejezések
- Megfelelő összefoglalása a változtatásoknak
`,
        commit: `
A megadott diff alapján generáljon commit üzenetet {{style}} stílusban.

Stílus leírása:
- normal: standard technikai írás
- emoji: barátságos hangnem emojikkal
- kawaii: aranyos és barátságos hangnem

Diff:
{{diff}}
`,
        prTitle: `
Az alábbi diff alapján hozzon létre címet a Pull Request számára.

Követelmények:
1. A címnek tömörnek kell lennie és pontosan kell reprezentálnia a változtatásokat
2. Tartalmazzon előtagot (pl.: "feat:", "fix:", "fejlesztés:", stb.)
3. Magyar nyelven írjon

Diff:
{{diff}}
`,
        prBody: `
Az alábbi diff alapján hozzon létre részletes leírást a Pull Request számára.

Követelmények:
1. A leírásnak tartalmaznia kell:
   - A változtatások áttekintését
   - A módosítások célját
   - A hatás mértékét
   - Tesztelési útmutatót (ha szükséges)
2. Magyar nyelven írjon
3. Használjon felsorolásjeleket a jobb olvashatóság érdekében

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};