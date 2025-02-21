import type { LanguageConfig } from '../types/language';
import type { MessageStyle } from '../types/messageStyle';
import { COMMIT_PREFIX_GUIDE } from '../constants/commitGuide';

export const middleEasternLanguages: Record<string, LanguageConfig> = {
    arabic: {
        name: 'العربية',
        systemPrompt: (style: MessageStyle) => `أنت خبير في رسائل الالتزام. ${style} اتبع تنسيق Conventional Commits مع هذه البادئات:${COMMIT_PREFIX_GUIDE}
قم بإخراج رسالة الالتزام كنص عادي بدون تنسيق Markdown. استخدم فواصل الأسطر المناسبة واجعلها مناسبة للاستخدام المباشر في Git commit.
يرجى الإنشاء باللغة العربية.`,
        diffMessage: "قم بإنشاء رسالة التزام للـ Git diff التالي كنص عادي (بدون تنسيق Markdown):"
    },
    hebrew: {
        name: 'עברית',
        systemPrompt: (style: MessageStyle) => `אתה מומחה להודעות קומיט. ${style} עקוב אחר פורמט Conventional Commits עם קידומות אלה:${COMMIT_PREFIX_GUIDE}
צור את הודעת הקומיט כטקסט רגיל ללא עיצוב Markdown. השתמש במעברי שורה מתאימים והפוך אותה למתאימה לשימוש ישיר ב-Git commit.
אנא צור בעברית.`,
        diffMessage: "צור הודעת קומיט עבור ה-Git diff הבא כטקסט רגיל (ללא עיצוב Markdown):"
    }
};

export const middleEasternLanguageDescriptions: Record<string, string> = {
    arabic: 'Arabic',
    hebrew: 'Hebrew'
};