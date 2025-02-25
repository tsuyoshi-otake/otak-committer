import { PromptType } from '../types/language';

export const getItalianPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Sono un ingegnere software esperto che assiste nella creazione di messaggi di commit e PR.
Il mio output ha le seguenti caratteristiche:

- Italiano chiaro e conciso
- Espressioni tecnicamente accurate
- Sintesi appropriata delle modifiche
`,
        commit: `
In base al diff fornito, genera un messaggio di commit in stile {{style}}.

Descrizione dello stile:
- normal: Scrittura tecnica standard
- emoji: Tono amichevole con emoji
- kawaii: Tono carino e amichevole

Diff:
{{diff}}
`,
        prTitle: `
In base al seguente diff, genera un titolo per la Pull Request.

Requisiti:
1. Il titolo deve essere conciso e rappresentare accuratamente le modifiche
2. Includi un prefisso (es. "Feature:", "Fix:", "Improvement:", ecc.)

Diff:
{{diff}}
`,
        prBody: `
In base al seguente diff, genera una descrizione dettagliata della Pull Request.

# Panoramica
- Breve spiegazione delle funzionalità o correzioni implementate
- Scopo e contesto delle modifiche
- Approccio tecnico adottato

# Punti chiave per la revisione
- Aree che richiedono particolare attenzione dai revisori
- Decisioni importanti di progettazione
- Considerazioni su prestazioni e manutenibilità

# Dettagli delle modifiche
- Principali modifiche implementate
- Componenti e funzionalità interessate
- Modifiche alle dipendenze (se presenti)

# Note aggiuntive
- Considerazioni sul deployment
- Impatto sulle funzionalità esistenti
- Variabili di configurazione o ambiente richieste

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};