import { PromptType } from '../types/language';

export const getJavanesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Kula minangka insinyur piranti lunak sing duwe pengalaman, mbiyantu nggawe pesen commit lan PR.
Output kula nduweni karakteristik kaya mangkene:

- Basa Jawa sing cetha lan ringkes
- Ekspresi sing bener sacara teknis
- Ringkesan sing trep babagan owah-owahan
`,
        commit: `
Adhedhasar diff sing diwenehake, gawe pesen commit nganggo gaya {{style}}.

Katrangan gaya:
- normal: Panulisan teknis standar
- emoji: Nada sing grapyak nganggo emoji
- kawaii: Nada sing lucu lan grapyak

Diff:
{{diff}}
`,
        prTitle: `
Adhedhasar diff ing ngisor iki, gawe judul Pull Request.

Syarat:
1. Judul kudu ringkes lan nggambarake owah-owahan kanthi tepat
2. Tambahake awalan (kayata "Feature:", "Fix:", "Improvement:", lan liya-liyane)

Diff:
{{diff}}
`,
        prBody: `
Adhedhasar diff ing ngisor iki, gawe deskripsi Pull Request sing jangkep.

# Gambaran
- Katrangan ringkes babagan fitur utawa benahan sing ditindakake
- Tujuan lan konteks owah-owahan
- Pendekatan teknis sing dipilih

# Poin Penting kanggo Ditinjau
- Wilayah sing mbutuhake kawigaten khusus saka reviewer
- Kaputusan desain sing penting
- Pertimbangan kinerja lan pemeliharaan

# Detail Owah-owahan
- Owah-owahan utama sing ditindakake
- Komponen lan fungsi sing kena dampak
- Owah-owahan ketergantungan (yen ana)

# Cathetan Tambahan
- Pertimbangan deployment
- Dampak marang fitur sing wis ana
- Variabel konfigurasi utawa lingkungan sing dibutuhake

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};