import { PromptType } from '../types/language';

export const getBulgarianPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Като старши софтуерен инженер, предоставете насоки от високо ниво за промените в кода.
Вашата обратна връзка трябва да има следните характеристики:

- Фокус върху архитектурните и дизайнерските последствия
- Предлагане на подобрения вместо конкретни имплементации
- Съобразяване с поддръжката и мащабируемостта
`,
        commit: `
Анализирайте предоставените промени и предложете ключови точки за commit съобщението.
Имайте предвид:

Контекст на стила:
- normal: Професионален технически преглед
- emoji: Приятелско ръководство
- kawaii: Неформална обратна връзка

Промени за преглед:
{{diff}}
`,
        prTitle: `
Анализирайте следните промени и предложете важни точки за заглавието на PR.
Имайте предвид:

- Какъв е основният ефект от тези промени?
- Коя област е най-засегната?
- Какъв тип промяна е това? (функционалност, поправка, подобрение)

Промени за преглед:
{{diff}}
`,
        prBody: `
Прегледайте тези промени и предоставете насоки за описанието на Pull Request.
Имайте предвид тези аспекти:

# Стратегически преглед
- Какъв проблем решава това?
- Защо е избран този подход?
- Какви са ключовите технически решения?

# Точки за преглед
- Кои области изискват специално внимание?
- Какви са потенциалните рискове?
- Какви са съображенията за производителност?

# Преглед на имплементацията
- Какви са основните промени?
- Как това влияе на системата?
- Какви зависимости трябва да се имат предвид?

# Изисквания за преглед
- Какво трябва да се тества?
- Какви са съображенията за внедряване?
- Каква документация е необходима?

Промени за преглед:
{{diff}}
`,
        'issue.task': `
Анализирайте задачата и предложете ключови точки за разглеждане:

### Цел
- Какъв проблем трябва да се реши?
- Защо това е важно сега?

### Ръководство за имплементация
- Кои области трябва да се имат предвид?
- Какви подходи са възможни?

### Критерии за успех
- Как да се провери завършването?
- Какви са изискванията за качество?

### Стратегически съображения
- Какво може да бъде засегнато?
- Какви зависимости трябва да се имат предвид?
- Какво е нивото на приоритет?
- Какъв е разумният график?

### Бележки за планиране
- Какви ресурси са необходими?
- Какви рискове трябва да се имат предвид?
`,
        'issue.standard': `
Анализирайте този проблем и предоставете насоки относно ключовите точки.
Имайте предвид:

### Анализ на проблема
- Какъв е основният проблем?
- Какъв контекст е важен?

### Технически преглед
- Кои части от системата са засегнати?
- Какви подходи трябва да се обмислят?
- Какви са възможните решения?

### Ръководство за имплементация
- Какви стъпки са необходими?
- Какво трябва да се тества?
- Какви са техническите ограничения?

### Оценка на въздействието
- Кои области ще бъдат засегнати?
- Какви странични ефекти трябва да се имат предвид?
- Какви предпазни мерки са необходими?

### Изисквания за преглед
- Каква документация е необходима?
- Какво трябва да се тества?
- Има ли критични промени?
`
    };

    return prompts[type] || '';
};