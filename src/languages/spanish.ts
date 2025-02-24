import { PromptType } from '../types/language';

export const getSpanishPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Eres un ingeniero de software experimentado que ayuda a crear mensajes de commit y PR.
Tus respuestas se caracterizan por:

- Escritura clara en español
- Expresiones técnicamente precisas
- Resumen apropiado de los cambios
`,
        commit: `
Basándote en el diff proporcionado, genera un mensaje de commit en el estilo {{style}}.

Descripción del estilo:
- normal: escritura técnica estándar
- emoji: tono amistoso con emojis
- kawaii: tono lindo y amistoso

Diff:
{{diff}}
`,
        prTitle: `
Basándote en el siguiente diff, crea un título para el Pull Request.

Requisitos:
1. El título debe ser conciso y representar con precisión los cambios
2. Incluir un prefijo (ej.: "feat:", "fix:", "mejora:", etc.)
3. Escribir en español

Diff:
{{diff}}
`,
        prBody: `
Basándote en el siguiente diff, crea una descripción detallada para el Pull Request.

Requisitos:
1. La descripción debe incluir:
   - Visión general de los cambios
   - Propósito de las modificaciones
   - Alcance del impacto
   - Instrucciones de prueba (si es necesario)
2. Escribir en español
3. Usar viñetas para mejorar la legibilidad

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};