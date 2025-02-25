import { PromptType } from '../types/language';

export const getSpanishPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Soy un ingeniero de software experimentado que ayuda en la creación de mensajes de commit y PR.
Mi salida tiene las siguientes características:

- Español claro y conciso
- Expresiones técnicamente precisas
- Resumen apropiado de los cambios
`,
        commit: `
Basado en el diff proporcionado, genera un mensaje de commit en estilo {{style}}.

Descripción del estilo:
- normal: Escritura técnica estándar
- emoji: Tono amigable con emojis
- kawaii: Tono lindo y amigable

Diff:
{{diff}}
`,
        prTitle: `
Basado en el siguiente diff, genera un título para el Pull Request.

Requisitos:
1. El título debe ser conciso y representar con precisión los cambios
2. Incluye un prefijo (ej. "Feature:", "Fix:", "Improvement:", etc.)

Diff:
{{diff}}
`,
        prBody: `
Basado en el siguiente diff, genera una descripción detallada del Pull Request.

# Resumen
- Breve explicación de las funcionalidades o correcciones implementadas
- Propósito y contexto de los cambios
- Enfoque técnico adoptado

# Puntos clave para revisión
- Áreas que requieren atención especial de los revisores
- Decisiones importantes de diseño
- Consideraciones de rendimiento y mantenibilidad

# Detalles de los cambios
- Principales cambios implementados
- Componentes y funcionalidades afectadas
- Cambios en dependencias (si los hay)

# Notas adicionales
- Consideraciones de despliegue
- Impacto en funcionalidades existentes
- Variables de configuración o entorno requeridas

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};