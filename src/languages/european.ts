import { LanguageConfig } from '../types/language';
import { MessageStyle } from '../types/messageStyle';

export const europeanLanguages: { [key: string]: LanguageConfig } = {
    english: {
        name: 'English',
        description: 'Generate commit messages in English',
        systemPrompt: (style: MessageStyle) => `
Please generate commit messages in English.
Follow these rules:
1. Use clear and concise English
2. Follow conventional commit format
3. Maintain professional tone
4. ${style === 'simple' ? 'Describe only core changes' : 
    style === 'normal' ? 'Describe summary and main impacts' : 
    'Provide detailed explanation of changes and their scope'}`,
        diffMessage: 'The changes are as follows:'
    },
    french: {
        name: 'Français',
        description: 'Générer des messages de commit en français',
        systemPrompt: (style: MessageStyle) => `
Veuillez générer des messages de commit en français.
Suivez ces règles:
1. Utilisez un français clair et concis
2. Suivez le format de commit conventionnel
3. Maintenez un ton professionnel
4. ${style === 'simple' ? 'Décrivez uniquement les changements principaux' : 
    style === 'normal' ? 'Décrivez le résumé et les impacts principaux' : 
    'Fournissez une explication détaillée des changements et leur portée'}`,
        diffMessage: 'Les changements sont les suivants:'
    },
    german: {
        name: 'Deutsch',
        description: 'Commit-Nachrichten auf Deutsch generieren',
        systemPrompt: (style: MessageStyle) => `
Bitte generieren Sie Commit-Nachrichten auf Deutsch.
Befolgen Sie diese Regeln:
1. Verwenden Sie klares und präzises Deutsch
2. Folgen Sie dem konventionellen Commit-Format
3. Behalten Sie einen professionellen Ton bei
4. ${style === 'simple' ? 'Beschreiben Sie nur die Kernänderungen' : 
    style === 'normal' ? 'Beschreiben Sie Zusammenfassung und Hauptauswirkungen' : 
    'Liefern Sie eine detaillierte Erklärung der Änderungen und ihrer Reichweite'}`,
        diffMessage: 'Die Änderungen sind wie folgt:'
    },
    italian: {
        name: 'Italiano',
        description: 'Generare messaggi di commit in italiano',
        systemPrompt: (style: MessageStyle) => `
Per favore genera messaggi di commit in italiano.
Segui queste regole:
1. Usa un italiano chiaro e conciso
2. Segui il formato convenzionale dei commit
3. Mantieni un tono professionale
4. ${style === 'simple' ? 'Descrivi solo le modifiche principali' : 
    style === 'normal' ? 'Descrivi il riepilogo e gli impatti principali' : 
    'Fornisci una spiegazione dettagliata delle modifiche e del loro ambito'}`,
        diffMessage: 'Le modifiche sono le seguenti:'
    },
    spanish: {
        name: 'Español',
        description: 'Generar mensajes de commit en español',
        systemPrompt: (style: MessageStyle) => `
Por favor, genera mensajes de commit en español.
Sigue estas reglas:
1. Usa español claro y conciso
2. Sigue el formato convencional de commits
3. Mantén un tono profesional
4. ${style === 'simple' ? 'Describe solo los cambios principales' : 
    style === 'normal' ? 'Describe el resumen y los impactos principales' : 
    'Proporciona una explicación detallada de los cambios y su alcance'}`,
        diffMessage: 'Los cambios son los siguientes:'
    },
    portuguese: {
        name: 'Português',
        description: 'Gerar mensagens de commit em português',
        systemPrompt: (style: MessageStyle) => `
Por favor, gere mensagens de commit em português.
Siga estas regras:
1. Use português claro e conciso
2. Siga o formato convencional de commit
3. Mantenha um tom profissional
4. ${style === 'simple' ? 'Descreva apenas as mudanças principais' : 
    style === 'normal' ? 'Descreva o resumo e os impactos principais' : 
    'Forneça uma explicação detalhada das mudanças e seu escopo'}`,
        diffMessage: 'As mudanças são as seguintes:'
    },
    czech: {
        name: 'Čeština',
        description: 'Generovat commit zprávy v češtině',
        systemPrompt: (style: MessageStyle) => `
Prosím, generujte commit zprávy v češtině.
Dodržujte tato pravidla:
1. Používejte jasnou a stručnou češtinu
2. Dodržujte konvenční formát commitu
3. Udržujte profesionální tón
4. ${style === 'simple' ? 'Popište pouze hlavní změny' : 
    style === 'normal' ? 'Popište shrnutí a hlavní dopady' : 
    'Poskytněte detailní vysvětlení změn a jejich rozsahu'}`,
        diffMessage: 'Změny jsou následující:'
    },
    hungarian: {
        name: 'Magyar',
        description: 'Commit üzenetek generálása magyarul',
        systemPrompt: (style: MessageStyle) => `
Kérem, generáljon commit üzeneteket magyarul.
Kövesse ezeket a szabályokat:
1. Használjon világos és tömör magyar nyelvet
2. Kövesse a konvencionális commit formátumot
3. Tartsa meg a szakmai hangnemet
4. ${style === 'simple' ? 'Csak a fő változásokat írja le' : 
    style === 'normal' ? 'Írja le az összefoglalót és a fő hatásokat' : 
    'Adjon részletes magyarázatot a változásokról és azok hatóköréről'}`,
        diffMessage: 'A változások a következők:'
    },
    bulgarian: {
        name: 'Български',
        description: 'Генериране на commit съобщения на български',
        systemPrompt: (style: MessageStyle) => `
Моля, генерирайте commit съобщения на български.
Следвайте тези правила:
1. Използвайте ясен и кратък български език
2. Следвайте конвенционалния формат за commit
3. Поддържайте професионален тон
4. ${style === 'simple' ? 'Опишете само основните промени' : 
    style === 'normal' ? 'Опишете обобщението и основните въздействия' : 
    'Предоставете подробно обяснение на промените и техния обхват'}`,
        diffMessage: 'Промените са следните:'
    },
    turkish: {
        name: 'Türkçe',
        description: 'Commit mesajlarını Türkçe olarak oluştur',
        systemPrompt: (style: MessageStyle) => `
Lütfen commit mesajlarını Türkçe olarak oluşturun.
Bu kuralları takip edin:
1. Net ve özlü Türkçe kullanın
2. Geleneksel commit formatını takip edin
3. Profesyonel bir ton koruyun
4. ${style === 'simple' ? 'Yalnızca temel değişiklikleri açıklayın' : 
    style === 'normal' ? 'Özet ve ana etkileri açıklayın' : 
    'Değişikliklerin ve kapsamlarının detaylı açıklamasını verin'}`,
        diffMessage: 'Değişiklikler şu şekildedir:'
    },
    polish: {
        name: 'Polski',
        description: 'Generowanie komunikatów commit po polsku',
        systemPrompt: (style: MessageStyle) => `
Proszę generować komunikaty commit po polsku.
Przestrzegaj następujących zasad:
1. Używaj jasnego i zwięzłego języka polskiego
2. Przestrzegaj konwencjonalnego formatu commit
3. Zachowaj profesjonalny ton
4. ${style === 'simple' ? 'Opisz tylko główne zmiany' : 
    style === 'normal' ? 'Opisz podsumowanie i główne skutki' : 
    'Przedstaw szczegółowe wyjaśnienie zmian i ich zakresu'}`,
        diffMessage: 'Zmiany są następujące:'
    },
    russian: {
        name: 'Русский',
        description: 'Генерация сообщений commit на русском языке',
        systemPrompt: (style: MessageStyle) => `
Пожалуйста, создавайте сообщения commit на русском языке.
Следуйте этим правилам:
1. Используйте ясный и лаконичный русский язык
2. Следуйте общепринятому формату commit
3. Сохраняйте профессиональный тон
4. ${style === 'simple' ? 'Опишите только основные изменения' : 
    style === 'normal' ? 'Опишите сводку и основные воздействия' : 
    'Предоставьте подробное объяснение изменений и их области действия'}`,
        diffMessage: 'Изменения следующие:'
    }
};