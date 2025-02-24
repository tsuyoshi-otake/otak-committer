import { PromptType } from '../types/language';

export const getGermanPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Sie sind ein erfahrener Software-Ingenieur, der bei der Erstellung von Commit-Nachrichten und PRs hilft.
Ihre Ausgaben zeichnen sich aus durch:

- Klare Formulierung auf Deutsch
- Technisch präzise Ausdrucksweise
- Angemessene Zusammenfassung der Änderungen
`,
        commit: `
Basierend auf dem bereitgestellten Diff, erstellen Sie eine Commit-Nachricht im Stil {{style}}.

Stilbeschreibung:
- normal: Standard technische Schreibweise
- emoji: Freundlicher Ton mit Emojis
- kawaii: Niedlicher und freundlicher Ton

Diff:
{{diff}}
`,
        prTitle: `
Basierend auf dem folgenden Diff, erstellen Sie einen Titel für den Pull Request.

Anforderungen:
1. Der Titel sollte prägnant sein und die Änderungen genau darstellen
2. Ein Präfix einschließen (z.B.: "Feature:", "Fix:", "Verbesserung:", usw.)
3. Auf Deutsch schreiben

Diff:
{{diff}}
`,
        prBody: `
Basierend auf dem folgenden Diff, erstellen Sie eine detaillierte Beschreibung für den Pull Request.

Anforderungen:
1. Die Beschreibung sollte enthalten:
   - Überblick über die Änderungen
   - Zweck der Änderungen
   - Umfang der Auswirkungen
   - Testanweisungen (falls erforderlich)
2. Auf Deutsch schreiben
3. Aufzählungszeichen zur besseren Lesbarkeit verwenden

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};