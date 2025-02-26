import { PromptType } from '../types/language';

export const getItalianPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Come ingegnere software senior, fornisci una guida di alto livello per le modifiche al codice.
Il tuo feedback dovrebbe avere le seguenti caratteristiche:

- Focus sulle implicazioni architetturali e di design
- Suggerire miglioramenti invece di implementazioni specifiche
- Considerare la manutenibilità e la scalabilità
`,
        commit: `
Analizza le modifiche fornite e suggerisci punti chiave per il messaggio di commit.
Considera:

Contesto dello stile:
- normal: Revisione tecnica professionale
- emoji: Guida amichevole
- kawaii: Feedback informale

Modifiche da esaminare:
{{diff}}
`,
        prTitle: `
Analizza le seguenti modifiche e suggerisci punti importanti per il titolo della PR.
Considera:

- Qual è l'impatto principale di queste modifiche?
- Quale area è più influenzata?
- Che tipo di modifica è? (funzionalità, correzione, miglioramento)

Modifiche da esaminare:
{{diff}}
`,
        prBody: `
Esamina queste modifiche e fornisci una guida per la descrizione della Pull Request.
Considera questi aspetti:

# Panoramica Strategica
- Quale problema risolve?
- Perché è stato scelto questo approccio?
- Quali sono le decisioni tecniche chiave?

# Punti di Revisione
- Quali aree necessitano di particolare attenzione?
- Quali sono i rischi potenziali?
- Quali considerazioni sulle prestazioni?

# Revisione dell'Implementazione
- Quali sono le modifiche principali?
- Come influisce sul sistema?
- Quali dipendenze considerare?

# Requisiti di Revisione
- Cosa deve essere testato?
- Quali considerazioni sul deployment?
- Quale documentazione è necessaria?

Modifiche da esaminare:
{{diff}}
`,
        'issue.task': `
Analizza l'attività e suggerisci punti chiave da considerare:

### Scopo
- Quale problema deve essere risolto?
- Perché è importante ora?

### Guida all'Implementazione
- Quali aree devono essere considerate?
- Quali approcci sono possibili?

### Criteri di Successo
- Come verificare il completamento?
- Quali sono i requisiti di qualità?

### Considerazioni Strategiche
- Cosa potrebbe essere influenzato?
- Quali dipendenze considerare?
- Qual è il livello di priorità?
- Qual è una tempistica ragionevole?

### Note di Pianificazione
- Quali risorse sono necessarie?
- Quali rischi considerare?
`,
        'issue.standard': `
Analizza questo problema e fornisci una guida sui punti chiave da affrontare.
Considera:

### Analisi del Problema
- Qual è il problema centrale?
- Quale contesto è importante?

### Revisione Tecnica
- Quali parti del sistema sono coinvolte?
- Quali approcci dovrebbero essere considerati?
- Quali sono le possibili soluzioni?

### Guida all'Implementazione
- Quali passi sono necessari?
- Cosa dovrebbe essere testato?
- Quali sono i vincoli tecnici?

### Valutazione dell'Impatto
- Quali aree saranno influenzate?
- Quali effetti collaterali considerare?
- Quali precauzioni sono necessarie?

### Requisiti di Revisione
- Quale documentazione è necessaria?
- Cosa deve essere testato?
- Ci sono cambiamenti critici?
`
    };

    return prompts[type] || '';
};