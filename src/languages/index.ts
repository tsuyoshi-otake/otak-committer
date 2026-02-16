type EuropeanLanguages = 
    | 'french'
    | 'german'
    | 'italian'
    | 'spanish'
    | 'portuguese'
    | 'czech'
    | 'hungarian'
    | 'bulgarian'
    | 'turkish'
    | 'polish'
    | 'russian';

type AsianLanguages = 
    | 'chinese'
    | 'traditionalChinese'
    | 'korean'
    | 'vietnamese'
    | 'thai'
    | 'hindi'
    | 'bengali'
    | 'javanese'
    | 'tamil'
    | 'burmese';

type MiddleEasternLanguages = 
    | 'arabic'
    | 'hebrew';

export type SupportedLanguage = 
    | 'english'
    | 'japanese'
    | EuropeanLanguages
    | AsianLanguages
    | MiddleEasternLanguages;

export interface LanguageConfig {
    name: string;
    label: string;
    description: string;
    isRTL?: boolean;
}

export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
    english: { name: 'English', label: 'English', description: 'English' },
    
    // Japanese
    japanese: { name: 'Japanese', label: '日本語', description: 'Japanese' },
    
    // European languages
    french: { name: 'French', label: 'Français', description: 'French' },
    german: { name: 'German', label: 'Deutsch', description: 'German' },
    italian: { name: 'Italian', label: 'Italiano', description: 'Italian' },
    spanish: { name: 'Spanish', label: 'Español', description: 'Spanish' },
    portuguese: { name: 'Portuguese', label: 'Português', description: 'Portuguese' },
    czech: { name: 'Czech', label: 'Čeština', description: 'Czech' },
    hungarian: { name: 'Hungarian', label: 'Magyar', description: 'Hungarian' },
    bulgarian: { name: 'Bulgarian', label: 'Български', description: 'Bulgarian' },
    turkish: { name: 'Turkish', label: 'Türkçe', description: 'Turkish' },
    polish: { name: 'Polish', label: 'Polski', description: 'Polish' },
    russian: { name: 'Russian', label: 'Русский', description: 'Russian' },
    
    // Asian languages
    chinese: { name: 'Chinese', label: '简体中文', description: 'Simplified Chinese' },
    traditionalChinese: { name: 'Traditional Chinese', label: '繁體中文', description: 'Traditional Chinese' },
    korean: { name: 'Korean', label: '한국어', description: 'Korean' },
    vietnamese: { name: 'Vietnamese', label: 'Tiếng Việt', description: 'Vietnamese' },
    thai: { name: 'Thai', label: 'ไทย', description: 'Thai' },
    hindi: { name: 'Hindi', label: 'हिन्दी', description: 'Hindi' },
    bengali: { name: 'Bengali', label: 'বাংলা', description: 'Bengali' },
    javanese: { name: 'Javanese', label: 'Basa Jawa', description: 'Javanese' },
    tamil: { name: 'Tamil', label: 'தமிழ்', description: 'Tamil' },
    burmese: { name: 'Burmese', label: 'မြန်မာဘာသာ', description: 'Burmese' },
    
    // Middle Eastern languages (RTL)
    arabic: { name: 'Arabic', label: 'العربية', description: 'Arabic', isRTL: true },
    hebrew: { name: 'Hebrew', label: 'עברית', description: 'Hebrew', isRTL: true }
};
