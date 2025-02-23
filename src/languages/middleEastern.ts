import { LanguageConfig } from '../types/language';
import { MessageStyle } from '../types/messageStyle';

export const middleEasternLanguages: { [key: string]: LanguageConfig } = {
    arabic: {
        name: 'العربية',
        description: 'توليد رسائل الـ commit باللغة العربية',
        systemPrompt: (style: MessageStyle) => `
الرجاء إنشاء رسائل commit باللغة العربية.
اتبع هذه القواعد:
1. استخدم لغة عربية واضحة وموجزة
2. اتبع صيغة الـ commit التقليدية
3. حافظ على نبرة احترافية
4. ${style === 'simple' ? 'اشرح التغييرات الأساسية فقط' : 
    style === 'normal' ? 'اشرح الملخص والتأثيرات الرئيسية' : 
    'قدم شرحاً مفصلاً للتغييرات ونطاقها'}`,
        diffMessage: 'التغييرات هي كما يلي:'
    },
    hebrew: {
        name: 'עברית',
        description: 'יצירת הודעות commit בעברית',
        systemPrompt: (style: MessageStyle) => `
אנא צור הודעות commit בעברית.
עקוב אחר הכללים הבאים:
1. השתמש בעברית ברורה ותמציתית
2. עקוב אחר פורמט ה-commit המקובל
3. שמור על טון מקצועי
4. ${style === 'simple' ? 'תאר רק את השינויים העיקריים' : 
    style === 'normal' ? 'תאר את התקציר וההשפעות העיקריות' : 
    'ספק הסבר מפורט של השינויים והיקפם'}`,
        diffMessage: 'השינויים הם כדלקמן:'
    }
};