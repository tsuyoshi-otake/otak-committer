import { PromptType } from '../types/language';

export const getGermanPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Ich bin ein erfahrener Softwareentwickler, der bei der Erstellung von Commit-Nachrichten und PRs unterstützt.
Meine Ausgabe hat folgende Eigenschaften:

- Klares und präzises Deutsch
- Technisch akkurate Ausdrücke
- Angemessene Zusammenfassung der Änderungen
`,
        commit: `
Basierend auf dem bereitgestellten Diff, generieren Sie eine {{style}} Commit-Nachricht.

Stilbeschreibung:
- normal: Standard technische Schreibweise
- emoji: Freundlicher Ton mit Emojis
- kawaii: Niedlicher und freundlicher Ton

Diff:
{{diff}}
`,
        prTitle: `
Basierend auf dem folgenden Diff, generieren Sie einen Pull Request Titel.

Anforderungen:
1. Der Titel sollte prägnant sein und die Änderungen genau darstellen
2. Fügen Sie ein Präfix hinzu (z.B. "Feature:", "Fix:", "Improvement:", etc.)

Diff:
{{diff}}
`,
        prBody: `
Basierend auf dem folgenden Diff, generieren Sie eine detaillierte Pull Request Beschreibung.

# Überblick
- Kurze Erklärung der implementierten Funktionen oder Korrekturen
- Zweck und Hintergrund der Änderungen
- Gewählter technischer Ansatz

# Wichtige Überprüfungspunkte
- Bereiche, die besondere Aufmerksamkeit der Reviewer erfordern
- Wichtige Design-Entscheidungen
- Überlegungen zu Leistung und Wartbarkeit

# Änderungsdetails
- Hauptsächlich implementierte Änderungen
- Betroffene Komponenten und Funktionalitäten
- Änderungen an Abhängigkeiten (falls vorhanden)

# Zusätzliche Hinweise
- Überlegungen zur Bereitstellung
- Auswirkungen auf bestehende Funktionen
- Erforderliche Konfigurations- oder Umgebungsvariablen

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};