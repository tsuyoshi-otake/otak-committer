import { PromptType } from '../types/language';

export const getGermanPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Als erfahrener Software-Ingenieur bieten Sie Beratung auf hoher Ebene für Code-Änderungen.
Ihr Feedback sollte folgende Eigenschaften aufweisen:

- Fokus auf architektonische und Design-Auswirkungen
- Verbesserungsvorschläge statt spezifischer Implementierungen
- Berücksichtigung von Wartbarkeit und Skalierbarkeit
`,
        commit: `
Analysieren Sie die bereitgestellten Änderungen und schlagen Sie Kernpunkte für die Commit-Nachricht vor.
Berücksichtigen Sie:

Stil-Kontext:
- normal: Professionelle technische Überprüfung
- emoji: Freundliche Anleitung
- kawaii: Lockeres Feedback

Zu überprüfende Änderungen:
{{diff}}
`,
        prTitle: `
Analysieren Sie die folgenden Änderungen und schlagen Sie wichtige Punkte für den PR-Titel vor.
Berücksichtigen Sie:

- Was ist die Hauptauswirkung dieser Änderungen?
- Welcher Bereich ist am stärksten betroffen?
- Um welche Art von Änderung handelt es sich? (Feature, Fix, Verbesserung)

Zu überprüfende Änderungen:
{{diff}}
`,
        prBody: `
Überprüfen Sie diese Änderungen und geben Sie Hinweise für die Pull Request-Beschreibung.
Berücksichtigen Sie diese Aspekte:

# Strategischer Überblick
- Welches Problem wird gelöst?
- Warum wurde dieser Ansatz gewählt?
- Was sind die wichtigsten technischen Entscheidungen?

# Überprüfungsschwerpunkte
- Welche Bereiche benötigen besondere Aufmerksamkeit?
- Welche potenziellen Risiken gibt es?
- Welche Leistungsaspekte sind zu berücksichtigen?

# Implementierungsüberprüfung
- Was sind die Hauptänderungen?
- Wie wirkt sich das auf das System aus?
- Welche Abhängigkeiten sind zu berücksichtigen?

# Prüfanforderungen
- Was muss getestet werden?
- Welche Bereitstellungsaspekte sind zu beachten?
- Welche Dokumentation wird benötigt?

Zu überprüfende Änderungen:
{{diff}}
`,
        'issue.task': `
Analysieren Sie die Aufgabe und schlagen Sie wichtige zu berücksichtigende Punkte vor:

### Zweck
- Welches Problem muss gelöst werden?
- Warum ist das jetzt wichtig?

### Implementierungsleitfaden
- Welche Bereiche müssen berücksichtigt werden?
- Welche Ansätze sind möglich?

### Erfolgskriterien
- Wie kann die Fertigstellung überprüft werden?
- Was sind die Qualitätsanforderungen?

### Strategische Überlegungen
- Was könnte betroffen sein?
- Welche Abhängigkeiten sind zu berücksichtigen?
- Wie hoch ist die Priorität?
- Was ist ein angemessener Zeitrahmen?

### Planungshinweise
- Welche Ressourcen werden benötigt?
- Welche Risiken sind zu berücksichtigen?
`,
        'issue.standard': `
Analysieren Sie dieses Problem und geben Sie Hinweise zu wichtigen Punkten.
Berücksichtigen Sie:

### Problemanalyse
- Was ist das Kernproblem?
- Welcher Kontext ist wichtig?

### Technische Überprüfung
- Welche Systemteile sind betroffen?
- Welche Ansätze sollten in Betracht gezogen werden?
- Was sind mögliche Lösungen?

### Implementierungsleitfaden
- Welche Schritte sind erforderlich?
- Was sollte getestet werden?
- Was sind die technischen Einschränkungen?

### Auswirkungsbeurteilung
- Welche Bereiche werden betroffen sein?
- Welche Nebenwirkungen sind zu berücksichtigen?
- Welche Vorsichtsmaßnahmen sind erforderlich?

### Prüfanforderungen
- Welche Dokumentation wird benötigt?
- Was muss getestet werden?
- Gibt es Breaking Changes?
`
    };

    return prompts[type] || '';
};