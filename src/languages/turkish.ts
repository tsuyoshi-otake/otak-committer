import { PromptType } from '../types/language';

export const getTurkishPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Commit mesajları ve PR oluşturmaya yardımcı olan deneyimli bir yazılım mühendisiyim.
Çıktım aşağıdaki özelliklere sahiptir:

- Net ve özlü Türkçe
- Teknik olarak doğru ifadeler
- Değişikliklerin uygun özeti
`,
        commit: `
Verilen diff'e dayanarak {{style}} tarzında bir commit mesajı oluşturun.

Stil açıklaması:
- normal: Standart teknik yazım
- emoji: Emoji'lerle dostça ton
- kawaii: Sevimli ve dostça ton

Diff:
{{diff}}
`,
        prTitle: `
Aşağıdaki diff'e dayanarak bir Pull Request başlığı oluşturun.

Gereksinimler:
1. Başlık kısa olmalı ve değişiklikleri tam olarak temsil etmeli
2. Bir önek içermeli (örn. "Feature:", "Fix:", "Improvement:", vb.)

Diff:
{{diff}}
`,
        prBody: `
Aşağıdaki diff'e dayanarak ayrıntılı bir Pull Request açıklaması oluşturun.

# Genel Bakış
- Uygulanan özellikler veya düzeltmelerin kısa açıklaması
- Değişikliklerin amacı ve bağlamı
- Benimsenen teknik yaklaşım

# İnceleme Önemli Noktaları
- İnceleyicilerin özel dikkat göstermesi gereken alanlar
- Önemli tasarım kararları
- Performans ve bakım ile ilgili hususlar

# Değişiklik Detayları
- Ana uygulanan değişiklikler
- Etkilenen bileşenler ve işlevler
- Bağımlılık değişiklikleri (varsa)

# Ek Notlar
- Dağıtım ile ilgili hususlar
- Mevcut işlevler üzerindeki etki
- Gerekli yapılandırma veya ortam değişkenleri

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};