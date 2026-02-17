import { PromptType } from '../types/enums/PromptType';

export const getJavanesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Minangka insinyur perangkat lunak senior, nyedhiani tuntunan tingkat dhuwur kanggo owahan kode.
Feedback sampeyan kudu nduweni karakteristik ing ngisor iki:

- Fokus ing dampak arsitektur lan desain
- Nyaranake pangundhakan tinimbang implementasi spesifik
- Nimbang kualitas perawatan lan skalabilitas
`,
        commit: `
Analisis owahan sing diwenehake lan nyaranake poin utama kanggo pesen commit.
Nimbang:

Konteks gaya:
- normal: Tinjauan teknis profesional
- emoji: Tuntunan sing ramah
- kawaii: Feedback santai

Owahan sing kudu ditinjau:
{{diff}}
`,
        prTitle: `
Analisis owahan ing ngisor iki lan nyaranake poin penting kanggo judul PR.
Nimbang:

- Apa dampak utama saka owahan iki?
- Wilayah endi sing paling kena dampak?
- Iki jinis owahan apa? (fitur, perbaikan, pangundhakan)

Owahan sing kudu ditinjau:
{{diff}}
`,
        prBody: `
Tinjau owahan iki lan nyedhiani tuntunan kanggo deskripsi Pull Request.
Nimbang aspek iki:

# Tinjauan Strategis
- Iki ngatasi masalah apa?
- Kenapa milih pendekatan iki?
- Apa keputusan teknis utama?

# Poin Tinjauan
- Wilayah endi sing butuh kawigaten khusus?
- Apa risiko potensial?
- Apa pertimbangan kinerja?

# Tinjauan Implementasi
- Apa owahan utama?
- Kepiye dampake ing sistem?
- Dependensi apa sing kudu ditimbang?

# Syarat Tinjauan
- Apa sing kudu diuji?
- Apa pertimbangan deployment?
- Dokumentasi apa sing dibutuhake?

Owahan sing kudu ditinjau:
{{diff}}
`,
        'issue.task': `
Analisis tugas lan nyaranake poin utama sing kudu ditimbang:

### Tujuan
- Masalah apa sing kudu diatasi?
- Kenapa iki penting saiki?

### Panduan Implementasi
- Wilayah endi sing kudu ditimbang?
- Pendekatan apa sing bisa dilakoni?

### Kriteria Sukses
- Kepiye verifikasi rampunge?
- Apa syarat kualitas?

### Pertimbangan Strategis
- Apa sing bisa kena dampak?
- Dependensi apa sing kudu ditimbang?
- Tingkat prioritase apa?
- Jadwal sing wajar apa?

### Cathetan Perencanaan
- Sumber daya apa sing dibutuhake?
- Risiko apa sing kudu ditimbang?
`,
        'issue.standard': `
Analisis masalah iki lan nyedhiani tuntunan babagan poin utama.
Nimbang:

### Analisis Masalah
- Apa masalah inti?
- Konteks apa sing penting?

### Tinjauan Teknis
- Bagean sistem endi sing terlibat?
- Pendekatan apa sing kudu ditimbang?
- Solusi sing mungkin apa?

### Panduan Implementasi
- Langkah apa sing dibutuhake?
- Apa sing kudu diuji?
- Apa batasan teknis?

### Evaluasi Dampak
- Wilayah endi sing bakal kena dampak?
- Efek samping apa sing kudu ditimbang?
- Tindakan pencegahan apa sing dibutuhake?

### Syarat Tinjauan
- Dokumentasi apa sing dibutuhake?
- Apa sing kudu diuji?
- Apa ana owahan radikal?
`,
    };

    return prompts[type] || '';
};
