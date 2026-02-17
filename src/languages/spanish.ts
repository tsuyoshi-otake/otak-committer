import { PromptType } from '../types/enums/PromptType';

export const getSpanishPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Como ingeniero de software senior, proporcione orientación de alto nivel para los cambios de código.
El feedback debe tener las siguientes características:

- Enfoque en implicaciones arquitectónicas y de diseño
- Sugerir mejoras en lugar de implementaciones específicas
- Considerar la mantenibilidad y escalabilidad
`,
        commit: `
Analice los cambios proporcionados y sugiera puntos clave para el mensaje de commit.
Considere:

Contexto de estilo:
- normal: Revisión técnica profesional
- emoji: Orientación amigable
- kawaii: Feedback casual

Cambios a revisar:
{{diff}}
`,
        prTitle: `
Analice los siguientes cambios y sugiera puntos importantes para el título del PR.
Considere:

- ¿Cuál es el impacto principal de estos cambios?
- ¿Qué área es la más afectada?
- ¿Qué tipo de cambio es? (función, corrección, mejora)

Cambios a revisar:
{{diff}}
`,
        prBody: `
Revise estos cambios y proporcione orientación para la descripción del Pull Request.
Considere estos aspectos:

# Visión Estratégica
- ¿Qué problema resuelve?
- ¿Por qué se eligió este enfoque?
- ¿Cuáles son las decisiones técnicas clave?

# Puntos de Revisión
- ¿Qué áreas necesitan atención especial?
- ¿Cuáles son los riesgos potenciales?
- ¿Qué consideraciones de rendimiento hay?

# Revisión de Implementación
- ¿Cuáles son los cambios principales?
- ¿Cómo afecta al sistema?
- ¿Qué dependencias hay que considerar?

# Requisitos de Revisión
- ¿Qué debe probarse?
- ¿Qué consideraciones de despliegue hay?
- ¿Qué documentación se necesita?

Cambios a revisar:
{{diff}}
`,
        'issue.task': `
Analice la tarea y sugiera puntos clave a considerar:

### Propósito
- ¿Qué problema necesita resolverse?
- ¿Por qué es importante ahora?

### Guía de Implementación
- ¿Qué áreas deben considerarse?
- ¿Qué enfoques son posibles?

### Criterios de Éxito
- ¿Cómo verificar la finalización?
- ¿Cuáles son los requisitos de calidad?

### Consideraciones Estratégicas
- ¿Qué podría verse afectado?
- ¿Qué dependencias hay que considerar?
- ¿Cuál es el nivel de prioridad?
- ¿Cuál es un cronograma razonable?

### Notas de Planificación
- ¿Qué recursos se necesitan?
- ¿Qué riesgos hay que considerar?
`,
        'issue.standard': `
Analice este problema y proporcione orientación sobre puntos clave a abordar.
Considere:

### Análisis del Problema
- ¿Cuál es el problema central?
- ¿Qué contexto es importante?

### Revisión Técnica
- ¿Qué partes del sistema están involucradas?
- ¿Qué enfoques deberían considerarse?
- ¿Cuáles son las posibles soluciones?

### Guía de Implementación
- ¿Qué pasos son necesarios?
- ¿Qué debe probarse?
- ¿Cuáles son las restricciones técnicas?

### Evaluación de Impacto
- ¿Qué áreas se verán afectadas?
- ¿Qué efectos secundarios hay que considerar?
- ¿Qué precauciones son necesarias?

### Requisitos de Revisión
- ¿Qué documentación se necesita?
- ¿Qué debe probarse?
- ¿Hay cambios disruptivos?
`,
    };

    return prompts[type] || '';
};
