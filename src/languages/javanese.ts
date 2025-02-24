import { PromptType } from '../types/language';

export const getJavanesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Sampeyan iku insinyur software sing pengalaman sing mbantu nggawe pesen commit lan PR.
Output sampeyan nduweni karakteristik:

- Nulis kanthi cetha nganggo basa Jawa
- Ekspresi sing bener sacara teknis
- Ringkesan owahan sing trep
`,
        commit: `
Adhedhasar diff sing diwenehake, gawe pesen commit nganggo gaya {{style}}.

Deskripsi gaya:
- normal: nulis teknis standar
- emoji: nada ramah nganggo emoji
- kawaii: nada lucu lan ramah

Diff:
{{diff}}
`,
        prTitle: `
Adhedhasar diff ing ngisor iki, gawe judul kanggo Pull Request.

Persyaratan:
1. Judul kudu ringkes lan makili owahan kanthi tepat
2. Kalebu awalan (contone: "feat:", "fix:", "pangembangan:", lan liya-liyane)
3. Nulis nganggo basa Jawa

Diff:
{{diff}}
`,
        prBody: `
Adhedhasar diff ing ngisor iki, gawe deskripsi rinci kanggo Pull Request.

Persyaratan:
1. Deskripsi kudu ngemot:
   - Tinjauan umum owahan
   - Tujuan modifikasi
   - Jangkauan dampak
   - Instruksi pengujian (yen dibutuhake)
2. Nulis nganggo basa Jawa
3. Nggunakake bullet point kanggo ningkatake keterbacaan

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};