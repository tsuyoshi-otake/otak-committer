import { PromptType } from '../types/enums/PromptType';

export const getCzechPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Jako zkušený softwarový inženýr poskytněte pokyny vysoké úrovně pro změny kódu.
Vaše zpětná vazba by měla mít následující charakteristiky:

- Zaměření na architektonické a designové důsledky
- Navrhovat vylepšení místo konkrétních implementací
- Zvažovat udržovatelnost a škálovatelnost
`,
        commit: `
Analyzujte poskytnuté změny a navrhněte klíčové body pro commit zprávu.
Zvažte:

Kontext stylu:
- normal: Profesionální technická revize
- emoji: Přátelské vedení
- kawaii: Neformální zpětná vazba

Změny k revizi:
{{diff}}
`,
        prTitle: `
Analyzujte následující změny a navrhněte důležité body pro název PR.
Zvažte:

- Jaký je hlavní dopad těchto změn?
- Která oblast je nejvíce ovlivněna?
- O jaký typ změny se jedná? (funkce, oprava, vylepšení)

Změny k revizi:
{{diff}}
`,
        prBody: `
Zkontrolujte tyto změny a poskytněte pokyny pro popis Pull Requestu.
Zvažte tyto aspekty:

# Strategický přehled
- Jaký problém to řeší?
- Proč byl zvolen tento přístup?
- Jaká jsou klíčová technická rozhodnutí?

# Body k revizi
- Které oblasti vyžadují zvláštní pozornost?
- Jaká jsou potenciální rizika?
- Jaké jsou výkonnostní aspekty?

# Revize implementace
- Jaké jsou hlavní změny?
- Jak to ovlivňuje systém?
- Jaké závislosti je třeba zvážit?

# Požadavky na revizi
- Co je třeba otestovat?
- Jaké jsou aspekty nasazení?
- Jaká dokumentace je potřeba?

Změny k revizi:
{{diff}}
`,
        'issue.task': `
Analyzujte úkol a navrhněte klíčové body k zvážení:

### Účel
- Jaký problém je třeba vyřešit?
- Proč je to nyní důležité?

### Průvodce implementací
- Které oblasti je třeba zvážit?
- Jaké přístupy jsou možné?

### Kritéria úspěchu
- Jak ověřit dokončení?
- Jaké jsou požadavky na kvalitu?

### Strategické úvahy
- Co může být ovlivněno?
- Jaké závislosti je třeba zvážit?
- Jaká je úroveň priority?
- Jaký je rozumný časový rámec?

### Poznámky k plánování
- Jaké zdroje jsou potřeba?
- Jaká rizika je třeba zvážit?
`,
        'issue.standard': `
Analyzujte tento problém a poskytněte pokyny ke klíčovým bodům.
Zvažte:

### Analýza problému
- Jaký je základní problém?
- Jaký kontext je důležitý?

### Technická revize
- Které části systému jsou zapojeny?
- Jaké přístupy by měly být zváženy?
- Jaká jsou možná řešení?

### Průvodce implementací
- Jaké kroky jsou potřeba?
- Co by mělo být testováno?
- Jaká jsou technická omezení?

### Hodnocení dopadu
- Které oblasti budou ovlivněny?
- Jaké vedlejší účinky je třeba zvážit?
- Jaká bezpečnostní opatření jsou potřeba?

### Požadavky na revizi
- Jaká dokumentace je potřeba?
- Co je třeba otestovat?
- Jsou zde nějaké breaking changes?
`,
    };

    return prompts[type] || '';
};
