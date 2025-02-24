import { PromptType } from '../types/language';

export const getItalianPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Sei un ingegnere software esperto che aiuta a creare messaggi di commit e PR.
Le tue risposte sono caratterizzate da:

- Scrittura chiara in italiano
- Espressioni tecnicamente precise
- Riassunto appropriato delle modifiche
`,
        commit: `
In base al diff fornito, genera un messaggio di commit nello stile {{style}}.

Descrizione dello stile:
- normal: scrittura tecnica standard
- emoji: tono amichevole con emoji
- kawaii: tono carino e amichevole

Diff:
{{diff}}
`,
        prTitle: `
In base al seguente diff, crea un titolo per la Pull Request.

Requisiti:
1. Il titolo deve essere conciso e rappresentare accuratamente le modifiche
2. Includere un prefisso (es.: "feat:", "fix:", "miglioramento:", ecc.)
3. Scrivere in italiano

Diff:
{{diff}}
`,
        prBody: `
In base al seguente diff, crea una descrizione dettagliata per la Pull Request.

Requisiti:
1. La descrizione deve includere:
   - Panoramica delle modifiche
   - Scopo delle modifiche
   - Portata dell'impatto
   - Istruzioni per il test (se necessario)
2. Scrivere in italiano
3. Utilizzare elenchi puntati per migliorare la leggibilità

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};