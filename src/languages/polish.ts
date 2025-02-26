import { PromptType } from '../types/language';

export const getPolishPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Jako doświadczony inżynier oprogramowania, zapewnij wskazówki wysokiego poziomu dotyczące zmian w kodzie.
Twoja informacja zwrotna powinna mieć następujące cechy:

- Skupienie na implikacjach architektonicznych i projektowych
- Sugerowanie ulepszeń zamiast konkretnych implementacji
- Uwzględnienie możliwości konserwacji i skalowalności
`,
        commit: `
Przeanalizuj wprowadzone zmiany i zaproponuj kluczowe punkty dla wiadomości commit.
Rozważ:

Kontekst stylu:
- normal: Profesjonalny przegląd techniczny
- emoji: Przyjazne wskazówki
- kawaii: Swobodna informacja zwrotna

Zmiany do przeglądu:
{{diff}}
`,
        prTitle: `
Przeanalizuj następujące zmiany i zaproponuj ważne punkty do tytułu PR.
Rozważ:

- Jaki jest główny wpływ tych zmian?
- Który obszar jest najbardziej dotknięty?
- Jaki to rodzaj zmiany? (funkcja, naprawa, ulepszenie)

Zmiany do przeglądu:
{{diff}}
`,
        prBody: `
Przejrzyj te zmiany i zapewnij wskazówki do opisu Pull Request.
Rozważ te aspekty:

# Przegląd Strategiczny
- Jaki problem to rozwiązuje?
- Dlaczego wybrano to podejście?
- Jakie są kluczowe decyzje techniczne?

# Punkty Przeglądu
- Które obszary wymagają szczególnej uwagi?
- Jakie są potencjalne ryzyka?
- Jakie aspekty wydajnościowe należy rozważyć?

# Przegląd Implementacji
- Jakie są główne zmiany?
- Jak wpływa to na system?
- Jakie zależności należy rozważyć?

# Wymagania Przeglądu
- Co należy przetestować?
- Jakie aspekty wdrożenia należy rozważyć?
- Jaka dokumentacja jest potrzebna?

Zmiany do przeglądu:
{{diff}}
`,
        'issue.task': `
Przeanalizuj zadanie i zaproponuj kluczowe punkty do rozważenia:

### Cel
- Jaki problem należy rozwiązać?
- Dlaczego to jest teraz ważne?

### Przewodnik Implementacji
- Jakie obszary należy rozważyć?
- Jakie podejścia są możliwe?

### Kryteria Sukcesu
- Jak zweryfikować ukończenie?
- Jakie są wymagania jakościowe?

### Rozważania Strategiczne
- Co może zostać dotknięte?
- Jakie zależności należy rozważyć?
- Jaki jest poziom priorytetu?
- Jaki jest rozsądny harmonogram?

### Uwagi do Planowania
- Jakie zasoby są potrzebne?
- Jakie ryzyka należy rozważyć?
`,
        'issue.standard': `
Przeanalizuj ten problem i zapewnij wskazówki dotyczące kluczowych punktów.
Rozważ:

### Analiza Problemu
- Jaki jest główny problem?
- Jaki kontekst jest ważny?

### Przegląd Techniczny
- Które części systemu są zaangażowane?
- Jakie podejścia należy rozważyć?
- Jakie są możliwe rozwiązania?

### Przewodnik Implementacji
- Jakie kroki są potrzebne?
- Co należy przetestować?
- Jakie są ograniczenia techniczne?

### Ocena Wpływu
- Które obszary zostaną dotknięte?
- Jakie efekty uboczne należy rozważyć?
- Jakie środki ostrożności są potrzebne?

### Wymagania Przeglądu
- Jaka dokumentacja jest potrzebna?
- Co należy przetestować?
- Czy są jakieś przełomowe zmiany?
`
    };

    return prompts[type] || '';
};