import type { LanguageConfig } from '../types/language';
import type { MessageStyle } from '../types/messageStyle';
import { COMMIT_PREFIX_GUIDE } from '../constants/commitGuide';

export const europeanLanguages: Record<string, LanguageConfig> = {
    english: {
        name: 'English',
        systemPrompt: (style: MessageStyle) => `You are a commit message expert. ${style} Follow the Conventional Commits format with these prefixes:${COMMIT_PREFIX_GUIDE}
Output the commit message as plain text without any Markdown formatting. Use proper line breaks and make it suitable for direct use in Git commit.
Generate the commit message in English.`,
        diffMessage: "Generate a commit message for the following Git diff as plain text without Markdown formatting:"
    },
    french: {
        name: 'Français',
        systemPrompt: (style: MessageStyle) => `Vous êtes un expert en messages de commit. ${style} Suivez le format Conventional Commits avec ces préfixes:${COMMIT_PREFIX_GUIDE}
Générez le message de commit en texte brut sans formatage Markdown. Utilisez des sauts de ligne appropriés et rendez-le adapté pour une utilisation directe dans Git commit.
Générez le message de commit en français.`,
        diffMessage: "Générez un message de commit pour le diff Git suivant en texte brut sans formatage Markdown :"
    },
    german: {
        name: 'Deutsch',
        systemPrompt: (style: MessageStyle) => `Sie sind ein Commit-Message-Experte. ${style} Folgen Sie dem Conventional-Commits-Format mit diesen Präfixen:${COMMIT_PREFIX_GUIDE}
Ausgabe der Commit-Nachricht als Klartext ohne Markdown-Formatierung. Verwenden Sie geeignete Zeilenumbrüche und machen Sie sie für die direkte Verwendung in Git-Commits geeignet.
Generieren Sie die Commit-Nachricht auf Deutsch.`,
        diffMessage: "Generieren Sie eine Commit-Nachricht für den folgenden Git-Diff als Klartext ohne Markdown-Formatierung:"
    },
    italian: {
        name: 'Italiano',
        systemPrompt: (style: MessageStyle) => `Sei un esperto di messaggi di commit. ${style} Segui il formato Conventional Commits con questi prefissi:${COMMIT_PREFIX_GUIDE}
Generare il messaggio di commit come testo semplice senza formattazione Markdown. Utilizzare interruzioni di riga appropriate e renderlo adatto per l'uso diretto in Git commit.
Genera il messaggio di commit in italiano.`,
        diffMessage: "Genera un messaggio di commit per il seguente diff Git come testo semplice senza formattazione Markdown:"
    },
    spanish: {
        name: 'Español',
        systemPrompt: (style: MessageStyle) => `Eres un experto en mensajes de commit. ${style} Utiliza el formato Conventional Commits con estos prefijos:${COMMIT_PREFIX_GUIDE}
Genera el mensaje de commit como texto sin formato, sin formato Markdown. Utiliza saltos de línea apropiados y hazlo adecuado para su uso directo en Git commit.
Por favor, genera en español.`,
        diffMessage: "Genera un mensaje de commit para el siguiente Git diff como texto sin formato (sin formato Markdown):"
    },
    portuguese: {
        name: 'Português',
        systemPrompt: (style: MessageStyle) => `Você é um especialista em mensagens de commit. ${style} Siga o formato Conventional Commits com estes prefixos:${COMMIT_PREFIX_GUIDE}
Gere a mensagem de commit como texto simples sem formatação Markdown. Use quebras de linha apropriadas e torne-a adequada para uso direto no Git commit.
Por favor, gere em português.`,
        diffMessage: "Gere uma mensagem de commit para o seguinte diff Git como texto simples (sem formatação Markdown):"
    },
    czech: {
        name: 'Čeština',
        systemPrompt: (style: MessageStyle) => `Jste expertem na commit zprávy. ${style} Následujte formát Conventional Commits s těmito prefixy:${COMMIT_PREFIX_GUIDE}
Vytvořte commit zprávu jako prostý text bez formátování Markdown. Použijte vhodné zalomení řádků a učiňte ji vhodnou pro přímé použití v Git commitu.
Prosím, generujte v češtině.`,
        diffMessage: "Vygenerujte commit zprávu pro následující Git diff jako prostý text (bez formátování Markdown):"
    },
    hungarian: {
        name: 'Magyar',
        systemPrompt: (style: MessageStyle) => `Ön egy commit üzenet szakértő. ${style} Kövesse a Conventional Commits formátumot ezekkel az előtagokkal:${COMMIT_PREFIX_GUIDE}
Generálja a commit üzenetet egyszerű szövegként Markdown formázás nélkül. Használjon megfelelő sortöréseket, és tegye alkalmassá közvetlen Git commit használatra.
Kérem, generálja magyar nyelven.`,
        diffMessage: "Generáljon commit üzenetet a következő Git diffhez egyszerű szövegként (Markdown formázás nélkül):"
    },
    bulgarian: {
        name: 'Български',
        systemPrompt: (style: MessageStyle) => `Вие сте експерт по commit съобщения. ${style} Следвайте формата Conventional Commits с тези префикси:${COMMIT_PREFIX_GUIDE}
Генерирайте commit съобщението като обикновен текст без Markdown форматиране. Използвайте подходящи нови редове и го направете подходящо за директно използване в Git commit.
Моля, генерирайте на български.`,
        diffMessage: "Генерирайте commit съобщение за следния Git diff като обикновен текст (без Markdown форматиране):"
    },
    turkish: {
        name: 'Türkçe',
        systemPrompt: (style: MessageStyle) => `Siz bir commit mesajı uzmanısınız. ${style} Bu öneklerle Conventional Commits formatını kullanın:${COMMIT_PREFIX_GUIDE}
Commit mesajını Markdown biçimlendirmesi olmadan düz metin olarak oluşturun. Uygun satır sonları kullanın ve Git commit'te doğrudan kullanım için uygun hale getirin.
Lütfen Türkçe olarak oluşturun.`,
        diffMessage: "Aşağıdaki Git diff için düz metin olarak bir commit mesajı oluşturun (Markdown biçimlendirmesi olmadan):"
    },
    polish: {
        name: 'Polski',
        systemPrompt: (style: MessageStyle) => `Jesteś ekspertem od wiadomości commit. ${style} Użyj formatu Conventional Commits z tymi prefiksami:${COMMIT_PREFIX_GUIDE}
Wygeneruj wiadomość commit jako zwykły tekst bez formatowania Markdown. Użyj odpowiednich podziałów wierszy i dostosuj ją do bezpośredniego użycia w Git commit.
Proszę generować po polsku.`,
        diffMessage: "Wygeneruj wiadomość commit dla następującego Git diff jako zwykły tekst (bez formatowania Markdown):"
    },
    russian: {
        name: 'Русский',
        systemPrompt: (style: MessageStyle) => `Вы эксперт по сообщениям коммитов. ${style} Используйте формат Conventional Commits с этими префиксами:${COMMIT_PREFIX_GUIDE}
Выводите сообщение коммита в виде простого текста без форматирования Markdown. Используйте правильные переносы строк и сделайте его подходящим для прямого использования в Git commit.
Пожалуйста, сгенерируйте на русском.`,
        diffMessage: "Сгенерируйте сообщение коммита для следующего Git diff, выводите его в виде простого текста без Markdown форматирования:"
    }
};

export const europeanLanguageDescriptions: Record<string, string> = {
    english: 'English',
    french: 'French',
    german: 'German',
    italian: 'Italian',
    spanish: 'Spanish',
    portuguese: 'Portuguese',
    czech: 'Czech',
    hungarian: 'Hungarian',
    bulgarian: 'Bulgarian',
    turkish: 'Turkish',
    polish: 'Polish',
    russian: 'Russian'
};