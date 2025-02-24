import { PromptType } from '../types/language';

export const getFrenchPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Vous êtes un ingénieur logiciel expérimenté qui aide à créer des messages de commit et des PR.
Vos réponses sont caractérisées par :

- Une écriture claire en français
- Des expressions techniquement précises
- Un résumé approprié des changements
`,
        commit: `
En fonction du diff fourni, générez un message de commit dans le style {{style}}.

Description du style :
- normal : écriture technique standard
- emoji : ton amical avec emojis
- kawaii : ton mignon et amical

Diff :
{{diff}}
`,
        prTitle: `
Sur la base du diff suivant, créez un titre pour la Pull Request.

Exigences :
1. Le titre doit être concis et représenter précisément les changements
2. Inclure un préfixe (ex : "feat:", "fix:", "amélioration:", etc.)
3. Écrire en français

Diff :
{{diff}}
`,
        prBody: `
Sur la base du diff suivant, créez une description détaillée pour la Pull Request.

Exigences :
1. La description doit inclure :
   - Vue d'ensemble des changements
   - Objectif des modifications
   - Portée de l'impact
   - Instructions de test (si nécessaire)
2. Écrire en français
3. Utiliser des puces pour améliorer la lisibilité

Diff :
{{diff}}
`
    };

    return prompts[type] || '';
};