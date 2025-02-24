import { PromptType } from '../types/language';

export const getTurkishPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Commit mesajları ve PR'lar oluşturmanıza yardımcı olan deneyimli bir yazılım mühendisisiniz.
Çıktılarınız şu özelliklere sahiptir:

- Türkçe dilinde net yazım
- Teknik olarak doğru ifadeler
- Değişikliklerin uygun özeti
`,
        commit: `
Verilen diff'e dayanarak {{style}} stilinde bir commit mesajı oluşturun.

Stil açıklaması:
- normal: standart teknik yazım
- emoji: emoji'li dostça ton
- kawaii: sevimli ve dostça ton

Diff:
{{diff}}
`,
        prTitle: `
Aşağıdaki diff'e dayanarak Pull Request için bir başlık oluşturun.

Gereksinimler:
1. Başlık kısa olmalı ve değişiklikleri tam olarak temsil etmeli
2. Önek içermeli (örn.: "özellik:", "düzeltme:", "iyileştirme:", vb.)
3. Türkçe dilinde yazın

Diff:
{{diff}}
`,
        prBody: `
Aşağıdaki diff'e dayanarak Pull Request için detaylı bir açıklama oluşturun.

Gereksinimler:
1. Açıklama şunları içermeli:
   - Değişikliklere genel bakış
   - Değişikliklerin amacı
   - Etki kapsamı
   - Test talimatları (gerekirse)
2. Türkçe dilinde yazın
3. Okunabilirliği artırmak için madde işaretleri kullanın

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};