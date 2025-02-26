import { PromptType } from '../types/language';

export const getTurkishPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Deneyimli bir yazılım mühendisi olarak, kod değişiklikleri için üst düzey rehberlik sağlayın.
Geri bildiriminiz aşağıdaki özelliklere sahip olmalıdır:

- Mimari ve tasarım etkilerine odaklanma
- Belirli uygulamalar yerine iyileştirmeler önerme
- Bakım yapılabilirlik ve ölçeklenebilirliği göz önünde bulundurma
`,
        commit: `
Sağlanan değişiklikleri analiz edin ve commit mesajı için önemli noktaları önerin.
Göz önünde bulundurun:

Stil bağlamı:
- normal: Profesyonel teknik inceleme
- emoji: Arkadaşça rehberlik
- kawaii: Resmi olmayan geri bildirim

İncelenecek değişiklikler:
{{diff}}
`,
        prTitle: `
Aşağıdaki değişiklikleri analiz edin ve PR başlığı için önemli noktaları önerin.
Göz önünde bulundurun:

- Bu değişikliklerin ana etkisi nedir?
- Hangi alan en çok etkileniyor?
- Bu ne tür bir değişiklik? (özellik, düzeltme, iyileştirme)

İncelenecek değişiklikler:
{{diff}}
`,
        prBody: `
Bu değişiklikleri gözden geçirin ve Pull Request açıklaması için rehberlik sağlayın.
Bu yönleri göz önünde bulundurun:

# Stratejik Genel Bakış
- Bu hangi sorunu çözüyor?
- Neden bu yaklaşım seçildi?
- Temel teknik kararlar nelerdir?

# İnceleme Noktaları
- Hangi alanlar özel dikkat gerektiriyor?
- Potansiyel riskler nelerdir?
- Performans değerlendirmeleri nelerdir?

# Uygulama İncelemesi
- Ana değişiklikler nelerdir?
- Sistemi nasıl etkiliyor?
- Hangi bağımlılıklar göz önünde bulundurulmalı?

# İnceleme Gereksinimleri
- Ne test edilmeli?
- Dağıtım değerlendirmeleri nelerdir?
- Hangi dokümantasyon gerekli?

İncelenecek değişiklikler:
{{diff}}
`,
        'issue.task': `
Görevi analiz edin ve dikkate alınacak önemli noktaları önerin:

### Amaç
- Hangi sorun çözülmeli?
- Bu neden şimdi önemli?

### Uygulama Rehberi
- Hangi alanlar dikkate alınmalı?
- Hangi yaklaşımlar mümkün?

### Başarı Kriterleri
- Tamamlanma nasıl doğrulanacak?
- Kalite gereksinimleri nelerdir?

### Stratejik Değerlendirmeler
- Neler etkilenebilir?
- Hangi bağımlılıklar dikkate alınmalı?
- Öncelik seviyesi nedir?
- Makul zaman çizelgesi nedir?

### Planlama Notları
- Hangi kaynaklar gerekli?
- Hangi riskler dikkate alınmalı?
`,
        'issue.standard': `
Bu sorunu analiz edin ve önemli noktalar hakkında rehberlik sağlayın.
Göz önünde bulundurun:

### Sorun Analizi
- Temel sorun nedir?
- Hangi bağlam önemli?

### Teknik İnceleme
- Sistemin hangi parçaları dahil?
- Hangi yaklaşımlar düşünülmeli?
- Olası çözümler nelerdir?

### Uygulama Rehberi
- Hangi adımlar gerekli?
- Ne test edilmeli?
- Teknik kısıtlamalar nelerdir?

### Etki Değerlendirmesi
- Hangi alanlar etkilenecek?
- Hangi yan etkiler dikkate alınmalı?
- Hangi önlemler gerekli?

### İnceleme Gereksinimleri
- Hangi dokümantasyon gerekli?
- Ne test edilmeli?
- Yıkıcı değişiklikler var mı?
`
    };

    return prompts[type] || '';
};