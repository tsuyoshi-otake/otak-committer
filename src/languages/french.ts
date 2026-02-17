import { PromptType } from '../types/enums/PromptType';

export const getFrenchPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
En tant qu'ingénieur logiciel senior, fournissez des conseils de haut niveau pour les modifications de code.
Vos retours doivent avoir les caractéristiques suivantes :

- Focus sur les implications architecturales et de conception
- Suggérer des améliorations plutôt que des implémentations spécifiques
- Considérer la maintenabilité et l'évolutivité
`,
        commit: `
Analysez les modifications fournies et suggérez des points clés pour le message de commit.
Considérez :

Contexte de style :
- normal : Revue technique professionnelle
- emoji : Conseils conviviaux
- kawaii : Retour décontracté

Modifications à examiner :
{{diff}}
`,
        prTitle: `
Analysez les modifications suivantes et suggérez des points importants pour le titre de la PR.
Considérez :

- Quel est l'impact principal de ces modifications ?
- Quelle zone est la plus affectée ?
- Quel type de changement est-ce ? (fonctionnalité, correction, amélioration)

Modifications à examiner :
{{diff}}
`,
        prBody: `
Examinez ces modifications et fournissez des conseils pour la description de la Pull Request.
Considérez ces aspects :

# Aperçu Stratégique
- Quel problème cela résout-il ?
- Pourquoi cette approche a-t-elle été choisie ?
- Quelles sont les décisions techniques clés ?

# Points de Revue
- Quelles zones nécessitent une attention particulière ?
- Quels sont les risques potentiels ?
- Quelles considérations de performance ?

# Revue d'Implémentation
- Quels sont les changements principaux ?
- Comment cela affecte-t-il le système ?
- Quelles dépendances à considérer ?

# Exigences de Revue
- Que faut-il tester ?
- Quelles considérations de déploiement ?
- Quelle documentation est nécessaire ?

Modifications à examiner :
{{diff}}
`,
        'issue.task': `
Analysez la tâche et suggérez les points clés à considérer :

### Objectif
- Quel problème doit être résolu ?
- Pourquoi est-ce important maintenant ?

### Guide d'Implémentation
- Quelles zones doivent être considérées ?
- Quelles approches sont possibles ?

### Critères de Réussite
- Comment vérifier l'achèvement ?
- Quelles sont les exigences de qualité ?

### Considérations Stratégiques
- Qu'est-ce qui pourrait être impacté ?
- Quelles dépendances à considérer ?
- Quel niveau de priorité ?
- Quel calendrier raisonnable ?

### Notes de Planification
- Quelles ressources sont nécessaires ?
- Quels risques à considérer ?
`,
        'issue.standard': `
Analysez ce problème et fournissez des conseils sur les points clés à aborder.
Considérez :

### Analyse du Problème
- Quel est le problème central ?
- Quel contexte est important ?

### Revue Technique
- Quelles parties du système sont impliquées ?
- Quelles approches devraient être considérées ?
- Quelles sont les solutions possibles ?

### Guide d'Implémentation
- Quelles étapes sont nécessaires ?
- Que faut-il tester ?
- Quelles sont les contraintes techniques ?

### Évaluation d'Impact
- Quelles zones seront affectées ?
- Quels effets secondaires à considérer ?
- Quelles précautions sont nécessaires ?

### Exigences de Revue
- Quelle documentation est nécessaire ?
- Que faut-il tester ?
- Y a-t-il des changements importants ?
`,
    };

    return prompts[type] || '';
};
