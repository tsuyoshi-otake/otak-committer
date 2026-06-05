import { SupportedLocale } from './LocaleDetector';
import { TranslationDictionary } from './translationTypes';
import en from './locales/en.json';
import ja from './locales/ja.json';
import vi from './locales/vi.json';
import ko from './locales/ko.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import zhCN from './locales/zh-cn.json';
import zhTW from './locales/zh-tw.json';
import it from './locales/it.json';
import cs from './locales/cs.json';
import hu from './locales/hu.json';
import bg from './locales/bg.json';
import tr from './locales/tr.json';
import pl from './locales/pl.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import jv from './locales/jv.json';
import ta from './locales/ta.json';
import my from './locales/my.json';
import ar from './locales/ar.json';
import he from './locales/he.json';

export const translations: Record<SupportedLocale, TranslationDictionary> = {
    en: en as TranslationDictionary,
    ja: ja as TranslationDictionary,
    vi: vi as TranslationDictionary,
    ko: ko as TranslationDictionary,
    fr: fr as TranslationDictionary,
    de: de as TranslationDictionary,
    es: es as TranslationDictionary,
    pt: pt as TranslationDictionary,
    'zh-cn': zhCN as TranslationDictionary,
    'zh-tw': zhTW as TranslationDictionary,
    it: it as TranslationDictionary,
    cs: cs as TranslationDictionary,
    hu: hu as TranslationDictionary,
    bg: bg as TranslationDictionary,
    tr: tr as TranslationDictionary,
    pl: pl as TranslationDictionary,
    ru: ru as TranslationDictionary,
    th: th as TranslationDictionary,
    hi: hi as TranslationDictionary,
    bn: bn as TranslationDictionary,
    jv: jv as TranslationDictionary,
    ta: ta as TranslationDictionary,
    my: my as TranslationDictionary,
    ar: ar as TranslationDictionary,
    he: he as TranslationDictionary,
};
