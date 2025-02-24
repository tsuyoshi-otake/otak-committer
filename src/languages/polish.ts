import { PromptType } from '../types/language';

export const getPolishPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Jesteś doświadczonym inżynierem oprogramowania, który pomaga tworzyć wiadomości commit i PR.
Twoje odpowiedzi charakteryzują się:

- Jasnym pisaniem w języku polskim
- Technicznie precyzyjnymi wyrażeniami
- Odpowiednim podsumowaniem zmian
`,
        commit: `
Na podstawie dostarczonego diff'a, wygeneruj wiadomość commit w stylu {{style}}.

Opis stylu:
- normal: standardowe pisanie techniczne
- emoji: przyjazny ton z emoji
- kawaii: słodki i przyjazny ton

Diff:
{{diff}}
`,
        prTitle: `
Na podstawie poniższego diff'a, utwórz tytuł dla Pull Request.

Wymagania:
1. Tytuł powinien być zwięzły i dokładnie reprezentować zmiany
2. Zawierać prefiks (np.: "feat:", "fix:", "ulepszenie:", itp.)
3. Pisać w języku polskim

Diff:
{{diff}}
`,
        prBody: `
Na podstawie poniższego diff'a, utwórz szczegółowy opis dla Pull Request.

Wymagania:
1. Opis powinien zawierać:
   - Przegląd zmian
   - Cel modyfikacji
   - Zakres wpływu
   - Instrukcje testowania (jeśli potrzebne)
2. Pisać w języku polskim
3. Używać punktorów dla lepszej czytelności

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};