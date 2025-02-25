import { PromptType } from '../types/language';

export const getFrenchPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Je suis un ingénieur logiciel expérimenté qui aide à la création de messages de commit et de PR.
Ma sortie a les caractéristiques suivantes :

- Français clair et concis
- Expressions techniquement précises
- Résumé approprié des changements
`,
        commit: `
En fonction du diff fourni, générez un message de commit de style {{style}}.

Description du style :
- normal : Écriture technique standard
- emoji : Ton amical avec émojis
- kawaii : Ton mignon et amical

Diff :
{{diff}}
`,
        prTitle: `
En fonction du diff suivant, générez un titre de Pull Request.

Exigences :
1. Le titre doit être concis et représenter précisément les changements
2. Inclure un préfixe (par exemple, "Feature:", "Fix:", "Improvement:", etc.)

Diff :
{{diff}}
`,
        prBody: `
En fonction du diff suivant, générez une description détaillée de Pull Request.

# Aperçu
- Brève explication des fonctionnalités ou corrections implémentées
- Objectif et contexte des changements
- Approche technique adoptée

# Points clés de revue
- Zones nécessitant une attention particulière des relecteurs
- Décisions de conception importantes
- Considérations de performance et de maintenabilité

# Détails des changements
- Principaux changements implémentés
- Composants et fonctionnalités affectés
- Changements de dépendances (le cas échéant)

# Notes additionnelles
- Considérations de déploiement
- Impact sur les fonctionnalités existantes
- Variables de configuration ou d'environnement requises

Diff :
{{diff}}
`
    };

    return prompts[type] || '';
};